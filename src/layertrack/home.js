// ═══════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════
// Home has two levels. Outside, you pick a pen; inside, everything on screen
// belongs to that flock, the way walking into a house shows you that house.
// With a single pen there is nothing to pick, so the app goes straight in and
// behaves as it always did.
function renderHome(){
  const farm=DB.getFarm(), el=document.getElementById('v-home');
  if(!farm){
    el.innerHTML=`
      <div class="topbar"><div><h1>🐔 LayerTrack</h1><small>Layer Farm Management</small></div></div>
      <div class="empty">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15v-4m0-4v-.01"/></svg>
        <h3>Welcome to LayerTrack</h3>
        <p>Set up your farm in <b>Settings</b> first.<br>Add pens, lines, and stands to begin.</p>
      </div>`;
    return;
  }
  const pens=farm.pens||[];
  if(pens.length===0){
    el.innerHTML=`<div class="topbar"><div><h1>🐔 LayerTrack</h1><small>${farm.name||'My Farm'}</small></div></div>
      <div class="empty"><h3>No pens yet</h3><p>Add your first pen in <b>Settings</b> to start logging.</p>
        <button class="btn btn-primary" style="max-width:200px;margin:0 auto" onclick="go('settings')">Go to Settings</button></div>`;
    return;
  }
  if(pens.length===1)_activePenId=pens[0].id;
  const pen=_activePenId?pens.find(p=>p.id===_activePenId):null;
  el.innerHTML=pen?penHomeHtml(farm,pen,pens):farmHomeHtml(farm,pens);
}
function exitPen(){ _activePenId=null; renderHome(); renderFeedTicker(); }

