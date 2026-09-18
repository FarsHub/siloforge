// ═══════════════════════════════════════════════
// FIREBASE & SYNC
// ═══════════════════════════════════════════════
const firebaseConfig={apiKey:"AIzaSyCg7LCTpghu7mkKvHdqWdRmZGfJWkjYH98",authDomain:"siloforgeagro.firebaseapp.com",projectId:"siloforgeagro",storageBucket:"siloforgeagro.firebasestorage.app",messagingSenderId:"65830087779",appId:"1:65830087779:web:2b29a420b49a8662745c56"};
firebase.initializeApp(firebaseConfig);
const db=firebase.firestore();
db.enablePersistence({synchronizeTabs:true}).catch(()=>{});

// ── SYNC STATUS (honest save + pending indicator) ──
let SYNC_PENDING=0, SYNC_FAILED=0, LAST_WRITE=Promise.resolve(true);
function _track(p){
  SYNC_PENDING++; renderSyncBadge();
  const t=Promise.resolve(p).then(
    ()=>{SYNC_PENDING=Math.max(0,SYNC_PENDING-1); renderSyncBadge(); return true;},
    ()=>{SYNC_PENDING=Math.max(0,SYNC_PENDING-1); SYNC_FAILED++; renderSyncBadge(); return false;}
  );
  LAST_WRITE=t; return t;
}
function renderSyncBadge(){
  const el=document.getElementById('sync-badge'); if(!el)return;
  if(SYNC_FAILED>0){el.textContent='⚠ '+SYNC_FAILED+' not saved — tap'; el.className='sync-badge err'; el.style.display='';}
  else if(SYNC_PENDING>0){el.textContent='⏳ '+SYNC_PENDING+' unsynced'; el.className='sync-badge pending'; el.style.display='';}
  else{el.style.display='none';}
}
function _clearSyncErr(){SYNC_FAILED=0; renderSyncBadge(); toast('Reopen the app while online to retry any unsynced changes');}
// Honest save toast: reads the most recent tracked write (LAST_WRITE) and reports
// what actually happened — cloud-confirmed, pending (offline/slow), or failed.
function confirmSave(label){
  const p=LAST_WRITE;
  Promise.race([Promise.resolve(p).then(ok=>ok?'ok':'fail'), new Promise(r=>setTimeout(()=>r('pending'),2000))])
    .then(s=>toast(s==='ok'?label+' ✓':s==='fail'?'⚠ '+label+' — not saved to cloud':'⏳ '+label+' on device — will sync when online'));
}

