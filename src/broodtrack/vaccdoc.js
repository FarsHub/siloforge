// ═══════════════════════════════════════════════
// VACCINATION & MEDICATION RECORD
// A batch's health history as a document a buyer can be handed. Point-of-lay
// pullets are worth what their programme says they are worth, and a photo of
// the app screen is not evidence — this prints the same rows the Batches tab
// shows, on the same letterhead as the receipt.
// Two sections, because they mean different things to whoever reads it: what
// this farm actually gave, and what is still outstanding and becomes the
// buyer's to continue after handover.
// Shares #rd-overlay with the sale receipt, so only one document is ever
// mounted and closeSaleDoc() closes either.
// ═══════════════════════════════════════════════
// Stable for the life of the batch: derived from the batch id and its arrival
// date, never from today, so two copies printed months apart carry the same
// number and a buyer can quote it back.
function vaccDocRef(batch){
  const d=String(batch.arrival_date||DB.today()).replace(/-/g,'').slice(2);
  return `${DOC_REF_PREFIX}V-${d}-${_docRefHash(batch.id,'vax')}`;
}

function vaccDocRow(v,given){
  const wk=Math.max(1,Math.ceil(v.dayMin/7));
  let when;
  if(v.hatchery)           when=`<span class="vx-soft">At hatchery</span>`;
  else if(given&&v.givenDate) when=fmtDate(v.givenDate);
  // Ticked before the app started stamping dates. Print the programme date
  // rather than invent one, and say so in the footnote.
  else if(given)           when=`<span class="vx-soft">${fmtDate(v.dueDate)}<sup>&dagger;</sup></span>`;
  else if(v.optional)      when=`<span class="vx-soft">If needed</span>`;
  else                     when=`<span class="vx-soft">${fmtDate(v.dueDate)}</span>`;
  return `<div class="vx-row">
    <div class="vx-tick">${given?'&#10003;':''}</div>
    <div><div class="vx-day rd-m">Day ${v.dayMin}</div><div class="vx-wk">wk ${wk}</div></div>
    <div>
      <div class="vx-name">${rdEsc(v.name)}</div>
      <div class="vx-route">${rdEsc(v.route)}</div>
      ${!given&&v.why?`<div class="vx-why">${rdEsc(v.why)}</div>`:''}
    </div>
    <div class="vx-when rd-m">${when}</div>
  </div>`;
}