// ── Outside: choose a pen ───────────────────────────────────────────────
// Only what is genuinely shared sits at this level: the feed store, the egg
// stock and the money owed to the farm. Everything else is behind a pen.
function farmHomeHtml(farm,pens){
  const today=DB.today(), todayCols=DB.todayCols(), allPass=getAllPassStatus(farm,todayCols);
  const todayBirds=DB.todayBirds();
  const rows=pens.map(pen=>{
    const eggs=todayCols.filter(c=>c.penId===pen.id)
      .reduce((s,c)=>(c.entries||[]).reduce((ss,e)=>ss+(e.eggs||0),s),0);
    const birds=getPenTotalBirds(pen);
    const deaths=todayBirds.filter(r=>ownedByPen(r,pen.id)).reduce((s,r)=>s+(r.deaths||0),0);
    const pending=allPass.filter(p=>p.penId===pen.id&&!p.complete).length;
    return{pen,eggs,birds,deaths,pending,stage:getPenStage(pen),
      rate:birds>0?eggs/birds*100:null};
  });
  const st=getEggStock();
  return`
    <div class="topbar"><div><h1>🐔 LayerTrack</h1><small>${farm.name||'My Farm'} · ${fmtDate(today)}</small></div></div>
    <div class="kpi-row-3">
      <div class="kpi"><div class="kpi-val">${rows.reduce((s,r)=>s+r.eggs,0).toLocaleString()}</div><div class="kpi-lbl">Eggs Today</div></div>
      <div class="kpi"><div class="kpi-val" style="color:var(--g1)">${rows.reduce((s,r)=>s+r.birds,0).toLocaleString()}</div><div class="kpi-lbl">Birds on Farm</div></div>
      <div class="kpi" style="cursor:pointer" onclick="FIN_TAB='stock';go('finance')">
        <div class="kpi-val" style="color:${st.available===0?'var(--red)':st.available<EGGS_PER_CRATE?'var(--amber)':'var(--g2)'}">${st.crates}${st.loose>0?`<span style="font-size:11px;font-weight:500;color:var(--gray)"> +${st.loose}</span>`:''}</div>
        <div class="kpi-lbl">Crates in Store</div></div>
    </div>
    ${feedHomeStrip()}
    <div class="sec-hdr">Pens <span style="font-size:11px;color:var(--gray);text-transform:none;font-weight:500">Tap one to work in it</span></div>
    ${rows.map(r=>`<div class="card" style="margin:0 16px 10px;padding:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:10px;height:10px;border-radius:50%;background:var(--g3);flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-weight:800;font-size:15px;color:var(--g1)">${r.pen.name}</div>
          <div style="font-size:11px;color:var(--gray);margin-top:2px">${r.stage?`Wk ${r.stage.weeks} · ${r.stage.label}`:'Age not set'} · ${r.birds.toLocaleString()} birds</div>
          ${(r.pen.breed||r.pen.source)?`<div style="font-size:11px;color:var(--gray);margin-top:1px">${[r.pen.breed,r.pen.source].filter(Boolean).join(' · ')}</div>`:''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px">
        <div class="kpi-sm"><div class="kpi-val-sm">${r.eggs.toLocaleString()}</div><div class="kpi-lbl-sm">Eggs Today</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:${rateColor(r.rate,r.stage)}">${r.rate!==null?r.rate.toFixed(0)+'%':'—'}</div><div class="kpi-lbl-sm">Lay Rate</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:${r.deaths>0?'var(--red)':'var(--g1)'}">${r.deaths}</div><div class="kpi-lbl-sm">Deaths</div></div>
      </div>
      ${r.pending>0?`<div style="font-size:12px;color:var(--amber);font-weight:700;margin-bottom:8px">${r.pending} collection pass${r.pending>1?'es':''} still to do</div>`:''}
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" style="flex:2" onclick="selectPen('${r.pen.id}','home')">Open ${r.pen.name}</button>
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="selectPen('${r.pen.id}','eggs')">Collect Eggs</button>
      </div>
    </div>`).join('')}
    <div class="sec-hdr">Farm</div>
    <div class="card" style="padding:0;overflow:hidden">
      <div class="log-status-row" onclick="FEED_TAB='store';go('feed')" style="cursor:pointer">
        <div class="log-status-icon" style="background:#f5f5f5">🌾</div>
        <div style="flex:1"><div style="font-weight:700;font-size:14px">Feed Store</div>
          <div style="font-size:12px;color:var(--gray)">Shared across every pen</div></div>
        <span style="color:var(--gray);font-size:18px">›</span></div>
      <div class="log-status-row" onclick="FIN_TAB='sales';go('finance')" style="cursor:pointer">
        <div class="log-status-icon" style="background:#f5f5f5">💰</div>
        <div style="flex:1"><div style="font-weight:700;font-size:14px">Sales &amp; Receivables</div>
          <div style="font-size:12px;color:var(--gray)">Crates pool before sale, so these stay farm-level</div></div>
        <span style="color:var(--gray);font-size:18px">›</span></div>
      <div class="log-status-row" onclick="REP_TAB='pens';go('reports')" style="cursor:pointer;border-bottom:none">
        <div class="log-status-icon" style="background:#f5f5f5">📊</div>
        <div style="flex:1"><div style="font-weight:700;font-size:14px">Compare Pens</div>
          <div style="font-size:12px;color:var(--gray)">Cost, revenue and FCR side by side</div></div>
        <span style="color:var(--gray);font-size:18px">›</span></div>
    </div>
    <div style="height:12px"></div>`;
}

// ── Inside a pen ────────────────────────────────────────────────────────
function penDailySummary(penId,days){
  const map={}, touch=d=>(map[d]=map[d]||{eggs:0,broken:0,deaths:0});
  DB.getCols().filter(c=>c.penId===penId).forEach(c=>{
    const m=touch(c.date);
    (c.entries||[]).forEach(e=>{m.eggs+=(e.eggs||0);m.broken+=(e.broken||0);});
  });
  DB.getBirds().filter(r=>ownedByPen(r,penId)).forEach(b=>{ touch(b.date).deaths+=(b.deaths||0); });
  const birdsOn=penBirdsOnDateFn(penId,0);
  return Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,days)
    .map(([date,v])=>{ const n=birdsOn(date);
      return{date,eggs:v.eggs,broken:v.broken,deaths:v.deaths,rate:n>0?v.eggs/n*100:null}; });
}
function penHomeHtml(farm,pen,pens){
  const today=DB.today();
  const todayCols=DB.todayCols().filter(c=>c.penId===pen.id);
  const birds=getPenTotalBirds(pen), stage=getPenStage(pen);
  let totalEggs=0,totalBroken=0;
  todayCols.forEach(c=>(c.entries||[]).forEach(e=>{ totalEggs+=(e.eggs||0); totalBroken+=(e.broken||0); }));
  const todayRate=birds>0?totalEggs/birds*100:null;
  const todayCrack=totalEggs>0?totalBroken/totalEggs*100:null;
  const crackColor=todayCrack===null?'var(--gray)':todayCrack>3?'var(--red)':todayCrack>=2?'var(--amber)':'var(--g3)';
  const crackAlert=todayCrack!==null&&todayCrack>3?' 🚨':todayCrack!==null&&todayCrack>=2?' ⚠️':'';
  const todayFeed=DB.todayFeed().filter(r=>ownedByPen(r,pen.id));
  const totalFeedKg=todayFeed.reduce((s,f)=>s+(f.feed_kg_used||0),0);
  const todayBird=DB.todayBirds().filter(r=>ownedByPen(r,pen.id));
  const todayHealth=DB.todayHealth().filter(r=>ownedByPen(r,pen.id));
  const hasBirdLog=todayBird.length>0, hasFeedLog=todayFeed.length>0, hasHealthLog=todayHealth.length>0;
  const todayDeaths=todayBird.reduce((s,b)=>s+(b.deaths||0),0);
  const todayCulls=todayBird.reduce((s,b)=>s+(b.culls||0),0);
  const mortalityRate=birds>0?(todayDeaths/birds*100):0;
  const recent=penDailySummary(pen.id,7);
  const expRate=stage?stage.expected:(farm.expectedRate||85);
  const warnRate=stage?stage.warn:(farm.warnRate||70);

  const alerts=[];
  if(todayDeaths>0)
    alerts.push(`<div class="alert-item ${mortalityRate>0.5?'alert-red':'alert-amber'}">⚠ ${todayDeaths} death${todayDeaths>1?'s':''} today (${mortalityRate.toFixed(2)}% mortality)</div>`);
  // Judged against this flock's stage, not a flat farm figure. A pre-lay house
  // has a warn floor of 0, so it is never flagged for not laying.
  if(todayRate!==null&&todayRate<warnRate&&totalEggs>0)
    alerts.push(`<div class="alert-item alert-amber">📉 Lay rate ${todayRate.toFixed(0)}% is under the ${warnRate}% floor for ${stage?stage.label:'this flock'}${stage?` (expect ~${expRate}%)`:''}</div>`);
  if(todayCrack!==null&&todayCrack>3)
    alerts.push(`<div class="alert-item alert-red">💔 Crack rate ${todayCrack.toFixed(1)}% is above the 3% danger threshold</div>`);
  if(todayFeed.length>0){
    const req=todayFeed.reduce((s,f)=>s+(f.feed_req_kg||0),0);
    if(req>0){ const v=Math.abs(totalFeedKg-req)/req*100;
      if(v>15)alerts.push(`<div class="alert-item alert-amber">🌾 Feed usage ${v.toFixed(0)}% off the daily requirement</div>`); }
  }
  if(todayHealth.some(h=>h.droppings_observation&&h.droppings_observation!=='Normal'))
    alerts.push(`<div class="alert-item alert-amber">💊 Abnormal droppings today — check the health log</div>`);

  const allPass=getAllPassStatus(farm,DB.todayCols()).filter(p=>p.penId===pen.id);
  const roundsHtml=ROUNDS.map(rnd=>{
    const passes=allPass.filter(p=>p.round===rnd.id);
    const pending=passes.filter(p=>!p.complete);
    const eggs=todayCols.filter(c=>c.round===rnd.id)
      .reduce((s,c)=>(c.entries||[]).reduce((ss,e)=>ss+(e.eggs||0),s),0);
    if(passes.length>0&&pending.length===0)
      return`<div class="stand-row" style="margin-bottom:8px;background:#f7fff9;border:1.5px solid var(--g4)">
        <div><span class="${rnd.cls} round-chip">${rnd.label} · ${rnd.sub}</span>
        <div style="font-size:12px;color:var(--g3);font-weight:700;margin-top:5px">✓ Done · ${eggs} eggs</div></div>
        <button class="btn btn-secondary btn-sm" onclick="COLLECT_ROUND=${rnd.id};go('eggs')">View</button></div>`;
    if(pending.length===0)return'';
    const inP=pending.filter(p=>p.started);
    return`<div class="stand-row" style="margin-bottom:8px">
      <div><span class="${rnd.cls} round-chip">${rnd.label} · ${rnd.sub}</span>
      <div style="font-size:12px;color:var(--gray);margin-top:5px">${inP.length>0?inP.length+' in progress · ':''}${pending.length} not done${eggs>0?' · '+eggs+' eggs':''}</div></div>
      <button class="btn btn-primary btn-sm" onclick="COLLECT_ROUND=${rnd.id};go('eggs')">${inP.length>0?'Resume':'Start →'}</button></div>`;
  }).join('');

  return`
    <div class="topbar"><div><h1>${pen.name}</h1><small>${stage?`Wk ${stage.weeks} · ${stage.label}`:'Age not set'} · ${fmtDate(today)}</small></div></div>
    ${pens.length>1?`<div class="pen-ctx-bar">
      <div class="pen-ctx-left">
        <div class="pen-ctx-dot"></div>
        <div><div class="pen-ctx-name">${pen.name}</div>
          <div class="pen-ctx-sub">${birds.toLocaleString()} birds · ${(pen.lines||[]).length} line${(pen.lines||[]).length!==1?'s':''}${pen.breed?' · '+pen.breed:''}</div></div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="exitPen()" style="flex-shrink:0">All Pens</button>
    </div>`:''}
    <div class="kpi-row-4">
      <div class="kpi-sm"><div class="kpi-val-sm">${totalEggs.toLocaleString()}</div><div class="kpi-lbl-sm">Eggs Today</div></div>
      <div class="kpi-sm"><div class="kpi-val-sm" style="color:${rateColor(todayRate,stage)}">${todayRate!==null?todayRate.toFixed(0)+'%':'—'}</div><div class="kpi-lbl-sm">Lay Rate</div></div>
      <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--g1)">${birds.toLocaleString()}</div><div class="kpi-lbl-sm">Birds</div></div>
      <div class="kpi-sm" style="${todayCrack>3?'border:2px solid var(--red)':todayCrack>=2?'border:2px solid var(--amber)':''}">
        <div class="kpi-val-sm" style="color:${crackColor}">${todayCrack!==null?todayCrack.toFixed(1)+'%'+crackAlert:'—'}</div>
        <div class="kpi-lbl-sm">Crack Rate</div></div>
    </div>
    ${alerts.length?`<div style="margin:0 16px 8px">${alerts.join('')}</div>`:''}
    ${feedHomeStrip()}

    <div class="sec-hdr">Today's Daily Logs
      <span style="font-size:11px;color:var(--gray);text-transform:none;font-weight:500">Tap to log</span></div>
    <div class="card" style="padding:0;overflow:hidden;margin-top:2px">
      <div class="log-status-row" onclick="go('flock')" style="cursor:pointer">
        <div class="log-status-icon" style="background:${hasBirdLog?'var(--g5)':'#f5f5f5'}">${hasBirdLog?'✓':'🐔'}</div>
        <div style="flex:1"><div style="font-weight:700;font-size:14px">Flock Status</div>
          <div style="font-size:12px;color:var(--gray)">${hasBirdLog?`${todayDeaths} deaths · ${todayCulls} culls logged today`:'Not logged today — tap to add or backfill'}</div></div>
        <span style="color:var(--gray);font-size:18px">›</span></div>
      <div class="log-status-row" onclick="go('feed')" style="cursor:pointer">
        <div class="log-status-icon" style="background:${hasFeedLog?'var(--g5)':'#f5f5f5'}">${hasFeedLog?'✓':'🌾'}</div>
        <div style="flex:1"><div style="font-weight:700;font-size:14px">Feed Usage</div>
          <div style="font-size:12px;color:var(--gray)">${hasFeedLog?`${totalFeedKg} kg used today`:'Not logged — tap to add'}</div></div>
        <span style="color:var(--gray);font-size:18px">›</span></div>
      <div class="log-status-row" onclick="go('health')" style="cursor:pointer;border-bottom:none">
        <div class="log-status-icon" style="background:${hasHealthLog?'var(--g5)':'#f5f5f5'}">${hasHealthLog?'✓':'💊'}</div>
        <div style="flex:1"><div style="font-weight:700;font-size:14px">Health Log</div>
          <div style="font-size:12px;color:var(--gray)">${hasHealthLog?`Water: ${todayHealth[0]?.water_consumed_liters||'—'}L · ${todayHealth[0]?.droppings_observation||'—'} droppings`:'Not logged — tap to add or backfill'}</div></div>
        <span style="color:var(--gray);font-size:18px">›</span></div>
    </div>

    <div class="sec-hdr">Today's Collections</div>
    <div style="margin:0 16px 10px">${roundsHtml||'<div style="color:var(--gray);font-size:13px;padding:8px 0">No collection passes configured for this pen.</div>'}</div>

    <div class="sec-hdr">Last 7 Days</div>
    <div class="card" style="padding:0;overflow:hidden">
      ${recent.length===0?'<div class="empty" style="padding:20px"><p>No data yet for this pen.</p></div>':
        recent.map(r=>`<div class="list-item">
          <div><div style="font-weight:700;font-size:14px">${fmtDate(r.date)}</div>
            <div style="font-size:12px;color:var(--gray);margin-top:2px">${r.eggs} eggs · ${r.broken} broken · ${r.deaths} deaths</div></div>
          ${rateBadge(r.rate,stage)}</div>`).join('')}
    </div>
    <div style="height:12px"></div>`;
}

