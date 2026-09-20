// Smoke test for the vaccination/medication record.
//
// Loads the generated BroodTrack <script> into a vm with just enough stubbed
// out to let the top-level run, then renders buildVaccDocHTML against three
// synthetic batches: one part-way through the programme with date-stamped
// ticks, one with legacy boolean ticks, and one untouched.
//
// It is checking the document logic, not the styling — that the given/todo
// split is right, that legacy ticks fall back to the programme date and
// raise the footnote, and that nothing throws.
//
// Usage: node tools/smoke_vaccdoc.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.dirname(__dirname);
const html = fs.readFileSync(path.join(ROOT, "BroodTrack.html"), "utf8");
const body = html.slice(
  html.indexOf("\n<script>\n") + "\n<script>\n".length,
  html.indexOf("\n</script>\n", html.indexOf("\n<script>\n")) + 1
);

const TODAY = "2026-09-13";
const ARRIVED = "2026-04-12";

const el = () => ({
  style: {}, classList: { add() {}, remove() {}, contains: () => false },
  addEventListener() {}, appendChild() {}, remove() {},
  querySelector: () => null, querySelectorAll: () => [],
  set innerHTML(_) {}, get innerHTML() { return ""; },
  set textContent(_) {}, get textContent() { return ""; },
});

const batches = [
  { id: "b1", name: "Batch 1 — Apr 2026", breed: "Isa Brown", bird_type: "pullet",
    arrival_date: ARRIVED, doc_count: 2000, status: "Active",
    vaccinations: {
      "ND HB1 + IB (Live)":            { done: true, date: "2026-04-12" },
      "Antibiotics 1 + Vitamins":      { done: true, date: "2026-04-14" },
      "Gumboro 1 (IBD, intermediate)": { done: true, date: "2026-04-21" },
    } },
  { id: "b2", name: "Batch 2 — legacy ticks", breed: "Isa Brown", bird_type: "pullet",
    arrival_date: ARRIVED, doc_count: 1500, status: "Active",
    vaccinations: { "ND HB1 + IB (Live)": true, "Coccidiostat 1": true } },
  { id: "b3", name: "Batch 3 — nothing ticked", breed: "Ross 308", bird_type: "broiler",
    arrival_date: ARRIVED, doc_count: 500, status: "Active", vaccinations: {} },
];

