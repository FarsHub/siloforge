// ═══════════════════════════════════════════════
// FEED STORE — STOCK, PROGRAMME, COVER, REORDER
// ═══════════════════════════════════════════════
// This replaces a manual chore: walk the store, count bags, divide by the
// flock's daily requirement, work out what to buy. Three things retire it.
// Purchases come in as bags, daily usage already goes out as kg, and a physical
// count can be entered by whoever is on the farm as an anchor that resets the
// book balance to what is actually on the floor.
//
// The important part is that feed is not one commodity. A flock walks a
// programme — Grower, then Pre-Layer, then Layer — and each feed is needed only
// for a window of the bird's life. So "how many days will this last" is the
// wrong question for every feed except the last one. The right question is
// whether what is in store covers the rest of the window that feed is needed
// for. 300 kg of Pre-Layer with nine days of Pre-Layer left is a surplus, not
// a crisis, and must not raise an alarm.
//
// Everything below is built on one forward walk, a day at a time, that asks of
// each pen: how old will it be, which feed does the programme call for at that
// age, and how much will it eat. That yields demand per feed type per day, from
// which cover, shortfall and purchase size all fall out.
function getBagKg(feedType){
  const map=(DB.getFarm()||{}).feedBagKg||{};
  // Canonical name first, then the name as given, so a farm that saved a bag
  // size against 'Grower Pellets' keeps it.
  const v=Number(map[canonFeedType(feedType)]??map[feedType]);
  return v>0?v:DEFAULT_BAG_KG;
}
function getFeedPolicy(){
  const f=DB.getFarm()||{};
  const num=(v,d)=>Number(v)>0?Number(v):d;
  return {warnDays:num(f.feedWarnDays,DEFAULT_FEED_WARN_DAYS),
          urgentDays:num(f.feedUrgentDays,DEFAULT_FEED_URGENT_DAYS),
          targetDays:num(f.feedTargetDays,DEFAULT_FEED_TARGET_DAYS)};
}
// The farm's feed programme, oldest stage first. `toWeek` is the last flock-age
// week that stage covers; the final stage carries null, meaning it runs to the
// end of lay and so is open-ended.
function getFeedProgramme(){
  const saved=(DB.getFarm()||{}).feedProgramme;
  const prog=(Array.isArray(saved)&&saved.length?saved:DEFAULT_FEED_PROGRAMME)
    .filter(s=>s&&s.type)
    .map(s=>({type:canonFeedType(s.type),toWeek:(s.toWeek===null||s.toWeek===undefined||s.toWeek==='')?null:Number(s.toWeek)}));
  if(!prog.length)return DEFAULT_FEED_PROGRAMME.slice();
  // Whatever is stored, the last stage must be open-ended or a laying flock
  // would fall off the end of the programme and read as needing no feed at all.
  prog[prog.length-1]={...prog[prog.length-1],toWeek:null};
  return prog;
}
function feedTypeForWeek(weeks){
  const prog=getFeedProgramme();
  const w=Math.max(1,Number(weeks)||1);
  for(const s of prog){ if(s.toWeek===null||w<=s.toWeek)return s.type; }
  return prog[prog.length-1].type;
}
// The stage label a pen is on, for naming a window in the UI.
function feedStageForWeek(weeks){
  const prog=getFeedProgramme(), w=Math.max(1,Number(weeks)||1);
  for(let i=0;i<prog.length;i++){
    if(prog[i].toWeek===null||w<=prog[i].toWeek)
      return {...prog[i],index:i,next:prog[i+1]||null};
  }
  return {...prog[prog.length-1],index:prog.length-1,next:null};
}
function kgToBags(kg,feedType){
  const bagKg=getBagKg(feedType), safe=Math.max(0,kg);
  const bags=Math.floor(safe/bagKg);
  return {bags,loose:Math.round((safe-bags*bagKg)*10)/10,bagKg};
}
// "12 bags · 8 kg" — the way feed is actually spoken about in the store.
function fmtBags(kg,feedType){
  const b=kgToBags(kg,feedType);
  if(b.bags===0)return `${b.loose} kg`;
  return `${b.bags} bag${b.bags===1?'':'s'}${b.loose>0?` · ${b.loose} kg`:''}`;
}
// Bags, rounded up — a store cannot buy two thirds of a sack.
function bagsFor(kg,feedType){ return Math.ceil(Math.max(0,kg)/getBagKg(feedType)-1e-9); }
// Options for a feed-type picker. A record saved under a feed that is no longer
// on the list — Chick Mash, since this app is not for chicks — keeps its own
// option, so opening it to fix a date cannot silently re-label the sack it was
// bought as.
function feedTypeOptions(sel){
  const cur=canonFeedType(sel), list=FEED_TYPES.slice();
  if(cur&&!list.includes(cur))list.push(cur);
  return list.map(t=>`<option value="${t}" ${t===cur?'selected':''}>${t}</option>`).join('');
}

