// ═══════════════════════════════════════════════
// DAILY LOG
// ═══════════════════════════════════════════════
function renderDaily(){
  const el=document.getElementById('v-daily'), today=DB.today();
  const topbar=`<div class="topbar"><div><h1>Daily Log</h1><small>Mortality · Temperature</small></div></div>`;
  if(!_activeBatchId||!DB.getBatches().find(b=>b.id===_activeBatchId)){
    el.innerHTML=topbar+getBatchSelectPrompt(); return;
  }
  const batch=DB.getBatches().find(b=>b.id===_activeBatchId);
  const allDaily=DB.getDaily().filter(r=>r.batch_id===_activeBatchId).sort((a,b)=>b.date.localeCompare(a.date));
  const todayLogged=allDaily.some(r=>r.date===today);
  const totalDeaths=allDaily.reduce((s,r)=>s+(r.deaths||0),0);
  const survivalPct=batch.doc_count>0?((batch.doc_count-totalDeaths)/batch.doc_count*100).toFixed(1):null;
  const logsHtml=allDaily.map(r=>{
    const ageDays=r.age_days, target=getTempTarget(ageDays,getBirdType(batch));
    const tempCls=r.temperature_c&&target?(r.temperature_c>=target.min&&r.temperature_c<=target.max?'temp-ok':
      Math.abs(r.temperature_c-((target.min+target.max)/2))<=3?'temp-warn':'temp-bad'):'';
    const mortality=r.opening_birds>0?(r.deaths/r.opening_birds*100):0;
    const mBadge=mortality>2?'badge-red':mortality>0.5?'badge-amber':r.deaths>0?'badge-gray':'';
    return`<div class="list-item">
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px">Day ${ageDays} <span style="font-size:11px;font-weight:400;color:var(--gray)">${fmtDate(r.date)}</span></div>
        <div style="font-size:12px;color:var(--gray);margin-top:2px">${r.opening_birds} → ${r.closing_birds} birds</div>
        <div style="display:flex;gap:5px;margin-top:4px;flex-wrap:wrap">
          ${r.deaths>0?`<span class="badge ${mBadge}">${r.deaths} death${r.deaths>1?'s':''}</span>`:''}
          ${r.temperature_c?`<span class="${tempCls}" style="font-size:11px">${r.temperature_c}°C</span>`:''}
          ${r.humidity_pct?`<span style="font-size:11px;color:var(--blue)">${r.humidity_pct}% RH</span>`:''}
        </div>
        ${r.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-top:4px">"${r.notes}"</div>`:''}
      </div>
      <div style="display:flex;gap:4px">
        ${isLocked(r.date)?LOCK_BADGE:`<button class="btn btn-secondary btn-sm" onclick="openDailyForm('${r.batch_id}','${r.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="delDaily('${r.id}')">✕</button>`}
      </div></div>`;
  }).join('');
  el.innerHTML=topbar+getBatchCtxBar()+`
    <div style="margin:12px 16px">
      ${batch.status==='Active'
        ?`<button class="btn btn-primary" onclick="openDailyForm('${_activeBatchId}')">+ Log Today${todayLogged?' (Update)':''}</button>`
        :`<div style="font-size:12px;color:var(--gray);padding:4px 0">This batch is closed — records are read-only.</div>`}
    </div>
    ${allDaily.length>0?`<div class="kpi-row-3" style="margin:0 16px 4px">
      <div class="kpi"><div class="kpi-val">${allDaily.length}</div><div class="kpi-lbl">Days Logged</div></div>
      <div class="kpi"><div class="kpi-val" style="color:var(--red)">${totalDeaths}</div><div class="kpi-lbl">Total Deaths</div></div>
      <div class="kpi"><div class="kpi-val" style="color:${survivalPct>=95?'var(--g2)':survivalPct>=90?'var(--amber)':'var(--red)'}">${survivalPct??'—'}%</div><div class="kpi-lbl">Survival</div></div>
    </div>`:''}
    <div class="sec-hdr">${allDaily.length} Records</div>
    <div class="card" style="padding:0;overflow:hidden">${logsHtml||'<div class="empty" style="padding:24px"><p>No daily logs yet for this batch.</p></div>'}</div>
    <div style="height:12px"></div>`;
}
function openDailyForm(batchId,editId){
  const today=DB.today();
  const batch=DB.getBatches().find(b=>b.id===batchId); if(!batch)return;
  const rec=editId?DB.getDaily().find(r=>r.id===editId):null;
  const ageDays=batchAgeInDays(batch)||0;
  const farm=DB.getFarm();
  const lastLog=DB.getDaily().filter(r=>r.batch_id===batchId).sort((a,b)=>b.date.localeCompare(a.date))[0];
  const defOpen=rec?rec.opening_birds:(lastLog?.closing_birds??batch.doc_count);
  const birdType=getBirdType(batch);
  const target=getTempTarget(ageDays,birdType);
  const hasTarget=!!target;
  const tempLabel=ageDays<=21?'Brooder Temp (°C)':'Temperature (°C)';
  const phase=getFeedPhaseForBatch(batch,ageDays);
  openModal(`<div class="modal-ttl">Daily Log — ${batch.name} <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="background:var(--p5);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:var(--p1);font-weight:700">
      Day ${ageDays} · ${phase.label} phase${target?` · Temp target: ${target.min}–${target.max}°C`:''}
    </div>
    <div class="field"><label>Date</label><input type="date" id="dl_date" value="${rec?rec.date:today}" max="${today}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div class="field"><label>Opening Birds</label><input type="number" id="dl_open" value="${defOpen}" min="0" oninput="calcDailyClose()"></div>
      <div class="field"><label>Deaths</label><input type="number" id="dl_deaths" value="${rec?.deaths||0}" min="0" oninput="calcDailyClose()"></div>
      <div class="field"><label>Culls <span style="font-size:10px;color:var(--gray);font-weight:400">isolated, still alive</span></label><input type="number" id="dl_culls" value="${rec?.culls||0}" min="0" oninput="calcDailyClose()"></div>
    </div>
    <div class="field"><label>Closing Birds (auto)</label>
      <input type="number" id="dl_close" value="${rec?(rec.opening_birds-(rec.deaths||0)):defOpen}" readonly style="background:#f5f5f5;font-weight:700">
      <div id="dl_cull_note" style="font-size:11px;color:var(--amber);margin-top:4px;display:${(rec?.culls||0)>0?'block':'none'}">⚠ ${rec?.culls||0} culled bird${(rec?.culls||1)>1?'s':''} in isolation — not deducted from closing count. Log their fate (death or return) in a future daily entry.</div></div>
    ${hasTarget?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>${tempLabel} ${target?`<span style="color:var(--amber);font-weight:800">→ target ${target.min}–${target.max}°C</span>`:''}
        </label><input type="number" id="dl_temp" value="${rec?.temperature_c||''}" min="10" max="45" step="0.5" placeholder="${target?((target.min+target.max)/2):'—'}" oninput="checkTemp(${target?target.min:0},${target?target.max:0})">
        <div id="temp_alert" style="font-size:11px;margin-top:3px"></div>
      </div>
      <div class="field"><label>Humidity (%)</label><input type="number" id="dl_humid" value="${rec?.humidity_pct||''}" min="0" max="100" step="1" placeholder="e.g. 65"></div>
    </div>`:''}
    <div class="field"><label>Notes</label><textarea id="dl_notes" placeholder="Any observations...">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveDailyLog('${batchId}','${editId||''}')">Save</button>`);
}
function calcDailyClose(){
  const o=parseInt(document.getElementById('dl_open')?.value)||0;
  const d=parseInt(document.getElementById('dl_deaths')?.value)||0;
  const c=parseInt(document.getElementById('dl_culls')?.value)||0;
  const cl=document.getElementById('dl_close'); if(cl)cl.value=Math.max(0,o-d);
  const note=document.getElementById('dl_cull_note');
  if(note){note.style.display=c>0?'block':'none';note.textContent=`⚠ ${c} culled bird${c>1?'s':''} in isolation — not deducted from closing count. Log their fate (death or return) in a future daily entry.`;}
}
function checkTemp(min,max){
  const v=parseFloat(document.getElementById('dl_temp')?.value);
  const el=document.getElementById('temp_alert'); if(!el||isNaN(v))return;
  if(min===0&&max===0){el.textContent='';return;}
  if(v<min)el.innerHTML=`<span style="color:var(--red);font-weight:700">⚠ Too cold (${v}°C < ${min}°C)</span>`;
  else if(v>max)el.innerHTML=`<span style="color:var(--red);font-weight:700">⚠ Too hot (${v}°C > ${max}°C)</span>`;
  else el.innerHTML=`<span style="color:var(--g2);font-weight:700">✓ Temperature OK</span>`;
}
function saveDailyLog(batchId,editId){
  const batch=DB.getBatches().find(b=>b.id===batchId); if(!batch)return;
  const ageDays=batchAgeInDays(batch)||0;
  const opening=parseInt(document.getElementById('dl_open').value)||0;
  const deaths=parseInt(document.getElementById('dl_deaths').value)||0;
  const culls=parseInt(document.getElementById('dl_culls').value)||0;
  const rec={id:editId||uid(),batch_id:batchId,batch_name:batch.name,
    date:document.getElementById('dl_date').value,age_days:ageDays,
    opening_birds:opening,deaths,culls,closing_birds:Math.max(0,opening-deaths),
    temperature_c:parseFloat(document.getElementById('dl_temp')?.value)||null,
    humidity_pct:parseFloat(document.getElementById('dl_humid')?.value)||null,
    notes:document.getElementById('dl_notes').value.trim()};
  if(editId){DB.updDaily(editId,rec);}
  else{DB.getDaily().filter(r=>r.batch_id===batchId&&r.date===rec.date).forEach(r=>DB.delDaily(r.id));DB.addDaily(rec);}
  closeModal();confirmSave('Daily log saved');
  // Refresh current view
  if(document.getElementById('v-daily').classList.contains('active'))renderDaily();
  else if(document.getElementById('v-home').classList.contains('active'))renderHome();
}
function delDaily(id){
  openModal(`<div class="modal-ttl">Delete Log? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">This cannot be undone.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();DB.delDaily('${id}');confirmSave('Deleted');renderDaily()">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