const sandbox = {
  console,
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

// initApp() would go to the network; everything else we need is a declaration.
vm.runInContext(body.replace(/^initApp\(\);$/m, "/* initApp() skipped */"), sandbox,
                { filename: "BroodTrack.js" });

// Pin the clock and the data the document reads. `const DB` does not become a
// property of the vm's global object, so this has to be patched from inside.
sandbox.__batches = batches;
sandbox.__farm = {
  name: "Lamuad Farms", doc_address: "Km 12 Ilesa Road, Osogbo, Osun State",
  doc_phone: "0803 000 0000", doc_email: "farm@example.ng", doc_rc: "RC 1234567",
};
vm.runInContext(`
  DB.today = () => ${JSON.stringify(TODAY)};
  DB.getBatches = () => __batches;
  DB.getDaily = () => [];
  DB.getSales = () => [];
  DB.getFarm = () => __farm;
`, sandbox);

let failures = 0;
const check = (label, cond, detail) => {
  if (!cond) { failures++; console.log("  FAIL  " + label + (detail ? "  — " + detail : "")); }
  else console.log("  ok    " + label);
};

// Schedule shape. These are husbandry rules, not display rules, so they are
// checked against the constant rather than the rendered document.
//  - Two routine rows on one day means two treatments in one visit, and where
//    one of them is a drinking-water vaccine it means a handled flock that
//    will not drink it. Conditional rows are exempt: they fire on evidence,
//    rarely, and never both at once.
//  - Point of lay sells at 12 weeks on most farms, so the week before the
//    transfer stays clear of anything that needs a bird picked up.
{
  console.log("\nLayer schedule shape");
  const sched = vm.runInContext("LAYER_VACC_SCHEDULE", sandbox);
  const routine = sched.filter(v => !v.optional && !v.hatchery);

  // Day 1 is exempt and always will be: the chicks arrive, get water with
  // glucose and electrolytes, and get their day-old vaccine. Marek's is
  // already done at the hatchery. Nothing there is a second handling of the
  // same bird, which is what this rule exists to catch.
  const byDay = {};
  for (const v of routine) {
    if (v.dayMin === 1) continue;
    (byDay[v.dayMin] = byDay[v.dayMin] || []).push(v.name);
  }
  const shared = Object.entries(byDay).filter(([, n]) => n.length > 1);
  check("no two routine rows share a day (day 1 exempt)",
        shared.length === 0,
        shared.map(([d, n]) => "day " + d + ": " + n.join(" + ")).join("; "));

  check("strict age order",
        sched.every((v, i) => i === 0 || sched[i - 1].dayMin <= v.dayMin));

  const SALE_DAY = 84;          // 12 weeks
  const QUIET_FROM = 78;
  const handled = v => !/Drinking Water/i.test(v.route);
  const inWindow = routine.filter(v => v.dayMin >= QUIET_FROM && v.dayMin <= SALE_DAY);
  check("nothing routine in the pre-sale window (d" + QUIET_FROM + "-" + SALE_DAY + ")",
        inWindow.length === 0, inWindow.map(v => v.name).join(", "));

  const lateHandling = routine.filter(v => handled(v) && v.dayMin > 70 && v.dayMin <= SALE_DAY);
  check("no bird is picked up after day 70",
        lateHandling.length === 0, lateHandling.map(v => v.name).join(", "));
}

for (const b of batches) {
  console.log("\n" + b.name);
  const rows = sandbox.getBatchVaccStatus(b);
  const given = rows.filter(v => v.done || v.hatchery);
  const todo = rows.filter(v => !v.done && !v.hatchery && !v.optional);
  const conditional = rows.filter(v => !v.done && !v.hatchery && v.optional);
  const required = rows.filter(v => !v.optional);
  const requiredGiven = required.filter(v => v.done || v.hatchery);

  let doc;
  try { doc = sandbox.buildVaccDocHTML(b); }
  catch (e) { failures++; console.log("  FAIL  threw: " + e.message); continue; }

  check("renders", doc.length > 500, doc.length + " chars");
  // Anchored on the name cell: "Antibiotics" is a substring of
  // "Antibiotics 2", so a bare indexOf would double-count it.
  const nameCell = n => '<div class="vx-name">' + sandbox.rdEsc(n) + "</div>";
  check("every row appears exactly once",
        rows.every(v => doc.split(nameCell(v.name)).length === 2),
        rows.filter(v => doc.split(nameCell(v.name)).length !== 2).map(v => v.name).join(", "));
  check("the three sections account for the whole programme",
        given.length + todo.length + conditional.length === rows.length);
  check("headline scores the required programme only",
        doc.includes(">" + requiredGiven.length + "<") &&
        doc.includes("of " + required.length + " required"));
  check("conditional rows are never counted as outstanding",
        !todo.some(v => v.optional));
  check("no unresolved template holes", !doc.includes("undefined") && !doc.includes("NaN"),
        (doc.match(/undefined|NaN/g) || []).join(","));
  check("stable ref", sandbox.vaccDocRef(b) === sandbox.vaccDocRef(b));

  const stamped = given.filter(v => v.givenDate);
  const legacy = given.filter(v => !v.hatchery && !v.givenDate);
  check("date-stamped ticks print their real date",
        stamped.every(v => doc.includes(sandbox.fmtDate(v.givenDate))));
  check("footnote present only when a tick lacks a date",
        doc.includes("exact day was not") === (legacy.length > 0),
        legacy.length + " legacy tick(s)");
  check("'still to come' section present only when something is outstanding",
        doc.includes("Still to come") === (todo.length > 0));
  check("'conditional' section present only when a conditional row is unticked",
        doc.includes("Conditional &mdash;") || doc.includes("Conditional —")
          ? conditional.length > 0 : conditional.length === 0);

  console.log("        " + given.length + " given (" + stamped.length + " dated, " +
              legacy.length + " legacy, " + given.filter(v => v.hatchery).length +
              " hatchery), " + todo.length + " outstanding, " +
              conditional.length + " conditional, ref " + sandbox.vaccDocRef(b));
}

// --preview writes a standalone page carrying the real document CSS, so the
// thing can be looked at and print-previewed without a farm login.
if (process.argv.includes("--preview")) {
  const sched = vm.runInContext("LAYER_VACC_SCHEDULE", sandbox);
  const sold = {
    id: "pol1", name: "Batch 1 — Apr 2026", breed: "Isa Brown", bird_type: "pullet",
    arrival_date: ARRIVED, doc_count: 2000, status: "Active",
    vaccinations: Object.fromEntries(sched
      .filter(v => !v.hatchery && !v.optional)
      .map(v => {
        const d = new Date(ARRIVED + "T00:00:00");
        d.setDate(d.getDate() + v.dayMin);
        return [v.name, { done: true, date: d.toISOString().slice(0, 10) }];
      })),
  };
  batches.push(sold);

  // The markup below is deliberately the exact DOM openVaccDoc() builds: one
  // .rd-ov straight off <body>, holding .rd-bar and .rd-scroll. The print
  // stylesheet hides every direct child of body and re-shows only .rd-ov, so
  // a preview that wraps the document in anything else prints a blank sheet
  // and tests nothing. Keep these in step.
  const style = html.slice(html.indexOf("<style>"), html.indexOf("</style>") + 8);
  const page = [
    "<!doctype html><html><head><meta charset='utf-8'>",
    "<meta name='viewport' content='width=device-width,initial-scale=1'>",
    "<title>Vaccination record preview</title>", style,
    "<style>body{margin:0}</style></head><body>",
    "<div id='rd-overlay' class='rd-ov'>",
    "<div class='rd-bar'>",
    "<span class='rd-bar-ttl'>Health Record — preview</span>",
    "<button class='rd-bar-btn primary' onclick='window.print()'>Print / PDF</button>",
    "</div>",
    "<div class='rd-scroll'>", sandbox.buildVaccDocHTML(sold), "</div>",
    "</div></body></html>",
  ].join("");

  const out = path.join(ROOT, "demos", "vaccdoc-preview.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, page, "utf8");
  console.log("\nPreview written: " + out);
}

console.log(failures ? "\n" + failures + " FAILURE(S)" : "\nAll smoke checks passed.");
process.exit(failures ? 1 : 0);