// Same-day ordering is fixed rather than left to record order: a count is the
// morning's truth, then deliveries land, then the birds eat.
const _FS_RANK={count:0,purchase:1,adjust:1,usage:2};
// `excludeId` lets a form ask what the books say *without* its own record in the
// picture, so editing an old count cannot rewrite the variance it once found.
function feedStockEvents(feedType,excludeId){
  const ev=[], want=canonFeedType(feedType);
  DB.getFeedStock().forEach(r=>{
    if(canonFeedType(r.feed_type)!==want||r.id===excludeId)return;
    ev.push({date:r.date,kind:r.kind||'purchase',kg:Number(r.kg||0),feed_type:want,rec:r});
  });
  DB.getFeed().forEach(r=>{
    if(canonFeedType(r.feed_type)!==want)return;
    if(!(Number(r.feed_kg_used)>0))return;
    ev.push({date:r.date,kind:'usage',kg:Number(r.feed_kg_used),feed_type:want,rec:r});
  });
  return ev.sort((a,b)=>String(a.date).localeCompare(String(b.date))
    ||(_FS_RANK[a.kind]??1)-(_FS_RANK[b.kind]??1)
    ||String(a.rec.id).localeCompare(String(b.rec.id)));
}
// A count is an anchor, not an addition: it overwrites the running figure. That
// is what lets a physical count correct drift instead of arguing with it, and it
// means the variance it records is the only honest measure of shrinkage.
function feedStockLedger(feedType,excludeId){
  let bal=0;
  return feedStockEvents(feedType,excludeId).map(e=>{
    let delta;
    if(e.kind==='count'){ delta=e.kg-bal; bal=e.kg; }
    else if(e.kind==='usage'){ delta=-Math.min(e.kg,bal); bal=Math.max(0,bal-e.kg); }
    else { delta=e.kg; bal+=e.kg; }
    return {...e,delta,balance:bal};
  });
}
function feedBookKg(feedType,excludeId){
  const led=feedStockLedger(feedType,excludeId);
  return led.length?led[led.length-1].balance:0;
}
function feedStoreTypes(){
  const types=new Set();
  const add=t=>{ const c=canonFeedType(t); if(c)types.add(c); };
  DB.getFeedStock().forEach(r=>add(r.feed_type));
  DB.getFeed().forEach(r=>{ if(Number(r.feed_kg_used)>0)add(r.feed_type); });
  return [...types];
}
function getFeedStockByType(){
  return feedStoreTypes().map(t=>{
    const led=feedStockLedger(t);
    const counts=led.filter(e=>e.kind==='count');
    const purchases=led.filter(e=>e.kind==='purchase');
    const last=led[led.length-1], lastCount=counts[counts.length-1];
    return {feed_type:t, kg:last?last.balance:0,
      lastCountDate:lastCount?lastCount.date:null,
      lastPurchaseDate:purchases.length?purchases[purchases.length-1].date:null,
      countCount:counts.length,
      ...kgToBags(last?last.balance:0,t)};
  }).sort((a,b)=>b.kg-a.kg);
}

