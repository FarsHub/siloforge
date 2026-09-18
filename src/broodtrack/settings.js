// ═══════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════
function renderSettings(){
  const el=document.getElementById('v-settings');
  const farm=DB.getFarm()||{name:''};
  const activeBatch=_activeBatchId?DB.getBatches().find(b=>b.id===_activeBatchId):null;
  if(!SETTINGS_TYPE)SETTINGS_TYPE=activeBatch?getBirdType(activeBatch):'broiler';
  const st=SETTINGS_TYPE;
  const phases=getFeedPhases(st);
  const typeLabel=getBirdTypeLabel(st);
  const activeNote=activeBatch
    ?`<div style="font-size:12px;color:var(--p2);font-weight:600;margin-bottom:10px">Active batch: ${activeBatch.name} · ${getBirdTypeLabel(getBirdType(activeBatch))}</div>`
    :'';
  const bookTable=getFeedByWeekTable(st);
  const maxWk=bookTable?Math.max(...Object.keys(bookTable).map(Number)):0;
  const bookChartHtml=bookTable?`
      <div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;margin-bottom:6px">Feed intake — farm book chart (g/bird/day)</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px">
        ${Object.keys(bookTable).map(Number).map(wk=>`<span class="badge badge-purple" style="font-weight:700">W${wk}${wk===maxWk&&st==='pullet'?'+':''}: ${bookTable[wk]}g</span>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--gray);font-style:italic;margin-bottom:12px">Feed follows this weekly chart from the farm book (the book notes it may be adjusted slightly to suit the birds). Water is adjustable below.</div>`:'';
  const ratio=farm[`${st}_waterRatio`]||DEFAULT_WATER_RATIO;
  const feedGrid=bookTable?'':phases.map(p=>{
    const fVal=farm[`${st}_feedRateG_${p.key}`]||p.feedGPerBird;
    return`<div style="font-size:12px;font-weight:700;color:var(--p1);padding-top:6px">${p.label}</div>
      <div class="field" style="margin-bottom:0"><input type="number" id="s_f_${p.key}" value="${fVal}" min="10" max="300"></div>`;
  }).join('');
  const tabBtn=(t,lbl)=>`<button class="inner-tab ${st===t?'active':''}" onclick="SETTINGS_TYPE='${t}';renderSettings()">${lbl}</button>`;
  el.innerHTML=`<div class="topbar"><div><h1>Settings</h1></div></div>
    <div class="card">
      <div class="card-title">Farm / Operation</div>
      <div class="field"><label>Operation Name</label><input type="text" id="s_name" value="${farm.name||''}" placeholder="e.g. ABC Poultry Farm — Brooding Unit"></div>
      <button class="btn btn-primary" onclick="saveFarm()">Save</button>
    </div>
    <div class="card">
      <div class="card-title">Receipts &amp; Invoices</div>
      <p style="font-size:13px;color:var(--gray);margin-bottom:10px">
        These details print on the receipt you give a buyer. Leave anything blank and it simply won't appear.
      </p>
      <div class="field"><label>Name on documents</label>
        <input type="text" id="s_doc_name" value="${farm.doc_name||''}" placeholder="${(farm.name||'My Farm').replace(/"/g,'&quot;')}"></div>
      <div class="field"><label>Address</label>
        <input type="text" id="s_doc_address" value="${farm.doc_address||''}" placeholder="e.g. Km 8, Iseyin Road, Oyo"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>Phone</label>
          <input type="tel" id="s_doc_phone" value="${farm.doc_phone||''}" placeholder="0803 000 0000"></div>
        <div class="field"><label>RC number <span style="font-size:11px;color:var(--gray);font-weight:400">optional</span></label>
          <input type="text" id="s_doc_rc" value="${farm.doc_rc||''}" placeholder="RC 1234567"></div>
      </div>
      <div class="field"><label>Email <span style="font-size:11px;color:var(--gray);font-weight:400">optional</span></label>
        <input type="email" id="s_doc_email" value="${farm.doc_email||''}" placeholder="farm@example.com"></div>
      <div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px">Where buyers pay</div>
      <p style="font-size:12px;color:var(--gray);margin-bottom:8px">Printed only when a balance is still owed.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>Bank</label>
          <input type="text" id="s_bank_name" value="${farm.bank_name||''}" placeholder="e.g. Moniepoint"></div>
        <div class="field"><label>Account number</label>
          <input type="text" id="s_bank_account" value="${farm.bank_account||''}" placeholder="0123456789" inputmode="numeric"></div>
      </div>
      <div class="field"><label>Account name</label>
        <input type="text" id="s_bank_account_name" value="${farm.bank_account_name||''}" placeholder="As it appears at the bank"></div>
      <div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px">Terms</div>
      <p style="font-size:12px;color:var(--gray);margin-bottom:8px">Keep these short — the buyer reads them on a phone. Which one prints is decided by age at sale.</p>
      ${DOC_TERM_KEYS.map(t=>`
        <div class="field"><label>${t.label}</label>
          <textarea id="s_terms_${t.key}" rows="2" placeholder="${t.text}">${(farm.doc_terms||{})[t.key]||''}</textarea></div>`).join('')}
      <button class="btn btn-primary" onclick="saveDocSettings()">Save Document Details</button>
      ${!isDocSetupComplete()?`<div class="alert-item alert-amber" style="margin-top:10px">
        Add at least an address and phone number so receipts don't go out looking unfinished.
      </div>`:''}
    </div>
    <div class="card">
      <div class="card-title">Feed & Water Rate Defaults (per bird/day)</div>
      ${activeNote}
      <div class="inner-tabs" style="margin:-4px -18px 14px;border-radius:0;border-top:1px solid #eee">
        ${tabBtn('broiler','Broiler')}${tabBtn('pullet','Pullet')}${tabBtn('noiler','Noiler')}
      </div>
      ${bookChartHtml}
      ${bookTable?'':`<div style="display:grid;grid-template-columns:auto 1fr;gap:8px 10px;align-items:end;margin-bottom:10px">
        <div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;padding-bottom:4px"></div>
        <div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;padding-bottom:4px">Feed (g)</div>
        ${feedGrid}
      </div>`}
      <div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 6px">Which feed each phase uses</div>
      <p style="font-size:12px;color:var(--gray);margin-bottom:10px">
        This is what lets the app tell a real shortage apart from a phase that is simply ending — a feed only has to last as long as the birds are on it.
      </p>
      ${getBroodFeedProgramme(st).map(ph=>`
        <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:8px;align-items:center;margin-bottom:8px">
          <div style="font-size:12px;font-weight:700;color:var(--p1)">${ph.label}
            <span style="font-weight:500;color:var(--gray)">${ph.maxDay>=999?'(onwards)':`(to d${ph.maxDay})`}</span></div>
          <select id="s_ft_${ph.key}">${['',...BROOD_FEED_TYPES].map(t=>`<option value="${t}" ${t===ph.type?'selected':''}>${t||'— not used —'}</option>`).join('')}</select>
        </div>`).join('')}
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;margin-top:14px">
        <label style="font-size:13px;font-weight:700;color:var(--p1)">💧 Water = feed ×</label>
        <input type="number" id="s_wr" value="${ratio}" min="1" max="5" step="0.1" style="width:76px;padding:9px 10px;border:1.5px solid #ddd;border-radius:10px;font-size:15px">
      </div>
      <div style="font-size:11px;color:var(--gray);font-style:italic;margin-bottom:8px">Daily water need = feed intake × this ratio. 2.0–2.5 is typical; use the higher end in hot weather.</div>
      <button class="btn btn-primary" style="margin-top:4px" onclick="saveFeedRates()">Save ${typeLabel} Settings</button>
    </div>
    ${(()=>{const pol=getFeedPolicy();return `
    <div class="card">
      <div class="card-title">Feed Store</div>
      <p style="font-size:13px;color:var(--gray);margin-bottom:12px">
        Bag size is what turns a bag count in the store into kilograms, so it has to match the sacks you actually buy. The two warning levels are days of feed left — set them to leave enough time to get a delivery in.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>Warn below (days left)</label>
          <input type="number" id="fs_warn" value="${pol.warnDays}" min="1" max="90" step="1"></div>
        <div class="field"><label>Red alert below (days left)</label>
          <input type="number" id="fs_urgent" value="${pol.urgentDays}" min="1" max="90" step="1"></div>
        <div class="field"><label>Buy to cover (days)</label>
          <input type="number" id="fs_target" value="${pol.targetDays}" min="3" max="180" step="1"></div>
      </div>
      <div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.06em;margin:6px 0 8px">kg per bag</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${BROOD_FEED_TYPES.map(t=>`<div class="field" style="margin-bottom:0"><label>${t}</label>
          <input type="number" id="fs_bag_${t.replace(/[^a-z0-9]/gi,'_')}" value="${getBagKg(t)}" min="1" max="100" step="0.5"></div>`).join('')}
      </div>
      <button class="btn btn-primary" style="margin-top:12px" onclick="saveFeedStoreSettings()">Save Feed Store Settings</button>
    </div>`;})()}
    <div class="card">
      <div class="card-title">Data Export / Import</div>
      <p style="font-size:13px;color:var(--gray);margin-bottom:14px">Export all data as a PostgreSQL-compatible JSON file.</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-primary" onclick="exportData()">Export All Data (JSON)</button>
        <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">Import Data (JSON)</button>
        <input type="file" id="importFile" accept=".json" style="display:none" onchange="importData(this)">
      </div>
    </div>
    <div class="card">
      <div class="card-title">Recently Deleted</div>
      <p style="font-size:13px;color:var(--gray);margin-bottom:12px">Anything deleted in the app is kept here for 60 days and can be put back. After that it is permanently removed.</p>
      <button class="btn btn-secondary" onclick="openTrashModal()">View Recently Deleted</button>
    </div>
    <div style="height:20px"></div>`;
}
function saveDocSettings(){
  const farm=DB.getFarm()||{};
  const val=id=>(document.getElementById(id)?.value||'').trim();
  farm.doc_name=val('s_doc_name');
  farm.doc_address=val('s_doc_address');
  farm.doc_phone=val('s_doc_phone');
  farm.doc_email=val('s_doc_email');
  farm.doc_rc=val('s_doc_rc');
  farm.bank_name=val('s_bank_name');
  farm.bank_account=val('s_bank_account');
  farm.bank_account_name=val('s_bank_account_name');
  // Store only what differs from the default, so unedited terms keep tracking
  // future wording changes rather than freezing today's copy.
  const terms={};
  DOC_TERM_KEYS.forEach(t=>{
    const v=val('s_terms_'+t.key);
    if(v&&v!==t.text)terms[t.key]=v;
  });
  farm.doc_terms=terms;
  DB.saveFarm(farm);confirmSave('Document details saved');renderSettings();
}
function saveFarm(){
  const farm=DB.getFarm()||{};
  farm.name=document.getElementById('s_name')?.value.trim()||farm.name||'My Brooding Farm';
  DB.saveFarm(farm);confirmSave('Farm name saved');
}
function saveFeedStoreSettings(){
  const farm=DB.getFarm()||{};
  const warn=parseInt(document.getElementById('fs_warn').value,10);
  const urgent=parseInt(document.getElementById('fs_urgent').value,10);
  const target=parseInt(document.getElementById('fs_target').value,10);
  farm.feedWarnDays=warn>0?warn:DEFAULT_FEED_WARN_DAYS;
  // Red has to sit inside amber, or a store could go red without ever having
  // been amber and the earlier warning would never be seen.
  farm.feedUrgentDays=Math.min(urgent>0?urgent:DEFAULT_FEED_URGENT_DAYS,farm.feedWarnDays);
  farm.feedTargetDays=target>0?target:DEFAULT_FEED_TARGET_DAYS;
  // Only sizes that differ from the default are stored, so the default can move
  // later without every farm carrying a frozen copy of today's value.
  const bags={};
  BROOD_FEED_TYPES.forEach(t=>{
    const v=parseFloat(document.getElementById('fs_bag_'+t.replace(/[^a-z0-9]/gi,'_')).value);
    if(v>0&&v!==DEFAULT_BAG_KG)bags[t]=v;
  });
  farm.feedBagKg=bags;
  DB.saveFarm(farm);confirmSave('Feed store settings saved');renderSettings();renderFeed();renderHome();renderFeedTicker();
}
function saveFeedRates(){
  const farm=DB.getFarm()||{};
  const st=SETTINGS_TYPE||'broiler';
  getFeedPhases(st).forEach(p=>{const fEl=document.getElementById(`s_f_${p.key}`);if(fEl)farm[`${st}_feedRateG_${p.key}`]=parseInt(fEl.value)||p.feedGPerBird;});
  const wrEl=document.getElementById('s_wr');if(wrEl)farm[`${st}_waterRatio`]=parseFloat(wrEl.value)||DEFAULT_WATER_RATIO;
  // Phase → feed mapping. Only a value that differs from the default is stored,
  // so a farm that never edits this keeps tracking the defaults.
  getFeedPhases(st).forEach(p=>{
    const el=document.getElementById(`s_ft_${p.key}`);
    if(!el)return;
    const v=(el.value||'').trim();
    const def=(DEFAULT_BROOD_FEED_TYPES[st]||{})[p.key]||'';
    const key=`${st}_feedType_${p.key}`;
    if(v&&v!==def)farm[key]=v; else delete farm[key];
  });
  DB.saveFarm(farm);confirmSave(`${getBirdTypeLabel(st)} settings saved`);
  renderSettings();renderFeed();renderHome();renderFeedTicker();
}
function exportData(){
  const bundle={exported_at:new Date().toISOString(),source:'BroodTrack',version:'1.0',
    farm:DB.getFarm(),batches:DB.getBatches(),
    brooding_daily_log:DB.getDaily().map(r=>({
      date:r.date,batch_id:r.batch_id,batch_name:r.batch_name,age_days:r.age_days,
      opening_birds:r.opening_birds,deaths:r.deaths,culls:r.culls,closing_birds:r.closing_birds,
      feed_kg_used:r.feed_kg_used,feed_req_kg:r.feed_req_kg,water_liters:r.water_liters,
      temperature_c:r.temperature_c,humidity_pct:r.humidity_pct,notes:r.notes
    })),
    brooding_weight_log:DB.getWeight().map(r=>({
      id:r.id,date:r.date,batch_id:r.batch_id,batch_name:r.batch_name,breed:r.breed,
      week_num:r.week_num,sample_size:r.sample_size,avg_weight_g:r.avg_weight_g,
      min_weight_g:r.min_weight_g,max_weight_g:r.max_weight_g,benchmark_g:r.benchmark_g,
      weights:r.weights,sd_g:r.sd_g,cv_pct:r.cv_pct,uniformity_pct:r.uniformity_pct,
      notes:r.notes
    })),
    brooding_health_log:DB.getHealth(),
    customers:DB.getCustomers(),
    // The order book, declined rows and all. A declined order is the only
    // record of demand the farm could not meet, so an export that dropped it
    // would quietly lose the case for more capacity.
    orders:DB.getOrders().map(o=>({
      id:o.id,ref:o.ref,date:o.date,customer_id:o.customer_id,customer_name:o.customer_name,
      bird_type:o.bird_type,breed:o.breed,quantity:o.quantity,
      age_weeks_at_delivery:o.age_weeks_at_delivery,
      needed_from:o.needed_from,needed_to:o.needed_to,
      price_per_bird_ngn:o.price_per_bird_ngn,status:o.status,
      batch_id:o.batch_id,sale_id:o.sale_id,decline_reason:o.decline_reason,
      deposits_ngn:orderDepositTotal(o.id),notes:o.notes
    })),
    feed_store:DB.getFeedStock().map(r=>({id:r.id,date:r.date,kind:r.kind||'purchase',
      feed_type:r.feed_type,batch_id:r.batch_id,batch_name:r.batch_name,
      bags:r.bags,loose_kg:r.loose_kg,kg:r.kg,bag_kg:r.bag_kg,
      cost_ngn:r.cost_ngn,supplier:r.supplier,counted_by:r.counted_by,
      variance_kg:r.variance_kg,expense_id:r.expense_id,notes:r.notes})),
    // Derived, so an analyst does not have to reimplement the forward walk.
    feed_store_status:getFeedStoreStatus().map(c=>({feed_type:c.feed_type,state:c.state,
      kg_on_hand:c.kg,bags_on_hand:c.bags,loose_kg:c.loose,
      open_ended:c.openEnded,kg_per_day_now:Math.round(c.todayKg*10)/10,
      window_start:c.startDate,window_end:c.openEnded?null:c.endDate,
      window_need_kg:Math.round(c.needKg),cover_days:c.coverDays,runout_date:c.runoutDate,
      short_kg:Math.round(c.shortKg),surplus_kg:Math.round(c.surplusKg),
      bags_to_buy:c.buyBags,last_count_date:c.lastCountDate,headline:c.headline})),
    feed_programme:['broiler','pullet','noiler'].reduce((o,bt)=>{
      o[bt]=getBroodFeedProgramme(bt).map(p=>({phase:p.key,label:p.label,to_day:p.maxDay,feed_type:p.type}));
      return o;},{}),
    expenses:DB.getExpenses().map(e=>({
      date:e.date,batch_id:e.batch_id,batch_name:e.batch_name,
      category:e.category,amount_ngn:e.amount_ngn,amount_usd:e.amount_usd,notes:e.notes,
      feed_stock_id:e.feed_stock_id
    })),
    // id is included so import's _mergeById can actually match, and so the
    // payment records below keep pointing at the right sale after a round trip.
    sales:DB.getSales().map(s=>({
      id:s.id,date:s.date,batch_id:s.batch_id,batch_name:s.batch_name,breed:s.breed,
      customer_id:s.customer_id,order_id:s.order_id,
      quantity:s.quantity,age_weeks_at_sale:s.age_weeks_at_sale,
      price_per_bird_ngn:s.price_per_bird_ngn,total_amount_ngn:s.total_amount_ngn,
      payment_type:s.payment_type,paid:s.paid,due_date:s.due_date,
      buyer:s.buyer,seller:s.seller,notes:s.notes,
      doc_ref:s.doc_ref,doc_issued_at:s.doc_issued_at
    })),
    payments:DB.getPayments().map(p=>({
      id:p.id,sale_id:p.sale_id,order_id:p.order_id,date:p.date,amount_ngn:p.amount_ngn,
      method:p.method,kind:p.kind,notes:p.notes
    }))
  };
  const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`BroodTrack_export_${DB.today()}.json`;a.click();
  URL.revokeObjectURL(url);toast('Export complete ✓');
}
function _mergeById(existing,incoming){
  const map=new Map((existing||[]).map(r=>[r.id,r]));
  (incoming||[]).forEach(r=>{if(r.id&&!map.has(r.id))map.set(r.id,r);});
  return Array.from(map.values());
}
function importData(input){
  const file=input.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    let data;
    try{data=JSON.parse(e.target.result);}
    catch(err){
      openModal(`<div class="modal-ttl">Import Failed <button class="modal-x" onclick="closeModal()">×</button></div>
        <div style="background:#fee2e2;border-left:3px solid var(--red);padding:10px 14px;border-radius:0 8px 8px 0;font-size:13px;color:#7f1d1d;margin-bottom:12px">
          The file could not be parsed as JSON.<br><b>Error:</b> ${err.message}
        </div>
        <button class="btn btn-secondary" onclick="closeModal()">OK</button>`);
      input.value=''; return;
    }
    const counts={};
    if(data.farm){DB.saveFarm(data.farm);counts.farm='1 farm config';}
    if(data.batches?.length){const m=_mergeById(DB._arr(KEYS.batches),data.batches);DB._set(KEYS.batches,m);counts.batches=data.batches.length+' batch(es) merged';}
    if(data.brooding_daily_log?.length){const m=_mergeById(DB._arr(KEYS.daily),data.brooding_daily_log);DB._set(KEYS.daily,m);counts.daily=data.brooding_daily_log.length+' daily logs merged';}
    if(data.brooding_weight_log?.length){const m=_mergeById(DB._arr(KEYS.weight),data.brooding_weight_log);DB._set(KEYS.weight,m);counts.weight=data.brooding_weight_log.length+' weight records merged';}
    if(data.brooding_health_log?.length){const m=_mergeById(DB._arr(KEYS.health),data.brooding_health_log);DB._set(KEYS.health,m);counts.health=data.brooding_health_log.length+' health records merged';}
    if(data.feed_store?.length){const m=_mergeById(DB._arr(KEYS.feedstock),data.feed_store);DB._set(KEYS.feedstock,m);counts.feedstock=data.feed_store.length+' feed store entries merged';}
    if(data.expenses?.length){const m=_mergeById(DB._arr(KEYS.expenses),data.expenses);DB._set(KEYS.expenses,m);counts.expenses=data.expenses.length+' expenses merged';}
    if(data.customers?.length){const m=_mergeById(DB._arr(KEYS.customers),data.customers);DB._set(KEYS.customers,m);counts.customers=data.customers.length+' customer(s) merged';}
    if(data.orders?.length){const m=_mergeById(DB._arr(KEYS.orders),data.orders);DB._set(KEYS.orders,m);counts.orders=data.orders.length+' order(s) merged';}
    if(data.sales?.length){const m=_mergeById(DB._arr(KEYS.sales),data.sales);DB._set(KEYS.sales,m);counts.sales=data.sales.length+' sales merged';}
    if(data.payments?.length){const m=_mergeById(DB._arr(KEYS.payments),data.payments);DB._set(KEYS.payments,m);counts.payments=data.payments.length+' payments merged';}
    renderHome();renderDaily();renderFeed();renderHealth();renderFinance();renderReports();renderSettings();
    const lines=Object.values(counts);
    if(lines.length===0){
      openModal(`<div class="modal-ttl">Nothing Imported <button class="modal-x" onclick="closeModal()">×</button></div>
        <div style="font-size:13px;color:var(--gray);margin-bottom:12px">The file was valid JSON but contained no recognisable data. Check that the file came from a BroodTrack export.</div>
        <button class="btn btn-secondary" onclick="closeModal()">OK</button>`);
    } else {
      openModal(`<div class="modal-ttl">Import Complete ✓ <button class="modal-x" onclick="closeModal()">×</button></div>
        <div style="background:#d1fae5;border-left:3px solid var(--g2);padding:10px 14px;border-radius:0 8px 8px 0;font-size:13px;color:#065f46;margin-bottom:12px">
          ${lines.map(l=>`✓ ${l}`).join('<br>')}
        </div>
        <div style="font-size:12px;color:var(--gray);margin-bottom:12px">Existing data was preserved. New records were added alongside it.</div>
        <button class="btn btn-primary" onclick="closeModal()">Done</button>`);
    }
    input.value='';
  };
  reader.readAsText(file);
}
// ── RECENTLY DELETED (restore UI) ──
async function openTrashModal(){
  const shell=body=>`<div class="modal-ttl">Recently Deleted <button class="modal-x" onclick="closeModal()">×</button></div>${body}`;
  openModal(shell('<p style="font-size:13px;color:var(--gray)">Loading…</p>'));
  let items;
  try{items=await loadTrash();}
  catch(e){
    openModal(shell(`<p style="font-size:13px;color:var(--red);margin-bottom:12px">Could not load deleted records. Check your connection.</p>
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>`));
    return;
  }
  if(!items.length){
    openModal(shell(`<p style="font-size:13px;color:var(--gray);margin-bottom:12px">Nothing has been deleted in the last ${TRASH_TTL_DAYS} days.</p>
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>`));
    return;
  }
  // One row per delete action, not per record, so a bulk reset reads as a single undoable event.
  const groups={};
  items.forEach(t=>{
    const g=groups[t.batch_id]||(groups[t.batch_id]={id:t.batch_id,at:t.deleted_at,labels:{},n:0});
    g.n++;g.labels[t.label]=(g.labels[t.label]||0)+1;
    if(t.deleted_at>g.at)g.at=t.deleted_at;
  });
  const rows=Object.values(groups).sort((a,b)=>b.at.localeCompare(a.at)).map(g=>{
    const what=Object.entries(g.labels).map(([l,c])=>`${c} × ${l}`).join(' · ');
    const when=new Date(g.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    return `<div class="list-item" style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div><div style="font-weight:600;font-size:13px">${what}</div>
        <div style="font-size:11px;color:var(--gray)">${when}</div></div>
      <button class="btn btn-secondary btn-sm" onclick="doRestoreTrash('${g.id}',this)">Restore</button></div>`;
  }).join('');
  openModal(shell(`<p style="font-size:12px;color:var(--gray);margin-bottom:10px">Kept for ${TRASH_TTL_DAYS} days, then permanently removed.</p>
    ${rows}
    <div id="rt_err" style="color:var(--red);font-size:12px;min-height:16px;margin-top:8px"></div>
    <button class="btn btn-secondary" style="margin-top:6px" onclick="closeModal()">Close</button>`));
}
async function doRestoreTrash(batchId,btn){
  if(btn){btn.disabled=true;btn.textContent='Restoring…';}
  try{
    const n=await restoreTrashBatch(batchId);
    toast(`${n} record${n===1?'':'s'} restored ✓`);
    openTrashModal();renderSettings();
  }catch(e){
    const el=document.getElementById('rt_err');
    if(el)el.textContent='Restore failed — check your connection and try again.';
    if(btn){btn.disabled=false;btn.textContent='Restore';}
  }
}
