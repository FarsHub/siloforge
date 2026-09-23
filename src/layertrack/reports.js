// ═══════════════════════════════════════════════
// REPORTS — MULTI-MODULE ANALYTICS
// ═══════════════════════════════════════════════
let REP_TAB='eggs', ANA_TAB='cells', ANA_DATE=null, TREND_MODE='weekly', FEED_CHART_OFFSET=0, FIN_MONTH=null;
let CAL_MONTH=null, CAL_FROM=null, CAL_TO=null;
let CELL_SORT={field:null,dir:'desc'};
function setCellSort(field){CELL_SORT=CELL_SORT.field===field?{field,dir:CELL_SORT.dir==='desc'?'asc':'desc'}:{field,dir:'desc'};renderReports();}
function sortCells(arr){
  if(!CELL_SORT.field)return arr;
  return [...arr].sort((a,b)=>{
    const av=CELL_SORT.field==='rate'?(a.rate??-1):(a.totalEggs>0?a.totalBroken/a.totalEggs*100:-1);
    const bv=CELL_SORT.field==='rate'?(b.rate??-1):(b.totalEggs>0?b.totalBroken/b.totalEggs*100:-1);
    return CELL_SORT.dir==='desc'?bv-av:av-bv;
  });
}
function filterColsByDate(allCols){
  if(!ANA_DATE)return allCols;
  if(ANA_DATE==='last7'||ANA_DATE==='last14'||ANA_DATE==='last21'||ANA_DATE==='last30'){
    const days={last7:7,last14:14,last21:21,last30:30}[ANA_DATE];
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);
    return allCols.filter(c=>c.date>=cutoff.toISOString().slice(0,10));
  }
  if(ANA_DATE.startsWith('range:')){
    const [,from,to]=ANA_DATE.split(':');
    return allCols.filter(c=>c.date>=from&&c.date<=to);
  }
  return allCols.filter(c=>c.date===ANA_DATE);
}
function anaModeLabel(){if(!ANA_DATE)return'All Time';if(ANA_DATE==='last7')return'Last 7 Days';if(ANA_DATE==='last14')return'Last 14 Days';if(ANA_DATE==='last21')return'Last 21 Days';if(ANA_DATE==='last30')return'Last 30 Days';if(ANA_DATE.startsWith('range:')){const [,from,to]=ANA_DATE.split(':');return `${fmtDate(from)} – ${fmtDate(to)}`;}return fmtDate(ANA_DATE);}

// ── Calendar date picker for the Eggs report (All Time / Quick Range / day / custom range) ──
function _ymd(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function openDatePicker(){
  CAL_FROM=null;CAL_TO=null;
  if(ANA_DATE&&ANA_DATE.startsWith('range:')){const [,f,t]=ANA_DATE.split(':');CAL_FROM=f;CAL_TO=t;}
  else if(ANA_DATE&&/^\d{4}-\d{2}-\d{2}$/.test(ANA_DATE)){CAL_FROM=ANA_DATE;}
  CAL_MONTH=(CAL_FROM||DB.today()).slice(0,7);
  renderDatePicker();
}
function calNav(delta){
  const [y,m]=CAL_MONTH.split('-').map(Number);
  const d=new Date(y,m-1+delta,1);
  CAL_MONTH=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  renderDatePicker();
}
function calPick(dateStr){
  if(!CAL_FROM||(CAL_FROM&&CAL_TO)){CAL_FROM=dateStr;CAL_TO=null;}
  else if(dateStr<CAL_FROM){CAL_TO=CAL_FROM;CAL_FROM=dateStr;}
  else{CAL_TO=dateStr;}
  renderDatePicker();
}
function calApply(){
  if(!CAL_FROM)return;
  ANA_DATE=(CAL_TO&&CAL_TO!==CAL_FROM)?`range:${CAL_FROM}:${CAL_TO}`:CAL_FROM;
  closeModal();renderReports();
}
function calSet(val){ANA_DATE=val||null;closeModal();renderReports();}
function renderDatePicker(){
  const today=DB.today();
  const [y,m]=CAL_MONTH.split('-').map(Number);
  const monthLabel=new Date(y,m-1,1).toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  const firstDow=new Date(y,m-1,1).getDay();
  const daysInMonth=new Date(y,m,0).getDate();
  const dataDays=new Set(DB.getCols().map(c=>c.date));
  const lo=CAL_FROM&&CAL_TO?(CAL_FROM<CAL_TO?CAL_FROM:CAL_TO):CAL_FROM;
  const hi=CAL_FROM&&CAL_TO?(CAL_FROM<CAL_TO?CAL_TO:CAL_FROM):CAL_FROM;
  let cells='';
  for(let i=0;i<firstDow;i++)cells+='<div></div>';
  for(let d=1;d<=daysInMonth;d++){
    const ds=_ymd(y,m-1,d), future=ds>today;
    const isEnd=ds===CAL_FROM||ds===CAL_TO, inRange=lo&&hi&&ds>=lo&&ds<=hi, isToday=ds===today;
    let style='aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;font-size:14px;font-weight:600;';
    if(future)style+='color:#ccc;';
    else if(isEnd)style+='background:var(--g2);color:#fff;cursor:pointer;';
    else if(inRange)style+='background:var(--g5);color:var(--g1);cursor:pointer;';
    else style+='color:#1a1a1a;cursor:pointer;';
    if(isToday&&!isEnd)style+='border:1.5px solid var(--g3);';
    const dot=(dataDays.has(ds)&&!isEnd&&!future)?`<span style="width:4px;height:4px;border-radius:50%;background:${inRange?'var(--g2)':'var(--g3)'};margin-top:1px"></span>`:'<span style="height:5px"></span>';
    cells+=`<div style="${style}" ${future?'':`onclick="calPick('${ds}')"`}>${d}${dot}</div>`;
  }
  const qbtn=(val,lbl)=>`<button onclick="calSet('${val}')" style="padding:8px 4px;border-radius:8px;border:1.5px solid ${ANA_DATE===val?'var(--g2)':'#ddd'};background:${ANA_DATE===val?'var(--g5)':'var(--white)'};color:var(--g1);font-size:12px;font-weight:700;cursor:pointer">${lbl}</button>`;
  const selLabel=CAL_FROM?(CAL_TO&&CAL_TO!==CAL_FROM?`${fmtDate(lo)} – ${fmtDate(hi)}`:fmtDate(CAL_FROM)):'Tap a day — or a start then an end day for a range';
  const wdays=['S','M','T','W','T','F','S'].map(w=>`<div style="text-align:center;font-size:11px;font-weight:800;color:var(--gray);padding:4px 0">${w}</div>`).join('');
  openModal(`
    <div class="modal-ttl">Select Period <button class="modal-x" onclick="closeModal()">×</button></div>
    <button onclick="calSet('')" style="width:100%;padding:10px;border-radius:10px;border:1.5px solid ${!ANA_DATE?'var(--g2)':'#ddd'};background:${!ANA_DATE?'var(--g5)':'var(--white)'};color:var(--g1);font-weight:700;font-size:14px;cursor:pointer;margin-bottom:14px">All Time</button>
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--gray);margin-bottom:8px">Quick Range</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:16px">
      ${qbtn('last7','7 Days')}${qbtn('last14','14 Days')}${qbtn('last21','21 Days')}${qbtn('last30','30 Days')}
    </div>
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--gray);margin-bottom:8px">Pick a Day or Range</div>
    <div style="border:1px solid #eee;border-radius:12px;padding:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <button onclick="calNav(-1)" style="width:34px;height:34px;border-radius:8px;border:none;background:var(--g2);color:#fff;font-size:18px;cursor:pointer">‹</button>
        <span style="font-weight:800;color:var(--g1);font-size:15px">${monthLabel}</span>
        <button onclick="calNav(1)" style="width:34px;height:34px;border-radius:8px;border:none;background:var(--g2);color:#fff;font-size:18px;cursor:pointer">›</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr)">${wdays}</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">${cells}</div>
    </div>
    <div style="text-align:center;font-size:13px;font-weight:600;color:${CAL_FROM?'var(--g1)':'var(--gray)'};margin:14px 0 4px">${selLabel}</div>
    <button class="btn btn-primary" onclick="calApply()" ${CAL_FROM?'':'disabled style="opacity:.5"'}>Apply</button>
  `);
}

// ═══════════════════════════════════════════════
// FEED ANALYTICS
// ═══════════════════════════════════════════════
// FCR here is kg feed / kg eggs. A laying flock sits around 2.0–2.4; anything
// near 8 would mean the birds are eating four times their output, so the old
// "< 8" target could never fail and coloured everything green.
const EGG_KG = 0.06, FCR_GOOD = 2.2, FCR_WARN = 2.5;
// The FCR curve is not a straight climb. It falls steeply from onset of lay to
// peak (~30 wk), sits flat through the plateau, and only drifts up once lay
// starts declining. So "FCR rises with age" is only true late in the cycle —
// before FCR_AGE_POSTPEAK a rise is a problem, not the calendar.
const FCR_AGE_POSTPEAK = 55, FCR_AGE_DECLINE = 70;
const FEED_TBL = {log:false, gbd:false, mom:true};
function toggleFeedTbl(k){ FEED_TBL[k]=!FEED_TBL[k]; renderReports(); }
function fcrColour(v){ return v==null?'var(--gray)':v<FCR_GOOD?'var(--g2)':v<FCR_WARN?'var(--amber)':'var(--red)'; }
// One short line saying what FCR should be doing at this flock's age.
function fcrAgeHint(age){
  if(age==null)return 'FCR read next to flock age and lay rate.';
  if(age<24)return `At ${age} weeks FCR should still be falling fast as lay climbs.`;
  if(age<FCR_AGE_POSTPEAK)return `At ${age} weeks the flock is in its plateau — FCR should be at its lowest and flat.`;
  if(age<FCR_AGE_DECLINE)return `At ${age} weeks lay is easing off peak, so a slow FCR rise is normal.`;
  return `At ${age} weeks FCR is expected to rise as lay declines — the question is how fast.`;
}

// One row per calendar date, merging feed and egg logs and resolving how many
// birds were alive that day. Bird records are authoritative; where none exist we
// back it out of the saved requirement (req kg = birds x rate), then fall back to
// the configured flock size.
function feedDailySeries(validPenIds,penId){
  const farm=DB.getFarm()||{pens:[]};
  const legacy=legacyPenId();
  const mine=r=>!penId||(r.pen_id||legacy)===penId;
  const pen=penId?(farm.pens||[]).find(p=>p.id===penId):null;
  const sortedBirds=DB.getBirds().filter(b=>(b.closing_birds||0)>0&&mine(b)).sort((a,b)=>a.date.localeCompare(b.date));
  const totalNow=(pen?getPenTotalBirds(pen):getFarmTotalBirds(farm))||0;
  const map={};
  const touch=d=>(map[d]=map[d]||{date:d,kg:0,req:0,eggs:0,rate:0,rateN:0,age:null,types:{}});
  DB.getFeed().filter(mine).forEach(r=>{
    const d=touch(r.date);
    d.kg+=r.feed_kg_used||0; d.req+=r.feed_req_kg||0;
    if(r.feed_type)d.types[r.feed_type]=1;
    const g=r.feed_rate_g||getLayerFeedRate(r.age_weeks||0);
    if(g){d.rate+=g;d.rateN++;}
    if(r.age_weeks!=null)d.age=r.age_weeks;
  });
  DB.getCols().filter(c=>validPenIds.has(c.penId)).forEach(c=>{
    touch(c.date).eggs+=(c.entries||[]).reduce((s,e)=>s+(e.eggs||0),0);
  });
  // Bird count per day, in order of trust:
  //   1. the last flock record on or before that date (carry forward)
  //   2. the earliest flock record, for days before any record exists — a real
  //      count from the wrong date still beats today's configured total
  //   3. back-calculated from the saved requirement (req kg = birds x rate)
  //   4. the configured flock size, only when no flock records exist at all
  const firstCount=sortedBirds.length?sortedBirds[0].closing_birds:null;
  let ptr=0,last=null;
  return Object.values(map).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>{
    while(ptr<sortedBirds.length&&sortedBirds[ptr].date<=d.date){last=sortedBirds[ptr].closing_birds;ptr++;}
    const stdG=d.rateN?Math.round(d.rate/d.rateN):getLayerFeedRate(d.age||0);
    let birds=last||firstCount;
    if(!birds&&stdG>0&&d.req>0)birds=Math.round(d.req*1000/stdG);
    if(!birds)birds=totalNow;
    return {date:d.date,kg:d.kg,req:d.req,eggs:d.eggs,age:d.age,stdG,birds,
      types:Object.keys(d.types).join(', '),
      gPerBird:(birds>0&&d.kg>0)?d.kg*1000/birds:null};
  });
}

