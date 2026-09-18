// ═══════════════════════════════════════════════
// RECEIPT / INVOICE DOCUMENT
// One document per sale. Its title follows the money rather than intent:
// settled renders RECEIPT, anything outstanding renders INVOICE. Nothing is
// stated twice — the total appears once, and the settlement block says only
// what the total did not already say.
// ═══════════════════════════════════════════════
// Singular matters: a one-crate sale reading "1 crates of eggs" looks careless
// on the one document a customer keeps.
const DOC_UNIT_LABELS={
  'Eggs — Crates':{one:'crate of eggs',   many:'crates of eggs'},
  'Culled Birds' :{one:'culled bird',     many:'culled birds'},
  'Cockerels'    :{one:'cockerel',        many:'cockerels'},
  'Manure'       :{one:'manure',          many:'manure'},
  'Other'        :{one:'item',            many:'items'}
};
function getDocUnitLabel(product,qty){
  const u=DOC_UNIT_LABELS[product]||DOC_UNIT_LABELS['Other'];
  return Number(qty)===1?u.one:u.many;
}
function rdEsc(v){
  return String(v==null?'':v).replace(/[&<>"']/g,c=>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
const RD_TICK='<svg class="rd-tick" viewBox="0 0 20 20" aria-hidden="true">'
  +'<circle cx="10" cy="10" r="10" fill="currentColor"/>'
  +'<path d="M5.6 10.4l2.9 2.9 5.9-6.1" fill="none" stroke="#fff" stroke-width="2.2" '
  +'stroke-linecap="round" stroke-linejoin="round"/></svg>';

function buildSaleDocHTML(sale){
  const b=getDocBusiness();
  const ref=ensureDocRef(sale);
  const total=Number(sale.total_amount_ngn||0);
  const paid=getSalePaid(sale);
  const balance=getSaleBalance(sale);
  const settled=balance<=0.5;
  const cust=sale.customer_id?DB.getCustomer(sale.customer_id):null;
  const custName=(cust&&cust.name)||sale.customer||'';
  const unit=getDocUnitLabel(sale.product,sale.quantity);
  const isCredit=sale.payment_type==='credit';
  const qty=Number(sale.quantity||0);

  const sellerMeta=[
    b.address&&rdEsc(b.address),
    [b.phone&&rdEsc(b.phone),b.email&&rdEsc(b.email)].filter(Boolean).join(' · '),
    b.rc&&('RC '+rdEsc(b.rc.replace(/^RC\s*/i,'')))
  ].filter(Boolean).join('<br>');

  // Where customers pay — printed only when something is still owed, and only
  // if the farm has actually filled it in.
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
    ${custName?`<div class="rd-party">
      <div class="rd-lbl">Issued to</div>
      <div class="rd-party-name">${rdEsc(custName)}</div>
    </div>`:''}
    <div class="rd-fields rd-m">
      <div class="rd-row"><div class="rd-lbl">Product</div><div class="rd-val">${rdEsc(sale.product)}</div></div>
      <div class="rd-row"><div class="rd-lbl">${isCredit?'Collected':'Date'}</div><div class="rd-val">${fmtDate(sale.date)}</div></div>
      ${isCredit?`<div class="rd-row"><div class="rd-lbl">Payment</div><div class="rd-val">Credit${sale.due_date?' · due '+fmtDate(sale.due_date):''}</div></div>`:''}
    </div>
    <div class="rd-hero">
      <div class="rd-lbl">Quantity sold</div>
      <div class="rd-qty">
        <span class="rd-count">${qty.toLocaleString('en-NG')}</span>
        <span class="rd-unit">${rdEsc(unit)}</span>
      </div>
      <div class="rd-math rd-m">${qty.toLocaleString('en-NG')} × ${fmtMoney(sale.unit_price_ngn)} each</div>
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
      <div class="rd-terms-body">${rdEsc(getDocTerms(sale.product))}</div>
    </div>
    ${sale.seller?`<div class="rd-issuer">
      <div><div class="rd-lbl">Sold by</div><div class="rd-issuer-name">${rdEsc(sale.seller)}</div></div>
      <div class="rd-issuer-src rd-m">via LayerTrack</div>
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
        customer gets a document with blank spaces on it.
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

function openSaleForm(editId){
  const rec=editId?DB.getSales().find(s=>s.id===editId):null, today=DB.today();
  const isCredit=rec?.payment_type==='credit';
  let existingCustomer=null;
  if(rec?.customer_id)existingCustomer=DB.getCustomer(rec.customer_id);
  else if(rec?.customer)existingCustomer=findCustomerByName(rec.customer);
  const existingPaid=rec?getSalePaid(rec):0;
  const existingBalance=rec?getSaleBalance(rec):0;
  openModal(`<div class="modal-ttl">${rec?'Edit':'Record'} Sale <button class="modal-x" onclick="closeModal()">×</button></div>
    <div class="field"><label>Date of Sale</label><input type="date" id="sf_date" value="${rec?rec.date:today}" max="${today}"></div>
    <div class="field"><label>Product</label>
      <select id="sf_prod" onchange="updateCreditCheckPanel('${editId||''}')">${PRODUCT_TYPES.map(p=>`<option value="${p}" ${rec?.product===p?'selected':''} >${p}</option>`).join('')}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Quantity</label><input type="number" id="sf_qty" value="${rec?.quantity||''}" min="1" placeholder="e.g. 10" oninput="calcSaleTotal()"></div>
      <div class="field"><label>Unit Price (₦)</label><input type="number" id="sf_price" value="${rec?.unit_price_ngn||''}" min="0" step="100" placeholder="e.g. 3500" oninput="calcSaleTotal()"></div>
    </div>
    <div class="field"><label>Total Amount (₦)</label>
      <input type="number" id="sf_total" value="${rec?.total_amount_ngn||''}" placeholder="Auto-calculated" style="background:#f5f5f5"></div>
    <div class="field"><label>Payment</label>
      <select id="sf_pay" onchange="toggleSalePayFields()">
        <option value="cash" ${!isCredit?'selected':''}>Cash — full payment now</option>
        <option value="credit" ${isCredit?'selected':''}>Credit / partial — pay over time</option>
      </select></div>
    <div class="field">
      <label id="sf_cust_lbl">Customer ${isCredit?'<span style="color:var(--red)">*</span>':'<span style="color:var(--gray);font-weight:400">— optional</span>'}</label>
      <input type="hidden" id="sf_cust_id" value="${existingCustomer?.id||''}">
      <input type="text" id="sf_cust" value="${existingCustomer?.name||rec?.customer||''}" placeholder="Start typing a name…" oninput="onCustomerNameChange()" autocomplete="off">
      <div id="sf_cust_panel"></div>
    </div>
    <div id="sf_credit_fields" style="display:${isCredit?'block':'none'}">
      ${editId?`
        <div style="margin:0 0 10px;padding:10px 12px;background:var(--g5);border-radius:8px;font-size:13px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:var(--g1)">Paid so far</span><b style="color:var(--g3)">${fmtMoney(existingPaid)}</b>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--g1)">Balance remaining</span><b style="color:${existingBalance>0?'var(--amber)':'var(--g3)'}">${fmtMoney(existingBalance)}</b>
          </div>
          <div style="font-size:11px;color:var(--gray);margin-top:6px">To log a new payment, use <b>Record Payment</b> on Receivables.</div>
        </div>
        <div class="field"><label>Due date for balance</label>
          <input type="date" id="sf_due" value="${rec?.due_date||''}" min="${today}"></div>
      `:`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="field"><label>Down payment (₦) <span style="font-size:11px;color:var(--gray);font-weight:400">optional</span></label>
            <input type="number" id="sf_down" value="0" min="0" step="100" placeholder="0" oninput="updateSaleBalanceHint();updateCreditCheckPanel(window._sf_editId||'')"></div>
          <div class="field"><label>Due date for balance</label>
            <input type="date" id="sf_due" value="" min="${today}"></div>
        </div>
        <div id="sf_balance_hint" style="margin:-4px 0 10px;font-size:13px;color:var(--gray)"></div>
      `}
    </div>
    <div id="sf_credit_check"></div>
    <div class="field"><label>Sold by <span style="color:var(--gray);font-weight:400">— optional, shows on the receipt</span></label>
      <input type="text" id="sf_seller" value="${rec?.seller||(editId?'':localStorage.getItem(LAST_SELLER_KEY)||'')}" placeholder="Who handled this sale" autocomplete="off"></div>
    <div class="field"><label>Notes</label><textarea id="sf_notes" placeholder="Optional">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveSale('${editId||''}')">Save Sale</button>`);
  window._sf_editId=editId||'';
  onCustomerNameChange();
  updateSaleBalanceHint();
  updateCreditCheckPanel(editId||'');
}
function onCustomerNameChange(){
  const inputEl=document.getElementById('sf_cust');
  const panelEl=document.getElementById('sf_cust_panel');
  const idEl=document.getElementById('sf_cust_id');
  if(!inputEl||!panelEl||!idEl)return;
  const typed=inputEl.value;
  const norm=normalizeCustomerName(typed);
  if(!norm){panelEl.innerHTML='';idEl.value='';return;}
  const exact=findCustomerByName(typed);
  if(exact){
    idEl.value=exact.id;
    panelEl.innerHTML=renderCustomerInfoBlock(exact);
    return;
  }
  idEl.value='';
  const fuzzy=fuzzyCustomerMatches(typed);
  let html='';
  if(fuzzy.length){
    html+=`<div style="margin-top:8px;padding:10px;background:var(--g5);border-radius:8px;border-left:3px solid var(--amber)">
      <div style="font-size:12px;color:var(--g1);font-weight:600;margin-bottom:6px">Did you mean?</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${fuzzy.map(c=>`<button type="button" class="btn btn-secondary btn-sm" onclick="pickCustomer('${c.id}')">${c.name}${c.customer_type?' · '+c.customer_type:''}</button>`).join('')}
      </div>
    </div>`;
  }
  const safeName=typed.trim().replace(/</g,'&lt;');
  html+=`<div style="margin-top:8px;padding:10px;border:1px dashed var(--g3);border-radius:8px">
    <div style="font-size:12px;color:var(--g1);font-weight:600;margin-bottom:6px">+ New customer: "${safeName}"</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <input type="tel" id="sf_new_phone" placeholder="Phone (optional)" autocomplete="off" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px">
      <select id="sf_new_type" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px">
        ${CUSTOMER_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('')}
      </select>
    </div>
    <div style="font-size:11px;color:var(--gray);margin-top:6px">A new customer record will be created when you save.</div>
  </div>`;
  panelEl.innerHTML=html;
  if(typeof updateCreditCheckPanel==='function')updateCreditCheckPanel(window._sf_editId||'');
}
function pickCustomer(id){
  const c=DB.getCustomer(id);
  if(!c)return;
  document.getElementById('sf_cust').value=c.name;
  document.getElementById('sf_cust_id').value=c.id;
  onCustomerNameChange();
  updateCreditCheckPanel(window._sf_editId||'');
}
function renderCustomerInfoBlock(c){
  const outstanding=getCustomerOutstanding(c.id);
  return `<div style="margin-top:8px;padding:10px;background:var(--blueBg);border-radius:8px;border-left:3px solid var(--blue)">
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px">
      <div>
        <div style="font-weight:700;color:var(--g2)">✓ ${c.name}</div>
        <div style="color:var(--g1);margin-top:2px">${c.customer_type||'—'}${c.phone?' · ☎ '+c.phone:''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:var(--gray)">Currently owes</div>
        <div style="font-weight:800;color:${outstanding>0?'var(--amber)':'var(--g3)'}">${fmtMoney(outstanding)}</div>
      </div>
    </div>
  </div>`;
}
function toggleSalePayFields(){
  const isCredit=document.getElementById('sf_pay')?.value==='credit';
  const cf=document.getElementById('sf_credit_fields');
  const lbl=document.getElementById('sf_cust_lbl');
  if(cf)cf.style.display=isCredit?'block':'none';
  if(lbl)lbl.innerHTML='Customer '+(isCredit?'<span style="color:var(--red)">*</span>':'<span style="color:var(--gray);font-weight:400">— optional</span>');
  updateSaleBalanceHint();
  updateCreditCheckPanel(window._sf_editId||'');
}
function calcSaleTotal(){
  const q=parseInt(document.getElementById('sf_qty')?.value,10)||0;
  const p=parseFloat(document.getElementById('sf_price')?.value)||0;
  const t=document.getElementById('sf_total'); if(t)t.value=(q*p).toFixed(0);
  updateSaleBalanceHint();
  updateCreditCheckPanel(window._sf_editId||'');
}
function updateSaleBalanceHint(){
  const hint=document.getElementById('sf_balance_hint');
  const totalEl=document.getElementById('sf_total');
  const downEl=document.getElementById('sf_down');
  if(!hint||!totalEl||!downEl)return;
  const total=parseFloat(totalEl.value)||0;
  const down=parseFloat(downEl.value)||0;
  if(total<=0){hint.innerHTML='';return;}
  if(down<=0){
    hint.innerHTML=`Full <b>${fmtMoney(total)}</b> on credit.`;
  } else if(down>=total){
    hint.innerHTML=`<span style="color:var(--amber)">Down payment ≥ total — switch to Cash instead.</span>`;
  } else {
    const bal=total-down;
    hint.innerHTML=`Down <b>${fmtMoney(down)}</b> · Balance <b style="color:var(--amber)">${fmtMoney(bal)}</b>`;
  }
}
function updateCreditCheckPanel(editId){
  const panel=document.getElementById('sf_credit_check');
  if(!panel)return;
  const payType=document.getElementById('sf_pay')?.value;
  const product=document.getElementById('sf_prod')?.value;
  const isCredit=payType==='credit';
  const isEggs=product==='Eggs — Crates';
  // Preserve any reason already typed before we re-render
  const priorReasonEl=document.getElementById('sf_override_reason');
  const priorReason=priorReasonEl?priorReasonEl.value:'';
  if(!isCredit||!isEggs){panel.innerHTML='';return;}
  const qty=parseInt(document.getElementById('sf_qty')?.value,10)||0;
  const total=parseFloat(document.getElementById('sf_total')?.value)||0;
  const down=parseFloat(document.getElementById('sf_down')?.value)||0;
  const newCommitCrates=total>0?qty*Math.max(0,(total-down))/total:qty;
  const env=getCreditEnvelope();
  let adjustedCommitted=env.committedCrates;
  if(editId){
    const existing=DB.getSales().find(s=>s.id===editId);
    if(existing&&existing.product==='Eggs — Crates'&&existing.payment_type==='credit'){
      const existingTotal=Number(existing.total_amount_ngn||0);
      const existingBal=getSaleBalance(existing);
      if(existingTotal>0&&existingBal>0){
        adjustedCommitted-=Number(existing.quantity||0)*(existingBal/existingTotal);
      }
    }
  }
  const adjustedHeadroom=env.envelopeCrates-adjustedCommitted;
  const newTotalCommitted=adjustedCommitted+newCommitCrates;
  const exceedsBy=newTotalCommitted-env.envelopeCrates;
  const overGate=exceedsBy>0.5;
  const customerId=document.getElementById('sf_cust_id')?.value;
  const customerOwing=customerId?getCustomerOutstanding(customerId):0;
  const utilizationPct=env.envelopeCrates>0?(newTotalCommitted/env.envelopeCrates*100):0;
  const barColor=overGate?'var(--red)':utilizationPct>80?'var(--amber)':'var(--g3)';
  const bgColor=overGate?'#fde8ea':'var(--g5)';
  const existingRec=editId?DB.getSales().find(s=>s.id===editId):null;
  const savedReason=existingRec?.credit_gate_override_reason||'';
  const reasonValue=priorReason||savedReason;
  let html=`<div style="margin:8px 0;padding:10px 12px;background:${bgColor};border-radius:8px;border-left:3px solid ${barColor}">
    <div style="font-size:11px;font-weight:700;color:var(--g1);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Credit Check</div>`;
  if(customerId){
    html+=`<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
      <span>This customer currently owes</span>
      <b style="color:${customerOwing>0?'var(--amber)':'var(--g3)'}">${fmtMoney(customerOwing)}</b>
    </div>`;
  }
  html+=`<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
    <span>Farm credit pool</span>
    <b>${env.envelopeCrates} crates @ ${env.effectivePct.toFixed(0)}%${env.flexPct>0?` (flex +${env.flexPct.toFixed(0)}%)`:''}</b>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
    <span>Headroom before this sale</span>
    <b style="color:${adjustedHeadroom<=0?'var(--red)':adjustedHeadroom<env.envelopeCrates*0.2?'var(--amber)':'var(--g3)'}">${adjustedHeadroom.toFixed(1)} crates</b>
  </div>
  <div style="height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;margin-bottom:4px">
    <div style="height:100%;background:${barColor};width:${Math.min(100,Math.max(0,utilizationPct)).toFixed(1)}%"></div>
  </div>
  <div style="font-size:11px;color:var(--g1)">
    After this sale: <b>${newTotalCommitted.toFixed(1)} / ${env.envelopeCrates}</b> crates committed (${utilizationPct.toFixed(0)}%)
  </div>`;
  if(overGate){
    html+=`<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(214,40,57,0.2)">
      <div style="font-size:12px;color:var(--red);font-weight:700;margin-bottom:6px">
        ⚠ This sale exceeds the credit pool by ${exceedsBy.toFixed(1)} crate${exceedsBy>=2?'s':''}.
      </div>
      <label style="font-size:11px;color:var(--g1);font-weight:600">Reason to proceed <span style="color:var(--red)">*</span></label>
      <textarea id="sf_override_reason" placeholder="e.g. Trusted long-term customer, will collect by next week…" style="margin-top:4px;width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-family:inherit;font-size:13px;min-height:60px">${reasonValue.replace(/</g,'&lt;')}</textarea>
    </div>`;
  } else if(savedReason){
    html+=`<div style="margin-top:8px;padding-top:8px;border-top:1px solid #eee;font-size:11px;color:var(--gray)">
      Previous override reason: <i>"${savedReason.replace(/</g,'&lt;')}"</i>
    </div>`;
  }
  html+=`</div>`;
  panel.innerHTML=html;
}
function saveSale(editId){
  const payType=document.getElementById('sf_pay').value;
  const isCredit=payType==='credit';
  const typedName=(document.getElementById('sf_cust')?.value||'').trim();
  let customerId=document.getElementById('sf_cust_id')?.value||'';
  if(isCredit&&!typedName){toast('Enter a customer name for credit sale');return;}
  const qty=parseInt(document.getElementById('sf_qty').value,10)||0;
  if(!Number.isInteger(qty)||qty<1){toast('Quantity must be at least 1');return;}
  const price=parseFloat(document.getElementById('sf_price').value)||0;
  const total=parseFloat(document.getElementById('sf_total').value)||(qty*price);
  let downPayment=0;
  if(!editId&&isCredit){
    downPayment=parseFloat(document.getElementById('sf_down')?.value)||0;
    if(downPayment<0){toast('Down payment cannot be negative');return;}
    if(downPayment>=total){toast('Down payment ≥ total — switch to Cash');return;}
  }
  const saleDate=document.getElementById('sf_date').value;
  const product=document.getElementById('sf_prod').value;
  // Portfolio gate (only credit sales of egg crates draw on the envelope)
  let overrideReason='';
  let gateBreached=false;
  if(isCredit&&product==='Eggs — Crates'){
    const newCommitCrates=total>0?qty*Math.max(0,(total-downPayment))/total:qty;
    const env=getCreditEnvelope();
    let adjustedCommitted=env.committedCrates;
    if(editId){
      const ex=DB.getSales().find(s=>s.id===editId);
      if(ex&&ex.product==='Eggs — Crates'&&ex.payment_type==='credit'){
        const exTotal=Number(ex.total_amount_ngn||0);
        const exBal=getSaleBalance(ex);
        if(exTotal>0&&exBal>0)adjustedCommitted-=Number(ex.quantity||0)*(exBal/exTotal);
      }
    }
    if(adjustedCommitted+newCommitCrates-env.envelopeCrates>0.5){
      gateBreached=true;
      const reasonEl=document.getElementById('sf_override_reason');
      overrideReason=(reasonEl?.value||'').trim();
      if(!overrideReason){toast('This sale exceeds the credit pool — type a reason to proceed');return;}
    }
  }
  if(typedName&&!customerId){
    const exact=findCustomerByName(typedName);
    if(exact){
      customerId=exact.id;
    } else {
      const phoneEl=document.getElementById('sf_new_phone');
      const typeEl=document.getElementById('sf_new_type');
      const newCust={
        id:uid(),
        name:typedName,
        name_normalized:normalizeCustomerName(typedName),
        phone:phoneEl?phoneEl.value.trim():'',
        customer_type:typeEl?typeEl.value:'Individual',
        notes:'',
        created_at:DB.today()
      };
      DB.addCustomer(newCust);
      customerId=newCust.id;
    }
  }
  const existingRec=editId?DB.getSales().find(s=>s.id===editId):null;
  const rec={
    id:editId||uid(),
    date:saleDate,
    product:product,
    quantity:qty,
    unit_price_ngn:price,
    total_amount_ngn:total,
    payment_type:payType,
    paid:existingRec?existingRec.paid:!isCredit,
    due_date:isCredit?(document.getElementById('sf_due')?.value||null):null,
    customer_id:customerId||null,
    customer:typedName,
    seller:(document.getElementById('sf_seller')?.value||'').trim(),
    notes:document.getElementById('sf_notes').value.trim(),
    credit_gate_override_reason:gateBreached?overrideReason:(existingRec?.credit_gate_override_reason||null)
  };
  if(rec.seller)localStorage.setItem(LAST_SELLER_KEY,rec.seller);
  // Carry the reference forward on edit — a document already given to a customer
  // keeps its number even if the sale's date or amount is corrected afterwards.
  rec.doc_ref=existingRec?.doc_ref||nextDocRef(rec);
  rec.doc_issued_at=existingRec?.doc_issued_at||saleDate;
  if(editId){
    DB.updSale(editId,rec);
  } else {
    DB.addSale(rec);
    if(!isCredit){
      DB.addPayment({id:uid(),sale_id:rec.id,date:saleDate,amount_ngn:total,method:'Cash',kind:'sale_payment',notes:'Full payment at sale'});
    } else if(downPayment>0){
      DB.addPayment({id:uid(),sale_id:rec.id,date:saleDate,amount_ngn:downPayment,method:'Cash',kind:'down_payment',notes:'Down payment'});
    }
  }
  closeModal();
  if(!editId&&isCredit&&downPayment>0){
    confirmSave(`Sale recorded — ${fmtMoney(downPayment)} paid, ${fmtMoney(total-downPayment)} on credit`);
  } else if(!editId&&isCredit){
    confirmSave('Credit sale recorded — see Receivables');
  } else if(!editId){
    confirmSave('Cash sale recorded');
  } else {
    confirmSave('Sale updated');
  }
  renderFinance();
}
function markSalePaid(saleId){ openPaymentForm(saleId); }
function openPaymentForm(saleId,paymentEditId){
  const sale=DB.getSales().find(s=>s.id===saleId);
  if(!sale){toast('Sale not found');return;}
  const rec=paymentEditId?DB.paymentsForSale(saleId).find(p=>p.id===paymentEditId):null;
  const balance=getSaleBalance(sale);
  const paidSoFar=getSalePaid(sale);
  const total=Number(sale.total_amount_ngn||0);
  const today=DB.today();
  const cust=sale.customer_id?DB.getCustomer(sale.customer_id):null;
  const custName=cust?.name||sale.customer||'Customer';
  const defaultAmount=rec?rec.amount_ngn:balance;
  openModal(`<div class="modal-ttl">${rec?'Edit':'Record'} Payment <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="margin:-6px 0 12px;padding:10px 12px;background:var(--g5);border-radius:8px;font-size:13px">
      <div style="font-weight:700;color:var(--g2)">${custName} · ${sale.product}</div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px;color:var(--g1)">
        <span>Total <b>${fmtMoney(total)}</b></span>
        <span>Paid <b style="color:var(--g3)">${fmtMoney(paidSoFar)}</b></span>
        <span>Owing <b style="color:${balance>0?'var(--amber)':'var(--g3)'}">${fmtMoney(balance)}</b></span>
      </div>
    </div>
    <div class="field"><label>Payment date</label>
      <input type="date" id="pf_date" value="${rec?.date||today}" max="${today}"></div>
    <div class="field"><label>Amount (₦)</label>
      <input type="number" id="pf_amount" value="${defaultAmount||''}" min="0" step="100" placeholder="0"></div>
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
  const rec={
    id:paymentEditId||uid(),
    sale_id:saleId,
    date:document.getElementById('pf_date').value,
    amount_ngn:amount,
    method:document.getElementById('pf_method').value,
    kind:paymentEditId?undefined:'sale_payment',
    notes:document.getElementById('pf_notes').value.trim()
  };
  if(paymentEditId){
    DB.updPayment(paymentEditId,{date:rec.date,amount_ngn:rec.amount_ngn,method:rec.method,notes:rec.notes});
  } else {
    DB.addPayment(rec);
  }
  const newPaid=otherPaid+amount;
  if(newPaid>=total-0.5){
    DB.updSale(saleId,{paid:true});
    confirmSave('Payment recorded — fully paid');
  } else {
    if(sale.paid)DB.updSale(saleId,{paid:false});
    confirmSave(`Payment recorded — ${fmtMoney(total-newPaid)} still owing`);
  }
  closeModal();renderFinance();
}
function delPayment(paymentId,saleId){
  openModal(`<div class="modal-ttl">Delete Payment? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">The outstanding balance will increase by the deleted amount.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();DB.delPayment('${paymentId}');DB.updSale('${saleId}',{paid:false});confirmSave('Payment deleted');renderFinance()">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
function delSale(id){openModal(`<div class="modal-ttl">Delete Sale? <button class="modal-x" onclick="closeModal()">×</button></div>
  <p style="font-size:14px;color:var(--gray);margin-bottom:18px">This cannot be undone. Any linked payments will also be cleared.</p>
  <div style="display:flex;flex-direction:column;gap:8px">
    <button class="btn btn-danger" onclick="closeModal();DB.paymentsForSale('${id}').forEach(p=>DB.delPayment(p.id));DB.delSale('${id}');confirmSave('Deleted');renderFinance()">Delete</button>
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);}

function renderCustomersTab(){
  const customers=DB.getCustomers().slice().sort((a,b)=>{
    const oa=getCustomerOutstanding(a.id),ob=getCustomerOutstanding(b.id);
    if(oa!==ob)return ob-oa;
    return (a.name||'').localeCompare(b.name||'');
  });
  return `
    <div style="margin:12px 16px"><button class="btn btn-primary" onclick="openCustomerForm()">+ Add Customer</button></div>
    <div style="margin:0 16px 8px;background:var(--g5);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--g1)">
      Customers are created automatically when you record a credit sale. You can also pre-register regulars here.
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      ${customers.length===0
        ?'<div class="empty" style="padding:24px"><p>No customers yet.</p><p style="font-size:12px;margin-top:6px">Record a credit sale and a customer record will be created.</p></div>'
        :customers.map(c=>{
          const owing=getCustomerOutstanding(c.id);
          const lifetime=getCustomerLifetime(c.id);
          const salesCount=DB.getSales().filter(s=>s.customer_id===c.id).length;
          return `<div class="list-item">
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14px">${c.name}</div>
              <div style="font-size:12px;color:var(--gray);margin-top:2px">${c.customer_type||'—'}${c.phone?' · ☎ '+c.phone:''}</div>
              <div style="font-size:11px;color:var(--gray);margin-top:3px">${salesCount} sale${salesCount===1?'':'s'} · Lifetime ${fmtMoney(lifetime)}</div>
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
      <input type="text" id="cf_name" value="${rec?.name||''}" placeholder="e.g. Alhaji Musa"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Phone</label>
        <input type="tel" id="cf_phone" value="${rec?.phone||''}" placeholder="08031234567"></div>
      <div class="field"><label>Type</label>
        <select id="cf_type">
          ${CUSTOMER_TYPES.map(t=>`<option value="${t}" ${rec?.customer_type===t?'selected':''}>${t}</option>`).join('')}
        </select></div>
    </div>
    <div class="field"><label>Notes <span style="color:var(--gray);font-weight:400">optional</span></label>
      <textarea id="cf_notes" placeholder="Any notes about this customer">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveCustomer('${editId||''}')">Save</button>`);
}
function saveCustomer(editId){
  const name=document.getElementById('cf_name').value.trim();
  if(!name){toast('Name is required');return;}
  const norm=normalizeCustomerName(name);
  const existing=findCustomerByName(name);
  if(existing&&existing.id!==editId){toast('A customer with this name already exists');return;}
  const original=editId?DB.getCustomer(editId):null;
  const rec={
    id:editId||uid(),
    name,
    name_normalized:norm,
    phone:document.getElementById('cf_phone').value.trim(),
    customer_type:document.getElementById('cf_type').value,
    notes:document.getElementById('cf_notes').value.trim(),
    created_at:original?.created_at||DB.today()
  };
  if(editId){DB.updCustomer(editId,rec);confirmSave('Customer updated');}
  else{DB.addCustomer(rec);confirmSave('Customer added');}
  closeModal();renderFinance();
}
function delCustomer(id){
  const c=DB.getCustomer(id);
  const salesCount=DB.getSales().filter(s=>s.customer_id===id).length;
  if(salesCount>0){
    openModal(`<div class="modal-ttl">Cannot Delete <button class="modal-x" onclick="closeModal()">×</button></div>
      <p style="font-size:14px;color:var(--gray);margin-bottom:18px"><b>${c?.name||'This customer'}</b> has ${salesCount} sale${salesCount===1?'':'s'} linked. Delete or reassign those sales first.</p>
      <button class="btn btn-secondary" onclick="closeModal()">OK</button>`);
    return;
  }
  openModal(`<div class="modal-ttl">Delete Customer? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">Delete <b>${c?.name||''}</b>? This cannot be undone.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();DB.delCustomer('${id}');confirmSave('Customer deleted');renderFinance()">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}

function openMergeCustomerModal(sourceId){
  const source=DB.getCustomer(sourceId);
  if(!source){toast('Customer not found');return;}
  const sourceSales=DB.getSales().filter(s=>s.customer_id===sourceId).length;
  const others=DB.getCustomers().filter(c=>c.id!==sourceId).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const safeName=String(source.name).replace(/</g,'&lt;');
  const sourceOwing=getCustomerOutstanding(sourceId);
  const sourceLifetime=getCustomerLifetime(sourceId);
  if(others.length===0){
    openModal(`<div class="modal-ttl">Cannot Merge <button class="modal-x" onclick="closeModal()">×</button></div>
      <p style="font-size:14px;color:var(--gray);margin-bottom:18px">There are no other customers to merge <b>${safeName}</b> into. Create the target customer first, then try again.</p>
      <button class="btn btn-secondary" onclick="closeModal()">OK</button>`);
    return;
  }
  openModal(`<div class="modal-ttl">Merge ${safeName} into… <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="margin:-6px 0 12px;padding:10px 12px;background:var(--g5);border-radius:8px;font-size:13px">
      <div style="font-weight:700;color:var(--g2)">${safeName}</div>
      <div style="font-size:12px;color:var(--g1);margin-top:4px">${sourceSales} sale${sourceSales===1?'':'s'} · Lifetime ${fmtMoney(sourceLifetime)}${sourceOwing>0?` · <b style="color:var(--amber)">Owing ${fmtMoney(sourceOwing)}</b>`:''}</div>
      <div style="font-size:11px;color:var(--gray);margin-top:6px">All sales linked to this customer will be re-linked to the target. This customer record will then be deleted. Sales are not edited financially — bypasses the 7-day lock safely.</div>
    </div>
    <div class="field"><label>Search customers</label>
      <input type="text" id="mc_search" placeholder="Type to filter…" oninput="filterMergeCustomerList()" autocomplete="off"></div>
    <div id="mc_list" style="max-height:340px;overflow-y:auto;border:1px solid #e0e0e0;border-radius:8px">
      ${others.map(c=>{
        const owing=getCustomerOutstanding(c.id);
        const lifetime=getCustomerLifetime(c.id);
        const salesCount=DB.getSales().filter(s=>s.customer_id===c.id).length;
        const dataName=(c.name||'').toLowerCase();
        const dataPhone=(c.phone||'').toLowerCase();
        return `<div class="mc-row" data-name="${dataName}" data-phone="${dataPhone}" style="padding:10px 12px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer" onclick="confirmMergeCustomer('${sourceId}','${c.id}')">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:13px">${c.name}</div>
            <div style="font-size:11px;color:var(--gray);margin-top:2px">${c.customer_type||'—'}${c.phone?' · ☎ '+c.phone:''} · ${salesCount} sale${salesCount===1?'':'s'} · ${fmtMoney(lifetime)}</div>
          </div>
          <div style="flex-shrink:0;text-align:right">
            ${owing>0?`<div style="font-size:11px;color:var(--amber);font-weight:700">Owing ${fmtMoney(owing)}</div>`:''}
            <div style="font-size:11px;color:var(--blue);font-weight:600;margin-top:2px">Pick →</div>
          </div>
        </div>`;
      }).join('')}
    </div>`);
}
function filterMergeCustomerList(){
  const q=(document.getElementById('mc_search')?.value||'').trim().toLowerCase();
  const rows=document.querySelectorAll('.mc-row');
  rows.forEach(r=>{
    const n=r.dataset.name||'',p=r.dataset.phone||'';
    r.style.display=(!q||n.includes(q)||p.includes(q))?'flex':'none';
  });
}
function confirmMergeCustomer(sourceId,targetId){
  const source=DB.getCustomer(sourceId);
  const target=DB.getCustomer(targetId);
  if(!source||!target){toast('Lookup failed');return;}
  const sourceSales=DB.getSales().filter(s=>s.customer_id===sourceId).length;
  const sourceOwing=getCustomerOutstanding(sourceId);
  openModal(`<div class="modal-ttl">Confirm Merge <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--g1);margin-bottom:14px">
      Re-link <b>${sourceSales}</b> sale${sourceSales===1?'':'s'} from <b>${source.name}</b> to <b>${target.name}</b>, then delete <b>${source.name}</b>?
    </p>
    ${sourceOwing>0?`<div style="background:var(--amberBg);border-left:3px solid var(--amber);padding:8px 10px;border-radius:0 6px 6px 0;font-size:12px;color:#7d4e00;margin-bottom:14px">
      <b>${fmtMoney(sourceOwing)}</b> in outstanding receivables will move to ${target.name}.
    </div>`:''}
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-primary" onclick="doMergeCustomer('${sourceId}','${targetId}')">Merge into ${target.name}</button>
      <button class="btn btn-secondary" onclick="openMergeCustomerModal('${sourceId}')">Back</button>
    </div>`);
}
function doMergeCustomer(sourceId,targetId){
  const result=mergeCustomers(sourceId,targetId);
  closeModal();
  if(result){
    confirmSave(`Merged ${result.sourceName} → ${result.targetName} · ${result.movedSales} sale${result.movedSales===1?'':'s'} re-linked`);
    renderFinance();
  } else {
    toast('Merge failed');
  }
}

let MIG_SKIPPED=new Set();
function openMigrationModal(){
  const groups=getLegacySaleGroups().filter(g=>!MIG_SKIPPED.has(g.normalized));
  const allGroups=getLegacySaleGroups();
  if(allGroups.length===0){
    openModal(`<div class="modal-ttl">All Done ✓ <button class="modal-x" onclick="closeModal()">×</button></div>
      <p style="font-size:14px;color:var(--gray);margin-bottom:18px">No legacy sales left to migrate — every sale is linked to a customer record.</p>
      <button class="btn btn-primary" onclick="closeModal()">Close</button>`);
    return;
  }
  if(groups.length===0){
    openModal(`<div class="modal-ttl">All Reviewed <button class="modal-x" onclick="closeModal()">×</button></div>
      <p style="font-size:14px;color:var(--gray);margin-bottom:18px">All remaining groups are skipped. Reset the skip list to review them again.</p>
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
        <div style="text-align:right;flex-shrink:0;font-size:12px;color:var(--g1)">
          <div><b>${g.saleCount}</b> sale${g.saleCount===1?'':'s'}</div>
          <div style="color:var(--gray)">Lifetime ${fmtMoney(g.lifetime)}</div>
          ${g.outstanding>0?`<div style="color:var(--amber);font-weight:700">Owing ${fmtMoney(g.outstanding)}</div>`:''}
        </div>
      </div>
      ${ec?`
        <div style="background:var(--blueBg);border-left:3px solid var(--blue);padding:8px 10px;border-radius:0 6px 6px 0;font-size:12px;color:#1a5fa8;margin-bottom:8px">
          ✓ Customer record already exists${ec.customer_type?` (${ec.customer_type})`:''}${ec.phone?` · ☎ ${ec.phone}`:''}. Linking will attach these sales to it.
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
        <button class="btn btn-primary btn-sm" onclick="migrateGroupFromModal('${g.normalized.replace(/'/g,"\\'")}','${idSlug}')">${ec?'Link':'Create &amp; Link'} ${g.saleCount} sale${g.saleCount===1?'':'s'}</button>
      </div>
    </div>`;
  }).join('');
  openModal(`<div class="modal-ttl">Migrate Customers <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:13px;color:var(--gray);margin-bottom:12px">
      ${groups.length} group${groups.length===1?'':'s'} · ${totalSales} sale${totalSales===1?'':'s'} to link.
      Edit details if needed, then link each one — or use Auto-Migrate to process all remaining with defaults.
    </p>
    ${cards}
    <button class="btn btn-amber" style="width:100%;margin-top:8px" onclick="autoMigrateAll()">Auto-Migrate All Remaining (${groups.length})</button>`);
}
function migrateGroupFromModal(normalized,idSlug){
  const overrides={};
  const nameEl=document.getElementById('mig_name_'+idSlug);
  const phoneEl=document.getElementById('mig_phone_'+idSlug);
  const typeEl=document.getElementById('mig_type_'+idSlug);
  if(nameEl)overrides.name=nameEl.value.trim();
  if(phoneEl)overrides.phone=phoneEl.value.trim();
  if(typeEl)overrides.customer_type=typeEl.value;
  const result=migrateLegacyGroup(normalized,overrides);
  if(result){
    confirmSave(`Linked ${result.saleCount} sale${result.saleCount===1?'':'s'}`);
    MIG_SKIPPED.delete(normalized);
    openMigrationModal();
  } else {
    toast('Migration failed — group not found');
  }
}
function skipMigrationGroup(normalized){
  MIG_SKIPPED.add(normalized);
  openMigrationModal();
}
function autoMigrateAll(){
  const groups=getLegacySaleGroups().filter(g=>!MIG_SKIPPED.has(g.normalized));
  if(groups.length===0){toast('Nothing to migrate');return;}
  openModal(`<div class="modal-ttl">Auto-Migrate ${groups.length}? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">
      This will create customer records for all ${groups.length} remaining groups using the most common spelling as the name and "Individual" as the default type. Phone numbers will be blank — you can fill them later from the Customers tab.
    </p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-primary" onclick="doAutoMigrateAll()">Migrate All</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
function doAutoMigrateAll(){
  const groups=getLegacySaleGroups().filter(g=>!MIG_SKIPPED.has(g.normalized));
  let linked=0,saleCount=0;
  groups.forEach(g=>{
    const result=migrateLegacyGroup(g.normalized,{});
    if(result){linked++;saleCount+=result.saleCount;}
  });
  closeModal();
  confirmSave(`Migrated ${linked} customer${linked===1?'':'s'} · ${saleCount} sale${saleCount===1?'':'s'} linked`);
  renderSettings();
}
