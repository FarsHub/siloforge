// ═══════════════════════════════════════════════
// PULLET PASSPORT
// ═══════════════════════════════════════════════
// The receipt says what was paid. The health record says what was given. The
// passport says what the buyer is actually getting: a lot of birds of a known
// weight, a known spread, a known survival rate, reared under a known
// programme — and it puts all of it on one sheet, over the farm's name.
//
// This is the document the business is differentiated by. Almost nobody in
// this market can hand a buyer evidence rather than assurance, and every
// figure on it is already being recorded for other reasons.
//
// Everything is derived from the batch as it stood on the day of the sale, not
// as it stands today, so a passport reprinted a year later still describes the
// birds that were handed over.
const PASSPORT_REF_PREFIX='BTP';
function passportRef(sale){
  const d=String(sale.date||DB.today()).replace(/-/g,'').slice(2);
  return `${PASSPORT_REF_PREFIX}-${d}-${_docRefHash(sale.id,'pass')}`;
}
// Deaths are cumulative, so livability has to be read at the sale date rather
// than taken from today's bird count — a batch that lost birds after this lot
// went out did not lose them on this buyer's behalf.
function batchLivabilityAt(batch,onDate){
  if(!batch||!(batch.doc_count>0))return null;
  const deaths=DB.getDaily()
    .filter(r=>r.batch_id===batch.id&&(!onDate||String(r.date)<=onDate))
    .reduce((s,r)=>s+(r.deaths||0),0);
  return Math.max(0,Math.min(100,(batch.doc_count-deaths)/batch.doc_count*100));
}
// Share of logged brooding days that sat inside the target band for the bird's
// age. Only days with both a reading and a target are counted, so a flock past
// the brooding window is not marked down for days that had no target.
function batchTempComplianceAt(batch,onDate){
  if(!batch)return null;
  const bt=getBirdType(batch);
  const rows=DB.getDaily().filter(r=>r.batch_id===batch.id
    &&(!onDate||String(r.date)<=onDate)
    &&r.temperature_c&&getTempTarget(r.age_days,bt));
  if(rows.length===0)return null;
  const ok=rows.filter(r=>{
    const t=getTempTarget(r.age_days,bt);
    return t&&r.temperature_c>=t.min&&r.temperature_c<=t.max;
  }).length;
  return {pct:Math.round(ok/rows.length*100),inBand:ok,days:rows.length};
}
// The weighing that best describes what went out: the last one on or before
// the sale. Falling back to the most recent would describe birds the buyer
// never saw.
function weightRecordForSale(batch,sale){
  if(!batch)return null;
  const rows=DB.getWeight().filter(r=>r.batch_id===batch.id).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(rows.length===0)return null;
  const upto=rows.filter(r=>String(r.date)<=String(sale.date));
  return (upto.length?upto[upto.length-1]:rows[0]);
}

// What the lot actually ate, up to the day it went out.
//
// The feed log is the source: it carries feed_type and kg per batch per day,
// so it can say which sack for which days and how much of it. The programme is
// only a fallback for a lot with no daily feed logged, and then it is clipped
// to the age the birds reached — printing "Pre-Layer Mash to sale" on a lot
// dispatched at day 79 credits it with a sack it never saw.
function rearedOnForSale(batch,sale){
  if(!batch||!batch.arrival_date)return null;
  const ageAtSale=Math.max(0,daysBetween(batch.arrival_date,sale.date));
  const logs=DB.getFeed()
    .filter(r=>r.batch_id===batch.id&&r.feed_type&&String(r.date)<=String(sale.date));
  if(logs.length){
    const by={};
    logs.forEach(r=>{
      const t=canonFeedType(r.feed_type);
      const d=Math.max(0,daysBetween(batch.arrival_date,r.date));
      const o=by[t]||(by[t]={type:t,from:d,to:d,kg:0,days:0});
      o.from=Math.min(o.from,d); o.to=Math.max(o.to,d);
      o.kg+=Number(r.feed_kg_used)||0; o.days++;
    });
    return {source:'logged',ageAtSale,
            rows:Object.values(by).sort((a,b)=>a.from-b.from||a.type.localeCompare(b.type))};
  }
  const rows=[];
  let start=1;
  for(const ph of getBroodFeedProgramme(getBirdType(batch))){
    if(!ph.type)  { start=ph.maxDay+1; continue; }
    if(start>ageAtSale)break;                 // a phase the birds never reached
    rows.push({type:ph.type,from:start,to:Math.min(ph.maxDay,ageAtSale),
               current:ph.maxDay>=ageAtSale});
    start=ph.maxDay+1;
  }
  return rows.length?{source:'programme',ageAtSale,rows}:null;
}

