// ═══════════════════════════════════════════════
// DATA LAYER
// ═══════════════════════════════════════════════
const KEYS={farm:'bt_farm_v1',batches:'bt_batches_v1',daily:'bt_daily_v1',
  weight:'bt_weight_v1',health:'bt_health_v1',expenses:'bt_expenses_v1',sales:'bt_sales_v1',
  feed:'bt_feed_v1',payments:'bt_payments_v1',feedstock:'bt_feedstock_v1',
  customers:'bt_customers_v1',orders:'bt_orders_v1'};
const PAYMENT_METHODS=['Cash','Bank Transfer','POS','Mobile Money','Other'];
// Who buys pullets. Not the same list as an egg round: the birds go to other
// farms and to the dealers who supply them, and almost never to a household.
const CUSTOMER_TYPES=['Farmer','Agro-Dealer','Cooperative','Institution','Individual'];
const DB={
  today(){return new Date().toISOString().slice(0,10)},
  _get(k){return CACHE[k]??null},
  _set(k,v){CACHE[k]=v;bumpFeedData();return Array.isArray(v)?_track(_batchWrite(k,v)):_track(farmDoc(k,'config').set({data:v}));},
  _arr(k){return CACHE[k]||[]},
  _push(k,i){if(!CACHE[k])CACHE[k]=[];CACHE[k].push(i);bumpFeedData();return _track(farmDoc(k,i.id).set(i));},
  _del(k,id){const rec=(CACHE[k]||[]).find(x=>x.id===id);CACHE[k]=(CACHE[k]||[]).filter(x=>x.id!==id);bumpFeedData();return _track(_trashThenDelete(k,id,rec));},
  _upd(k,id,u){CACHE[k]=(CACHE[k]||[]).map(x=>x.id===id?{...x,...u}:x);bumpFeedData();return _track(farmDoc(k,id).set(u,{merge:true}));},
  getFarm(){return this._get(KEYS.farm)},
  saveFarm(f){this._set(KEYS.farm,f)},
  getPayments(){return this._arr(KEYS.payments)},
  paymentsForSale(saleId){return this._arr(KEYS.payments).filter(p=>p.sale_id===saleId)},
  // A deposit is taken against an order, months before the sale exists, so a
  // payment carries either a sale_id or an order_id. When the order is
  // fulfilled the deposit is re-pointed at the sale it paid for, which is why
  // this filter insists the payment has not already moved on.
  paymentsForOrder(orderId){return this._arr(KEYS.payments).filter(p=>p.order_id===orderId&&!p.sale_id)},
  addPayment(r){this._push(KEYS.payments,r)},
  delPayment(id){this._del(KEYS.payments,id)},
  updPayment(id,u){this._upd(KEYS.payments,id,u)},
  getBatches(){return this._arr(KEYS.batches)},
  addBatch(b){this._push(KEYS.batches,b)},
  updBatch(id,u){this._upd(KEYS.batches,id,u)},
  delBatch(id){this._del(KEYS.batches,id)},
  getDaily(){return this._arr(KEYS.daily)},
  addDaily(r){this._push(KEYS.daily,r)},
  updDaily(id,u){this._upd(KEYS.daily,id,u)},
  delDaily(id){this._del(KEYS.daily,id)},
  getWeight(){return this._arr(KEYS.weight)},
  addWeight(r){this._push(KEYS.weight,r)},
  updWeight(id,u){this._upd(KEYS.weight,id,u)},
  delWeight(id){this._del(KEYS.weight,id)},
  getHealth(){return this._arr(KEYS.health)},
  addHealth(r){this._push(KEYS.health,r)},
  updHealth(id,u){this._upd(KEYS.health,id,u)},
  delHealth(id){this._del(KEYS.health,id)},
  getExpenses(){return this._arr(KEYS.expenses)},
  addExpense(r){this._push(KEYS.expenses,r)},
  updExpense(id,u){this._upd(KEYS.expenses,id,u)},
  delExpense(id){this._del(KEYS.expenses,id)},
  getSales(){return this._arr(KEYS.sales)},
  addSale(r){this._push(KEYS.sales,r)},
  updSale(id,u){this._upd(KEYS.sales,id,u)},
  delSale(id){this._del(KEYS.sales,id)},
  getFeed(){return this._arr(KEYS.feed)},
  addFeed(r){this._push(KEYS.feed,r)},
  updFeed(id,u){this._upd(KEYS.feed,id,u)},
  delFeed(id){this._del(KEYS.feed,id)},
  getCustomers(){return this._arr(KEYS.customers)},
  getCustomer(id){return this._arr(KEYS.customers).find(c=>c.id===id)||null},
  addCustomer(r){this._push(KEYS.customers,r)},
  updCustomer(id,u){this._upd(KEYS.customers,id,u)},
  delCustomer(id){this._del(KEYS.customers,id)},
  getOrders(){return this._arr(KEYS.orders)},
  getOrder(id){return this._arr(KEYS.orders).find(o=>o.id===id)||null},
  addOrder(r){this._push(KEYS.orders,r)},
  updOrder(id,u){this._upd(KEYS.orders,id,u)},
  delOrder(id){this._del(KEYS.orders,id)},
  getFeedStock(){return this._arr(KEYS.feedstock)},
  addFeedStock(r){this._push(KEYS.feedstock,r)},
  updFeedStock(id,u){this._upd(KEYS.feedstock,id,u)},
  delFeedStock(id){this._del(KEYS.feedstock,id)},
};
