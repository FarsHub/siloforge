// Smoke test for the BroodTrack commercial layer: customers, the order book,
// deposits, uniformity, and the pullet passport.
//
// Loads the generated BroodTrack <script> into a vm with a working in-memory
// store behind DB, then exercises the logic the way the app does — not the
// forms, which need a real DOM, but every function they call.
//
// The clock is pinned so the pipeline projections are deterministic.
//
// Usage: node tools/smoke_orders.js [--preview]

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.dirname(__dirname);
const html = fs.readFileSync(path.join(ROOT, "BroodTrack.html"), "utf8");
const body = html.slice(
  html.indexOf("\n<script>\n") + "\n<script>\n".length,
  html.indexOf("\n</script>\n", html.indexOf("\n<script>\n")) + 1
);

const TODAY = "2026-06-01";
const ARRIVED = "2026-04-12";          // 18-week target → ready 2026-08-16
const FIXED = Date.parse(TODAY + "T09:00:00Z");

const RealDate = Date;
class PinnedDate extends RealDate {
  constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); }
  static now() { return FIXED; }
}

const el = () => ({
  style: {}, dataset: {}, value: "",
  classList: { add() {}, remove() {}, contains: () => false },
  addEventListener() {}, appendChild() {}, remove() {},
  querySelector: () => null, querySelectorAll: () => [],
  set innerHTML(_) {}, get innerHTML() { return ""; },
  set textContent(_) {}, get textContent() { return ""; },
});

