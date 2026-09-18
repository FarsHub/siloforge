// ═══════════════════════════════════════════════
// HEALTH — VACCINATION + MEDICATION LOG
// ═══════════════════════════════════════════════
function renderHealth(){
  const el=document.getElementById('v-health'), today=DB.today();
  const topbar=`<div class="topbar"><div><h1>Health Log</h1><small>Water · Droppings · Medication</small></div></div>`;
  if(!_activeBatchId||!DB.getBatches().find(b=>b.id===_activeBatchId)){
    el.innerHTML=topbar+getBatchSelectPrompt(); return;
  }
  const batch=DB.getBatches().find(b=>b.id===_activeBatchId);
  const recs=DB.getHealth().filter(r=>r.batch_id===_activeBatchId||(!r.batch_id&&!_activeBatchId)).sort((a,b)=>b.date.localeCompare(a.date));
  const allRecs=DB.getHealth().filter(r=>r.batch_id===_activeBatchId).sort((a,b)=>b.date.localeCompare(a.date));
  const todayRec=allRecs.find(r=>r.date===today);
  el.innerHTML=topbar+getBatchCtxBar()+`
    <div style="margin:12px 16px">
      ${batch.status==='Active'
        ?`<button class="btn btn-primary" onclick="openHealthForm()">+ Log Health Today${todayRec?' (Update)':''}</button>`
        :`<div style="font-size:12px;color:var(--gray);padding:4px 0">Batch closed — records are read-only.</div>`}
    </div>
    ${todayRec?`<div class="card" style="border-left:4px solid var(--g3)">
      <div class="card-title">Today's Health Log ✓</div>
      <div style="font-size:14px;font-weight:700">${(()=>{const c=todayRec.water_liters||0,q=todayRec.water_req_liters||0,v=waterVarInfo(c,q);return`Water: ${c||'—'}L${q?` / Req: ${q}L`:''} ${v.pct!==null?`<span style="color:${v.color}">(${v.pct>0?'+':''}${v.pct.toFixed(0)}%)${v.flag}</span>`:''} · Droppings: ${todayRec.droppings}`;})()}</div>
      ${todayRec.medication?`<div style="margin-top:6px;font-size:13px;color:var(--p2);font-weight:700">💊 ${todayRec.medication} via ${todayRec.admin_method}</div>`:''}
      ${todayRec.notes?`<div style="margin-top:6px;font-size:12px;color:var(--gray)">${todayRec.notes}</div>`:''}
    </div>`:''}
    <div class="sec-hdr">${allRecs.length} Records</div>
    <div class="card" style="padding:0;overflow:hidden">
      ${allRecs.map(r=>{
        const dropCls=r.droppings==='Normal'?'badge-green':r.droppings?'badge-red':'badge-gray';
        return`<div class="list-item">
          <div><div style="font-weight:700;font-size:14px">${fmtDate(r.date)}</div>
            <div style="font-size:12px;color:var(--gray)">${(()=>{const c=r.water_liters||0,q=r.water_req_liters||0,v=waterVarInfo(c,q);return`Water: ${c||'—'}L${q?` / Req: ${q}L`:''} ${v.pct!==null?`<span style="color:${v.color};font-weight:700">(${v.pct>0?'+':''}${v.pct.toFixed(0)}%)${v.flag}</span>`:''} · ${r.medication||'No meds'}`;})()}</div>
            <span class="badge ${dropCls}" style="margin-top:4px">${r.droppings||'—'} droppings</span>
            ${r.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-top:4px">"${r.notes}"</div>`:''}</div>
          <div style="display:flex;gap:4px">
            ${isLocked(r.date)?LOCK_BADGE:`<button class="btn btn-secondary btn-sm" onclick="openHealthForm('${r.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="delHealth('${r.id}')">✕</button>`}
          </div></div>`;}).join('')||'<div class="empty" style="padding:24px"><p>No health records yet for this batch.</p></div>'}
    </div>
    <div style="height:12px"></div>`;
}
function openHealthForm(editId){
  const today=DB.today(), rec=editId?DB.getHealth().find(r=>r.id===editId):null;
  const active=getActiveBatches();
  const farm=DB.getFarm();
  // Calculate total expected water across all active batches (or selected batch)
  const totalBirds=active.reduce((s,b)=>s+getBatchBirdCount(b),0);
  const avgAge=active.length>0?Math.round(active.reduce((s,b)=>s+(batchAgeInDays(b)||0),0)/active.length):0;
  const defWaterReq=(active.reduce((s,b)=>s+getBatchBirdCount(b)*getWaterRateMl(batchAgeInDays(b)||0,getBirdType(b),farm),0)/1000).toFixed(1);
  const medOpts=MED_SUGGESTIONS.map(m=>`<option value="${m}">${m}</option>`).join('');
  const dropOpts=['Normal','Brownish','Greenish','Bloody','Watery','Yellowish'].map(d=>`<option value="${d}" ${rec?.droppings===d?'selected':''}>${d}</option>`).join('');
  const adminOpts=['Oral (Water)','Oral (Direct)','Injection','Eye Drop','Feed Mixing'].map(m=>`<option value="${m}" ${rec?.admin_method===m?'selected':''}>${m}</option>`).join('');
  openModal(`<div class="modal-ttl">${rec?'Edit':'Add'} Health Record <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="background:#e8f4fd;border-left:3px solid #4895ef;padding:8px 12px;border-radius:0 6px 6px 0;font-size:12px;color:#1a5fa8;margin-bottom:12px">
      📅 Change the date to log records for any past day.<br><span style="display:block;margin-top:4px">💧 Expected for ${totalBirds} birds: <b>${defWaterReq} L</b> (avg age ~${avgAge}d)</span>
    </div>
    <div class="field"><label>Date</label><input type="date" id="hf_date" value="${rec?rec.date:today}" max="${today}"></div>
    ${active.length>1?`<div class="field"><label>Batch</label>
      <select id="hf_batch"><option value="">— All Batches —</option>${active.map(b=>`<option value="${b.id}" ${(rec?.batch_id||_activeBatchId)===b.id?'selected':''}>${b.name}</option>`).join('')}</select></div>`:`<input type="hidden" id="hf_batch" value="${active[0]?.id||_activeBatchId||''}">`}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Water Consumed (L)</label><input type="number" id="hf_water" value="${rec?.water_liters||''}" min="0" step="1" placeholder="${defWaterReq}"></div>
      <div class="field"><label>Water Required (L)</label><input type="number" id="hf_water_req" value="${rec?.water_req_liters||defWaterReq}" min="0" step="0.5" placeholder="${defWaterReq}"></div>
    </div>
    <div class="field"><label>Droppings</label><select id="hf_drop">${dropOpts}</select></div>
    <div class="field"><label>Medication / Vaccination <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <input type="text" id="hf_med" value="${rec?.medication||''}" placeholder="Start typing..." list="med_list">
      <datalist id="med_list">${medOpts}</datalist></div>
    <div class="field"><label>Administration Method</label><select id="hf_admin">${adminOpts}</select></div>
    <div class="field"><label>Notes</label><textarea id="hf_notes" placeholder="Any health observations...">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveHealth('${editId||''}')">Save</button>`);
}
function saveHealth(editId){
  const batchEl=document.getElementById('hf_batch'), batchId=batchEl?.value||'';
  const batch=batchId?DB.getBatches().find(b=>b.id===batchId):null;
  const farm=DB.getFarm();
  const existing=editId?DB.getHealth().find(r=>r.id===editId):null;
  const active=getActiveBatches();
  const totalBirds=active.reduce((s,b)=>s+getBatchBirdCount(b),0);
  const water_rate_ml=existing?.water_rate_ml||(batch
    ? getWaterRateMl(batchAgeInDays(batch)||0,getBirdType(batch),farm)
    : (totalBirds?Math.round(active.reduce((s,b)=>s+getBatchBirdCount(b)*getWaterRateMl(batchAgeInDays(b)||0,getBirdType(b),farm),0)/totalBirds):0));
  const rec={id:editId||uid(),date:document.getElementById('hf_date').value,
    batch_id:batchId,batch_name:batch?.name||'',
    water_liters:parseFloat(document.getElementById('hf_water').value)||0,
    water_req_liters:parseFloat(document.getElementById('hf_water_req').value)||0,
    water_rate_ml,
    droppings:document.getElementById('hf_drop').value,
    medication:document.getElementById('hf_med').value.trim(),
    admin_method:document.getElementById('hf_admin').value,
    notes:document.getElementById('hf_notes').value.trim()};
  if(editId)DB.updHealth(editId,rec);else DB.addHealth(rec);
  closeModal();confirmSave('Health log saved');renderHealth();
}
function delHealth(id){
  openModal(`<div class="modal-ttl">Delete? <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      <button class="btn btn-danger" onclick="closeModal();DB.delHealth('${id}');confirmSave('Deleted');renderHealth()">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