const FEED_HORIZON_DAYS=365;
// The forward walk. For each day ahead and each pen: project the age, read the
// programme for the feed that age calls for, and read the intake table for how
// much it eats. Bird counts are held flat — modelling future mortality would be
// guesswork, and erring towards slightly more feed is the safe direction.
function feedDemandSchedule(){
  const pens=((DB.getFarm()||{}).pens||[])
    .map(p=>({pen:p,birds:getPenTotalBirds(p),week0:(getPenStage(p)||{weeks:0}).weeks||0}))
    .filter(p=>p.birds>0);
  const out={};
  for(let day=0;day<FEED_HORIZON_DAYS;day++){
    for(const p of pens){
      const weeks=p.week0+Math.floor(day/7);
      const type=feedTypeForWeek(weeks);
      if(!type)continue;
      const kg=p.birds*getLayerFeedRate(weeks)/1000;
      if(kg<=0)continue;
      const o=out[type]||(out[type]={totalKg:0,byDay:{},firstDay:null,lastDay:null,pens:new Set()});
      o.totalKg+=kg;
      o.byDay[day]=(o.byDay[day]||0)+kg;
      if(o.firstDay===null)o.firstDay=day;
      o.lastDay=day;
      o.pens.add(p.pen.id);
    }
  }
  Object.values(out).forEach(o=>{
    o.days=Object.keys(o.byDay).map(Number).sort((a,b)=>a-b).map(d=>({d,kg:o.byDay[d]}));
    // Still wanted on the last day we looked at, so there is no end in sight.
    o.openEnded=o.lastDay>=FEED_HORIZON_DAYS-1;
    o.penCount=o.pens.size;
  });
  return out;
}
// kg needed over the first `n` calendar days from today.
function _needKgWithin(demand,n){
  return demand.days.reduce((s,x)=>x.d<n?s+x.kg:s,0);
}

