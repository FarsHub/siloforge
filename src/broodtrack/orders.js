// ═══════════════════════════════════════════════
// ORDER BOOK
// ═══════════════════════════════════════════════
// A pullet order is placed months before the bird exists. That is the whole
// difference between this business and selling eggs, and it is why a sale
// record on its own is not enough: by the time there is a sale to record, the
// decision that mattered — how many chicks to set, and when — was taken twenty
// weeks earlier.
//
// So an order is a promise with a delivery window, and the book is the demand
// signal. Two consequences are built in deliberately:
//
//   • A DECLINED order is kept, not deleted. Demand you turned away is the
//     only evidence that you are undersupplied, and it is invisible everywhere
//     else — a sale that never happened leaves no trace. This is what answers
//     "should I build the second grow-out compartment".
//   • Confirmed orders are matched against what the batches can actually
//     deliver, so the answer to "can I take this?" is on screen before the
//     promise is made rather than discovered at handover.
//
// Deposits live in the same payment log as everything else, carrying an
// order_id instead of a sale_id. When the order is fulfilled the deposit is
// re-pointed at the sale it paid for, so money is never counted twice and
// never disappears.
const ORDER_STATUSES=[
  {key:'enquiry',  label:'Enquiry',   badge:'badge-gray',   hint:'Asked about, nothing promised'},
  {key:'confirmed',label:'Confirmed', badge:'badge-purple', hint:'Promised — counts against capacity'},
  {key:'fulfilled',label:'Fulfilled', badge:'badge-green',  hint:'Delivered and invoiced'},
  {key:'declined', label:'Declined',  badge:'badge-amber',  hint:'Could not supply — kept as demand evidence'},
  {key:'cancelled',label:'Cancelled', badge:'badge-red',    hint:'Buyer withdrew'},
];
function orderStatusMeta(key){return ORDER_STATUSES.find(s=>s.key===key)||ORDER_STATUSES[0];}
// Open = still live in the book. Only `confirmed` draws on capacity; an
// enquiry is shown but never counted, or the pipeline would fill with maybes.
function isOrderOpen(o){return o&&(o.status==='enquiry'||o.status==='confirmed');}
function isOrderCommitted(o){return o&&o.status==='confirmed';}

const ORDER_REF_PREFIX='BTO';
function makeOrderRef(order,salt){
  const d=String(order.date||DB.today()).replace(/-/g,'').slice(2);
  return `${ORDER_REF_PREFIX}-${d}-${_docRefHash(order.id,'ord'+(salt||0))}`;
}
function nextOrderRef(order){
  const taken=new Set(DB.getOrders().map(o=>o.ref).filter(Boolean));
  let ref=makeOrderRef(order,0),n=0;
  while(taken.has(ref)&&n<50)ref=makeOrderRef(order,++n);
  return ref;
}

// ── Deposits ────────────────────────────────────────────────────────────
function orderDeposits(orderId){
  return DB.paymentsForOrder(orderId).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}
function orderDepositTotal(orderId){
  return orderDeposits(orderId).reduce((s,p)=>s+Number(p.amount_ngn||0),0);
}
function orderValue(o){
  return Number(o?.quantity||0)*Number(o?.price_per_bird_ngn||0);
}
function orderBalance(o){
  const v=orderValue(o);
  return v>0?Math.max(0,v-orderDepositTotal(o.id)):0;
}

