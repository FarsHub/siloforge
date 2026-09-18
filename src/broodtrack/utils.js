// ═══════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function fmtDate(iso){const d=new Date(iso+'T00:00:00');return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
// Both of these stay in UTC end to end. Parsing 'T00:00:00' as local and then
// serialising with toISOString() shifts the answer by a day everywhere east of
// Greenwich — including here — so the arithmetic is pinned to UTC instead.
function addDays(iso,n){const d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function daysBetween(fromIso,toIso){return Math.round((new Date(toIso+'T00:00:00Z')-new Date(fromIso+'T00:00:00Z'))/864e5)}
function fmtMoney(n){return '₦'+Number(n||0).toLocaleString('en-NG',{minimumFractionDigits:0})}
const LOCK_DAYS=7;
function isLocked(dateStr){ if(!dateStr)return false; const diff=(new Date(DB.today())-new Date(dateStr+'T00:00:00'))/(864e5); return diff>LOCK_DAYS; }
// The 🔒 badge only hides the buttons. These two are what actually hold the
// window shut: lockMinDate() stops a brand-new record being backdated into
// locked history (a stock count is an anchor, so a backdated one rewrites the
// balance without ever touching a locked row), and lockGuard() re-checks at
// save/delete time so a screen left open across the boundary cannot slip a
// write through.
function lockMinDate(){ return addDays(DB.today(),-LOCK_DAYS) }
function lockGuard(...dates){
  for(const d of dates) if(isLocked(d)){
    toast(`${fmtDate(d)} is locked — only the last ${LOCK_DAYS} days can be changed`);
    return false;
  }
  return true;
}
const LOCK_BADGE=`<span style="font-size:11px;color:var(--gray);padding:2px 6px;border:1px solid #ddd;border-radius:6px;user-select:none">🔒 Locked</span>`;
function toast(msg,dur=2200){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur)}
function openModal(html){document.getElementById('modal-body').innerHTML=html;document.getElementById('overlay').classList.add('open')}
function closeModal(){document.getElementById('overlay').classList.remove('open')}
function batchAgeInDays(batch){
  if(!batch.arrival_date)return null;
  const arrival=new Date(batch.arrival_date+'T00:00:00');
  return Math.floor((Date.now()-arrival.getTime())/(24*60*60*1000));
}
function batchAgeInWeeks(batch){const d=batchAgeInDays(batch);return d!==null?Math.floor(d/7):null;}
function getBatchLatestLog(batchId){
  return DB.getDaily().filter(r=>r.batch_id===batchId).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
}
function getBatchBirdCount(batch){
  const last=getBatchLatestLog(batch.id);
  return last?.closing_birds??batch.doc_count;
}
function syncBatchSoldStatus(batchId){
  const batch=DB.getBatches().find(b=>b.id===batchId);
  if(!batch||batch.status!=='Active')return;
  const totalBirds=getBatchBirdCount(batch);
  const totalSold=DB.getSales().filter(s=>s.batch_id===batchId).reduce((s,e)=>s+(e.quantity||0),0);
  if(totalSold>=totalBirds)DB.updBatch(batchId,{status:'Sold'});
}
function getTempTarget(ageDays,birdType){
  const targets=birdType==='broiler'?BROILER_TEMP_TARGETS:PULLET_TEMP_TARGETS;
  return targets.find(t=>ageDays<=t.maxDay)||null;
}
// Daily water requirement (ml/bird/day) = feed intake × the farm's water ratio.
function getWaterRateMl(ageDays,birdType,farm){
  return Math.round(getFeedRateGByType(birdType,ageDays,farm)*getWaterRatio(birdType,farm));
}
// Water consumed-vs-required variance → colour + flag. Under-consumption is the health concern.
function waterVarInfo(c,q){
  if(!(q>0))return{pct:null,color:'inherit',flag:''};
  const wv=(c-q)/q*100;
  const color=wv<=-20?'var(--red)':wv<=-10?'var(--amber)':wv>=10?'var(--blue)':'var(--g2)';
  return{pct:wv,color,flag:wv<=-20?' ⚠':''};
}
function getWeightBenchmark(breed,weekNum){
  const bm=BREED_BENCHMARKS[breed]||BREED_BENCHMARKS['Isa Brown'];
  const weeks=Object.keys(bm).map(Number).sort((a,b)=>a-b);
  const w=weeks.find(w=>weekNum<=w)??weeks[weeks.length-1];
  return bm[w]||null;
}
function getActiveBatches(){return DB.getBatches().filter(b=>b.status==='Active');}
function getBatchVaccStatus(batch){
  const today=DB.today(), arrDate=new Date((batch.arrival_date||today)+'T00:00:00');
  return getVaccSchedule(getBirdType(batch)).map(v=>{
    const fromDay=new Date(arrDate);fromDay.setDate(fromDay.getDate()+v.dayMin);
    const toDay=new Date(arrDate);toDay.setDate(toDay.getDate()+v.dayMax);
    const dueDate=fromDay.toISOString().slice(0,10);
    // A tick used to be a bare `true`. It now carries the day it was ticked,
    // so the printed health record can state when a bird was actually treated
    // rather than when the programme said it was due. Old boolean ticks stay
    // truthy and simply have no givenDate — the document falls back to the
    // programme date and says on its face that it did.
    const mark=(batch.vaccinations||{})[v.name];
    const done=!!mark;
    const givenDate=(mark&&typeof mark==='object'&&mark.date)?mark.date:null;
    const overdue=!done&&today>toDay.toISOString().slice(0,10);
    const due=!done&&today>=dueDate;
    return{...v,dueDate,done,givenDate,overdue,due};
  });
}
