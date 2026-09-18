// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function go(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('v-'+name).classList.add('active');
  document.querySelector(`[data-view="${name}"]`).classList.add('active');
  ({home:renderHome,batches:renderBatches,daily:renderDaily,feed:renderFeed,weight:renderWeight,
    health:renderHealth,finance:renderFinance,reports:renderReports,settings:renderSettings})[name]?.();
  renderFeedTicker();
}
function selectBatch(id,view){
  _activeBatchId=id;
  _finAllBatches=false;
  go(view||'daily');
}
function getBatchCtxBar(){
  if(!_activeBatchId)return'';
  const b=DB.getBatches().find(x=>x.id===_activeBatchId);
  if(!b)return'';
  const ageDays=batchAgeInDays(b);
  const birds=getBatchBirdCount(b);
  const dotCls=b.status==='Active'?'active-dot':b.status==='Sold'?'sold-dot':'closed-dot';
  const statusLabel=b.status==='Active'?`Day ${ageDays??'—'}`:b.status;
  return`<div class="batch-ctx-bar">
    <div class="batch-ctx-left">
      <div class="batch-ctx-dot ${dotCls}"></div>
      <div>
        <div class="batch-ctx-name">${b.name}</div>
        <div class="batch-ctx-sub">${b.breed} · ${getBirdTypeLabel(getBirdType(b))} · ${statusLabel} · ${birds.toLocaleString()} birds</div>
      </div>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="go('batches')" style="flex-shrink:0">Switch</button>
  </div>`;
}
function getBatchSelectPrompt(){
  return`<div class="batch-select-prompt">
    <div class="bsp-icon">📦</div>
    <h3>No batch selected</h3>
    <p>Go to <b>Batches</b> and tap <b>Open</b> on a batch to view and log its records here.</p>
    <button class="btn btn-primary" style="max-width:200px;margin:0 auto" onclick="go('batches')">Go to Batches</button>
  </div>`;
}
