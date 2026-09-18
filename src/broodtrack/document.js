// ═══════════════════════════════════════════════
// RECEIPT / INVOICE DOCUMENT
// One document per sale. Its title follows the money rather than intent:
// settled renders RECEIPT, anything outstanding renders INVOICE. Nothing is
// stated twice — the total appears once, and the settlement block says only
// what the total did not already say.
// ═══════════════════════════════════════════════
// Part payments live in bt_payments_v1, one record per payment. Balance is
// always derived, never stored, so it cannot drift out of step with the log.
function getSalePayments(saleId){
  return DB.paymentsForSale(saleId).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}
function getSalePaid(sale){
  if(!sale)return 0;
  const total=Number(sale.total_amount_ngn||0);
  const fromPayments=getSalePayments(sale.id).reduce((s,p)=>s+Number(p.amount_ngn||0),0);
  if(fromPayments>0)return Math.min(total,fromPayments);
  // Legacy fallback: sales recorded before the payment log used a boolean only.
  // Keeps every existing record reading correctly without a migration.
  if(sale.paid)return total;
  if(sale.payment_type!=='credit')return total;
  return 0;
}
function getSaleBalance(sale){
  return Math.max(0, Number(sale?.total_amount_ngn||0) - getSalePaid(sale));
}
function rdEsc(v){
  return String(v==null?'':v).replace(/[&<>"']/g,c=>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
const RD_TICK='<svg class="rd-tick" viewBox="0 0 20 20" aria-hidden="true">'
  +'<circle cx="10" cy="10" r="10" fill="currentColor"/>'
  +'<path d="M5.6 10.4l2.9 2.9 5.9-6.1" fill="none" stroke="#fff" stroke-width="2.2" '
  +'stroke-linecap="round" stroke-linejoin="round"/></svg>';
// "2,233 Isa Brown pullets" reads better than a bare count, and day-olds are
// named as chicks rather than by grown-bird type.
function getDocUnitLabel(sale){
  const wks=Number(sale.age_weeks_at_sale);
  const breed=(sale.breed||'').trim();
  // Singular matters: "1 Isa Brown pullets" looks careless on the one document
  // a buyer keeps.
  const one=Number(sale.quantity)===1;
  if(Number.isFinite(wks)&&wks<=1)
    return (breed?breed+' ':'')+(one?'day-old chick':'day-old chicks');
  const batch=DB.getBatches().find(b=>b.id===sale.batch_id);
  const kind=batch?getBirdTypeLabel(getBirdType(batch)).toLowerCase():'bird';
  return (breed?breed+' ':'')+kind+(one?'':'s');
}

function buildSaleDocHTML(sale){
  const b=getDocBusiness();
  const ref=ensureDocRef(sale);
  const total=Number(sale.total_amount_ngn||0);
  const paid=getSalePaid(sale);
  const balance=getSaleBalance(sale);
  const settled=balance<=0.5;
  const isCredit=sale.payment_type==='credit';
  const qty=Number(sale.quantity||0);
  const wks=Number(sale.age_weeks_at_sale);

  const sellerMeta=[
    b.address&&rdEsc(b.address),
    [b.phone&&rdEsc(b.phone),b.email&&rdEsc(b.email)].filter(Boolean).join(' · '),
    b.rc&&('RC '+rdEsc(b.rc.replace(/^RC\s*/i,'')))
  ].filter(Boolean).join('<br>');
  const showPayTo=!settled&&(b.bank||b.acctNo);

  return `
  <div class="rd${settled?'':' rd-due'}">
    <div class="rd-band"></div>
    <div class="rd-pad">
      <div class="rd-seller">${rdEsc(b.name)}</div>
      ${sellerMeta?`<div class="rd-seller-meta">${sellerMeta}</div>`:''}
    </div>
    <div class="rd-rule"></div>
    <div class="rd-id">
      <div class="rd-type">${settled?'RECEIPT':'INVOICE'}</div>
      <div class="rd-ref rd-m">
        <div class="rd-ref-no">${rdEsc(ref)}</div>
        <div class="rd-ref-date">${fmtDate(sale.date)}</div>
      </div>
    </div>
    <div class="rd-rule"></div>
    ${sale.buyer?`<div class="rd-party">
      <div class="rd-lbl">Issued to</div>
      <div class="rd-party-name">${rdEsc(sale.buyer)}</div>
    </div>`:''}
    <div class="rd-fields rd-m">
      ${sale.batch_name?`<div class="rd-row"><div class="rd-lbl">Batch</div><div class="rd-val">${rdEsc(sale.batch_name)}</div></div>`:''}
      ${sale.breed?`<div class="rd-row"><div class="rd-lbl">Breed</div><div class="rd-val">${rdEsc(sale.breed)}</div></div>`:''}
      ${Number.isFinite(wks)?`<div class="rd-row"><div class="rd-lbl">Age at sale</div><div class="rd-val">${wks} week${wks===1?'':'s'}</div></div>`:''}
      <div class="rd-row"><div class="rd-lbl">Dispatched</div><div class="rd-val">${fmtDate(sale.date)}</div></div>
      ${isCredit?`<div class="rd-row"><div class="rd-lbl">Payment</div><div class="rd-val">Credit${sale.due_date?' · due '+fmtDate(sale.due_date):''}</div></div>`:''}
    </div>
    <div class="rd-hero">
      <div class="rd-lbl">Quantity sold</div>
      <div class="rd-qty">
        <span class="rd-count">${qty.toLocaleString('en-NG')}</span>
        <span class="rd-unit">${rdEsc(getDocUnitLabel(sale))}</span>
      </div>
      <div class="rd-math rd-m">${qty.toLocaleString('en-NG')} × ${fmtMoney(sale.price_per_bird_ngn)} each</div>
      <div class="rd-sep"></div>
      <div class="rd-lbl">Total</div>
      <div class="rd-total">${fmtMoney(total)}</div>
    </div>
    <div class="rd-settle">
      ${settled?`
        <div class="rd-paid">${RD_TICK} Paid in full</div>
        <div class="rd-paid-sub rd-m">${isCredit?'Credit settled':'Cash'} · ${fmtDate(sale.date)}</div>
      `:`
        ${paid>0.5?`
          <div class="rd-line rd-m"><span>Paid</span><span>${fmtMoney(paid)}</span></div>
          <div class="rd-owed">
            <div class="rd-lbl" style="color:#8a5c00">Balance due</div>
            <div class="rd-owed-amt">${fmtMoney(balance)}</div>
            <div class="rd-owed-by rd-m">${sale.due_date?'On or before '+fmtDate(sale.due_date)+' · ':''}as at ${fmtDate(DB.today())}</div>
          </div>
        `:`
          <div class="rd-owed">
            <div class="rd-lbl" style="color:#8a5c00">Balance due</div>
            <div class="rd-owed-note">Nothing paid yet — the total above is due</div>
            <div class="rd-owed-by rd-m">${sale.due_date?'On or before '+fmtDate(sale.due_date)+' · ':''}as at ${fmtDate(DB.today())}</div>
          </div>
        `}
      `}
    </div>
    ${showPayTo?`<div class="rd-payto">
      <div class="rd-lbl">Pay to</div>
      <div class="rd-payto-grid">
        ${b.bank?`<div><div class="rd-lbl" style="letter-spacing:.06em">Bank</div><div class="rd-payto-val rd-m">${rdEsc(b.bank)}</div></div>`:''}
        ${b.acctNo?`<div><div class="rd-lbl" style="letter-spacing:.06em">Account</div><div class="rd-payto-val rd-m">${rdEsc(b.acctNo)}</div></div>`:''}
      </div>
      ${b.acctName?`<div style="margin-top:9px"><div class="rd-lbl" style="letter-spacing:.06em">Account name</div><div class="rd-payto-val rd-m">${rdEsc(b.acctName)}</div></div>`:''}
    </div>`:''}
    <div class="rd-terms">
      <div class="rd-lbl">Terms</div>
      <div class="rd-terms-body">${rdEsc(getDocTerms(sale))}</div>
    </div>
    ${sale.seller?`<div class="rd-issuer">
      <div><div class="rd-lbl">Sold by</div><div class="rd-issuer-name">${rdEsc(sale.seller)}</div></div>
      <div class="rd-issuer-src rd-m">via BroodTrack</div>
    </div>`:''}
    <div class="rd-stub">
      <div>
        <div class="rd-stub-ref rd-m">${rdEsc(ref)}</div>
        <div class="rd-stub-meta rd-m">${settled?'Paid in full':'Balance due'} · ${rdEsc(b.name)}</div>
      </div>
      <div class="rd-stub-amt rd-m">${fmtMoney(settled?total:balance)}</div>
    </div>
  </div>`;
}

function openSaleDoc(saleId){
  const sale=DB.getSales().find(s=>s.id===saleId);
  if(!sale){toast('Sale not found');return;}
  // An unfinished document is worse than none — send them to fill it in first.
  if(!isDocSetupComplete()){
    openModal(`<div class="modal-ttl">Finish your document details
        <button class="modal-x" onclick="closeModal()">×</button></div>
      <p style="font-size:14px;color:var(--gray);line-height:1.6;margin-bottom:14px">
        Receipts need at least your farm address and phone number, otherwise the
        buyer gets a document with blank spaces on it.
      </p>
      <button class="btn btn-primary" onclick="closeModal();go('settings')">Open Settings</button>`);
    return;
  }
  let ov=document.getElementById('rd-overlay');
  if(!ov){
    ov=document.createElement('div');
    ov.id='rd-overlay';ov.className='rd-ov';
    document.body.appendChild(ov);
  }
  const settled=getSaleBalance(sale)<=0.5;
  ov.innerHTML=`
    <div class="rd-bar">
      <button class="rd-bar-btn" onclick="closeSaleDoc()">Close</button>
      <span class="rd-bar-ttl">${settled?'Receipt':'Invoice'}</span>
      <button class="rd-bar-btn primary" onclick="window.print()">Print / PDF</button>
    </div>
    <div class="rd-hint">Printing? If the date and web address appear at the top and bottom of the sheet, untick <b>Headers and footers</b> under <b>More settings</b> in the print dialog.</div>
    <div class="rd-scroll">${buildSaleDocHTML(sale)}</div>`;
  ov.style.display='flex';
  document.body.style.overflow='hidden';
}
function closeSaleDoc(){
  const ov=document.getElementById('rd-overlay');
  if(ov)ov.style.display='none';
  document.body.style.overflow='';
}

function openSaleForm(editId,prefill){
  const today=DB.today(), rec=editId?DB.getSales().find(s=>s.id===editId):null;
  const batches=DB.getBatches();
  // Fulfilling an order: the sale is already described, so it is filled in
  // rather than retyped, and the deposits already taken are shown before
  // anyone works out what is still to collect.
  const order=prefill&&prefill.orderId?DB.getOrder(prefill.orderId):null;
  window._sf_orderId=order?order.id:'';
  const carried=order?orderDepositTotal(order.id):0;
  const existingCustomer=rec?.customer_id?DB.getCustomer(rec.customer_id):null;
  const custName=existingCustomer?.name||rec?.buyer||order?.customer_name||'';
  const custId=existingCustomer?.id||order?.customer_id||'';
  const batchId=rec?.batch_id||order?.batch_id||'';
  const qty=rec?.quantity??order?.quantity??'';
  const price=rec?.price_per_bird_ngn??order?.price_per_bird_ngn??'';
  const age=rec?.age_weeks_at_sale??order?.age_weeks_at_delivery??'';
  const total=(Number(qty)||0)*(Number(price)||0);
  // A deposit that already covers the lot means this is a cash sale on the
  // day, not a credit one — default to whichever the money says it is.
  const isCredit=rec?rec.payment_type==='credit':(order?(total>0&&carried<total-0.5):false);
  openModal(`<div class="modal-ttl">${rec?'Edit':'Record'} Sale <button class="modal-x" onclick="closeModal()">×</button></div>
    ${order?`<div style="margin:-6px 0 12px;padding:10px 12px;background:var(--p5);border-left:3px solid var(--p2);border-radius:0 8px 8px 0;font-size:12px;color:var(--p1)">
      📋 Fulfilling order <b>${order.ref||''}</b> — ${Number(order.quantity||0).toLocaleString()} birds${order.needed_from?` wanted ${fmtDate(order.needed_from)}`:''}.
      ${carried>0?`<br><b>${fmtMoney(carried)}</b> already held as deposit; it carries over as the first payment on this sale.`:''}
    </div>`:''}
    <div class="field"><label>Date of Sale</label><input type="date" id="sf_date" value="${rec?rec.date:today}" max="${today}"></div>
    <div class="field"><label>Batch</label>
      <select id="sf_batch" onchange="updateSaleAge()">${batches.map(b=>`<option value="${b.id}" ${batchId===b.id?'selected':''} >${b.name} (${b.breed})</option>`).join('')}</select></div>
    <div class="field">
      <label id="sf_cust_lbl">Buyer ${isCredit?'<span style="color:var(--red)">*</span>':'<span style="color:var(--gray);font-weight:400">— optional</span>'}</label>
      <input type="hidden" id="sf_cust_id" value="${custId}">
      <input type="text" id="sf_cust" value="${String(custName).replace(/"/g,'&quot;')}" placeholder="Start typing a name…" oninput="onSaleCustomerChange()" autocomplete="off">
      <div id="sf_cust_panel"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Quantity Sold</label><input type="number" id="sf_qty" value="${qty}" min="1" placeholder="e.g. 200" oninput="calcSaleTotal()"></div>
      <div class="field"><label>Age at Sale (weeks)</label><input type="number" id="sf_age" value="${age}" min="1" max="24" placeholder="e.g. 18"></div>
    </div>
    <div class="field"><label>Price Per Bird (₦)</label><input type="number" id="sf_price" value="${price}" min="0" step="100" placeholder="e.g. 2500" oninput="calcSaleTotal()"></div>
    <div class="field"><label>Total Amount (₦)</label><input type="number" id="sf_total" value="${rec?.total_amount_ngn||(total||'')}" placeholder="Auto-calculated" style="background:#f5f5f5" oninput="updateSaleMoneyHint()"></div>
    <div class="field"><label>Payment</label>
      <select id="sf_pay" onchange="toggleSalePayFields()">
        <option value="cash" ${!isCredit?'selected':''}>Cash — collected immediately</option>
        <option value="credit" ${isCredit?'selected':''}>Credit — buyer pays later</option>
      </select></div>
    <div id="sf_credit_fields" style="display:${isCredit?'block':'none'}">
      <div class="field"><label>Payment Due Date</label>
        <input type="date" id="sf_due" value="${rec?.due_date||''}" min="${today}"></div>
      ${editId?`
        <div style="margin:0 0 10px;padding:10px 12px;background:var(--p5);border-radius:8px;font-size:13px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:var(--p1)">Paid so far</span><b style="color:var(--g3)">${fmtMoney(getSalePaid(rec))}</b>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--p1)">Balance remaining</span><b style="color:${getSaleBalance(rec)>0?'var(--amber)':'var(--g3)'}">${fmtMoney(getSaleBalance(rec))}</b>
          </div>
          <div style="font-size:11px;color:var(--gray);margin-top:6px">To log a new payment, use <b>+ Payment</b> on the sale.</div>
        </div>
      `:`
        <div class="field"><label>Paid now (₦) <span style="font-size:11px;color:var(--gray);font-weight:400">on top of any deposit</span></label>
          <input type="number" id="sf_down" value="0" min="0" step="100" placeholder="0" oninput="updateSaleMoneyHint()"></div>
      `}
    </div>
    <div id="sf_money_hint" style="margin:-4px 0 12px;font-size:13px;color:var(--gray)"></div>
    <div class="field"><label>Sold by <span style="color:var(--gray);font-weight:400">— optional, shows on the receipt</span></label>
      <input type="text" id="sf_seller" value="${rec?.seller||(editId?'':localStorage.getItem(LAST_SELLER_KEY)||'')}" placeholder="Who handled this sale" autocomplete="off"></div>
    <div class="field"><label>Notes</label><textarea id="sf_notes" placeholder="Optional">${rec?.notes||order?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveSale('${editId||''}')">Save Sale</button>`);
  updateSaleAge();
  onSaleCustomerChange();
  updateSaleMoneyHint();
}
function onSaleCustomerChange(){
  const inputEl=document.getElementById('sf_cust');
  const panelEl=document.getElementById('sf_cust_panel');
  const idEl=document.getElementById('sf_cust_id');
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
      ${fuzzy.map(c=>`<button type="button" class="btn btn-secondary btn-sm" onclick="pickSaleCustomer('${c.id}')">${c.name}${c.customer_type?' · '+c.customer_type:''}</button>`).join('')}
      </div></div>`;
  }
  html+=`<div style="margin-top:8px;padding:10px;border:1px dashed var(--p3);border-radius:8px">
    <div style="font-size:12px;color:var(--p1);font-weight:600;margin-bottom:6px">+ New customer: "${typed.trim().replace(/</g,'&lt;')}"</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <input type="tel" id="sf_new_phone" placeholder="Phone (optional)" autocomplete="off" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px">
      <select id="sf_new_type" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px">
        ${CUSTOMER_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('')}
      </select>
    </div>
    <div style="font-size:11px;color:var(--gray);margin-top:6px">The customer record is created when you save.</div>
  </div>`;
  panelEl.innerHTML=html;
}
function pickSaleCustomer(id){
  const c=DB.getCustomer(id);
  if(!c)return;
  document.getElementById('sf_cust').value=c.name;
  document.getElementById('sf_cust_id').value=c.id;
  onSaleCustomerChange();
}
function toggleSalePayFields(){
  const isCredit=document.getElementById('sf_pay')?.value==='credit';
  const cf=document.getElementById('sf_credit_fields');
  const lbl=document.getElementById('sf_cust_lbl');
  if(cf)cf.style.display=isCredit?'block':'none';
  if(lbl)lbl.innerHTML='Buyer '+(isCredit
    ?'<span style="color:var(--red)">*</span>'
    :'<span style="color:var(--gray);font-weight:400">— optional</span>');
  updateSaleMoneyHint();
}
// One line saying what is actually being collected, deposit included, so the
// figure on screen is the figure to ask the buyer for.
function updateSaleMoneyHint(){
  const hint=document.getElementById('sf_money_hint'); if(!hint)return;
  const total=parseFloat(document.getElementById('sf_total')?.value)||0;
  const orderId=window._sf_orderId||'';
  const carried=orderId?orderDepositTotal(orderId):0;
  if(total<=0){hint.innerHTML='';return;}
  const isCredit=document.getElementById('sf_pay')?.value==='credit';
  if(!isCredit){
    hint.innerHTML=carried>0
      ?`Deposit <b>${fmtMoney(carried)}</b> · collect <b>${fmtMoney(Math.max(0,total-carried))}</b> now.`
      :`Collecting <b>${fmtMoney(total)}</b> now.`;
    return;
  }
  const down=parseFloat(document.getElementById('sf_down')?.value)||0;
  const bal=total-carried-down;
  if(bal<=0.5){
    hint.innerHTML=`<span style="color:var(--amber)">Deposit and payment cover the total — record it as Cash instead.</span>`;
  } else {
    hint.innerHTML=`${carried>0?`Deposit <b>${fmtMoney(carried)}</b>${down>0?` + <b>${fmtMoney(down)}</b> now`:''} · `:down>0?`Paid <b>${fmtMoney(down)}</b> · `:''}Balance <b style="color:var(--amber)">${fmtMoney(bal)}</b> on credit.`;
  }
}
function updateSaleAge(){
  const batchId=document.getElementById('sf_batch')?.value;
  const batch=batchId?DB.getBatches().find(b=>b.id===batchId):null;
  const ageEl=document.getElementById('sf_age');
  if(ageEl&&batch&&!ageEl.value)ageEl.value=batchAgeInWeeks(batch)||''  ;
}
function calcSaleTotal(){
  const q=parseInt(document.getElementById('sf_qty')?.value,10)||0;
  const p=parseFloat(document.getElementById('sf_price')?.value)||0;
  const t=document.getElementById('sf_total'); if(t)t.value=(q*p).toFixed(0);
}
function saveSale(editId){
  const payType=document.getElementById('sf_pay').value;
  const isCredit=payType==='credit';
  const typed=(document.getElementById('sf_cust')?.value||'').trim();
  if(isCredit&&!typed){toast('Enter the buyer name for a credit sale');return;}
  const batchId=document.getElementById('sf_batch').value;
  const batch=DB.getBatches().find(b=>b.id===batchId);
  const qty=parseInt(document.getElementById('sf_qty').value,10)||0;
  if(!Number.isInteger(qty)||qty<1){toast('Quantity must be a whole number of birds');return;}
  const price=parseFloat(document.getElementById('sf_price').value)||0;
  const existingRec=editId?DB.getSales().find(s=>s.id===editId):null;
  const total=parseFloat(document.getElementById('sf_total').value)||(qty*price);
  const orderId=editId?(existingRec?.order_id||''):(window._sf_orderId||'');
  const order=orderId?DB.getOrder(orderId):null;
  // Deposits already taken against the order count as money in. They are
  // re-pointed at this sale below rather than re-entered, so what is paid is
  // the deposit plus whatever is handed over today.
  const carried=(order&&!editId)?orderDepositTotal(orderId):0;
  let customerId=document.getElementById('sf_cust_id')?.value||'';
  if(typed&&!customerId)customerId=resolveCustomerFromInput(typed,'sf_new_phone','sf_new_type');
  const cust=customerId?DB.getCustomer(customerId):null;
  let downPayment=0;
  if(!editId&&isCredit){
    downPayment=parseFloat(document.getElementById('sf_down')?.value)||0;
    if(downPayment<0){toast('Amount paid cannot be negative');return;}
    if(carried+downPayment>=total-0.5){toast('Deposit and payment cover the total — record it as Cash');return;}
  }
  const rec={id:editId||uid(),date:document.getElementById('sf_date').value,
    batch_id:batchId,batch_name:batch?.name||'',breed:batch?.breed||'',
    quantity:qty,age_weeks_at_sale:parseInt(document.getElementById('sf_age').value)||null,
    price_per_bird_ngn:price,
    total_amount_ngn:total,
    payment_type:payType,
    paid:isCredit?(existingRec?.paid||false):true,
    due_date:isCredit?(document.getElementById('sf_due')?.value||null):null,
    customer_id:customerId||null,
    // `buyer` is kept in step with the customer record: the receipt prints it,
    // and every sale made before customers existed has only this.
    buyer:cust?.name||typed,
    order_id:orderId||null,
    seller:(document.getElementById('sf_seller')?.value||'').trim(),
    notes:document.getElementById('sf_notes').value.trim()};
  if(rec.seller)localStorage.setItem(LAST_SELLER_KEY,rec.seller);
  // Carry the reference forward on edit — a document already given to a buyer
  // keeps its number even if the sale's date or amount is corrected afterwards.
  rec.doc_ref=existingRec?.doc_ref||nextDocRef(rec);
  rec.doc_issued_at=existingRec?.doc_issued_at||rec.date;
  if(isCredit&&!editId&&carried+downPayment>=total-0.5)rec.paid=true;
  if(editId){
    DB.updSale(editId,rec);
  } else {
    DB.addSale(rec);
    // Re-point the deposits first, so the payment written below is sized
    // against what is genuinely still outstanding.
    if(order){
      orderDeposits(orderId).forEach(p=>DB.updPayment(p.id,{sale_id:rec.id}));
      DB.updOrder(orderId,{status:'fulfilled',sale_id:rec.id,
        batch_id:order.batch_id||batchId||null});
    }
    if(!isCredit){
      const due=Math.max(0,total-carried);
      if(due>0.5)DB.addPayment({id:uid(),sale_id:rec.id,date:rec.date,amount_ngn:due,
        method:'Cash',kind:'sale_payment',notes:carried>0?'Balance at collection':'Full payment at sale'});
    } else if(downPayment>0){
      DB.addPayment({id:uid(),sale_id:rec.id,date:rec.date,amount_ngn:downPayment,
        method:'Cash',kind:'down_payment',notes:'Paid at collection'});
    }
  }
  if(batchId&&batch)syncBatchSoldStatus(batchId);
  window._sf_orderId='';
  closeModal();
  const owing=Math.max(0,total-carried-downPayment);
  confirmSave(isCredit
    ?`${order?'Order fulfilled — ':''}${fmtMoney(owing)} owing`
    :`${order?'Order fulfilled — ':''}Cash sale recorded`);
  renderFinance();renderHome();
}
// Replaces the old all-or-nothing "Paid ✓". A bird sale is large enough that
// part payment is the norm, so every payment is logged individually and the
// sale's `paid` flag is only a cache of "balance reached zero".
function openPaymentForm(saleId,paymentEditId){
  const sale=DB.getSales().find(s=>s.id===saleId);
  if(!sale){toast('Sale not found');return;}
  const rec=paymentEditId?DB.paymentsForSale(saleId).find(p=>p.id===paymentEditId):null;
  const total=Number(sale.total_amount_ngn||0);
  const paidSoFar=getSalePaid(sale);
  const balance=getSaleBalance(sale);
  const today=DB.today();
  const history=getSalePayments(saleId);
  openModal(`<div class="modal-ttl">${rec?'Edit':'Record'} Payment <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="margin:-6px 0 12px;padding:10px 12px;background:var(--p5);border-radius:8px;font-size:13px">
      <div style="font-weight:700;color:var(--p1)">${sale.buyer||'Buyer'} · ${sale.quantity} birds</div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px;color:var(--p1)">
        <span>Total <b>${fmtMoney(total)}</b></span>
        <span>Paid <b style="color:var(--g3)">${fmtMoney(paidSoFar)}</b></span>
        <span>Owing <b style="color:${balance>0?'var(--amber)':'var(--g3)'}">${fmtMoney(balance)}</b></span>
      </div>
    </div>
    ${history.length?`<div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Payments so far</div>
      ${history.map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;padding:5px 0;border-bottom:1px solid #f2f2f2">
        <span style="color:var(--gray)">${fmtDate(p.date)} · ${p.method||'—'}</span>
        <span style="display:flex;align-items:center;gap:6px">
          <b>${fmtMoney(p.amount_ngn)}</b>
          <button class="btn btn-secondary btn-sm" onclick="openPaymentForm('${saleId}','${p.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deletePayment('${saleId}','${p.id}')">✕</button>
        </span></div>`).join('')}
    </div>`:''}
    <div class="field"><label>Payment date</label>
      <input type="date" id="pf_date" value="${rec?.date||today}" max="${today}"></div>
    <div class="field"><label>Amount (₦)</label>
      <input type="number" id="pf_amount" value="${rec?rec.amount_ngn:(balance||'')}" min="0" step="100" placeholder="0"></div>
    <div class="field"><label>Method</label>
      <select id="pf_method">
        ${PAYMENT_METHODS.map(m=>`<option value="${m}" ${rec?.method===m?'selected':''}>${m}</option>`).join('')}
      </select></div>
    <div class="field"><label>Notes <span style="color:var(--gray);font-weight:400">optional</span></label>
      <textarea id="pf_notes" placeholder="Optional">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="savePayment('${saleId}','${paymentEditId||''}')">Save Payment</button>`);
}
function savePayment(saleId,paymentEditId){
  const sale=DB.getSales().find(s=>s.id===saleId);
  if(!sale){toast('Sale not found');closeModal();return;}
  const amount=parseFloat(document.getElementById('pf_amount').value)||0;
  if(amount<=0){toast('Amount must be greater than 0');return;}
  const total=Number(sale.total_amount_ngn||0);
  const otherPaid=DB.paymentsForSale(saleId)
    .filter(p=>p.id!==paymentEditId)
    .reduce((s,p)=>s+Number(p.amount_ngn||0),0);
  if(otherPaid+amount>total+0.5){
    toast(`Exceeds outstanding ${fmtMoney(Math.max(0,total-otherPaid))}`);return;
  }
  const date=document.getElementById('pf_date').value;
  const method=document.getElementById('pf_method').value;
  const notes=document.getElementById('pf_notes').value.trim();
  if(paymentEditId){
    DB.updPayment(paymentEditId,{date,amount_ngn:amount,method,notes});
  } else {
    DB.addPayment({id:uid(),sale_id:saleId,date,amount_ngn:amount,method,kind:'sale_payment',notes});
  }
  const settled=(otherPaid+amount)>=total-0.5;
  DB.updSale(saleId,{paid:settled});
  closeModal();
  confirmSave(settled?'Paid in full — balance cleared':`Payment recorded — ${fmtMoney(Math.max(0,total-otherPaid-amount))} still owing`);
  renderFinance();
}
function deletePayment(saleId,paymentId){
  const sale=DB.getSales().find(s=>s.id===saleId);
  DB.delPayment(paymentId);
  if(sale){
    const remaining=DB.paymentsForSale(saleId)
      .filter(p=>p.id!==paymentId)
      .reduce((s,p)=>s+Number(p.amount_ngn||0),0);
    DB.updSale(saleId,{paid:remaining>=Number(sale.total_amount_ngn||0)-0.5});
  }
  closeModal();confirmSave('Payment removed');renderFinance();
}
function delSale(id){openModal(`<div class="modal-ttl">Delete? <button class="modal-x" onclick="closeModal()">×</button></div>
  <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
    <button class="btn btn-danger" onclick="closeModal();DB.paymentsForSale('${id}').forEach(p=>DB.delPayment(p.id));DB.delSale('${id}');confirmSave('Deleted');renderFinance()">Delete</button>
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);}
