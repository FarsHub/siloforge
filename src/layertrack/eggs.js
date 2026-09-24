// ═══════════════════════════════════════════════
// EGGS — EGG COLLECTION (Ported from PoulTrack)
// ═══════════════════════════════════════════════
let COLLECT_ROUND=null;
// Eggs is normally a today-only screen, but a pass written on paper still has to
// land on the day it was collected. COLLECT_DATE is that override: null means
// today, otherwise an ISO date inside the same 7-day window the other modules
// allow for edits (isLocked). It resets whenever you leave the Eggs tab, so a
// forgotten backfill can never silently swallow the next day's collection.
let COLLECT_DATE=null;
function collectDate(){ return COLLECT_DATE||DB.today() }
function colsForDate(d){ return DB.getCols().filter(c=>c.date===d) }
function setCollectDate(v){
  const today=DB.today();
  if(!v||v===today){COLLECT_DATE=null;}
  else if(v>today){toast('Cannot collect for a future date');return;}
  else if(isLocked(v)){toast(`Only the last ${LOCK_DAYS} days can be backfilled`);return;}
  else COLLECT_DATE=v;
  COLLECT_ROUND=null;SES=null;SES_STAND=0;renderEggs();
}
function toggleCollectRound(id){COLLECT_ROUND=COLLECT_ROUND===id?null:id; renderEggs();}
function renderEggs(){
  if(SES){renderSession();return;}
  const farm=DB.getFarm(), el=document.getElementById('v-eggs');
  if(!farm||(farm.pens||[]).length===0){
    el.innerHTML=`<div class="topbar"><div><h1>Egg Collection</h1></div></div><div class="empty"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg><h3>No farm set up</h3><p>Go to Settings to add pens and lines.</p></div>`;
    return;
  }
  const today=collectDate(), todayCols=colsForDate(today), allPass=getAllPassStatus(farm,todayCols).filter(p=>!_activePenId||p.penId===_activePenId);
  let openRound=COLLECT_ROUND;
  if(openRound===null){const fp=ROUNDS.find(r=>allPass.some(p=>p.round===r.id&&!p.complete));openRound=fp?fp.id:ROUNDS[0].id;}
  const roundSections=ROUNDS.map(rnd=>{
    const passes=allPass.filter(p=>p.round===rnd.id);
    const totalP=passes.length, doneP=passes.filter(p=>p.complete).length;
    const eggs=todayCols.filter(c=>c.round===rnd.id).reduce((s,c)=>(c.entries||[]).reduce((ss,e)=>ss+(e.eggs||0),s),0);
    const allDone=totalP>0&&doneP===totalP, isOpen=openRound===rnd.id;
    const rndBadge=allDone?`<span class="badge badge-green">✓ Done · ${eggs} eggs</span>`:
      doneP>0?`<span class="badge badge-amber">${doneP}/${totalP} passes · ${eggs} eggs</span>`:
      `<span class="badge badge-gray">Not started</span>`;
    const passRows=passes.map(p=>{
      const bc=p.complete?'badge-green':p.started?'badge-amber':'badge-gray';
      const bt=p.complete?'✓ Done':p.started?`${p.done}/${p.total} stands`:'New';
      const bl=p.complete?'Re-do':p.started?'Resume':'Start';
      const bcl=p.complete?'btn-secondary':p.started?'btn-amber':'btn-primary';
      const passCol=todayCols.find(c=>c.penId===p.penId&&c.lineId===p.lineId&&c.side===p.side&&c.round===rnd.id);
      return`<div style="padding:10px 0;border-bottom:1px solid #f5f5f5">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div><div style="font-weight:700;font-size:13px">${p.penName} · ${p.lineName}</div>
            <div style="display:flex;gap:6px;margin-top:4px"><span class="badge badge-gray" style="font-size:10px">Side ${p.side}</span><span class="badge ${bc}">${bt}</span></div></div>
          <button class="btn ${bcl} btn-sm" style="flex-shrink:0;margin-left:10px"
            onclick="beginSession('${p.penId}','${p.lineId}','${p.side}',${rnd.id})">${bl}</button></div>
        ${passCol?.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-top:6px;padding-left:2px">📝 "${passCol.notes}"</div>`:''}</div>`;
    }).join('');
    return`<div style="background:var(--white);border-radius:var(--radius);margin:0 16px 10px;box-shadow:var(--shadow);overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;${isOpen?'border-bottom:2px solid var(--g5)':''}"
        onclick="toggleCollectRound(${rnd.id})">
        <div><span class="${rnd.cls} round-chip" style="font-size:13px;padding:5px 12px">${rnd.label} · ${rnd.sub}</span>
          <div style="margin-top:6px">${rndBadge}</div></div>
        <span style="font-size:20px;color:var(--gray);transition:transform .2s;${isOpen?'transform:rotate(180deg)':''}">▾</span>
      </div>
      ${isOpen?`<div style="padding:0 16px 6px">${passRows||'<div style="padding:14px 0;color:var(--gray);font-size:13px">No passes configured.</div>'}</div>`:''}</div>`;
  }).join('');
  const isBackfill=today!==DB.today();
  const minDate=lockMinDate();
  el.innerHTML=`<div class="topbar"><div><h1>Egg Collection</h1><small>${fmtDate(today)}${isBackfill?' · backfill':''}</small></div></div>
    ${getPenCtxBar()}
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 16px;background:${isBackfill?'#fff8e1':'var(--white)'};border-bottom:1px solid ${isBackfill?'var(--amber)':'#eee'}">
      <span style="font-size:12px;font-weight:800;color:var(--gray)">Collection date</span>
      <input type="date" value="${today}" min="${minDate}" max="${DB.today()}"
        style="flex:1;min-width:130px;padding:8px 10px;border:1px solid #ddd;border-radius:8px;font-size:13px;font-weight:700"
        onchange="setCollectDate(this.value)">
      ${isBackfill?`<button class="btn btn-secondary btn-sm" style="flex-shrink:0" onclick="setCollectDate('')">Back to today</button>`:''}
    </div>
    ${isBackfill?`<div style="background:var(--amber);color:#fff;padding:9px 16px;font-size:12px;font-weight:800;line-height:1.5">
      ⏪ Backfilling ${fmtDate(today)} — these eggs will be recorded against that day, not today.</div>`:''}
    <div style="background:var(--g5);padding:10px 18px;font-size:12px;color:var(--g1);line-height:1.7">
      <b>Side A</b> = Right side, walking forward &nbsp;·&nbsp; <b>Side B</b> = Left side, walking back</div>
    <div style="padding-top:12px;padding-bottom:24px">${roundSections||'<div style="text-align:center;padding:32px 24px;color:var(--gray)"><p>No passes configured for this pen.<br>Go to Settings to add lines and stands.</p></div>'}</div>`;
}

function beginSession(penId,lineId,side,round){
  const farm=DB.getFarm(), pen=(farm.pens||[]).find(p=>p.id===penId);
  const line=(pen?.lines||[]).find(l=>l.id===lineId); if(!line)return;
  const today=collectDate(), todayCols=colsForDate(today);
  let col=todayCols.find(c=>c.penId===penId&&c.lineId===lineId&&c.side===side&&c.round===round);
  if(!col){
    const stage=getPenStage(pen);
    const snapExp=stage?stage.expected:(farm?.expectedRate||85);
    const snapWarn=stage?stage.warn:(farm?.warnRate||70);
    col={id:uid(),date:today,penId,lineId,side,round,
      roundLabel:ROUNDS.find(r=>r.id===round)?.label||`Round ${round}`,
      penName:pen.name,lineName:line.name,exp:snapExp,warn:snapWarn,
      completedStands:[],entries:[],notes:''};
    DB.addCol(col);
  }
  const stands=side==='B'?[...line.stands].reverse():[...line.stands];
  const nextIdx=stands.findIndex(s=>!(col.completedStands||[]).includes(s.id));
  SES={...col,stands,farm};SES_STAND=nextIdx>=0?nextIdx:0;
  renderSession();
}

function renderSession(){
  const el=document.getElementById('v-eggs');
  const{stands,penName,lineName,side,round,roundLabel,completedStands,id}=SES;
  const stand=stands[SES_STAND], standConfig=findStandInFarm(SES.farm,stand.id);
  const total=stands.length, pct=Math.round(completedStands.length/total*100);
  const rndInfo=ROUNDS.find(r=>r.id===round)||ROUNDS[0];
  const pen=(SES.farm.pens||[]).find(p=>p.id===SES.penId);
  const stage=getPenStage(pen);
  const EXP=stage?stage.expected:(DB.getFarm()?.expectedRate||85);
  const WARN=stage?stage.warn:(DB.getFarm()?.warnRate||70);
  const otherCols=colsForDate(SES.date).filter(c=>c.penId===SES.penId&&c.lineId===SES.lineId&&c.side===side&&c.round!==round);
  const prevByCell={};
  otherCols.forEach(c=>(c.entries||[]).filter(e=>e.standId===stand.id).forEach(e=>{
    const k=`${e.tier}_${e.cellNum}`;
    if(!prevByCell[k])prevByCell[k]={eggs:0};
    prevByCell[k].eggs+=e.eggs||0;
  }));
  const saved=(DB.getCol(id)?.entries||[]).filter(e=>e.standId===stand.id);
  let tiersHtml='';
  for(let tier=standConfig.tiers;tier>=1;tier--){
    let tierEggs=0,tierBirds=0,cellsHtml='';
    for(let cell=1;cell<=standConfig.cellsPerTier;cell++){
      const k=`${tier}_${cell}`, birds=getCellBirds(standConfig,tier,cell,side);
      const savedE=saved.find(e=>e.tier===tier&&e.cellNum===cell);
      const eggs=savedE?savedE.eggs:'', broken=savedE?savedE.broken:'';
      const prevEggs=prevByCell[k]?.eggs||0, remaining=Math.max(0,birds-prevEggs);
      const thisEggs=parseInt(eggs)||0, dailyTotal=prevEggs+thisEggs, overQuota=dailyTotal>birds;
      const rate=(savedE&&birds>0)?(thisEggs/birds*100):null;
      let cardCls='';
      if(savedE){cardCls=overQuota?'c-over':(rate>=EXP?'c-good':rate>=WARN?'c-low':'c-poor');}
      const rateClr=rate===null?'':overQuota?'color:var(--amber)':rate>=EXP?'color:var(--g3)':rate>=WARN?'color:var(--amber)':'color:var(--red)';
      tierEggs+=thisEggs;tierBirds+=birds;
      const quotaHtml=prevEggs>0?`<div class="cell-prev" id="quota_${k}" style="${overQuota?'color:var(--amber);font-weight:800':''}">
        ${prevEggs} prev · ${remaining>0?remaining+' left':'full'}${overQuota?' ⚠':''}</div>`:'';
      cellsHtml+=`<div class="cell-card ${cardCls}" id="cc_${k}" data-exp="${EXP}" data-warn="${WARN}">
        <div class="cell-id">T${tier}·C${cell}</div>
        <div class="cell-birds-row"><span class="birds-val" onclick="editCellBirds('${stand.id}',${tier},${cell},${birds},'${side}')">${birds}</span>🐔</div>
        <input class="cell-egg-input" type="number" min="0" inputmode="numeric" pattern="[0-9]*" placeholder="0"
          value="${eggs}" id="ei_${k}" data-stand="${stand.id}" data-tier="${tier}" data-cell="${cell}"
          data-birds="${birds}" data-prev="${prevEggs}" data-exp="${EXP}" data-warn="${WARN}" oninput="onEggInput(this)">
        <div class="cell-broken-row"><span class="broken-lbl">💔</span>
          <input class="broken-input" type="number" min="0" max="${eggs!==''?eggs:0}" inputmode="numeric" placeholder="0"
            value="${broken}" id="bi_${k}" data-tier="${tier}" data-cell="${cell}" oninput="onBrokenInput(this,'${k}')"></div>
        ${quotaHtml}
        <div class="cell-rate-lbl" id="rl_${k}" style="${rateClr}">${rate!==null?rate.toFixed(0)+'%':''}</div></div>`;
    }
    const tierRate=tierBirds>0?tierEggs/tierBirds*100:null;
    tiersHtml+=`<div class="tier-section"><div class="tier-label">Tier ${tier} ${tier===standConfig.tiers?'(Top)':tier===1?'(Bottom)':''}
      <span class="tier-stats">${tierEggs}/${tierBirds} ${tierRate!==null?tierRate.toFixed(0)+'%':''}</span></div>
      <div class="cell-grid">${cellsHtml}</div></div>`;
  }
  const stageBanner=stage?`<div style="background:${stage.bg};padding:8px 14px;display:flex;align-items:center;gap:8px;font-size:12px;color:${stage.color};font-weight:800;border-bottom:1px solid rgba(0,0,0,.06)">
    ${stage.emoji} Week ${stage.weeks} · ${stage.label} · ${stageTargetText(stage)}</div>`:'';
  el.innerHTML=`<div class="collect-hdr">
    <div style="display:flex;align-items:flex-start;justify-content:space-between">
      <div><h2>${penName} · ${lineName} · Side ${side} · ${stand.name}</h2>
        <div class="sub">Stand ${SES_STAND+1}/${total} · ${standConfig.tiers}T × ${standConfig.cellsPerTier}C</div></div>
      <span class="${rndInfo.cls} round-chip" style="flex-shrink:0;margin-left:6px">${roundLabel}</span></div>
    <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div></div>
    ${stageBanner}
    <div style="padding:8px 10px 0;display:flex;flex-wrap:wrap;gap:5px">
      <span class="badge badge-green">≥${EXP}% Good</span>
      <span class="badge badge-amber">${WARN}–${EXP-1}% Low</span>
      <span class="badge badge-red">&lt;${WARN}% Poor</span>
      <span class="badge badge-gray">Tap 🐔 to edit birds</span></div>
    <div style="padding-bottom:100px">${tiersHtml}</div>
    <div class="action-bar">
      <button class="btn btn-secondary" style="width:auto;padding:14px 16px;flex-shrink:0" onclick="exitSession()">✕</button>
      <button class="btn btn-amber" style="flex:0 0 auto;width:auto;padding:14px 16px" onclick="addNoteModal()">📝</button>
      <button class="btn btn-primary" onclick="saveStand()">${SES_STAND<total-1?'Save & Next →':'Complete Pass ✓'}</button></div>`;
}
function onEggInput(inp){
  const birds=parseInt(inp.dataset.birds), prevEggs=parseInt(inp.dataset.prev)||0;
  const remaining=Math.max(0,birds-prevEggs), EXP=parseInt(inp.dataset.exp)||85, WARN=parseInt(inp.dataset.warn)||70;
  let eggs=parseInt(inp.value)||0;
  if(eggs>birds){eggs=birds;inp.value=birds;}
  if(eggs<0){eggs=0;inp.value=0;}
  const overBirds=(prevEggs+eggs)>birds;
  const k=`${inp.dataset.tier}_${inp.dataset.cell}`;
  const bi=document.getElementById('bi_'+k), card=document.getElementById('cc_'+k);
  const rl=document.getElementById('rl_'+k), quot=document.getElementById('quota_'+k);
  if(bi){bi.max=eggs;if((parseInt(bi.value)||0)>eggs)bi.value=eggs;}
  if(quot){quot.textContent=`${prevEggs} prev · ${Math.max(0,remaining-eggs)} left${overBirds?' ⚠':''}`;
    quot.style.color=overBirds?'var(--amber)':'';quot.style.fontWeight=overBirds?'800':'';}
  const rate=birds>0?eggs/birds*100:null;
  if(rl){rl.textContent=rate!==null?rate.toFixed(0)+'%':'';
    rl.style.color=rate===null?'':overBirds?'var(--amber)':rate>=EXP?'var(--g3)':rate>=WARN?'var(--amber)':'var(--red)';}
  if(card){card.className='cell-card '+(overBirds?'c-over':rate>=EXP?'c-good':rate>=WARN?'c-low':eggs>0?'c-poor':'');}
}
function onBrokenInput(inp,k){
  const ei=document.getElementById('ei_'+k), maxEggs=parseInt(ei?.value)||0;
  let val=parseInt(inp.value)||0;
  if(val<0){val=0;inp.value=0;}if(val>maxEggs){val=maxEggs;inp.value=maxEggs;}
}
function editCellBirds(standId,tier,cell,current,side){
  openModal(`<div class="modal-ttl">Edit Bird Count <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:13px;color:var(--gray);margin-bottom:16px">Tier ${tier} · Cell ${cell} · <b>Side ${side}</b></p>
    <div class="field"><label>Number of Birds</label>
      <select id="m_birds">${[0,1,2,3,4,5,6].map(n=>`<option value="${n}" ${n===current?'selected':''}>${n===0?'0 (empty)':n}</option>`).join('')}</select></div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-primary" onclick="saveCellBirds('${standId}',${tier},${cell},'${side}')">Save</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
function saveCellBirds(standId,tier,cell,side){
  const n=parseInt(document.getElementById('m_birds').value), farm=DB.getFarm();
  for(const pen of farm.pens||[])for(const line of pen.lines||[])for(const s of line.stands||[])
    if(s.id===standId){if(!s.cellBirds)s.cellBirds={};s.cellBirds[`${tier}_${cell}_${side}`]=n;}
  DB.saveFarm(farm);SES.farm=farm;closeModal();confirmSave(`Side ${side} · Cell updated to ${n} bird${n!==1?'s':''}`);renderSession();
}
function addNoteModal(){
  const col=DB.getCol(SES.id);
  openModal(`<div class="modal-ttl">Session Note <button class="modal-x" onclick="closeModal()">×</button></div>
    <div class="field"><textarea id="m_note" placeholder="e.g. Water line blocked, sick bird found...">${col?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveNote()">Save Note</button>`);
}
function saveNote(){DB.updateCol(SES.id,{notes:document.getElementById('m_note').value.trim()});closeModal();confirmSave('Note saved');}
function saveStand(){
  const stand=SES.stands[SES_STAND], standConfig=findStandInFarm(SES.farm,stand.id), entries=[];
  for(let tier=1;tier<=standConfig.tiers;tier++)for(let cell=1;cell<=standConfig.cellsPerTier;cell++){
    const k=`${tier}_${cell}`, ei=document.getElementById('ei_'+k), bi=document.getElementById('bi_'+k);
    if(ei){const birds=getCellBirds(standConfig,tier,cell,SES.side);
      entries.push({standId:stand.id,tier,cellNum:cell,birds,eggs:parseInt(ei.value)||0,broken:parseInt(bi?.value)||0,ts:new Date().toISOString()});}
  }
  const col=DB.getCols().find(c=>c.id===SES.id);
  if(col){col.entries=[(col.entries||[]).filter(e=>e.standId!==stand.id),...entries].flat();
    if(!col.completedStands.includes(stand.id))col.completedStands.push(stand.id);
    DB.updateCol(SES.id,{entries:col.entries,completedStands:col.completedStands});SES.completedStands=col.completedStands;}
  if(SES_STAND<SES.stands.length-1){SES_STAND++;confirmSave(`Stand ${SES_STAND} saved`);renderSession();window.scrollTo(0,0);}
  else{toast('Pass complete! 🎉',3000);SES=null;SES_STAND=0;go('eggs');}
}
function exitSession(){
  openModal(`<div class="modal-ttl">Exit Collection? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">Completed stands are saved. Resume later from the Eggs tab.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();SES=null;SES_STAND=0;go('eggs')">Exit</button>
      <button class="btn btn-secondary" onclick="closeModal()">Continue Collecting</button></div>`);
}
