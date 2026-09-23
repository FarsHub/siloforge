// ═══════════════════════════════════════════════
// CUSTOMER + PAYMENT HELPERS
// ═══════════════════════════════════════════════
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
  const customers=DB.getCustomers();
  const scored=customers.map(c=>{
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
function getSalePayments(saleId){
  return DB.paymentsForSale(saleId).sort((a,b)=>a.date.localeCompare(b.date));
}
function getSalePaid(sale){
  if(!sale)return 0;
  const total=Number(sale.total_amount_ngn||0);
  const fromPayments=getSalePayments(sale.id).reduce((s,p)=>s+Number(p.amount_ngn||0),0);
  if(fromPayments>0)return Math.min(total,fromPayments);
  // Legacy fallback: pre-payments-log sales used a `paid` boolean only.
  if(sale.paid)return total;
  if(sale.payment_type!=='credit')return total;
  return 0;
}
function getSaleBalance(sale){
  return Math.max(0, Number(sale?.total_amount_ngn||0) - getSalePaid(sale));
}
function getCustomerOutstanding(customerId){
  if(!customerId)return 0;
  return DB.getSales()
    .filter(s=>s.customer_id===customerId&&s.payment_type==='credit')
    .reduce((sum,s)=>sum+getSaleBalance(s),0);
}
function getCustomerLifetime(customerId){
  if(!customerId)return 0;
  return DB.getSales()
    .filter(s=>s.customer_id===customerId)
    .reduce((sum,s)=>sum+Number(s.total_amount_ngn||0),0);
}
function getLegacySaleGroups(){
  const legacy=DB.getSales().filter(s=>s.customer&&!s.customer_id&&normalizeCustomerName(s.customer));
  const groups={};
  legacy.forEach(s=>{
    const norm=normalizeCustomerName(s.customer);
    if(!groups[norm]){
      const variantCounts={};
      groups[norm]={normalized:norm,sales:[],variants:[],variantCounts};
    }
    groups[norm].sales.push(s);
    const variant=String(s.customer).trim();
    groups[norm].variantCounts[variant]=(groups[norm].variantCounts[variant]||0)+1;
  });
  return Object.values(groups).map(g=>{
    const variants=Object.entries(g.variantCounts).sort((a,b)=>b[1]-a[1]);
    const canonical=variants[0]?variants[0][0]:g.normalized;
    const existingCustomer=findCustomerByName(g.normalized);
    const lifetime=g.sales.reduce((s,r)=>s+Number(r.total_amount_ngn||0),0);
    const outstanding=g.sales
      .filter(s=>s.payment_type==='credit')
      .reduce((s,r)=>s+getSaleBalance(r),0);
    return {
      normalized:g.normalized,
      sales:g.sales,
      variants:variants.map(([v,c])=>({label:v,count:c})),
      canonical,
      existingCustomer,
      lifetime,
      outstanding,
      saleCount:g.sales.length
    };
  }).sort((a,b)=>b.saleCount-a.saleCount);
}
// Credit policy — owner-tunable thresholds for the portfolio gate.
const CREDIT_POLICY_DEFAULTS={basePct:30,targetDaysOnHand:5,flexPctPerDay:5,maxFlexPct:30,velocityWindowDays:14};
function getCreditPolicy(){
  const farm=DB.getFarm()||{};
  const p=farm.creditPolicy||{};
  return {
    basePct:Number.isFinite(p.basePct)?p.basePct:CREDIT_POLICY_DEFAULTS.basePct,
    targetDaysOnHand:Number.isFinite(p.targetDaysOnHand)?p.targetDaysOnHand:CREDIT_POLICY_DEFAULTS.targetDaysOnHand,
    flexPctPerDay:Number.isFinite(p.flexPctPerDay)?p.flexPctPerDay:CREDIT_POLICY_DEFAULTS.flexPctPerDay,
    maxFlexPct:Number.isFinite(p.maxFlexPct)?p.maxFlexPct:CREDIT_POLICY_DEFAULTS.maxFlexPct,
    velocityWindowDays:Number.isFinite(p.velocityWindowDays)?p.velocityWindowDays:CREDIT_POLICY_DEFAULTS.velocityWindowDays
  };
}
function saveCreditPolicy(policy){
  const farm=DB.getFarm()||{pens:[]};
  farm.creditPolicy={...getCreditPolicy(),...policy};
  DB.saveFarm(farm);
}
function getRecentCrateVelocity(){
  const policy=getCreditPolicy();
  const days=Math.max(1,policy.velocityWindowDays);
  const cutoff=new Date(DB.today()+'T00:00:00');
  cutoff.setDate(cutoff.getDate()-days);
  const cutoffStr=cutoff.toISOString().slice(0,10);
  const cratesMoved=DB.getSales()
    .filter(s=>s.product==='Eggs — Crates'&&s.date>=cutoffStr&&s.date<=DB.today())
    .reduce((sum,s)=>sum+Number(s.quantity||0),0);
  return cratesMoved/days;
}
function getCommittedCreditCrates(){
  return DB.getSales()
    .filter(s=>s.product==='Eggs — Crates'&&s.payment_type==='credit')
    .reduce((sum,s)=>{
      const total=Number(s.total_amount_ngn||0);
      if(total<=0)return sum;
      const bal=getSaleBalance(s);
      if(bal<=0)return sum;
      return sum+Number(s.quantity||0)*(bal/total);
    },0);
}
function getCreditEnvelope(){
  const policy=getCreditPolicy();
  const stock=getEggStock();
  const availableCrates=stock.crates;
  const velocity=getRecentCrateVelocity();
  const daysOnHand=velocity>0?availableCrates/velocity:Infinity;
  const target=policy.targetDaysOnHand;
  const excess=Math.max(0,daysOnHand-target);
  const rawFlex=excess*policy.flexPctPerDay;
  const flexPct=Number.isFinite(rawFlex)?Math.min(policy.maxFlexPct,rawFlex):policy.maxFlexPct;
  const effectivePct=policy.basePct+flexPct;
  const envelopeCrates=Math.floor(availableCrates*effectivePct/100);
  const committedCrates=getCommittedCreditCrates();
  const headroomCrates=envelopeCrates-committedCrates;
  return {
    policy,availableCrates,velocity,daysOnHand,
    basePct:policy.basePct,flexPct,effectivePct,
    envelopeCrates,committedCrates,headroomCrates
  };
}
function mergeCustomers(sourceId,targetId){
  if(!sourceId||!targetId||sourceId===targetId)return null;
  const source=DB.getCustomer(sourceId);
  const target=DB.getCustomer(targetId);
  if(!source||!target)return null;
  const sourceSales=DB.getSales().filter(s=>s.customer_id===sourceId);
  sourceSales.forEach(s=>{DB.updSale(s.id,{customer_id:targetId,customer:target.name});});
  DB.delCustomer(sourceId);
  return {movedSales:sourceSales.length,sourceName:source.name,targetName:target.name};
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
    const newCust={
      id:uid(),
      name,
      name_normalized:normalizeCustomerName(name),
      phone:overrides?.phone||'',
      customer_type:overrides?.customer_type||'Individual',
      notes:'',
      created_at:DB.today()
    };
    DB.addCustomer(newCust);
    customerId=newCust.id;
  }
  group.sales.forEach(s=>{DB.updSale(s.id,{customer_id:customerId});});
  return {customerId,saleCount:group.sales.length};
}

// ═══════════════════════════════════════════════
// FINANCE — EXPENSES + SALES + RECEIVABLES
// ═══════════════════════════════════════════════
// ── FINANCE ─────────────────────────────────────
// Sales carry payment_type: 'cash' | 'credit'
// Payments are recorded in lt_payments_v1 — getSaleBalance() derives outstanding.
// Receivables tab = sales.filter(credit) with positive balance. No separate store needed.
let FIN_TAB='expenses';
let _activePenId=null;
// Expenses are the only ledger that can belong to a single pen, so the pen
// scope bar is shown on that tab alone. Sales pool across pens by nature.
let _finAllPens=false;
// Set by the bulk tagger so the assignment can be taken back without hunting
// through the list. Session-only — a reload clears it.
let _bulkTagUndo=null;
function renderFinance(){
  const el=document.getElementById('v-finance');
  const allExpenses=DB.getExpenses().sort((a,b)=>b.date.localeCompare(a.date));
  const penScoped=!!_activePenId&&!_finAllPens;
  const expenses=penScoped?allExpenses.filter(e=>e.pen_id===_activePenId):allExpenses;
  const activePen=_activePenId?((DB.getFarm()||{}).pens||[]).find(p=>p.id===_activePenId):null;
  const sales=DB.getSales().sort((a,b)=>b.date.localeCompare(a.date));
  const today=DB.today(), thisMonth=today.slice(0,7);
  const monthExp=allExpenses.filter(e=>e.date.startsWith(thisMonth)).reduce((s,e)=>s+(e.amount_ngn||0),0);
  const monthSales=sales.filter(s=>s.date.startsWith(thisMonth)).reduce((s,e)=>s+(e.total_amount_ngn||0),0);
  const creditSales=sales.filter(s=>s.payment_type==='credit');
  const unpaidCredit=creditSales.filter(s=>getSaleBalance(s)>0);
  const totalOwed=unpaidCredit.reduce((s,r)=>s+getSaleBalance(r),0);
  const overdueCount=unpaidCredit.filter(s=>s.due_date&&s.due_date<today).length;
  const allPayments=DB.getPayments();
  const salesWithPayments=new Set(allPayments.map(p=>p.sale_id));
  const cashCollectedMonth=
    allPayments.filter(p=>p.date&&p.date.startsWith(thisMonth)).reduce((s,p)=>s+Number(p.amount_ngn||0),0)
    +sales.filter(s=>s.date.startsWith(thisMonth)&&!salesWithPayments.has(s.id)&&(s.payment_type==='cash'||(s.payment_type==='credit'&&s.paid))).reduce((s,e)=>s+Number(e.total_amount_ngn||0),0);

  let tabContent='';
  if(FIN_TAB==='expenses'){
    const untagged=allExpenses.filter(e=>!e.pen_id&&!e.feed_stock_id).length;
    tabContent=`
      ${activePen?`<div class="fin-scope-bar">${penScoped?'Pen: <b style="margin-left:4px">'+activePen.name+'</b>':'All pens'}
        <button class="scope-toggle" onclick="_finAllPens=!_finAllPens;renderFinance()">${penScoped?'Show All':'Filter to Pen'}</button>
      </div>`:''}
      <div style="margin:12px 16px"><button class="btn btn-primary" onclick="openExpenseForm()">+ Add Expense</button></div>
      ${_bulkTagUndo?`<div style="margin:0 16px 8px;background:var(--amberBg);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px">
        <span style="flex:1;font-size:12px;color:#7d4e00">✓ ${_bulkTagUndo.ids.length} expense${_bulkTagUndo.ids.length>1?'s':''} charged to <b>${penName(_bulkTagUndo.penId)||'a pen'}</b>.</span>
        <button class="btn btn-secondary btn-sm" style="flex-shrink:0" onclick="undoBulkTagExpenses()">Undo</button>
      </div>`:''}
      ${!penScoped&&untagged>0?`<div style="margin:0 16px 8px;background:var(--g5);border-radius:8px;padding:10px 12px">
        <div style="font-size:12px;color:var(--g1);margin-bottom:8px"><b>${untagged}</b> expense${untagged>1?'s':''} not charged to a pen.</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" style="flex:1" onclick="openBulkTagExpenses()">Assign to a Pen</button>
          <button class="btn btn-secondary btn-sm" style="flex:1" onclick="REP_TAB='pens';go('reports')">See Pen Costs</button>
        </div>
      </div>`:''}
      <div class="card" style="padding:0;overflow:hidden">
        ${expenses.length===0?`<div class="empty" style="padding:24px"><p>${penScoped?'No expenses charged to this pen yet.':'No expenses logged yet.'}</p></div>`:
          expenses.slice(0,50).map(e=>`<div class="list-item">
            <div><div style="font-weight:700;font-size:14px">${e.category}${e.feed_stock_id?' <span class="badge badge-blue" style="vertical-align:middle">🌾 Feed store</span>':''}${e.pen_id&&penName(e.pen_id)?` <span class="badge badge-green" style="vertical-align:middle">${penName(e.pen_id)}</span>`:''}</div>
              <div style="font-size:12px;color:var(--gray)">${fmtDate(e.date)} · ${e.notes||'—'}</div></div>
            <div style="text-align:right">
              <div style="font-weight:800;color:var(--red)">${fmtMoney(e.amount_ngn)}</div>
              ${e.amount_usd?`<div style="font-size:11px;color:var(--gray)">$${e.amount_usd}</div>`:''}
              <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end">
                ${isLocked(e.date)?LOCK_BADGE:`<button class="btn btn-secondary btn-sm" onclick="openExpenseForm('${e.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="delExpense('${e.id}')">✕</button>`}
              </div></div></div>`).join('')}
      </div>`;

  } else if(FIN_TAB==='sales'){
    tabContent=`
      <div style="margin:12px 16px"><button class="btn btn-primary" onclick="openSaleForm()">+ Record Sale</button></div>
      <div style="margin:0 16px 8px;background:var(--g5);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--g1)">
        💡 Choose <b>Cash</b> if payment was collected on the spot, or <b>Credit</b> if the customer takes goods and pays later — credit sales automatically appear in Receivables.
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        ${sales.length===0?'<div class="empty" style="padding:24px"><p>No sales recorded yet.</p></div>':
          sales.slice(0,50).map(s=>{
            const isCash=!s.payment_type||s.payment_type==='cash';
            const isCredit=s.payment_type==='credit';
            const bal=getSaleBalance(s);
            const paid=getSalePaid(s);
            const fullyPaid=bal<=0.5;
            const partial=isCredit&&paid>0&&!fullyPaid;
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
            const custDisplay=s.customer_id?(DB.getCustomer(s.customer_id)?.name||s.customer):s.customer;
            return`<div class="list-item">
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px">${s.product}</div>
                <div style="font-size:12px;color:var(--gray);margin-top:2px">${fmtDate(s.date)} · ${s.quantity} × ${fmtMoney(s.unit_price_ngn)}${custDisplay?' · '+custDisplay:''}</div>
                <div style="margin-top:4px">${payBadge}${isCredit&&s.due_date?`<span style="font-size:11px;color:var(--gray);margin-left:6px">Due ${fmtDate(s.due_date)}</span>`:''}</div>
                ${partial?`<div style="font-size:11px;color:var(--g1);margin-top:3px">Paid ${fmtMoney(paid)} · Owing <b style="color:var(--amber)">${fmtMoney(bal)}</b></div>`:''}
                ${s.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-top:4px">"${s.notes}"</div>`:''}
              </div>
              <div style="text-align:right;flex-shrink:0;margin-left:10px">
                <div style="font-weight:800;color:var(--g2)">${fmtMoney(s.total_amount_ngn)}</div>
                <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;flex-wrap:wrap">
                  ${isCredit&&!fullyPaid?`<button class="btn btn-primary btn-sm" onclick="openPaymentForm('${s.id}')">+ Payment</button>`:''}
                  <button class="btn btn-secondary btn-sm" onclick="openSaleDoc('${s.id}')">${fullyPaid?'Receipt':'Invoice'}</button>
                  ${isLocked(s.date)?LOCK_BADGE:`<button class="btn btn-secondary btn-sm" onclick="openSaleForm('${s.id}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="delSale('${s.id}')">✕</button>`}
                </div>
              </div></div>`;
          }).join('')}
      </div>`;

  } else if(FIN_TAB==='stock'){
    const st=getEggStock(), ledger=getEggLedger();
    const stockColor=st.available===0?'var(--red)':st.available<EGGS_PER_CRATE?'var(--amber)':'var(--g2)';
    const stockMainVal=st.available===0
      ?`<div style="font-size:36px;font-weight:800;color:var(--red);line-height:1">0</div>`
      :st.crates===0
        ?`<div style="font-size:28px;font-weight:600;color:var(--amber);line-height:1">${st.loose} pcs</div>`
        :`<div style="font-size:36px;font-weight:800;color:${stockColor};line-height:1">${st.crates} crate${st.crates>1?'s':''}</div>${st.loose>0?`<div style="font-size:13px;color:var(--gray);margin-top:4px">${st.loose} pcs</div>`:''}`;
    tabContent=`
      <div style="margin:12px 16px 8px;background:var(--g5);border-radius:var(--radius);padding:16px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--g1);margin-bottom:6px">Currently Available</div>
          ${stockMainVal}
        </div>
        <div style="text-align:right;font-size:12px;color:var(--g1);line-height:2">
          <div>+${st.collected} collected</div>
          <div style="color:var(--red)">−${st.broken} cracked</div>
          <div style="color:var(--amber)">−${Math.round(st.eggsSold/EGGS_PER_CRATE)} crates sold</div>
        </div>
      </div>
      <div class="sec-hdr" style="margin-top:4px">Movement Log</div>
      <div class="card" style="padding:0;overflow:hidden">
        ${ledger.length===0?'<div class="empty" style="padding:24px"><p>No egg data yet.</p></div>':
          ledger.map(r=>{const bCrates=Math.floor(r.balance/EGGS_PER_CRATE),bPcs=r.balance%EGGS_PER_CRATE;
          const balHtml=bCrates>0
            ?`<span style="font-weight:800;font-size:15px;color:var(--g2)">${bCrates} crate${bCrates>1?'s':''}</span>${bPcs>0?`<span style="font-size:11px;color:var(--gray);margin-left:4px">${bPcs} pcs</span>`:''}`
            :`<span style="font-weight:600;font-size:14px;color:var(--amber)">${bPcs} pcs</span>`;
          return`<div class="list-item" style="flex-direction:column;align-items:stretch;gap:4px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:700;font-size:14px">${fmtDate(r.date)}</span>
              <span>${balHtml}</span>
            </div>
            <div style="display:flex;gap:10px;font-size:12px;color:var(--gray)">
              ${r.collected>0?`<span style="color:var(--g3)">+${r.collected} collected</span>`:''}
              ${r.broken>0?`<span style="color:var(--red)">−${r.broken} cracked</span>`:''}
              ${r.soldEggs>0?`<span style="color:var(--amber)">−${r.soldCrates} crate${r.soldCrates>1?'s':''} sold</span>`:''}
            </div>
          </div>`;}).join('')}
      </div>`;

  } else if(FIN_TAB==='recv'){
    const sortedCredit=creditSales.slice().sort((a,b)=>{
      const aBal=getSaleBalance(a),bBal=getSaleBalance(b);
      if((aBal>0)!==(bBal>0))return bBal-aBal;
      return b.date.localeCompare(a.date);
    });
    const env=getCreditEnvelope();
    const utilPct=env.envelopeCrates>0?Math.min(100,env.committedCrates/env.envelopeCrates*100):0;
    const overEnvelope=env.committedCrates>env.envelopeCrates+0.5;
    const barColor=overEnvelope?'var(--red)':utilPct>80?'var(--amber)':'var(--g3)';
    const bannerBg=overEnvelope?'#fde8ea':utilPct>80?'#fef3cd':'var(--g5)';
    tabContent=`
      ${overdueCount>0?`<div style="margin:12px 16px 0"><div class="alert-item alert-red">⚠ ${overdueCount} overdue payment${overdueCount>1?'s':''} — follow up with customer${overdueCount>1?'s':''}</div></div>`:''}
      <div style="margin:12px 16px 8px;background:${bannerBg};border-radius:10px;padding:12px 14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:11px;font-weight:800;color:var(--g1);text-transform:uppercase;letter-spacing:.4px">Credit pool</div>
          <div style="font-size:12px;color:var(--g1)">${env.envelopeCrates} crates @ ${env.effectivePct.toFixed(0)}%${env.flexPct>0?` <span style="color:var(--blue)">(flex +${env.flexPct.toFixed(0)}%)</span>`:''}</div>
        </div>
        <div style="height:8px;background:#e0e0e0;border-radius:4px;overflow:hidden;margin-bottom:6px">
          <div style="height:100%;background:${barColor};width:${utilPct.toFixed(1)}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--g1)">
          <span><b>${env.committedCrates.toFixed(1)}</b> / ${env.envelopeCrates} crates committed (${utilPct.toFixed(0)}%)</span>
          <span style="color:${env.headroomCrates<=0?'var(--red)':env.headroomCrates<env.envelopeCrates*0.2?'var(--amber)':'var(--g3)'};font-weight:700">${env.headroomCrates<0?'Over by ':'Headroom '}${Math.abs(env.headroomCrates).toFixed(1)} crates</span>
        </div>
      </div>
      <div style="margin:0 16px 8px;background:var(--blueBg);border-left:3px solid var(--blue);padding:10px 12px;border-radius:0 8px 8px 0;font-size:12px;color:#1a5fa8">
        Credit sales appear here automatically. Tap <b>+ Payment</b> to record installments — the sale auto-closes when the balance hits zero.
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        ${creditSales.length===0
          ?`<div class="empty" style="padding:24px"><p>No credit sales yet.</p><p style="font-size:12px;margin-top:6px">Record a sale in the Sales tab and select "Credit / partial".</p></div>`
          :sortedCredit.map(s=>{
            const bal=getSaleBalance(s);
            const paid=getSalePaid(s);
            const total=Number(s.total_amount_ngn||0);
            const fullyPaid=bal<=0.5;
            const overdue=!fullyPaid&&s.due_date&&s.due_date<today;
            const statusCls=fullyPaid?'badge-green':overdue?'badge-red':paid>0?'badge-amber':'badge-amber';
            const statusTxt=fullyPaid?'Paid ✓':overdue?'Overdue':paid>0?'Partial':'Pending';
            const cust=s.customer_id?DB.getCustomer(s.customer_id):null;
            const custName=cust?.name||s.customer||'Unknown customer';
            const custSub=cust?`${cust.customer_type||'—'}${cust.phone?' · ☎ '+cust.phone:''}`:'';
            const payments=getSalePayments(s.id);
            return`<div class="list-item" style="flex-direction:column;align-items:stretch;gap:8px">
              <div style="display:flex;justify-content:space-between;gap:10px">
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;font-size:14px">${custName}</div>
                  ${custSub?`<div style="font-size:11px;color:var(--gray);margin-top:1px">${custSub}</div>`:''}
                  <div style="font-size:12px;color:var(--gray);margin-top:3px">${s.product} · ${s.quantity} unit${s.quantity>1?'s':''} · ${fmtDate(s.date)}</div>
                  <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap">
                    <span class="badge ${statusCls}">${statusTxt}</span>
                    ${s.due_date?`<span style="font-size:11px;color:${overdue?'var(--red)':'var(--gray)'}">${overdue?'Overdue since ':'Due '}${fmtDate(s.due_date)}</span>`:''}
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:11px;color:var(--gray)">Owing</div>
                  <div style="font-weight:800;font-size:16px;color:${fullyPaid?'var(--g3)':overdue?'var(--red)':'var(--amber)'}">${fmtMoney(bal)}</div>
                  <div style="font-size:11px;color:var(--gray);margin-top:2px">of ${fmtMoney(total)}</div>
                </div>
              </div>
              ${s.credit_gate_override_reason?`<div style="background:#fef3cd;border-left:3px solid var(--amber);padding:8px 10px;border-radius:0 6px 6px 0;font-size:11px;color:#7d4e00">
                ⚠ Credit-pool override: <i>"${String(s.credit_gate_override_reason).replace(/</g,'&lt;')}"</i>
              </div>`:''}
              ${payments.length>0?`<div style="background:var(--g5);border-radius:8px;padding:8px 10px;font-size:12px">
                <div style="font-size:11px;color:var(--g1);font-weight:600;margin-bottom:4px">Payments (${payments.length})</div>
                ${payments.map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #eaeaea">
                  <span style="color:var(--gray)">${fmtDate(p.date)} · ${p.method}${p.notes?' · '+p.notes:''}</span>
                  <span style="display:flex;align-items:center;gap:6px">
                    <b style="color:var(--g3)">${fmtMoney(p.amount_ngn)}</b>
                    ${isLocked(p.date)?'':`<button class="btn btn-secondary btn-sm" style="padding:2px 6px;font-size:11px" onclick="openPaymentForm('${s.id}','${p.id}')">✎</button>
                    <button class="btn btn-danger btn-sm" style="padding:2px 6px;font-size:11px" onclick="delPayment('${p.id}','${s.id}')">✕</button>`}
                  </span>
                </div>`).join('')}
              </div>`:''}
              <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
                ${!fullyPaid?`<button class="btn btn-primary btn-sm" onclick="openPaymentForm('${s.id}')">+ Record Payment</button>`:''}
                ${isLocked(s.date)?LOCK_BADGE:`<button class="btn btn-secondary btn-sm" onclick="openSaleForm('${s.id}')">Edit Sale</button>`}
              </div>
            </div>`;
          }).join('')}
      </div>`;
  } else if(FIN_TAB==='customers'){
    tabContent=renderCustomersTab();
  }

  el.innerHTML=`<div class="topbar"><div><h1>Finance</h1><small>Expenses · Sales · Receivables · Egg Stock</small></div></div>
    <div class="kpi-row-3">
      <div class="kpi"><div class="kpi-val" style="color:var(--g2)">${fmtMoney(monthSales)}</div><div class="kpi-lbl">Sales (Month)</div></div>
      <div class="kpi"><div class="kpi-val" style="color:var(--red)">${fmtMoney(monthExp)}</div><div class="kpi-lbl">Expenses (Month)</div></div>
      <div class="kpi" style="${overdueCount>0?'border:2px solid var(--red)':totalOwed>0?'border:2px solid var(--amber)':''}">
        <div class="kpi-val" style="color:${overdueCount>0?'var(--red)':totalOwed>0?'var(--amber)':'var(--gray)'}">${fmtMoney(totalOwed)}</div>
        <div class="kpi-lbl">Owed to You</div>
      </div>
    </div>
    <div style="margin:0 16px 8px;background:var(--g5);border-radius:10px;padding:12px;display:flex;justify-content:space-between;gap:12px">
      <div><div style="font-size:11px;color:var(--g1);font-weight:700;text-transform:uppercase">This Month Margin</div>
        <div style="font-size:20px;font-weight:800;color:${monthSales-monthExp>=0?'var(--g2)':'var(--red)'}">${monthSales-monthExp>=0?'+':''}${fmtMoney(monthSales-monthExp)}</div></div>
      <div style="text-align:right"><div style="font-size:11px;color:var(--g1);font-weight:700;text-transform:uppercase">Cash Collected</div>
        <div style="font-size:20px;font-weight:800;color:var(--g2)">${fmtMoney(cashCollectedMonth)}</div></div>
    </div>
    <div class="inner-tabs">
      <button class="inner-tab ${FIN_TAB==='expenses'?'active':''}" onclick="FIN_TAB='expenses';renderFinance()">Expenses</button>
      <button class="inner-tab ${FIN_TAB==='sales'?'active':''}" onclick="FIN_TAB='sales';renderFinance()">Sales</button>
      <button class="inner-tab ${FIN_TAB==='recv'?'active':''}" onclick="FIN_TAB='recv';renderFinance()">Receivables${overdueCount>0?' 🔴':unpaidCredit.length>0?' ('+unpaidCredit.length+')':''}</button>
      <button class="inner-tab ${FIN_TAB==='customers'?'active':''}" onclick="FIN_TAB='customers';renderFinance()">Customers</button>
      <button class="inner-tab ${FIN_TAB==='stock'?'active':''}" onclick="FIN_TAB='stock';renderFinance()">Egg Stock</button>
    </div>
    ${tabContent}
    <div style="height:12px"></div>`;
}

// ── Bulk pen tagging ──────────────────────────────────────────
// A farm that ran on one pen has a whole history of expenses with no pen on
// them. Tagging those one by one is not realistic — and the 7-day edit lock
// means most of them cannot be opened individually at all.
//
// This assigns them in one go. It is deliberately not a permanent fixture:
// the button that opens it only appears while untagged expenses exist, so once
// the backlog is cleared the tool disappears on its own.
//
// It bypasses the date lock on purpose. The lock protects figures; this changes
// only which pen a cost belongs to. No amount, date or note is touched.
function bulkTagTargets(before){
  return DB.getExpenses()
    // A feed-store purchase is stock, not a pen cost — it reaches a pen through
    // the kg that pen eats, so tagging it would achieve nothing.
    .filter(e=>!e.pen_id&&!e.feed_stock_id&&(!before||e.date<=before))
    .sort((a,b)=>a.date.localeCompare(b.date));
}
function openBulkTagExpenses(){
  const pens=((DB.getFarm()||{}).pens)||[];
  if(!pens.length){toast('Add a pen in Settings first');return;}
  const today=DB.today(), def=legacyPenId();
  openModal(`<div class="modal-ttl">Assign Expenses to a Pen <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:13px;color:var(--gray);margin:0 0 14px">Charges every expense not yet on a pen to the pen you pick. Only the pen changes; locked records are included.</p>
    <div class="field"><label>Charge them to</label>
      <select id="bt_pen">${pens.map(p=>`<option value="${p.id}" ${p.id===def?'selected':''}>${p.name}</option>`).join('')}</select></div>
    <div class="field"><label>Only expenses dated on or before</label>
      <input type="date" id="bt_before" value="${today}" onchange="previewBulkTag()" oninput="previewBulkTag()">
      <div style="font-size:11px;color:var(--gray);margin-top:5px">Leave as today to take the whole backlog.</div></div>
    <div id="bt_preview"></div>
    <button class="btn btn-primary" id="bt_go" onclick="doBulkTagExpenses()">Assign</button>`);
  previewBulkTag();
}
function previewBulkTag(){
  const box=document.getElementById('bt_preview'); if(!box)return;
  const rows=bulkTagTargets(document.getElementById('bt_before')?.value||null);
  const total=rows.reduce((s,e)=>s+Number(e.amount_ngn||0),0);
  const go=document.getElementById('bt_go');
  if(go){go.disabled=rows.length===0;go.style.opacity=rows.length===0?'.5':'';}
  // Feed purchases are skipped, and that must be said out loud — their cost is
  // the single biggest number on the screen and its absence would look wrong.
  const skipped=DB.getExpenses().filter(e=>!e.pen_id&&e.feed_stock_id);
  const skippedNgn=skipped.reduce((s,e)=>s+Number(e.amount_ngn||0),0);
  const feedNote=skipped.length?`<div style="background:var(--blueBg);border-left:3px solid var(--blue);padding:8px 12px;border-radius:0 6px 6px 0;font-size:12px;color:#1a5fa8;margin-bottom:14px">
    ${skipped.length} store feed purchase${skipped.length>1?'s':''} (${fmtMoney(Math.round(skippedNgn))}) left out — charged to a pen as the birds eat it.
  </div>`:'';
  if(rows.length===0){
    box.innerHTML=feedNote+`<div style="background:#f5f5f5;border-radius:8px;padding:12px;font-size:13px;color:var(--gray);margin-bottom:14px">Nothing else to assign in that date range.</div>`;
    return;
  }
  const cats={};
  rows.forEach(e=>{cats[e.category]=(cats[e.category]||0)+Number(e.amount_ngn||0);});
  box.innerHTML=feedNote+`<div style="background:var(--g5);border-radius:8px;padding:12px;margin-bottom:14px">
    <div style="font-size:13px;font-weight:800;color:var(--g1);margin-bottom:8px">${rows.length} expense${rows.length>1?'s':''} · ${fmtMoney(Math.round(total))}</div>
    <div style="font-size:11px;color:var(--gray);margin-bottom:8px">${fmtDate(rows[0].date)} – ${fmtDate(rows[rows.length-1].date)}</div>
    ${Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0;color:var(--gray)">
      <span>${c}</span><span style="font-weight:700;color:var(--g1)">${fmtMoney(Math.round(v))}</span></div>`).join('')}
  </div>`;
}
function doBulkTagExpenses(){
  const penId=document.getElementById('bt_pen').value;
  const rows=bulkTagTargets(document.getElementById('bt_before')?.value||null);
  if(!rows.length){toast('Nothing to assign');return;}
  rows.forEach(e=>DB.updExpense(e.id,{pen_id:penId}));
  _bulkTagUndo={ids:rows.map(e=>e.id),penId};
  closeModal();
  confirmSave(`${rows.length} expense${rows.length>1?'s':''} charged to ${penName(penId)||'pen'}`);
  renderFinance();
}
function undoBulkTagExpenses(){
  if(!_bulkTagUndo)return;
  const {ids}=_bulkTagUndo;
  ids.forEach(id=>DB.updExpense(id,{pen_id:null}));
  _bulkTagUndo=null;
  confirmSave(`${ids.length} expense${ids.length>1?'s':''} back to farm-wide`);
  renderFinance();
}
function penName(id){
  return ((((DB.getFarm()||{}).pens)||[]).find(p=>p.id===id)||{}).name||'';
}
function openExpenseForm(editId){
  const rec=editId?DB.getExpenses().find(e=>e.id===editId):null, today=DB.today();
  // A feed-store purchase owns its expense. Say so, and point at the record that
  // actually drives the figure, rather than letting an edit here be overwritten.
  const linked=rec?.feed_stock_id?DB.getFeedStock().find(r=>r.id===rec.feed_stock_id):null;
  const pens=((DB.getFarm()||{}).pens)||[];
  openModal(`<div class="modal-ttl">${rec?'Edit':'Add'} Expense <button class="modal-x" onclick="closeModal()">×</button></div>
    ${linked?`<div style="background:var(--blueBg);border-left:3px solid var(--blue);padding:8px 12px;border-radius:0 6px 6px 0;font-size:12px;color:#1a5fa8;margin-bottom:12px">
      🌾 Created by a feed store purchase (${linked.bags||0} bag${linked.bags===1?'':'s'} ${linked.feed_type}). Edit the purchase instead — changes made here are replaced next time it is saved.
      <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="closeModal();FEED_TAB='store';go('feed');openFeedPurchase('${linked.id}')">Open the purchase</button>
    </div>`:''}
    <div class="field"><label>Date</label><input type="date" id="ef_date" value="${rec?rec.date:today}" max="${today}"></div>
    <div class="field"><label>Category</label>
      <select id="ef_cat">${EXPENSE_CATS.map(c=>`<option value="${c}" ${rec?.category===c?'selected':''} >${c}</option>`).join('')}</select></div>
    <div class="field"><label>Charge to Pen <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <select id="ef_pen">
        <option value="">Farm-wide — not one pen</option>
        ${pens.map(p=>`<option value="${p.id}" ${rec?.pen_id===p.id?'selected':''}>${p.name}</option>`).join('')}
      </select>
      <div style="font-size:11px;color:var(--gray);margin-top:5px">Leave farm-wide for labour, power and anything shared.</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Amount (₦ NGN)</label><input type="number" id="ef_ngn" value="${rec?.amount_ngn||''}" min="0" step="100" placeholder="0"></div>
      <div class="field"><label>Amount ($ USD) <span style="color:var(--gray);font-weight:400">opt</span></label><input type="number" id="ef_usd" value="${rec?.amount_usd||''}" min="0" step="0.01" placeholder="0.00"></div>
    </div>
    <div class="field"><label>Notes</label><textarea id="ef_notes" placeholder="e.g. 50 bags of grower pellets">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveExpense('${editId||''}')">Save</button>`);
}
function saveExpense(editId){
  const rec={id:editId||uid(),date:document.getElementById('ef_date').value,
    category:document.getElementById('ef_cat').value,
    amount_ngn:parseFloat(document.getElementById('ef_ngn').value)||0,
    amount_usd:parseFloat(document.getElementById('ef_usd').value)||0,
    pen_id:document.getElementById('ef_pen')?.value||null,
    notes:document.getElementById('ef_notes').value.trim()};
  if(editId)DB.updExpense(editId,rec);else DB.addExpense(rec);
  closeModal();confirmSave('Expense saved');renderFinance();
}
function delExpense(id){openModal(`<div class="modal-ttl">Delete Expense? <button class="modal-x" onclick="closeModal()">×</button></div>
  <p style="font-size:14px;color:var(--gray);margin-bottom:18px">This cannot be undone.</p>
  <div style="display:flex;flex-direction:column;gap:8px">
    <button class="btn btn-danger" onclick="closeModal();DB.delExpense('${id}');confirmSave('Deleted');renderFinance()">Delete</button>
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);}