function getAllPassStatus(farm,todayCols){
  const res=[];
  (farm.pens||[]).forEach(pen=>(pen.lines||[]).forEach(line=>['A','B'].forEach(side=>ROUNDS.forEach(rnd=>{
    const col=todayCols.find(c=>c.penId===pen.id&&c.lineId===line.id&&c.side===side&&c.round===rnd.id);
    const total=(line.stands||[]).length, done=col?(col.completedStands||[]).length:0;
    res.push({penId:pen.id,penName:pen.name,lineId:line.id,lineName:line.name,
      side,round:rnd.id,done,total,complete:total>0&&done>=total,started:done>0});
  }))));
  return res;
}
// Still farm-wide: the reports' 14-day mortality strip reads it across pens.
function getDailySummary(days){
  const farm=DB.getFarm(), birds=farm?getFarmTotalBirds(farm):0;
  const validIds=new Set((farm?.pens||[]).map(p=>p.id));
  const cols=DB.getCols().filter(c=>validIds.has(c.penId));
  const birdRecs=DB.getBirds();
  const map={};
  cols.forEach(c=>{
    if(!map[c.date])map[c.date]={eggs:0,broken:0};
    (c.entries||[]).forEach(e=>{map[c.date].eggs+=(e.eggs||0);map[c.date].broken+=(e.broken||0);});
  });
  birdRecs.forEach(b=>{
    if(!map[b.date])map[b.date]={eggs:0,broken:0};
    if(!map[b.date].deaths)map[b.date].deaths=0;
    map[b.date].deaths+=(b.deaths||0);
  });
  return Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,days)
    .map(([date,v])=>({date,eggs:v.eggs,broken:v.broken,deaths:v.deaths||0,rate:birds>0?v.eggs/birds*100:null}));
}
