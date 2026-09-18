// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function go(name){
  if(SES&&name!=='eggs'){
    if(!confirm('Active collection in progress. Leave anyway?'))return;
    SES=null;SES_STAND=0;
  }
  if(name!=='eggs')COLLECT_DATE=null;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('v-'+name).classList.add('active');
  document.querySelector(`[data-view="${name}"]`).classList.add('active');
  ({home:renderHome,eggs:renderEggs,flock:renderFlock,feed:renderFeed,
    health:renderHealth,finance:renderFinance,reports:renderReports,
    settings:renderSettings})[name]?.();
  renderFeedTicker();
}

// ═══════════════════════════════════════════════
// PEN CONTEXT
// ═══════════════════════════════════════════════
function selectPen(id,view){
  _activePenId=id;
  go(view||'flock');
}
function getPenCtxBar(){
  if(!_activePenId)return'';
  const farm=DB.getFarm();
  const pen=(farm?.pens||[]).find(p=>p.id===_activePenId);
  if(!pen)return'';
  const st=getPenStage(pen);
  return`<div class="pen-ctx-bar">
    <div class="pen-ctx-left">
      <div class="pen-ctx-dot"></div>
      <div>
        <div class="pen-ctx-name">${pen.name}</div>
        <div class="pen-ctx-sub">${st?`Wk ${st.weeks} · ${st.label}`:'Not configured'} · ${(pen.lines||[]).length} lines</div>
      </div>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="go('home')" style="flex-shrink:0">Switch Pen</button>
  </div>`;
}
function getPenSelectPrompt(){
  return`<div class="pen-select-prompt">
    <div class="psp-icon">🏠</div>
    <h3>No pen selected</h3>
    <p>Go to <b>Home</b> and tap <b>Open Records</b> on a pen to view its data here.</p>
    <button class="btn btn-primary" style="max-width:200px;margin:0 auto" onclick="go('home')">Go to Home</button>
  </div>`;
}