function buildPassportHTML(sale){
  const b=getDocBusiness();
  const batch=DB.getBatches().find(x=>x.id===sale.batch_id)||null;
  const ref=passportRef(sale);
  const qty=Number(sale.quantity||0);
  const wks=Number(sale.age_weeks_at_sale);
  const breed=(sale.breed||batch?.breed||'').trim();
  const cust=sale.customer_id?DB.getCustomer(sale.customer_id):null;
  const buyer=cust?.name||sale.buyer||'';

  const w=weightRecordForSale(batch,sale);
  const bench=w?(w.benchmark_g||getWeightBenchmark(breed||batch?.breed,w.week_num)):null;
  const pctOfTarget=(w&&bench)?Math.round(w.avg_weight_g/bench*100):null;
  const live=batchLivabilityAt(batch,sale.date);
  const temp=batchTempComplianceAt(batch,sale.date);

  const vacc=batch?getBatchVaccStatus(batch):[];
  const required=vacc.filter(v=>!v.optional);
  const requiredGiven=required.filter(v=>v.done||v.hatchery);
  const given=vacc.filter(v=>v.done||v.hatchery);
  const todo=vacc.filter(v=>!v.done&&!v.hatchery&&!v.optional);

  const sellerMeta=[
    b.address&&rdEsc(b.address),
    [b.phone&&rdEsc(b.phone),b.email&&rdEsc(b.email)].filter(Boolean).join(' · '),
    b.rc&&('RC '+rdEsc(b.rc.replace(/^RC\s*/i,'')))
  ].filter(Boolean).join('<br>');

  // Each cell says what it is and how it compares, because a bare number on a
  // certificate invites the reader to assume the worst reading of it.
  const cell=(val,lbl,sub,colour)=>`<div class="pp-cell">
    <div class="pp-val" ${colour?`style="color:${colour}"`:''}>${val}</div>
    <div class="pp-lbl">${lbl}</div>
    ${sub?`<div class="pp-sub">${sub}</div>`:''}
  </div>`;

  // A weighing taken weeks before the birds went out still describes them,
  // but only if the sheet says when it was taken. Printing "552g" beside "18
  // weeks at dispatch" when the scale last came out in week 7 is the kind of
  // overstatement that makes a buyer distrust the whole document.
  const weighDaysBefore=w?daysBetween(w.date,sale.date):null;
  const weighStale=weighDaysBefore!=null&&weighDaysBefore>14;
  const weighWhen=w
    ? (weighDaysBefore<=0?'weighed on the day'
       :weighDaysBefore<14?`weighed ${weighDaysBefore} day${weighDaysBefore===1?'':'s'} before dispatch`
       :`weighed at week ${w.week_num}, ${Math.round(weighDaysBefore/7)} weeks before dispatch`)
    : '';
  const weightCell=w
    ? cell(`${w.avg_weight_g}<span class="pp-u">g</span>`,'Mean body weight',
        (bench?`${pctOfTarget}% of ${breed||'breed'} standard for week ${w.week_num} (${bench}g)`
              :`At week ${w.week_num}`)+`<br>${weighWhen}`,
        pctOfTarget==null?null:pctOfTarget>=95?'#1b7a4b':pctOfTarget>=85?'#8a5c00':'#b3261e')
    : cell('—','Mean body weight','Not recorded before dispatch');

  const unifCell=(w&&w.uniformity_pct!=null)
    ? cell(`${w.uniformity_pct}<span class="pp-u">%</span>`,'Uniformity',
        `Birds within ±10% of the mean · ${w.sample_size} weighed${w.cv_pct!=null?` · CV ${w.cv_pct}%`:''}`
        +(weighStale?`<br>${weighWhen}`:''),
        w.uniformity_pct>=UNIF_GOOD?'#1b7a4b':w.uniformity_pct>=UNIF_OK?'#8a5c00':'#b3261e')
    : cell('—','Uniformity','Birds were not individually weighed');

  const liveCell=live!=null
    ? cell(`${live.toFixed(1)}<span class="pp-u">%</span>`,'Livability to dispatch',
        `${Number(batch.doc_count||0).toLocaleString('en-NG')} day-olds set on ${fmtDate(batch.arrival_date)}`,
        live>=95?'#1b7a4b':live>=90?'#8a5c00':'#b3261e')
    : cell('—','Livability to dispatch','');

  const tempCell=temp
    ? cell(`${temp.pct}<span class="pp-u">%</span>`,'Brooding temperature held',
        `${temp.inBand} of ${temp.days} logged day${temp.days===1?'':'s'} inside the target band for age`,
        temp.pct>=90?'#1b7a4b':temp.pct>=75?'#8a5c00':'#b3261e')
    : cell('—','Brooding temperature held','No readings logged');

  // The axis is pinned to ±25% of the mean, not to the sample, so the ±10%
  // band lands in the same place on every passport and the bar's width is the
  // spread itself. Scaling to the sample instead made every lot fill the
  // track, which drew a tight flock and a ragged one identically.
  const AXIS=0.25;
  const rangeLine=(w&&w.min_weight_g&&w.max_weight_g&&w.avg_weight_g>0)
    ? (()=>{
        const mean=w.avg_weight_g;
        // Position as a share of the mean, clamped to the axis. A bird beyond
        // ±25% pins to the end and the caption says the bar was cut off, so a
        // clamp can never be read as a tighter flock than it was.
        const pos=v=>Math.max(0,Math.min(100,((v/mean-(1-AXIS))/(2*AXIS))*100));
        const loPct=pos(w.min_weight_g), hiPct=pos(w.max_weight_g);
        const bandLo=pos(mean*(1-UNIFORMITY_BAND)), bandHi=pos(mean*(1+UNIFORMITY_BAND));
        const clipped=w.min_weight_g<mean*(1-AXIS)||w.max_weight_g>mean*(1+AXIS);
        // Lightest and heaviest are two birds; they can look the same on two
        // flocks that are nothing alike. The solid core is mean ±1 sd — where
        // roughly two-thirds of the birds actually sit — and that is what
        // separates a tight sample from a ragged one at a glance.
        const sd=Number(w.sd_g)||0;
        const core=sd>0
          ?`<div class="pp-core" style="left:${pos(mean-sd).toFixed(1)}%;width:${Math.max(0.6,pos(mean+sd)-pos(mean-sd)).toFixed(1)}%"></div>`
          :'';
        return `<div class="pp-range">
         <div class="rd-lbl">Spread of the weighed sample</div>
         <div class="pp-range-row">
           <span class="pp-axis-end rd-m">−25%</span>
           <div class="pp-bar">
             <div class="pp-band" style="left:${bandLo.toFixed(1)}%;width:${(bandHi-bandLo).toFixed(1)}%"></div>
             <div class="pp-bar-fill" style="left:${loPct.toFixed(1)}%;width:${Math.max(0.6,hiPct-loPct).toFixed(1)}%"></div>
             ${core}
             <div class="pp-mean" style="left:${pos(mean).toFixed(1)}%"></div>
           </div>
           <span class="pp-axis-end rd-m">+25%</span>
         </div>
         <div class="pp-sub" style="text-align:center">lightest <b>${w.min_weight_g}g</b> &nbsp;·&nbsp; mean <b>${mean}g</b>${w.sd_g?` · sd ${w.sd_g}g`:''} &nbsp;·&nbsp; heaviest <b>${w.max_weight_g}g</b><br>
           pale bar lightest to heaviest${sd>0?', solid core is where two thirds of the birds sit (±1 sd)':''}, dashed outline is ±10% of the mean${clipped?' · bar cut off at the axis':''}</div>
       </div>`;
      })()
    : '';

  const reared=rearedOnForSale(batch,sale);
  const feedLine=reared
    ? reared.rows.map(r=>{
        const span=r.from===r.to?`d${r.from}`
          :r.current&&reared.source==='programme'?`d${r.from}–d${r.to}, current`
          :`d${r.from}–d${r.to}`;
        // Deliberately no tonnage. What the whole lot ate is an operating
        // figure for this farm, not evidence about the bird in front of the
        // buyer — the regime is the sack and the days it was fed.
        return `<span class="pp-chip">${rdEsc(r.type)} <em>${span}</em></span>`;
      }).join('')
    : '';

  return `
  <div class="rd rd-pass">
    <div class="rd-band"></div>
    <div class="rd-pad">
      <div class="rd-seller">${rdEsc(b.name)}</div>
      ${sellerMeta?`<div class="rd-seller-meta">${sellerMeta}</div>`:''}
    </div>
    <div class="rd-rule"></div>
    <div class="rd-id">
      <div class="rd-type">PULLET<br>PASSPORT</div>
      <div class="rd-ref rd-m">
        <div class="rd-ref-no">${rdEsc(ref)}</div>
        <div class="rd-ref-date">Issued ${fmtDate(DB.today())}</div>
      </div>
    </div>
    <div class="rd-rule"></div>
    ${buyer?`<div class="rd-party">
      <div class="rd-lbl">Supplied to</div>
      <div class="rd-party-name">${rdEsc(buyer)}</div>
    </div>`:''}
    <div class="rd-fields rd-m">
      ${batch?`<div class="rd-row"><div class="rd-lbl">Lot</div><div class="rd-val">${rdEsc(batch.name)}</div></div>`:''}
      ${breed?`<div class="rd-row"><div class="rd-lbl">Breed</div><div class="rd-val">${rdEsc(breed)}</div></div>`:''}
      ${batch?.arrival_date?`<div class="rd-row"><div class="rd-lbl">Hatched / set</div><div class="rd-val">${fmtDate(batch.arrival_date)}</div></div>`:''}
      ${batch?.supplier?`<div class="rd-row"><div class="rd-lbl">Hatchery</div><div class="rd-val">${rdEsc(batch.supplier)}</div></div>`:''}
      ${Number.isFinite(wks)?`<div class="rd-row"><div class="rd-lbl">Age at dispatch</div><div class="rd-val">${wks} week${wks===1?'':'s'}</div></div>`:''}
      <div class="rd-row"><div class="rd-lbl">Dispatched</div><div class="rd-val">${fmtDate(sale.date)}</div></div>
      ${sale.doc_ref?`<div class="rd-row"><div class="rd-lbl">Invoice</div><div class="rd-val">${rdEsc(sale.doc_ref)}</div></div>`:''}
    </div>
    <div class="rd-hero">
      <div class="rd-lbl">Birds supplied</div>
      <div class="rd-qty">
        <span class="rd-count">${qty.toLocaleString('en-NG')}</span>
        <span class="rd-unit">${rdEsc(getDocUnitLabel(sale))}</span>
      </div>
    </div>

    <div class="vx-sec"><div class="rd-lbl">Condition at dispatch</div></div>
    <div class="pp-grid">${weightCell}${unifCell}${liveCell}${tempCell}</div>
    ${rangeLine}

    <div class="rd-rule"></div>
    <div class="vx-sec">
      <div class="rd-lbl">Health programme</div>
      <div class="vx-count">${requiredGiven.length} OF ${required.length} REQUIRED</div>
    </div>
    ${given.length?`<div class="pp-chips">
      ${given.map(v=>`<span class="pp-chip">✓ ${rdEsc(v.name)}</span>`).join('')}
    </div>`:'<div class="vx-note">Nothing recorded against this lot.</div>'}
    ${todo.length?`<div class="vx-note" style="padding-top:6px">
      <b>Still to come — the buyer's to continue:</b> ${todo.map(v=>`${rdEsc(v.name)} (day ${v.dayMin})`).join(', ')}.
      Days are counted from ${batch?.arrival_date?fmtDate(batch.arrival_date):'the set date'}.
    </div>`:'<div class="vx-note" style="padding-top:6px">The full programme for this age has been completed on this farm.</div>'}
    ${feedLine?`
      <div class="rd-rule"></div>
      <div class="vx-sec">
        <div class="rd-lbl">Reared on</div>
        <div class="vx-count">TO DAY ${reared.ageAtSale}</div>
      </div>
      <div class="pp-chips">${feedLine}</div>
      ${reared.source==='programme'?`<div class="vx-note" style="padding-top:2px">
        From the farm's feed programme — daily feed was not logged for this lot, so
        phases the birds had not reached are not shown.
      </div>`:''}`:''}

    <div class="rd-terms">
      <div class="rd-lbl">Terms</div>
      <div class="rd-terms-body">${rdEsc(getDocTerms(sale))}</div>
    </div>
    <div class="vx-foot">
      Every figure on this sheet is taken from the daily records kept for this lot
      and is stated as at the date of dispatch. ${rdEsc(VACC_NOTE)}
    </div>
    <div class="rd-issuer">
      <div><div class="rd-lbl">Issued by</div><div class="rd-issuer-name">${rdEsc(sale.seller||b.name)}</div></div>
      <div class="rd-issuer-src rd-m">via BroodTrack</div>
    </div>
  </div>`;
}

