// ═══════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════
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
  const today=DB.today(), todayCols=DB.todayCols();
  const farmBirds=getFarmTotalBirds(farm);
  let totalEggs=0,totalBroken=0;
  todayCols.forEach(c=>(c.entries||[]).forEach(e=>{ totalEggs+=(e.eggs||0); totalBroken+=(e.broken||0); }));
  const todayRate=farmBirds>0?totalEggs/farmBirds*100:null;
  const todayCrack=totalEggs>0?totalBroken/totalEggs*100:null;
  const crackColor=todayCrack===null?'var(--gray)':todayCrack>3?'var(--red)':todayCrack>=2?'var(--amber)':'var(--g3)';
  const crackAlert=todayCrack!==null&&todayCrack>3?' 🚨':todayCrack!==null&&todayCrack>=2?' ⚠️':'';
  const todayFeed=DB.todayFeed(); const totalFeedKg=todayFeed.reduce((s,f)=>s+(f.feed_kg_used||0),0);
  const todayBird=DB.todayBirds(); const hasBirdLog=todayBird.length>0;
  const todayHealth=DB.todayHealth(); const hasHealthLog=todayHealth.length>0;
  const hasFeedLog=todayFeed.length>0;
  const recent=getDailySummary(7);
  // Mortality today
  const todayDeaths=todayBird.reduce((s,b)=>s+(b.deaths||0),0);
  const todayCulls=todayBird.reduce((s,b)=>s+(b.culls||0),0);
  const mortalityRate=farmBirds>0?(todayDeaths/farmBirds*100):0;

  // Alerts
  const alerts=[];
  if(todayDeaths>0){
    const cls=mortalityRate>0.5?'alert-red':'alert-amber';
    alerts.push(`<div class="alert-item ${cls}">⚠ ${todayDeaths} death${todayDeaths>1?'s':''} recorded today (${mortalityRate.toFixed(2)}% mortality rate)</div>`);
  }
  if(todayRate!==null&&todayRate<(farm.warnRate||70))
    alerts.push(`<div class="alert-item alert-amber">📉 Production rate ${todayRate.toFixed(0)}% is below warn threshold of ${farm.warnRate||70}%</div>`);
  if(todayCrack!==null&&todayCrack>3)
    alerts.push(`<div class="alert-item alert-red">💔 Crack rate ${todayCrack.toFixed(1)}% is above 3% danger threshold</div>`);
  if(todayFeed.length>0){
    const req=todayFeed.reduce((s,f)=>s+(f.feed_req_kg||0),0);
    if(req>0){
      const variance=Math.abs(totalFeedKg-req)/req*100;
      if(variance>15) alerts.push(`<div class="alert-item alert-amber">🌾 Feed usage variance ${variance.toFixed(0)}% from daily requirement</div>`);
    }
  }
  if(todayHealth.length>0&&todayHealth.some(h=>h.droppings_observation&&h.droppings_observation!=='Normal'))
    alerts.push(`<div class="alert-item alert-amber">💊 Abnormal droppings observed today — check health log</div>`);
  // Feed alerts are deliberately not in this list. The ticker at the top of the
  // screen prints the same sentence from the same string, and feedHomeStrip()
  // below carries the numbers and somewhere to tap, so a third copy here only
  // pushed the rest of the screen down.
  // Stock the app has never had confirmed on the floor drifts, so nudge for a
  // count rather than quietly presenting book figures as fact.
  (()=>{
    const stale=getFeedStoreStatus().filter(c=>c.kg>0&&(!c.lastCountDate||
      daysBetween(c.lastCountDate,DB.today())>30));
    if(stale.length)alerts.push(`<div class="alert-item alert-amber" onclick="FEED_TAB='store';openFeedCount(null,'${stale[0].feed_type}')" style="cursor:pointer">🧮 ${stale[0].feed_type} not counted ${stale[0].lastCountDate?'in over a month':'yet'} — tap to count the store</div>`);
  })();
  const allPass=getAllPassStatus(farm,todayCols);
  const roundCards=ROUNDS.map(rnd=>{
    const passes=allPass.filter(p=>p.round===rnd.id);
    const pending=passes.filter(p=>!p.complete);
    const doneAll=passes.length>0&&pending.length===0;
    const eggs=todayCols.filter(c=>c.round===rnd.id).reduce((s,c)=>(c.entries||[]).reduce((ss,e)=>ss+(e.eggs||0),s),0);
    return{rnd,passes,pending,doneAll,eggs};
  });
  const roundsHtml=roundCards.map(({rnd,pending,doneAll,eggs})=>{
    if(doneAll)return`<div class="stand-row" style="margin-bottom:8px;background:#f7fff9;border:1.5px solid var(--g4)">
      <div><span class="${rnd.cls} round-chip">${rnd.label} · ${rnd.sub}</span>
      <div style="font-size:12px;color:var(--g3);font-weight:700;margin-top:5px">✓ All passes done · ${eggs} eggs</div></div>
      <button class="btn btn-secondary btn-sm" onclick="COLLECT_ROUND=${rnd.id};go('eggs')">View</button></div>`;
    if(pending.length===0)return'';
    const inP=pending.filter(p=>p.started);
    return`<div class="stand-row" style="margin-bottom:8px">
      <div><span class="${rnd.cls} round-chip">${rnd.label} · ${rnd.sub}</span>
      <div style="font-size:12px;color:var(--gray);margin-top:5px">${inP.length>0?inP.length+' in progress · ':''} ${pending.length} not done${eggs>0?' · '+eggs+' eggs':''}</div></div>
      <button class="btn btn-primary btn-sm" onclick="COLLECT_ROUND=${rnd.id};go('eggs')">${inP.length>0?'Resume':'Start →'}</button></div>`;
  }).join('');

  el.innerHTML=`
    <div class="topbar"><div><h1>🐔 LayerTrack</h1><small>${farm.name||'My Farm'} · ${fmtDate(today)}</small></div></div>
    <div class="kpi-row-6">
      <div class="kpi-sm"><div class="kpi-val-sm">${totalEggs}</div><div class="kpi-lbl-sm">Eggs Today</div></div>
      <div class="kpi-sm"><div class="kpi-val-sm" style="color:${rateColor(todayRate)}">${todayRate!==null?todayRate.toFixed(0)+'%':'—'}</div><div class="kpi-lbl-sm">Prod Rate</div></div>
      <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--g1)">${farmBirds}</div><div class="kpi-lbl-sm">Total Birds</div></div>
      <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--red)">${totalBroken}</div><div class="kpi-lbl-sm">Broken</div></div>
      <div class="kpi-sm" style="${todayCrack>3?'border:2px solid var(--red)':todayCrack>=2?'border:2px solid var(--amber)':''}">
        <div class="kpi-val-sm" style="color:${crackColor}">${todayCrack!==null?todayCrack.toFixed(1)+'%'+crackAlert:'—'}</div>
        <div class="kpi-lbl-sm">Crack Rate</div>
      </div>
      ${(()=>{const st=getEggStock();const stockColor=st.available===0?'var(--red)':st.available<EGGS_PER_CRATE?'var(--amber)':'var(--g2)';
      let mainVal;
      if(st.available===0){mainVal=`<div class="kpi-val-sm" style="color:var(--red)">0</div>`;}
      else if(st.crates===0){mainVal=`<div class="kpi-val-sm" style="color:var(--amber);font-weight:600;font-size:15px">${st.loose} pcs</div>`;}
      else{mainVal=`<div class="kpi-val-sm" style="color:${stockColor}">${st.crates} crate${st.crates>1?'s':''}${st.loose>0?`<span style="font-size:10px;font-weight:500;color:var(--gray);margin-left:3px">${st.loose} pcs</span>`:''}</div>`;}
      return`<div class="kpi-sm" style="cursor:pointer" onclick="FIN_TAB='stock';go('finance')">${mainVal}<div class="kpi-lbl-sm">Egg Stock</div></div>`;})()}
    </div>
    ${alerts.length?`<div style="margin:0 16px 8px">${alerts.join('')}</div>`:''}
    ${feedHomeStrip()}

    <div class="sec-hdr">Today's Daily Logs
      <span style="font-size:11px;color:var(--gray);text-transform:none;font-weight:500">Tap to log</span>
    </div>
    <div class="card" style="padding:0;overflow:hidden;margin-top:2px">
      <div class="log-status-row" onclick="go('flock')" style="cursor:pointer">
        <div class="log-status-icon" style="background:${hasBirdLog?'var(--g5)':'#f5f5f5'}">${hasBirdLog?'✓':'🐔'}</div>
        <div style="flex:1"><div style="font-weight:700;font-size:14px">Flock Status</div>
          <div style="font-size:12px;color:var(--gray)">${hasBirdLog?`${todayDeaths} deaths · ${todayCulls} culls logged today`:'Not logged today — tap to add or backfill'}</div></div>
        <span style="color:var(--gray);font-size:18px">›</span>
      </div>
      <div class="log-status-row" onclick="go('feed')" style="cursor:pointer">
        <div class="log-status-icon" style="background:${hasFeedLog?'var(--g5)':'#f5f5f5'}">${hasFeedLog?'✓':'🌾'}</div>
        <div style="flex:1"><div style="font-weight:700;font-size:14px">Feed Usage</div>
          <div style="font-size:12px;color:var(--gray)">${hasFeedLog?`${totalFeedKg} kg used today`:'Not logged — tap to add (can log yesterday\'s consumption now)'}</div></div>
        <span style="color:var(--gray);font-size:18px">›</span>
      </div>
      <div class="log-status-row" onclick="go('health')" style="cursor:pointer;border-bottom:none">
        <div class="log-status-icon" style="background:${hasHealthLog?'var(--g5)':'#f5f5f5'}">${hasHealthLog?'✓':'💊'}</div>
        <div style="flex:1"><div style="font-weight:700;font-size:14px">Health Log</div>
          <div style="font-size:12px;color:var(--gray)">${hasHealthLog?`Water: ${todayHealth[0]?.water_consumed_liters||'—'}L · ${todayHealth[0]?.droppings_observation||'—'} droppings`:'Not logged — tap to add or backfill past dates'}</div></div>
        <span style="color:var(--gray);font-size:18px">›</span>
      </div>
    </div>

    <div class="sec-hdr">Today's Collections</div>
    <div style="margin:0 16px 10px">${roundsHtml||'<div style="color:var(--gray);font-size:13px;padding:8px 0">No farm passes configured.</div>'}</div>

    <div class="sec-hdr">Pens
      <span style="font-size:11px;color:var(--gray);text-transform:none;font-weight:500">Select pen to view records</span>
    </div>
    ${(farm.pens||[]).length===0?`<div class="card" style="margin:0 16px 10px;text-align:center;color:var(--gray);padding:20px">No pens configured — go to Settings to add pens.</div>`:(farm.pens||[]).map(pen=>{
      const st=getPenStage(pen);
      const penBirds=(()=>{let t=0;for(const l of pen.lines||[])for(const s of l.stands||[])for(let ti=1;ti<=s.tiers;ti++)for(let c=1;c<=s.cellsPerTier;c++)t+=getCellBirds(s,ti,c,'A')+getCellBirds(s,ti,c,'B');return t;})();
      const isSelected=_activePenId===pen.id;
      return`<div class="card" style="margin:0 16px 10px;padding:14px;${isSelected?'box-shadow:0 0 0 2.5px var(--g3),0 2px 10px rgba(0,0,0,.1)':''}position:relative;overflow:hidden">
        ${isSelected?`<div style="position:absolute;top:10px;right:10px;background:var(--g5);color:var(--g1);font-size:10px;font-weight:800;padding:3px 8px;border-radius:12px">Viewing</div>`:''}
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:10px;height:10px;border-radius:50%;background:var(--g3);flex-shrink:0"></div>
          <div>
            <div style="font-weight:800;font-size:15px;color:var(--g1)">${pen.name}</div>
            <div style="font-size:11px;color:var(--gray);margin-top:2px">${st?`Wk ${st.weeks} · ${st.label}`:'Not configured'} · ${penBirds.toLocaleString()} birds · ${(pen.lines||[]).length} line${(pen.lines||[]).length!==1?'s':''}</div>
            ${(pen.breed||pen.source)?`<div style="font-size:11px;color:var(--gray);margin-top:1px">${[pen.breed,pen.source].filter(Boolean).join(' · ')}</div>`:''}
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" style="flex:2" onclick="selectPen('${pen.id}','flock')">${isSelected?'✓ Currently Viewing':'Open Records'}</button>
          <button class="btn btn-secondary btn-sm" style="flex:1" onclick="selectPen('${pen.id}','eggs')">Collect Eggs</button>
        </div>
      </div>`;
    }).join('')}

    <div class="sec-hdr">Last 7 Days</div>
    <div class="card" style="padding:0;overflow:hidden">
      ${recent.length===0?'<div class="empty" style="padding:20px"><p>No data yet.</p></div>':
        recent.map(r=>`<div class="list-item">
          <div><div style="font-weight:700;font-size:14px">${fmtDate(r.date)}</div>
            <div style="font-size:12px;color:var(--gray);margin-top:2px">${r.eggs} eggs · ${r.broken} broken · ${r.deaths} deaths</div></div>
          ${rateBadge(r.rate)}</div>`).join('')}
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
