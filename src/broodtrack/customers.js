// ═══════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════
// BroodTrack sells to other farms, so the buyer is a business we deal with
// again, not a line of text on one sale. Until now `buyer` was free text:
// "Alhaji Musa", "alhaji musa" and "Musa Farms" were three different people as
// far as the app was concerned, and nothing could answer who buys from us
// twice. A customer record is the spine the order book and the receivables
// both hang off.
//
// Names are matched on a normalised form, and near-misses are offered rather
// than merged silently — two farms in the same town really can be called
// almost the same thing.
function normalizeCustomerName(s){
  return String(s||'').toLowerCase().trim().replace(/\s+/g,' ');
}
function findCustomerByName(name){
  const norm=normalizeCustomerName(name);
  if(!norm)return null;
  return DB.getCustomers().find(c=>c.name_normalized===norm)||null;
}
function levenshtein(a,b){
  if(a===b)return 0;
  if(!a.length)return b.length;
  if(!b.length)return a.length;
  const v0=new Array(b.length+1).fill(0).map((_,i)=>i);
  const v1=new Array(b.length+1).fill(0);
  for(let i=0;i<a.length;i++){
    v1[0]=i+1;
    for(let j=0;j<b.length;j++){
      const cost=a[i]===b[j]?0:1;
      v1[j+1]=Math.min(v1[j]+1, v0[j+1]+1, v0[j]+cost);
    }
    for(let j=0;j<=b.length;j++)v0[j]=v1[j];
  }
  return v1[b.length];
}
function fuzzyCustomerMatches(name,limit=4){
  const norm=normalizeCustomerName(name);
  if(norm.length<2)return [];
  const scored=DB.getCustomers().map(c=>{
    const cn=c.name_normalized||'';
    const dist=levenshtein(norm,cn);
    const maxLen=Math.max(norm.length,cn.length);
    const sim=maxLen?1-dist/maxLen:0;
    const contains=cn.includes(norm)||norm.includes(cn);
    return {customer:c, sim, contains};
  });
  return scored.filter(s=>s.sim>=0.55||s.contains)
    .sort((a,b)=>(b.contains-a.contains)||(b.sim-a.sim))
    .slice(0,limit)
    .map(s=>s.customer);
}
function customerSales(customerId){
  return DB.getSales().filter(s=>s.customer_id===customerId);
}
function getCustomerOutstanding(customerId){
  if(!customerId)return 0;
  return customerSales(customerId)
    .filter(s=>s.payment_type==='credit')
    .reduce((sum,s)=>sum+getSaleBalance(s),0);
}
function getCustomerLifetime(customerId){
  if(!customerId)return 0;
  return customerSales(customerId).reduce((sum,s)=>sum+Number(s.total_amount_ngn||0),0);
}
// Birds, not naira. For a supply business the count is the relationship — a
// customer who took 2,000 pullets at a soft price matters more than the figure
// on the invoice suggests.
function getCustomerBirds(customerId){
  if(!customerId)return 0;
  return customerSales(customerId).reduce((sum,s)=>sum+Number(s.quantity||0),0);
}
function getCustomerOpenOrders(customerId){
  if(!customerId)return [];
  return DB.getOrders().filter(o=>o.customer_id===customerId&&isOrderOpen(o));
}
function getCustomerLastSaleDate(customerId){
  const dates=customerSales(customerId).map(s=>s.date).filter(Boolean).sort();
  return dates.length?dates[dates.length-1]:null;
}
function mergeCustomers(sourceId,targetId){
  if(!sourceId||!targetId||sourceId===targetId)return null;
  const source=DB.getCustomer(sourceId), target=DB.getCustomer(targetId);
  if(!source||!target)return null;
  const sourceSales=customerSales(sourceId);
  sourceSales.forEach(s=>{DB.updSale(s.id,{customer_id:targetId,buyer:target.name});});
  // Orders move too, or a merge leaves the order book pointing at a customer
  // record that no longer exists.
  const sourceOrders=DB.getOrders().filter(o=>o.customer_id===sourceId);
  sourceOrders.forEach(o=>{DB.updOrder(o.id,{customer_id:targetId,customer_name:target.name});});
  DB.delCustomer(sourceId);
  return {movedSales:sourceSales.length,movedOrders:sourceOrders.length,
          sourceName:source.name,targetName:target.name};
}

