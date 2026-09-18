// ═══════════════════════════════════════════════
// BATCHES
// ═══════════════════════════════════════════════
function renderBatches(){
  const el=document.getElementById('v-batches');
  const batches=DB.getBatches().sort((a,b)=>b.arrival_date.localeCompare(a.arrival_date));
  const batchHtml=batches.map(b=>{
    const ageDays=batchAgeInDays(b), ageWeeks=batchAgeInWeeks(b);
    const birds=getBatchBirdCount(b), survival=b.doc_count>0?(birds/b.doc_count*100):null;
    const vaccStatus=getBatchVaccStatus(b);
    const overdueVacc=vaccStatus.filter(v=>v.overdue&&!v.hatchery&&!v.optional);
    const nextVacc=vaccStatus.find(v=>!v.done&&!v.hatchery&&!v.optional&&!v.overdue&&v.due)||vaccStatus.find(v=>!v.done&&!v.hatchery&&!v.optional);
    const statusCls=b.status==='Active'?'active':b.status==='Sold'?'sold':'closed';
    const statusBadge=b.status==='Active'?'badge-purple':b.status==='Sold'?'badge-green':'badge-gray';
    const vaccRows=vaccStatus.map(v=>`
      <div class="vacc-row" onclick="${!v.hatchery?`toggleVacc('${b.id}','${v.name}')`:''}" style="${v.hatchery?'cursor:default;opacity:.6':''}">
        <div class="vacc-check ${v.done?'done':''}">${v.done?'✓':''}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">${v.name}</div>
          <div style="font-size:11px;color:var(--gray)">${v.hatchery?'Done at hatchery':v.route+(v.givenDate?' · Given '+fmtDate(v.givenDate):v.optional?' · Around '+fmtDate(v.dueDate):' · Due by '+fmtDate(v.dueDate))}</div>
          ${v.why?`<div style="font-size:11px;color:var(--gray);font-style:italic;margin-top:2px">${v.why}</div>`:''}
        </div>
        <span class="badge ${v.hatchery?'badge-gray':v.done?'badge-green':v.optional?'badge-gray':v.overdue?'badge-red':v.due?'badge-amber':'badge-gray'}">
          ${v.hatchery?'Hatchery':v.done?'Done':v.optional?'If needed':v.overdue?'Overdue':v.due?'Due Now':'Upcoming'}
        </span>
      </div>`).join('');
    const isSelected=_activeBatchId===b.id;
    return`<div class="batch-card ${statusCls}${isSelected?' batch-card-selected':''}" id="bc_${b.id}">
      <div style="padding:14px 16px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between">
          <div>
            <div style="font-weight:800;font-size:16px">${b.name}${isSelected?` <span style="font-size:11px;background:var(--p5);color:var(--p2);border-radius:20px;padding:2px 8px;font-weight:700;vertical-align:middle">Viewing</span>`:''}</div>
            <div style="font-size:12px;color:var(--gray);margin-top:2px">${b.breed} · ${getBirdTypeLabel(getBirdType(b))}${b.supplier?` · ${b.supplier}`:''} · Arrived: ${b.arrival_date?fmtDate(b.arrival_date):'Unknown'}</div>
          </div>
          <span class="badge ${statusBadge}">${b.status}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin:10px 0">
          <div class="kpi-sm"><div class="kpi-val-sm">${ageDays!==null?ageDays:'—'}</div><div class="kpi-lbl">Days Old</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm">${b.doc_count}</div><div class="kpi-lbl">DOC In</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--p2)">${birds}</div><div class="kpi-lbl">Current</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:${survival>=95?'var(--g2)':survival>=90?'var(--amber)':'var(--red)'}">${survival!==null?survival.toFixed(0)+'%':'—'}</div><div class="kpi-lbl">Survival</div></div>
        </div>
        ${overdueVacc.length?`<div class="alert-item alert-red" style="margin-bottom:8px">⚠ ${overdueVacc.length} overdue vaccination${overdueVacc.length>1?'s':''}</div>`:''}
        ${nextVacc&&!overdueVacc.length?`<div style="font-size:12px;color:var(--amber);font-weight:700;margin-bottom:8px">💉 Next: ${nextVacc.name} by ${fmtDate(nextVacc.dueDate)}</div>`:''}
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" style="flex:2;min-width:100px" onclick="selectBatch('${b.id}','daily')">${isSelected?'✓ Currently Viewing':'Open Records'}</button>
          <button class="btn btn-secondary btn-sm" style="flex:1;min-width:70px" onclick="openDailyForm('${b.id}')">Log Today</button>
          <button class="btn btn-amber btn-sm" onclick="editBatch('${b.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="closeBatch('${b.id}')">Close</button>
        </div>
      </div>
      <div style="border-top:1px solid #f5f5f5">
        <div style="padding:8px 16px;font-size:12px;font-weight:800;color:var(--gray);text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px" onclick="toggleVaccPanel('${b.id}')">
          <span>💉 Vaccination Schedule <span id="vacc_arr_${b.id}">▾</span></span>
          <button class="btn btn-secondary btn-sm" style="padding:5px 10px;font-size:11px;flex-shrink:0" onclick="event.stopPropagation();openVaccDoc('${b.id}')">🖨 Print</button>
        </div>
        <div id="vacc_panel_${b.id}" style="display:none">
          ${vaccRows}
          <div style="padding:10px 14px;font-size:11px;color:var(--amber);border-top:1px solid #f5f5f5;font-style:italic">💊 ${VACC_NOTE}</div>
        </div>
      </div>
    </div>`;
  }).join('');
  el.innerHTML=`<div class="topbar"><div><h1>Batches</h1><small>Broiler · Pullet · Noiler</small></div></div>
    <div style="margin:12px 16px"><button class="btn btn-primary" onclick="addBatch()">+ New Batch (DOC Arrival)</button></div>
    ${batchHtml||'<div class="empty"><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg><h3>No batches yet</h3><p>Add your first batch when DOC arrive.</p></div>'}
    <div style="height:12px"></div>`;
}
function toggleVaccPanel(id){
  const panel=document.getElementById('vacc_panel_'+id);
  const arr=document.getElementById('vacc_arr_'+id);
  if(panel){panel.style.display=panel.style.display==='none'?'block':'none';}
  if(arr){arr.textContent=panel.style.display==='none'?'▾':'▴';}
}
function toggleVacc(batchId,vaccName){
  const batch=DB.getBatches().find(b=>b.id===batchId); if(!batch)return;
  if(!batch.vaccinations)batch.vaccinations={};
  const wasDone=!!batch.vaccinations[vaccName];
  // Stamp the day it was ticked. The tick is the only moment the app ever
  // hears about a real date, and a health record handed to a buyer is worth
  // very little without them.
  batch.vaccinations[vaccName]=wasDone?false:{done:true,date:DB.today()};
  DB.updBatch(batchId,{vaccinations:batch.vaccinations});
  confirmSave(wasDone?`${vaccName} unmarked`:`${vaccName} marked done`);
  renderBatches();
}
function setAddBatchType(type,pfx){
  ['broiler','pullet','noiler'].forEach(t=>{
    const btn=document.getElementById(pfx+'t_'+t);
    if(btn){btn.className='btn btn-sm '+(t===type?'btn-primary':'btn-secondary');btn.style.flex='1';}
  });
  const sel=document.getElementById(pfx+'breed');
  if(sel)sel.innerHTML=(BREEDS_BY_TYPE[type]||[]).map(b=>`<option value="${b}">${b}</option>`).join('');
  const tgt=document.getElementById(pfx+'target');
  if(tgt)tgt.value=type==='broiler'?6:type==='noiler'?14:18;
  const inp=document.getElementById(pfx+'type');
  if(inp)inp.value=type;
}
function addBatch(){
  const today=DB.today();
  openModal(`<div class="modal-ttl">New Batch (DOC Arrival) <button class="modal-x" onclick="closeModal()">×</button></div>
    <div class="field"><label>Batch Name</label><input type="text" id="ab_name" placeholder="e.g. Batch 1 — Apr 2026"></div>
    <div class="field"><label>Bird Type</label>
      <div style="display:flex;gap:8px">
        <button type="button" id="ab_t_broiler" class="btn btn-secondary btn-sm" onclick="setAddBatchType('broiler','ab_')" style="flex:1">Broiler</button>
        <button type="button" id="ab_t_pullet"  class="btn btn-secondary btn-sm" onclick="setAddBatchType('pullet','ab_')"  style="flex:1">Pullet</button>
        <button type="button" id="ab_t_noiler"  class="btn btn-secondary btn-sm" onclick="setAddBatchType('noiler','ab_')"  style="flex:1">Noiler</button>
      </div>
      <input type="hidden" id="ab_type" value="">
    </div>
    <div class="field"><label>Breed</label><select id="ab_breed"><option value="">— select bird type first —</option></select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Arrival Date</label><input type="date" id="ab_date" value="${today}" max="${today}"></div>
      <div class="field"><label>Number of DOC</label><input type="number" id="ab_count" value="" min="1" placeholder="e.g. 500"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Price/Bird (₦)</label><input type="number" id="ab_price" value="" min="0" step="50" placeholder="e.g. 600"></div>
      <div class="field"><label>Target Sale Age (wks)</label><input type="number" id="ab_target" value="6" min="4" max="24"></div>
    </div>
    <div class="field"><label>Supplier / Source</label><input type="text" id="ab_supplier" placeholder="e.g. Obasanjo Farms, Chi Farms"></div>
    <div class="field"><label>Notes</label><textarea id="ab_notes" placeholder="Optional"></textarea></div>
    <button class="btn btn-primary" onclick="doAddBatch()">Add Batch</button>`);
}
function doAddBatch(){
  const name=document.getElementById('ab_name').value.trim();
  if(!name){toast('Enter batch name');return;}
  const bird_type=document.getElementById('ab_type').value;
  if(!bird_type){toast('Select a bird type — Broiler, Pullet or Noiler');return;}
  const count=parseInt(document.getElementById('ab_count').value)||0;
  if(count<1){toast('Enter DOC count');return;}
  const batch={id:uid(),name,
    bird_type,
    breed:document.getElementById('ab_breed').value,
    arrival_date:document.getElementById('ab_date').value,doc_count:count,
    price_per_bird_ngn:parseFloat(document.getElementById('ab_price').value)||0,
    target_sale_age_weeks:parseInt(document.getElementById('ab_target').value)||6,
    supplier:document.getElementById('ab_supplier').value.trim(),
    notes:document.getElementById('ab_notes').value.trim(),
    status:'Active',vaccinations:{},sale_records:[]};
  DB.addBatch(batch);
  // Auto-log DOC purchase as expense
  if(batch.price_per_bird_ngn>0){
    DB.addExpense({id:uid(),date:batch.arrival_date,batch_id:batch.id,batch_name:batch.name,
      category:'DOC Purchase',amount_ngn:count*batch.price_per_bird_ngn,amount_usd:0,
      notes:`${count} DOC for ${batch.name} from ${batch.supplier||'supplier'}`});
  }
  closeModal();confirmSave(`${name} added`);renderBatches();
}
function editBatch(batchId){
  const b=DB.getBatches().find(b=>b.id===batchId); if(!b)return;
  const bType=getBirdType(b);
  const breedOpts=(BREEDS_BY_TYPE[bType]||[]).map(br=>`<option value="${br}" ${b.breed===br?'selected':''}>${br}</option>`).join('');
  const btnCls=t=>'btn btn-sm '+(t===bType?'btn-primary':'btn-secondary');
  openModal(`<div class="modal-ttl">Edit ${b.name} <button class="modal-x" onclick="closeModal()">×</button></div>
    <div class="field"><label>Batch Name</label><input type="text" id="eb_name" value="${b.name}"></div>
    <div class="field"><label>Bird Type</label>
      <div style="display:flex;gap:8px">
        <button type="button" id="eb_t_broiler" class="${btnCls('broiler')}" onclick="setAddBatchType('broiler','eb_')" style="flex:1">Broiler</button>
        <button type="button" id="eb_t_pullet"  class="${btnCls('pullet')}"  onclick="setAddBatchType('pullet','eb_')"  style="flex:1">Pullet</button>
        <button type="button" id="eb_t_noiler"  class="${btnCls('noiler')}"  onclick="setAddBatchType('noiler','eb_')"  style="flex:1">Noiler</button>
      </div>
      <input type="hidden" id="eb_type" value="${bType}">
    </div>
    <div class="field"><label>Breed</label><select id="eb_breed">${breedOpts}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Arrival Date</label><input type="date" id="eb_date" value="${b.arrival_date}"></div>
      <div class="field"><label>DOC Count</label><input type="number" id="eb_count" value="${b.doc_count}" min="1"></div>
    </div>
    <div class="field"><label>Supplier / Source</label><input type="text" id="eb_supplier" value="${b.supplier||''}"></div>
    <div class="field"><label>Target Sale Age (weeks)</label><input type="number" id="eb_target" value="${b.target_sale_age_weeks||6}" min="4" max="24"></div>
    <button class="btn btn-primary" onclick="doEditBatch('${batchId}')">Save</button>`);
}
function doEditBatch(batchId){
  DB.updBatch(batchId,{name:document.getElementById('eb_name').value.trim(),
    bird_type:document.getElementById('eb_type').value,
    breed:document.getElementById('eb_breed').value,
    arrival_date:document.getElementById('eb_date').value,
    doc_count:parseInt(document.getElementById('eb_count').value)||0,
    supplier:document.getElementById('eb_supplier').value.trim(),
    target_sale_age_weeks:parseInt(document.getElementById('eb_target').value)||6});
  closeModal();confirmSave('Batch updated');renderBatches();
}
function closeBatch(batchId){
  const b=DB.getBatches().find(b=>b.id===batchId);
  openModal(`<div class="modal-ttl">Close Batch: ${b?.name} <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">Closing a batch marks it as completed. You can still view its records.</p>
    <div class="field"><label>Final Status</label>
      <select id="cl_status"><option value="Sold">Sold (Birds have been sold)</option><option value="Closed">Closed (Other reason)</option></select></div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-primary" onclick="doCloseBatch('${batchId}')">Confirm Close</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
function doCloseBatch(batchId){
  const status=document.getElementById('cl_status').value;
  DB.updBatch(batchId,{status});closeModal();confirmSave('Batch closed');renderBatches();
}
