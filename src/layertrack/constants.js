// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════
const APP_VERSION='2026.09.18-b13';  // bump on each deploy; shown on login screen + console
const ROUNDS = [
  {id:1,label:'1st Pick',sub:'Morning',  cls:'round-1'},
  {id:2,label:'2nd Pick',sub:'Afternoon',cls:'round-2'},
  {id:3,label:'3rd Pick',sub:'Evening',  cls:'round-3'},
];
const FLOCK_STAGES = [
  {maxWeek:18, label:'Pre-Lay',    emoji:'🥚',expected:5, warn:0, bg:'#f0f0f0',color:'#888'},
  {maxWeek:22, label:'Early Lay',  emoji:'🌱',expected:30,warn:10,bg:'#e8f4fd',color:'#1a5fa8'},
  {maxWeek:27, label:'Building Up',emoji:'📈',expected:65,warn:35,bg:'#fef3cd',color:'#7d4e00'},
  {maxWeek:55, label:'Peak',       emoji:'⭐',expected:87,warn:72,bg:'#d8f3dc',color:'#1b4332'},
  {maxWeek:65, label:'Post-Peak',  emoji:'📉',expected:78,warn:60,bg:'#e8f4fd',color:'#1a5fa8'},
  {maxWeek:75, label:'Declining',  emoji:'🔻',expected:65,warn:48,bg:'#fef3cd',color:'#7d4e00'},
  {maxWeek:999,label:'Late Lay',   emoji:'⏳',expected:50,warn:35,bg:'#fde8ea',color:'#d62839'},
];
// Pullet feed requirement table: index 0 = week 1, index 21 = week 22; week 23+ = full laying (120g)
const LAYER_FEED_TABLE = [15,25,30,35,37,40,45,50,55,58,60,65,68,70,80,90,100,110,115,115,115,115];
function getLayerFeedRate(ageWeeks){
  if(!ageWeeks||ageWeeks<1||ageWeeks>=23) return 120;
  return LAYER_FEED_TABLE[ageWeeks-1];
}
// Pullet water requirement table: index 0 = week 1, index 21 = week 22; week 23+ = full laying (250ml)
const LAYER_WATER_TABLE = [30,50,60,70,75,80,90,100,110,115,120,130,135,140,160,180,200,220,230,230,230,230];
function getLayerWaterRate(ageWeeks){
  if(!ageWeeks||ageWeeks<1||ageWeeks>=23) return 250;
  return LAYER_WATER_TABLE[ageWeeks-1];
}
const FEED_TYPES = ['Grower','Pre-Layer Mash','Layer Mash','Concentrate','Other'];
// Feed names drift. 'Grower Pellets' was on this list first, 'grower' gets typed
// by hand into a daily entry, and BroodTrack calls the same sack 'Grower Mash' —
// but it is one feed in one store, and two cards for it is worse than none since
// each shows half the bags. Names are folded to the canonical list on read, so
// old records keep whatever they were saved with and nothing has to be migrated.
// Chick Mash is deliberately absent rather than aliased: it is a different sack,
// so any left over shows as its own idle card instead of inflating Grower.
const FEED_ALIASES = {
  'grower pellets':'Grower','grower mash':'Grower','growers mash':'Grower',
  'pre layer mash':'Pre-Layer Mash','prelayer mash':'Pre-Layer Mash','pre-layer':'Pre-Layer Mash',
  'layer':'Layer Mash','layers mash':'Layer Mash','layer pellets':'Layer Mash',
};
function canonFeedType(t){
  const raw=String(t||'').trim();
  if(!raw)return '';
  const key=raw.toLowerCase().replace(/\s+/g,' ');
  if(FEED_ALIASES[key])return FEED_ALIASES[key];
  return FEED_TYPES.find(x=>x.toLowerCase()===key)||raw;
}
// ── Feed store defaults ─────────────────────────────────────────────────
// Feed is bought and counted in bags but consumed in kg, so bag size is the
// hinge between the two. Editable per feed type in Settings; 25 kg is the
// common sack here.
const DEFAULT_BAG_KG = 25;
// Amber below ten days of feed left, red below five. These used to be derived
// from the supplier's lead time — red inside it, amber inside twice it — so the
// colour moved whenever that setting was edited, and the farm had no way to say
// plainly when it wants to be warned. Stored as the two thresholds they are.
const DEFAULT_FEED_WARN_DAYS = 10;   // amber below this many days of cover
const DEFAULT_FEED_URGENT_DAYS = 5;  // red below this many
const DEFAULT_FEED_TARGET_DAYS = 30; // cover a purchase should buy
// The farm's feed programme: which feed a flock is on, by age in weeks. Birds
// arrive here already on Grower, so nothing earlier than Grower is on the list —
// chick feed belongs to BroodTrack. `toWeek` is the last week a stage covers; the
// final stage is open-ended and runs to the end of lay. Editable in Settings.
const DEFAULT_FEED_PROGRAMME = [
  {type:'Grower',         toWeek:16},
  {type:'Pre-Layer Mash', toWeek:18},
  {type:'Layer Mash',     toWeek:null},
];
const EXPENSE_CATS = ['Feed Purchase','Medication','Transport','Generator Fuel','Labour','Litter/Bedding','Chick Purchase','Equipment','Water Purchase','Other'];
const PRODUCT_TYPES = ['Eggs — Crates','Culled Birds','Cockerels','Manure','Other'];
const EGGS_PER_CRATE = 30;
// ── Receipt / invoice document ──────────────────────────────────────────
// Terms printed on the document, per product. Kept to two short sentences —
// a buyer reads this on a phone. Each farm can edit them in Settings; these
// are only the defaults. getDocTerms() falls back here when unset.
const DEFAULT_DOC_TERMS = {
  'Eggs — Crates':'Crates counted and checked on collection. Goods sold in good condition are not returnable.',
  'Culled Birds' :'Birds counted and checked before collection. Goods sold in good condition are not returnable.',
  'Cockerels'    :'Birds counted and checked before collection. Goods sold in good condition are not returnable.',
  'Manure'       :'Sold as loaded. Goods sold in good condition are not returnable.',
  'Other'        :'Goods counted and checked on collection. Goods sold in good condition are not returnable.'
};
function getDocTerms(product){
  const custom=(DB.getFarm()||{}).doc_terms||{};
  return (custom[product]||'').trim()||DEFAULT_DOC_TERMS[product]||DEFAULT_DOC_TERMS['Other'];
}
// Business identity for the document header. Falls back to the farm name so a
// farm that hasn't filled Settings still gets a document with a name on it.
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
// True once there's enough to produce a document that doesn't look unfinished.
function isDocSetupComplete(){
  const b=getDocBusiness();
  return !!(b.address&&b.phone);
}
// ── Document reference ──────────────────────────────────────────────────
// Stored on the sale as doc_ref, never recomputed. The number a customer is
// holding on a printed receipt must not change if this logic is ever edited.
// Derived from the sale's own id (uid() is timestamp + random) rather than a
// counter, so two phones recording sales offline cannot collide on it.
// Alphabet omits I, O, 0 and 1 — these get read aloud over the phone.
// 5 chars from a 30-char alphabet = 24.3M suffixes per date, so two devices
// recording offline on the same day effectively cannot pick the same ref.
const DOC_REF_PREFIX='LT';
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
// Deterministic first candidate, re-rolled only if that ref is already taken.
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
const LAST_SELLER_KEY='lt_last_seller';
const MED_SUGGESTIONS = ['Floxinor','MAXI Vitaconc','Lasota (ND)','Gumboro Vaccine','Amprolium','Tylosin','Oxytetracycline','Vitamin C','Electrolytes','Multivitamin','Water only'];
const DROP_OPTIONS = ['Normal','Brownish','Greenish','Bloody','Watery','Yellowish'];
const ADMIN_METHODS = ['Oral (Drinking Water)','Oral (Direct)','Injection','Eye Drop','Feed Mixing'];