// Month buckets. Bird-days are accumulated separately for feed and eggs so a day
// missing one log does not distort the other's per-bird rate.
function feedMonthlyRows(daily){
  const m={};
  daily.forEach(d=>{
    const k=d.date.slice(0,7);
    const o=(m[k]=m[k]||{m:k,kg:0,eggs:0,feedBirdDays:0,eggBirdDays:0,ageSum:0,ageN:0,days:0});
    o.kg+=d.kg; o.eggs+=d.eggs; o.days++;
    if(d.kg>0)o.feedBirdDays+=d.birds;
    if(d.eggs>0)o.eggBirdDays+=d.birds;
    if(d.age!=null){o.ageSum+=d.age;o.ageN++;}
  });
  return Object.values(m).sort((a,b)=>a.m.localeCompare(b.m)).map(o=>({
    m:o.m, kg:o.kg, eggs:o.eggs, days:o.days,
    age:o.ageN?Math.round(o.ageSum/o.ageN):null,
    lay:o.eggBirdDays>0?o.eggs/o.eggBirdDays*100:null,
    gpb:o.feedBirdDays>0?o.kg*1000/o.feedBirdDays:null,
    gpe:o.eggs>0?o.kg*1000/o.eggs:null,
    fcr:o.eggs>0?o.kg/(o.eggs*EGG_KG):null
  }));
}
function fmtMonth(m){ return new Date(m+'-01T00:00:00').toLocaleDateString('en-GB',{month:'short',year:'2-digit'}); }

