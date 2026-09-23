// ═══════════════════════════════════════════════
// SETTINGS — FARM SETUP + EXPORT
// ═══════════════════════════════════════════════
function renderSettings(){
  const farm=DB.getFarm()||{name:'',expectedRate:85,warnRate:70,feedRateG:110,waterRateMlPerBird:250,marketPricePerCrate:3500,pens:[]};
  const el=document.getElementById('v-settings');
  const pensHtml=(farm.pens||[]).map(pen=>`
    <div class="acc-item" id="acc_${pen.id}">
      <div class="acc-hdr" onclick="toggleAcc('${pen.id}')">
        <span>${pen.name} <span style="color:var(--gray);font-size:12px;font-weight:500">(${(pen.lines||[]).length} lines)</span></span>
        <span class="acc-arr">▾</span>
      </div>
      <div class="acc-body">
        ${(()=>{const st=getPenStage(pen);return st?`<div style="background:${st.bg};border-radius:8px;padding:9px 12px;margin-bottom:10px;font-size:12px;color:${st.color};font-weight:800">${st.emoji} Week ${st.weeks} · ${st.label} — Expected ~${st.expected}% · Warn &lt;${st.warn}%</div>`:''})()}
        ${(pen.lines||[]).map(line=>`
          <div style="margin-bottom:10px">
            <div style="font-size:13px;font-weight:800;color:var(--g1);margin-bottom:6px;display:flex;align-items:center;justify-content:space-between">
              ${line.name}
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm" onclick="addStand('${pen.id}','${line.id}')">+ Stand</button>
                <button class="btn btn-danger btn-sm" onclick="deleteLine('${pen.id}','${line.id}')">✕</button>
              </div>
            </div>
            ${(line.stands||[]).map(s=>`
              <div class="stand-row">
                <div><div style="font-weight:700;font-size:13px">${s.name}</div>
                  <div style="font-size:11px;color:var(--gray)">${s.tiers} tier${s.tiers===1?'':'s'} · ${s.cellsPerTier} cell${s.cellsPerTier===1?'':'s'}/tier · ${s.defaultBirds} bird${s.defaultBirds===1?'':'s'}/cell</div></div>
                <div style="display:flex;gap:5px">
                  <button class="btn btn-secondary btn-sm" onclick="editStand('${pen.id}','${line.id}','${s.id}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteStand('${pen.id}','${line.id}','${s.id}')">✕</button>
                </div></div>`).join('')}
          </div>`).join('')}
        <div style="display:flex;flex-direction:column;gap:7px;margin-top:6px">
          <button class="btn btn-secondary btn-sm" onclick="addLine('${pen.id}')">+ Add Line</button>
          <button class="btn btn-amber btn-sm" onclick="editPen('${pen.id}')">Edit Pen</button>
          <button class="btn btn-danger btn-sm" onclick="deletePen('${pen.id}')">Delete Pen</button>
        </div>
      </div></div>`).join('');

  el.innerHTML=`<div class="topbar"><div><h1>Settings</h1></div></div>
    <div class="card">
      <div class="card-title">Farm Details</div>
      <div class="field"><label>Farm Name</label><input type="text" id="s_name" value="${farm.name||''}" placeholder="e.g. Green Valley Farms"></div>
      ${(()=>{const aw=getFarmAgeWeeks(farm)||0;const fr=getLayerFeedRate(aw);const wr=getLayerWaterRate(aw);const ph=aw>=23?'Laying phase':`Week ${aw} pullet`;return`
      <div style="background:var(--g5);border-radius:8px;padding:9px 12px;font-size:12px;color:var(--g1);margin-bottom:8px">
        🌾 Feed: <b>${fr} g/bird/day</b> &nbsp;·&nbsp; 💧 Water: <b>${wr} ml/bird/day</b><br><span style="font-weight:500;opacity:.75">${ph} — auto-calculated by flock age</span>
      </div>`;})()}
      <button class="btn btn-primary" onclick="saveFarm()">Save Farm Details</button>
    </div>
    ${(()=>{const b=getDocBusiness(),f=farm;return`
    <div class="card">
      <div class="card-title">Receipts &amp; Invoices</div>
      <p style="font-size:13px;color:var(--gray);margin-bottom:10px">
        These details print on the receipt you give a customer. Leave anything blank and it simply won't appear.
      </p>
      <div class="field"><label>Name on documents</label>
        <input type="text" id="s_doc_name" value="${f.doc_name||''}" placeholder="${(f.name||'My Farm').replace(/"/g,'&quot;')}"></div>
      <div class="field"><label>Address</label>
        <input type="text" id="s_doc_address" value="${f.doc_address||''}" placeholder="e.g. Km 8, Iseyin Road, Oyo"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>Phone</label>
          <input type="tel" id="s_doc_phone" value="${f.doc_phone||''}" placeholder="0803 000 0000"></div>
        <div class="field"><label>RC number <span style="font-size:11px;color:var(--gray);font-weight:400">optional</span></label>
          <input type="text" id="s_doc_rc" value="${f.doc_rc||''}" placeholder="RC 1234567"></div>
      </div>
      <div class="field"><label>Email <span style="font-size:11px;color:var(--gray);font-weight:400">optional</span></label>
        <input type="email" id="s_doc_email" value="${f.doc_email||''}" placeholder="farm@example.com"></div>
      <div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px">Where customers pay</div>
      <p style="font-size:12px;color:var(--gray);margin-bottom:8px">Printed only when a balance is still owed.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>Bank</label>
          <input type="text" id="s_bank_name" value="${f.bank_name||''}" placeholder="e.g. Moniepoint"></div>
        <div class="field"><label>Account number</label>
          <input type="text" id="s_bank_account" value="${f.bank_account||''}" placeholder="0123456789" inputmode="numeric"></div>
      </div>
      <div class="field"><label>Account name</label>
        <input type="text" id="s_bank_account_name" value="${f.bank_account_name||''}" placeholder="As it appears at the bank"></div>
      <div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px">Terms by product</div>
      <p style="font-size:12px;color:var(--gray);margin-bottom:8px">Keep these short — the customer reads them on a phone.</p>
      ${PRODUCT_TYPES.map((p,i)=>`
        <div class="field"><label>${p}</label>
          <textarea id="s_terms_${i}" rows="2" placeholder="${DEFAULT_DOC_TERMS[p]}">${(f.doc_terms||{})[p]||''}</textarea></div>`).join('')}
      <button class="btn btn-primary" onclick="saveDocSettings()">Save Document Details</button>
      ${!isDocSetupComplete()?`<div class="alert-item alert-amber" style="margin-top:10px">
        Add at least an address and phone number so receipts don't go out looking unfinished.
      </div>`:''}
    </div>`;})()}
    <div class="sec-hdr" style="margin-top:4px">Pens</div>
    ${pensHtml}
    <div style="margin:10px 16px"><button class="btn btn-primary" onclick="addPen()">+ Add New Pen</button></div>
    ${(()=>{
      const p=getCreditPolicy();
      const env=getCreditEnvelope();
      const flexNote=env.flexPct>0?`+${env.flexPct.toFixed(0)}% overstock flex applied`:'no overstock flex right now';
      const daysOnHandLabel=Number.isFinite(env.daysOnHand)?env.daysOnHand.toFixed(1)+' days':'∞ (no recent sales)';
      return `
    <div class="card">
      <div class="card-title">Credit Policy</div>
      <p style="font-size:13px;color:var(--gray);margin-bottom:10px">
        Controls how many crates can sit on credit at once. Default: 30% of stock — the remaining 70% must come back as cash to cover feed.
        When stock is overstocking (days-on-hand above target), the cap flexes up to avoid spoilage.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>Base credit % of stock</label>
          <input type="number" id="cp_base" value="${p.basePct}" min="0" max="100" step="1"></div>
        <div class="field"><label>Target days-on-hand</label>
          <input type="number" id="cp_days" value="${p.targetDaysOnHand}" min="1" max="30" step="1"></div>
        <div class="field"><label>Flex % per excess day</label>
          <input type="number" id="cp_flex" value="${p.flexPctPerDay}" min="0" max="20" step="1"></div>
        <div class="field"><label>Max overstock flex %</label>
          <input type="number" id="cp_maxflex" value="${p.maxFlexPct}" min="0" max="70" step="1"></div>
      </div>
      <div style="background:var(--g5);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--g1);margin:4px 0 10px">
        <div style="font-weight:700;color:var(--g2);margin-bottom:4px">Current envelope</div>
        <div>Stock: <b>${env.availableCrates}</b> crates · Days on hand: <b>${daysOnHandLabel}</b> · ${flexNote}</div>
        <div style="margin-top:3px">Effective cap: <b>${env.effectivePct.toFixed(0)}%</b> = <b>${env.envelopeCrates}</b> crates available for credit</div>
        <div style="margin-top:3px">Currently committed: <b>${env.committedCrates.toFixed(1)}</b> crates · Headroom: <b style="color:${env.headroomCrates<=0?'var(--red)':env.headroomCrates<env.envelopeCrates*0.2?'var(--amber)':'var(--g3)'}">${env.headroomCrates.toFixed(1)}</b> crates</div>
      </div>
      <button class="btn btn-primary" onclick="saveCreditPolicyFromForm()">Save Policy</button>
    </div>`;
    })()}
    ${(()=>{const groups=getLegacySaleGroups();if(!groups.length)return '';const totalSales=groups.reduce((s,g)=>s+g.saleCount,0);return `
    <div class="card" style="border-left:3px solid var(--amber)">
      <div class="card-title">Customer Migration</div>
      <p style="font-size:13px;color:var(--gray);margin-bottom:10px">
        Found <b>${groups.length}</b> customer name${groups.length===1?'':'s'} across <b>${totalSales}</b> older sale${totalSales===1?'':'s'} that aren't yet linked to customer records. Review and link them to enable history-based credit scoring later.
      </p>
      <button class="btn btn-primary" onclick="openMigrationModal()">Review &amp; Migrate ${groups.length}</button>
    </div>`;})()}
    ${(()=>{const pol=getFeedPolicy();return `
    <div class="card">
      <div class="card-title">Feed Store</div>
      <p style="font-size:13px;color:var(--gray);margin-bottom:12px">
        Bag size is what turns a bag count in the store into kilograms, so it has to match the sacks you actually buy. The two warning levels are days of feed left — set them to leave enough time to get a delivery in.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>Warn below (days left)</label>
          <input type="number" id="fs_warn" value="${pol.warnDays}" min="1" max="90" step="1"></div>
        <div class="field"><label>Red alert below (days left)</label>
          <input type="number" id="fs_urgent" value="${pol.urgentDays}" min="1" max="90" step="1"></div>
        <div class="field"><label>Buy to cover (days)</label>
          <input type="number" id="fs_target" value="${pol.targetDays}" min="3" max="180" step="1"></div>
      </div>
      <div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 6px">Feed programme</div>
      <p style="font-size:12px;color:var(--gray);margin-bottom:10px">
        Which feed the flock is on, by age. This is what lets the app tell a real shortage apart from a stage that is simply ending — a feed only has to last as long as the birds are on it. The last row runs to the end of lay.
      </p>
      ${(()=>{const prog=getFeedProgramme();const rows=4;
        const opts=(sel)=>['',...FEED_TYPES].map(t=>`<option value="${t}" ${t===sel?'selected':''}>${t||'— not used —'}</option>`).join('');
        return Array.from({length:rows}).map((_,i)=>{
          const isLast=i===rows-1;
          // The stored programme is right-aligned to the last row so the
          // open-ended stage always sits on the bottom line.
          const off=rows-prog.length;
          const st=i>=off?prog[i-off]:null;
          return `<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-bottom:8px">
            <select id="fp_type_${i}">${opts(st?st.type:'')}</select>
            ${isLast
              ?`<div style="font-size:11px;color:var(--gray);white-space:nowrap;padding:0 4px">to end of lay</div>`
              :`<div style="display:flex;align-items:center;gap:6px;white-space:nowrap">
                  <span style="font-size:11px;color:var(--gray)">to wk</span>
                  <input type="number" id="fp_wk_${i}" value="${st&&st.toWeek!=null?st.toWeek:''}" min="1" max="120" step="1" style="width:64px;padding:8px;border:1.5px solid #ddd;border-radius:8px;font-size:14px">
                </div>`}
          </div>`;}).join('');})()}
      <div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px">kg per bag</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${FEED_TYPES.map(t=>`<div class="field" style="margin-bottom:0"><label>${t}</label>
          <input type="number" id="fs_bag_${t.replace(/[^a-z0-9]/gi,'_')}" value="${getBagKg(t)}" min="1" max="100" step="0.5"></div>`).join('')}
      </div>
      <button class="btn btn-primary" style="margin-top:12px" onclick="saveFeedStoreSettings()">Save Feed Store Settings</button>
    </div>`;})()}
    <div class="card">
      <div class="card-title">Data Export / Import</div>
      <p style="font-size:13px;color:var(--gray);margin-bottom:14px">Export all data as a PostgreSQL-compatible JSON file for analytics.</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-primary" onclick="exportData()">Export All Data (JSON)</button>
        <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">Import Data (JSON)</button>
        <input type="file" id="importFile" accept=".json" style="display:none" onchange="importData(this)">
      </div>
    </div>
    <div class="card">
      <div class="card-title">Recently Deleted</div>
      <p style="font-size:13px;color:var(--gray);margin-bottom:12px">Anything deleted in the app — a single record or a bulk reset — is kept here for 60 days and can be put back. After that it is permanently removed.</p>
      <button class="btn btn-secondary" onclick="openTrashModal()">View Recently Deleted</button>
    </div>
    <div class="card">
      <div class="card-title">Danger Zone</div>
      <p style="font-size:13px;color:var(--gray);margin-bottom:12px">Bulk resets are hidden by default. They need a fresh export and the manager PIN, and the records go to Recently Deleted rather than disappearing.</p>
      <button class="btn btn-secondary btn-sm" id="danger-toggle" onclick="toggleDangerZone()">Show bulk reset options</button>
      <div id="danger-zone" style="display:none;flex-direction:column;gap:8px;margin-top:10px">
        <button class="btn btn-danger btn-sm" onclick="resetModule('cols')">Reset Egg Collection Records</button>
        <button class="btn btn-danger btn-sm" onclick="resetModule('birds')">Reset Flock Records</button>
        <button class="btn btn-danger btn-sm" onclick="resetModule('feed')">Reset Feed Records</button>
        <button class="btn btn-danger btn-sm" onclick="resetModule('feedstock')">Reset Feed Store Records</button>
        <button class="btn btn-danger btn-sm" onclick="resetModule('health')">Reset Health Records</button>
        <button class="btn btn-danger btn-sm" onclick="resetModule('finance')">Reset Finance Records</button>
      </div>
    </div>
    <div style="height:20px"></div>`;
}

function saveFeedStoreSettings(){
  const farm=DB.getFarm()||{pens:[]};
  const warn=parseInt(document.getElementById('fs_warn').value,10);
  const urgent=parseInt(document.getElementById('fs_urgent').value,10);
  const target=parseInt(document.getElementById('fs_target').value,10);
  farm.feedWarnDays=warn>0?warn:DEFAULT_FEED_WARN_DAYS;
  // Red has to sit inside amber, or a store could go red without ever having
  // been amber and the earlier warning would never be seen.
  farm.feedUrgentDays=Math.min(urgent>0?urgent:DEFAULT_FEED_URGENT_DAYS,farm.feedWarnDays);
  farm.feedTargetDays=target>0?target:DEFAULT_FEED_TARGET_DAYS;
  // Only sizes that differ from the default are stored, so the default can move
  // later without every farm carrying a frozen copy of today's value.
  const bags={};
  FEED_TYPES.forEach(t=>{
    const v=parseFloat(document.getElementById('fs_bag_'+t.replace(/[^a-z0-9]/gi,'_')).value);
    if(v>0&&v!==DEFAULT_BAG_KG)bags[t]=v;
  });
  farm.feedBagKg=bags;
  // Read the programme top-down; a blank type means that stage is unused. The
  // final stage is forced open-ended so a laying flock can never fall off the
  // end of the programme and read as needing no feed.
  const prog=[];
  for(let i=0;i<4;i++){
    const t=document.getElementById('fp_type_'+i)?.value||'';
    if(!t)continue;
    const wkEl=document.getElementById('fp_wk_'+i);
    const wk=wkEl?parseInt(wkEl.value,10):NaN;
    prog.push({type:t,toWeek:Number.isFinite(wk)&&wk>0?wk:null});
  }
  if(prog.length){
    prog[prog.length-1].toWeek=null;
    // Boundaries must climb, or a stage in the middle would never be reachable.
    let last=0, ok=true;
    prog.forEach(x=>{ if(x.toWeek!==null){ if(x.toWeek<=last)ok=false; last=x.toWeek; } });
    if(!ok){ toast('Programme weeks must increase down the list'); return; }
    farm.feedProgramme=prog;
  }
  DB.saveFarm(farm);confirmSave('Feed store settings saved');renderSettings();renderFeed();renderHome();renderFeedTicker();
}
function toggleAcc(id){document.getElementById('acc_'+id)?.classList.toggle('open')}
function saveFarm(){
  const farm=DB.getFarm()||{pens:[]};
  farm.name=document.getElementById('s_name').value.trim()||'My Farm';
  DB.saveFarm(farm);confirmSave('Farm settings saved');
}
function saveDocSettings(){
  const farm=DB.getFarm()||{pens:[]};
  const val=id=>(document.getElementById(id)?.value||'').trim();
  farm.doc_name=val('s_doc_name');
  farm.doc_address=val('s_doc_address');
  farm.doc_phone=val('s_doc_phone');
  farm.doc_email=val('s_doc_email');
  farm.doc_rc=val('s_doc_rc');
  farm.bank_name=val('s_bank_name');
  farm.bank_account=val('s_bank_account');
  farm.bank_account_name=val('s_bank_account_name');
  // Only store a term when it differs from the default, so edited defaults keep
  // tracking future wording changes instead of freezing today's copy.
  const terms={};
  PRODUCT_TYPES.forEach((p,i)=>{
    const t=val('s_terms_'+i);
    if(t&&t!==DEFAULT_DOC_TERMS[p])terms[p]=t;
  });
  farm.doc_terms=terms;
  DB.saveFarm(farm);confirmSave('Document details saved');renderSettings();
}
function saveCreditPolicyFromForm(){
  const base=parseFloat(document.getElementById('cp_base').value);
  const days=parseFloat(document.getElementById('cp_days').value);
  const flex=parseFloat(document.getElementById('cp_flex').value);
  const maxflex=parseFloat(document.getElementById('cp_maxflex').value);
  if(!Number.isFinite(base)||base<0||base>100){toast('Base % must be 0–100');return;}
  if(!Number.isFinite(days)||days<1){toast('Target days must be at least 1');return;}
  if(!Number.isFinite(flex)||flex<0){toast('Flex per day cannot be negative');return;}
  if(!Number.isFinite(maxflex)||maxflex<0){toast('Max flex cannot be negative');return;}
  saveCreditPolicy({basePct:base,targetDaysOnHand:days,flexPctPerDay:flex,maxFlexPct:maxflex});
  confirmSave('Credit policy saved');renderSettings();
}
function addPen(){
  const today=DB.today();
  openModal(`<div class="modal-ttl">Add Pen <button class="modal-x" onclick="closeModal()">×</button></div>
    <div class="field"><label>Pen Name</label><input type="text" id="m_pname" placeholder="e.g. Pen A / House 1"></div>
    <div class="field"><label>Date Birds Arrived <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <input type="date" id="m_fdate" max="${today}"></div>
    <div class="field"><label>Age of Birds at Arrival (weeks) <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <input type="number" id="m_farr" placeholder="e.g. 0 for DOC, 16 for POL" min="0" max="100">
      <div style="font-size:11px;color:var(--gray);margin-top:5px">0 = day-old chicks · 12-14 = started pullets · 16-18 = point-of-lay</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Breed <span style="color:var(--gray);font-weight:400">— optional</span></label>
        <input type="text" id="m_pbreed" value="" placeholder="e.g. Isa Brown"></div>
      <div class="field"><label>Source / Supplier <span style="color:var(--gray);font-weight:400">— optional</span></label>
        <input type="text" id="m_psrc" value="" placeholder="e.g. CHI Farms"></div>
    </div>
    <button class="btn btn-primary" onclick="doAddPen()">Add Pen</button>`);
}
function doAddPen(){
  const name=document.getElementById('m_pname').value.trim();
  if(!name){toast('Enter pen name');return;}
  const farm=DB.getFarm()||{name:'My Farm',expectedRate:85,warnRate:70,feedRateG:110,marketPricePerCrate:3500,pens:[]};
  (farm.pens=farm.pens||[]).push({id:uid(),name,flockStartDate:document.getElementById('m_fdate').value||null,flockAgeAtArrival:parseInt(document.getElementById('m_farr').value)||0,breed:document.getElementById('m_pbreed').value.trim(),source:document.getElementById('m_psrc').value.trim(),lines:[]});
  DB.saveFarm(farm);closeModal();confirmSave(`${name} added`);renderSettings();
}
function editPen(penId){
  const farm=DB.getFarm(), pen=farm.pens.find(p=>p.id===penId), today=DB.today(), stage=getPenStage(pen);
  openModal(`<div class="modal-ttl">Edit ${pen.name} <button class="modal-x" onclick="closeModal()">×</button></div>
    ${stage?`<div style="background:${stage.bg};border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:13px;color:${stage.color};font-weight:700;line-height:1.6">
      ${stage.emoji} <b>Current Age: Week ${stage.weeks}</b> · ${stage.label}<br>
      <span style="font-weight:500">${stage.ageAtArrival}w arrival + ${stage.weeksSince}w on farm</span><br>
      Expected ≥${stage.expected}% · Warn &lt;${stage.warn}%</div>`:''}
    <div class="field"><label>Pen Name</label><input type="text" id="m_pname" value="${pen.name}"></div>
    <div class="field"><label>Date Birds Arrived</label><input type="date" id="m_fdate" value="${pen.flockStartDate||''}" max="${today}"></div>
    <div class="field"><label>Age at Arrival (weeks)</label>
      <input type="number" id="m_farr" value="${pen.flockAgeAtArrival||0}" min="0" max="100"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Breed <span style="color:var(--gray);font-weight:400">— optional</span></label>
        <input type="text" id="m_pbreed" value="${pen.breed||''}" placeholder="e.g. Isa Brown"></div>
      <div class="field"><label>Source / Supplier <span style="color:var(--gray);font-weight:400">— optional</span></label>
        <input type="text" id="m_psrc" value="${pen.source||''}" placeholder="e.g. CHI Farms"></div>
    </div>
    <button class="btn btn-primary" onclick="doEditPen('${penId}')">Save</button>`);
}
function doEditPen(penId){
  const farm=DB.getFarm(), pen=farm.pens.find(p=>p.id===penId);
  pen.name=document.getElementById('m_pname').value.trim()||pen.name;
  pen.flockStartDate=document.getElementById('m_fdate').value||null;
  pen.flockAgeAtArrival=parseInt(document.getElementById('m_farr').value)||0;
  pen.breed=document.getElementById('m_pbreed').value.trim();
  pen.source=document.getElementById('m_psrc').value.trim();
  DB.saveFarm(farm);closeModal();confirmSave('Pen updated');renderSettings();
}
function deletePen(penId){
  openModal(`<div class="modal-ttl">Delete Pen? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">Removes pen and all its lines/stands. Collection records are kept.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();doDeletePen('${penId}')">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