function openPassport(saleId){
  const sale=DB.getSales().find(s=>s.id===saleId);
  if(!sale){toast('Sale not found');return;}
  if(!isDocSetupComplete()){
    openModal(`<div class="modal-ttl">Finish your document details
        <button class="modal-x" onclick="closeModal()">×</button></div>
      <p style="font-size:14px;color:var(--gray);line-height:1.6;margin-bottom:14px">
        A passport goes out on your letterhead as the evidence behind the birds, so it needs at least your farm address and phone number.
      </p>
      <button class="btn btn-primary" onclick="closeModal();go('settings')">Open Settings</button>`);
    return;
  }
  let ov=document.getElementById('rd-overlay');
  if(!ov){
    ov=document.createElement('div');
    ov.id='rd-overlay';ov.className='rd-ov';
    document.body.appendChild(ov);
  }
  ov.innerHTML=`
    <div class="rd-bar">
      <button class="rd-bar-btn" onclick="closeSaleDoc()">Close</button>
      <span class="rd-bar-ttl">Pullet Passport</span>
      <button class="rd-bar-btn primary" onclick="window.print()">Print / PDF</button>
    </div>
    <div class="rd-hint">In the print dialog, open <b>More settings</b> and untick <b>Headers and footers</b> — otherwise the browser prints the date and this page&rsquo;s web address on every sheet. It only needs setting once.</div>
    <div class="rd-scroll">${buildPassportHTML(sale)}</div>`;
  ov.style.display='flex';
  document.body.style.overflow='hidden';
}