function buildVaccDocHTML(batch){
  const b=getDocBusiness();
  const rows=getBatchVaccStatus(batch);
  // A hatchery row counts as given: the bird has had it, just not here.
  const given=rows.filter(v=>v.done||v.hatchery);
  // Outstanding and conditional are kept apart on purpose. A conditional row
  // is one the programme says to give only on evidence — printing it under
  // "still to come" reads as a gap in the flock's cover when it is the
  // opposite, a treatment deliberately not given to a healthy bird.
  const todo=rows.filter(v=>!v.done&&!v.hatchery&&!v.optional);
  const conditional=rows.filter(v=>!v.done&&!v.hatchery&&v.optional);
  // Same reason for the headline: score against the required programme, or a
  // flock that had everything it needed still reads as short.
  const required=rows.filter(v=>!v.optional);
  const requiredGiven=required.filter(v=>v.done||v.hatchery);
  const estimated=given.some(v=>!v.hatchery&&!v.givenDate);
  const ageDays=batchAgeInDays(batch), ageWeeks=batchAgeInWeeks(batch);
  const birds=getBatchBirdCount(batch);

  const sellerMeta=[
    b.address&&rdEsc(b.address),
    [b.phone&&rdEsc(b.phone),b.email&&rdEsc(b.email)].filter(Boolean).join(' · '),
    b.rc&&('RC '+rdEsc(b.rc.replace(/^RC\s*/i,'')))
  ].filter(Boolean).join('<br>');

  return `
  <div class="rd rd-vax">
    <div class="rd-band"></div>
    <div class="rd-pad">
      <div class="rd-seller">${rdEsc(b.name)}</div>
      ${sellerMeta?`<div class="rd-seller-meta">${sellerMeta}</div>`:''}
    </div>
    <div class="rd-rule"></div>
    <div class="rd-id">
      <div class="rd-type">VACCINATION &amp;<br>MEDICATION RECORD</div>
      <div class="rd-ref rd-m">
        <div class="rd-ref-no">${rdEsc(vaccDocRef(batch))}</div>
        <div class="rd-ref-date">Issued ${fmtDate(DB.today())}</div>
      </div>
    </div>
    <div class="rd-rule"></div>
    <div class="rd-fields rd-m">
      <div class="rd-row"><div class="rd-lbl">Batch</div><div class="rd-val">${rdEsc(batch.name)}</div></div>
      ${batch.breed?`<div class="rd-row"><div class="rd-lbl">Breed</div><div class="rd-val">${rdEsc(batch.breed)}</div></div>`:''}
      <div class="rd-row"><div class="rd-lbl">Bird type</div><div class="rd-val">${rdEsc(getBirdTypeLabel(getBirdType(batch)))}</div></div>
      ${batch.arrival_date?`<div class="rd-row"><div class="rd-lbl">Arrived</div><div class="rd-val">${fmtDate(batch.arrival_date)}</div></div>`:''}
      ${ageDays!==null?`<div class="rd-row"><div class="rd-lbl">Age today</div><div class="rd-val">${ageWeeks} week${ageWeeks===1?'':'s'} · ${ageDays} day${ageDays===1?'':'s'}</div></div>`:''}
      <div class="rd-row"><div class="rd-lbl">Birds</div><div class="rd-val">${Number(birds||0).toLocaleString('en-NG')} in batch</div></div>
    </div>

    <div class="rd-hero" style="padding-top:13px;padding-bottom:13px">
      <div class="rd-lbl">Required programme</div>
      <div class="rd-qty">
        <span class="rd-count" style="font-size:26px">${requiredGiven.length}</span>
        <span class="rd-unit">of ${required.length} required treatments given</span>
      </div>
    </div>

    <div class="vx-sec">
      <div class="rd-lbl">Given on this farm</div>
      <div class="vx-count">${given.length} ITEM${given.length===1?'':'S'}</div>
    </div>
    <div class="vx-list">
      ${given.length?given.map(v=>vaccDocRow(v,true)).join('')
        :'<div class="vx-route" style="padding:6px 0">Nothing recorded against this batch yet.</div>'}
    </div>

    ${todo.length?`
      <div class="rd-rule"></div>
      <div class="vx-sec">
        <div class="rd-lbl">Still to come</div>
        <div class="vx-count">${todo.length} ITEM${todo.length===1?'':'S'}</div>
      </div>
      <div class="vx-note">Not yet given. After handover these fall to the buyer —
        the dates shown are counted from this batch's arrival date.</div>
      <div class="vx-list">${todo.map(v=>vaccDocRow(v,false)).join('')}</div>
    `:''}

    ${conditional.length?`
      <div class="rd-rule"></div>
      <div class="vx-sec">
        <div class="rd-lbl">Conditional — not routinely given</div>
        <div class="vx-count">${conditional.length} ITEM${conditional.length===1?'':'S'}</div>
      </div>
      <div class="vx-note">The programme calls for these only on evidence, so a healthy
        flock is not expected to have had them.</div>
      <div class="vx-list">${conditional.map(v=>vaccDocRow(v,false)).join('')}</div>
    `:''}

    <div class="vx-foot">
      ${rdEsc(VACC_NOTE)}
      ${estimated?`<br><sup>&dagger;</sup> Recorded as given, but the exact day was not
        logged — the programme date is shown.`:''}
    </div>
    <div class="rd-issuer">
      <div><div class="rd-lbl">Issued by</div><div class="rd-issuer-name">${rdEsc(b.name)}</div></div>
      <div class="rd-issuer-src rd-m">via BroodTrack</div>
    </div>
  </div>`;
}

function openVaccDoc(batchId){
  const batch=DB.getBatches().find(b=>b.id===batchId);
  if(!batch){toast('Batch not found');return;}
  // Same reasoning as the receipt: a document with blank spaces where the
  // farm's address should be is worse than no document.
  if(!isDocSetupComplete()){
    openModal(`<div class="modal-ttl">Finish your document details
        <button class="modal-x" onclick="closeModal()">×</button></div>
      <p style="font-size:14px;color:var(--gray);line-height:1.6;margin-bottom:14px">
        A health record goes out on your letterhead, so it needs at least your
        farm address and phone number.
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
      <span class="rd-bar-ttl">Health Record</span>
      <button class="rd-bar-btn primary" onclick="window.print()">Print / PDF</button>
    </div>
    <div class="rd-scroll">${buildVaccDocHTML(batch)}</div>`;
  ov.style.display='flex';
  document.body.style.overflow='hidden';
}
