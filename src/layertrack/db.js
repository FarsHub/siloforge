// ═══════════════════════════════════════════════
// DATA LAYER
// ═══════════════════════════════════════════════
const KEYS = {
  farm:'lt_farm_v1', cols:'lt_cols_v1', birds:'lt_birds_v1',
  feed:'lt_feed_v1', health:'lt_health_v1',
  expenses:'lt_expenses_v1', sales:'lt_sales_v1', recv:'lt_recv_v1',
  customers:'lt_customers_v1', payments:'lt_payments_v1',
  feedstock:'lt_feedstock_v1'
};
const CUSTOMER_TYPES=['Wholesaler','Retailer','Institution','Individual'];
const PAYMENT_METHODS=['Cash','Bank Transfer','POS','Mobile Money','Other'];
const DB = {
  today(){ return new Date().toISOString().slice(0,10) },
  _get(k){ return CACHE[k]??null },
  _set(k,v){ CACHE[k]=v; bumpFeedData(); return Array.isArray(v)?_track(_batchWrite(k,v)):_track(farmDoc(k,'config').set({data:v})); },
  _arr(k){ return CACHE[k]||[] },
  _push(k,item){ if(!CACHE[k])CACHE[k]=[]; CACHE[k].push(item); bumpFeedData(); return _track(farmDoc(k,item.id).set(item)); },
  _del(k,id){ const rec=(CACHE[k]||[]).find(x=>x.id===id); CACHE[k]=(CACHE[k]||[]).filter(x=>x.id!==id); bumpFeedData(); return _track(_trashThenDelete(k,id,rec)); },
  _upd(k,id,upd){ CACHE[k]=(CACHE[k]||[]).map(x=>x.id===id?{...x,...upd}:x); bumpFeedData(); return _track(farmDoc(k,id).set(upd,{merge:true})); },
  getFarm(){ return this._get(KEYS.farm) },
  saveFarm(f){ this._set(KEYS.farm,f) },
  getCols(){ return this._arr(KEYS.cols) },
  saveCols(c){ this._set(KEYS.cols,c) },
  addCol(c){ this._push(KEYS.cols,c) },
  updateCol(id,upd){ this._upd(KEYS.cols,id,upd) },
  getCol(id){ return this._arr(KEYS.cols).find(c=>c.id===id)||null },
  todayCols(){ return this._arr(KEYS.cols).filter(c=>c.date===this.today()) },
  getBirds(){ return this._arr(KEYS.birds) },
  todayBirds(){ return this._arr(KEYS.birds).filter(b=>b.date===this.today()) },
  addBird(r){ this._push(KEYS.birds,r) },
  delBird(id){ this._del(KEYS.birds,id) },
  updBird(id,u){ this._upd(KEYS.birds,id,u) },
  getFeed(){ return this._arr(KEYS.feed) },
  todayFeed(){ return this._arr(KEYS.feed).filter(f=>f.date===this.today()) },
  addFeed(r){ this._push(KEYS.feed,r) },
  delFeed(id){ this._del(KEYS.feed,id) },
  updFeed(id,u){ this._upd(KEYS.feed,id,u) },
  getFeedStock(){ return this._arr(KEYS.feedstock) },
  addFeedStock(r){ this._push(KEYS.feedstock,r) },
  delFeedStock(id){ this._del(KEYS.feedstock,id) },
  updFeedStock(id,u){ this._upd(KEYS.feedstock,id,u) },
  getHealth(){ return this._arr(KEYS.health) },
  todayHealth(){ return this._arr(KEYS.health).filter(h=>h.date===this.today()) },
  addHealth(r){ this._push(KEYS.health,r) },
  delHealth(id){ this._del(KEYS.health,id) },
  updHealth(id,u){ this._upd(KEYS.health,id,u) },
  getExpenses(){ return this._arr(KEYS.expenses) },
  addExpense(r){ this._push(KEYS.expenses,r) },
  delExpense(id){ this._del(KEYS.expenses,id) },
  updExpense(id,u){ this._upd(KEYS.expenses,id,u) },
  getSales(){ return this._arr(KEYS.sales) },
  addSale(r){ this._push(KEYS.sales,r) },
  delSale(id){ this._del(KEYS.sales,id) },
  updSale(id,u){ this._upd(KEYS.sales,id,u) },
  getRecv(){ return this._arr(KEYS.recv) },
  addRecv(r){ this._push(KEYS.recv,r) },
  delRecv(id){ this._del(KEYS.recv,id) },
  updRecv(id,u){ this._upd(KEYS.recv,id,u) },
  getCustomers(){ return this._arr(KEYS.customers) },
  getCustomer(id){ return this._arr(KEYS.customers).find(c=>c.id===id)||null },
  addCustomer(r){ this._push(KEYS.customers,r) },
  delCustomer(id){ this._del(KEYS.customers,id) },
  updCustomer(id,u){ this._upd(KEYS.customers,id,u) },
  getPayments(){ return this._arr(KEYS.payments) },
  paymentsForSale(saleId){ return this._arr(KEYS.payments).filter(p=>p.sale_id===saleId) },
  addPayment(r){ this._push(KEYS.payments,r) },
  delPayment(id){ this._del(KEYS.payments,id) },
  updPayment(id,u){ this._upd(KEYS.payments,id,u) },
};

// ═══════════════════════════════════════════════
// EGG STOCK
// ═══════════════════════════════════════════════
function getEggStock(){
  const farm=DB.getFarm();
  const validPenIds=new Set((farm?.pens||[]).map(p=>p.id));
  let collected=0,broken=0;
  DB.getCols().filter(c=>validPenIds.has(c.penId)).forEach(col=>{
    (col.entries||[]).forEach(e=>{collected+=(e.eggs||0);broken+=(e.broken||0);});
  });
  const eggsSold=DB.getSales().filter(s=>s.product==='Eggs — Crates')
    .reduce((sum,s)=>sum+(s.quantity||0)*EGGS_PER_CRATE,0);
  const available=Math.max(0,collected-broken-eggsSold);
  const availableInt=Math.round(available);
  return{collected,broken,eggsSold,available,
    crates:Math.floor(availableInt/EGGS_PER_CRATE),loose:availableInt%EGGS_PER_CRATE};
}
function getEggLedger(){
  const farm=DB.getFarm();
  const validPenIds=new Set((farm?.pens||[]).map(p=>p.id));
  const colByDate={};
  DB.getCols().filter(c=>validPenIds.has(c.penId)).forEach(col=>{
    if(!colByDate[col.date])colByDate[col.date]={collected:0,broken:0};
    (col.entries||[]).forEach(e=>{colByDate[col.date].collected+=(e.eggs||0);colByDate[col.date].broken+=(e.broken||0);});
  });
  const saleByDate={};
  DB.getSales().filter(s=>s.product==='Eggs — Crates').forEach(s=>{
    if(!saleByDate[s.date])saleByDate[s.date]={crates:0,eggs:0};
    saleByDate[s.date].crates+=(s.quantity||0);
    saleByDate[s.date].eggs+=(s.quantity||0)*EGGS_PER_CRATE;
  });
  const dates=[...new Set([...Object.keys(colByDate),...Object.keys(saleByDate)])].sort();
  let running=0;
  const ledger=dates.map(date=>{
    const c=colByDate[date]||{collected:0,broken:0};
    const s=saleByDate[date]||{crates:0,eggs:0};
    running+=c.collected-c.broken-s.eggs;
    return{date,collected:c.collected,broken:c.broken,soldCrates:s.crates,soldEggs:s.eggs,balance:Math.max(0,running)};
  });
  return ledger.reverse();
}