// ── Line chart (shared by feed/bird/day and the FCR trend) ──
const _FEED_CHARTS={};
function _niceTicks(min,max,n){
  const span=max-min||1, raw=span/n, mag=Math.pow(10,Math.floor(Math.log10(raw)));
  const step=[1,2,2.5,5,10].map(x=>x*mag).find(s=>s>=raw)||10*mag;
  const lo=Math.floor(min/step)*step, hi=Math.ceil(max/step)*step, out=[];
  for(let v=lo;v<=hi+1e-9;v+=step)out.push(+v.toFixed(6));
  return out;
}
function lineChartSvg(id,rows,series,opts){
  opts=opts||{};
  const dec=opts.dec||0, unit=opts.unit||'', band=opts.band;
  // FCR wants a ceiling, lay rate wants a floor, so the caller names the band.
  const bandLabel=opts.bandLabel||(band?`target &lt; ${band[1]}`:'');
  const W=640,H=190,PL=38,PR=46,PT=12,PB=26,cw=W-PL-PR,ch=H-PT-PB;
  const all=rows.flatMap(r=>series.map(s=>s.get(r))).filter(v=>v!=null&&isFinite(v));
  if(!all.length||rows.length<2)return '<div style="color:var(--gray);font-size:13px;padding:20px 0">Not enough data yet.</div>';
  // Pad the domain so a flat reference line never lands on the axis floor.
  const dmin=Math.min(...all), dmax=Math.max(...all), pad=(dmax-dmin||1)*0.12;
  const ticks=_niceTicks(dmin-pad,dmax+pad,4), lo=ticks[0], hi=ticks[ticks.length-1];
  const yOf=v=>PT+ch-((v-lo)/(hi-lo))*ch, xAt=i=>PL+i*(cw/(rows.length-1));
  let bandSvg='';
  if(band){ // clamped, or it paints outside the plot
    const b0=Math.max(lo,Math.min(band[0],hi)), b1=Math.max(lo,Math.min(band[1],hi));
    if(b1>b0)bandSvg=`<rect x="${PL}" y="${yOf(b1).toFixed(1)}" width="${cw}" height="${(yOf(b0)-yOf(b1)).toFixed(1)}" fill="#12946a" opacity=".08"/>
      <text x="${W-PR-2}" y="${(yOf(b1)-4).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--gray)">${bandLabel}</text>`;
  }
  const grid=ticks.map(t=>`<line x1="${PL}" y1="${yOf(t).toFixed(1)}" x2="${W-PR}" y2="${yOf(t).toFixed(1)}" stroke="#ecefed" stroke-width="1"/>
    <text x="${PL-6}" y="${(yOf(t)+3.5).toFixed(1)}" text-anchor="end" font-size="9.5" fill="var(--gray)">${t}</text>`).join('');
  // A series may carry colorOf(v) instead of one flat colour, in which case the
  // line is drawn segment by segment and each segment takes the colour of the
  // point it lands on — so the trend reads the same way the table's figures do.
  const lines=series.map(s=>{
    const pts=rows.map((r,i)=>{const v=s.get(r);return v==null?null:{x:xAt(i),y:yOf(v),v};}).filter(Boolean);
    if(!pts.length)return '';
    const dash=s.dash?' stroke-dasharray="5 3"':'';
    if(s.colorOf)return pts.slice(1).map((p,i)=>
      `<line x1="${pts[i].x.toFixed(1)}" y1="${pts[i].y.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${s.colorOf(p.v)}" stroke-width="2" stroke-linecap="round"${dash}/>`).join('');
    return `<polyline points="${pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${dash}/>`;
  }).join('');
  const ends=series.map(s=>{
    let i=rows.length-1; while(i>=0&&s.get(rows[i])==null)i--;
    if(i<0)return '';
    const v=s.get(rows[i]),x=xAt(i),y=yOf(v),col=s.colorOf?s.colorOf(v):s.color;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${col}" stroke="#fff" stroke-width="2"/>
      <text x="${(x+9).toFixed(1)}" y="${(y+3.5).toFixed(1)}" font-size="10.5" font-weight="700" fill="var(--g1)">${v.toFixed(dec)}</text>`;
  }).join('');
  const step=Math.ceil(rows.length/5);
  const xlab=rows.map((r,i)=>(i%step===0||i===rows.length-1)
    ? `<text x="${xAt(i).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="9.5" fill="var(--gray)">${opts.xOf(r)}</text>`:'').join('');
  _FEED_CHARTS[id]={rows,series,dec,unit,geom:{W,PL,PR,PT,ch,cw},xOf:opts.xOf,extra:opts.extra};
  return `<div class="chartbox" id="cb-${id}"><div class="charttt" id="tt-${id}"></div>
    <svg viewBox="0 0 ${W} ${H}">${bandSvg}${grid}
      <line id="cx-${id}" x1="0" y1="${PT}" x2="0" y2="${PT+ch}" stroke="#c9d2cd" stroke-width="1" opacity="0"/>
      ${lines}${ends}${xlab}
      <rect id="hit-${id}" x="${PL}" y="${PT}" width="${cw}" height="${ch}" fill="transparent"/></svg></div>`;
}
// innerHTML wipes listeners, so renderReports re-wires after every paint.
function wireFeedCharts(){
  Object.keys(_FEED_CHARTS).forEach(id=>{
    const c=_FEED_CHARTS[id], box=document.getElementById('cb-'+id), hit=document.getElementById('hit-'+id);
    if(!box||!hit)return;
    const tt=document.getElementById('tt-'+id), cx=document.getElementById('cx-'+id), g=c.geom;
    const move=e=>{
      const rect=box.getBoundingClientRect();
      const px=(e.touches?e.touches[0].clientX:e.clientX)-rect.left;
      const i=Math.max(0,Math.min(c.rows.length-1,Math.round((px/rect.width*g.W-g.PL)/(g.cw/(c.rows.length-1)))));
      const r=c.rows[i], x=g.PL+i*(g.cw/(c.rows.length-1));
      cx.setAttribute('x1',x);cx.setAttribute('x2',x);cx.setAttribute('opacity','1');
      tt.innerHTML=`<b>${c.xOf(r)}</b>`+c.series.map(s=>{
        const v=s.get(r); if(v==null)return '';
        return `<div class="ttr"><em><span class="ttk" style="background:${s.colorOf?s.colorOf(v):s.color}"></span>${s.name}</em><strong>${v.toFixed(c.dec)}${c.unit}</strong></div>`;
      }).join('')+(c.extra?c.extra(r):'');
      tt.style.opacity=1;
      const lx=x/g.W*rect.width;
      tt.style.left=Math.max(2,Math.min(rect.width-150,lx-75))+'px';
      tt.style.top='4px';
    };
    hit.addEventListener('pointermove',move);
    hit.addEventListener('pointerleave',()=>{tt.style.opacity=0;cx.setAttribute('opacity','0');});
  });
}
// Reports follow the pen you opened from Home. Choosing "All pens" clears the
// selection, which is also what the data-entry screens read — one idea of
// "which pen am I looking at", not two that can disagree.
function setReportPen(id){ _activePenId=id||null; renderReports(); }
function reportPenBar(farm){
  const pens=(farm.pens||[]);
  if(pens.length<2)return'';
  return`<div style="background:var(--white);padding:10px 16px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px">
    <span style="font-size:12px;font-weight:700;color:var(--gray);white-space:nowrap">Pen:</span>
    <select style="flex:1;padding:8px 12px;border:1.5px solid #ddd;border-radius:10px;font-size:14px;font-weight:600;background:var(--white)"
      onchange="setReportPen(this.value)">
      <option value="" ${!_activePenId?'selected':''}>All pens</option>
      ${pens.map(p=>`<option value="${p.id}" ${_activePenId===p.id?'selected':''}>${p.name}</option>`).join('')}
    </select></div>`;
}
function renderReports(){
  const el=document.getElementById('v-reports');
  const farm=DB.getFarm();
  if(!farm){el.innerHTML=`<div class="topbar"><div><h1>Reports</h1></div></div><div class="empty"><svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg><h3>No data yet</h3><p>Start logging data to see reports.</p></div>`;return;}

  const allCols=DB.getCols();
  const scopePen=_activePenId?(farm.pens||[]).find(p=>p.id===_activePenId):null;
  const legacyPen=legacyPenId();
  const inScope=id=>!_activePenId||id===_activePenId;
  const farmBirds=scopePen?getPenTotalBirds(scopePen):getFarmTotalBirds(farm);
  const validPenIds=new Set((farm.pens||[]).filter(p=>inScope(p.id)).map(p=>p.id));
  const cols=filterColsByDate(allCols).filter(c=>validPenIds.has(c.penId));
  // Flock and feed records predate pen tagging, so an untagged one belongs to
  // the oldest pen — the same rule the pen economics uses.
  const scopedBirds=DB.getBirds().filter(r=>inScope(r.pen_id||legacyPen));
  const scopedFeed=DB.getFeed().filter(r=>inScope(r.pen_id||legacyPen));
  const modeLabel=anaModeLabel();
  const finMonthLabel=(()=>{const m=FIN_MONTH||DB.today().slice(0,7);const d=new Date(m+'-01T00:00:00');return d.toLocaleDateString('en-GB',{month:'long',year:'numeric'});})();
  const topbarLabel=REP_TAB==='finance'?finMonthLabel:modeLabel;

  let tabContent='';
  if(REP_TAB==='eggs'){
    // Egg analytics (from PoulTrack)
    const isSingleDay=!!ANA_DATE&&ANA_DATE!=='last7'&&ANA_DATE!=='last14'&&ANA_DATE!=='last21'&&ANA_DATE!=='last30';
    const sessionCol=isSingleDay?'Rounds':'Sessions';
    const cellMap={}, cellDayBirds={};
    cols.forEach(col=>{
      const colExp=col.exp??(farm.expectedRate||85), colWarn=col.warn??(farm.warnRate||70);
      (col.entries||[]).forEach(e=>{
        const k=`${col.penId}|${col.side}|${e.standId}|${e.tier}|${e.cellNum}`;
        const dk=`${k}|${col.date}`;
        if(!cellMap[k])cellMap[k]={totalEggs:0,totalBirds:0,totalBroken:0,sessions:0,sumExp:0,sumWarn:0,penId:col.penId,side:col.side,standId:e.standId,tier:e.tier,cellNum:e.cellNum};
        cellMap[k].totalEggs+=(e.eggs||0);cellMap[k].totalBroken+=(e.broken||0);
        cellMap[k].sessions++;cellMap[k].sumExp+=colExp;cellMap[k].sumWarn+=colWarn;
        if(!cellDayBirds[dk]){cellDayBirds[dk]=true;cellMap[k].totalBirds+=(e.birds||0);}
      });
    });
    const cells=Object.values(cellMap).map(c=>({...c,days:c.sessions,
      rate:c.totalBirds>0?c.totalEggs/c.totalBirds*100:null,
      avgExp:c.sessions>0?c.sumExp/c.sessions:(farm.expectedRate||85),
      avgWarn:c.sessions>0?c.sumWarn/c.sessions:(farm.warnRate||70)}));
    const poor=cells.filter(c=>c.rate!==null&&c.rate<c.avgWarn).sort((a,b)=>a.rate-b.rate);
    const top=cells.filter(c=>c.rate!==null&&c.rate>=c.avgExp).sort((a,b)=>b.rate-a.rate).slice(0,10);
    let totalEggs=0,totalBroken=0;
    cols.forEach(col=>(col.entries||[]).forEach(e=>{totalEggs+=(e.eggs||0);totalBroken+=(e.broken||0);}));
    // Avg daily Hen Day Production: for each egg-collection day, use actual bird count from bird log
    const _birdLog=scopedBirds.slice().sort((a,b)=>a.date.localeCompare(b.date));
    const _birdDateMap={};_birdLog.forEach(r=>{_birdDateMap[r.date]=(r.closing_birds||r.opening_birds||0);});
    const _birdDates=Object.keys(_birdDateMap).sort();
    function _birdsOn(date){if(_birdDateMap[date])return _birdDateMap[date];const p=_birdDates.filter(d=>d<=date).pop();return p?_birdDateMap[p]:farmBirds;}
    const _eggsByDate={};cols.forEach(col=>(col.entries||[]).forEach(e=>{_eggsByDate[col.date]=(_eggsByDate[col.date]||0)+(e.eggs||0);}));
    const _hdp=Object.entries(_eggsByDate).map(([d,eggs])=>{const b=_birdsOn(d);return b>0?eggs/b*100:null;}).filter(r=>r!==null);
    const overallRate=_hdp.length>0?_hdp.reduce((s,r)=>s+r,0)/_hdp.length:null;
    const crackRate=totalEggs>0?totalBroken/totalEggs*100:null;
    const crackColor=crackRate===null?'var(--gray)':crackRate>3?'var(--red)':crackRate>=2?'var(--amber)':'var(--g3)';
    const roundMap={};
    cols.forEach(c=>{if(!roundMap[c.round])roundMap[c.round]={label:c.roundLabel,eggs:0};
      (c.entries||[]).forEach(e=>{roundMap[c.round].eggs+=(e.eggs||0);});});
    const totalRndEggs=Object.values(roundMap).reduce((s,v)=>s+v.eggs,0);

    const cellRow=(c)=>{
      const stand=findStandInFarm(farm,c.standId), pen=(farm.pens||[]).find(p=>p.id===c.penId);
      const cRate=c.totalEggs>0?c.totalBroken/c.totalEggs*100:null;
      const cColor=cRate===null?'var(--gray)':cRate>3?'var(--red)':cRate>=2?'var(--amber)':'var(--g3)';
      return`<tr>
        <td><b>T${c.tier}·C${c.cellNum}</b><br><small style="color:var(--gray)">${pen?.name||''} · ${stand?.name||c.standId}</small></td>
        <td><span class="badge badge-gray">Side ${c.side}</span></td>
        <td style="color:var(--gray)">${c.days}</td>
        <td style="color:var(--red);font-weight:700">${c.totalBroken}</td>
        <td><div class="rate-bar-wrap"><div class="rate-bar" style="width:${Math.min(c.rate||0,100)}px;background:${rateColor(c.rate)}"></div>${rateBadge(c.rate)}</div></td>
        <td style="font-weight:700;color:${cColor}">${cRate!==null?cRate.toFixed(1)+'%':'—'}</td></tr>`;
    };

    if(ANA_TAB==='cells'){
      tabContent=`
        <div class="kpi-row-5">
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--g2)">${totalEggs}</div><div class="kpi-lbl-sm">Eggs</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:${rateColor(overallRate)}">${overallRate!==null?overallRate.toFixed(0)+'%':'—'}</div><div class="kpi-lbl-sm">Prod Rate</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--g1)">${farmBirds}</div><div class="kpi-lbl-sm">Birds</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--red)">${totalBroken}</div><div class="kpi-lbl-sm">Broken</div></div>
          <div class="kpi-sm" style="${crackRate>3?'border:2px solid var(--red)':crackRate>=2?'border:2px solid var(--amber)':''}">
            <div class="kpi-val-sm" style="color:${crackColor}">${crackRate!==null?crackRate.toFixed(1)+'%':'—'}</div>
            <div class="kpi-lbl-sm">Crack Rate</div></div>
        </div>
        ${(()=>{
          const rateArrow=CELL_SORT.field==='rate'?(CELL_SORT.dir==='desc'?' ↓':' ↑'):' ↕';
          const crackArrow=CELL_SORT.field==='crackRate'?(CELL_SORT.dir==='desc'?' ↓':' ↑'):' ↕';
          const rateStyle=`cursor:pointer;user-select:none;white-space:nowrap${CELL_SORT.field==='rate'?';color:var(--g2)':''}`;
          const crackStyle=`cursor:pointer;user-select:none;white-space:nowrap${CELL_SORT.field==='crackRate'?';color:var(--red)':''}`;
          const hdr=`<tr><th>Cell</th><th>Side</th><th>${sessionCol}</th><th>Broken</th>
            <th style="${rateStyle}" onclick="setCellSort('rate')">Avg Rate<span style="font-size:10px">${rateArrow}</span></th>
            <th style="${crackStyle}" onclick="setCellSort('crackRate')">Crack Rate<span style="font-size:10px">${crackArrow}</span></th></tr>`;
          const sortedTop=sortCells(top), sortedPoor=sortCells(poor);
          return`<div class="sec-hdr" style="margin-top:8px">⭐ Top Performing Cells</div>
          <div style="font-size:11px;color:var(--gray);margin:-4px 16px 8px">Meeting or exceeding target rate at time of collection.</div>
          <div class="card" style="padding:0;overflow:hidden">
            ${sortedTop.length===0?'<div class="empty" style="padding:20px 16px"><p style="margin:0;font-size:13px">No top-performing cells yet.</p></div>':
              `<table class="ana-table">${hdr}${sortedTop.map(cellRow).join('')}</table>`}
          </div>
          <div class="sec-hdr" style="margin-top:16px">⚠️ Underperforming Cells</div>
          <div style="font-size:11px;color:var(--gray);margin:-4px 16px 8px">Below warn threshold — flagged for action.</div>
          <div class="card" style="padding:0;overflow:hidden">
            ${sortedPoor.length===0?'<div class="empty" style="padding:20px 16px"><p style="margin:0;font-size:13px">No underperforming cells 🎉</p></div>':
              `<table class="ana-table">${hdr}${sortedPoor.map(cellRow).join('')}</table>`}
          </div>`;
        })()}`;
    } else if(ANA_TAB==='rounds'){
      const daily=getDailySummary(14);
      tabContent=`
        <div class="sec-hdr" style="margin-top:8px">Round Distribution — ${modeLabel}</div>
        <div class="card" style="padding:0;overflow:hidden">
          ${Object.keys(roundMap).length===0?'<div style="padding:16px;color:var(--gray);font-size:13px">No data.</div>':
            Object.entries(roundMap).map(([r,v])=>{
              const pct=totalRndEggs>0?Math.round(v.eggs/totalRndEggs*100):0;
              const rInfo=ROUNDS.find(ri=>ri.id===parseInt(r))||{cls:'',label:`Round ${r}`};
              return`<div class="list-item"><div><span class="${rInfo.cls} round-chip">${v.label||rInfo.label}</span>
                <div style="font-size:11px;color:var(--gray);margin-top:4px">${v.eggs} eggs</div></div>
                <div style="text-align:right"><div style="font-size:18px;font-weight:800">${pct}%</div>
                  <div style="height:6px;width:80px;background:#eee;border-radius:3px;margin-top:4px;overflow:hidden">
                    <div style="height:100%;width:${pct}%;background:var(--g3);border-radius:3px"></div></div></div></div>`;}).join('')}
        </div>
        <div class="sec-hdr">Daily Production (Last 14 Days)</div>
        <div class="card" style="padding:0;overflow:hidden">
          ${daily.map(d=>`<div class="list-item" style="cursor:pointer" onclick="ANA_DATE='${d.date}';ANA_TAB='cells';renderReports()">
            <div><div style="font-weight:700;font-size:14px">${fmtDate(d.date)}</div>
              <div style="font-size:12px;color:var(--gray)">${d.eggs} eggs · ${d.broken} broken · tap to drill in</div></div>
            ${rateBadge(d.rate)}</div>`).join('')}
        </div>`;
    } else if(ANA_TAB==='pens'){
      const penMap={}, penDB={};
      cols.forEach(col=>{if(!penMap[col.penId])penMap[col.penId]={name:col.penName||col.penId,eggs:0,birds:0,broken:0};
        (col.entries||[]).forEach(e=>{
          penMap[col.penId].eggs+=(e.eggs||0);penMap[col.penId].broken+=(e.broken||0);
          const pdk=`${col.penId}|${col.side}|${e.standId}|${e.tier}|${e.cellNum}|${col.date}`;
          if(!penDB[pdk]){penDB[pdk]=true;penMap[col.penId].birds+=(e.birds||0);}
        });});
      tabContent=`
        <div class="sec-hdr" style="margin-top:8px">Performance by Pen — ${modeLabel}</div>
        <div class="card" style="padding:0;overflow:hidden">
          <table class="ana-table"><tr><th>Pen</th><th>Eggs</th><th>Broken</th><th>Rate</th></tr>
          ${Object.values(penMap).map(p=>`<tr>
            <td><b>${p.name}</b></td>
            <td style="font-weight:800;color:var(--g2)">${p.eggs}</td>
            <td style="color:var(--red)">${p.broken}</td>
            <td>${rateBadge(p.birds>0?p.eggs/p.birds*100:null)}</td></tr>`).join('')}
          </table></div>`;
    }
    if(ANA_TAB==='trend'){
      // One line per pen, drawn against each pen's own flock age. Two flocks of
      // different ages then sit on the same axis and can be read against each
      // other week for week, which is the whole reason for keeping them apart.
      const isWeekly=TREND_MODE==='weekly';
      const tPens=(farm.pens||[]).filter(p=>inScope(p.id));
      const {rows:tRows,byPen}=penTrendChartData(tPens,isWeekly);
      const drawn=tPens.filter(p=>byPen[p.id].length>0);
      // With a single flock there is nothing to tell apart, so keep the line
      // coloured by the rate itself the way it has always read. Only once two
      // pens share the axis does a flat colour per pen carry more information.
      const tSeries=drawn.map((p,i)=>drawn.length>1
        ?{name:p.name,color:PEN_LINE_COLOURS[i%PEN_LINE_COLOURS.length],get:r=>r['hdp_'+p.id]}
        :{name:p.name,color:'var(--g2)',colorOf:rateColor,get:r=>r['hdp_'+p.id]});
      const chart=tRows.length>1&&drawn.length
        ?lineChartSvg('pentrend',tRows,tSeries,{dec:1,unit:'%',band:[80,100],bandLabel:'target ≥ 80%',xOf:r=>r.label,
           extra:r=>drawn.map(p=>r['eggs_'+p.id]!=null
             ?`<div class="ttr"><em>${p.name} eggs</em><strong>${r['eggs_'+p.id].toLocaleString()}</strong></div>`:'').join('')})
        :`<div style="color:var(--gray);font-size:13px;padding:24px 0;text-align:center">Not enough data — log eggs across at least 2 ${isWeekly?'weeks':'months'} to see the trend.</div>`;

      // Headline tiles are per pen, never blended.
      const tiles=drawn.map(p=>{
        const pts=byPen[p.id];
        const peak=pts.reduce((b,x)=>!b||x.hdp>b.hdp?x:b,null);
        const last=pts[pts.length-1];
        const above=pts.filter(x=>x.hdp>=80).length;
        let arrow='→',col='var(--gray)';
        if(pts.length>=4){
          const l3=pts.slice(-3).reduce((s,x)=>s+x.hdp,0)/3, prev=pts.slice(-6,-3);
          if(prev.length){const p3=prev.reduce((s,x)=>s+x.hdp,0)/prev.length;
            if(l3>p3+2){arrow='↑';col='var(--g2)';}else if(l3<p3-2){arrow='↓';col='var(--red)';}}
        }
        return`<div class="card" style="margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="width:10px;height:10px;border-radius:50%;background:${drawn.length>1?PEN_LINE_COLOURS[drawn.indexOf(p)%PEN_LINE_COLOURS.length]:'var(--g2)'};flex-shrink:0"></span>
            <b style="font-size:14px">${p.name}</b></div>
          <div class="kpi-row-3" style="margin:0">
            <div class="kpi"><div class="kpi-val" style="color:var(--g2)">${peak?peak.hdp.toFixed(0)+'%':'—'}</div><div class="kpi-lbl">Peak${peak?' ('+peak.label+')':''}</div></div>
            <div class="kpi"><div class="kpi-val">${above}</div><div class="kpi-lbl">${isWeekly?'Weeks':'Months'} ≥80%</div></div>
            <div class="kpi"><div class="kpi-val" style="color:${col}">${arrow} ${last?last.hdp.toFixed(0)+'%':'—'}</div><div class="kpi-lbl">Latest</div></div>
          </div></div>`;
      }).join('');

      const tblPen=drawn.find(p=>p.id===_activePenId)||drawn[0];
      tabContent=`
        <div style="display:flex;gap:8px;margin:10px 16px 4px">
          <button class="btn btn-sm ${isWeekly?'btn-primary':'btn-secondary'}" style="flex:1" onclick="TREND_MODE='weekly';renderReports()">Weekly</button>
          <button class="btn btn-sm ${!isWeekly?'btn-primary':'btn-secondary'}" style="flex:1" onclick="TREND_MODE='monthly';renderReports()">Monthly</button>
        </div>
        <div style="margin:0 16px">${tiles}</div>
        <div class="sec-hdr" style="margin-top:4px">Production Trend — ${isWeekly?'By Flock Age Week':'By Calendar Month'}</div>
        <div class="card">${chart}</div>
        ${tblPen?`<div class="sec-hdr">${tblPen.name} · ${isWeekly?'Weekly':'Monthly'} Breakdown</div>
        <div class="card" style="padding:0;overflow:hidden">
          <table class="ana-table"><tr><th>${isWeekly?'Age':'Month'}</th><th>Eggs</th><th>Rate</th><th>vs 80%</th></tr>
            ${[...byPen[tblPen.id]].reverse().map(x=>{const diff=x.hdp-80;const dc=diff>=0?'var(--g2)':diff>-10?'var(--amber)':'var(--red)';
              return`<tr><td><b>${x.label}</b></td>
                <td style="font-weight:800">${x.eggs}</td><td>${rateBadge(x.hdp)}</td>
                <td style="font-weight:700;color:${dc}">${diff>0?'+':''}${diff.toFixed(1)}%</td></tr>`;}).join('')}
          </table></div>`:''}`;
    }
    tabContent=`<div class="inner-tabs" style="background:var(--light)">
      <button class="inner-tab ${ANA_TAB==='cells'?'active':''}" onclick="ANA_TAB='cells';renderReports()">Cells</button>
      <button class="inner-tab ${ANA_TAB==='rounds'?'active':''}" onclick="ANA_TAB='rounds';renderReports()">Rounds</button>
      <button class="inner-tab ${ANA_TAB==='pens'?'active':''}" onclick="ANA_TAB='pens';renderReports()">Pens</button>
      <button class="inner-tab ${ANA_TAB==='trend'?'active':''}" onclick="ANA_TAB='trend';renderReports()">📈 Trend</button>
    </div>${tabContent}`;

  } else if(REP_TAB==='flock'){
    const bRecs=scopedBirds.slice().sort((a,b)=>a.date.localeCompare(b.date));
    const last30=bRecs.filter(r=>{const d=new Date(DB.today());d.setDate(d.getDate()-30);return r.date>=d.toISOString().slice(0,10);});
    const totalDeaths=last30.reduce((s,r)=>s+(r.deaths||0),0);
    const totalCulls=last30.reduce((s,r)=>s+(r.culls||0),0);
    const maxDeath=Math.max(...last30.map(r=>r.deaths||0),1);
    const chartBars=last30.slice(-14).map(r=>{
      const h=Math.max(2,Math.round((r.deaths||0)/maxDeath*50));
      const c=(r.deaths||0)===0?'var(--g4)':(r.deaths/r.opening_birds*100)>0.5?'var(--red)':'var(--amber)';
      return`<div class="bar-col"><div class="bar-fill" style="height:${h}px;background:${c}"></div>
        <div class="bar-lbl">${(r.deaths||0)}</div></div>`;}).join('');
    tabContent=`
      <div class="kpi-row-3">
        <div class="kpi"><div class="kpi-val" style="color:var(--red)">${totalDeaths}</div><div class="kpi-lbl">Deaths (30d)</div></div>
        <div class="kpi"><div class="kpi-val" style="color:var(--amber)">${totalCulls}</div><div class="kpi-lbl">Culls (30d)</div></div>
        <div class="kpi"><div class="kpi-val">${farmBirds}</div><div class="kpi-lbl">Current Birds</div></div>
      </div>
      <div class="sec-hdr" style="margin-top:8px">Daily Mortality (Last 14 Days)</div>
      <div class="card"><div class="bar-chart-row">${chartBars||'<div style="color:var(--gray);font-size:13px">No flock data.</div>'}</div></div>
      <div class="sec-hdr">Death Log (Last 30 Days)</div>
      <div class="card" style="padding:0;overflow:hidden">
        ${last30.filter(r=>(r.deaths||0)>0).reverse().map(r=>{
          const mortality=r.opening_birds>0?(r.deaths/r.opening_birds*100):0;
          const bc=mortality>0.5?'badge-red':mortality>0.2?'badge-amber':'badge-gray';
          return`<div class="list-item"><div>
            <div style="font-weight:700;font-size:14px">${fmtDate(r.date)}</div>
            <div style="font-size:12px;color:var(--gray)">${r.deaths} deaths · ${r.culls} culls · Opening: ${r.opening_birds}</div>
            </div><span class="badge ${bc}">${mortality.toFixed(2)}%</span></div>`;}).join('')||
          '<div class="empty" style="padding:24px"><p>No deaths recorded in last 30 days.</p></div>'}
      </div>`;

  } else if(REP_TAB==='feed'){
    const fRecs=scopedFeed.slice().sort((a,b)=>a.date.localeCompare(b.date));
    // KPI window — always most recent 30 days
    const _cutoff30=(()=>{const d=new Date(DB.today());d.setDate(d.getDate()-30);return d.toISOString().slice(0,10);})();
    const last30f=fRecs.filter(r=>r.date>=_cutoff30);
    const totalFeed=last30f.reduce((s,r)=>s+(r.feed_kg_used||0),0);
    const totalReq=last30f.reduce((s,r)=>s+(r.feed_req_kg||0),0);
    const totalEggsForFCR=DB.getCols().filter(c=>validPenIds.has(c.penId)&&c.date>=_cutoff30).reduce((s,c)=>(c.entries||[]).reduce((ss,e)=>ss+(e.eggs||0),s),0);
    const eggKg=totalEggsForFCR*EGG_KG;
    const fcr=eggKg>0?(totalFeed/eggKg):null;
    const gPerEgg=totalEggsForFCR>0?((totalFeed*1000)/totalEggsForFCR):null;
    // Shared daily series — feeds the per-bird chart and the monthly table
    const fDaily=feedDailySeries(validPenIds,_activePenId);
    // Chart window — navigable via FEED_CHART_OFFSET
    const _chartEnd=(()=>{const d=new Date(DB.today());d.setDate(d.getDate()-FEED_CHART_OFFSET*30);return d.toISOString().slice(0,10);})();
    const _chartStart=(()=>{const d=new Date(DB.today());d.setDate(d.getDate()-FEED_CHART_OFFSET*30-30);return d.toISOString().slice(0,10);})();
    const chartFeed=fRecs.filter(r=>r.date>_chartStart&&r.date<=_chartEnd);
    const hasPrev=fRecs.some(r=>r.date<=_chartStart);
    const dailyFeed=Object.entries(chartFeed.reduce((m,r)=>{(m[r.date]=m[r.date]||{kg:0,req:0});m[r.date].kg+=r.feed_kg_used||0;m[r.date].req+=r.feed_req_kg||0;return m;},{}))
      .sort((a,b)=>a[0].localeCompare(b[0]));
    const feedChartSvg=(()=>{
      const n=dailyFeed.length; if(n===0)return'<div style="color:var(--gray);font-size:13px;padding:20px 0">No feed data for this period.</div>';
      const svgW=600,cH=58,svgH=74,slot=svgW/n,bW=Math.min(24,slot*0.52);
      const maxVal=Math.max(...dailyFeed.map(([,v])=>Math.max(v.kg,v.req||0)),1);
      const lblStep=Math.ceil(n/12);
      const bars=dailyFeed.map(([,v],i)=>{
        const x=i*slot+(slot-bW)/2,bH=Math.max(1,(v.kg/maxVal)*cH),y=cH-bH;
        const vr=v.req>0?(v.kg-v.req)/v.req*100:0;
        const col=Math.abs(vr)>15?'#c0392b':Math.abs(vr)>10?'#e67e22':'#27ae60';
        const lbl=i%lblStep===0||i===n-1?v.kg.toFixed(0):'';
        return`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bW.toFixed(1)}" height="${bH.toFixed(1)}" fill="${col}" rx="1.5"/>${lbl?`<text x="${(x+bW/2).toFixed(1)}" y="${svgH-1}" text-anchor="middle" font-size="7" fill="#aaa">${lbl}</text>`:''}`;
      }).join('');
      const tPts=dailyFeed.map(([,v],i)=>{if(!v.req)return null;const x=i*slot+slot/2,y=cH-(v.req/maxVal)*cH;return`${x.toFixed(1)},${Math.max(0,y).toFixed(1)}`;}).filter(Boolean);
      const tLine=tPts.length>0?`<polyline points="${tPts.join(' ')}" fill="none" stroke="#4895ef" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${tPts.map(pt=>{const[x,y]=pt.split(',');return`<circle cx="${x}" cy="${y}" r="2.5" fill="#4895ef"/>`;}).join('')}`:'';
      return`<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;height:auto;display:block;overflow:visible">
        <line x1="0" y1="0.5" x2="${svgW}" y2="0.5" stroke="#f0f0f0" stroke-width="1"/>
        ${bars}${tLine}</svg>`;
    })();
    const navBtnStyle='border:none;background:none;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;line-height:1';
    const navBtnDis='opacity:.25;cursor:default;pointer-events:none';

    // ── Feed per bird per day (last 60 logged days) ──
    const gbdRows=fDaily.filter(d=>d.gPerBird!=null).slice(-60);
    const gbdSvg=lineChartSvg('gbd',gbdRows,[
      {name:'Actual',color:'#12946a',get:r=>r.gPerBird},
      {name:'Breed standard',color:'#4895ef',dash:true,get:r=>r.stdG}
    ],{dec:0,unit:'g',xOf:r=>fmtDate(r.date).replace(/ \d{4}$/,''),
       extra:r=>`<div class="ttr"><em>Birds</em><strong>${r.birds}</strong></div>`});
    const gbdRecent=gbdRows.slice(-7);
    const gbdNote=(()=>{
      if(!gbdRecent.length)return '';
      const a=gbdRecent.reduce((s,r)=>s+r.gPerBird,0)/gbdRecent.length;
      const s=gbdRecent.reduce((x,r)=>x+r.stdG,0)/gbdRecent.length;
      const diff=a-s, birds=gbdRecent[gbdRecent.length-1].birds;
      if(Math.abs(diff)<=2)return `Last 7 logged days averaged <b>${a.toFixed(0)}g</b> against a standard of <b>${s.toFixed(0)}g</b> — on target.`;
      const kg=Math.abs(diff)/1000*birds*30;
      return `Last 7 logged days averaged <b>${a.toFixed(0)}g</b> against a standard of <b>${s.toFixed(0)}g</b> —
        <b style="color:${diff>0?'var(--red)':'var(--amber)'}">${Math.abs(diff).toFixed(0)}g ${diff>0?'over':'under'} per bird</b>.
        At ${birds} birds that is about <b>${kg.toFixed(0)} kg</b> a month.`;
    })();

    // ── Month over month ──
    const mRows=feedMonthlyRows(fDaily).filter(r=>r.kg>0||r.eggs>0).slice(-13);
    const mFcr=mRows.filter(r=>r.fcr!=null);
    const momSvg=mFcr.length>1?lineChartSvg('mom',mFcr,[{name:'FCR',color:'#12946a',colorOf:fcrColour,get:r=>r.fcr}],
      {dec:2,band:[0,FCR_GOOD],xOf:r=>fmtMonth(r.m),
       extra:r=>`${r.lay!=null?`<div class="ttr"><em>Lay rate</em><strong>${r.lay.toFixed(0)}%</strong></div>`:''}${r.age!=null?`<div class="ttr"><em>Flock age</em><strong>${r.age} wks</strong></div>`:''}`}):'';
    // Latest known flock age, for the age-aware wording below and in the subheader.
    const momAge=(()=>{for(let i=mRows.length-1;i>=0;i--)if(mRows[i].age!=null)return mRows[i].age;
      for(let i=fDaily.length-1;i>=0;i--)if(fDaily[i].age!=null)return fDaily[i].age; return null;})();
    const momNote=(()=>{
      if(mFcr.length<2)return 'Two full months of feed and egg records are needed before a trend means anything.';
      const full=mFcr.filter(r=>r.days>=20), pool=full.length?full:mFcr;
      const best=pool.reduce((a,b)=>b.fcr<a.fcr?b:a), now=mFcr[mFcr.length-1];
      const partial=now.days<20;
      if(best.m===now.m)return `This is the flock's best month so far at <b>${now.fcr.toFixed(2)}</b>.`;
      const head=`Best ${full.length?'full ':''}month was <b>${fmtMonth(best.m)}</b> at <b>${best.fcr.toFixed(2)}</b>. ${fmtMonth(now.m)} is <b>${now.fcr.toFixed(2)}</b>${partial?' so far':''}.`;
      // Running at or under the best month is good news — say so rather than
      // reading the comparison as a decline.
      if(now.fcr<=best.fcr+0.03)
        return `${head} That is at or below the best${partial?', though the month is not closed yet':''}.`;
      const layTxt=(best.lay!=null&&now.lay!=null)?` Lay moved ${best.lay.toFixed(0)}% → ${now.lay.toFixed(0)}%`:'';
      const ageTxt=(best.age!=null&&now.age!=null)?` as the flock aged ${best.age} → ${now.age} weeks`:'';
      // Age only excuses a rising FCR late in the cycle.
      const verdict=momAge==null?'.'
        :momAge>=FCR_AGE_DECLINE?`. Past ${FCR_AGE_DECLINE} weeks that is what age does — the pace is what matters.`
        :momAge>=FCR_AGE_POSTPEAK?'. Coming off peak, so part of this is age.'
        :`. At ${momAge} weeks age does not explain it — check intake and lay.`;
      const gTxt=(best.gpb!=null&&now.gpb!=null&&now.gpb-best.gpb>3)
        ? ` Intake also rose ${best.gpb.toFixed(0)}g → ${now.gpb.toFixed(0)}g per bird.`:'';
      return `${head}${layTxt}${ageTxt}${verdict}${gTxt}`;
    })();

    tabContent=`
      <div class="kpi-row-3">
        <div class="kpi"><div class="kpi-val">${totalFeed.toFixed(0)}</div><div class="kpi-lbl">kg Used (30d)</div></div>
        <div class="kpi"><div class="kpi-val" style="color:${fcrColour(fcr)}">${fcr?fcr.toFixed(2):'—'}</div><div class="kpi-lbl">FCR (30d)</div></div>
        <div class="kpi"><div class="kpi-val">${gPerEgg?gPerEgg.toFixed(0)+'g':'—'}</div><div class="kpi-lbl">Feed/Egg (30d)</div></div>
      </div>
      <details style="background:var(--blueBg);border:1.5px solid var(--blue);border-radius:var(--radius);padding:10px 14px;margin:0 16px 10px">
        <summary style="font-size:12px;color:#1a5fa8;font-weight:700;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center">FCR Benchmark <span style="font-size:10px;color:#5a9fd4;font-weight:400">tap to expand</span></summary>
        <div style="font-size:13px;color:var(--gray);margin-top:8px">FCR = kg feed ÷ kg eggs (30-day window). Target: <b>FCR &lt; ${FCR_GOOD}</b> · g feed/egg: <b>110–130g</b>.</div>
      </details>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px 4px">
        <span style="font-size:12px;font-weight:800;color:var(--g1);text-transform:uppercase;letter-spacing:.4px">Daily Feed Usage</span>
        <div style="display:flex;align-items:center;gap:4px">
          <button style="${navBtnStyle}${!hasPrev?navBtnDis:''}" onclick="FEED_CHART_OFFSET++;renderReports()" title="Earlier">←</button>
          <span style="font-size:11px;color:var(--gray);min-width:130px;text-align:center">${fmtDate(_chartStart)} – ${fmtDate(_chartEnd)}</span>
          <button style="${navBtnStyle}${FEED_CHART_OFFSET===0?navBtnDis:''}" onclick="FEED_CHART_OFFSET=Math.max(0,FEED_CHART_OFFSET-1);renderReports()" title="Later">→</button>
        </div>
      </div>
      <div class="card" style="padding:16px">
        ${feedChartSvg}
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:var(--gray)">
          <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:12px;height:10px;background:#27ae60;border-radius:2px"></span>On target (≤10%)</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:12px;height:10px;background:#e67e22;border-radius:2px"></span>10–15% off</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:12px;height:10px;background:#c0392b;border-radius:2px"></span>&gt;15% off</span>
          <span style="display:flex;align-items:center;gap:5px"><svg width="22" height="10" viewBox="0 0 22 10"><line x1="0" y1="5" x2="22" y2="5" stroke="#4895ef" stroke-width="2"/><circle cx="11" cy="5" r="2.5" fill="#4895ef"/></svg>Expected (from saved req)</span>
          <button class="tbtn" style="margin-left:auto" onclick="toggleFeedTbl('log')">${FEED_TBL.log?'Hide table':'Table'}</button>
        </div>
      </div>
      ${FEED_TBL.log?`
      <div class="sec-hdr">Feed Log · ${fmtDate(_chartStart)} – ${fmtDate(_chartEnd)}</div>
      <div class="card" style="padding:12px 16px">
        <div class="tscroll"><table class="dtbl">
          <thead><tr><th>Date</th><th>Type</th><th>Used kg</th><th>Req kg</th><th>Var %</th></tr></thead>
          <tbody>${chartFeed.slice().reverse().map(r=>{
            const vr=r.feed_req_kg>0?((r.feed_kg_used-r.feed_req_kg)/r.feed_req_kg*100):0;
            const col=Math.abs(vr)>15?'var(--red)':Math.abs(vr)>10?'var(--amber)':'var(--g2)';
            return`<tr><td>${fmtDate(r.date)}</td><td>${canonFeedType(r.feed_type)||'—'}</td><td>${(r.feed_kg_used||0).toFixed(1)}</td>
              <td>${(r.feed_req_kg||0).toFixed(1)}</td><td style="color:${col};font-weight:700">${vr>0?'+':''}${vr.toFixed(0)}%</td></tr>`;
          }).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--gray);padding:18px">No feed records.</td></tr>'}</tbody>
        </table></div>
      </div>`:''}

      <div class="sec-hdr">Feed per bird per day</div>
      <p style="font-size:12px;color:var(--gray);padding:0 16px 6px;margin:0">Grams eaten per bird against the breed standard for the flock's age. Moves before FCR does.</p>
      <div class="card" style="padding:16px">
        ${gbdSvg}
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:var(--gray)">
          <span style="display:flex;align-items:center;gap:5px"><svg width="22" height="10" viewBox="0 0 22 10"><line x1="0" y1="5" x2="22" y2="5" stroke="#12946a" stroke-width="2"/></svg>Actual</span>
          <span style="display:flex;align-items:center;gap:5px"><svg width="22" height="10" viewBox="0 0 22 10"><line x1="0" y1="5" x2="22" y2="5" stroke="#4895ef" stroke-width="2" stroke-dasharray="5 3"/></svg>Breed standard</span>
          <button class="tbtn" style="margin-left:auto" onclick="toggleFeedTbl('gbd')">${FEED_TBL.gbd?'Hide table':'Table'}</button>
        </div>
        ${gbdNote?`<div style="font-size:12.5px;color:var(--gray);margin-top:10px;padding-top:10px;border-top:1px solid #ecefed">${gbdNote}</div>`:''}
        ${FEED_TBL.gbd?`<div class="tscroll"><table class="dtbl">
          <thead><tr><th>Date</th><th>Age wk</th><th>Birds</th><th>Actual g</th><th>Std g</th><th>Diff</th></tr></thead>
          <tbody>${gbdRows.slice().reverse().map(r=>{
            const d=r.gPerBird-r.stdG;
            return`<tr><td>${fmtDate(r.date)}</td><td>${r.age??'—'}</td><td>${r.birds}</td><td>${r.gPerBird.toFixed(0)}</td>
              <td>${r.stdG}</td><td style="color:${Math.abs(d)>10?'var(--red)':'var(--g2)'};font-weight:700">${d>0?'+':''}${d.toFixed(0)}</td></tr>`;
          }).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:18px">No data.</td></tr>'}</tbody>
        </table></div>`:''}
      </div>

      <div class="sec-hdr">Month over month</div>
      <p style="font-size:12px;color:var(--gray);padding:0 16px 6px;margin:0">${fcrAgeHint(momAge)}</p>
      <div class="card" style="padding:16px">
        ${momSvg}
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:var(--gray)">
          <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:12px;height:10px;background:var(--g2);border-radius:2px"></span>&lt; ${FCR_GOOD}</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:12px;height:10px;background:var(--amber);border-radius:2px"></span>${FCR_GOOD}–${FCR_WARN}</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:12px;height:10px;background:var(--red);border-radius:2px"></span>&gt; ${FCR_WARN}</span>
          <button class="tbtn" style="margin-left:auto" onclick="toggleFeedTbl('mom')">${FEED_TBL.mom?'Hide table':'Table'}</button>
        </div>
        ${FEED_TBL.mom?`<div class="tscroll"><table class="dtbl">
          <thead><tr><th>Month</th><th>FCR</th><th>vs prev</th><th>Age</th><th>Lay %</th><th>g/bird/d</th><th>g/egg</th><th>Feed kg</th><th>Eggs</th></tr></thead>
          <tbody>${mRows.map((r,i)=>{
            const prev=(()=>{for(let j=i-1;j>=0;j--)if(mRows[j].fcr!=null)return mRows[j];return null;})();
            const d=(r.fcr!=null&&prev)?r.fcr-prev.fcr:null;
            const col=d==null?'var(--gray)':d>0.03?'var(--red)':d<-0.03?'var(--g2)':'var(--gray)';
            const arrow=d==null?'—':d>0.03?'▲':d<-0.03?'▼':'–';
            return`<tr${i===mRows.length-1?' style="background:var(--g5)"':''}>
              <td>${fmtMonth(r.m)}${r.days<20?' *':''}</td>
              <td style="font-weight:700;color:${fcrColour(r.fcr)}">${r.fcr!=null?r.fcr.toFixed(2):'—'}</td>
              <td style="color:${col};font-weight:700">${arrow}${d==null?'':' '+(d>0?'+':'')+d.toFixed(2)}</td>
              <td>${r.age??'—'}</td><td>${r.lay!=null?r.lay.toFixed(0)+'%':'—'}</td>
              <td>${r.gpb!=null?r.gpb.toFixed(0):'—'}</td><td>${r.gpe!=null?r.gpe.toFixed(0):'—'}</td>
              <td>${r.kg.toFixed(0)}</td><td>${r.eggs.toLocaleString()}</td></tr>`;
          }).join('')||'<tr><td colspan="9" style="text-align:center;color:var(--gray);padding:18px">No feed records yet.</td></tr>'}</tbody>
        </table></div>
        <div style="font-size:10.5px;color:var(--gray);text-align:right;margin-top:5px">swipe for intake and volumes →</div>`:''}
        <div style="font-size:12.5px;color:var(--gray);margin-top:10px;padding-top:10px;border-top:1px solid #ecefed">${momNote}${mRows.some(r=>r.days<20)?'<br>* partial month.':''}</div>
      </div>`;

  } else if(REP_TAB==='journal'){
    // Aggregate all notes from every module, sorted newest-first
    const journalEntries=[];
    DB.getBirds().forEach(r=>{if(r.notes)journalEntries.push({date:r.date,src:'Flock',srcCls:'badge-purple',icon:'🐔',note:r.notes,meta:`${r.opening_birds}→${r.closing_birds} birds · ${r.deaths} deaths`});});
    DB.getHealth().forEach(r=>{if(r.notes)journalEntries.push({date:r.date,src:'Health',srcCls:'badge-green',icon:'💊',note:r.notes,meta:`${r.droppings_observation||'—'} droppings${r.vaccination_or_medication?' · '+r.vaccination_or_medication:''}`});});
    DB.getFeed().forEach(r=>{if(r.notes)journalEntries.push({date:r.date,src:'Feed',srcCls:'badge-blue',icon:'🌾',note:r.notes,meta:`${r.feed_kg_used}kg used · ${r.feed_type}`});});
    DB.getExpenses().forEach(r=>{if(r.notes)journalEntries.push({date:r.date,src:'Expense',srcCls:'badge-red',icon:'💸',note:r.notes,meta:`${r.category} · ${fmtMoney(r.amount_ngn)}`});});
    DB.getSales().forEach(r=>{if(r.notes)journalEntries.push({date:r.date,src:'Sale',srcCls:'badge-green',icon:'🥚',note:r.notes,meta:`${r.product} · ${fmtMoney(r.total_amount_ngn)}`});});
    DB.getCols().filter(c=>c.notes).forEach(c=>{journalEntries.push({date:c.date,src:'Eggs',srcCls:'badge-amber',icon:'📝',note:c.notes,meta:`${c.penName} · ${c.lineName} · Side ${c.side} · ${c.roundLabel}`});});
    journalEntries.sort((a,b)=>b.date.localeCompare(a.date)||b.src.localeCompare(a.src));
    tabContent=journalEntries.length===0
      ?`<div class="empty" style="padding:48px 24px"><svg viewBox="0 0 24 24" style="width:44px;height:44px;stroke:var(--gray);fill:none;stroke-width:1.5;margin-bottom:12px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg><h3>No notes yet</h3><p>Add notes when logging flock, health, feed, or sales records — they'll all appear here in one place.</p></div>`
      :`<div style="margin:12px 16px 4px;font-size:12px;color:var(--gray)">${journalEntries.length} note${journalEntries.length!==1?'s':''} across all modules</div>
        <div class="card" style="padding:0;overflow:hidden">
          ${journalEntries.map((e,i)=>{
            const showDate=i===0||e.date!==journalEntries[i-1].date;
            const dateHdr=showDate?`<div style="padding:8px 16px 4px;font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;background:var(--light);border-bottom:1px solid #eee">${fmtDate(e.date)}</div>`:'';
            return`${dateHdr}<div style="padding:12px 16px;border-bottom:1px solid #f5f5f5">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span style="font-size:15px">${e.icon}</span>
                <span class="badge ${e.srcCls}" style="font-size:10px">${e.src}</span>
                <span style="font-size:11px;color:var(--gray)">${e.meta}</span>
              </div>
              <div style="font-size:14px;color:#1a1a1a;font-style:italic;line-height:1.5">"${e.note}"</div>
            </div>`;}).join('')}
        </div>`;

  } else if(REP_TAB==='pens'){
    tabContent=renderPensReport();

  } else if(REP_TAB==='finance'){
    const expenses=DB.getExpenses(), sales=DB.getSales();
    const today=DB.today(), thisMonth=today.slice(0,7);
    const activeMonth=FIN_MONTH||thisMonth;
    const monthExp=expenses.filter(e=>e.date.startsWith(activeMonth)).reduce((s,e)=>s+(e.amount_ngn||0),0);
    const monthSales=sales.filter(s=>s.date.startsWith(activeMonth)).reduce((s,e)=>s+(e.total_amount_ngn||0),0);
    const allExp=expenses.reduce((s,e)=>s+(e.amount_ngn||0),0);
    const allSales=sales.reduce((s,e)=>s+(e.total_amount_ngn||0),0);
    const totalEggsAll=DB.getCols().filter(c=>validPenIds.has(c.penId)).reduce((s,c)=>(c.entries||[]).reduce((ss,e)=>ss+(e.eggs||0),s),0);
    const costPerEgg=totalEggsAll>0?(allExp/totalEggsAll):null;
    const costPerCrate=costPerEgg?costPerEgg*30:null;
    const catMap={};
    expenses.forEach(e=>{catMap[e.category]=(catMap[e.category]||0)+(e.amount_ngn||0);});
    const topCats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const maxCat=topCats[0]?.[1]||1;
    const monthSet=new Set([thisMonth]);
    expenses.forEach(e=>{if(e.date)monthSet.add(e.date.slice(0,7));});
    sales.forEach(s=>{if(s.date)monthSet.add(s.date.slice(0,7));});
    const monthOpts=[...monthSet].sort().reverse().map(m=>{
      const d=new Date(m+'-01T00:00:00');
      const lbl=d.toLocaleDateString('en-GB',{month:'long',year:'numeric'})+(m===thisMonth?' (This Month)':'');
      return`<option value="${m}" ${m===activeMonth?'selected':''}>${lbl}</option>`;
    }).join('');
    tabContent=`
      <div style="background:var(--white);padding:10px 16px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;margin:0 16px 10px;border-radius:var(--radius);box-shadow:var(--shadow)">
        <span style="font-size:12px;font-weight:700;color:var(--gray);white-space:nowrap">Month:</span>
        <select style="flex:1;padding:8px 12px;border:1.5px solid #ddd;border-radius:10px;font-size:14px;font-weight:600;background:var(--white)"
          onchange="FIN_MONTH=this.value;renderReports()">${monthOpts}</select>
        ${FIN_MONTH&&FIN_MONTH!==thisMonth?`<button class="btn btn-secondary btn-sm" onclick="FIN_MONTH=null;renderReports()">Clear</button>`:''}
      </div>
      <div class="kpi-row-3">
        <div class="kpi"><div class="kpi-val" style="color:var(--g2)">${fmtMoney(monthSales)}</div><div class="kpi-lbl">Sales (${finMonthLabel})</div></div>
        <div class="kpi"><div class="kpi-val" style="color:var(--red)">${fmtMoney(monthExp)}</div><div class="kpi-lbl">Expenses (${finMonthLabel})</div></div>
        <div class="kpi"><div class="kpi-val" style="color:${monthSales-monthExp>=0?'var(--g2)':'var(--red)'}">${fmtMoney(monthSales-monthExp)}</div><div class="kpi-lbl">Margin (${finMonthLabel})</div></div>
      </div>
      <div class="kpi-row-2">
        <div class="kpi"><div class="kpi-val">${costPerEgg?'₦'+costPerEgg.toFixed(0):'—'}</div><div class="kpi-lbl">Cost/Egg (All-Time)</div></div>
        <div class="kpi"><div class="kpi-val">${costPerCrate?'₦'+costPerCrate.toFixed(0):'—'}</div><div class="kpi-lbl">Cost/Crate (All-Time)</div></div>
      </div>
      <div class="sec-hdr" style="margin-top:8px">Top Expense Categories</div>
      <div class="card" style="padding:0;overflow:hidden">
        ${topCats.map(([cat,amt])=>{const pct=Math.round(amt/maxCat*100);
          return`<div class="list-item"><div><div style="font-weight:700;font-size:14px">${cat}</div>
            <div style="height:6px;width:${pct}%;background:var(--g3);border-radius:3px;margin-top:4px;min-width:4px"></div></div>
            <div style="font-weight:800;color:var(--red)">${fmtMoney(amt)}</div></div>`;}).join('')||
          '<div class="empty" style="padding:24px"><p>No expense data.</p></div>'}
      </div>
      <div class="sec-hdr">All-Time Summary</div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f5f5f5">
          <span style="font-weight:700">Total Revenue</span><span style="color:var(--g2);font-weight:800">${fmtMoney(allSales)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f5f5f5">
          <span style="font-weight:700">Total Expenses</span><span style="color:var(--red);font-weight:800">${fmtMoney(allExp)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:16px">
          <span style="font-weight:800">Net Profit/Loss</span><span style="color:${allSales-allExp>=0?'var(--g2)':'var(--red)'};font-weight:800">${fmtMoney(allSales-allExp)}</span></div>
      </div>`;
  }

  el.innerHTML=`<div class="topbar"><div><h1>Reports</h1><small>${topbarLabel}</small></div></div>
    ${REP_TAB==='eggs'||REP_TAB==='pens'?`<div style="background:var(--white);padding:10px 16px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px">
      <span style="font-size:12px;font-weight:700;color:var(--gray);white-space:nowrap">View:</span>
      <button onclick="openDatePicker()" style="flex:1;padding:8px 12px;border:1.5px solid #ddd;border-radius:10px;font-size:14px;font-weight:600;background:var(--white);color:#1a1a1a;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer">
        <span>${modeLabel}</span><span style="color:var(--g3);font-size:12px">📅 ▾</span></button>
      ${ANA_DATE?`<button class="btn btn-secondary btn-sm" onclick="ANA_DATE=null;renderReports()">Clear</button>`:''}
    </div>`:''}
    ${REP_TAB==='eggs'||REP_TAB==='flock'||REP_TAB==='feed'?reportPenBar(farm):''}
    <div class="inner-tabs">
      <button class="inner-tab ${REP_TAB==='eggs'?'active':''}" onclick="REP_TAB='eggs';renderReports()">Eggs</button>
      <button class="inner-tab ${REP_TAB==='pens'?'active':''}" onclick="REP_TAB='pens';renderReports()">Pens</button>
      <button class="inner-tab ${REP_TAB==='flock'?'active':''}" onclick="REP_TAB='flock';renderReports()">Flock</button>
      <button class="inner-tab ${REP_TAB==='feed'?'active':''}" onclick="REP_TAB='feed';renderReports()">Feed</button>
      <button class="inner-tab ${REP_TAB==='finance'?'active':''}" onclick="REP_TAB='finance';renderReports()">Finance</button>
      <button class="inner-tab ${REP_TAB==='journal'?'active':''}" onclick="REP_TAB='journal';renderReports()">📓 Journal</button>
    </div>
    ${tabContent}
    <div style="height:12px"></div>`;
  // The trend overlay uses the same chart helper, so it needs the same wiring.
  if(REP_TAB==='feed'||(REP_TAB==='eggs'&&ANA_TAB==='trend'))wireFeedCharts();
}
function confirmReset(){
  openModal(`<div class="modal-ttl">Reset Data? <button class="modal-x" onclick="closeModal()">×</button></div>
    <p style="font-size:14px;color:var(--gray);margin-bottom:18px">All egg collection records will be deleted. Farm setup and other logs are kept.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-danger" onclick="closeModal();DB.saveCols([]);confirmSave('Egg records cleared');renderReports()">Delete Egg Records</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>`);
}