// One row per feed type the farm either holds or is going to need, each carrying
// the verdict that belongs to its own shape: a window to finish, or a runway.
let _FS_STAMP=0, _FS_MEMO=null;
function bumpFeedData(){ _FS_STAMP++; _FS_MEMO=null; }
// Read several times per redraw, and unchanged between writes, so the walk is
// cached against a counter every mutation path bumps.
function getFeedStoreStatus(){
  const key=_FS_STAMP+'|'+DB.today();
  if(_FS_MEMO&&_FS_MEMO.key===key)return _FS_MEMO.val;
  const val=_computeFeedStoreStatus();
  _FS_MEMO={key,val};
  return val;
}
function _computeFeedStoreStatus(){
  const sched=feedDemandSchedule();
  const stockMap={};
  getFeedStockByType().forEach(s=>{ stockMap[s.feed_type]=s; });
  const {warnDays,urgentDays,targetDays}=getFeedPolicy();
  const today=DB.today();
  const types=[...new Set([...Object.keys(sched),...Object.keys(stockMap)])];
  return types.map(t=>{
    const s=stockMap[t]||{feed_type:t,kg:0,lastCountDate:null,lastPurchaseDate:null,countCount:0,...kgToBags(0,t)};
    const d=sched[t];
    // Held but not on the programme for any current flock. Worth showing, never
    // worth an alarm — this is what a leftover half-pallet looks like.
    if(!d){
      return {...s,feed_type:t,demand:null,openEnded:false,startDay:null,endDay:null,
        startDate:null,endDate:null,needKg:0,todayKg:0,coverDays:null,runoutDate:null,
        shortKg:0,surplusKg:s.kg,buyKg:0,buyBags:0,penCount:0,
        // Idle either way: nothing on the farm is eating this. With stock it is
        // a leftover worth seeing, with none it is only a name left in old
        // records. Neither is a shortage, and neither has a stage end date — as
        // 'ok' these fell through to the current-window sub-line and quoted a
        // stage that does not exist.
        state:'idle',
        headline:s.kg>0.05
          ?`Not on the programme for any current flock — ${fmtBags(s.kg,t)} sitting in store`
          :'Not currently in use',
        tickerText:null};
    }
    // Walk only the days this feed is actually called for, and note the first
    // one the store cannot cover.
    let left=s.kg, covered=0, shortDay=null;
    for(const day of d.days){
      if(left<day.kg-1e-9){ shortDay=day.d; break; }
      left-=day.kg; covered++;
    }
    const needKg=d.totalKg;
    const shortKg=Math.max(0,needKg-s.kg);
    const surplusKg=Math.max(0,s.kg-needKg);
    const todayKg=d.byDay[0]||0;
    const startDate=addDays(today,d.firstDay), endDate=addDays(today,d.lastDay);
    // A finite window is bought to finish; a runway is bought to a target cover.
    const buyKg=d.openEnded?Math.max(0,_needKgWithin(d,targetDays)-s.kg):shortKg;
    // One rule covers running dry today, running dry mid-window, and a feed the
    // flock has not even started yet: how many days until the store fails it.
    // shortDay is the first day the store cannot cover, so for feed being eaten
    // today it is also the days of cover — which makes the comparison strict:
    // a store holding exactly ten days is not yet warned about.
    const state=shortDay===null?(d.openEnded?'ok':'covered')
      :shortDay<urgentDays?'urgent'
      :shortDay<warnDays?'soon':'ok';
    const stage=d.openEnded?null:{endDate};
    const row={...s,feed_type:t,demand:d,openEnded:d.openEnded,
      startDay:d.firstDay,endDay:d.lastDay,startDate,endDate,
      needKg,todayKg,penCount:d.penCount,
      coverDays:d.firstDay===0?covered:null,
      runoutDate:shortDay===null?null:addDays(today,shortDay),
      shortDay,shortKg,surplusKg,buyKg,buyBags:bagsFor(buyKg,t),state,stage};
    row.headline=_feedHeadline(row);
    row.tickerText=_feedTickerText(row);
    return row;
  }).sort((a,b)=>_feedRank(a)-_feedRank(b)
    ||((a.shortDay??1e9)-(b.shortDay??1e9))
    ||b.kg-a.kg);
}
const _FEED_STATE_ORDER={urgent:0,soon:1,ok:2,covered:3,idle:4};
function _feedRank(r){ return _FEED_STATE_ORDER[r.state]??5; }
// The one sentence each card leads with. Deliberately different per shape: days
// of cover for a runway, phase completion for a window.
function _feedHeadline(r){
  if(r.state==='idle')return r.headline;
  // A feed the flock has not started on yet is described by when it starts and
  // whether it is covered — checked before anything else, because "days of
  // cover" is meaningless for feed nothing is eating today.
  if(r.startDay>0){
    const inDays=r.startDay;
    const when=`Needed from ${fmtDate(r.startDate)} (in ${inDays} day${inDays===1?'':'s'})`;
    // buyBags, not shortKg: for an open-ended feed the "shortfall" is a whole
    // year's requirement, which is no use to anyone standing in a feed store.
    if(r.buyBags<=0)return `${when} — already covered`;
    return `${when} — buy ${r.buyBags} bag${r.buyBags===1?'':'s'}`;
  }
  if(r.openEnded){
    if(r.shortDay===null)return 'Over a year of cover';
    if(r.coverDays===0)return 'Out of feed — buy today';
    return `${r.coverDays} day${r.coverDays===1?'':'s'} of feed left · runs out ${fmtDate(r.runoutDate)}`;
  }
  // Current window on a feed that ends.
  if(r.shortKg<=0.05){
    const spare=bagsFor(r.surplusKg,r.feed_type);
    return `Covers this stage to ${fmtDate(r.endDate)}${spare>0?` with ${spare} bag${spare===1?'':'s'} spare`:' exactly'}`;
  }
  return `Runs out ${fmtDate(r.runoutDate)}, ${daysBetween(r.runoutDate,r.endDate)+1} day${daysBetween(r.runoutDate,r.endDate)+1===1?'':'s'} before this stage ends`;
}
// Shorter, and written to be read while sliding past.
function _feedTickerText(r){
  if(r.state!=='urgent'&&r.state!=='soon')return null;
  const bags=r.buyBags;
  const buy=bags>0?` — buy ${bags} bag${bags===1?'':'s'}`:'';
  // Future first: a feed nothing is eating yet has no days-of-cover to quote.
  if(r.startDay>0)
    return `${r.feed_type} needed from ${fmtDate(r.startDate)} — ${r.kg>0.05?`only ${fmtBags(r.kg,r.feed_type)} in store`:'nothing in store'}${buy}`;
  if(r.openEnded)
    return r.coverDays===0
      ?`${r.feed_type} store is EMPTY${buy}`
      :`${r.feed_type}: ${r.coverDays} day${r.coverDays===1?'':'s'} of feed left, out ${fmtDate(r.runoutDate)}${buy}`;
  return `${r.feed_type} runs out ${fmtDate(r.runoutDate)}, before this stage ends ${fmtDate(r.endDate)}${buy}`;
}
// Anything the farm should act on now. Drives both the ticker and home alerts.
function feedAlerts(){
  return getFeedStoreStatus().filter(r=>r.state==='urgent'||r.state==='soon');
}
// The single row worth putting on the home screen: the most pressing one.
function feedCoverWorst(){
  const all=getFeedStoreStatus().filter(r=>r.state!=='idle'&&r.demand);
  return all[0]||null;
}
function feedCoverColor(state){
  return state==='urgent'?'var(--red)':state==='soon'?'var(--amber)'
    :state==='covered'?'var(--g2)':state==='idle'?'var(--gray)':'var(--g2)';
}
// The one feed line on the home screen. The ticker fixed to the top of the
// screen already carries the alert word for word — it is the same tickerText —
// and the card that used to sit here said it a third time in larger type, so
// three elements were spending about 180px on one sentence. This is the whole
// of feed on the landing page: worst feed first, the numbers the ticker cannot
// hold, and a tap into the store. It stays visible when nothing is wrong, which
// is the one thing the ticker cannot do, since it only appears on a bad day.
function feedHomeStrip(){
  const w=feedCoverWorst();
  if(!w)return '';
  const col=feedCoverColor(w.state);
  const bg=w.state==='urgent'?'var(--redBg)':w.state==='soon'?'var(--amberBg)':'var(--g5)';
  // Days left for anything the birds are eating now, whether or not the feed
  // ends with a stage; a feed the flock has not reached yet has no days to quote,
  // so it gets the date it is wanted instead. The bags to buy sit on the right,
  // so the verdict must not repeat them.
  const verdict=w.startDay>0
    ?`needed ${fmtDate(w.startDate)}`
    :w.shortDay===null
      ?(w.openEnded?'over a year of cover':'stage covered')
      :w.coverDays===0?'out of feed'
      :`${w.coverDays} day${w.coverDays===1?'':'s'} left`;
  // The dates that give the days their meaning: when the store runs dry, and —
  // for a feed that ends with a stage — whether the stage outlasts it.
  const when=w.startDay>0
    ?(w.openEnded?'':`through ${fmtDate(w.endDate)}`)
    :w.openEnded
      ?(w.runoutDate?`out ${fmtDate(w.runoutDate)}`:'')
      :w.shortDay===null
        ?`stage ends ${fmtDate(w.endDate)}`
        :`out ${fmtDate(w.runoutDate)} · ends ${fmtDate(w.endDate)}`;
  // A second feed in trouble must not be left to the ticker alone.
  const more=feedAlerts().filter(a=>a.feed_type!==w.feed_type).length;
  const sub=[`${fmtBags(w.kg,w.feed_type)} in store`,when,
    more?`+${more} more feed to buy`:''].filter(Boolean).join(' · ');
  return `<div style="margin:0 16px 8px;background:${bg};border-left:3px solid ${col};border-radius:8px;padding:9px 12px;display:flex;align-items:center;gap:10px;cursor:pointer" onclick="openFeedStore()">
    <span style="font-size:15px;flex-shrink:0">🌾</span>
    <div style="min-width:0;flex:1">
      <div style="font-size:13px;font-weight:700;color:var(--g1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.feed_type} · <span style="color:${col}">${verdict}</span></div>
      <div style="font-size:11px;color:var(--gray);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      ${w.buyBags>0
        ?`<div style="font-size:15px;font-weight:800;color:${col};line-height:1.1">buy ${w.buyBags}</div>
          <div style="font-size:9px;color:var(--gray);font-weight:700;text-transform:uppercase">bag${w.buyBags===1?'':'s'}</div>`
        :`<div style="font-size:15px;font-weight:800;color:var(--g2);line-height:1.1">✓</div>
          <div style="font-size:9px;color:var(--gray);font-weight:700;text-transform:uppercase">stocked</div>`}
    </div>
    <span style="color:var(--gray);font-size:16px;flex-shrink:0">›</span>
  </div>`;
}
// What the farm will need, in the order it will need it — the answer to "what am
// I buying next" without reading any of the cards.
function feedTimeline(){
  return getFeedStoreStatus()
    .filter(r=>r.demand&&r.startDay!==null)
    .sort((a,b)=>a.startDay-b.startDay)
    .map(r=>({feed_type:r.feed_type,startDay:r.startDay,startDate:r.startDate,
      endDate:r.openEnded?null:r.endDate,openEnded:r.openEnded,
      needKg:r.needKg,needBags:bagsFor(r.needKg,r.feed_type),
      haveKg:r.kg,shortKg:r.shortKg,buyBags:r.buyBags,state:r.state}));
}
function lastFeedPricePerKg(feedType){
  const p=DB.getFeedStock()
    .filter(r=>(r.kind||'purchase')==='purchase'&&canonFeedType(r.feed_type)===canonFeedType(feedType)&&Number(r.cost_ngn)>0&&Number(r.kg)>0)
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
  return p?Number(p.cost_ngn)/Number(p.kg):null;
}

