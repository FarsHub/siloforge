// ═══════════════════════════════════════════════
// FEED — DAILY FEED USAGE
// ═══════════════════════════════════════════════
let FEED_TAB='usage';
function renderFeed(){
  const el=document.getElementById('v-feed');
  const alerts=feedAlerts();
  const dot=alerts.some(a=>a.state==='urgent')?' 🔴':alerts.length?' 🟠':'';
  el.innerHTML=`<div class="topbar"><div><h1>Feed Management</h1><small>Daily usage · store &amp; reorder</small></div></div>
    <div class="inner-tabs">
      <button class="inner-tab ${FEED_TAB==='usage'?'active':''}" onclick="FEED_TAB='usage';renderFeed()">Daily Usage</button>
      <button class="inner-tab ${FEED_TAB==='store'?'active':''}" onclick="FEED_TAB='store';renderFeed()">Feed Store${dot}</button>
    </div>`
    +(FEED_TAB==='store'?feedStoreBody():feedUsageBody());
}
function feedUsageBody(){
  const today=DB.today(), farm=DB.getFarm();
  if(!_activePenId)return getPenSelectPrompt();
  const recs=DB.getFeed().filter(r=>!r.pen_id||r.pen_id===_activePenId).sort((a,b)=>b.date.localeCompare(a.date));
  const todayRec=recs.find(r=>r.date===today);
  const totalUsed7=recs.filter(r=>{const d=new Date(today);d.setDate(d.getDate()-7);return r.date>d.toISOString().slice(0,10);}).reduce((s,r)=>s+(r.feed_kg_used||0),0);
  const farmBirds=farm?getFarmTotalBirds(farm):0;
  const lastBird=DB.getBirds().sort((a,b)=>b.date.localeCompare(a.date))[0];
  const closingBirds=lastBird?.closing_birds||farmBirds;
  const logHtml=`<div class="card">
    <div class="card-title">${todayRec?'Today\'s Feed Log ✓':'Log Feed Usage'}</div>
    ${todayRec?`
      ${(()=>{const vr=todayRec.feed_req_kg>0?((todayRec.feed_kg_used-todayRec.feed_req_kg)/todayRec.feed_req_kg*100):0;const vc=Math.abs(vr)>15?'var(--red)':Math.abs(vr)>10?'var(--amber)':'var(--g2)';return`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--g2)">${todayRec.feed_kg_used}</div><div class="kpi-lbl-sm">kg Used</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm">${todayRec.feed_req_kg}</div><div class="kpi-lbl-sm">kg Required</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:${vc}">${vr>0?'+':''}${vr.toFixed(0)}%</div><div class="kpi-lbl-sm">Variance</div></div>
      </div>`;})()}
      <div style="font-size:12px;color:var(--gray);margin-bottom:10px">${canonFeedType(todayRec.feed_type)}</div>
      ${todayRec.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-bottom:10px">"${todayRec.notes}"</div>`:''}
      <div style="display:flex;gap:8px">
        <button class="btn btn-amber btn-sm" style="flex:1" onclick="openFeedForm('${todayRec.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" style="flex:1" onclick="delFeed('${todayRec.id}')">Delete</button>
      </div>`:`<button class="btn btn-primary" onclick="openFeedForm()">+ Add Feed Entry</button>`}
  </div>`;
  const histHtml=recs.filter(r=>r.date!==today).slice(0,30).map(r=>{
    const vr=r.feed_req_kg>0?((r.feed_kg_used-r.feed_req_kg)/r.feed_req_kg*100):0;
    const vc=Math.abs(vr)>15?'badge-red':Math.abs(vr)>10?'badge-amber':'badge-green';
    return`<div class="list-item">
      <div><div style="font-weight:700;font-size:14px">${fmtDate(r.date)} <span style="font-size:11px;color:var(--gray)">${canonFeedType(r.feed_type)}</span></div>
        <div style="font-size:12px;color:var(--gray);margin-top:2px">${r.feed_kg_used} kg used · Req: ${r.feed_req_kg} kg</div>
        ${r.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-top:4px">"${r.notes}"</div>`:''}
        <span class="badge ${vc}" style="margin-top:4px">${vr>0?'+':''}${vr.toFixed(0)}%</span></div>
      <div style="display:flex;gap:5px">
        ${isLocked(r.date)?LOCK_BADGE:`<button class="btn btn-secondary btn-sm" onclick="openFeedForm('${r.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="delFeed('${r.id}')">✕</button>`}
      </div></div>`;
  }).join('');
  const _ageW=getFarmAgeWeeks(farm)||0;
  const _dynRate=getLayerFeedRate(_ageW);
  const _phaseHint=_ageW>=21?'Laying':'Wk '+_ageW;
  return `${getPenCtxBar()}
    <div class="kpi-row-3">
      <div class="kpi"><div class="kpi-val">${totalUsed7.toFixed(0)}</div><div class="kpi-lbl">kg Used (7d)</div></div>
      <div class="kpi"><div class="kpi-val">${_dynRate}</div><div class="kpi-lbl">g/Bird/Day<br><span style="font-weight:500;font-size:9px;color:var(--g3)">${_phaseHint}</span></div></div>
      <div class="kpi"><div class="kpi-val" style="color:var(--g2)">${closingBirds}</div><div class="kpi-lbl">Active Birds</div></div>
    </div>
    ${logHtml}
    <div class="sec-hdr">History</div>
    <div class="card" style="padding:0;overflow:hidden">${histHtml||'<div class="empty" style="padding:24px"><p>No previous records.</p></div>'}</div>
    <div style="height:12px"></div>`;
}

// ── Feed Store tab ──────────────────────────────────────────────────────
// Not gated on a selected pen: there is one store, and whoever is holding the
// phone in it should be able to enter a count without first picking a pen.
// One card per feed, and a store holds more feeds than a flock is eating: the
// leftovers and the not-yet-started ones were each taking a full card to say
// nothing, pushing the one feed that needs buying off the bottom of the screen.
// So a card carries its own answer in its header and only opens when asked —
// the same bargain as the tables in the Feed report.
let FEED_CARD_OPEN={};
// Open by default only where there is something to decide: a shortage, bags to
// buy, or feed the birds are eating today. Everything else starts shut.
function feedCardOpen(r){
  const k='ft:'+r.feed_type;
  if(k in FEED_CARD_OPEN)return FEED_CARD_OPEN[k];
  return r.state==='urgent'||r.state==='soon'||r.buyBags>0||r.todayKg>0;
}
function toggleFeedCard(type,wasOpen){
  FEED_CARD_OPEN['ft:'+type]=!wasOpen;
  renderFeed();
}
function feedStoreBody(){
  const rows=getFeedStoreStatus();
  const {warnDays,urgentDays,targetDays}=getFeedPolicy();
  const actions=`<div style="margin:12px 16px;display:flex;flex-direction:column;gap:8px">
    <button class="btn btn-primary" onclick="openFeedCount()">⚖ Enter Stock Count</button>
    <button class="btn btn-secondary" onclick="openFeedPurchase()">＋ Record Feed Purchase</button>
  </div>`;
  if(rows.length===0){
    return `<div class="empty" style="padding:28px 24px">
        <h3>Nothing in the feed store yet</h3>
        <p>Count what is in the store and the app works out whether it covers the stage the flock is on, and how many bags to buy — no more counting and dividing by hand.</p>
      </div>${actions}`;
  }
  const banners=rows.filter(r=>r.state==='urgent'||r.state==='soon').map(r=>
    `<div class="alert-item ${r.state==='urgent'?'alert-red':'alert-amber'}">🌾 ${r.tickerText}</div>`).join('');

  // What is coming, in the order it is coming. This is the answer to "what am I
  // buying next" without reading a single card.
  const tl=feedTimeline();
  const timelineHtml=tl.length<2?'':`
    <div class="sec-hdr">Feed Programme Ahead</div>
    <div class="card" style="padding:0;overflow:hidden">
      ${tl.map(t=>{
        const cls=t.state==='urgent'?'var(--red)':t.state==='soon'?'var(--amber)':'var(--g3)';
        const when=t.startDay===0
          ?(t.openEnded?'now onwards':`now → ${fmtDate(t.endDate)}`)
          :(t.openEnded?`from ${fmtDate(t.startDate)}`:`${fmtDate(t.startDate)} → ${fmtDate(t.endDate)}`);
        return `<div class="list-item">
          <div style="display:flex;align-items:center;gap:10px;min-width:0">
            <div style="width:8px;height:8px;border-radius:50%;background:${cls};flex-shrink:0"></div>
            <div style="min-width:0">
              <div style="font-weight:700;font-size:14px">${t.feed_type}</div>
              <div style="font-size:11px;color:var(--gray)">${when}${t.openEnded?'':` · needs ${t.needBags} bag${t.needBags===1?'':'s'}`}</div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            ${t.buyBags>0
              ?`<div style="font-weight:800;font-size:15px;color:${cls}">buy ${t.buyBags}</div>`
              :`<div style="font-weight:800;font-size:13px;color:var(--g2)">✓</div>`}
            <div style="font-size:10px;color:var(--gray)">have ${fmtBags(t.haveKg,t.feed_type)}</div>
          </div>
        </div>`;}).join('')}
    </div>`;

  const cards=rows.map(r=>{
    const col=feedCoverColor(r.state);
    const ppk=lastFeedPricePerKg(r.feed_type);
    const staleDays=r.lastCountDate?daysBetween(r.lastCountDate,DB.today()):null;
    const bg=r.state==='urgent'?'var(--redBg)':r.state==='soon'?'var(--amberBg)'
      :r.state==='idle'?'#f5f5f5':'var(--g5)';
    const fg=r.state==='urgent'?'#7f1d1d':r.state==='soon'?'#7d4e00'
      :r.state==='idle'?'var(--gray)':'var(--g1)';
    // The sub-line explains the shape of the verdict, which is the part that is
    // easy to misread: a window is judged on finishing, a runway on lasting.
    let sub='';
    if(r.state==='idle'){
      sub='';
    } else if(r.openEnded){
      sub=r.todayKg>0
        ?`Eating <b>${r.todayKg.toFixed(1)} kg/day</b> today across ${r.penCount} pen${r.penCount===1?'':'s'} — rises as the flock ages`
        :`Starts ${fmtDate(r.startDate)}, then no end date`;
    } else if(r.startDay>0){
      sub=`This stage needs <b>${bagsFor(r.needKg,r.feed_type)} bag${bagsFor(r.needKg,r.feed_type)===1?'':'s'}</b> (${r.needKg.toFixed(0)} kg) from ${fmtDate(r.startDate)} to ${fmtDate(r.endDate)}`;
    } else {
      sub=`Rest of this stage needs <b>${bagsFor(r.needKg,r.feed_type)} bag${bagsFor(r.needKg,r.feed_type)===1?'':'s'}</b> (${r.needKg.toFixed(0)} kg) through ${fmtDate(r.endDate)}`
        +(r.todayKg>0?` · ${r.todayKg.toFixed(1)} kg/day now`:'');
    }
    const footer=r.state==='idle'
      ? `<div style="font-size:12px;color:var(--gray);border-top:1px solid #f0f0f0;padding-top:10px">${r.kg>0.05
          ?'Keep it, or it will be picked up again automatically if the programme calls for it later.'
          :'None in store and nothing on this feed — listed only because it appears in older records.'}</div>`
      : r.buyBags>0
        ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid #f0f0f0;padding-top:10px">
            <div style="font-size:12px;color:var(--gray)">${r.openEnded?`To cover ${targetDays} days`:'To finish this stage'} you need ${Math.max(0,r.buyKg).toFixed(0)} kg more
              ${ppk?`<br>≈ ${fmtMoney(Math.round(r.buyBags*getBagKg(r.feed_type)*ppk))} at last price (${fmtMoney(Math.round(ppk))}/kg)`:''}</div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:20px;font-weight:800;color:var(--g2);line-height:1.1">${r.buyBags}</div>
              <div style="font-size:10px;color:var(--gray);text-transform:uppercase;font-weight:700">bags to buy</div>
            </div>
          </div>`
        : `<div style="font-size:12px;color:var(--g3);font-weight:700;border-top:1px solid #f0f0f0;padding-top:10px">✓ ${r.openEnded?`Enough for the next ${targetDays} days`:'Nothing to buy for this stage'}</div>`;
    const open=feedCardOpen(r);
    // Feed names reach here off stored records, so quote them for the handler.
    const tArg=String(r.feed_type).replace(/['\\]/g,'\\$&');
    const counted=r.lastCountDate
      ?`Last counted ${staleDays===0?'today':staleDays===1?'yesterday':staleDays+' days ago'}`
      :'Never counted — balance is from purchases minus usage';
    return `<div class="card" style="${open?'':'padding:14px 16px'}">
      <div onclick="toggleFeedCard('${tArg}',${open?1:0})" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;cursor:pointer;${open?'margin-bottom:10px':''}">
        <div style="min-width:0">
          <div style="font-weight:800;font-size:16px;display:flex;align-items:center;gap:7px;min-width:0">
            <span style="font-size:14px;line-height:1;color:var(--gray);flex-shrink:0;display:inline-block;transition:transform .2s;transform:rotate(${open?0:-90}deg)">▾</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.feed_type}</span>
          </div>
          ${open
            ?`<div style="font-size:11px;color:var(--gray);margin-top:2px">${counted}</div>`
            :`<div style="display:flex;align-items:center;gap:6px;margin-top:3px;min-width:0">
                <span style="width:7px;height:7px;border-radius:50%;background:${col};flex-shrink:0"></span>
                <span style="font-size:12px;color:${fg};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.headline}</span>
              </div>`}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:${open?22:18}px;font-weight:800;color:${col};line-height:1.1">${r.bags}<span style="font-size:12px;font-weight:600;color:var(--gray)"> bag${r.bags===1?'':'s'}</span></div>
          <div style="font-size:11px;color:var(--gray)">${r.loose>0?`+ ${r.loose} kg · `:''}${r.kg.toFixed(1)} kg</div>
        </div>
      </div>
      ${open?`
      <div style="background:${bg};border-radius:10px;padding:11px 13px;margin-bottom:10px">
        <div style="font-weight:800;font-size:14px;color:${fg}">${r.headline}</div>
        ${sub?`<div style="font-size:12px;color:var(--g1);margin-top:3px">${sub}</div>`:''}
      </div>
      ${footer}
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="openFeedCount(null,'${tArg}')">Count</button>
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="openFeedPurchase(null,'${tArg}')">Purchase</button>
      </div>`:''}
    </div>`;
  }).join('');

  const allCounts=DB.getFeedStock().filter(r=>(r.kind||'purchase')==='count');
  const lossKg=allCounts.reduce((s,r)=>s+Math.min(0,Number(r.variance_kg||0)),0);
  const shrinkHtml=allCounts.length===0?'':`
    <div style="margin:0 16px 8px;background:${lossKg<-1?'var(--amberBg)':'var(--g5)'};border-radius:10px;padding:10px 13px;font-size:12px;color:${lossKg<-1?'#7d4e00':'var(--g1)'}">
      ${lossKg<-1
        ?`⚠ Counts have found <b>${Math.abs(lossKg).toFixed(1)} kg</b> less than the books expected across ${allCounts.length} count${allCounts.length===1?'':'s'} — spillage, damp, or feed walking.`
        :`✓ Counts match the books to within ${Math.abs(lossKg).toFixed(1)} kg across ${allCounts.length} count${allCounts.length===1?'':'s'}.`}
    </div>`;
  // Merged newest-first, but each row still carries its own type's balance —
  // one running figure across types would be meaningless.
  const led=feedStoreTypes().flatMap(t=>feedStockLedger(t))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))
      ||(_FS_RANK[b.kind]??1)-(_FS_RANK[a.kind]??1))
    .slice(0,40);
  const logRows=led.map(e=>{
    const r=e.rec;
    if(e.kind==='usage')return `<div class="list-item">
      <div><div style="font-weight:700;font-size:13px">${fmtDate(e.date)} <span style="font-size:11px;color:var(--gray);font-weight:500">fed to birds · ${e.feed_type}</span></div>
        <div style="font-size:12px;color:var(--red);margin-top:2px">− ${e.kg.toFixed(1)} kg</div></div>
      <div style="text-align:right;font-size:12px;color:var(--gray)">${fmtBags(e.balance,e.feed_type)}<div style="font-size:10px">left</div></div></div>`;
    const isCount=e.kind==='count';
    const label=isCount?'stock count':'purchase';
    const deltaTxt=isCount
      ? (Math.abs(e.delta)<0.05?'matched the books'
         :`${e.delta>0?'+':'−'} ${Math.abs(e.delta).toFixed(1)} kg vs books`)
      : `+ ${e.kg.toFixed(1)} kg${r.bags?` (${r.bags} bag${r.bags===1?'':'s'})`:''}`;
    return `<div class="list-item">
      <div><div style="font-weight:700;font-size:13px">${fmtDate(e.date)} <span style="font-size:11px;color:var(--gray);font-weight:500">${label} · ${e.feed_type}</span></div>
        <div style="font-size:12px;color:${isCount?(e.delta<-0.05?'var(--red)':'var(--gray)'):'var(--g2)'};margin-top:2px">${deltaTxt}</div>
        ${r.cost_ngn?`<div style="font-size:11px;color:var(--gray);margin-top:2px">${fmtMoney(r.cost_ngn)}${Number(r.kg)>0?` · ${fmtMoney(Math.round(r.cost_ngn/r.kg))}/kg`:''}${r.supplier?` · ${r.supplier}`:''}</div>`:''}
        ${r.counted_by?`<div style="font-size:11px;color:var(--gray);margin-top:2px">Counted by ${r.counted_by}</div>`:''}
        ${r.notes?`<div style="font-size:11px;color:var(--gray);font-style:italic;margin-top:2px">"${r.notes}"</div>`:''}</div>
      <div style="text-align:right">
        <div style="font-size:12px;color:var(--gray)">${fmtBags(e.balance,e.feed_type)}<div style="font-size:10px">left</div></div>
        <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end">
          ${isLocked(e.date)?LOCK_BADGE:`<button class="btn btn-secondary btn-sm" onclick="${isCount?`openFeedCount('${r.id}')`:`openFeedPurchase('${r.id}')`}">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="delFeedStock('${r.id}')">✕</button>`}
        </div>
      </div></div>`;
  }).join('');
  return `${banners?`<div style="margin:12px 16px 0">${banners}</div>`:''}
    ${actions}
    ${shrinkHtml}
    ${cards}
    ${timelineHtml}
    <div class="sec-hdr">Store Movement
      <span style="font-size:11px;color:var(--gray);text-transform:none;font-weight:500">Amber under ${warnDays} days of feed left, red under ${urgentDays} · buys to ${targetDays}d</span>
    </div>
    <div class="card" style="padding:0;overflow:hidden">${logRows||'<div class="empty" style="padding:24px"><p>No movement yet.</p></div>'}</div>
    <div style="height:12px"></div>`;
}