// ── Legacy buyers ───────────────────────────────────────────────────────
// Every sale recorded before this feature has a `buyer` string and no
// customer_id. Grouping them by normalised name turns that history into
// customers without anyone retyping it.
function getLegacySaleGroups(){
  const legacy=DB.getSales().filter(s=>s.buyer&&!s.customer_id&&normalizeCustomerName(s.buyer));
  const groups={};
  legacy.forEach(s=>{
    const norm=normalizeCustomerName(s.buyer);
    if(!groups[norm])groups[norm]={normalized:norm,sales:[],variantCounts:{}};
    groups[norm].sales.push(s);
    const variant=String(s.buyer).trim();
    groups[norm].variantCounts[variant]=(groups[norm].variantCounts[variant]||0)+1;
  });
  return Object.values(groups).map(g=>{
    const variants=Object.entries(g.variantCounts).sort((a,b)=>b[1]-a[1]);
    return {
      normalized:g.normalized,
      sales:g.sales,
      variants:variants.map(([v,c])=>({label:v,count:c})),
      canonical:variants[0]?variants[0][0]:g.normalized,
      existingCustomer:findCustomerByName(g.normalized),
      lifetime:g.sales.reduce((s,r)=>s+Number(r.total_amount_ngn||0),0),
      birds:g.sales.reduce((s,r)=>s+Number(r.quantity||0),0),
      outstanding:g.sales.filter(s=>s.payment_type==='credit')
        .reduce((s,r)=>s+getSaleBalance(r),0),
      saleCount:g.sales.length
    };
  }).sort((a,b)=>b.saleCount-a.saleCount);
}
function migrateLegacyGroup(normalized,overrides){
  const group=getLegacySaleGroups().find(g=>g.normalized===normalized);
  if(!group)return null;
  let customerId;
  if(group.existingCustomer){
    customerId=group.existingCustomer.id;
    const upd={};
    if(overrides?.phone&&!group.existingCustomer.phone)upd.phone=overrides.phone;
    if(overrides?.customer_type&&!group.existingCustomer.customer_type)upd.customer_type=overrides.customer_type;
    if(Object.keys(upd).length)DB.updCustomer(customerId,upd);
  } else {
    const name=overrides?.name?.trim()||group.canonical;
    const newCust={id:uid(),name,name_normalized:normalizeCustomerName(name),
      phone:overrides?.phone||'',location:'',
      customer_type:overrides?.customer_type||'Farmer',
      notes:'',created_at:DB.today()};
    DB.addCustomer(newCust);
    customerId=newCust.id;
  }
  group.sales.forEach(s=>{DB.updSale(s.id,{customer_id:customerId});});
  return {customerId,saleCount:group.sales.length};
}
// Shared by the sale form and the order form: resolve the name someone typed
// to a customer id, creating the record when it is genuinely new. Returns the
// id, or '' when nothing was typed.
function resolveCustomerFromInput(typedName,phoneElId,typeElId){
  const name=String(typedName||'').trim();
  if(!name)return '';
  const exact=findCustomerByName(name);
  if(exact)return exact.id;
  const phoneEl=phoneElId?document.getElementById(phoneElId):null;
  const typeEl=typeElId?document.getElementById(typeElId):null;
  const rec={id:uid(),name,name_normalized:normalizeCustomerName(name),
    phone:phoneEl?phoneEl.value.trim():'',
    customer_type:typeEl?typeEl.value:'Farmer',
    location:'',notes:'',created_at:DB.today()};
  DB.addCustomer(rec);
  return rec.id;
}