let FARM_CODE='';
const CACHE={};
function farmRef(col){return db.collection('farms').doc(FARM_CODE).collection(col);}
function farmDoc(col,id){return farmRef(col).doc(id);}
// ── RECOVERABLE DELETE (trash) ──
// Nothing in this app hard-deletes any more. Every delete first copies the record
// into farms/{code}/trash, so a mistaken tap is undoable from Settings → Recently
// Deleted for TRASH_TTL_DAYS. Trash is lazy-loaded on demand — never a live
// listener — so it costs no reads until someone opens the restore list.
const TRASH_LABELS={
  bt_batches_v1:'Batch', bt_daily_v1:'Daily log', bt_weight_v1:'Weight record',
  bt_health_v1:'Health record', bt_expenses_v1:'Expense', bt_sales_v1:'Sale',
  bt_feed_v1:'Feed record', bt_payments_v1:'Payment',
  bt_feedstock_v1:'Feed store entry'
};
const TRASH_TTL_DAYS=60;
function trashRef(){return db.collection('farms').doc(FARM_CODE).collection('trash_v1');}
// Copies records into trash. Deliberately throws on failure so callers that await
// it before deleting fail closed — the original stays put rather than vanishing.
async function _toTrash(srcKey,recs,label,batchId){
  const items=(recs||[]).filter(Boolean);
  if(!items.length)return;
  const at=new Date().toISOString();
  for(let i=0;i<items.length;i+=490){
    const b=db.batch();
    items.slice(i,i+490).forEach(r=>b.set(trashRef().doc(uid()+Math.random().toString(36).slice(2,6)),
      {batch_id:batchId,src:srcKey,src_id:r.id||null,label:TRASH_LABELS[srcKey]||label||srcKey,
       deleted_at:at,payload:r}));
    await b.commit();
  }
}
async function _trashThenDelete(k,id,rec){
  if(rec)await _toTrash(k,[rec],k,uid());
  await farmDoc(k,id).delete();
  return true;
}
async function _batchWrite(k,arr){
  try{
    const snap=await farmRef(k).get();
    // A full-collection rewrite that drops records is a delete in disguise — trash them.
    const keep=new Set(arr.map(i=>i.id));
    const dropped=snap.docs.map(d=>d.data()).filter(r=>r.id&&!keep.has(r.id));
    if(dropped.length)await _toTrash(k,dropped,k,uid());
    const ops=[...snap.docs.map(d=>({t:'del',r:d.ref})),...arr.map(i=>({t:'set',r:farmRef(k).doc(i.id),d:i}))];
    for(let i=0;i<ops.length;i+=490){const b=db.batch();ops.slice(i,i+490).forEach(o=>o.t==='del'?b.delete(o.r):b.set(o.r,o.d));await b.commit();}
  }catch(e){toast('Sync error ⚠');}
}
// Bulk delete of a whole collection. Copies everything to trash BEFORE deleting,
// and rethrows so the caller can report an honest failure instead of a false '✓'.
async function _deleteCol(k,batchId){
  const snap=await farmRef(k).get();
  await _toTrash(k,snap.docs.map(d=>d.data()),k,batchId||uid());
  CACHE[k]=[];
  for(let i=0;i<snap.docs.length;i+=490){
    const b=db.batch();snap.docs.slice(i,i+490).forEach(d=>b.delete(d.ref));await b.commit();
  }
}
async function loadTrash(){
  const snap=await trashRef().orderBy('deleted_at','desc').limit(500).get();
  return snap.docs.map(d=>({_tid:d.id,...d.data()}));
}
// Writes every record of one delete batch back to its original collection, then
// clears those trash entries. Batches are capped at 245 (2 ops per record).
async function restoreTrashBatch(batchId){
  const snap=await trashRef().where('batch_id','==',batchId).get();
  if(snap.empty)return 0;
  const docs=snap.docs;
  for(let i=0;i<docs.length;i+=245){
    const b=db.batch();
    docs.slice(i,i+245).forEach(d=>{
      const t=d.data();
      const id=t.payload&&t.payload.id||t.src_id;
      if(t.src&&t.payload&&id)b.set(farmRef(t.src).doc(id),t.payload);
      b.delete(d.ref);
    });
    await b.commit();
  }
  return docs.length;
}
// Runs once per login. Past the TTL, trash is genuinely gone.
async function purgeOldTrash(){
  const cutoff=new Date(Date.now()-TRASH_TTL_DAYS*864e5).toISOString();
  try{
    const snap=await trashRef().where('deleted_at','<',cutoff).limit(400).get();
    if(snap.empty)return;
    const b=db.batch();snap.docs.forEach(d=>b.delete(d.ref));await b.commit();
  }catch(e){/* purge is best-effort; never block login on it */}
}
const _fsListeners=[];
function _stopListeners(){_fsListeners.forEach(u=>u());_fsListeners.length=0;}
function _reRenderCurrent(){
  const name=document.querySelector('.nav-btn.active')?.dataset?.view;
  if(!name)return;
  ({home:renderHome,batches:renderBatches,daily:renderDaily,feed:renderFeed,weight:renderWeight,
    health:renderHealth,finance:renderFinance,reports:renderReports,settings:renderSettings})[name]?.();
  renderFeedTicker();
}
async function loadFromFirestore(){
  _stopListeners();
  await Promise.all(Object.entries(KEYS).map(([name,k])=>new Promise(resolve=>{
    let done=false;
    const ok=()=>{if(!done){done=true;resolve();}else _reRenderCurrent();};
    const err=()=>{if(!done){done=true;resolve();}};
    if(name==='farm'){
      _fsListeners.push(farmDoc(k,'config').onSnapshot(doc=>{CACHE[k]=doc.exists?doc.data().data:null;bumpFeedData();ok();},err));
    }else{
      _fsListeners.push(farmRef(k).onSnapshot(snap=>{CACHE[k]=snap.docs.map(d=>d.data());bumpFeedData();ok();},err));
    }
  })));
}
function showLoginErr(msg){document.getElementById('login-err').textContent=msg;}
async function doLogin(){
  const code=document.getElementById('farm-code-input').value.trim().toUpperCase();
  if(!code){showLoginErr('Please enter a farm code');return;}
  const btn=document.getElementById('login-btn');
  btn.textContent='Verifying\u2026';btn.disabled=true;showLoginErr('');
  try{
    const reg=await db.collection('registry').doc(code).get();
    if(!reg.exists){showLoginErr('Farm code not found. Contact your administrator.');btn.textContent='Enter Farm';btn.disabled=false;return;}
    FARM_CODE=code;btn.textContent='Loading data\u2026';
    await loadFromFirestore();
    purgeOldTrash();
    document.getElementById('login-screen').style.display='none';
    localStorage.setItem('sf_farm_code',code);renderHome();renderFeedTicker();
  }catch(err){showLoginErr('Connection error. Check your internet.');btn.textContent='Enter Farm';btn.disabled=false;}
}
function toggleRegister(){
  const p=document.getElementById('register-panel');
  p.style.display=p.style.display==='none'?'block':'none';
}
async function registerFarm(){
  const pin=document.getElementById('master-pin-input').value.trim();
  const code=document.getElementById('reg-farm-code').value.trim().toUpperCase();
  const name=document.getElementById('reg-farm-name').value.trim();
  const errEl=document.getElementById('reg-err');
  errEl.style.color='var(--red)';errEl.textContent='';
  if(!pin||!code||!name){errEl.textContent='All fields are required';return;}
  try{
    const masterDoc=await db.collection('appConfig').doc('master').get();
    if(!masterDoc.exists||masterDoc.data().pin!==pin){errEl.textContent='Incorrect master PIN';return;}
    const existing=await db.collection('registry').doc(code).get();
    if(existing.exists){errEl.textContent='Farm code already in use';return;}
    await db.collection('registry').doc(code).set({name,code,created:new Date().toISOString()});
    errEl.style.color='var(--g3)';errEl.textContent='\u2713 Farm created! You can now log in.';
    document.getElementById('register-panel').style.display='none';
  }catch(e){errEl.textContent='Error: check your connection';}
}
function initApp(){
  const saved=localStorage.getItem('sf_farm_code');
  if(saved)document.getElementById('farm-code-input').value=saved;
  const vEl=document.getElementById('app-version');
  if(vEl)vEl.textContent='v'+APP_VERSION;
  console.log('BroodTrack build v'+APP_VERSION);
}