// ── Feed purchase ───────────────────────────────────────────────────────
// Entered once, in bags, and it writes the matching Feed Purchase expense so
// the store and the books cannot drift apart through double entry.
function openFeedPurchase(editId,presetType){
  const today=DB.today();
  const rec=editId?DB.getFeedStock().find(r=>r.id===editId):null;
  const type=canonFeedType(rec?.feed_type||presetType)||'Layer Mash';
  openModal(`<div class="modal-ttl">${rec?'Edit':'Record'} Feed Purchase <button class="modal-x" onclick="closeModal()">×</button></div>
    <div class="field"><label>Date</label><input type="date" id="fp_date" value="${rec?rec.date:today}" min="${lockMinDate()}" max="${today}"></div>
    <div class="field"><label>Feed Type</label>
      <select id="fp_type" onchange="calcFeedPurchase()">${feedTypeOptions(type)}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Bags</label><input type="number" id="fp_bags" value="${rec?.bags??''}" min="0" step="1" inputmode="numeric" placeholder="e.g. 20" oninput="calcFeedPurchase()"></div>
      <div class="field"><label>Loose kg <span style="color:var(--gray);font-weight:400">opt</span></label><input type="number" id="fp_loose" value="${rec?.loose_kg||''}" min="0" step="0.5" placeholder="0" oninput="calcFeedPurchase()"></div>
    </div>
    <div class="field"><label>Total cost (₦) <span style="color:var(--gray);font-weight:400">— posts to Expenses</span></label>
      <input type="number" id="fp_cost" value="${rec?.cost_ngn||''}" min="0" step="100" inputmode="numeric" placeholder="0" oninput="calcFeedPurchase()"></div>
    <div id="fp_prev" style="background:var(--g5);border-radius:8px;padding:9px 12px;font-size:12px;color:var(--g1);margin-bottom:12px"></div>
    <div class="field"><label>Supplier <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <input type="text" id="fp_supplier" value="${(rec?.supplier||'').replace(/"/g,'&quot;')}" placeholder="e.g. Amo Byng"></div>
    <div class="field"><label>Notes <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <textarea id="fp_notes" placeholder="e.g. price up ₦500/bag">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveFeedPurchase('${editId||''}')">Save</button>`);
  calcFeedPurchase();
}
function calcFeedPurchase(){
  const el=document.getElementById('fp_prev'); if(!el)return;
  const type=document.getElementById('fp_type').value;
  const bagKg=getBagKg(type);
  const bags=parseFloat(document.getElementById('fp_bags').value)||0;
  const loose=parseFloat(document.getElementById('fp_loose').value)||0;
  const cost=parseFloat(document.getElementById('fp_cost').value)||0;
  const kg=bags*bagKg+loose;
  if(kg<=0){el.innerHTML=`Bag size for ${type} is <b>${bagKg} kg</b> — change it in Settings if yours differ.`;return;}
  const ppk=lastFeedPricePerKg(type);
  const nowPpk=cost>0?cost/kg:null;
  const drift=(ppk&&nowPpk)?((nowPpk-ppk)/ppk*100):null;
  el.innerHTML=`Adds <b>${kg.toFixed(1)} kg</b> at ${bagKg} kg/bag`
    +(cost>0?` · <b>${fmtMoney(Math.round(nowPpk))}/kg</b> (${fmtMoney(Math.round(cost/Math.max(1,bags||kg/bagKg)))}/bag)`:'')
    +(drift!==null&&Math.abs(drift)>=1?`<br><span style="color:${drift>0?'var(--red)':'var(--g2)'};font-weight:700">${drift>0?'▲':'▼'} ${Math.abs(drift).toFixed(0)}% vs last purchase</span>`:'');
}
function saveFeedPurchase(editId){
  const date=document.getElementById('fp_date').value;
  const feed_type=document.getElementById('fp_type').value;
  const bags=parseFloat(document.getElementById('fp_bags').value)||0;
  const loose_kg=parseFloat(document.getElementById('fp_loose').value)||0;
  const cost_ngn=parseFloat(document.getElementById('fp_cost').value)||0;
  const bag_kg=getBagKg(feed_type);
  const kg=Math.round((bags*bag_kg+loose_kg)*10)/10;
  if(!date){toast('Pick a date');return;}
  if(kg<=0){toast('Enter the bags received');return;}
  const existing=editId?DB.getFeedStock().find(r=>r.id===editId):null;
  if(!lockGuard(date,existing?.date))return;
  const id=editId||uid();
  const rec={id,date,kind:'purchase',feed_type,bags,loose_kg,kg,bag_kg,cost_ngn,
    supplier:document.getElementById('fp_supplier').value.trim(),
    notes:document.getElementById('fp_notes').value.trim(),
    expense_id:existing?.expense_id||undefined};
  syncFeedPurchaseExpense(rec);
  if(editId)DB.updFeedStock(editId,rec); else DB.addFeedStock(rec);
  closeModal();confirmSave('Feed purchase saved');renderFeed();renderHome();renderFinance();renderFeedTicker();
}
// Keeps one Feed Purchase expense in step with the purchase record. Mutates
// rec.expense_id so the link survives on the stored copy.
function syncFeedPurchaseExpense(rec){
  const linked=rec.expense_id?DB.getExpenses().find(e=>e.id===rec.expense_id):null;
  if(!(rec.cost_ngn>0)){
    if(linked)DB.delExpense(linked.id);
    rec.expense_id=undefined;
    return;
  }
  const notes=`${rec.bags?`${rec.bags} bag${rec.bags===1?'':'s'} `:''}${rec.feed_type}`
    +(rec.loose_kg>0?` + ${rec.loose_kg} kg`:'')
    +` (${rec.kg} kg)`+(rec.supplier?` · ${rec.supplier}`:'');
  const payload={date:rec.date,category:'Feed Purchase',amount_ngn:rec.cost_ngn,amount_usd:0,
    notes,feed_stock_id:rec.id};
  if(linked){ DB.updExpense(linked.id,payload); }
  else { const eid=uid(); DB.addExpense({id:eid,...payload}); rec.expense_id=eid; }
}

