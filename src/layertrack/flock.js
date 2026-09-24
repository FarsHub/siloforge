// ═══════════════════════════════════════════════
// FLOCK — DAILY BIRD STATUS
// ═══════════════════════════════════════════════
function renderFlock(){
  const el=document.getElementById('v-flock'), today=DB.today(), farm=DB.getFarm();
  if(!_activePenId){el.innerHTML=`<div class="topbar"><div><h1>Flock Status</h1><small>Bird mortality & daily count</small></div></div>${getPenSelectPrompt()}`;return;}
  const recs=DB.getBirds().filter(ownedByActivePen).sort((a,b)=>b.date.localeCompare(a.date));
  const todayRec=recs.find(r=>r.date===today);
  // Scoped to the pen on screen, not the farm. With two flocks of different
  // ages in different pens, a farm total under a pen heading is a wrong answer
  // to the question the heading asks.
  const pen=((farm||{}).pens||[]).find(p=>p.id===_activePenId);
  const penBirds=pen?getPenTotalBirds(pen):0;
  const penStage=pen?getPenStage(pen):null;
  const ageWeeks=penStage?penStage.weeks:null;
  const logFormHtml=`
    <div class="card">
      <div class="card-title">${todayRec?'Today\'s Flock Log ✓':'Log Bird Status'}</div>
      ${todayRec?`
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:12px">
          <div class="kpi-sm"><div class="kpi-val-sm">${todayRec.opening_birds}</div><div class="kpi-lbl-sm">Opening</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--red)">${todayRec.deaths}</div><div class="kpi-lbl-sm">Deaths</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--amber)">${todayRec.culls}</div><div class="kpi-lbl-sm">Culls</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--g2)">${todayRec.closing_birds}</div><div class="kpi-lbl-sm">Closing</div></div>
        </div>
        ${todayRec.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-bottom:10px">"${todayRec.notes}"</div>`:''}
        <div style="display:flex;gap:8px">
          <button class="btn btn-amber btn-sm" style="flex:1" onclick="openBirdForm('${todayRec.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" style="flex:1" onclick="delBirdLog('${todayRec.id}')">Delete</button>
        </div>`:`
        <button class="btn btn-primary" onclick="openBirdForm()">+ Add Bird Status Record</button>`}
    </div>`;

  const histHtml=recs.filter(r=>r.date!==today).slice(0,30).map(r=>{
    const mortality=r.opening_birds>0?(r.deaths/r.opening_birds*100):0;
    const mBadge=mortality>0.5?`<span class="badge badge-red">${mortality.toFixed(2)}% mortality</span>`:
      mortality>0.2?`<span class="badge badge-amber">${mortality.toFixed(2)}% mortality</span>`:
      r.deaths>0?`<span class="badge badge-gray">${mortality.toFixed(2)}% mortality</span>`:'';
    return`<div class="list-item">
      <div><div style="font-weight:700;font-size:14px">${fmtDate(r.date)} <span style="font-size:11px;color:var(--gray)">Wk ${r.age_weeks||'—'}</span></div>
        <div style="font-size:12px;color:var(--gray);margin-top:2px">${r.opening_birds}→${r.closing_birds} birds · ${r.deaths} deaths · ${r.culls} culls</div>
        ${mBadge}
        ${r.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-top:4px">"${r.notes}"</div>`:''}</div>
      <div style="display:flex;gap:5px">
        ${isLocked(r.date)?LOCK_BADGE:`<button class="btn btn-secondary btn-sm" onclick="openBirdForm('${r.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="delBirdLog('${r.id}')">✕</button>`}
      </div></div>`;
  }).join('');

  el.innerHTML=`<div class="topbar"><div><h1>Flock Status</h1><small>Bird mortality & daily count</small></div></div>
    ${getPenCtxBar()}
    <div class="kpi-row-3">
      <div class="kpi"><div class="kpi-val" style="color:var(--g2)">${penBirds}</div><div class="kpi-lbl">Pen Birds</div></div>
      <div class="kpi"><div class="kpi-val">${ageWeeks!==null?'Wk '+ageWeeks:'—'}</div><div class="kpi-lbl">Pen Age</div></div>
      <div class="kpi"><div class="kpi-val" style="color:var(--red)">${recs.slice(0,7).reduce((s,r)=>s+(r.deaths||0),0)}</div><div class="kpi-lbl">Deaths (7d)</div></div>
    </div>
    ${logFormHtml}
    <div class="sec-hdr">History</div>
    <div class="card" style="padding:0;overflow:hidden">${histHtml||'<div class="empty" style="padding:24px"><p>No previous records.</p></div>'}</div>
    <div style="height:12px"></div>`;
}
function openBirdForm(editId){
  const farm=DB.getFarm(), today=DB.today();
  const rec=editId?DB.getBirds().find(r=>r.id===editId):null;
  const lastRec=DB.getBirds().filter(ownedByActivePen)
    .sort((a,b)=>b.date.localeCompare(a.date)).find(r=>!editId||r.id!==editId);
  const pen=((farm||{}).pens||[]).find(p=>p.id===_activePenId);
  const defOpen=rec?rec.opening_birds:((pen?getPenTotalBirds(pen):0)||lastRec?.closing_birds||0);
  const ageWeeks=(pen?(getPenStage(pen)||{}).weeks:null)||0;
  openModal(`<div class="modal-ttl">${rec?'Edit':'Add'} Bird Status <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="background:var(--blueBg);border-left:3px solid var(--blue);padding:8px 12px;border-radius:0 6px 6px 0;font-size:12px;color:#1a5fa8;margin-bottom:12px">
      📅 Change the date to log records for <b>yesterday or any past day</b>. Feed and water are often measured the next morning — just set the date to when the consumption actually happened.
    </div>
    <div class="field"><label>Date</label><input type="date" id="bf_date" value="${rec?rec.date:today}" max="${today}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Opening Birds</label><input type="number" id="bf_open" value="${defOpen}" min="0" oninput="calcClosing()"></div>
      <div class="field"><label>Age (weeks)</label><input type="number" id="bf_age" value="${rec?.age_weeks??ageWeeks}" min="0"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Deaths Today</label><input type="number" id="bf_deaths" value="${rec?.deaths||0}" min="0" oninput="calcClosing()"></div>
      <div class="field"><label>Culls Today <span style="font-size:10px;color:var(--gray);font-weight:400">isolated, still alive</span></label><input type="number" id="bf_culls" value="${rec?.culls||0}" min="0" oninput="calcClosing()"></div>
    </div>
    <div class="field"><label>Closing Birds (auto)</label>
      <input type="number" id="bf_close" value="${rec?(rec.opening_birds-(rec.deaths||0)):defOpen}" readonly style="background:#f5f5f5;color:var(--g1);font-weight:700">
      <div id="bf_cull_note" style="font-size:11px;color:var(--amber);margin-top:4px;display:${(rec?.culls||0)>0?'block':'none'}">⚠ ${rec?.culls||0} culled bird${(rec?.culls||1)>1?'s':''} in isolation — not deducted from closing count. Log their fate (death or return) in a future daily entry.</div></div>
    <div class="field"><label>Notes</label><textarea id="bf_notes" placeholder="e.g. Birds are stable. Found dead bird in T2·C3.">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveBirdLog('${editId||''}')">Save</button>`);
}
function calcClosing(){
  const o=parseInt(document.getElementById('bf_open')?.value)||0;
  const d=parseInt(document.getElementById('bf_deaths')?.value)||0;
  const c=parseInt(document.getElementById('bf_culls')?.value)||0;
  const cl=document.getElementById('bf_close'); if(cl)cl.value=Math.max(0,o-d);
  const note=document.getElementById('bf_cull_note');
  if(note){note.style.display=c>0?'block':'none';note.textContent=`⚠ ${c} culled bird${c>1?'s':''} in isolation — not deducted from closing count. Log their fate (death or return) in a future daily entry.`;}
}
function saveBirdLog(editId){
  const date=document.getElementById('bf_date').value;
  const opening=parseInt(document.getElementById('bf_open').value)||0;
  const deaths=parseInt(document.getElementById('bf_deaths').value)||0;
  const culls=parseInt(document.getElementById('bf_culls').value)||0;
  const age_weeks=parseInt(document.getElementById('bf_age').value)||0;
  const notes=document.getElementById('bf_notes').value.trim();
  const rec={id:editId||uid(),date,pen_id:_activePenId||undefined,opening_birds:opening,deaths,culls,
    closing_birds:Math.max(0,opening-deaths),age_weeks,notes};
  if(editId)DB.updBird(editId,rec); else DB.addBird(rec);
  closeModal();confirmSave('Bird status saved');renderFlock();
}
function delBirdLog(id){
  openModal(`<div class="modal-ttl">Delete Record? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">This cannot be undone.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();DB.delBird('${id}');confirmSave('Deleted');renderFlock()">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