// ── Low-feed ticker ─────────────────────────────────────────────────────
// Rendered outside the views so it survives navigation, and refreshed by the
// same calls that redraw a screen. It shows only what someone has to act on:
// a feed running dry before its stage ends, or the next stage's feed missing.
function openFeedStore(){ FEED_TAB='store'; go('feed'); }
function _tickerMsg(alerts){
  return alerts.map(a=>`${a.state==='urgent'?'🚨':'⚠️'} ${a.tickerText}`).join(' • ');
}
function renderFeedTicker(){
  const el=document.getElementById('feed-ticker');
  if(!el)return;
  let alerts=[];
  try{ alerts=feedAlerts(); }catch(e){ alerts=[]; }
  if(!alerts.length){
    el.style.display='none'; el.innerHTML='';
    document.body.classList.remove('has-ticker');
    return;
  }
  const urgent=alerts.some(a=>a.state==='urgent');
  const msg=_tickerMsg(alerts);
  // Pace the scroll by length so a long message does not fly past unread;
  // roughly 22 characters a second, floored so short ones are not frantic.
  const dur=Math.max(14,Math.round(msg.length/22*2));
  el.className='feed-ticker'+(urgent?' urgent':'');
  el.innerHTML=`<div class="ft-label">${urgent?'FEED ALERT':'FEED'}</div>
    <div class="ft-win"><div class="ft-track" style="animation-duration:${dur}s">`
    +`<span>${msg}</span><span>${msg}</span></div></div>`;
  el.style.display='flex';
  document.body.classList.add('has-ticker');
}
