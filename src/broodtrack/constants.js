// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════
const APP_VERSION='2026.09.18-b17';  // bump on each deploy; shown on login screen + console
const BREEDS_BY_TYPE={
  broiler:['Arbor Acres','Marshall','Other'],
  pullet:['Isa Brown','Lohmann Brown','Hy-Line Brown','Black Pullet','Other'],
  noiler:['Noiler','Other'],
};
const BREED_BENCHMARKS={
  'Isa Brown':     {0:33,1:73,2:125,3:185,4:270,5:370,6:460,7:550,8:645,9:735,10:830,11:925,12:1025,13:1125,14:1225,15:1315,16:1405,17:1485,18:1565},
  'Lohmann Brown': {0:40,1:72,2:128,3:210,4:295,5:395,6:495,7:605,8:715,9:830,10:945,11:1060,12:1175,13:1275,14:1375,15:1450,16:1525,17:1585,18:1640},
  'Hy-Line Brown': {0:38,1:70,2:122,3:198,4:275,5:375,6:475,7:585,8:695,9:810,10:925,11:1040,12:1155,13:1258,14:1360,15:1438,16:1515,17:1573,18:1630},
  'Black Pullet':  {0:42,1:85,2:140,3:225,4:310,5:415,6:520,7:635,8:750,9:875,10:1000,11:1120,12:1240,13:1350,14:1460,15:1555,16:1650,17:1725,18:1800},
  'Arbor Acres':   {2:450,4:1100,6:1900,8:2700,10:3300,12:3700,14:4000,16:4200},
  'Marshall':      {2:430,4:1050,6:1800,8:2600,10:3100,12:3500,14:3800,16:4000},
  'Noiler':        {2:200,4:500,6:720,8:900,10:1050,12:1200,14:1350,16:1400,18:1500},
  'Other':         {2:160,4:380,6:560,8:750,10:900,12:1050,14:1180,16:1280,18:1380},
};
const DOC_WEIGHT_G=40;
const BREED_PURPOSE={
  'Isa Brown':'pullet','Lohmann Brown':'pullet','Hy-Line Brown':'pullet','Black Pullet':'pullet',
  'Arbor Acres':'broiler','Marshall':'broiler',
  'Noiler':'noiler','Other':'pullet',
};
function getBirdType(batch){return batch.bird_type||(BREED_PURPOSE[batch.breed]||'pullet');}
function getBirdTypeLabel(t){return t==='broiler'?'Broiler':t==='noiler'?'Noiler':'Pullet';}
function getBreedPurpose(breed){return BREED_PURPOSE[breed]||'pullet';}
function getFeedEffBenchmarks(birdType){
  if(birdType==='broiler')return{fcrGood:1.8,fcrOk:2.2,adgGood:50,adgOk:35,label:'Broiler'};
  if(birdType==='noiler') return{fcrGood:2.5,fcrOk:3.0,adgGood:20,adgOk:12,label:'Noiler'};
  return                         {fcrGood:3.0,fcrOk:3.5,adgGood:10,adgOk:7, label:'Pullet'};
}
const BROILER_VACC_SCHEDULE=[
  {dayMin:1,  dayMax:1,  name:"NDV1-0",             route:"Ocular (Eye Drop)"},
  {dayMin:1,  dayMax:5,  name:"Antibiotics",         route:"Drinking Water"},
  {dayMin:10, dayMax:10, name:"Gumboro 1 (IBD)",     route:"Drinking Water"},
  {dayMin:14, dayMax:14, name:"Lasota 1 (ND)",       route:"Drinking Water"},
  {dayMin:17, dayMax:17, name:"Gumboro 2 (IBD)",     route:"Drinking Water"},
  {dayMin:15, dayMax:21, name:"Coccidiostat",        route:"Drinking Water"},
  {dayMin:22, dayMax:28, name:"Lasota 2 (ND)",       route:"Drinking Water"},
  {dayMin:29, dayMax:35, name:"Antibiotics 2",       route:"Drinking Water"},
  {dayMin:36, dayMax:42, name:"Coccidiostat 2",      route:"Drinking Water"},
  {dayMin:36, dayMax:42, name:"Dewormer",            route:"Drinking Water"},
];
// Pullet/POL vaccination programme — base encoded from the farm's recommended
// programme book (images/pullet_meds.png, validated in pullet_meds_reading.txt),
// WEEK rows converted to days (week N => day N*7), kept in strict age order.
// Enhancements over the book (approved by farm owner as senior-scientist upgrades):
//   • Day-1 ND now combined with IB (ND+IB live) + IB boosted on both Lasota doses
//     — protects the developing oviduct against "false layer" damage.
//   • Fowl Typhoid 9R prime (wk8) + booster (wk15) — endemic Salmonella in NG.
//   • Coryza given as prime (wk6) + booster (wk10) instead of a single dose.
//   • Wk6 "Coccidiosis" reinterpreted as a 2nd coccidiostat course (per owner).
//   • Arrival glucose+electrolytes step added as the first management step.
// Scheduling rule baked in: live bacterial 9R is spaced >=3 days from any
// antibiotic water course (antibiotics kill live bacterial vaccines; viral
// vaccines are unaffected). Names are unique so per-batch done-marks never collide.
// Route audit (2026-08-06), routes only — no name/day changes, so done-marks survive:
// Fowl Typhoid 9R x2 wing-stab removed (live SG vaccine is SC/IM only); Coryza x2 and
// EDS+NDV are oil-adjuvant killed, IM or SC per vial label; Fowl Cholera SC assumes the
// killed bacterin. Coccidiostat 2 (d42) must stay amprolium-type — a sulfa drug kills 9R.
// Conditional rows (2026-09-07, optional:true + why): a row flagged optional still shows
// in the schedule and can be ticked, but never raises an overdue/due alert and is never
// picked as "Next". Antibiotics 2 (d49) — routine antibiotics on a healthy flock breed
// resistance, so treat on diagnosis only. Fowl Cholera (d84) — Pasteurella bacterin is
// serotype-specific and short-lived; it is a site-history call, not a universal (farm
// vet's advice). Fowl Typhoid 9R stays REQUIRED: S. Gallinarum is endemic nationwide and
// vertically transmitted, so a clean site does not make the flock safe.
const LAYER_VACC_SCHEDULE=[
  {dayMin:1,  dayMax:1,  name:"Marek's Disease",              route:"Subcutaneous",hatchery:true},
  {dayMin:1,  dayMax:1,  name:"Glucose + Electrolytes (arrival, first 4–6 hrs)",route:"Drinking Water"},
  {dayMin:1,  dayMax:1,  name:"ND HB1 + IB (Live)",           route:"Eye Drop / Spray"},
  {dayMin:1,  dayMax:5,  name:"Antibiotics 1 + Vitamins",     route:"Drinking Water"},
  {dayMin:10, dayMax:10, name:"Gumboro 1 (IBD, intermediate)",route:"Drinking Water"},
  {dayMin:17, dayMax:17, name:"Gumboro 2 (IBD, intermediate)",route:"Drinking Water"},
  {dayMin:20, dayMax:20, name:"ND Lasota 1 + IB",             route:"Drinking Water"},
  {dayMin:21, dayMax:21, name:"Coccidiostat 1",               route:"Drinking Water"},
  {dayMin:35, dayMax:35, name:"Gumboro 3 (IBD, intermediate)",route:"Drinking Water"},
  {dayMin:42, dayMax:42, name:"Coccidiostat 2",               route:"Drinking Water"},
  {dayMin:42, dayMax:42, name:"Coryza 1 (Pullet)",            route:"Intramuscular / Subcutaneous"},
  {dayMin:49, dayMax:49, name:"Antibiotics 2",                route:"Drinking Water",optional:true,
   why:"Only if birds show illness — routine dosing breeds resistance. Skip if the flock is healthy."},
  {dayMin:56, dayMax:56, name:"Fowl Pox",                     route:"Wing Web"},
  {dayMin:56, dayMax:56, name:"Fowl Typhoid 9R 1 (prime)",    route:"Subcutaneous / IM"},
  {dayMin:63, dayMax:63, name:"Dewormer 1",                   route:"Drinking Water"},
  {dayMin:70, dayMax:70, name:"ND Lasota 2 + IB",             route:"Drinking Water"},
  {dayMin:70, dayMax:70, name:"Coryza 2 (Pullet, booster)",   route:"Intramuscular / Subcutaneous"},
  {dayMin:77, dayMax:77, name:"Dewormer 2",                   route:"Drinking Water"},
  {dayMin:84, dayMax:84, name:"Fowl Cholera (Pullet)",        route:"Subcutaneous",optional:true,
   why:"Only if this site has had cholera before, or birds go on deep litter / range. Cage-reared with rodent control can skip."},
  {dayMin:105,dayMax:105,name:"Fowl Typhoid 9R 2 (booster)",  route:"Subcutaneous / IM"},
  {dayMin:112,dayMax:112,name:"EDS + NDV (Killed)",           route:"Intramuscular / Subcutaneous"},
];
const VACC_NOTE="Give multivitamins in drinking water after every vaccination, antibiotic, dewormer, or coccidiostat treatment.";
// ── Receipt / invoice document ──────────────────────────────────────────
// Two term sets only: a sale is day-old chicks or it is grown birds. Which one
// applies is read off age at sale rather than asked for again.
const DOC_TERM_KEYS=[
  {key:'birds',label:'Birds (pullets, growers, broilers)',
   text:'Birds counted and checked before dispatch. Goods sold in good condition are not returnable. Report shortages within 24 hours.'},
  {key:'doc',  label:'Day-old chicks',
   text:'Chicks counted at dispatch. Goods sold in good condition are not returnable.'}
];
function getDocTermKey(sale){
  const wks=Number(sale?.age_weeks_at_sale);
  return (Number.isFinite(wks)&&wks<=1)?'doc':'birds';
}
function getDocTerms(sale){
  const k=getDocTermKey(sale);
  const custom=((DB.getFarm()||{}).doc_terms||{})[k]||'';
  return custom.trim()||DOC_TERM_KEYS.find(t=>t.key===k).text;
}
function getDocBusiness(){
  const f=DB.getFarm()||{};
  return {
    name:(f.doc_name||'').trim()||f.name||'My Farm',
    address:(f.doc_address||'').trim(),
    phone:(f.doc_phone||'').trim(),
    email:(f.doc_email||'').trim(),
    rc:(f.doc_rc||'').trim(),
    bank:(f.bank_name||'').trim(),
    acctNo:(f.bank_account||'').trim(),
    acctName:(f.bank_account_name||'').trim()
  };
}
function isDocSetupComplete(){
  const b=getDocBusiness();
  return !!(b.address&&b.phone);
}
// ── Document reference ──────────────────────────────────────────────────
// Stored on the sale as doc_ref, never recomputed. The number a buyer is
// holding on a printed receipt must not change if this logic is ever edited.
// Derived from the sale's own id (uid() is timestamp + random) rather than a
// counter, so two phones recording sales offline cannot collide on it.
// Alphabet omits I, O, 0 and 1 — these get read aloud over the phone.
// 5 chars from a 30-char alphabet = 24.3M suffixes per date, so two devices
// recording offline on the same day effectively cannot pick the same ref.
const DOC_REF_PREFIX='BT';
const DOC_REF_ALPHABET='23456789ABCDEFGHJKMNPQRSTVWXYZ';
function _docRefHash(seed,salt){
  let h=0x811c9dc5;
  const s=String(seed)+'#'+(salt||0);
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
  let out='';
  for(let i=0;i<5;i++){
    out+=DOC_REF_ALPHABET[h%DOC_REF_ALPHABET.length];
    h=Math.imul(h^(i+1),0x01000193)>>>0;
  }
  return out;
}
function makeDocRef(sale,salt){
  const d=String(sale.date||DB.today()).replace(/-/g,'').slice(2);  // YYMMDD
  return `${DOC_REF_PREFIX}-${d}-${_docRefHash(sale.id,salt)}`;
}
function nextDocRef(sale){
  const taken=new Set(DB.getSales().map(s=>s.doc_ref).filter(Boolean));
  let ref=makeDocRef(sale,0),n=0;
  while(taken.has(ref)&&n<50)ref=makeDocRef(sale,++n);
  return ref;
}
// Sales recorded before this feature existed have no ref — give them one the
// first time a document is opened for them.
function ensureDocRef(sale){
  if(sale.doc_ref)return sale.doc_ref;
  const ref=nextDocRef(sale);
  DB.updSale(sale.id,{doc_ref:ref,doc_issued_at:DB.today()});
  return ref;
}
const LAST_SELLER_KEY='bt_last_seller';
function getVaccSchedule(birdType){return birdType==='broiler'?BROILER_VACC_SCHEDULE:LAYER_VACC_SCHEDULE;}
const BROILER_FEED_PHASES=[
  {maxDay:14, label:'Starter',  key:'starter',  feedGPerBird:45},
  {maxDay:28, label:'Chick',    key:'chick',    feedGPerBird:90},
  {maxDay:999,label:'Finisher', key:'finisher', feedGPerBird:130},
];
const PULLET_FEED_PHASES=[
  {maxDay:21, label:'Brooding', key:'brooding', feedGPerBird:30},
  {maxDay:56, label:'Starter',  key:'starter',  feedGPerBird:50},
  {maxDay:126,label:'Grower',   key:'grower',   feedGPerBird:75},
  {maxDay:999,label:'Pre-Sale', key:'presale',  feedGPerBird:110},
];
const NOILER_FEED_PHASES=[
  {maxDay:21, label:'Brooding', key:'brooding', feedGPerBird:35},
  {maxDay:70, label:'Grower',   key:'grower',   feedGPerBird:70},
  {maxDay:999,label:'Pre-Sale', key:'presale',  feedGPerBird:95},
];
function getFeedPhases(birdType){return birdType==='broiler'?BROILER_FEED_PHASES:birdType==='noiler'?NOILER_FEED_PHASES:PULLET_FEED_PHASES;}
function getFeedPhaseForBatch(batch,ageDays){
  const phases=getFeedPhases(getBirdType(batch));
  return phases.find(p=>ageDays<=p.maxDay)||phases[phases.length-1];
}
// Week-by-week feed intake (g/bird/day) transcribed from the farm programme book.
// Pullet weeks 1–22 explicit; week 23 (125 g) covers the 23–70 laying period.
// Broiler weeks 1–8 (birds not kept past 8 wk). Week = floor(ageDays/7)+1.
const PULLET_FEED_BY_WEEK={1:15,2:25,3:30,4:35,5:37,6:40,7:45,8:50,9:55,10:58,11:60,12:65,13:68,14:70,15:80,16:90,17:100,18:110,19:115,20:115,21:115,22:115,23:125};
const BROILER_FEED_BY_WEEK={1:18,2:45,3:70,4:95,5:120,6:130,7:150,8:165};
function getFeedByWeekTable(birdType){return birdType==='broiler'?BROILER_FEED_BY_WEEK:birdType==='pullet'?PULLET_FEED_BY_WEEK:null;}
function getFeedRateForAge(birdType,ageDays){
  const t=getFeedByWeekTable(birdType); if(!t)return null;      // noiler → no book data
  const wk=Math.floor((ageDays||0)/7)+1, maxWk=Math.max(...Object.keys(t).map(Number));
  return t[Math.min(wk,maxWk)];
}
const DEFAULT_WATER_RATIO=2.5;  // daily water (ml) = feed (g) × ratio; editable per bird type
// Effective feed rate (g/bird/day) by bird type + age: book week-value for pullet/broiler;
// farm override or phase default for noiler.
function getFeedRateGByType(birdType,ageDays,farm){
  const book=getFeedRateForAge(birdType,ageDays);
  if(book!=null)return book;
  const f=farm||DB.getFarm()||{}, phases=getFeedPhases(birdType);
  const phase=phases.find(p=>ageDays<=p.maxDay)||phases[phases.length-1];
  return (f[`${birdType}_feedRateG_${phase.key}`])||phase.feedGPerBird;
}
function getFeedRateG(batch,ageDays){return getFeedRateGByType(getBirdType(batch),ageDays);}
function getWaterRatio(birdType,farm){const f=farm||DB.getFarm()||{};return f[`${birdType}_waterRatio`]||DEFAULT_WATER_RATIO;}
const BROILER_TEMP_TARGETS=[
  {maxDay:7,  min:32,max:35,label:'Week 1'},
  {maxDay:14, min:29,max:32,label:'Week 2'},
  {maxDay:21, min:26,max:29,label:'Week 3'},
  {maxDay:28, min:24,max:27,label:'Week 4'},
  {maxDay:42, min:21,max:25,label:'Weeks 5–6'},
  {maxDay:56, min:18,max:24,label:'Weeks 7–8'},
];
const PULLET_TEMP_TARGETS=[
  {maxDay:7,  min:33,max:35,label:'Week 1'},
  {maxDay:14, min:30,max:32,label:'Week 2'},
  {maxDay:21, min:27,max:29,label:'Week 3'},
  {maxDay:56, min:20,max:28,label:'Weeks 4–8'},
  {maxDay:84, min:18,max:27,label:'Weeks 9–12'},
];
const BROOD_FEED_TYPES=['Starter Mash','Chick Mash','Grower Mash','Finisher Pellets','Pre-Layer Mash','Brooding Mash','Concentrate','Other'];
// ── Feed store defaults ─────────────────────────────────────────────────
// Feed is bought and counted in bags but consumed in kg, so bag size is the
// hinge between the two. Editable per feed type in Settings; 25 kg is the
// common sack here.
const DEFAULT_BAG_KG=25;
// Amber below ten days of feed left, red below five. These used to be derived
// from the supplier's lead time — red inside it, amber inside twice it — so the
// colour moved whenever that setting was edited, and the farm had no way to say
// plainly when it wants to be warned. Stored as the two thresholds they are.
const DEFAULT_FEED_WARN_DAYS=10;   // amber below this many days of cover
const DEFAULT_FEED_URGENT_DAYS=5;  // red below this many
const DEFAULT_FEED_TARGET_DAYS=30; // cover a purchase should buy
// Which sack each phase of each bird type calls for. Pullets run Starter Mash
// then Chick Mash then Grower Mash then Pre-Layer, which is the farm's own
// sequence; broilers finish on Finisher Pellets. Editable per bird type in
// Settings, and only what differs from these is stored.
const DEFAULT_BROOD_FEED_TYPES={
  broiler:{starter:'Starter Mash', chick:'Chick Mash',   finisher:'Finisher Pellets'},
  pullet: {brooding:'Starter Mash',starter:'Chick Mash', grower:'Grower Mash', presale:'Pre-Layer Mash'},
  noiler: {brooding:'Starter Mash',grower:'Grower Mash', presale:'Finisher Pellets'},
};
// The same drift LayerTrack has: a name typed by hand into a daily entry, or
// carried in from another app, ends up as a second card holding half the bags.
// Names are folded to the list above on read, so records keep whatever they were
// saved with and nothing has to be migrated. Only spellings of one name are
// brought together — Starter, Chick and Grower are three different sacks here,
// and merging any two of them would invent stock that is not in the store.
const BROOD_FEED_ALIASES={
  'starter':'Starter Mash','starter pellets':'Starter Mash',
  'chick':'Chick Mash','chicks mash':'Chick Mash',
  'grower':'Grower Mash','growers mash':'Grower Mash','grower pellets':'Grower Mash',
  'finisher':'Finisher Pellets','finisher mash':'Finisher Pellets',
  'pre layer mash':'Pre-Layer Mash','prelayer mash':'Pre-Layer Mash','pre-layer':'Pre-Layer Mash',
  'brooding':'Brooding Mash',
};
function canonFeedType(t){
  const raw=String(t||'').trim();
  if(!raw)return '';
  const key=raw.toLowerCase().replace(/\s+/g,' ');
  if(BROOD_FEED_ALIASES[key])return BROOD_FEED_ALIASES[key];
  return BROOD_FEED_TYPES.find(x=>x.toLowerCase()===key)||raw;
}
const BROOD_EXPENSE_CATS=['DOC Purchase','Feed','Medication','Litter/Bedding','Labour','Equipment','Transport','Brooding Fuel/Power','Other'];
const MED_SUGGESTIONS=['ND HB1 + IB (Live)','ND Lasota + IB','Lasota (ND)','Gumboro 1 (IBD, intermediate)','Gumboro 2 (IBD, intermediate)','Gumboro 3 (IBD, intermediate)','Fowl Pox Vaccine','Coryza Vaccine','Fowl Cholera Vaccine','Fowl Typhoid 9R','EDS + NDV (Killed)','Marek\'s Disease Vaccine','Coccidiostat','Dewormer','Antibiotics','Amprolium','Tylosin','Floxinor','Glucose + Electrolytes','Multivitamin','Vitamin C/E','Electrolytes'];
