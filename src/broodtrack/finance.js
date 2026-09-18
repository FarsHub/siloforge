// ═══════════════════════════════════════════════
// FINANCE — EXPENSES + POL SALES + P&L
// ═══════════════════════════════════════════════
// ── FINANCE ─────────────────────────────────────
// Sales carry payment_type: 'cash' | 'credit'
// Credit sales are NOT paid (paid:false) until marked.
// Receivables tab = sales.filter(credit). No separate store needed.
let FIN_TAB='expenses';
let _activeBatchId=null;
let _finAllBatches=false;
let SETTINGS_TYPE=null;
function renderFinance(){
  const el=document.getElementById('v-finance'), today=DB.today(), thisMonth=today.slice(0,7);
  const allExpenses=DB.getExpenses().sort((a,b)=>b.date.localeCompare(a.date));
  const allSalesRaw=DB.getSales().sort((a,b)=>b.date.localeCompare(a.date));
  const showAll=_finAllBatches||!_activeBatchId;
  const expenses=showAll?allExpenses:allExpenses.filter(e=>e.batch_id===_activeBatchId);
  const sales=showAll?allSalesRaw:allSalesRaw.filter(s=>s.batch_id===_activeBatchId);
  const batch=_activeBatchId?DB.getBatches().find(b=>b.id===_activeBatchId):null;
  const monthExp=expenses.filter(e=>e.date.startsWith(thisMonth)).reduce((s,e)=>s+(e.amount_ngn||0),0);
  const monthSales=sales.filter(s=>s.date.startsWith(thisMonth)).reduce((s,e)=>s+(e.total_amount_ngn||0),0);
  const allExp=expenses.reduce((s,e)=>s+(e.amount_ngn||0),0);
  const allSales=sales.reduce((s,e)=>s+(e.total_amount_ngn||0),0);
  const creditSales=sales.filter(s=>s.payment_type==='credit');
  const unpaidCredit=creditSales.filter(s=>getSaleBalance(s)>0.5);
  // Owed is the sum of remaining balances, so a part payment reduces it.
  const totalOwed=unpaidCredit.reduce((s,r)=>s+getSaleBalance(r),0);
  const overdueCount=unpaidCredit.filter(s=>s.due_date&&s.due_date<today).length;
  const openOrders=DB.getOrders().filter(isOrderOpen);
  const openOrderCount=openOrders.length;
  const depositsHeld=openOrders.reduce((sum,o)=>sum+orderDepositTotal(o.id),0);
  const scopeBar=(FIN_TAB==='orders'||FIN_TAB==='customers')?'':_activeBatchId
    ?`<div class="fin-scope-bar">${showAll?'All Batches':'Batch: <b style="margin-left:4px">'+batch?.name+'</b>'}
        <button class="scope-toggle" onclick="_finAllBatches=!_finAllBatches;renderFinance()">${showAll?'Filter by Batch':'View All Batches'}</button>
      </div>`
    :'';

  let tabContent='';
  if(FIN_TAB==='expenses'){
    tabContent=`<div style="margin:12px 16px"><button class="btn btn-primary" onclick="openExpenseForm()">+ Add Expense</button></div>
      <div class="card" style="padding:0;overflow:hidden">
        ${expenses.slice(0,50).map(e=>`<div class="list-item">
          <div><div style="font-weight:700;font-size:14px">${e.category}${e.feed_stock_id?' <span class="badge badge-purple" style="vertical-align:middle">🌾 Feed store</span>':''}</div>
            <div style="font-size:12px;color:var(--gray)">${fmtDate(e.date)}${e.batch_name?' · '+e.batch_name:''} · ${e.notes||'—'}</div></div>
          <div style="text-align:right">
            <div style="font-weight:800;color:var(--red)">${fmtMoney(e.amount_ngn)}</div>
            <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end">
              ${isLocked(e.date)?LOCK_BADGE:`<button class="btn btn-secondary btn-sm" onclick="openExpenseForm('${e.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="delExpense('${e.id}')">✕</button>`}
            </div></div></div>`).join('')||'<div class="empty" style="padding:24px"><p>No expenses logged yet.</p></div>'}
      </div>`;

  } else if(FIN_TAB==='sales'){
    tabContent=`<div style="margin:12px 16px"><button class="btn btn-primary" onclick="openSaleForm()">+ Record Sale</button></div>
      <div style="margin:0 16px 8px;background:var(--g5);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--g1)">
        💡 Choose <b>Cash</b> if payment was collected on the spot, or <b>Credit</b> if the buyer takes birds and pays later — credit sales automatically appear in Receivables.
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        ${sales.length===0?'<div class="empty" style="padding:24px"><p>No sales recorded yet.</p></div>':
          sales.slice(0,50).map(s=>{
            const isCash=!s.payment_type||s.payment_type==='cash';
            const isCredit=s.payment_type==='credit';
            const bal=getSaleBalance(s);
            const paid=getSalePaid(s);
            const fullyPaid=bal<=0.5;
            const partial=isCredit&&paid>0.5&&!fullyPaid;
            const overdue=isCredit&&!fullyPaid&&s.due_date&&s.due_date<today;
            const payBadge=isCash
              ?`<span class="badge badge-green">Cash</span>`
              :fullyPaid
                ?`<span class="badge badge-green">Credit — Paid ✓</span>`
                :overdue
                  ?`<span class="badge badge-red">Credit — Overdue</span>`
                  :partial
                    ?`<span class="badge badge-amber">Credit — Partial</span>`
                    :`<span class="badge badge-amber">Credit — Pending</span>`;
            const custName=(s.customer_id?DB.getCustomer(s.customer_id)?.name:null)||s.buyer||'';
            const fromOrder=s.order_id?DB.getOrder(s.order_id):null;
            return`<div class="list-item">
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px">${s.batch_name||'—'} — ${s.quantity} birds @ Wk ${s.age_weeks_at_sale||'—'}</div>
                <div style="font-size:12px;color:var(--gray);margin-top:2px">${fmtDate(s.date)}${custName?' · '+custName:''}${fromOrder?` · <span class="badge badge-gray" style="font-size:10px">${fromOrder.ref||'from order'}</span>`:''}</div>
                <div style="margin-top:4px">${payBadge}${isCredit&&s.due_date?`<span style="font-size:11px;color:var(--gray);margin-left:6px">Due ${fmtDate(s.due_date)}</span>`:''}</div>
                ${partial?`<div style="font-size:11px;color:var(--p1);margin-top:3px">Paid ${fmtMoney(paid)} · Owing <b style="color:var(--amber)">${fmtMoney(bal)}</b></div>`:''}
                ${s.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-top:4px">"${s.notes}"</div>`:''}
              </div>
              <div style="text-align:right;flex-shrink:0;margin-left:10px">
                <div style="font-weight:800;color:var(--g2)">${fmtMoney(s.total_amount_ngn)}</div>
                <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;flex-wrap:wrap">
                  ${isCredit&&!fullyPaid?`<button class="btn btn-primary btn-sm" onclick="openPaymentForm('${s.id}')">+ Payment</button>`:''}
                  <button class="btn btn-secondary btn-sm" onclick="openSaleDoc('${s.id}')">${fullyPaid?'Receipt':'Invoice'}</button>
                  ${s.batch_id?`<button class="btn btn-green btn-sm" onclick="openPassport('${s.id}')">Passport</button>`:''}
                  ${isLocked(s.date)?LOCK_BADGE:`<button class="btn btn-secondary btn-sm" onclick="openSaleForm('${s.id}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="delSale('${s.id}')">✕</button>`}
                </div>
              </div></div>`;
          }).join('')}
      </div>`;

  } else if(FIN_TAB==='recv'){
    tabContent=`
      ${overdueCount>0?`<div style="margin:12px 16px 0"><div class="alert-item alert-red">⚠ ${overdueCount} overdue payment${overdueCount>1?'s':''} — follow up with buyer${overdueCount>1?'s':''}</div></div>`:''}
      <div style="margin:12px 16px 8px;background:#e8f4fd;border-left:3px solid #4895ef;padding:10px 12px;border-radius:0 8px 8px 0;font-size:12px;color:#1a5fa8">
        POL sales on credit appear here automatically. To log a new credit sale, go to <b>POL Sales</b> and select <b>Credit</b> as the payment type — no double entry needed.
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        ${creditSales.length===0
          ?`<div class="empty" style="padding:24px"><p>No credit sales yet.</p><p style="font-size:12px;margin-top:6px">Record a sale in POL Sales and select "Credit (pay later)".</p></div>`
          :creditSales.sort((a,b)=>b.date.localeCompare(a.date)).map(s=>{
            const bal=getSaleBalance(s);
            const paid=getSalePaid(s);
            const fullyPaid=bal<=0.5;
            const partial=paid>0.5&&!fullyPaid;
            const overdue=!fullyPaid&&s.due_date&&s.due_date<today;
            const statusCls=fullyPaid?'badge-green':overdue?'badge-red':'badge-amber';
            const statusTxt=fullyPaid?'Paid ✓':overdue?'Overdue':partial?'Partial':'Pending';
            const cust=s.customer_id?DB.getCustomer(s.customer_id):null;
            const custName=cust?.name||s.buyer||'Unknown buyer';
            const custSub=cust?`${cust.customer_type||'—'}${cust.phone?' · ☎ '+cust.phone:''}`:'';
            return`<div class="list-item">
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px">${custName}</div>
                ${custSub?`<div style="font-size:11px;color:var(--gray);margin-top:1px">${custSub}</div>`:''}
                <div style="font-size:12px;color:var(--gray)">${s.batch_name||'—'} · ${s.quantity} birds · ${fmtDate(s.date)}</div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
                  <span class="badge ${statusCls}">${statusTxt}</span>
                  ${s.due_date?`<span style="font-size:11px;color:${overdue?'var(--red)':'var(--gray)'}">${overdue?'Overdue since ':' Due '}${fmtDate(s.due_date)}</span>`:''}
                </div>
                ${partial?`<div style="font-size:11px;color:var(--p1);margin-top:3px">Paid ${fmtMoney(paid)} of ${fmtMoney(s.total_amount_ngn)}</div>`:''}
              </div>
              <div style="text-align:right;flex-shrink:0;margin-left:10px">
                <div style="font-weight:800;color:${fullyPaid?'var(--gray)':overdue?'var(--red)':'var(--amber)'}">${fmtMoney(fullyPaid?s.total_amount_ngn:bal)}</div>
                ${!fullyPaid?`<div style="font-size:10px;color:var(--gray)">outstanding</div>`:''}
                <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;flex-wrap:wrap">
                  ${!fullyPaid?`<button class="btn btn-primary btn-sm" onclick="openPaymentForm('${s.id}')">+ Payment</button>`:''}
                  <button class="btn btn-secondary btn-sm" onclick="openSaleDoc('${s.id}')">${fullyPaid?'Receipt':'Invoice'}</button>
                  ${isLocked(s.date)?LOCK_BADGE:`<button class="btn btn-secondary btn-sm" onclick="openSaleForm('${s.id}')">Edit</button>`}
                </div>
              </div></div>`;
          }).join('')}
      </div>`;

  } else if(FIN_TAB==='orders'){
    tabContent=renderOrdersTab();

  } else if(FIN_TAB==='customers'){
    tabContent=renderCustomersTab();

  } else if(FIN_TAB==='pl'){
    const batches=DB.getBatches();
    const batchPL=batches.map(b=>{
      const bExp=expenses.filter(e=>e.batch_id===b.id).reduce((s,e)=>s+(e.amount_ngn||0),0);
      const bSales=sales.filter(s=>s.batch_id===b.id).reduce((s,e)=>s+(e.total_amount_ngn||0),0);
      const bOwed=sales.filter(s=>s.batch_id===b.id&&s.payment_type==='credit')
        .reduce((sum,e)=>sum+getSaleBalance(e),0);
      const birds=getBatchBirdCount(b), sold=sales.filter(s=>s.batch_id===b.id).reduce((s,e)=>s+(e.quantity||0),0);
      return{batch:b,exp:bExp,sales:bSales,owed:bOwed,profit:bSales-bExp,birds,sold,
        costPerBird:birds>0?(bExp/birds):null,revenuePerBird:sold>0?(bSales/sold):null};
    });
    tabContent=`<div class="sec-hdr" style="margin-top:8px">Batch Profit & Loss</div>
      ${batchPL.map(pl=>`<div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div><div style="font-weight:800;font-size:15px">${pl.batch.name}</div>
            <div style="font-size:12px;color:var(--gray)">${pl.batch.breed} · ${pl.batch.status}</div></div>
          <span class="badge ${pl.profit>=0?'badge-green':pl.profit>-50000?'badge-amber':'badge-red'}">${pl.profit>=0?'Profitable':'Loss'}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--red)">${fmtMoney(pl.exp)}</div><div class="kpi-lbl">Total Cost</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--g2)">${fmtMoney(pl.sales)}</div><div class="kpi-lbl">Total Revenue</div></div>
          <div class="kpi-sm" style="grid-column:1/-1"><div class="kpi-val" style="color:${pl.profit>=0?'var(--g2)':'var(--red)'}">${pl.profit>=0?'+':''}${fmtMoney(pl.profit)}</div><div class="kpi-lbl">Net Profit/Loss</div></div>
        </div>
        ${pl.owed>0?`<div style="background:var(--amberBg);border-radius:6px;padding:6px 10px;font-size:12px;color:#7d4e00;margin-bottom:8px">⏳ ${fmtMoney(pl.owed)} still owed by buyer — not yet collected</div>`:''}
        <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--gray)">
          <span>Cost/bird: <b style="color:var(--p2)">${pl.costPerBird?fmtMoney(pl.costPerBird):'—'}</b></span>
          <span>Revenue/bird sold: <b style="color:var(--g2)">${pl.revenuePerBird?fmtMoney(pl.revenuePerBird):'—'}</b></span>
        </div>
      </div>`).join('')||'<div class="empty" style="padding:24px"><p>No batches yet.</p></div>'}`;
  }

  el.innerHTML=`<div class="topbar"><div><h1>Finance</h1><small>Brooding costs & POL sales</small></div></div>
    ${scopeBar}
    <div class="kpi-row-3">
      <div class="kpi"><div class="kpi-val" style="color:var(--g2)">${fmtMoney(monthSales)}</div><div class="kpi-lbl">Sales (Month)</div></div>
      <div class="kpi"><div class="kpi-val" style="color:var(--red)">${fmtMoney(monthExp)}</div><div class="kpi-lbl">Expenses (Month)</div></div>
      <div class="kpi" style="${overdueCount>0?'border:2px solid var(--red)':totalOwed>0?'border:2px solid var(--amber)':''}">
        <div class="kpi-val" style="color:${overdueCount>0?'var(--red)':totalOwed>0?'var(--amber)':'var(--gray)'}">${fmtMoney(totalOwed)}</div>
        <div class="kpi-lbl">Owed to You</div>
      </div>
    </div>
    <div style="margin:0 16px 8px;background:var(--g5);border-radius:10px;padding:12px;display:flex;justify-content:space-between;gap:12px">
      <div><div style="font-size:11px;color:var(--g1);font-weight:700;text-transform:uppercase">All-Time Net</div>
        <div style="font-size:20px;font-weight:800;color:${allSales-allExp>=0?'var(--g2)':'var(--red)'}">${allSales-allExp>=0?'+':''}${fmtMoney(allSales-allExp)}</div></div>
      <div style="text-align:right"><div style="font-size:11px;color:var(--g1);font-weight:700;text-transform:uppercase">Cash Collected</div>
        <div style="font-size:20px;font-weight:800;color:var(--g2)">${fmtMoney(sales.reduce((s,e)=>s+getSalePaid(e),0))}</div></div>
    </div>
    ${depositsHeld>0?`<div style="margin:0 16px 8px;background:var(--p5);border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--p1)">
      <span>💰 Deposits held against open orders</span><b style="font-size:15px">${fmtMoney(depositsHeld)}</b>
    </div>`:''}
    <div class="inner-tabs">
      <button class="inner-tab ${FIN_TAB==='expenses'?'active':''}" onclick="FIN_TAB='expenses';renderFinance()">Expenses</button>
      <button class="inner-tab ${FIN_TAB==='orders'?'active':''}" onclick="FIN_TAB='orders';renderFinance()">Orders${openOrderCount>0?' ('+openOrderCount+')':''}</button>
      <button class="inner-tab ${FIN_TAB==='sales'?'active':''}" onclick="FIN_TAB='sales';renderFinance()">Sales</button>
      <button class="inner-tab ${FIN_TAB==='recv'?'active':''}" onclick="FIN_TAB='recv';renderFinance()">Receivables${overdueCount>0?' 🔴':unpaidCredit.length>0?' ('+unpaidCredit.length+')':''}</button>
      <button class="inner-tab ${FIN_TAB==='customers'?'active':''}" onclick="FIN_TAB='customers';renderFinance()">Customers</button>
      <button class="inner-tab ${FIN_TAB==='pl'?'active':''}" onclick="FIN_TAB='pl';renderFinance()">Batch P&L</button>
    </div>
    ${tabContent}
    <div style="height:12px"></div>`;
}