// ── Customers tab ───────────────────────────────────────────────────────
function renderCustomersTab(){
  const customers=DB.getCustomers().slice().sort((a,b)=>{
    const oa=getCustomerOutstanding(a.id),ob=getCustomerOutstanding(b.id);
    if(oa!==ob)return ob-oa;
    return getCustomerBirds(b.id)-getCustomerBirds(a.id)||(a.name||'').localeCompare(b.name||'');
  });
  const legacy=getLegacySaleGroups();
  const repeat=customers.filter(c=>customerSales(c.id).length>1).length;
  const totalBirds=customers.reduce((s,c)=>s+getCustomerBirds(c.id),0);
  return `
    ${legacy.length?`<div style="margin:12px 16px 0"><div class="alert-item alert-amber" style="cursor:pointer" onclick="openMigrationModal()">
      👥 ${legacy.length} buyer name${legacy.length===1?'':'s'} on older sales are not linked to a customer yet — tap to link
    </div></div>`:''}
    <div class="kpi-row-3" style="margin-top:12px">
      <div class="kpi"><div class="kpi-val">${customers.length}</div><div class="kpi-lbl">Customers</div></div>
      <div class="kpi"><div class="kpi-val" style="color:var(--g2)">${repeat}</div><div class="kpi-lbl">Repeat Buyers</div></div>
      <div class="kpi"><div class="kpi-val" style="color:var(--p2)">${totalBirds.toLocaleString()}</div><div class="kpi-lbl">Birds Supplied</div></div>
    </div>
    <div style="margin:4px 16px 8px"><button class="btn btn-primary" onclick="openCustomerForm()">+ Add Customer</button></div>
    <div style="margin:0 16px 8px;background:var(--p5);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--p1)">
      A customer record is created the first time you name a buyer on a sale or an order. Pre-register regulars here to keep the spelling consistent.
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      ${customers.length===0
        ?'<div class="empty" style="padding:24px"><p>No customers yet.</p><p style="font-size:12px;margin-top:6px">Record a sale or take an order and a customer record appears here.</p></div>'
        :customers.map(c=>{
          const owing=getCustomerOutstanding(c.id);
          const lifetime=getCustomerLifetime(c.id);
          const birds=getCustomerBirds(c.id);
          const salesCount=customerSales(c.id).length;
          const open=getCustomerOpenOrders(c.id);
          const openBirds=open.reduce((s,o)=>s+Number(o.quantity||0),0);
          const last=getCustomerLastSaleDate(c.id);
          return `<div class="list-item">
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14px">${c.name}${salesCount>1?' <span class="badge badge-green" style="font-size:10px">Repeat</span>':''}</div>
              <div style="font-size:12px;color:var(--gray);margin-top:2px">${c.customer_type||'—'}${c.location?' · '+c.location:''}${c.phone?' · ☎ '+c.phone:''}</div>
              <div style="font-size:11px;color:var(--gray);margin-top:3px">${birds.toLocaleString()} bird${birds===1?'':'s'} · ${salesCount} sale${salesCount===1?'':'s'} · ${fmtMoney(lifetime)}${last?' · last '+fmtDate(last):''}</div>
              ${open.length?`<div style="font-size:11px;color:var(--p2);font-weight:700;margin-top:3px">📋 ${open.length} open order${open.length===1?'':'s'} · ${openBirds.toLocaleString()} birds</div>`:''}
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:10px">
              ${owing>0
                ?`<div style="font-size:11px;color:var(--gray)">Owing</div><div style="font-weight:800;color:var(--amber)">${fmtMoney(owing)}</div>`
                :'<div style="font-size:11px;color:var(--g3);font-weight:600">No debt</div>'}
              <div style="display:flex;gap:4px;margin-top:6px;justify-content:flex-end;flex-wrap:wrap">
                <button class="btn btn-secondary btn-sm" onclick="openCustomerForm('${c.id}')">Edit</button>
                <button class="btn btn-amber btn-sm" onclick="openMergeCustomerModal('${c.id}')">Merge</button>
                <button class="btn btn-danger btn-sm" onclick="delCustomer('${c.id}')">✕</button>
              </div>
            </div>
          </div>`;
        }).join('')}
    </div>`;
}
function openCustomerForm(editId){
  const rec=editId?DB.getCustomer(editId):null;
  openModal(`<div class="modal-ttl">${rec?'Edit':'Add'} Customer <button class="modal-x" onclick="closeModal()">×</button></div>
    <div class="field"><label>Name <span style="color:var(--red)">*</span></label>
      <input type="text" id="cf_name" value="${(rec?.name||'').replace(/"/g,'&quot;')}" placeholder="e.g. Musa Poultry, Iseyin"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Phone</label>
        <input type="tel" id="cf_phone" value="${rec?.phone||''}" placeholder="08031234567"></div>
      <div class="field"><label>Type</label>
        <select id="cf_type">
          ${CUSTOMER_TYPES.map(t=>`<option value="${t}" ${rec?.customer_type===t?'selected':''}>${t}</option>`).join('')}
        </select></div>
    </div>
    <div class="field"><label>Town / State <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <input type="text" id="cf_location" value="${(rec?.location||'').replace(/"/g,'&quot;')}" placeholder="e.g. Iseyin, Oyo"></div>
    <div class="field"><label>Notes <span style="color:var(--gray);font-weight:400">optional</span></label>
      <textarea id="cf_notes" placeholder="e.g. collects himself, always pays on delivery">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveCustomer('${editId||''}')">Save</button>`);
}
function saveCustomer(editId){
  const name=document.getElementById('cf_name').value.trim();
  if(!name){toast('Name is required');return;}
  const existing=findCustomerByName(name);
  if(existing&&existing.id!==editId){toast('A customer with this name already exists');return;}
  const original=editId?DB.getCustomer(editId):null;
  const rec={
    id:editId||uid(),
    name,
    name_normalized:normalizeCustomerName(name),
    phone:document.getElementById('cf_phone').value.trim(),
    customer_type:document.getElementById('cf_type').value,
    location:document.getElementById('cf_location').value.trim(),
    notes:document.getElementById('cf_notes').value.trim(),
    created_at:original?.created_at||DB.today()
  };
  if(editId){DB.updCustomer(editId,rec);confirmSave('Customer updated');}
  else{DB.addCustomer(rec);confirmSave('Customer added');}
  closeModal();renderFinance();
}
function delCustomer(id){
  const c=DB.getCustomer(id);
  const salesCount=customerSales(id).length;
  const orderCount=DB.getOrders().filter(o=>o.customer_id===id).length;
  if(salesCount>0||orderCount>0){
    openModal(`<div class="modal-ttl">Cannot Delete <button class="modal-x" onclick="closeModal()">×</button></div>
      <p style="font-size:14px;color:var(--gray);margin-bottom:18px"><b>${c?.name||'This customer'}</b> has ${salesCount} sale${salesCount===1?'':'s'} and ${orderCount} order${orderCount===1?'':'s'} linked. Merge into another customer instead, or clear those records first.</p>
      <button class="btn btn-secondary" onclick="closeModal()">OK</button>`);
    return;
  }
  openModal(`<div class="modal-ttl">Delete Customer? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">Delete <b>${c?.name||''}</b>? Recoverable for ${TRASH_TTL_DAYS} days from Settings → Recently Deleted.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();DB.delCustomer('${id}');confirmSave('Customer deleted');renderFinance()">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}

function openMergeCustomerModal(sourceId){
  const source=DB.getCustomer(sourceId);
  if(!source){toast('Customer not found');return;}
  const sourceSaleCount=customerSales(sourceId).length;
  const sourceOrderCount=DB.getOrders().filter(o=>o.customer_id===sourceId).length;
  const others=DB.getCustomers().filter(c=>c.id!==sourceId).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const safeName=String(source.name).replace(/</g,'&lt;');
  const sourceOwing=getCustomerOutstanding(sourceId);
  if(others.length===0){
    openModal(`<div class="modal-ttl">Cannot Merge <button class="modal-x" onclick="closeModal()">×</button></div>
      <p style="font-size:14px;color:var(--gray);margin-bottom:18px">There are no other customers to merge <b>${safeName}</b> into. Create the target customer first, then try again.</p>
      <button class="btn btn-secondary" onclick="closeModal()">OK</button>`);
    return;
  }
  openModal(`<div class="modal-ttl">Merge ${safeName} into… <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="margin:-6px 0 12px;padding:10px 12px;background:var(--p5);border-radius:8px;font-size:13px">
      <div style="font-weight:700;color:var(--p2)">${safeName}</div>
      <div style="font-size:12px;color:var(--p1);margin-top:4px">${sourceSaleCount} sale${sourceSaleCount===1?'':'s'} · ${sourceOrderCount} order${sourceOrderCount===1?'':'s'} · ${getCustomerBirds(sourceId).toLocaleString()} birds${sourceOwing>0?` · <b style="color:var(--amber)">Owing ${fmtMoney(sourceOwing)}</b>`:''}</div>
      <div style="font-size:11px;color:var(--gray);margin-top:6px">Sales and orders are re-linked to the target, then this record is deleted. No amount is edited, so the 7-day lock is not in play.</div>
    </div>
    <div class="field"><label>Search customers</label>
      <input type="text" id="mc_search" placeholder="Type to filter…" oninput="filterMergeCustomerList()" autocomplete="off"></div>
    <div id="mc_list" style="max-height:340px;overflow-y:auto;border:1px solid #e0e0e0;border-radius:8px">
      ${others.map(c=>{
        const owing=getCustomerOutstanding(c.id);
        return `<div class="mc-row" data-name="${(c.name||'').toLowerCase()}" data-phone="${(c.phone||'').toLowerCase()}" style="padding:10px 12px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer" onclick="confirmMergeCustomer('${sourceId}','${c.id}')">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:13px">${c.name}</div>
            <div style="font-size:11px;color:var(--gray);margin-top:2px">${c.customer_type||'—'}${c.phone?' · ☎ '+c.phone:''} · ${getCustomerBirds(c.id).toLocaleString()} birds</div>
          </div>
          <div style="flex-shrink:0;text-align:right">
            ${owing>0?`<div style="font-size:11px;color:var(--amber);font-weight:700">Owing ${fmtMoney(owing)}</div>`:''}
            <div style="font-size:11px;color:var(--p2);font-weight:600;margin-top:2px">Pick →</div>
          </div>
        </div>`;
      }).join('')}
    </div>`);
}
function filterMergeCustomerList(){
  const q=(document.getElementById('mc_search')?.value||'').trim().toLowerCase();
  document.querySelectorAll('.mc-row').forEach(r=>{
    const n=r.dataset.name||'',p=r.dataset.phone||'';
    r.style.display=(!q||n.includes(q)||p.includes(q))?'flex':'none';
  });
}
function confirmMergeCustomer(sourceId,targetId){
  const source=DB.getCustomer(sourceId), target=DB.getCustomer(targetId);
  if(!source||!target){toast('Lookup failed');return;}
  const n=customerSales(sourceId).length;
  const o=DB.getOrders().filter(x=>x.customer_id===sourceId).length;
  const owing=getCustomerOutstanding(sourceId);
  openModal(`<div class="modal-ttl">Confirm Merge <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--p1);margin-bottom:14px">
      Re-link <b>${n}</b> sale${n===1?'':'s'} and <b>${o}</b> order${o===1?'':'s'} from <b>${source.name}</b> to <b>${target.name}</b>, then delete <b>${source.name}</b>?
    </p>
    ${owing>0?`<div style="background:var(--amberBg);border-left:3px solid var(--amber);padding:8px 10px;border-radius:0 6px 6px 0;font-size:12px;color:#7d4e00;margin-bottom:14px">
      <b>${fmtMoney(owing)}</b> in outstanding receivables moves to ${target.name}.
    </div>`:''}
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-primary" onclick="doMergeCustomer('${sourceId}','${targetId}')">Merge into ${target.name}</button>
      <button class="btn btn-secondary" onclick="openMergeCustomerModal('${sourceId}')">Back</button>
    </div>`);
}
function doMergeCustomer(sourceId,targetId){
  const r=mergeCustomers(sourceId,targetId);
  closeModal();
  if(r){confirmSave(`Merged ${r.sourceName} → ${r.targetName} · ${r.movedSales} sale${r.movedSales===1?'':'s'}, ${r.movedOrders} order${r.movedOrders===1?'':'s'} re-linked`);renderFinance();}
  else toast('Merge failed');
}

let MIG_SKIPPED=new Set();
function openMigrationModal(){
  const all=getLegacySaleGroups();
  const groups=all.filter(g=>!MIG_SKIPPED.has(g.normalized));
  if(all.length===0){
    openModal(`<div class="modal-ttl">All Done ✓ <button class="modal-x" onclick="closeModal()">×</button></div>
      <p style="font-size:14px;color:var(--gray);margin-bottom:18px">Every sale is linked to a customer record.</p>
      <button class="btn btn-primary" onclick="closeModal()">Close</button>`);
    return;
  }
  if(groups.length===0){
    openModal(`<div class="modal-ttl">All Reviewed <button class="modal-x" onclick="closeModal()">×</button></div>
      <p style="font-size:14px;color:var(--gray);margin-bottom:18px">All remaining names are skipped. Reset the skip list to review them again.</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-secondary" onclick="MIG_SKIPPED=new Set();openMigrationModal()">Reset Skipped</button>
        <button class="btn btn-secondary" onclick="closeModal()">Close</button></div>`);
    return;
  }
  const totalSales=groups.reduce((s,g)=>s+g.saleCount,0);
  const safeId=s=>String(s).replace(/[^a-z0-9]/gi,'_');
  const cards=groups.map(g=>{
    const idSlug=safeId(g.normalized);
    const ec=g.existingCustomer;
    const variantsStr=g.variants.map(v=>`"${v.label}"${v.count>1?` (${v.count}×)`:''}`).join(', ');
    return `<div style="border:1px solid #e0e0e0;border-radius:8px;padding:12px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;margin-bottom:6px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px">${ec?ec.name:g.canonical}</div>
          <div style="font-size:11px;color:var(--gray);margin-top:2px">Spellings: ${variantsStr}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;font-size:12px;color:var(--p1)">
          <div><b>${g.saleCount}</b> sale${g.saleCount===1?'':'s'}</div>
          <div style="color:var(--gray)">${g.birds.toLocaleString()} birds · ${fmtMoney(g.lifetime)}</div>
          ${g.outstanding>0?`<div style="color:var(--amber);font-weight:700">Owing ${fmtMoney(g.outstanding)}</div>`:''}
        </div>
      </div>
      ${ec?`
        <div style="background:var(--p5);border-left:3px solid var(--p3);padding:8px 10px;border-radius:0 6px 6px 0;font-size:12px;color:var(--p1);margin-bottom:8px">
          ✓ Customer record already exists${ec.customer_type?` (${ec.customer_type})`:''}${ec.phone?` · ☎ ${ec.phone}`:''}. Linking attaches these sales to it.
        </div>
      `:`
        <div class="field" style="margin-bottom:8px"><label style="font-size:11px">Canonical name</label>
          <input type="text" id="mig_name_${idSlug}" value="${g.canonical.replace(/"/g,'&quot;')}" style="font-size:14px"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div class="field" style="margin-bottom:0"><label style="font-size:11px">Phone</label>
            <input type="tel" id="mig_phone_${idSlug}" placeholder="optional" style="font-size:14px"></div>
          <div class="field" style="margin-bottom:0"><label style="font-size:11px">Type</label>
            <select id="mig_type_${idSlug}" style="font-size:14px">
              ${CUSTOMER_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('')}
            </select></div>
        </div>
      `}
      <div style="display:flex;gap:6px;justify-content:flex-end">
        <button class="btn btn-secondary btn-sm" onclick="skipMigrationGroup('${g.normalized.replace(/'/g,"\\'")}')">Skip</button>
        <button class="btn btn-primary btn-sm" onclick="migrateGroupFromModal('${g.normalized.replace(/'/g,"\\'")}','${idSlug}')">${ec?'Link':'Create &amp; Link'} ${g.saleCount}</button>
      </div>
    </div>`;
  }).join('');
  openModal(`<div class="modal-ttl">Link Buyers to Customers <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:13px;color:var(--gray);margin-bottom:12px">
      ${groups.length} name${groups.length===1?'':'s'} · ${totalSales} sale${totalSales===1?'':'s'} to link. Edit the details if needed, or auto-link everything with defaults.
    </p>
    ${cards}
    <button class="btn btn-amber" style="width:100%;margin-top:8px" onclick="autoMigrateAll()">Auto-Link All Remaining (${groups.length})</button>`);
}
function migrateGroupFromModal(normalized,idSlug){
  const overrides={};
  const nameEl=document.getElementById('mig_name_'+idSlug);
  const phoneEl=document.getElementById('mig_phone_'+idSlug);
  const typeEl=document.getElementById('mig_type_'+idSlug);
  if(nameEl)overrides.name=nameEl.value.trim();
  if(phoneEl)overrides.phone=phoneEl.value.trim();
  if(typeEl)overrides.customer_type=typeEl.value;
  const r=migrateLegacyGroup(normalized,overrides);
  if(r){confirmSave(`Linked ${r.saleCount} sale${r.saleCount===1?'':'s'}`);MIG_SKIPPED.delete(normalized);openMigrationModal();}
  else toast('Link failed — group not found');
}
function skipMigrationGroup(normalized){MIG_SKIPPED.add(normalized);openMigrationModal();}
function autoMigrateAll(){
  const groups=getLegacySaleGroups().filter(g=>!MIG_SKIPPED.has(g.normalized));
  if(groups.length===0){toast('Nothing to link');return;}
  openModal(`<div class="modal-ttl">Auto-Link ${groups.length}? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">
      Creates a customer for each remaining name, using the most common spelling and "Farmer" as the type. Phone numbers stay blank — fill them in later from the Customers tab.
    </p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-primary" onclick="doAutoMigrateAll()">Link All</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
function doAutoMigrateAll(){
  const groups=getLegacySaleGroups().filter(g=>!MIG_SKIPPED.has(g.normalized));
  let linked=0,saleCount=0;
  groups.forEach(g=>{const r=migrateLegacyGroup(g.normalized,{});if(r){linked++;saleCount+=r.saleCount;}});
  closeModal();
  confirmSave(`Linked ${linked} customer${linked===1?'':'s'} · ${saleCount} sale${saleCount===1?'':'s'}`);
  renderFinance();
}