const sandbox = {
  console, Date: PinnedDate,
  firebase: {
    initializeApp: () => ({}),
    firestore: Object.assign(
      () => ({
        enablePersistence: () => Promise.resolve(),
        collection: () => ({ doc: () => ({}), onSnapshot() {}, get: () => Promise.resolve({ docs: [] }) }),
        doc: () => ({ get: () => Promise.resolve({ exists: false }) }),
      }),
      { FieldValue: { serverTimestamp: () => null } }
    ),
  },
  window: { print() {}, addEventListener() {}, location: { href: "" } },
  navigator: { onLine: true },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
  document: {
    body: el(), documentElement: el(),
    getElementById: () => el(), createElement: () => el(),
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {},
  },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(body.replace(/^initApp\(\);$/m, "/* initApp() skipped */"), sandbox,
                { filename: "BroodTrack.js" });

// ── An in-memory store behind DB ────────────────────────────────────────
// `const DB` is not a property of the vm global, so the store is installed
// from inside the context. Writes are real, which is what lets the deposit
// carry-over be tested rather than asserted about.
sandbox.__store = {
  farm: {
    name: "Lamuad Farms", doc_address: "Km 12 Ilesa Road, Osogbo, Osun State",
    doc_phone: "0803 000 0000", doc_rc: "RC 1234567",
  },
  batches: [], daily: [], weight: [], sales: [], payments: [], feed: [],
  customers: [], orders: [], expenses: [], feedstock: [], health: [],
};
vm.runInContext(`
  const S = __store;
  const byId = (a,id) => a.find(x=>x.id===id) || null;
  DB.today          = () => ${JSON.stringify(TODAY)};
  DB.getFarm        = () => S.farm;
  DB.saveFarm       = f => { S.farm = f; };
  DB.getBatches     = () => S.batches;
  DB.addBatch       = r => S.batches.push(r);
  DB.updBatch       = (id,u) => Object.assign(byId(S.batches,id)||{},u);
  DB.getDaily       = () => S.daily;
  DB.getWeight      = () => S.weight;
  DB.addWeight      = r => S.weight.push(r);
  DB.getSales       = () => S.sales;
  DB.addSale        = r => S.sales.push(r);
  DB.updSale        = (id,u) => Object.assign(byId(S.sales,id)||{},u);
  DB.getExpenses    = () => S.expenses;
  DB.getHealth      = () => S.health;
  DB.getFeedStock   = () => S.feedstock;
  DB.getFeed        = () => S.feed;
  DB.getPayments    = () => S.payments;
  DB.paymentsForSale  = id => S.payments.filter(p=>p.sale_id===id);
  DB.paymentsForOrder = id => S.payments.filter(p=>p.order_id===id && !p.sale_id);
  DB.addPayment     = r => S.payments.push(r);
  DB.updPayment     = (id,u) => Object.assign(byId(S.payments,id)||{},u);
  DB.delPayment     = id => { S.payments = S.payments.filter(p=>p.id!==id); };
  DB.getCustomers   = () => S.customers;
  DB.getCustomer    = id => byId(S.customers,id);
  DB.addCustomer    = r => S.customers.push(r);
  DB.updCustomer    = (id,u) => Object.assign(byId(S.customers,id)||{},u);
  DB.delCustomer    = id => { S.customers = S.customers.filter(c=>c.id!==id); };
  DB.getOrders      = () => S.orders;
  DB.getOrder       = id => byId(S.orders,id);
  DB.addOrder       = r => S.orders.push(r);
  DB.updOrder       = (id,u) => Object.assign(byId(S.orders,id)||{},u);
  DB.delOrder       = id => { S.orders = S.orders.filter(o=>o.id!==id); };
`, sandbox);

const S = sandbox.__store;
const G = name => vm.runInContext(name, sandbox);
const call = (name, ...args) => sandbox[name](...args);

let failures = 0;
const check = (label, cond, detail) => {
  if (!cond) { failures++; console.log("  FAIL  " + label + (detail !== undefined ? "  — " + detail : "")); }
  else console.log("  ok    " + label);
};
const section = t => console.log("\n" + t);

// ── Fixtures ────────────────────────────────────────────────────────────
S.batches.push({
  id: "b1", name: "Batch 1 — Apr 2026", breed: "Isa Brown", bird_type: "pullet",
  arrival_date: ARRIVED, doc_count: 2000, target_sale_age_weeks: 18,
  supplier: "Chi Farms", status: "Active",
  vaccinations: {
    "ND HB1 + IB (Live)": { done: true, date: "2026-04-12" },
    "Gumboro 1 (IBD, intermediate)": { done: true, date: "2026-04-22" },
    "Gumboro 2 (IBD, intermediate)": { done: true, date: "2026-04-29" },
    "ND Lasota 1 + IB": { done: true, date: "2026-05-02" },
  },
});
// 100 deaths spread over the life so far, plus temperature readings: two of
// three inside the band, so compliance must come out at 67%.
S.daily.push(
  { id: "d1", batch_id: "b1", date: "2026-04-13", age_days: 1, opening_birds: 2000, deaths: 60, closing_birds: 1940, temperature_c: 34 },
  { id: "d2", batch_id: "b1", date: "2026-04-20", age_days: 8, opening_birds: 1940, deaths: 25, closing_birds: 1915, temperature_c: 31 },
  { id: "d3", batch_id: "b1", date: "2026-05-20", age_days: 38, opening_birds: 1915, deaths: 15, closing_birds: 1900, temperature_c: 12 }
);

section("Uniformity maths");
{
  const tight = call("weightStats", [700, 750, 800]);
  check("mean", tight.mean === 750, tight.mean);
  check("sample sd", tight.sd === 50, tight.sd);
  check("CV%", tight.cv === 6.7, tight.cv);
  check("tight sample is 100% uniform", tight.uniformity === 100, tight.uniformity);

  const ragged = call("weightStats", [500, 750, 1000]);
  check("ragged sample scores 33% uniform", ragged.uniformity === 33, ragged.uniformity);
  check("ragged CV is high", ragged.cv > 30, ragged.cv);

  check("empty list gives null, not zero", call("weightStats", []) === null);
  check("parser copes with commas, spaces and newlines",
        call("parseWeightList", "700, 750\n800  810").length === 4);
  check("parser drops junk", call("parseWeightList", "abc; 700;;x").length === 1);
}

S.weight.push({
  id: "w1", batch_id: "b1", batch_name: "Batch 1 — Apr 2026", breed: "Isa Brown",
  date: "2026-05-30", week_num: 7, sample_size: 5,
  weights: [540, 552, 561, 548, 559],
  avg_weight_g: 552, min_weight_g: 540, max_weight_g: 561,
  sd_g: 8.4, cv_pct: 1.5, uniformity_pct: 100,
  benchmark_g: 550, notes: "",
});

section("Customer matching");
{
  check("name normalises case and inner spacing",
        call("normalizeCustomerName", "  Alhaji   MUSA ") === "alhaji musa");
  S.customers.push({ id: "c1", name: "Musa Poultry", name_normalized: "musa poultry",
                     phone: "08031234567", customer_type: "Farmer", created_at: TODAY });
  check("exact match found", call("findCustomerByName", "  musa POULTRY ")?.id === "c1");
  check("typo is offered as a near miss",
        call("fuzzyCustomerMatches", "Musa Poutry").some(c => c.id === "c1"));
  check("an unrelated name is not offered",
        call("fuzzyCustomerMatches", "Zainab Agro").length === 0);
}

section("Legacy buyers become customers");
{
  S.sales.push(
    { id: "s1", date: "2026-05-01", batch_id: "b1", buyer: "Alhaji Musa", quantity: 100,
      total_amount_ngn: 250000, payment_type: "cash", paid: true },
    { id: "s2", date: "2026-05-08", batch_id: "b1", buyer: "alhaji  musa", quantity: 50,
      total_amount_ngn: 125000, payment_type: "cash", paid: true },
    { id: "s3", date: "2026-05-15", batch_id: "b1", buyer: "Alhaji Musa", quantity: 75,
      total_amount_ngn: 187500, payment_type: "credit", paid: false }
  );
  const groups = call("getLegacySaleGroups");
  check("three spellings collapse to one buyer", groups.length === 1, groups.length);
  check("most common spelling wins", groups[0].canonical === "Alhaji Musa", groups[0].canonical);
  check("birds are totalled across the group", groups[0].birds === 225, groups[0].birds);
  check("unpaid credit shows as outstanding",
        groups[0].outstanding === 187500, groups[0].outstanding);

  const res = call("migrateLegacyGroup", groups[0].normalized, { phone: "0805", customer_type: "Farmer" });
  check("one customer created", res.saleCount === 3 && S.customers.length === 2);
  check("every sale is now linked",
        S.sales.filter(s => s.customer_id === res.customerId).length === 3);
  check("nothing left to migrate", call("getLegacySaleGroups").length === 0);
  check("birds roll up to the customer", call("getCustomerBirds", res.customerId) === 225);
  check("outstanding rolls up too",
        call("getCustomerOutstanding", res.customerId) === 187500);
  sandbox.__musaId = res.customerId;
}

section("Batch pipeline");
{
  const p = call("getBatchPipeline", S.batches[0]);
  check("ready date is arrival + 18 weeks", p.readyDate === "2026-08-16", p.readyDate);
  check("current birds come from the last daily log", p.currentBirds === 1900, p.currentBirds);
  check("projection discounts for realised mortality",
        p.projectedBirds < p.currentBirds, p.projectedBirds);
  check("projection is floored at 80% of today",
        p.projectedBirds >= Math.round(p.currentBirds * 0.8), p.projectedBirds);
  check("birds already sold are taken out of sellable",
        p.sold === 225 && p.sellable === p.projectedBirds - 225, p.sellable);
  check("nothing allocated yet", p.allocated === 0);
}

section("Order book");
{
  const mk = (o) => { const r = Object.assign({ id: "o" + (S.orders.length + 1) }, o); r.ref = call("nextOrderRef", r); S.orders.push(r); return r; };
  const confirmed = mk({ date: "2026-05-20", customer_id: sandbox.__musaId, customer_name: "Alhaji Musa",
    bird_type: "pullet", breed: "Isa Brown", quantity: 800, age_weeks_at_delivery: 18,
    needed_from: "2026-08-10", needed_to: "2026-08-31", price_per_bird_ngn: 2500,
    status: "confirmed", batch_id: "b1" });
  const enquiry = mk({ date: "2026-05-25", customer_id: "c1", customer_name: "Musa Poultry",
    bird_type: "pullet", quantity: 400, needed_from: "2026-08-15",
    price_per_bird_ngn: 2500, status: "enquiry" });
  const declined = mk({ date: "2026-03-02", customer_name: "Zainab Agro",
    bird_type: "pullet", quantity: 1200, needed_from: "2026-04-01",
    price_per_bird_ngn: 2400, status: "declined", decline_reason: "No birds available" });
  mk({ date: "2026-02-01", customer_name: "Gone Away", quantity: 300,
    needed_from: "2026-03-01", price_per_bird_ngn: 2000, status: "cancelled" });

  check("refs are stable and unique",
        new Set(S.orders.map(o => o.ref)).size === S.orders.length);
  check("ref is deterministic for a given order",
        call("makeOrderRef", confirmed, 0) === call("makeOrderRef", confirmed, 0));
  check("only confirmed orders count as committed",
        call("isOrderCommitted", confirmed) && !call("isOrderCommitted", enquiry));
  check("enquiries are still open", call("isOrderOpen", enquiry));
  check("declined orders are not open", !call("isOrderOpen", declined));

  const p = call("getBatchPipeline", S.batches[0]);
  check("a confirmed order shows as allocated", p.allocated === 800, p.allocated);
  check("uncommitted is sellable minus allocated",
        p.uncommitted === p.sellable - 800, p.uncommitted);

  const dvs = call("getDemandVsSupply");
  const aug = dvs.find(b => b.ym === "2026-08");
  check("August bucket exists", !!aug);
  check("only the confirmed 800 counts as demand", aug.demand === 800, aug.demand);
  check("supply lands in the month the batch is ready", aug.supply === p.sellable, aug.supply);
  check("gap is supply minus demand", aug.gap === aug.supply - 800);
  check("unallocated demand is zero while the order names a batch",
        call("getUnallocatedDemand") === 0);

  const turned = call("getTurnedAwayStats");
  check("declined demand is counted", turned.birds === 1200, turned.birds);
  check("cancelled is not counted as turned away", turned.count === 1, turned.count);
  check("turned-away value uses the quoted price",
        turned.value === 1200 * 2400, turned.value);

  sandbox.__orderId = confirmed.id;
}

section("Deposits carry over into the sale");
{
  const oid = sandbox.__orderId;
  const order = G("DB").getOrder ? call("orderValue", S.orders.find(o => o.id === oid)) : null;
  check("order value is quantity × price", order === 800 * 2500, order);

  S.payments.push({ id: "p1", order_id: oid, sale_id: null, date: "2026-05-21",
    amount_ngn: 400000, method: "Bank Transfer", kind: "order_deposit", notes: "50% to hold" });
  check("deposit is held against the order", call("orderDepositTotal", oid) === 400000);
  check("balance on delivery nets the deposit off",
        call("orderBalance", S.orders.find(o => o.id === oid)) === 1600000);

  // What saveSale() does on fulfilment, in the same order.
  const sale = { id: "s4", date: "2026-08-12", batch_id: "b1", batch_name: "Batch 1 — Apr 2026",
    breed: "Isa Brown", quantity: 800, age_weeks_at_sale: 18, price_per_bird_ngn: 2500,
    total_amount_ngn: 2000000, payment_type: "credit", paid: false, due_date: "2026-09-12",
    customer_id: sandbox.__musaId, buyer: "Alhaji Musa", order_id: oid, seller: "Tunde" };
  S.sales.push(sale);
  call("orderDeposits", oid).forEach(p => G("DB").updPayment(p.id, { sale_id: sale.id }));
  G("DB").updOrder(oid, { status: "fulfilled", sale_id: sale.id });

  check("deposit now counts as paid on the sale",
        call("getSalePaid", sale) === 400000, call("getSalePaid", sale));
  check("sale balance is the rest", call("getSaleBalance", sale) === 1600000);
  check("the deposit is no longer held against the order",
        call("orderDepositTotal", oid) === 0);
  check("money was never duplicated",
        S.payments.filter(p => p.amount_ngn === 400000).length === 1);
  check("the order is closed and knows its sale",
        S.orders.find(o => o.id === oid).status === "fulfilled" &&
        S.orders.find(o => o.id === oid).sale_id === "s4");
  check("a fulfilled order stops drawing on capacity",
        call("getBatchPipeline", S.batches[0]).allocated === 0);
  sandbox.__sale = sale;
}

section("Reared on — what the lot actually ate");
{
  const batch = S.batches[0];                      // arrived 2026-04-12
  const sale  = sandbox.__sale;                    // dispatched 2026-08-12, day 122

  // ── No feed logged: fall back to the programme, clipped to the real age ──
  const prog = call("rearedOnForSale", batch, sale);
  check("falls back to the programme when nothing was logged",
        prog.source === "programme", prog.source);
  check("age at dispatch is measured to the sale, not to today",
        prog.ageAtSale === 122, prog.ageAtSale);
  check("a phase the birds never reached is not listed",
        !prog.rows.some(r => r.type === "Pre-Layer Mash"),
        prog.rows.map(r => r.type).join(", "));
  check("phases run in order from day 1",
        prog.rows[0].from === 1 && prog.rows.every((r, i, a) => i === 0 || r.from === a[i - 1].to + 1),
        prog.rows.map(r => `${r.type} d${r.from}-${r.to}`).join(" | "));
  check("the last phase stops at the dispatch day, not at its programme end",
        prog.rows[prog.rows.length - 1].to === 122,
        prog.rows[prog.rows.length - 1].to);
  check("the phase still running is flagged as current",
        prog.rows[prog.rows.length - 1].current === true);

  // The case that was actually shipped wrong: a young lot.
  const young = Object.assign({}, sale, { date: "2026-06-30" });   // day 79
  const p79 = call("rearedOnForSale", batch, young);
  check("a day-79 lot is not credited with Pre-Layer Mash",
        !p79.rows.some(r => r.type === "Pre-Layer Mash"),
        p79.rows.map(r => r.type).join(", "));
  check("a day-79 lot is not credited with days it has not lived",
        p79.rows.every(r => r.to <= 79), p79.rows.map(r => r.to).join(","));
  check("day-79 lot is on Grower Mash",
        p79.rows[p79.rows.length - 1].type === "Grower Mash");

  // ── Feed logged: that is the record, and it wins ──
  S.feed.push(
    { id: "f1", batch_id: "b1", date: "2026-04-20", feed_type: "Starter Mash", feed_kg_used: 40 },
    { id: "f2", batch_id: "b1", date: "2026-05-02", feed_type: "Chick Mash",   feed_kg_used: 95 },
    { id: "f3", batch_id: "b1", date: "2026-06-15", feed_type: "Grower Mash",  feed_kg_used: 180 },
    { id: "f4", batch_id: "b1", date: "2026-08-01", feed_type: "Grower Mash",  feed_kg_used: 210 },
    // Dated after dispatch: belongs to the birds still on the farm, not this lot.
    { id: "f5", batch_id: "b1", date: "2026-09-01", feed_type: "Pre-Layer Mash", feed_kg_used: 60 }
  );
  const log = call("rearedOnForSale", batch, sale);
  check("the feed log wins over the programme", log.source === "logged", log.source);
  check("one row per feed, not per entry", log.rows.length === 3, log.rows.length);
  check("feed bought after dispatch is not attributed to this lot",
        !log.rows.some(r => r.type === "Pre-Layer Mash"),
        log.rows.map(r => r.type).join(", "));
  check("kg is totalled across entries of the same feed",
        log.rows.find(r => r.type === "Grower Mash").kg === 390,
        log.rows.find(r => r.type === "Grower Mash").kg);
  check("day span runs first to last entry of that feed",
        log.rows.find(r => r.type === "Grower Mash").from === 64 &&
        log.rows.find(r => r.type === "Grower Mash").to === 111,
        JSON.stringify(log.rows.find(r => r.type === "Grower Mash")));
  check("rows are ordered by when the feed started",
        log.rows.map(r => r.type).join(",") === "Starter Mash,Chick Mash,Grower Mash",
        log.rows.map(r => r.type).join(","));

  const doc = call("buildPassportHTML", sale);
  check("the passport prints the logged feeds with quantities",
        doc.includes("390 kg") && doc.includes("Grower Mash"));
  check("the passport does not print an unfed sack",
        !doc.includes("Pre-Layer Mash"));
  check("the section is stamped with the age it describes",
        doc.includes("TO DAY 122"));
  S.feed.length = 0;
}

section("Pullet passport");
{
  const sale = sandbox.__sale;
  let doc;
  try { doc = call("buildPassportHTML", sale); }
  catch (e) { failures++; console.log("  FAIL  threw: " + e.message + "\n" + e.stack); doc = ""; }

  check("renders", doc.length > 1500, doc.length + " chars");
  check("no unresolved template holes",
        !/undefined|NaN|\[object Object\]/.test(doc),
        (doc.match(/undefined|NaN|\[object Object\]/g) || []).join(","));
  check("ref is stable across reprints",
        call("passportRef", sale) === call("passportRef", sale));
  check("ref is distinct from the invoice ref",
        call("passportRef", sale) !== sale.doc_ref);
  check("buyer is named", doc.includes("Alhaji Musa"));
  check("quantity is stated", doc.includes("800"));
  check("weight is carried with its benchmark", doc.includes("552") && doc.includes("550g"));
  check("uniformity is printed", doc.includes("100") && doc.includes("Uniformity"));
  check("livability reads at the sale date, not today",
        doc.includes("95.0") && doc.includes("Livability"),
        "expected (2000-100)/2000");
  check("temperature compliance is 2 of 3 logged days",
        doc.includes("67") && doc.includes("Brooding temperature"));
  check("hatchery is credited", doc.includes("Chi Farms"));
  check("given vaccines listed", doc.includes("ND Lasota 1 + IB"));
  check("outstanding programme is handed to the buyer",
        doc.includes("Still to come"));
  check("farm letterhead present", doc.includes("Lamuad Farms"));

  // A lot with no individual weights must degrade, not break.
  const bare = Object.assign({}, sale, { id: "s9", batch_id: "bX" });
  let bareDoc = "";
  try { bareDoc = call("buildPassportHTML", bare); }
  catch (e) { failures++; console.log("  FAIL  bare lot threw: " + e.message); }
  check("a lot with no batch still renders", bareDoc.length > 800);
  check("missing measurements read as em-dash, not undefined",
        bareDoc.includes("—") && !/undefined|NaN/.test(bareDoc));
}

if (process.argv.includes("--preview")) {
  const style = html.slice(html.indexOf("<style>"), html.indexOf("</style>") + 8);
  const page = [
    "<!doctype html><html><head><meta charset='utf-8'>",
    "<meta name='viewport' content='width=device-width,initial-scale=1'>",
    "<title>Pullet passport preview</title>", style,
    "<style>body{margin:0}</style></head><body>",
    "<div id='rd-overlay' class='rd-ov'>",
    "<div class='rd-bar'>",
    "<span class='rd-bar-ttl'>Pullet Passport — preview</span>",
    "<button class='rd-bar-btn primary' onclick='window.print()'>Print / PDF</button>",
    "</div>",
    "<div class='rd-scroll'>", call("buildPassportHTML", sandbox.__sale), "</div>",
    "</div></body></html>",
  ].join("");
  const out = path.join(ROOT, "demos", "passport-preview.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, page, "utf8");
  console.log("\nPreview written: " + out);
}

console.log(failures ? "\n" + failures + " FAILURE(S)" : "\nAll smoke checks passed.");
process.exit(failures ? 1 : 0);