// ── Supply pipeline ─────────────────────────────────────────────────────
// What each live batch can actually deliver, and when.
//
// The projection uses the batch's own realised mortality rather than a rule of
// thumb: a batch losing birds now will keep losing them, and a batch that has
// lost none should not be discounted for the sake of looking careful. It is
// floored at 80% of today's count so an early-days spike — the first week is
// always the worst — cannot project a batch into nothing.
const PIPELINE_MIN_SURVIVAL=0.80;
function getBatchReadyDate(b){
  if(!b?.arrival_date)return null;
  const weeks=Number(b.target_sale_age_weeks||18);
  return addDays(b.arrival_date,Math.round(weeks*7));
}
function getBatchPipeline(b){
  const today=DB.today();
  const readyDate=getBatchReadyDate(b);
  const currentBirds=getBatchBirdCount(b);
  const ageDays=batchAgeInDays(b)||0;
  const daysLeft=readyDate?Math.max(0,daysBetween(today,readyDate)):0;
  const deaths=DB.getDaily().filter(r=>r.batch_id===b.id).reduce((s,r)=>s+(r.deaths||0),0);
  // Per bird per day, over the days actually lived. Guarded so a batch logged
  // on its arrival day does not divide by zero.
  const rate=(ageDays>0&&b.doc_count>0)?deaths/(b.doc_count*ageDays):0;
  const projLoss=Math.round(currentBirds*rate*daysLeft);
  const projectedBirds=Math.max(Math.round(currentBirds*PIPELINE_MIN_SURVIVAL),currentBirds-projLoss);
  const sold=DB.getSales().filter(s=>s.batch_id===b.id).reduce((s,e)=>s+Number(e.quantity||0),0);
  const allocated=DB.getOrders()
    .filter(o=>o.batch_id===b.id&&isOrderCommitted(o))
    .reduce((s,o)=>s+Number(o.quantity||0),0);
  const sellable=Math.max(0,projectedBirds-sold);
  return {batch:b,readyDate,daysLeft,currentBirds,projectedBirds,projLoss,
          sold,allocated,sellable,uncommitted:sellable-allocated,
          ready:!!readyDate&&readyDate<=today};
}
function getSupplyPipeline(){
  return DB.getBatches().filter(b=>b.status==='Active')
    .map(getBatchPipeline)
    .sort((a,b)=>String(a.readyDate||'9999').localeCompare(String(b.readyDate||'9999')));
}
// Total birds promised but not yet tied to a batch — the part of the book that
// has nothing behind it.
function getUnallocatedDemand(){
  return DB.getOrders()
    .filter(o=>isOrderCommitted(o)&&!o.batch_id)
    .reduce((s,o)=>s+Number(o.quantity||0),0);
}
function monthLabel(ym){
  return new Date(ym+'-01T00:00:00').toLocaleDateString('en-GB',{month:'short',year:'numeric'});
}
// Confirmed demand and projected supply, bucketed by the month the birds are
// wanted. A batch lands entirely in the month it is ready — splitting it would
// imply a precision the projection does not have.
function getDemandVsSupply(){
  const buckets={};
  const touch=ym=>(buckets[ym]=buckets[ym]||{ym,demand:0,supply:0,orders:[],batches:[]});
  DB.getOrders().filter(isOrderCommitted).forEach(o=>{
    const ym=String(o.needed_from||o.date||DB.today()).slice(0,7);
    const bk=touch(ym);
    bk.demand+=Number(o.quantity||0);
    bk.orders.push(o);
  });
  getSupplyPipeline().forEach(p=>{
    if(!p.readyDate)return;
    const bk=touch(p.readyDate.slice(0,7));
    bk.supply+=p.sellable;
    bk.batches.push(p);
  });
  return Object.values(buckets)
    .sort((a,b)=>a.ym.localeCompare(b.ym))
    .map(b=>({...b,gap:b.supply-b.demand}));
}
// Demand that walked away. Counted over a rolling window because "we turned
// away 4,000 birds last year" is the sentence that justifies more cages.
function getTurnedAwayStats(days=365){
  const from=addDays(DB.today(),-days);
  const declined=DB.getOrders().filter(o=>o.status==='declined'&&String(o.date||'')>=from);
  return {
    count:declined.length,
    birds:declined.reduce((s,o)=>s+Number(o.quantity||0),0),
    value:declined.reduce((s,o)=>s+orderValue(o),0),
    orders:declined.sort((a,b)=>String(b.date).localeCompare(String(a.date)))
  };
}

