// ═══════════════════════════════════════════════
// WEIGHT
// ═══════════════════════════════════════════════
// Uniformity, not the average, is what a point-of-lay buyer is paying for. A
// flock averaging 95% of target with the birds tightly grouped will come into
// lay together; one averaging 100% with a wide spread carries a tail of birds
// that never lay properly, and the average hides them completely.
//
// So the form takes the individual weights when they are available, and keeps
// working on the average alone when they are not. Two figures come out of it:
//   CV%          — spread as a share of the mean. Under 10 is the usual target.
//   Uniformity%  — share of birds within ±10% of the mean. The number buyers ask for.
const UNIFORMITY_BAND=0.10;   // ±10% of the mean is the industry definition
const CV_GOOD=8, CV_OK=10;
const UNIF_GOOD=80, UNIF_OK=70;
// Accepts whatever someone types on a phone: commas, spaces, or one per line.
function parseWeightList(text){
  return String(text||'')
    .split(/[^0-9.]+/)
    .map(v=>parseFloat(v))
    .filter(v=>Number.isFinite(v)&&v>0);
}
function weightStats(list){
  const n=list.length;
  if(n===0)return null;
  const mean=list.reduce((a,b)=>a+b,0)/n;
  // Sample standard deviation — these are a sample of the flock, not all of it.
  const variance=n>1?list.reduce((a,b)=>a+(b-mean)*(b-mean),0)/(n-1):0;
  const sd=Math.sqrt(variance);
  const lo=mean*(1-UNIFORMITY_BAND), hi=mean*(1+UNIFORMITY_BAND);
  const within=list.filter(w=>w>=lo&&w<=hi).length;
  return {
    n, mean:Math.round(mean), sd:Math.round(sd*10)/10,
    cv:mean>0?Math.round(sd/mean*1000)/10:null,
    uniformity:Math.round(within/n*100),
    min:Math.round(Math.min(...list)), max:Math.round(Math.max(...list))
  };
}
function cvColour(cv){
  return cv==null?'var(--gray)':cv<=CV_GOOD?'var(--g2)':cv<=CV_OK?'var(--amber)':'var(--red)';
}
function unifColour(u){
  return u==null?'var(--gray)':u>=UNIF_GOOD?'var(--g2)':u>=UNIF_OK?'var(--amber)':'var(--red)';
}
// The latest weighing that actually carries a uniformity figure. Older records
// have none, and a batch should not look unmeasured because of them.
function latestUniformity(batchId){
  return DB.getWeight()
    .filter(r=>r.batch_id===batchId&&r.uniformity_pct!=null)
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null;
}
function renderWeight(){
  const el=document.getElementById('v-weight');
  const topbar=`<div class="topbar"><div><h1>Weight Tracking</h1><small>Weekly growth vs benchmark</small></div></div>`;
  if(!_activeBatchId||!DB.getBatches().find(b=>b.id===_activeBatchId)){
    el.innerHTML=topbar+getBatchSelectPrompt(); return;
  }
  const batch=DB.getBatches().find(b=>b.id===_activeBatchId);
  const allWeight=DB.getWeight().filter(r=>r.batch_id===_activeBatchId).sort((a,b)=>b.date.localeCompare(a.date));
  const weightHtml=allWeight.map(r=>{
    const benchmark=getWeightBenchmark(batch.breed,r.week_num);
    const pct=benchmark?Math.round(r.avg_weight_g/benchmark*100):null;
    const pctCls=pct===null?'badge-gray':pct>=95?'badge-green':pct>=85?'badge-amber':'badge-red';
    return`<div class="list-item">
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px">Week ${r.week_num} <span style="font-size:11px;font-weight:400;color:var(--gray)">${fmtDate(r.date)}</span></div>
        <div style="font-size:12px;color:var(--gray)">${r.sample_size} birds sampled${(r.weights||[]).length?' · individually weighed':''}</div>
        <div style="font-size:14px;font-weight:800;color:var(--p2);margin-top:3px">${r.avg_weight_g}g
          <span style="font-size:11px;color:var(--gray);font-weight:400">target: ${benchmark?benchmark+'g':'—'}</span></div>
        ${r.uniformity_pct!=null?`<div style="display:flex;gap:10px;margin-top:4px;font-size:11px;font-weight:700">
          <span style="color:${unifColour(r.uniformity_pct)}">${r.uniformity_pct}% uniform</span>
          ${r.cv_pct!=null?`<span style="color:${cvColour(r.cv_pct)}">CV ${r.cv_pct}%</span>`:''}
          ${r.min_weight_g&&r.max_weight_g?`<span style="color:var(--gray);font-weight:400">${r.min_weight_g}–${r.max_weight_g}g</span>`:''}
        </div>`:''}
        ${r.notes?`<div style="font-size:12px;color:var(--gray);font-style:italic;margin-top:3px">"${r.notes}"</div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="badge ${pctCls}">${pct!==null?pct+'%':'—'}</span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-secondary btn-sm" onclick="openWeightForm('${r.batch_id}','${r.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="delWeight('${r.id}')">✕</button>
        </div>
      </div></div>`;
  }).join('');
  el.innerHTML=topbar+getBatchCtxBar()+`
    <div style="margin:12px 16px">
      ${batch.status==='Active'
        ?`<button class="btn btn-primary" onclick="openWeightForm('${_activeBatchId}')">+ Log Weight</button>`
        :`<div style="font-size:12px;color:var(--gray);padding:4px 0">Batch closed — records are read-only.</div>`}
    </div>
    <div class="card" style="background:var(--p5)">
      <div class="card-title">Breed Benchmarks (Average Weight g)</div>
      <div style="overflow-x:auto"><table style="font-size:11px;width:100%;border-collapse:collapse">
        ${(()=>{const bt=getBirdType(batch);const wks=bt==='broiler'?[2,4,6,8,12]:[6,8,12,16,18];
        const rows=(BREEDS_BY_TYPE[bt]||[]).filter(b=>b!=='Other');
        return`<tr style="color:var(--p1);font-weight:800"><th>Breed</th>${wks.map(w=>`<th>Wk${w}</th>`).join('')}</tr>
          ${rows.map(b=>`<tr ${b===batch.breed?'style="background:var(--p5)"':''}><td style="font-weight:${b===batch.breed?'800':'700'};white-space:nowrap">${b}${b===batch.breed?' ←':''}</td>
            ${wks.map(w=>`<td style="text-align:center;padding:3px">${(BREED_BENCHMARKS[b]||{})[w]||'—'}</td>`).join('')}</tr>`).join('')}`;})()}
      </table></div>
    </div>
    <div class="sec-hdr">${allWeight.length} Records</div>
    <div class="card" style="padding:0;overflow:hidden">${weightHtml||'<div class="empty" style="padding:24px"><p>No weight records yet for this batch.</p></div>'}</div>
    <div style="height:12px"></div>`;
}
function openWeightForm(batchId,editId){
  const today=DB.today();
  const batch=DB.getBatches().find(b=>b.id===batchId); if(!batch)return;
  const rec=editId?DB.getWeight().find(r=>r.id===editId):null;
  const ageWeeks=batchAgeInWeeks(batch)||0;
  const benchmark=getWeightBenchmark(batch.breed,ageWeeks);
  openModal(`<div class="modal-ttl">Log Weight — ${batch.name} <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="background:var(--p5);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:var(--p1);font-weight:700">
      ${batch.breed} · Week ${ageWeeks} · Benchmark: ${benchmark?benchmark+'g':'—'}
    </div>
    <div class="field"><label>Date</label><input type="date" id="wf_date" value="${rec?rec.date:today}" max="${today}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Week Number</label><input type="number" id="wf_week" value="${rec?.week_num??ageWeeks}" min="1" max="24"></div>
      <div class="field"><label>Sample Size (birds)</label><input type="number" id="wf_sample" value="${rec?.sample_size||20}" min="1" max="100"></div>
    </div>
    <div class="field"><label>Individual weights (g) <span style="color:var(--gray);font-weight:400">— the useful way</span></label>
      <textarea id="wf_list" rows="3" placeholder="740 812 690 755 801 …  (commas, spaces or one per line)" oninput="onWeightListInput(${benchmark})">${(rec?.weights||[]).join(' ')}</textarea>
      <div style="font-size:11px;color:var(--gray);margin-top:4px">Type each bird as you weigh it. Average, spread and uniformity are worked out from these — uniformity is the figure a pullet buyer asks for, and an average cannot produce it.</div></div>
    <div id="wf_stats" style="margin:-6px 0 12px"></div>
    <div class="field"><label>Average Weight (g) <span style="color:var(--gray);font-weight:400" id="wf_avg_note">— or enter it directly</span></label>
      <input type="number" id="wf_avg" value="${rec?.avg_weight_g||''}" min="0" step="1" placeholder="e.g. 750" oninput="showWeightStatus(${benchmark})"></div>
    <div id="wf_status" style="font-size:12px;margin:-8px 0 10px;font-weight:700"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Lightest Bird (g) <span style="color:var(--gray);font-weight:400">opt</span></label><input type="number" id="wf_min" value="${rec?.min_weight_g||''}" min="0" step="1" placeholder="e.g. 650"></div>
      <div class="field"><label>Heaviest Bird (g) <span style="color:var(--gray);font-weight:400">opt</span></label><input type="number" id="wf_max" value="${rec?.max_weight_g||''}" min="0" step="1" placeholder="e.g. 850"></div>
    </div>
    <div class="field"><label>Notes</label><textarea id="wf_notes" placeholder="e.g. Good uniformity, feed switch to grower this week">${rec?.notes||''}</textarea></div>
    <button class="btn btn-primary" onclick="saveWeight('${batchId}','${editId||''}')">Save</button>`);
  if(rec)showWeightStatus(benchmark);
  onWeightListInput(benchmark);
}
// Live read-out while the weights are being typed, so a ragged sample is
// obvious at the scale rather than three screens later.
function onWeightListInput(benchmark){
  const el=document.getElementById('wf_stats'); if(!el)return;
  const st=weightStats(parseWeightList(document.getElementById('wf_list')?.value));
  const note=document.getElementById('wf_avg_note');
  if(!st){
    el.innerHTML='';
    if(note)note.textContent='— or enter it directly';
    return;
  }
  // The typed list wins: it is the measurement, the average is a summary of it.
  const avgEl=document.getElementById('wf_avg');
  if(avgEl){avgEl.value=st.mean;showWeightStatus(benchmark);}
  const minEl=document.getElementById('wf_min'); if(minEl)minEl.value=st.min;
  const maxEl=document.getElementById('wf_max'); if(maxEl)maxEl.value=st.max;
  const sampleEl=document.getElementById('wf_sample'); if(sampleEl)sampleEl.value=st.n;
  if(note)note.textContent='— filled in from the weights above';
  el.innerHTML=`<div style="background:var(--p5);border-radius:8px;padding:10px 12px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
      <div><div style="font-size:18px;font-weight:800;color:var(--p2)">${st.mean}g</div>
        <div style="font-size:10px;color:var(--gray);font-weight:700;text-transform:uppercase">Mean · ${st.n} birds</div></div>
      <div><div style="font-size:18px;font-weight:800;color:${unifColour(st.uniformity)}">${st.uniformity}%</div>
        <div style="font-size:10px;color:var(--gray);font-weight:700;text-transform:uppercase">Uniform</div></div>
      <div><div style="font-size:18px;font-weight:800;color:${cvColour(st.cv)}">${st.cv}%</div>
        <div style="font-size:10px;color:var(--gray);font-weight:700;text-transform:uppercase">CV</div></div>
    </div>
    <div style="font-size:11px;color:var(--p1);margin-top:7px;line-height:1.5">
      Range ${st.min}–${st.max}g. ${st.uniformity>=UNIF_GOOD
        ?'Tight enough to come into lay together.'
        :st.uniformity>=UNIF_OK
          ?'Acceptable, but there is a tail — check feeder space and grading.'
          :'Ragged. Grade the small birds out and give them their own feeder space.'}
    </div></div>`;
}
function showWeightStatus(benchmark){
  const avg=parseFloat(document.getElementById('wf_avg')?.value);
  const el=document.getElementById('wf_status'); if(!el||isNaN(avg))return;
  if(!benchmark){el.textContent='';return;}
  const pct=avg/benchmark*100;
  if(pct>=95)el.innerHTML=`<span style="color:var(--g2)">✓ On Track (${pct.toFixed(0)}% of target)</span>`;
  else if(pct>=85)el.innerHTML=`<span style="color:var(--amber)">⚠ Slightly Below Target (${pct.toFixed(0)}%)</span>`;
  else el.innerHTML=`<span style="color:var(--red)">✗ Below Target (${pct.toFixed(0)}%) — review feed & health</span>`;
}
function saveWeight(batchId,editId){
  const batch=DB.getBatches().find(b=>b.id===batchId); if(!batch)return;
  const list=parseWeightList(document.getElementById('wf_list')?.value);
  const st=weightStats(list);
  const avg=st?st.mean:(parseFloat(document.getElementById('wf_avg').value)||0);
  if(avg<=0){toast('Enter the individual weights, or an average');return;}
  const weekNum=parseInt(document.getElementById('wf_week').value)||batchAgeInWeeks(batch)||1;
  const benchmark=getWeightBenchmark(batch.breed,weekNum);
  const rec={id:editId||uid(),batch_id:batchId,batch_name:batch.name,breed:batch.breed,
    date:document.getElementById('wf_date').value,week_num:weekNum,
    // With a list, the sample size is however many birds were actually weighed
    // — a typed number that disagrees with the list would be a second truth.
    sample_size:st?st.n:(parseInt(document.getElementById('wf_sample').value)||20),
    avg_weight_g:avg,
    min_weight_g:st?st.min:(parseFloat(document.getElementById('wf_min').value)||null),
    max_weight_g:st?st.max:(parseFloat(document.getElementById('wf_max').value)||null),
    // Null rather than absent when no list was given: the passport and the
    // reports both need to tell "not measured" from "measured badly".
    weights:st?list:[],
    sd_g:st?st.sd:null,
    cv_pct:st?st.cv:null,
    uniformity_pct:st?st.uniformity:null,
    benchmark_g:benchmark,notes:document.getElementById('wf_notes').value.trim()};
  if(editId)DB.updWeight(editId,rec);else DB.addWeight(rec);
  closeModal();
  confirmSave(st?`Weight saved — ${st.uniformity}% uniform`:'Weight saved');
  renderWeight();
}
function delWeight(id){
  openModal(`<div class="modal-ttl">Delete? <button class="modal-x" onclick="closeModal()">×</button></div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      <button class="btn btn-danger" onclick="closeModal();DB.delWeight('${id}');confirmSave('Deleted');renderWeight()">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
