// ═══════════════════════════════════════════════
// HEALTH — DAILY HEALTH LOG
// ═══════════════════════════════════════════════
function renderHealth(){
  const el=document.getElementById('v-health'), today=DB.today();
  if(!_activePenId){el.innerHTML=`<div class="topbar"><div><h1>Health Log</h1><small>Water, droppings, medication</small></div></div>${getPenSelectPrompt()}`;return;}
  const recs=DB.getHealth().filter(ownedByActivePen).sort((a,b)=>b.date.localeCompare(a.date));
  const todayRec=recs.find(r=>r.date===today);
  const abnormal=recs.slice(0,7).filter(r=>r.droppings_observation&&r.droppings_observation!=='Normal').length;
  const logHtml=`<div class="card">
    <div class="card-title">${todayRec?'Today\'s Health Log ✓':'Log Health'}</div>
    ${todayRec?`
      ${(()=>{const consumed=todayRec.water_consumed_liters||0;const req=todayRec.water_req_liters||0;const wv=req>0?((consumed-req)/req*100):null;const wvc=wv===null?'var(--gray)':Math.abs(wv)>20?'var(--red)':Math.abs(wv)>10?'var(--amber)':'var(--g2)';return`<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:12px">
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--blue)">${consumed||'—'}</div><div class="kpi-lbl-sm">Water Used (L)</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm">${req||'—'}</div><div class="kpi-lbl-sm">Water Req (L)</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:${wvc}">${wv!==null?(wv>0?'+':'')+wv.toFixed(0)+'%':'—'}</div><div class="kpi-lbl-sm">Water Var</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm" style="font-size:13px;color:${todayRec.droppings_observation==='Normal'?'var(--g2)':'var(--amber)'}">${todayRec.droppings_observation||'—'}</div><div class="kpi-lbl-sm">Droppings</div></div>
      </div>`;})()}
      ${todayRec.vaccination_or_medication?`<div style="font-size:13px;font-weight:700;margin-bottom:4px">💊 ${todayRec.vaccination_or_medication}</div>
        <div style="font-size:12px;color:var(--gray);margin-bottom:10px">via ${todayRec.admin_method||'—'}</div>`:''}
      ${todayRec.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-bottom:10px">"${todayRec.notes}"</div>`:''}
      <div style="display:flex;gap:8px">
        <button class="btn btn-amber btn-sm" style="flex:1" onclick="openHealthForm('${todayRec.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" style="flex:1" onclick="delHealth('${todayRec.id}')">Delete</button>
      </div>`:`<button class="btn btn-primary" onclick="openHealthForm()">+ Add Health Record</button>`}
  </div>`;
  const histHtml=recs.filter(r=>r.date!==today).slice(0,30).map(r=>{
    const dropCls=r.droppings_observation==='Normal'?'badge-green':r.droppings_observation?'badge-red':'badge-gray';
    return`<div class="list-item">
      <div><div style="font-weight:700;font-size:14px">${fmtDate(r.date)}</div>
        <div style="font-size:12px;color:var(--gray);margin-top:2px">${(()=>{const c=r.water_consumed_liters||0;const q=r.water_req_liters||0;const wv=q>0?((c-q)/q*100):null;const wvc=wv===null?'var(--gray)':Math.abs(wv)>20?'var(--red)':Math.abs(wv)>10?'var(--amber)':'var(--g2)';return`Water: ${c||'—'}L / Req: ${q||'—'}L${wv!==null?` <span style="color:${wvc};font-weight:700">(${wv>0?'+':''}${wv.toFixed(0)}%)</span>`:''}`;})()} · ${r.vaccination_or_medication||'No meds'}</div>
        <span class="badge ${dropCls}" style="margin-top:4px">${r.droppings_observation||'—'} droppings</span>
        ${r.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-top:4px">"${r.notes}"</div>`:''}</div>
      <div style="display:flex;gap:5px">
        ${isLocked(r.date)?LOCK_BADGE:`<button class="btn btn-secondary btn-sm" onclick="openHealthForm('${r.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="delHealth('${r.id}')">✕</button>`}
      </div></div>`;
  }).join('');
  el.innerHTML=`<div class="topbar"><div><h1>Health Log</h1><small>Water, droppings, medication</small></div></div>
    ${getPenCtxBar()}
    <div class="kpi-row-3">
      <div class="kpi">${(()=>{const c=recs[0]?.water_consumed_liters;const q=recs[0]?.water_req_liters;const wv=(c&&q)?((c-q)/q*100):null;const wvc=wv===null?'var(--blue)':Math.abs(wv)>20?'var(--red)':Math.abs(wv)>10?'var(--amber)':'var(--g2)';return`<div class="kpi-val" style="color:${wvc}">${c||'—'}</div><div class="kpi-lbl">Last Water (L)${q?` / Req ${q}`:''}</div>`;})()}</div>
      <div class="kpi"><div class="kpi-val">${recs.length}</div><div class="kpi-lbl">Total Logs</div></div>
      <div class="kpi"><div class="kpi-val" style="color:${abnormal>0?'var(--amber)':'var(--g2)'}">${abnormal}</div><div class="kpi-lbl">Abnormal (7d)</div></div>
    </div>
    ${logHtml}
    <div class="sec-hdr">History</div>
    <div class="card" style="padding:0;overflow:hidden">${histHtml||'<div class="empty" style="padding:24px"><p>No previous records.</p></div>'}</div>
    <div style="height:12px"></div>`;
}
function openHealthForm(editId){
  const rec=editId?DB.getHealth().find(r=>r.id===editId):null, today=DB.today();
  const farm=DB.getFarm();
  const closingBirds=activePenBirds();
  const _hw=activePenAgeWeeks();
  const waterRateMl=getLayerWaterRate(_hw);
  const defWaterReq=(closingBirds*waterRateMl/1000).toFixed(1);
  const _wPhLabel=_hw>=23?'Laying phase':`Week ${_hw} pullet`;
  const medOpts=MED_SUGGESTIONS.map(m=>`<option value="${m}">${m}</option>`).join('');
  openModal(`<div class="modal-ttl">${rec?'Edit':'Add'} Health Record <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="background:var(--blueBg);border-left:3px solid var(--blue);padding:8px 12px;border-radius:0 6px 6px 0;font-size:12px;color:#1a5fa8;margin-bottom:12px">
      📅 Water measured in the morning? Log it as <b>yesterday's</b> record by changing the date below.<br><span style="margin-top:4px;display:block">💧 Auto rate: <b>${waterRateMl} ml/bird/day</b> (${_wPhLabel}) · Expected for ${closingBirds} birds: <b>${defWaterReq} L</b></span>
    </div>
    <div class="field"><label>Date</label><input type="date" id="hf_date" value="${rec?rec.date:today}" max="${today}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Water Consumed (L)</label><input type="number" id="hf_water" value="${rec?.water_consumed_liters||''}" min="0" step="0.5" placeholder="e.g. ${defWaterReq}"></div>
      <div class="field"><label>Water Required (L)</label><input type="number" id="hf_water_req" value="${rec?.water_req_liters||defWaterReq}" min="0" step="0.1" placeholder="${defWaterReq}"></div>
    </div>
    <div class="field"><label>Droppings Observation</label>
      <select id="hf_drop">${DROP_OPTIONS.map(d=>`<option value="${d}" ${rec?.droppings_observation===d?'selected':''}>${d}</option>`).join('')}</select></div>
    <div class="field"><label>Vaccination / Medication <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <input type="text" id="hf_med" value="${rec?.vaccination_or_medication||''}" placeholder="Type or select below" list="med_list">
      <datalist id="med_list">${medOpts}</datalist></div>
    <div class="field"><label>Administration Method</label>
      <select id="hf_admin">${ADMIN_METHODS.map(m=>`<option value="${m}" ${rec?.admin_method===m?'selected':''}>${m}</option>`).join('')}</select></div>
    <div class="field"><label>Notes</label><textarea id="hf_notes" placeholder="e.g. Birds responding well to treatment">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveHealthLog('${editId||''}')">Save</button>`);
}
function saveHealthLog(editId){
  const farm=DB.getFarm();
  const existing=editId?DB.getHealth().find(r=>r.id===editId):null;
  // Snapshot the age-based water rate at time of save; preserve existing snapshot on edit
  const _saveAgeW=activePenAgeWeeks();
  const water_rate_ml=existing?.water_rate_ml||getLayerWaterRate(_saveAgeW);
  const rec={id:editId||uid(),date:document.getElementById('hf_date').value,
    pen_id:_activePenId||undefined,
    water_consumed_liters:parseFloat(document.getElementById('hf_water').value)||0,
    water_req_liters:parseFloat(document.getElementById('hf_water_req').value)||0,
    water_rate_ml,
    droppings_observation:document.getElementById('hf_drop').value,
    vaccination_or_medication:document.getElementById('hf_med').value.trim(),
    admin_method:document.getElementById('hf_admin').value,
    notes:document.getElementById('hf_notes').value.trim()};
  if(editId)DB.updHealth(editId,rec);else DB.addHealth(rec);
  closeModal();confirmSave('Health log saved');renderHealth();
}
function delHealth(id){
  openModal(`<div class="modal-ttl">Delete? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">This cannot be undone.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();DB.delHealth('${id}');confirmSave('Deleted');renderHealth()">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