// ── Orders tab ──────────────────────────────────────────────────────────
let ORDER_FILTER='open';
function setOrderFilter(f){ORDER_FILTER=f;renderFinance();}
function renderOrdersTab(){
  const all=DB.getOrders();
  const open=all.filter(isOrderOpen);
  const committedBirds=all.filter(isOrderCommitted).reduce((s,o)=>s+Number(o.quantity||0),0);
  const deposits=all.filter(isOrderOpen).reduce((s,o)=>s+orderDepositTotal(o.id),0);
  const turned=getTurnedAwayStats();
  const pipeline=getSupplyPipeline();
  const dvs=getDemandVsSupply();
  const unalloc=getUnallocatedDemand();

  const shown=all.filter(o=>
    ORDER_FILTER==='all'?true:
    ORDER_FILTER==='open'?isOrderOpen(o):
    ORDER_FILTER==='declined'?o.status==='declined':
    o.status===ORDER_FILTER
  ).sort((a,b)=>{
    // Soonest wanted first while open; newest first once they are history.
    if(isOrderOpen(a)&&isOrderOpen(b))
      return String(a.needed_from||'9999').localeCompare(String(b.needed_from||'9999'));
    return String(b.date||'').localeCompare(String(a.date||''));
  });

  const fbtn=(k,lbl,n)=>`<button class="inner-tab ${ORDER_FILTER===k?'active':''}" onclick="setOrderFilter('${k}')">${lbl}${n!=null?` (${n})`:''}</button>`;

  // ── Demand vs supply ──
  const dvsHtml=dvs.length===0?'':`
    <div class="sec-hdr">Demand vs Supply
      <span style="font-size:11px;color:var(--gray);text-transform:none;font-weight:500">Confirmed orders against what the batches can deliver</span>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      ${dvs.map(b=>{
        const short=b.gap<0;
        const col=short?'var(--red)':b.demand===0?'var(--gray)':'var(--g2)';
        const max=Math.max(b.demand,b.supply,1);
        return `<div class="list-item" style="flex-direction:column;align-items:stretch;gap:6px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700;font-size:14px">${monthLabel(b.ym)}</span>
            <span style="font-weight:800;font-size:13px;color:${col}">
              ${short?`Short ${Math.abs(b.gap).toLocaleString()}`:b.demand===0?'No orders':`Spare ${b.gap.toLocaleString()}`}
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:10px;color:var(--gray);width:44px;flex-shrink:0">Wanted</span>
            <div style="flex:1;height:8px;background:#eee;border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${(b.demand/max*100).toFixed(1)}%;background:var(--p3)"></div></div>
            <span style="font-size:11px;font-weight:700;width:52px;text-align:right">${b.demand.toLocaleString()}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:10px;color:var(--gray);width:44px;flex-shrink:0">Ready</span>
            <div style="flex:1;height:8px;background:#eee;border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${(b.supply/max*100).toFixed(1)}%;background:var(--g3)"></div></div>
            <span style="font-size:11px;font-weight:700;width:52px;text-align:right">${b.supply.toLocaleString()}</span>
          </div>
          ${b.batches.length?`<div style="font-size:11px;color:var(--gray)">${b.batches.map(p=>p.batch.name).join(' · ')}</div>`:
            b.demand>0?`<div style="font-size:11px;color:var(--red);font-weight:700">No batch reaches selling age this month</div>`:''}
        </div>`;
      }).join('')}
    </div>
    <div style="margin:8px 16px;font-size:11px;color:var(--gray);line-height:1.6">
      Ready counts each live batch at its target sale age, projected forward using that batch's own mortality so far. Enquiries are excluded — only confirmed orders are counted as demand.
    </div>`;

  // ── Batch pipeline ──
  const pipeHtml=pipeline.length===0?'':`
    <div class="sec-hdr">Batch Pipeline</div>
    <div class="card" style="padding:0;overflow:hidden">
      ${pipeline.map(p=>{
        const over=p.uncommitted<0;
        return `<div class="list-item">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px">${p.batch.name}</div>
            <div style="font-size:12px;color:var(--gray);margin-top:2px">${p.batch.breed} · ${p.readyDate?(p.ready?'ready now':`ready ${fmtDate(p.readyDate)} · ${p.daysLeft}d`):'no target age set'}</div>
            <div style="font-size:11px;color:var(--gray);margin-top:3px">
              ${p.currentBirds.toLocaleString()} now${p.projLoss>0?` → ${p.projectedBirds.toLocaleString()} projected`:''}${p.sold>0?` · ${p.sold.toLocaleString()} sold`:''} · ${p.allocated.toLocaleString()} allocated
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:10px">
            <div style="font-size:18px;font-weight:800;color:${over?'var(--red)':'var(--g2)'}">${over?'−':''}${Math.abs(p.uncommitted).toLocaleString()}</div>
            <div style="font-size:10px;color:var(--gray);text-transform:uppercase;font-weight:700">${over?'oversold':'unsold'}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;

  const rows=shown.map(o=>{
    const meta=orderStatusMeta(o.status);
    const cust=o.customer_id?DB.getCustomer(o.customer_id):null;
    const name=cust?.name||o.customer_name||'Unknown buyer';
    const dep=orderDepositTotal(o.id);
    const val=orderValue(o);
    const batch=o.batch_id?DB.getBatches().find(b=>b.id===o.batch_id):null;
    const window=o.needed_from
      ?(o.needed_to&&o.needed_to!==o.needed_from
          ?`${fmtDate(o.needed_from)} → ${fmtDate(o.needed_to)}`
          :fmtDate(o.needed_from))
      :'No date agreed';
    const late=isOrderOpen(o)&&o.needed_to&&o.needed_to<DB.today();
    return `<div class="list-item" style="flex-direction:column;align-items:stretch;gap:8px">
      <div style="display:flex;justify-content:space-between;gap:10px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px">${name}</div>
          <div style="font-size:12px;color:var(--gray);margin-top:2px">
            ${Number(o.quantity||0).toLocaleString()} ${o.breed||getBirdTypeLabel(o.bird_type||'pullet').toLowerCase()}${o.age_weeks_at_delivery?` @ ${o.age_weeks_at_delivery} wks`:''}
          </div>
          <div style="font-size:12px;color:${late?'var(--red)':'var(--gray)'};margin-top:2px;font-weight:${late?'700':'400'}">
            📅 ${window}${late?' — window passed':''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:5px;flex-wrap:wrap">
            <span class="badge ${meta.badge}">${meta.label}</span>
            ${batch?`<span class="badge badge-gray" style="font-size:10px">${batch.name}</span>`:
              isOrderCommitted(o)?`<span class="badge badge-amber" style="font-size:10px">No batch allocated</span>`:''}
            <span style="font-size:10px;color:var(--gray)">${o.ref||''}</span>
          </div>
          ${o.decline_reason?`<div style="font-size:11px;color:#7d4e00;font-style:italic;margin-top:4px">Declined: "${String(o.decline_reason).replace(/</g,'&lt;')}"</div>`:''}
          ${o.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-top:4px">"${o.notes}"</div>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${val>0?`<div style="font-weight:800;color:var(--p2)">${fmtMoney(val)}</div>
            <div style="font-size:11px;color:var(--gray)">${fmtMoney(o.price_per_bird_ngn)}/bird</div>`:
            '<div style="font-size:11px;color:var(--gray)">No price yet</div>'}
          ${dep>0?`<div style="font-size:11px;color:var(--g3);font-weight:700;margin-top:3px">Deposit ${fmtMoney(dep)}</div>`:''}
        </div>
      </div>
      ${dep>0?`<div style="background:var(--p5);border-radius:8px;padding:8px 10px;font-size:12px">
        <div style="font-size:11px;color:var(--p1);font-weight:600;margin-bottom:4px">Deposits (${orderDeposits(o.id).length})</div>
        ${orderDeposits(o.id).map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #eaeaea">
          <span style="color:var(--gray)">${fmtDate(p.date)} · ${p.method}${p.notes?' · '+p.notes:''}</span>
          <span style="display:flex;align-items:center;gap:6px">
            <b style="color:var(--g3)">${fmtMoney(p.amount_ngn)}</b>
            ${isLocked(p.date)?'':`<button class="btn btn-secondary btn-sm" style="padding:2px 6px;font-size:11px" onclick="openDepositForm('${o.id}','${p.id}')">✎</button>
            <button class="btn btn-danger btn-sm" style="padding:2px 6px;font-size:11px" onclick="delDeposit('${o.id}','${p.id}')">✕</button>`}
          </span></div>`).join('')}
        ${val>0?`<div style="display:flex;justify-content:space-between;margin-top:5px;font-weight:700;color:var(--p1)">
          <span>Balance on delivery</span><span>${fmtMoney(orderBalance(o))}</span></div>`:''}
      </div>`:''}
      <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
        ${isOrderOpen(o)?`<button class="btn btn-secondary btn-sm" onclick="openDepositForm('${o.id}')">+ Deposit</button>`:''}
        ${o.status==='enquiry'?`<button class="btn btn-primary btn-sm" onclick="setOrderStatus('${o.id}','confirmed')">Confirm</button>`:''}
        ${isOrderCommitted(o)?`<button class="btn btn-primary btn-sm" onclick="fulfilOrder('${o.id}')">Fulfil → Sale</button>`:''}
        ${isOrderOpen(o)?`<button class="btn btn-amber btn-sm" onclick="openDeclineOrder('${o.id}')">Decline</button>`:''}
        <button class="btn btn-secondary btn-sm" onclick="openOrderForm('${o.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDelOrder('${o.id}')">✕</button>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="kpi-row-3" style="margin-top:12px">
      <div class="kpi"><div class="kpi-val" style="color:var(--p2)">${committedBirds.toLocaleString()}</div><div class="kpi-lbl">Birds Promised</div></div>
      <div class="kpi"><div class="kpi-val" style="color:var(--g2)">${fmtMoney(deposits)}</div><div class="kpi-lbl">Deposits Held</div></div>
      <div class="kpi" style="${turned.birds>0?'border:2px solid var(--amber)':''}">
        <div class="kpi-val" style="color:${turned.birds>0?'var(--amber)':'var(--gray)'}">${turned.birds.toLocaleString()}</div>
        <div class="kpi-lbl">Turned Away (12m)</div></div>
    </div>
    ${turned.birds>0?`<div style="margin:0 16px 8px" onclick="setOrderFilter('declined')">
      <div class="alert-item alert-amber" style="cursor:pointer">
        📈 ${turned.birds.toLocaleString()} birds worth about ${fmtMoney(turned.value)} turned away in the last 12 months across ${turned.count} order${turned.count===1?'':'s'} — that is demand you could have supplied with more capacity
      </div></div>`:''}
    ${unalloc>0?`<div style="margin:0 16px 8px"><div class="alert-item alert-red">
      ⚠ ${unalloc.toLocaleString()} promised bird${unalloc===1?'':'s'} are not allocated to any batch
    </div></div>`:''}
    <div style="margin:4px 16px 8px"><button class="btn btn-primary" onclick="openOrderForm()">+ New Order</button></div>
    ${dvsHtml}
    ${pipeHtml}
    <div class="sec-hdr">Orders</div>
    <div class="inner-tabs" style="background:var(--light)">
      ${fbtn('open','Open',open.length)}${fbtn('confirmed','Confirmed')}${fbtn('fulfilled','Fulfilled')}${fbtn('declined','Declined',turned.count||undefined)}${fbtn('all','All',all.length)}
    </div>
    <div class="card" style="padding:0;overflow:hidden;margin-top:10px">
      ${rows||`<div class="empty" style="padding:28px 24px">
        <h3>Nothing here yet</h3>
        <p>Take an order the moment a buyer asks — even one you cannot fill. Declined orders are kept as the record of demand you could not meet.</p>
      </div>`}
    </div>
    <div style="height:12px"></div>`;
}

// ── Order form ──────────────────────────────────────────────────────────
function openOrderForm(editId){
  const today=DB.today();
  const o=editId?DB.getOrder(editId):null;
  const cust=o?.customer_id?DB.getCustomer(o.customer_id):null;
  const bt=o?.bird_type||'pullet';
  const batches=DB.getBatches().filter(b=>b.status==='Active'||b.id===o?.batch_id);
  openModal(`<div class="modal-ttl">${o?'Edit':'New'} Order <button class="modal-x" onclick="closeModal()">×</button></div>
    <div class="field"><label>Date taken</label>
      <input type="date" id="of_date" value="${o?.date||today}" max="${today}"></div>
    <div class="field">
      <label>Customer <span style="color:var(--red)">*</span></label>
      <input type="hidden" id="of_cust_id" value="${cust?.id||''}">
      <input type="text" id="of_cust" value="${(cust?.name||o?.customer_name||'').replace(/"/g,'&quot;')}" placeholder="Start typing a name…" oninput="onOrderCustomerChange()" autocomplete="off">
      <div id="of_cust_panel"></div>
    </div>
    <div class="field"><label>Bird type</label>
      <select id="of_type" onchange="onOrderTypeChange()">
        ${['pullet','broiler','noiler'].map(t=>`<option value="${t}" ${bt===t?'selected':''}>${getBirdTypeLabel(t)}</option>`).join('')}
      </select></div>
    <div class="field"><label>Breed <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <select id="of_breed"></select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Quantity <span style="color:var(--red)">*</span></label>
        <input type="number" id="of_qty" value="${o?.quantity||''}" min="1" step="1" inputmode="numeric" placeholder="e.g. 500" oninput="updateOrderCapacityPanel('${editId||''}')"></div>
      <div class="field"><label>Age wanted (wks)</label>
        <input type="number" id="of_age" value="${o?.age_weeks_at_delivery||18}" min="1" max="24"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Wanted from</label>
        <input type="date" id="of_from" value="${o?.needed_from||''}" onchange="updateOrderCapacityPanel('${editId||''}')"></div>
      <div class="field"><label>Wanted by</label>
        <input type="date" id="of_to" value="${o?.needed_to||''}"></div>
    </div>
    <div class="field"><label>Agreed price per bird (₦) <span style="color:var(--gray);font-weight:400">— optional until settled</span></label>
      <input type="number" id="of_price" value="${o?.price_per_bird_ngn||''}" min="0" step="50" inputmode="numeric" placeholder="e.g. 2500" oninput="updateOrderValueHint()"></div>
    <div id="of_value_hint" style="margin:-6px 0 12px;font-size:13px;color:var(--gray)"></div>
    <div class="field"><label>Allocate to batch <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <select id="of_batch" onchange="updateOrderCapacityPanel('${editId||''}')">
        <option value="">Not allocated yet</option>
        ${batches.map(b=>`<option value="${b.id}" ${o?.batch_id===b.id?'selected':''}>${b.name} — ${b.breed}</option>`).join('')}
      </select></div>
    <div class="field"><label>Status</label>
      <select id="of_status">
        ${ORDER_STATUSES.map(s=>`<option value="${s.key}" ${(o?.status||'enquiry')===s.key?'selected':''}>${s.label} — ${s.hint}</option>`).join('')}
      </select></div>
    <div id="of_capacity"></div>
    <div class="field"><label>Notes</label>
      <textarea id="of_notes" placeholder="e.g. wants Lohmann specifically, will collect">${o?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveOrder('${editId||''}')">Save Order</button>`);
  onOrderTypeChange(o?.breed||'');
  onOrderCustomerChange();
  updateOrderValueHint();
  updateOrderCapacityPanel(editId||'');
}
function onOrderTypeChange(preselect){
  const t=document.getElementById('of_type')?.value||'pullet';
  const sel=document.getElementById('of_breed');
  if(!sel)return;
  const current=preselect!==undefined?preselect:sel.value;
  sel.innerHTML=['',...(BREEDS_BY_TYPE[t]||[])]
    .map(b=>`<option value="${b}" ${b===current?'selected':''}>${b||'— any —'}</option>`).join('');
}
function onOrderCustomerChange(){
  const inputEl=document.getElementById('of_cust');
  const panelEl=document.getElementById('of_cust_panel');
  const idEl=document.getElementById('of_cust_id');
  if(!inputEl||!panelEl||!idEl)return;
  const typed=inputEl.value;
  if(!normalizeCustomerName(typed)){panelEl.innerHTML='';idEl.value='';return;}
  const exact=findCustomerByName(typed);
  if(exact){
    idEl.value=exact.id;
    const owing=getCustomerOutstanding(exact.id);
    panelEl.innerHTML=`<div style="margin-top:8px;padding:10px;background:var(--p5);border-radius:8px;border-left:3px solid var(--p3)">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px">
        <div><div style="font-weight:700;color:var(--p2)">✓ ${exact.name}</div>
          <div style="color:var(--p1);margin-top:2px">${exact.customer_type||'—'}${exact.phone?' · ☎ '+exact.phone:''} · ${getCustomerBirds(exact.id).toLocaleString()} birds to date</div></div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--gray)">Currently owes</div>
          <div style="font-weight:800;color:${owing>0?'var(--amber)':'var(--g3)'}">${fmtMoney(owing)}</div></div>
      </div></div>`;
    return;
  }
  idEl.value='';
  const fuzzy=fuzzyCustomerMatches(typed);
  let html='';
  if(fuzzy.length){
    html+=`<div style="margin-top:8px;padding:10px;background:var(--p5);border-radius:8px;border-left:3px solid var(--amber)">
      <div style="font-size:12px;color:var(--p1);font-weight:600;margin-bottom:6px">Did you mean?</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${fuzzy.map(c=>`<button type="button" class="btn btn-secondary btn-sm" onclick="pickOrderCustomer('${c.id}')">${c.name}${c.customer_type?' · '+c.customer_type:''}</button>`).join('')}
      </div></div>`;
  }
  html+=`<div style="margin-top:8px;padding:10px;border:1px dashed var(--p3);border-radius:8px">
    <div style="font-size:12px;color:var(--p1);font-weight:600;margin-bottom:6px">+ New customer: "${typed.trim().replace(/</g,'&lt;')}"</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <input type="tel" id="of_new_phone" placeholder="Phone (optional)" autocomplete="off" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px">
      <select id="of_new_type" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px">
        ${CUSTOMER_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('')}
      </select>
    </div>
    <div style="font-size:11px;color:var(--gray);margin-top:6px">The customer record is created when you save.</div>
  </div>`;
  panelEl.innerHTML=html;
}
function pickOrderCustomer(id){
  const c=DB.getCustomer(id);
  if(!c)return;
  document.getElementById('of_cust').value=c.name;
  document.getElementById('of_cust_id').value=c.id;
  onOrderCustomerChange();
}
function updateOrderValueHint(){
  const el=document.getElementById('of_value_hint'); if(!el)return;
  const q=parseInt(document.getElementById('of_qty')?.value,10)||0;
  const p=parseFloat(document.getElementById('of_price')?.value)||0;
  el.innerHTML=(q>0&&p>0)?`Order value <b>${fmtMoney(q*p)}</b>`:'';
}
// The answer to "can I take this?" before the promise is made.
function updateOrderCapacityPanel(editId){
  const panel=document.getElementById('of_capacity'); if(!panel)return;
  const qty=parseInt(document.getElementById('of_qty')?.value,10)||0;
  const batchId=document.getElementById('of_batch')?.value||'';
  if(qty<=0){panel.innerHTML='';return;}
  const existing=editId?DB.getOrder(editId):null;
  // An order being edited already sits in the allocation, so take it back out
  // before asking whether the new quantity fits.
  const selfQty=(existing&&isOrderCommitted(existing)&&existing.batch_id===batchId)?Number(existing.quantity||0):0;
  let body='';
  if(batchId){
    const b=DB.getBatches().find(x=>x.id===batchId);
    if(b){
      const p=getBatchPipeline(b);
      const free=p.uncommitted+selfQty;
      const over=qty>free;
      body=`<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <span>${b.name} ready</span><b>${p.readyDate?fmtDate(p.readyDate):'—'}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <span>Projected sellable</span><b>${p.sellable.toLocaleString()} birds</b></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
          <span>Unsold after other orders</span>
          <b style="color:${free<=0?'var(--red)':'var(--g3)'}">${free.toLocaleString()} birds</b></div>
        <div style="font-size:12px;font-weight:700;color:${over?'var(--red)':'var(--g2)'}">
          ${over?`⚠ This order is ${(qty-free).toLocaleString()} birds more than the batch will have`
                :`✓ Fits — ${(free-qty).toLocaleString()} left over`}</div>`;
    }
  } else {
    const wanted=document.getElementById('of_from')?.value||'';
    const ym=wanted?wanted.slice(0,7):null;
    const bucket=ym?getDemandVsSupply().find(b=>b.ym===ym):null;
    const supply=bucket?bucket.supply:0;
    const demand=(bucket?bucket.demand:0)-selfQty;
    const free=supply-demand;
    body=ym
      ?`<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <span>Ready in ${monthLabel(ym)}</span><b>${supply.toLocaleString()} birds</b></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
          <span>Already promised that month</span><b>${demand.toLocaleString()} birds</b></div>
        <div style="font-size:12px;font-weight:700;color:${qty>free?'var(--red)':'var(--g2)'}">
          ${qty>free?`⚠ ${(qty-free).toLocaleString()} birds short that month — allocate a batch or set a later date`
                    :`✓ Fits — ${(free-qty).toLocaleString()} spare that month`}</div>`
      :`<div style="font-size:12px;color:var(--gray)">Set a "wanted from" date to check this against the pipeline.</div>`;
  }
  panel.innerHTML=`<div style="margin:0 0 12px;padding:10px 12px;background:var(--p5);border-radius:8px;border-left:3px solid var(--p3)">
    <div style="font-size:11px;font-weight:700;color:var(--p1);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Capacity check</div>
    ${body}</div>`;
}
function saveOrder(editId){
  const typed=(document.getElementById('of_cust')?.value||'').trim();
  if(!typed){toast('Enter the customer name');return;}
  const qty=parseInt(document.getElementById('of_qty').value,10)||0;
  if(!Number.isInteger(qty)||qty<1){toast('Quantity must be a whole number of birds');return;}
  const from=document.getElementById('of_from').value||null;
  const to=document.getElementById('of_to').value||null;
  if(from&&to&&to<from){toast('"Wanted by" cannot be before "wanted from"');return;}
  let customerId=document.getElementById('of_cust_id')?.value||'';
  if(!customerId)customerId=resolveCustomerFromInput(typed,'of_new_phone','of_new_type');
  const cust=customerId?DB.getCustomer(customerId):null;
  const existing=editId?DB.getOrder(editId):null;
  const rec={
    id:editId||uid(),
    date:document.getElementById('of_date').value||DB.today(),
    customer_id:customerId||null,
    customer_name:cust?.name||typed,
    bird_type:document.getElementById('of_type').value,
    breed:document.getElementById('of_breed').value||'',
    quantity:qty,
    age_weeks_at_delivery:parseInt(document.getElementById('of_age').value,10)||null,
    needed_from:from,
    needed_to:to,
    price_per_bird_ngn:parseFloat(document.getElementById('of_price').value)||0,
    batch_id:document.getElementById('of_batch').value||null,
    status:document.getElementById('of_status').value||'enquiry',
    decline_reason:existing?.decline_reason||null,
    sale_id:existing?.sale_id||null,
    notes:document.getElementById('of_notes').value.trim()
  };
  // The reference is minted once and carried forward, so a number quoted to a
  // buyer over the phone still finds the order after it has been edited.
  rec.ref=existing?.ref||nextOrderRef(rec);
  if(editId)DB.updOrder(editId,rec); else DB.addOrder(rec);
  closeModal();
  confirmSave(`Order ${rec.ref} saved`);
  renderFinance();renderHome();
}
function setOrderStatus(id,status){
  const o=DB.getOrder(id); if(!o)return;
  DB.updOrder(id,{status});
  confirmSave(`Order ${orderStatusMeta(status).label.toLowerCase()}`);
  renderFinance();renderHome();
}
function openDeclineOrder(id){
  const o=DB.getOrder(id); if(!o)return;
  openModal(`<div class="modal-ttl">Decline this order <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="margin:-6px 0 12px;padding:10px 12px;background:var(--p5);border-radius:8px;font-size:13px">
      <div style="font-weight:700;color:var(--p1)">${o.customer_name||'Buyer'} · ${Number(o.quantity||0).toLocaleString()} birds</div>
      <div style="font-size:12px;color:var(--gray);margin-top:4px">
        The order is kept, not deleted. Demand you could not meet is the only record that you are undersupplied — it is what a capacity decision gets argued from later.
      </div>
    </div>
    <div class="field"><label>Why could this not be filled?</label>
      <select id="dq_reason">
        <option value="No birds available">No birds available at that date</option>
        <option value="Wrong age at their date">Could not hit the age they wanted</option>
        <option value="Breed not available">Breed not available</option>
        <option value="Price not agreed">Price could not be agreed</option>
        <option value="Buyer too far">Buyer too far / logistics</option>
        <option value="Other">Other</option>
      </select></div>
    <div class="field"><label>Note <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <textarea id="dq_note" placeholder="Anything worth remembering when they ask again"></textarea></div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-amber" onclick="doDeclineOrder('${id}')">Record as declined</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
function doDeclineOrder(id){
  const reason=document.getElementById('dq_reason').value;
  const note=document.getElementById('dq_note').value.trim();
  DB.updOrder(id,{status:'declined',decline_reason:note?`${reason} — ${note}`:reason});
  closeModal();confirmSave('Recorded as declined — kept as demand evidence');
  renderFinance();renderHome();
}
function confirmDelOrder(id){
  const o=DB.getOrder(id);
  const dep=orderDepositTotal(id);
  openModal(`<div class="modal-ttl">Delete Order? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:14px">
      ${o?.ref?`<b>${o.ref}</b> · `:''}${Number(o?.quantity||0).toLocaleString()} birds for ${o?.customer_name||'this buyer'}.
      ${dep>0?`<br><br><b style="color:var(--amber)">${fmtMoney(dep)}</b> in deposits is attached and will be deleted with it.`:''}
      <br><br>If the buyer simply could not be served, use <b>Decline</b> instead — deleting loses the demand record.
      <br><br>Recoverable for ${TRASH_TTL_DAYS} days from Settings → Recently Deleted.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();doDelOrder('${id}')">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
function doDelOrder(id){
  orderDeposits(id).forEach(p=>DB.delPayment(p.id));
  DB.delOrder(id);
  confirmSave('Order deleted');renderFinance();renderHome();
}

// ── Deposits ────────────────────────────────────────────────────────────
function openDepositForm(orderId,editId){
  const o=DB.getOrder(orderId); if(!o){toast('Order not found');return;}
  const rec=editId?orderDeposits(orderId).find(p=>p.id===editId):null;
  const val=orderValue(o), held=orderDepositTotal(orderId);
  const today=DB.today();
  openModal(`<div class="modal-ttl">${rec?'Edit':'Record'} Deposit <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="margin:-6px 0 12px;padding:10px 12px;background:var(--p5);border-radius:8px;font-size:13px">
      <div style="font-weight:700;color:var(--p1)">${o.customer_name||'Buyer'} · ${Number(o.quantity||0).toLocaleString()} birds</div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px;color:var(--p1)">
        <span>Order ${val>0?`<b>${fmtMoney(val)}</b>`:'<b>no price yet</b>'}</span>
        <span>Held <b style="color:var(--g3)">${fmtMoney(held)}</b></span>
        ${val>0?`<span>Balance <b style="color:var(--amber)">${fmtMoney(orderBalance(o))}</b></span>`:''}
      </div>
      <div style="font-size:11px;color:var(--gray);margin-top:6px">Carried over as the first payment when this order becomes a sale.</div>
    </div>
    <div class="field"><label>Date</label>
      <input type="date" id="dp_date" value="${rec?.date||today}" max="${today}"></div>
    <div class="field"><label>Amount (₦)</label>
      <input type="number" id="dp_amount" value="${rec?.amount_ngn||''}" min="0" step="100" inputmode="numeric" placeholder="0"></div>
    <div class="field"><label>Method</label>
      <select id="dp_method">
        ${PAYMENT_METHODS.map(m=>`<option value="${m}" ${rec?.method===m?'selected':''}>${m}</option>`).join('')}
      </select></div>
    <div class="field"><label>Notes <span style="color:var(--gray);font-weight:400">optional</span></label>
      <textarea id="dp_notes" placeholder="Optional">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveDeposit('${orderId}','${editId||''}')">Save Deposit</button>`);
}
function saveDeposit(orderId,editId){
  const o=DB.getOrder(orderId); if(!o){toast('Order not found');closeModal();return;}
  const amount=parseFloat(document.getElementById('dp_amount').value)||0;
  if(amount<=0){toast('Amount must be greater than 0');return;}
  const val=orderValue(o);
  const others=orderDeposits(orderId).filter(p=>p.id!==editId)
    .reduce((s,p)=>s+Number(p.amount_ngn||0),0);
  // Only checked once there is a price — a deposit is often taken before the
  // price is settled, and refusing it then would be the app getting in the way.
  if(val>0&&others+amount>val+0.5){
    toast(`Exceeds the order value by ${fmtMoney(others+amount-val)}`);return;
  }
  const date=document.getElementById('dp_date').value;
  if(!lockGuard(date))return;
  const method=document.getElementById('dp_method').value;
  const notes=document.getElementById('dp_notes').value.trim();
  if(editId)DB.updPayment(editId,{date,amount_ngn:amount,method,notes});
  else DB.addPayment({id:uid(),order_id:orderId,sale_id:null,date,
    amount_ngn:amount,method,kind:'order_deposit',notes});
  closeModal();confirmSave('Deposit recorded');renderFinance();
}
function delDeposit(orderId,paymentId){
  openModal(`<div class="modal-ttl">Delete Deposit? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">Recoverable for ${TRASH_TTL_DAYS} days from Settings → Recently Deleted.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();DB.delPayment('${paymentId}');confirmSave('Deposit removed');renderFinance()">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}

// ── Fulfilment ──────────────────────────────────────────────────────────
// Hands the order to the sale form rather than duplicating it. saveSale() sees
// the order id, links the two, and re-points any deposits at the new sale so
// they count as money already paid.
function fulfilOrder(orderId){
  const o=DB.getOrder(orderId); if(!o){toast('Order not found');return;}
  openSaleForm('',{orderId});
}