function openExpenseForm(editId){
  const today=DB.today(), rec=editId?DB.getExpenses().find(e=>e.id===editId):null;
  const active=getActiveBatches();
  // A feed-store purchase owns its expense. Say so, and point at the record that
  // actually drives the figure, rather than letting an edit here be overwritten.
  const linked=rec?.feed_stock_id?DB.getFeedStock().find(r=>r.id===rec.feed_stock_id):null;
  openModal(`<div class="modal-ttl">${rec?'Edit':'Add'} Expense <button class="modal-x" onclick="closeModal()">×</button></div>
    ${linked?`<div style="background:#e8f4fd;border-left:3px solid #4895ef;padding:8px 12px;border-radius:0 6px 6px 0;font-size:12px;color:#1a5fa8;margin-bottom:12px">
      🌾 Created by a feed store purchase (${linked.bags||0} bag${linked.bags===1?'':'s'} ${linked.feed_type}). Edit the purchase instead — changes made here are replaced next time it is saved.
      <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="closeModal();FEED_TAB='store';go('feed');openFeedPurchase('${linked.id}')">Open the purchase</button>
    </div>`:''}
    <div class="field"><label>Date</label><input type="date" id="ef_date" value="${rec?rec.date:today}" max="${today}"></div>
    ${active.length?`<div class="field"><label>Batch <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <select id="ef_batch"><option value="">Not batch-specific</option>${active.map(b=>`<option value="${b.id}" ${rec?.batch_id===b.id?'selected':''} >${b.name}</option>`).join('')}</select></div>`:' <input type="hidden" id="ef_batch" value="">'}
    <div class="field"><label>Category</label>
      <select id="ef_cat">${BROOD_EXPENSE_CATS.map(c=>`<option value="${c}" ${rec?.category===c?'selected':''} >${c}</option>`).join('')}</select></div>
    <div class="field"><label>Amount (₦ NGN)</label><input type="number" id="ef_ngn" value="${rec?.amount_ngn||''}" min="0" step="100" placeholder="0"></div>
    <div class="field"><label>Notes</label><textarea id="ef_notes" placeholder="e.g. 10 bags of chick mash">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveExpense('${editId||''}')">Save</button>`);
}
function saveExpense(editId){
  const batchId=document.getElementById('ef_batch')?.value||''  ;
  const batch=batchId?DB.getBatches().find(b=>b.id===batchId):null;
  const rec={id:editId||uid(),date:document.getElementById('ef_date').value,
    batch_id:batchId,batch_name:batch?.name||''  ,
    category:document.getElementById('ef_cat').value,
    amount_ngn:parseFloat(document.getElementById('ef_ngn').value)||0,
    amount_usd:0,notes:document.getElementById('ef_notes').value.trim()};
  if(editId)DB.updExpense(editId,rec);else DB.addExpense(rec);
  closeModal();confirmSave('Expense saved');renderFinance();
}
function delExpense(id){openModal(`<div class="modal-ttl">Delete? <button class="modal-x" onclick="closeModal()">×</button></div>
  <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
    <button class="btn btn-danger" onclick="closeModal();DB.delExpense('${id}');confirmSave('Deleted');renderFinance()">Delete</button>
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);}
