// ═══════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6) }
function fmtDate(iso){ const d=new Date(iso+'T00:00:00'); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) }
// Both of these stay in UTC end to end. Parsing 'T00:00:00' as local and then
// serialising with toISOString() shifts the answer by a day everywhere east of
// Greenwich — including here — so the arithmetic is pinned to UTC instead.
function addDays(iso,n){ const d=new Date(iso+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10) }
function daysBetween(fromIso,toIso){ return Math.round((new Date(toIso+'T00:00:00Z')-new Date(fromIso+'T00:00:00Z'))/864e5) }
function fmtMoney(n){ return '₦'+Number(n||0).toLocaleString('en-NG',{minimumFractionDigits:0}) }
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
function toast(msg,dur=2200){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),dur) }
function openModal(html){ document.getElementById('modal-body').innerHTML=html; document.getElementById('overlay').classList.add('open') }
function closeModal(){ document.getElementById('overlay').classList.remove('open') }
// A lay rate only means something next to the flock's age. 62% is poor at week
// 30 and good at week 72, so where the age is known the stage's own expected
// and warn figures are used — the same pair the egg-collection screen judges
// each cell against. Without an age it falls back to the flat farm thresholds.
function stageForWeek(weeks){
  if(weeks===null||weeks===undefined)return null;
  return FLOCK_STAGES.find(s=>weeks<s.maxWeek)||FLOCK_STAGES[FLOCK_STAGES.length-1];
}
// One phrase for the target, so a grower never reads as a 0% expectation.
function stageTargetText(stage){
  if(!stage)return '';
  if(stage.expected<=0)return 'Not laying yet';
  // No floor means lay has not been demanded yet, so there is no warn to show.
  return stage.warn>0
    ? `Expect ≥${stage.expected}% · Warn <${stage.warn}%`
    : `Lay may start — expect ~${stage.expected}%`;
}
function rateBand(rate,stage){
  if(rate===null||rate===undefined)return null;
  const exp=stage?stage.expected:85, warn=stage?stage.warn:70;
  // A grower is not expected to lay at all, so its rate carries no verdict.
  if(exp<=0)return null;
  if(rate>=exp)return 'good';
  // A warn floor of zero means laying has not been demanded yet, so there is
  // nothing to fall short of — stay neutral rather than colouring a pre-lay
  // house amber for doing exactly what it should.
  if(warn<=0)return null;
  return rate>=warn?'ok':'poor';
}
function rateBadge(rate,stage){
  const b=rateBand(rate,stage);
  if(!b)return '<span class="badge badge-gray">—</span>';
  const cls=b==='good'?'badge-green':b==='ok'?'badge-amber':'badge-red';
  return `<span class="badge ${cls}">${rate.toFixed(1)}%</span>`;
}
function rateColor(r,stage){
  const b=rateBand(r,stage);
  return !b?'#aaa':b==='good'?'var(--g2)':b==='ok'?'var(--amber)':'var(--red)';
}
function getCellBirds(stand,tier,cell,side){
  // Side-specific key takes priority; fall back to legacy side-agnostic key, then default
  if(side){const k=`${tier}_${cell}_${side}`;if(stand.cellBirds&&stand.cellBirds[k]!==undefined)return stand.cellBirds[k];}
  const k=`${tier}_${cell}`;
  if(stand.cellBirds&&stand.cellBirds[k]!==undefined)return stand.cellBirds[k];
  return stand.defaultBirds||4;
}
function findStandInFarm(farm,standId){
  for(const pen of farm.pens||[])
    for(const line of pen.lines||[])
      for(const s of line.stands||[])
        if(s.id===standId)return s;
  return null;
}
function getPenTotalBirds(pen){
  let total=0;
  for(const line of pen?.lines||[])
    for(const stand of line.stands||[])
      for(let t=1;t<=stand.tiers;t++)
        for(let c=1;c<=stand.cellsPerTier;c++)
          // Sum Side A and Side B independently — each physical compartment tracked separately
          total+=getCellBirds(stand,t,c,'A')+getCellBirds(stand,t,c,'B');
  return total;
}
function getFarmTotalBirds(farm){
  return (farm?.pens||[]).reduce((s,pen)=>s+getPenTotalBirds(pen),0);
}
function getPenStage(pen){
  if(!pen||!pen.flockStartDate)return null;
  const placed=new Date(pen.flockStartDate+'T00:00:00');
  const weeksSince=Math.floor((Date.now()-placed.getTime())/(7*24*60*60*1000));
  const ageAtArrival=pen.flockAgeAtArrival||0;
  const weeks=weeksSince+ageAtArrival;
  return{weeks,weeksSince,ageAtArrival,...stageForWeek(weeks)};
}
function getFarmAgeWeeks(farm){
  const pen=(farm.pens||[])[0];
  const st=getPenStage(pen);
  return st?st.weeks:null;
}
