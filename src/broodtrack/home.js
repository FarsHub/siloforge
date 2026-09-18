// ═══════════════════════════════════════════════
// HOME — DASHBOARD
// ═══════════════════════════════════════════════
function renderHome(){
  const el=document.getElementById('v-home');
  const batches=DB.getBatches(), active=batches.filter(b=>b.status==='Active');
  if(!DB.getFarm()&&batches.length===0){
    el.innerHTML=`<div class="topbar"><div><h1>🐣 BroodTrack</h1><small>POC/POL Brooding Manager</small></div></div>
      <div class="empty"><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
        <h3>Welcome to BroodTrack</h3><p>Start by adding your first batch of DOC.<br>Go to <b>Batches</b> to get started.</p>
        <button class="btn btn-primary" style="margin-top:16px;max-width:240px" onclick="go('batches')">+ Add First Batch</button></div>`;
    return;
  }
  const today=DB.today();
  const totalActiveBirds=active.reduce((s,b)=>s+getBatchBirdCount(b),0);
  const todayDeaths=DB.getDaily().filter(r=>r.date===today).reduce((s,r)=>s+(r.deaths||0),0);
  const promisedBirds=DB.getOrders().filter(isOrderCommitted).reduce((s,o)=>s+Number(o.quantity||0),0);
  const alerts=[];
  // Check today's temperature logs for any batch
  active.forEach(b=>{
    const ageDays=batchAgeInDays(b);
    const todayLog=DB.getDaily().find(r=>r.batch_id===b.id&&r.date===today);
    const bType=getBirdType(b);
    const tempTarget=ageDays!==null?getTempTarget(ageDays,bType):null;
    if(tempTarget){
      if(!todayLog||!todayLog.temperature_c){
        const phase=ageDays<=21?'brooding':'growing';
        alerts.push(`<div class="alert-item alert-amber">🌡️ ${b.name} (Day ${ageDays}) — temperature not yet logged today (${phase} phase)</div>`);
      } else {
        if(todayLog.temperature_c<tempTarget.min||todayLog.temperature_c>tempTarget.max){
          alerts.push(`<div class="alert-item alert-red">🌡️ ${b.name} — temperature ${todayLog.temperature_c}°C out of range (target ${tempTarget.min}–${tempTarget.max}°C for ${tempTarget.label})</div>`);
        }
      }
    }
    if(todayDeaths>0&&ageDays!==null){
      const mortality=totalActiveBirds>0?(todayDeaths/totalActiveBirds*100):0;
      if(mortality>2)alerts.push(`<div class="alert-item alert-red">💀 High mortality today: ${todayDeaths} deaths (${mortality.toFixed(1)}%)</div>`);
    }
    // Upcoming vaccinations
    const vaccStatus=getBatchVaccStatus(b);
    const overdue=vaccStatus.filter(v=>v.overdue&&!v.hatchery&&!v.optional);
    const dueSoon=vaccStatus.filter(v=>v.due&&!v.done&&!v.overdue&&!v.hatchery&&!v.optional);
    if(overdue.length)alerts.push(`<div class="alert-item alert-red">💉 ${b.name} — ${overdue.length} overdue vaccination${overdue.length>1?'s':''}</div>`);
    if(dueSoon.length)alerts.push(`<div class="alert-item alert-amber">💉 ${b.name} — ${dueSoon[0].name} due by ${fmtDate(dueSoon[0].dueDate)}</div>`);
  });
  // The order book only works if it is in the way. A delivery window opening
  // in the next fortnight, or a promise with nothing allocated behind it, is
  // exactly the thing that gets discovered too late.
  (()=>{
    const soon=addDays(today,14);
    DB.getOrders().filter(isOrderCommitted).forEach(o=>{
      if(!o.needed_from)return;
      const qty=Number(o.quantity||0).toLocaleString();
      if(o.needed_to&&o.needed_to<today){
        alerts.push(`<div class="alert-item alert-red" style="cursor:pointer" onclick="FIN_TAB='orders';go('finance')">📋 ${o.customer_name||'Order'} — ${qty} birds were due by ${fmtDate(o.needed_to)}</div>`);
      } else if(o.needed_from<=soon){
        alerts.push(`<div class="alert-item alert-amber" style="cursor:pointer" onclick="FIN_TAB='orders';go('finance')">📋 ${o.customer_name||'Order'} — ${qty} birds wanted from ${fmtDate(o.needed_from)}</div>`);
      }
    });
    const unalloc=getUnallocatedDemand();
    if(unalloc>0)alerts.push(`<div class="alert-item alert-amber" style="cursor:pointer" onclick="FIN_TAB='orders';go('finance')">📋 ${unalloc.toLocaleString()} promised bird${unalloc===1?'':'s'} not allocated to any batch</div>`);
  })();
  // Feed alerts are deliberately not in this list. The ticker at the top of the
  // screen prints the same sentence from the same string, and feedHomeStrip()
  // below carries the numbers and somewhere to tap, so a third copy here only
  // pushed the rest of the screen down.
  // Stock the app has never had confirmed on the floor drifts, so nudge for a
  // count rather than quietly presenting book figures as fact.
  (()=>{
    const stale=getFeedStoreStatus().filter(c=>c.kg>0&&(!c.lastCountDate||
      daysBetween(c.lastCountDate,today)>30));
    if(stale.length)alerts.push(`<div class="alert-item alert-amber" onclick="FEED_TAB='store';openFeedCount(null,'${stale[0].feed_type}')" style="cursor:pointer">🧮 ${stale[0].feed_type} not counted ${stale[0].lastCountDate?'in over a month':'yet'} — tap to count the store</div>`);
  })();

  const batchCards=active.map(b=>{
    const ageDays=batchAgeInDays(b), ageWeeks=batchAgeInWeeks(b);
    const birds=getBatchBirdCount(b), survival=b.doc_count>0?(birds/b.doc_count*100):null;
    const lastWeight=DB.getWeight().filter(r=>r.batch_id===b.id).sort((a,b2)=>b2.date.localeCompare(a.date))[0];
    const benchmark=ageWeeks!==null?getWeightBenchmark(b.breed,ageWeeks):null;
    const weightStatus=lastWeight&&benchmark?lastWeight.avg_weight_g>=benchmark*0.95?'badge-green':lastWeight.avg_weight_g>=benchmark*0.85?'badge-amber':'badge-red':null;
    return`<div class="batch-card active" style="padding:14px 16px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div><div style="font-weight:800;font-size:16px">${b.name}</div>
          <div style="font-size:12px;color:var(--gray)">${b.breed} · ${getBirdTypeLabel(getBirdType(b))}${b.supplier?` · ${b.supplier}`:''}${ageDays!==null?` · Day ${ageDays} (Wk ${ageWeeks})`:''}</div></div>
        <span class="badge badge-purple">Active</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px">
        <div class="kpi-sm"><div class="kpi-val-sm">${birds}</div><div class="kpi-lbl">Birds</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:${survival>=95?'var(--g2)':survival>=90?'var(--amber)':'var(--red)'}">${survival!==null?survival.toFixed(0)+'%':'—'}</div><div class="kpi-lbl">Survival</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm">${lastWeight?lastWeight.avg_weight_g+'g':'—'}</div><div class="kpi-lbl">Last Wt</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm">${benchmark?benchmark+'g':'—'}</div><div class="kpi-lbl">Target Wt</div></div>
      </div>
      ${lastWeight&&weightStatus?`<div style="margin-top:8px"><span class="badge ${weightStatus}">${lastWeight.avg_weight_g>=benchmark*0.95?'On Track':lastWeight.avg_weight_g>=benchmark*0.85?'Slightly Below':'Below Target'} — ${fmtDate(lastWeight.date)}</span></div>`:''}
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary btn-sm" style="flex:2" onclick="selectBatch('${b.id}','daily')">Open Records</button>
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="openDailyForm('${b.id}')">Quick Log</button>
      </div>
    </div>`;
  }).join('');

  el.innerHTML=`<div class="topbar"><div><h1>🐣 BroodTrack</h1><small>${DB.getFarm()?.name||'My Brooding Farm'} · ${fmtDate(today)}</small></div></div>
    <div class="kpi-row-4">
      <div class="kpi-sm"><div class="kpi-val-sm">${active.length}</div><div class="kpi-lbl">Batches</div></div>
      <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--p2)">${totalActiveBirds.toLocaleString()}</div><div class="kpi-lbl">On Farm</div></div>
      <div class="kpi-sm"><div class="kpi-val-sm" style="color:${promisedBirds>totalActiveBirds?'var(--red)':'var(--g2)'}">${promisedBirds.toLocaleString()}</div><div class="kpi-lbl">Promised</div></div>
      <div class="kpi-sm"><div class="kpi-val-sm" style="color:${todayDeaths>0?'var(--red)':'var(--g2)'}">${todayDeaths}</div><div class="kpi-lbl">Deaths Today</div></div>
    </div>
    ${alerts.length?`<div style="margin:0 16px 8px">${alerts.join('')}</div>`:''}
    ${feedHomeStrip()}
    <div class="sec-hdr">Active Batches</div>
    ${batchCards||'<div style="margin:0 16px 16px;color:var(--gray);font-size:13px">No active batches. <span style="color:var(--p2);cursor:pointer" onclick="go(\'batches\')">Add one →</span></div>'}
    <div style="height:12px"></div>`;
}