function doDeletePen(penId){const farm=DB.getFarm();farm.pens=farm.pens.filter(p=>p.id!==penId);DB.saveFarm(farm);confirmSave('Pen deleted');renderSettings();}
function addLine(penId){
  openModal(`<div class="modal-ttl">Add Line <button class="modal-x" onclick="closeModal()">×</button></div>
    <div class="field"><label>Line Name</label><input type="text" id="m_lname" placeholder="e.g. Line 1 / Row A"></div>
    <button class="btn btn-primary" onclick="doAddLine('${penId}')">Add Line</button>`);
}
function doAddLine(penId){
  const name=document.getElementById('m_lname').value.trim();
  if(!name){toast('Enter line name');return;}
  const farm=DB.getFarm(), pen=farm.pens.find(p=>p.id===penId);
  (pen.lines=pen.lines||[]).push({id:uid(),name,stands:[]});
  DB.saveFarm(farm);closeModal();confirmSave(`${name} added`);renderSettings();
}
function deleteLine(penId,lineId){
  openModal(`<div class="modal-ttl">Delete Line? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">Removes this line and all its stands.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();doDeleteLine('${penId}','${lineId}')">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
function doDeleteLine(penId,lineId){const farm=DB.getFarm(),pen=farm.pens.find(p=>p.id===penId);pen.lines=pen.lines.filter(l=>l.id!==lineId);DB.saveFarm(farm);confirmSave('Line deleted');renderSettings();}
function addStand(penId,lineId){
  openModal(`<div class="modal-ttl">Add Stand <button class="modal-x" onclick="closeModal()">×</button></div>
    <div class="field"><label>Stand Name</label><input type="text" id="m_sname" placeholder="e.g. Stand 1"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div class="field"><label>Tiers</label><select id="m_tiers"><option value="2">2</option><option value="3" selected>3</option><option value="4">4</option></select></div>
      <div class="field"><label>Cells/Tier</label><input type="number" id="m_cells" value="10" min="2" max="30"></div>
      <div class="field"><label>Birds/Cell</label><select id="m_birds"><option>1</option><option>2</option><option>3</option><option selected>4</option></select></div>
    </div>
    <button class="btn btn-primary" onclick="doAddStand('${penId}','${lineId}')">Add Stand</button>`);
}
function doAddStand(penId,lineId){
  const name=document.getElementById('m_sname').value.trim();
  if(!name){toast('Enter stand name');return;}
  const farm=DB.getFarm(), line=farm.pens.find(p=>p.id===penId)?.lines.find(l=>l.id===lineId);
  if(!line)return;
  (line.stands=line.stands||[]).push({id:uid(),name,tiers:parseInt(document.getElementById('m_tiers').value),
    cellsPerTier:parseInt(document.getElementById('m_cells').value),
    defaultBirds:parseInt(document.getElementById('m_birds').value),cellBirds:{}});
  DB.saveFarm(farm);closeModal();confirmSave(`${name} added`);renderSettings();
}
function editStand(penId,lineId,standId){
  const farm=DB.getFarm(), line=farm.pens.find(p=>p.id===penId)?.lines.find(l=>l.id===lineId);
  const s=line?.stands.find(st=>st.id===standId); if(!s)return;
  openModal(`<div class="modal-ttl">Edit ${s.name} <button class="modal-x" onclick="closeModal()">×</button></div>
    <div class="field"><label>Stand Name</label><input type="text" id="m_sname" value="${s.name}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div class="field"><label>Tiers</label><select id="m_tiers">${[2,3,4].map(n=>`<option value="${n}" ${s.tiers===n?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label>Cells/Tier</label><input type="number" id="m_cells" value="${s.cellsPerTier}" min="2" max="30"></div>
      <div class="field"><label>Default Birds</label><select id="m_birds">${[1,2,3,4].map(n=>`<option value="${n}" ${s.defaultBirds===n?'selected':''}>${n}</option>`).join('')}</select></div>
    </div>
    <button class="btn btn-primary" onclick="doEditStand('${penId}','${lineId}','${standId}')">Save</button>`);
}
function doEditStand(penId,lineId,standId){
  const farm=DB.getFarm(), line=farm.pens.find(p=>p.id===penId)?.lines.find(l=>l.id===lineId);
  const s=line?.stands.find(st=>st.id===standId); if(!s)return;
  s.name=document.getElementById('m_sname').value.trim()||s.name;
  s.tiers=parseInt(document.getElementById('m_tiers').value);
  s.cellsPerTier=parseInt(document.getElementById('m_cells').value);
  s.defaultBirds=parseInt(document.getElementById('m_birds').value);
  DB.saveFarm(farm);closeModal();confirmSave('Stand updated');renderSettings();
}
function deleteStand(penId,lineId,standId){
  openModal(`<div class="modal-ttl">Delete Stand? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">Collection records for this stand are kept.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();doDeleteStand('${penId}','${lineId}','${standId}')">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
function doDeleteStand(penId,lineId,standId){
  const farm=DB.getFarm(), line=farm.pens.find(p=>p.id===penId)?.lines.find(l=>l.id===lineId);
  if(!line)return; line.stands=line.stands.filter(s=>s.id!==standId);
  DB.saveFarm(farm);confirmSave('Stand deleted');renderSettings();
}
// ── DANGER ZONE (gated bulk reset) ──
// Bulk resets are the one place a single tap could erase a season of records, so
// they are gated three ways: an impact summary stating exactly what goes, a fresh
// export in this session, and the manager PIN. Deletes land in trash either way.
const MODULE_LABELS={cols:'Egg Collection Records',birds:'Flock Records',feed:'Feed Records',
  feedstock:'Feed Store Records (purchases & counts)',
  health:'Health Records',finance:'Finance Records (expenses, sales, receivables, customers, payments)'};
const MODULE_KEYS={cols:[KEYS.cols],birds:[KEYS.birds],feed:[KEYS.feed],feedstock:[KEYS.feedstock],
  health:[KEYS.health],
  finance:[KEYS.expenses,KEYS.sales,KEYS.recv,KEYS.customers,KEYS.payments]};
let EXPORTED_THIS_SESSION=false;
function toggleDangerZone(){
  const el=document.getElementById('danger-zone');if(!el)return;
  const open=el.style.display!=='none';
  el.style.display=open?'none':'flex';
  const b=document.getElementById('danger-toggle');
  if(b)b.textContent=open?'Show bulk reset options':'Hide bulk reset options';
}
function _moduleImpact(mod){
  const keys=MODULE_KEYS[mod]||[];
  let count=0,from=null,to=null;
  keys.forEach(k=>DB._arr(k).forEach(r=>{
    count++;const d=r.date;
    if(d){if(!from||d<from)from=d;if(!to||d>to)to=d;}
  }));
  return {keys,count,from,to};
}
function resetModule(mod){
  const label=MODULE_LABELS[mod]||mod, imp=_moduleImpact(mod);
  if(!imp.count){
    openModal(`<div class="modal-ttl">Nothing to delete <button class="modal-x" onclick="closeModal()">×</button></div>
      <p style="font-size:14px;color:var(--gray);margin-bottom:18px">There are no ${label.toLowerCase()} to reset.</p>
      <button class="btn btn-secondary" onclick="closeModal()">OK</button>`);
    return;
  }
  const span=imp.from?` covering <b>${fmtDate(imp.from)}</b> → <b>${fmtDate(imp.to)}</b>`:'';
  openModal(`<div class="modal-ttl">Delete ${label}? <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="background:#fee2e2;border-left:3px solid var(--red);padding:10px 14px;border-radius:0 8px 8px 0;font-size:13px;color:#7f1d1d;margin-bottom:14px">
      This deletes <b>${imp.count}</b> record${imp.count===1?'':'s'}${span}.
    </div>
    <div style="background:var(--g5);border-radius:8px;padding:9px 12px;font-size:12px;color:var(--g1);margin-bottom:14px">
      Recoverable for ${TRASH_TTL_DAYS} days from Settings → Recently Deleted.
    </div>
    <div class="field"><label>Step 1 — take a fresh export</label>
      <button class="btn btn-secondary" id="rz_export" onclick="exportData();document.getElementById('rz_export').textContent='Exported ✓'">${EXPORTED_THIS_SESSION?'Exported ✓':'Export All Data (JSON)'}</button></div>
    <div class="field"><label>Step 2 — manager PIN</label>
      <input type="password" id="rz_pin" placeholder="Manager PIN" autocomplete="off"></div>
    <div id="rz_err" style="color:var(--red);font-size:12px;min-height:16px;margin-bottom:8px"></div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" id="rz_go" onclick="doResetModule('${mod}')">Delete ${imp.count} record${imp.count===1?'':'s'}</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
async function doResetModule(mod){
  const errEl=document.getElementById('rz_err'), btn=document.getElementById('rz_go');
  const setErr=m=>{if(errEl)errEl.textContent=m;};
  const reset=t=>{if(btn){btn.disabled=false;btn.textContent=t;}};
  const original=btn?btn.textContent:'Delete';
  const pin=(document.getElementById('rz_pin')?.value||'').trim();
  if(!EXPORTED_THIS_SESSION){setErr('Take a fresh export first (step 1).');return;}
  if(!pin){setErr('Enter the manager PIN.');return;}
  setErr('');if(btn){btn.disabled=true;btn.textContent='Verifying…';}
  try{
    const m=await db.collection('appConfig').doc('master').get();
    if(!m.exists||m.data().pin!==pin){setErr('Incorrect manager PIN.');reset(original);return;}
  }catch(e){setErr('Could not verify PIN — check your connection.');reset(original);return;}
  if(btn)btn.textContent='Deleting…';
  const imp=_moduleImpact(mod), batchId=uid();
  let done=0;
  try{
    for(const k of imp.keys){await _deleteCol(k,batchId);done++;}
  }catch(e){
    setErr(done?'Stopped part-way — check Recently Deleted, then retry.':'Delete failed — nothing was removed.');
    reset(original);renderSettings();return;
  }
  closeModal();
  toast(`${imp.count} record${imp.count===1?'':'s'} moved to Recently Deleted`);
  renderSettings();
}
// ── RECENTLY DELETED (restore UI) ──
async function openTrashModal(){
  const shell=body=>`<div class="modal-ttl">Recently Deleted <button class="modal-x" onclick="closeModal()">×</button></div>${body}`;
  openModal(shell('<p style="font-size:13px;color:var(--gray)">Loading…</p>'));
  let items;
  try{items=await loadTrash();}
  catch(e){
    openModal(shell(`<p style="font-size:13px;color:var(--red);margin-bottom:12px">Could not load deleted records. Check your connection.</p>
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>`));
    return;
  }
  if(!items.length){
    openModal(shell(`<p style="font-size:13px;color:var(--gray);margin-bottom:12px">Nothing has been deleted in the last ${TRASH_TTL_DAYS} days.</p>
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>`));
    return;
  }
  // One row per delete action, not per record, so a bulk reset reads as a single undoable event.
  const groups={};
  items.forEach(t=>{
    const g=groups[t.batch_id]||(groups[t.batch_id]={id:t.batch_id,at:t.deleted_at,labels:{},n:0});
    g.n++;g.labels[t.label]=(g.labels[t.label]||0)+1;
    if(t.deleted_at>g.at)g.at=t.deleted_at;
  });
  const rows=Object.values(groups).sort((a,b)=>b.at.localeCompare(a.at)).map(g=>{
    const what=Object.entries(g.labels).map(([l,c])=>`${c} × ${l}`).join(' · ');
    const when=new Date(g.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    return `<div class="list-item" style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div><div style="font-weight:600;font-size:13px">${what}</div>
        <div style="font-size:11px;color:var(--gray)">${when}</div></div>
      <button class="btn btn-secondary btn-sm" onclick="doRestoreTrash('${g.id}',this)">Restore</button></div>`;
  }).join('');
  openModal(shell(`<p style="font-size:12px;color:var(--gray);margin-bottom:10px">Kept for ${TRASH_TTL_DAYS} days, then permanently removed.</p>
    ${rows}
    <div id="rt_err" style="color:var(--red);font-size:12px;min-height:16px;margin-top:8px"></div>
    <button class="btn btn-secondary" style="margin-top:6px" onclick="closeModal()">Close</button>`));
}
async function doRestoreTrash(batchId,btn){
  if(btn){btn.disabled=true;btn.textContent='Restoring…';}
  try{
    const n=await restoreTrashBatch(batchId);
    toast(`${n} record${n===1?'':'s'} restored ✓`);
    openTrashModal();renderSettings();
  }catch(e){
    const el=document.getElementById('rt_err');
    if(el)el.textContent='Restore failed — check your connection and try again.';
    if(btn){btn.disabled=false;btn.textContent='Restore';}
  }
}

// Export Data
function exportData(){
  const farm=DB.getFarm(), cols=DB.getCols(), birds=DB.getBirds();
  const feed=DB.getFeed(), health=DB.getHealth(), expenses=DB.getExpenses();
  const sales=DB.getSales();
  const customers=DB.getCustomers(), payments=DB.getPayments();
  const validPenIds=new Set((farm?.pens||[]).map(p=>p.id));
  // Build daily_egg_production summary
  const eggDayMap={};
  cols.filter(c=>validPenIds.has(c.penId)).forEach(c=>{
    if(!eggDayMap[c.date])eggDayMap[c.date]={date:c.date,age_weeks:null,eggs_collected:0,cracked_eggs:0,eggs_spoiled:0};
    (c.entries||[]).forEach(e=>{eggDayMap[c.date].eggs_collected+=(e.eggs||0);eggDayMap[c.date].cracked_eggs+=(e.broken||0);});
  });
  birds.forEach(b=>{if(eggDayMap[b.date])eggDayMap[b.date].age_weeks=b.age_weeks;});
  const bundle={
    exported_at:new Date().toISOString(),source:'LayerTrack',version:'1.0',
    farm,
    daily_egg_production:Object.values(eggDayMap).sort((a,b)=>a.date.localeCompare(b.date)),
    egg_collection_detail:cols,
    daily_bird_status:birds.map(b=>({date:b.date,opening_birds:b.opening_birds,age_weeks:b.age_weeks,
      deaths:b.deaths,culls:b.culls,closing_birds:b.closing_birds,notes:b.notes})),
    daily_feed_usage:feed.map(f=>({date:f.date,age_weeks:f.age_weeks,feed_type:f.feed_type,
      feed_kg_used:f.feed_kg_used,feed_req_kg:f.feed_req_kg})),
    feed_store:DB.getFeedStock().map(r=>({id:r.id,date:r.date,kind:r.kind||'purchase',
      feed_type:r.feed_type,bags:r.bags,loose_kg:r.loose_kg,kg:r.kg,bag_kg:r.bag_kg,
      cost_ngn:r.cost_ngn,supplier:r.supplier,counted_by:r.counted_by,
      variance_kg:r.variance_kg,expense_id:r.expense_id,notes:r.notes})),
    // Derived, so an analyst does not have to reimplement the forward walk.
    // Derived, so an analyst does not have to reimplement the forward walk.
    feed_store_status:getFeedStoreStatus().map(c=>({feed_type:c.feed_type,state:c.state,
      kg_on_hand:c.kg,bags_on_hand:c.bags,loose_kg:c.loose,
      open_ended:c.openEnded,kg_per_day_now:Math.round(c.todayKg*10)/10,
      window_start:c.startDate,window_end:c.openEnded?null:c.endDate,
      window_need_kg:Math.round(c.needKg),cover_days:c.coverDays,runout_date:c.runoutDate,
      short_kg:Math.round(c.shortKg),surplus_kg:Math.round(c.surplusKg),
      bags_to_buy:c.buyBags,last_count_date:c.lastCountDate,headline:c.headline})),
    feed_programme:getFeedProgramme(),
    health_log:health.map(h=>({date:h.date,water_consumed_liters:h.water_consumed_liters,
      droppings_observation:h.droppings_observation,vaccination_or_medication:h.vaccination_or_medication,
      admin_method:h.admin_method,notes:h.notes})),
    expenses:expenses.map(e=>({date:e.date,category:e.category,amount_usd:e.amount_usd,amount_ngn:e.amount_ngn,
      pen_id:e.pen_id||null,pen_name:e.pen_id?(((DB.getFarm()||{}).pens||[]).find(p=>p.id===e.pen_id)||{}).name||null:null,
      notes:e.notes})),
    sales:sales.map(s=>({id:s.id,date:s.date,product:s.product,quantity:s.quantity,unit_price:s.unit_price_ngn,
      total_amount:s.total_amount_ngn,payment_type:s.payment_type||'cash',paid:s.paid!==false,
      amount_paid:getSalePaid(s),balance_due:getSaleBalance(s),
      due_date:s.due_date||null,customer:s.customer,customer_id:s.customer_id||null,notes:s.notes})),
    customers:customers.map(c=>({id:c.id,name:c.name,name_normalized:c.name_normalized,phone:c.phone,
      customer_type:c.customer_type,notes:c.notes,created_at:c.created_at})),
    payments:payments.map(p=>({id:p.id,sale_id:p.sale_id,date:p.date,amount_ngn:p.amount_ngn,
      method:p.method,kind:p.kind,notes:p.notes})),
    receivables:sales.filter(s=>s.payment_type==='credit'&&getSaleBalance(s)>0).map(s=>({
      sale_id:s.id,sale_date:s.date,customer:s.customer,customer_id:s.customer_id||null,
      product:s.product,quantity:s.quantity,
      total_ngn:s.total_amount_ngn,paid_ngn:getSalePaid(s),balance_ngn:getSaleBalance(s),
      due_date:s.due_date||null}))
  };
  const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;
  a.download=`LayerTrack_export_${DB.today()}.json`;a.click();
  URL.revokeObjectURL(url);EXPORTED_THIS_SESSION=true;toast('Export complete ✓');
}
function _mergeById(existing,incoming){
  const map=new Map((existing||[]).map(r=>[r.id,r]));
  (incoming||[]).forEach(r=>{if(r.id&&!map.has(r.id))map.set(r.id,r);});
  return Array.from(map.values());
}
function importData(input){
  const file=input.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    let data;
    try{ data=JSON.parse(e.target.result); }
    catch(err){
      openModal(`<div class="modal-ttl">Import Failed <button class="modal-x" onclick="closeModal()">×</button></div>
        <div style="background:#fee2e2;border-left:3px solid var(--red);padding:10px 14px;border-radius:0 8px 8px 0;font-size:13px;color:#7f1d1d;margin-bottom:12px">
          The file could not be parsed as JSON.<br><b>Error:</b> ${err.message}
        </div>
        <button class="btn btn-secondary" onclick="closeModal()">OK</button>`);
      input.value=''; return;
    }
    const counts={};
    if(data.farm){ DB.saveFarm(data.farm); counts.farm='1 farm config'; }
    if(data.egg_collection_detail?.length){ const m=_mergeById(DB.getCols(),data.egg_collection_detail); DB.saveCols(m); counts.eggs=data.egg_collection_detail.length+' egg sessions merged'; }
    if(data.daily_bird_status?.length){ const m=_mergeById(DB._arr(KEYS.birds),data.daily_bird_status); DB._set(KEYS.birds,m); counts.birds=data.daily_bird_status.length+' bird records merged'; }
    if(data.daily_feed_usage?.length){ const m=_mergeById(DB._arr(KEYS.feed),data.daily_feed_usage); DB._set(KEYS.feed,m); counts.feed=data.daily_feed_usage.length+' feed records merged'; }
    if(data.feed_store?.length){ const m=_mergeById(DB._arr(KEYS.feedstock),data.feed_store); DB._set(KEYS.feedstock,m); counts.feedstock=data.feed_store.length+' feed store entries merged'; }
    if(data.health_log?.length){ const m=_mergeById(DB._arr(KEYS.health),data.health_log); DB._set(KEYS.health,m); counts.health=data.health_log.length+' health records merged'; }
    if(data.expenses?.length){ const m=_mergeById(DB._arr(KEYS.expenses),data.expenses); DB._set(KEYS.expenses,m); counts.expenses=data.expenses.length+' expenses merged'; }
    if(data.sales?.length){ const m=_mergeById(DB._arr(KEYS.sales),data.sales); DB._set(KEYS.sales,m); counts.sales=data.sales.length+' sales merged'; }
    if(data.customers?.length){ const m=_mergeById(DB._arr(KEYS.customers),data.customers); DB._set(KEYS.customers,m); counts.customers=data.customers.length+' customers merged'; }
    if(data.payments?.length){ const m=_mergeById(DB._arr(KEYS.payments),data.payments); DB._set(KEYS.payments,m); counts.payments=data.payments.length+' payments merged'; }
    // Re-render all tabs so data is visible everywhere
    renderHome(); renderFlock(); renderFeed(); renderHealth(); renderFinance(); renderReports(); renderSettings();
    const lines=Object.values(counts);
    if(lines.length===0){
      openModal(`<div class="modal-ttl">Nothing Imported <button class="modal-x" onclick="closeModal()">×</button></div>
        <div style="font-size:13px;color:var(--gray);margin-bottom:12px">The file was valid JSON but contained no recognisable data arrays. Check that the file came from the LayerTrack converter.</div>
        <button class="btn btn-secondary" onclick="closeModal()">OK</button>`);
    } else {
      openModal(`<div class="modal-ttl">Import Complete ✓ <button class="modal-x" onclick="closeModal()">×</button></div>
        <div style="background:#d1fae5;border-left:3px solid var(--g2);padding:10px 14px;border-radius:0 8px 8px 0;font-size:13px;color:#065f46;margin-bottom:12px">
          ${lines.map(l=>`✓ ${l}`).join('<br>')}
        </div>
        <div style="font-size:12px;color:var(--gray);margin-bottom:12px">Existing data was preserved. New records were added alongside it.</div>
        <button class="btn btn-primary" onclick="closeModal()">Done</button>`);
    }
    input.value='';
  };
  reader.readAsText(file);
}
