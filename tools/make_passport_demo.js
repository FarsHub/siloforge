// Build a standalone demo of the pullet passport, with an explanation of what
// the document is for and two realistic lots — one well reared, one not.
//
// The second lot is the point of the demo. A certificate that only ever looks
// good is marketing; this one reports whatever the daily records say, and the
// weak lot is what that looks like.
//
// Usage: node tools/make_passport_demo.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.dirname(__dirname);
const html = fs.readFileSync(path.join(ROOT, "BroodTrack.html"), "utf8");
const body = html.slice(
  html.indexOf("\n<script>\n") + "\n<script>\n".length,
  html.indexOf("\n</script>\n", html.indexOf("\n<script>\n")) + 1
);

const TODAY = "2026-09-18";
const FIXED = Date.parse(TODAY + "T09:00:00Z");
class PinnedDate extends Date {
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
    firestore: Object.assign(() => ({
      enablePersistence: () => Promise.resolve(),
      collection: () => ({ doc: () => ({}), onSnapshot() {}, get: () => Promise.resolve({ docs: [] }) }),
      doc: () => ({ get: () => Promise.resolve({ exists: false }) }),
    }), { FieldValue: { serverTimestamp: () => null } }),
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

sandbox.__store = {
  farm: {
    name: "Lamuad Farms", doc_name: "Lamuad Farms — Pullet Unit",
    doc_address: "Km 12 Ilesa Road, Osogbo, Osun State",
    doc_phone: "0803 000 0000", doc_email: "pullets@lamuad.ng", doc_rc: "RC 1234567",
  },
  batches: [], daily: [], weight: [], sales: [], customers: [],
  orders: [], payments: [], expenses: [], health: [], feedstock: [], feed: [],
};
vm.runInContext(`
  const S = __store;
  const byId = (a,id) => a.find(x=>x.id===id) || null;
  DB.today        = () => ${JSON.stringify(TODAY)};
  DB.getFarm      = () => S.farm;
  DB.getBatches   = () => S.batches;
  DB.getDaily     = () => S.daily;
  DB.getWeight    = () => S.weight;
  DB.getSales     = () => S.sales;
  DB.getCustomers = () => S.customers;
  DB.getCustomer  = id => byId(S.customers,id);
  DB.getOrders    = () => S.orders;
  DB.getOrder     = id => byId(S.orders,id);
  DB.getPayments  = () => S.payments;
  DB.getExpenses  = () => S.expenses;
  DB.getHealth    = () => S.health;
  DB.getFeedStock = () => S.feedstock;
  DB.getFeed      = () => S.feed;
  DB.paymentsForSale  = id => S.payments.filter(p=>p.sale_id===id);
  DB.paymentsForOrder = id => S.payments.filter(p=>p.order_id===id && !p.sale_id);
`, sandbox);

const S = sandbox.__store;
const call = (n, ...a) => sandbox[n](...a);
const addDays = (iso, n) => call("addDays", iso, n);
const SCHEDULE = vm.runInContext("LAYER_VACC_SCHEDULE", sandbox);

// Tick the required programme up to `throughDay`, on the day it was due.
function vaccinationsThrough(arrival, throughDay) {
  const out = {};
  for (const v of SCHEDULE) {
    if (v.hatchery || v.optional || v.dayMin > throughDay) continue;
    out[v.name] = { done: true, date: addDays(arrival, v.dayMin) };
  }
  return out;
}

// Brooding-temperature readings: `outOfBand` of them deliberately wrong, the
// rest comfortably inside the target for the bird's age.
function dailyRows(batchId, arrival, docCount, totalDeaths, days, outOfBand) {
  const rows = [];
  let alive = docCount;
  // Mortality is front-loaded, as it always is — most of it in the first week.
  const curve = d => (d <= 7 ? 0.45 : d <= 21 ? 0.3 : 0.25) / (d <= 7 ? 7 : d <= 21 ? 14 : days - 21);
  for (let d = 1; d <= days; d++) {
    const target = call("getTempTarget", d, "pullet");
    const mid = target ? (target.min + target.max) / 2 : 24;
    const bad = d > days - outOfBand;         // the wobble lands late, as a cold snap
    const deaths = Math.max(0, Math.round(totalDeaths * curve(d)));
    const opening = alive;
    alive = Math.max(0, alive - deaths);
    rows.push({
      id: batchId + "-d" + d, batch_id: batchId, date: addDays(arrival, d),
      age_days: d, opening_birds: opening, deaths, culls: 0, closing_birds: alive,
      temperature_c: bad ? (target ? target.min - 5 : 15) : mid,
      humidity_pct: 62,
    });
  }
  // Land exactly on the intended livability rather than near it.
  const drift = (docCount - totalDeaths) - alive;
  if (drift !== 0) {
    const last = rows[rows.length - 1];
    last.deaths = Math.max(0, last.deaths - drift);
    last.closing_birds = last.opening_birds - last.deaths;
  }
  return rows;
}

// Weekly feed entries for a batch, using whatever sack the programme calls for
// at that age. Lot A gets these so the passport shows the logged path; Lot B
// deliberately has none, so it falls back to the programme.
function feedRows(batchId, arrival, birdType, days, birds) {
  const rows = [];
  for (let d = 1; d <= days; d += 7) {
    const type = call("broodFeedTypeForAge", birdType, d);
    if (!type) continue;
    const g = call("getFeedRateGByType", birdType, d, S.farm) || 60;
    const covered = Math.min(7, days - d + 1);   // the last entry is a part week
    const kg = Math.round(g * birds * covered / 1000);
    rows.push({
      id: batchId + "-f" + d, batch_id: batchId, date: addDays(arrival, d),
      batch_name: "", feed_type: type, feed_kg_used: kg, feed_req_kg: kg, notes: "",
    });
  }
  return rows;
}

// ── Lot A: reared well, sold at point of lay ────────────────────────────
const A_ARRIVED = "2026-03-08";
S.batches.push({
  id: "bA", name: "Batch 3 — Mar 2026", breed: "Isa Brown", bird_type: "pullet",
  arrival_date: A_ARRIVED, doc_count: 3000, target_sale_age_weeks: 18,
  supplier: "CHI Farms, Ajanla", status: "Sold",
  price_per_bird_ngn: 620,
  vaccinations: vaccinationsThrough(A_ARRIVED, 126),
});
S.daily.push(...dailyRows("bA", A_ARRIVED, 3000, 120, 30, 2));   // 96.0% livability, 28/30 in band
// 128 days from set to dispatch, logged weekly. This is what makes the
// passport quote real sacks and real quantities instead of the programme.
S.feed.push(...feedRows("bA", A_ARRIVED, "pullet", 128, 2880));

const A_WEIGHTS = [1520, 1495, 1560, 1540, 1505, 1575, 1530, 1550, 1485, 1515,
                   1565, 1500, 1545, 1535, 1490, 1555, 1510, 1310, 1720, 1250];
const aStats = call("weightStats", A_WEIGHTS);
S.weight.push({
  id: "wA", batch_id: "bA", batch_name: "Batch 3 — Mar 2026", breed: "Isa Brown",
  date: "2026-07-09", week_num: 18, sample_size: aStats.n, weights: A_WEIGHTS,
  avg_weight_g: aStats.mean, min_weight_g: aStats.min, max_weight_g: aStats.max,
  sd_g: aStats.sd, cv_pct: aStats.cv, uniformity_pct: aStats.uniformity,
  benchmark_g: call("getWeightBenchmark", "Isa Brown", 18),
  notes: "Weighed before dispatch",
});
S.customers.push({ id: "cA", name: "Adeyemi Farms, Ibadan", name_normalized: "adeyemi farms, ibadan",
  phone: "0803 111 2222", customer_type: "Farmer", location: "Ibadan, Oyo", created_at: "2026-05-02" });
const saleA = {
  id: "sA", date: "2026-07-14", batch_id: "bA", batch_name: "Batch 3 — Mar 2026",
  breed: "Isa Brown", quantity: 1200, age_weeks_at_sale: 18,
  price_per_bird_ngn: 3200, total_amount_ngn: 3840000,
  payment_type: "cash", paid: true, customer_id: "cA", buyer: "Adeyemi Farms, Ibadan",
  seller: "Tunde Bello", doc_ref: "BT-260714-K7MRD", notes: "",
};
S.sales.push(saleA);

// ── Lot B: the same document on a lot that had a hard run ───────────────
const B_ARRIVED = "2026-04-19";
S.batches.push({
  id: "bB", name: "Batch 4 — Apr 2026", breed: "Lohmann Brown", bird_type: "pullet",
  arrival_date: B_ARRIVED, doc_count: 2500, target_sale_age_weeks: 18,
  supplier: "Zartech, Ibadan", status: "Sold",
  price_per_bird_ngn: 640,
  vaccinations: vaccinationsThrough(B_ARRIVED, 84),   // last two still outstanding
});
S.daily.push(...dailyRows("bB", B_ARRIVED, 2500, 225, 28, 8));   // 91.0% livability, 20/28 in band

const B_WEIGHTS = [1440, 1380, 1520, 1600, 1300, 1250, 1680, 1420, 1390, 1550,
                   1330, 1480, 1620, 1270, 1500, 1360, 1450, 1700, 1220, 1580];
const bStats = call("weightStats", B_WEIGHTS);
S.weight.push({
  id: "wB", batch_id: "bB", batch_name: "Batch 4 — Apr 2026", breed: "Lohmann Brown",
  date: "2026-08-18", week_num: 17, sample_size: bStats.n, weights: B_WEIGHTS,
  avg_weight_g: bStats.mean, min_weight_g: bStats.min, max_weight_g: bStats.max,
  sd_g: bStats.sd, cv_pct: bStats.cv, uniformity_pct: bStats.uniformity,
  benchmark_g: call("getWeightBenchmark", "Lohmann Brown", 17),
  notes: "Wide spread — small birds graded out",
});
S.customers.push({ id: "cB", name: "Zainab Agro Ventures", name_normalized: "zainab agro ventures",
  phone: "0805 444 3333", customer_type: "Agro-Dealer", location: "Ilorin, Kwara", created_at: "2026-06-11" });
const saleB = {
  id: "sB", date: "2026-08-24", batch_id: "bB", batch_name: "Batch 4 — Apr 2026",
  breed: "Lohmann Brown", quantity: 600, age_weeks_at_sale: 18,
  price_per_bird_ngn: 2900, total_amount_ngn: 1740000,
  payment_type: "credit", paid: false, due_date: "2026-09-24",
  customer_id: "cB", buyer: "Zainab Agro Ventures", seller: "Tunde Bello",
  doc_ref: "BT-260824-QP3NW", notes: "",
};
S.sales.push(saleB);

// ── Page ────────────────────────────────────────────────────────────────
// The explainer sits outside .rd-ov on purpose: the print stylesheet hides
// every direct child of <body> and re-shows only the overlay, so what you read
// on screen never reaches the paper.
const style = html.slice(html.indexOf("<style>"), html.indexOf("</style>") + 8);

const note = (lot, text) => `<div class="lot-note"><b>${lot}</b> ${text}</div>`;

const page = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pullet passport — what it is</title>
${style}
<style>
  body{margin:0;background:#f3f0f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2a2230}
  .wrap{max-width:760px;margin:0 auto;padding:28px 20px 8px}
  h1{font-size:26px;margin:0 0 6px;color:#4a1060;letter-spacing:-.01em}
  .lede{font-size:15px;line-height:1.65;color:#5c5165;margin:0 0 20px}
  h2{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;
     color:#8a7d92;margin:22px 0 8px}
  ul{margin:0 0 4px;padding-left:20px}
  li{font-size:14px;line-height:1.7;margin-bottom:5px}
  .box{background:#fff;border-radius:12px;padding:16px 20px;margin-bottom:14px;
       box-shadow:0 1px 3px rgba(74,16,96,.08)}
  .box p{font-size:14px;line-height:1.65;margin:0 0 10px}
  .box p:last-child{margin-bottom:0}
  code{background:#f6eefa;color:#4a1060;padding:2px 6px;border-radius:4px;font-size:13px}
  .lot-note{max-width:760px;margin:26px auto 10px;padding:12px 18px;background:#fff;
    border-left:4px solid #7b2d8b;border-radius:0 10px 10px 0;font-size:14px;line-height:1.6;
    box-shadow:0 1px 3px rgba(74,16,96,.08)}
  .lot-note b{color:#4a1060}
  .rd-ov{position:static;background:transparent;height:auto;display:block}
  .rd-scroll{padding:0 20px 40px}
  .rd{margin:0 auto 28px}
</style>
</head><body>

<div class="wrap">
  <h1>The pullet passport</h1>
  <p class="lede">One sheet you print and hand over with the birds. It states what the
  buyer is getting — and every number on it is read straight out of the daily records
  you already keep, not typed in for the occasion.</p>

  <div class="box">
    <p><b>Where it comes from:</b> <code>Finance → Sales</code>, then the
    <b>Passport</b> button on any sale that has a batch behind it. Nothing extra to
    fill in.</p>
    <p><b>What makes it worth having:</b> most farms tell a buyer the pullets are good.
    This hands them the evidence, on your letterhead, with a reference number they can
    quote back. It is also where your responsibility ends and theirs begins — the
    "still to come" list is the programme they have to continue.</p>
  </div>

  <h2>What it puts on the page</h2>
  <ul>
    <li><b>Mean body weight</b> against the breed standard for that week — and when the
      birds were actually weighed, so a stale figure cannot pass as a fresh one.</li>
    <li><b>Uniformity</b> — the share of birds within ±10% of the mean. The number a
      serious buyer asks for, because a ragged flock never comes into lay together.
      Needs individual weights on the weighing form; without them this cell reads "—".</li>
    <li><b>Livability</b> to the day of dispatch, from the day-olds originally set.</li>
    <li><b>Brooding temperature held</b> — how many logged days sat inside the target
      band for the bird's age.</li>
    <li><b>Health programme</b> — given here, and still outstanding.</li>
    <li><b>Reared on</b> — the feed programme the lot actually ran.</li>
  </ul>

  <h2>Two real-shaped examples</h2>
  <p class="lede" style="margin-bottom:0">Below are the same document for two lots. The
  second one is the important one: the passport reports what the records say, including
  when that is not flattering. A certificate that always looks good is worth nothing to
  the person reading it.</p>
</div>

<div id="rd-overlay" class="rd-ov">
  <div class="rd-scroll">
    ${note("Lot A —", "a good run. 96% livability, weights just under the Isa Brown standard, 85% uniformity, temperature held on 28 of 30 logged days, and the full programme given through to the EDS booster. Feed was logged daily, so \"reared on\" quotes the actual sacks and quantities. This is the sheet that justifies a premium.")}
    ${call("buildPassportHTML", saleA)}
    ${note("Lot B —", "a hard run, and the document says so. 91% livability, 89% of the Lohmann standard, 60% uniformity, temperature held on only 20 of 28 days, and two vaccinations still outstanding that now fall to the buyer. Daily feed was never logged for it, so \"reared on\" falls back to the programme, truncated at the age the birds actually reached, and says so. Handing this over honestly is what makes Lot A’s sheet believable.")}
    ${call("buildPassportHTML", saleB)}
  </div>
</div>

</body></html>`;

const out = path.join(ROOT, "demos", "pullet-passport.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page, "utf8");

console.log("Lot A  livability " + call("batchLivabilityAt", S.batches[0], saleA.date).toFixed(1) +
            "%  uniformity " + aStats.uniformity + "%  CV " + aStats.cv +
            "%  mean " + aStats.mean + "g  temp " + JSON.stringify(call("batchTempComplianceAt", S.batches[0], saleA.date)));
console.log("Lot B  livability " + call("batchLivabilityAt", S.batches[1], saleB.date).toFixed(1) +
            "%  uniformity " + bStats.uniformity + "%  CV " + bStats.cv +
            "%  mean " + bStats.mean + "g  temp " + JSON.stringify(call("batchTempComplianceAt", S.batches[1], saleB.date)));
console.log("\nWritten: " + out);