// ── Stock count ─────────────────────────────────────────────────────────
// The entry point for whoever is standing in the store. Count full bags, weigh
// what is in the open one, save — and the answer that used to need a phone call
// to the owner appears on the spot.
function openFeedCount(editId,presetType){
  const today=DB.today();
  const rec=editId?DB.getFeedStock().find(r=>r.id===editId):null;
  const stocked=getFeedStockByType();
  const type=canonFeedType(rec?.feed_type||presetType||stocked[0]?.feed_type)||'Layer Mash';
  openModal(`<div class="modal-ttl">${rec?'Edit':'Enter'} Stock Count <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="background:var(--blueBg);border-left:3px solid var(--blue);padding:8px 12px;border-radius:0 6px 6px 0;font-size:12px;color:#1a5fa8;margin-bottom:12px">
      🧮 Count the full bags in the store and weigh what is left in the opened one. This becomes the new balance — you do not need to work out the days yourself.
    </div>
    <input type="hidden" id="fc_edit" value="${editId||''}">
    <div class="field"><label>Date counted</label><input type="date" id="fc_date" value="${rec?rec.date:today}" min="${lockMinDate()}" max="${today}"></div>
    <div class="field"><label>Feed Type</label>
      <select id="fc_type" onchange="calcFeedCount()">${feedTypeOptions(type)}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Full bags</label><input type="number" id="fc_bags" value="${rec?.bags??''}" min="0" step="1" inputmode="numeric" placeholder="e.g. 14" oninput="calcFeedCount()"></div>
      <div class="field"><label>Opened bag (kg)</label><input type="number" id="fc_loose" value="${rec?.loose_kg||''}" min="0" step="0.5" placeholder="0" oninput="calcFeedCount()"></div>
    </div>
    <div id="fc_prev" style="background:var(--g5);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--g1);margin-bottom:12px"></div>
    <div class="field"><label>Counted by <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <input type="text" id="fc_by" value="${(rec?.counted_by||'').replace(/"/g,'&quot;')}" placeholder="Name of whoever counted"></div>
    <div class="field"><label>Notes <span style="color:var(--gray);font-weight:400">— optional</span></label>
      <textarea id="fc_notes" placeholder="e.g. two bags caked, set aside">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveFeedCount('${editId||''}')">Save Count</button>`);
  calcFeedCount();
}
function calcFeedCount(){
  const el=document.getElementById('fc_prev'); if(!el)return;
  const type=document.getElementById('fc_type').value;
  const bagKg=getBagKg(type);
  const bags=parseFloat(document.getElementById('fc_bags').value)||0;
  const loose=parseFloat(document.getElementById('fc_loose').value)||0;
  const kg=bags*bagKg+loose;
  const book=feedBookKg(type,document.getElementById('fc_edit')?.value||undefined);
  const diff=kg-book;
  // Re-run the verdict against the counted figure so the preview answers the
  // real question before the count is even saved.
  const row=getFeedStoreStatus().find(c=>c.feed_type===type);
  let coverTxt='';
  if(row&&row.demand){
    let left=kg, covered=0, shortDay=null;
    for(const day of row.demand.days){
      if(left<day.kg-1e-9){shortDay=day.d;break;}
      left-=day.kg; covered++;
    }
    const pol=getFeedPolicy();
    const needKg=row.demand.totalKg;
    const buyKg=row.openEnded
      ?Math.max(0,row.demand.days.reduce((a,x)=>x.d<pol.targetDays?a+x.kg:a,0)-kg)
      :Math.max(0,needKg-kg);
    const buyBags=bagsFor(buyKg,type);
    const urgent=shortDay!==null&&shortDay<pol.urgentDays;
    const line=shortDay===null
      ?(row.openEnded?`Over ${covered} days of cover`
        :`Covers this stage to ${fmtDate(row.endDate)}`)
      :(row.openEnded?`${covered} day${covered===1?'':'s'} of feed · runs out ${fmtDate(addDays(DB.today(),shortDay))}`
        :`Runs out ${fmtDate(addDays(DB.today(),shortDay))}, before this stage ends ${fmtDate(row.endDate)}`);
    coverTxt=`<div style="margin-top:6px;font-weight:800;font-size:13px;color:${urgent?'var(--red)':'var(--g1)'}">${line}</div>
      <div style="margin-top:2px">${buyBags>0?`Buy <b>${buyBags} bag${buyBags===1?'':'s'}</b> ${row.openEnded?`to cover ${pol.targetDays} days`:'to finish this stage'}`:'Nothing to buy'}</div>`;
  }
  el.innerHTML=`Counted <b>${kg.toFixed(1)} kg</b> at ${bagKg} kg/bag · books say ${book.toFixed(1)} kg`
    +(Math.abs(diff)<0.05?' — <b>matches</b>'
      :`<br><span style="color:${diff<0?'var(--red)':'var(--amber)'};font-weight:700">${diff<0?`Short by ${Math.abs(diff).toFixed(1)} kg`:`Over by ${diff.toFixed(1)} kg`}</span>`)
    +coverTxt;
}
function saveFeedCount(editId){
  const date=document.getElementById('fc_date').value;
  const feed_type=document.getElementById('fc_type').value;
  const bags=parseFloat(document.getElementById('fc_bags').value)||0;
  const loose_kg=parseFloat(document.getElementById('fc_loose').value)||0;
  const bag_kg=getBagKg(feed_type);
  const kg=Math.round((bags*bag_kg+loose_kg)*10)/10;
  if(!date){toast('Pick the date counted');return;}
  if(!lockGuard(date,editId?DB.getFeedStock().find(r=>r.id===editId)?.date:null))return;
  if(bags===0&&loose_kg===0&&!confirm('Record the store as empty for '+feed_type+'?'))return;
  // Snapshotted against the books with this count itself excluded, so the figure
  // recorded is what was actually found rather than a self-referential zero.
  const book=feedBookKg(feed_type,editId||undefined);
  const rec={id:editId||uid(),date,kind:'count',feed_type,bags,loose_kg,kg,bag_kg,
    variance_kg:Math.round((kg-book)*10)/10,
    counted_by:document.getElementById('fc_by').value.trim(),
    notes:document.getElementById('fc_notes').value.trim()};
  if(editId)DB.updFeedStock(editId,rec); else DB.addFeedStock(rec);
  closeModal();renderFeed();renderHome();renderFeedTicker();
  confirmSave('Stock count saved');
  showFeedCountResult(feed_type);
}
// The payoff screen: says what the count means so nobody has to call and ask.
// The payoff screen: says what the count means so nobody has to call and ask.
function showFeedCountResult(feedType){
  const r=getFeedStoreStatus().find(c=>c.feed_type===feedType);
  if(!r)return;
  const bg=r.state==='urgent'?'var(--redBg)':r.state==='soon'?'var(--amberBg)':'#d1fae5';
  // A runway leads with days; a window leads with whether it finishes the stage.
  const big=r.openEnded
    ?{val:r.coverDays===null?'—':r.coverDays,lbl:'days of feed left'}
    :r.shortKg>0.05
      ?{val:bagsFor(r.shortKg,feedType),lbl:'bags short of finishing this stage'}
      :{val:'✓',lbl:'covers this stage'};
  openModal(`<div class="modal-ttl">${feedType} <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="background:${bg};border-radius:10px;padding:14px;margin-bottom:12px;text-align:center">
      <div style="font-size:30px;font-weight:800;line-height:1;color:${feedCoverColor(r.state)}">${big.val}</div>
      <div style="font-size:12px;font-weight:700;color:var(--g1);text-transform:uppercase;letter-spacing:.4px;margin-top:4px">${big.lbl}</div>
      <div style="font-size:12px;color:var(--g1);margin-top:6px">${r.headline}</div>
    </div>
    <div style="font-size:13px;color:var(--g1);line-height:1.7;margin-bottom:14px">
      In store: <b>${fmtBags(r.kg,feedType)}</b> (${r.kg.toFixed(1)} kg)<br>
      ${r.todayKg>0?`Eating <b>${r.todayKg.toFixed(1)} kg/day</b> today, rising with age<br>`:''}
      ${r.demand&&!r.openEnded?`This stage still needs <b>${bagsFor(r.needKg,feedType)} bag${bagsFor(r.needKg,feedType)===1?'':'s'}</b> through ${fmtDate(r.endDate)}<br>`:''}
      ${r.buyBags>0?`<b>Buy ${r.buyBags} bag${r.buyBags===1?'':'s'}</b>`:'Nothing to buy'}
    </div>
    <button class="btn btn-primary" onclick="closeModal()">Done</button>`);
}
function delFeedStock(id){
  const rec=DB.getFeedStock().find(r=>r.id===id);
  const linked=rec?.expense_id?DB.getExpenses().find(e=>e.id===rec.expense_id):null;
  openModal(`<div class="modal-ttl">Delete? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:14px">
      ${rec?.kind==='count'?'The balance goes back to purchases minus usage.':'Stock on hand drops by '+Number(rec?.kg||0).toFixed(1)+' kg.'}
      ${linked?`<br><br>The linked <b>${fmtMoney(linked.amount_ngn)}</b> Feed Purchase expense is removed too.`:''}
      <br><br>Recoverable for ${TRASH_TTL_DAYS} days from Settings → Recently Deleted.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();doDelFeedStock('${id}')">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
function doDelFeedStock(id){
  const rec=DB.getFeedStock().find(r=>r.id===id);
  if(!lockGuard(rec?.date))return;
  if(rec?.expense_id&&DB.getExpenses().some(e=>e.id===rec.expense_id))DB.delExpense(rec.expense_id);
  DB.delFeedStock(id);
  confirmSave('Deleted');renderFeed();renderHome();renderFinance();renderFeedTicker();
}
function openFeedForm(editId){
  const farm=DB.getFarm(), today=DB.today();
  const rec=editId?DB.getFeed().find(r=>r.id===editId):null;
  const lastBird=DB.getBirds().sort((a,b)=>b.date.localeCompare(a.date))[0];
  const closingBirds=lastBird?.closing_birds||getFarmTotalBirds(farm)||0;
  const _fw=getFarmAgeWeeks(farm)||0;
  const feedRateG=getLayerFeedRate(_fw);
  const feedRate=feedRateG/1000;
  const defReq=(closingBirds*feedRate).toFixed(1);
  const _phLabel=_fw>=21?'Laying phase':`Week ${_fw} pullet`;
  const rateLabel=rec?.feed_rate_g?`Rate locked at <b>${rec.feed_rate_g} g/bird/day</b> (current: ${feedRateG}g)`:`Auto rate: <b>${feedRateG} g/bird/day</b> (${_phLabel})`;
  openModal(`<div class="modal-ttl">${rec?'Edit':'Add'} Feed Entry <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="background:var(--blueBg);border-left:3px solid var(--blue);padding:8px 12px;border-radius:0 6px 6px 0;font-size:12px;color:#1a5fa8;margin-bottom:12px">
      📅 Logging yesterday's feed? Change the date — e.g. weigh leftover feed in the morning, then record it as <b>yesterday's</b> consumption.<br><span style="margin-top:4px;display:block">⚖️ ${rateLabel}</span>
    </div>
    <div class="field"><label>Date</label><input type="date" id="ff_date" value="${rec?rec.date:today}" min="${lockMinDate()}" max="${today}"></div>
    <div class="field"><label>Feed Type</label>
      <select id="ff_type">${feedTypeOptions(rec?.feed_type)}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>kg Used</label><input type="number" id="ff_used" value="${rec?.feed_kg_used||''}" min="0" step="0.5" placeholder="e.g. 73"></div>
      <div class="field"><label>kg Required</label><input type="number" id="ff_req" value="${rec?.feed_req_kg||defReq}" min="0" step="0.1" placeholder="${defReq}"></div>
    </div>
    <div class="field"><label>Notes <span style="color:var(--gray);font-weight:400">— optional</span></label><textarea id="ff_notes" placeholder="e.g. Switched to new bag, birds eating well">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveFeedLog('${editId||''}')">Save</button>`);
}
function saveFeedLog(editId){
  const date=document.getElementById('ff_date').value;
  const feed_type=document.getElementById('ff_type').value;
  const feed_kg_used=parseFloat(document.getElementById('ff_used').value)||0;
  const feed_req_kg=parseFloat(document.getElementById('ff_req').value)||0;
  const ageWeeks=getFarmAgeWeeks(DB.getFarm())||0;
  const farm=DB.getFarm();
  const existing=editId?DB.getFeed().find(r=>r.id===editId):null;
  if(!lockGuard(date,existing?.date))return;
  // Snapshot the age-based rate at time of save; preserve existing snapshot on edit
  const feed_rate_g=existing?.feed_rate_g||getLayerFeedRate(ageWeeks);
  const notes=document.getElementById('ff_notes').value.trim();
  const rec={id:editId||uid(),date,pen_id:_activePenId||undefined,feed_type,feed_kg_used,feed_req_kg,age_weeks:ageWeeks,feed_rate_g,notes};
  if(editId){DB.updFeed(editId,rec);}
  else{DB.getFeed().filter(r=>r.date===date&&r.feed_type===feed_type&&(r.pen_id||null)===(_activePenId||null)).forEach(r=>DB.delFeed(r.id));DB.addFeed(rec);}
  closeModal();confirmSave('Feed log saved');renderFeed();
}
function doDelFeedLog(id){
  const rec=DB.getFeed().find(r=>r.id===id);
  if(!lockGuard(rec?.date))return;
  DB.delFeed(id);confirmSave('Deleted');renderFeed();
}
function delFeed(id){
  openModal(`<div class="modal-ttl">Delete? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">This cannot be undone.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();doDelFeedLog('${id}')">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
