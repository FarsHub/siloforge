// ═══════════════════════════════════════════════
// PEN ECONOMICS — cost, revenue and FCR per pen
// ═══════════════════════════════════════════════
// Two flocks of different ages, from different sources, in different pens only
// tell you anything if the money follows the birds. It does so three ways:
//
//   1. Expenses carry an optional pen_id. Tagged = that pen's direct cost.
//   2. Feed is bought farm-wide but eaten per pen, so a feed purchase is
//      treated as stock, not cost, and the kg a pen eats are valued at the
//      moving average price of the store on the day they were eaten.
//   3. Eggs pool before sale, so egg revenue is split by the share of eggs
//      each pen actually laid in the period.
//
// Anything left untagged stays untagged. It is reported in its own bucket
// rather than spread across pens, so a pen's cost is only ever money you said
// belonged to it.

// ── Date range ──────────────────────────────────────────────────────────
// Mirrors filterColsByDate() so the pen tab and the egg tab agree on what
// "Last 30 Days" means.
function anaDateRange(){
  if(!ANA_DATE)return{from:null,to:null};
  const days={last7:7,last14:14,last21:21,last30:30}[ANA_DATE];
  if(days){const d=new Date();d.setDate(d.getDate()-days);return{from:d.toISOString().slice(0,10),to:null};}
  if(ANA_DATE.startsWith('range:')){const[,from,to]=ANA_DATE.split(':');return{from,to};}
  return{from:ANA_DATE,to:ANA_DATE};
}
function inRange(date,r){
  if(!date)return false;
  if(r.from&&date<r.from)return false;
  if(r.to&&date>r.to)return false;
  return true;
}

// The pen that owns records saved before pen tagging existed. Oldest flock,
// because untagged history necessarily predates the newer intake.
function legacyPenId(){
  const pens=(DB.getFarm()||{}).pens||[];
  if(pens.length===0)return null;
  if(pens.length===1)return pens[0].id;
  const dated=pens.filter(p=>p.flockStartDate).sort((a,b)=>a.flockStartDate.localeCompare(b.flockStartDate));
  return (dated[0]||pens[0]).id;
}

// ── The pen you are inside ───────────────────────────────────
// One definition of ownership, used by every screen. The old rule — "no pen on
// the record, or this pen" — was harmless with a single pen and wrong the
// moment a second appeared, because it showed every untagged record inside
// every pen. An untagged record belongs to the oldest flock and nowhere else.
function ownedByPen(rec,penId){
  return (rec.pen_id||legacyPenId())===penId;
}
function ownedByActivePen(rec){ return ownedByPen(rec,_activePenId); }
function activePen(){
  return _activePenId?(((DB.getFarm()||{}).pens)||[]).find(p=>p.id===_activePenId)||null:null;
}
// Birds and age must come from the pen on screen. A farm total under a pen
// heading, or the first pen's age applied to the second, is how a Wk 12
// pre-lay flock ends up being fed a laying ration.
function activePenBirds(){
  const pen=activePen();
  if(!pen)return 0;
  const last=DB.getBirds().filter(r=>ownedByPen(r,pen.id)&&(r.closing_birds||0)>0)
    .sort((a,b)=>b.date.localeCompare(a.date))[0];
  return last?last.closing_birds:getPenTotalBirds(pen);
}
function activePenAgeWeeks(){
  const st=activePen()?getPenStage(activePen()):null;
  return st?st.weeks:0;
}

// ── Feed valuation ──────────────────────────────────────────────────────
// Walks each feed type's store ledger keeping a running kg and a running naira
// value, so every usage record can be priced at what the store was actually
// worth per kg that day. A purchase adds value, a physical count re-anchors the
// kg and revalues at the prevailing unit price, a usage draws both down.
//
// The rule that keeps feed from being counted twice: a pen is charged only for
// feed the store actually held. Feed bought outside the store — entered as an
// ordinary expense rather than a store purchase — was already expensed the day
// it was paid for, so charging it again when the birds eat it would bill the
// same sack twice. Those kg still count towards FCR; they just cost nothing here.
function feedValuation(){
  const out={};
  feedStoreTypes().forEach(t=>{
    let balKg=0,balVal=0,unit=null;
    const avg=avgFeedPricePerKg(t);
    feedStockEvents(t).forEach(e=>{
      const kg=Number(e.kg)||0;
      if(e.kind==='count'){
        // A count overwrites the book, carrying the prevailing unit price
        // onto whatever was actually found on the floor.
        const u=balKg>0?balVal/balKg:(unit??avg??0);
        balKg=kg; balVal=kg*u;
      } else if(e.kind==='usage'){
        const u=balKg>0?balVal/balKg:(unit??avg??0);
        // Only what the store could cover becomes a cost here.
        const coveredKg=Math.min(kg,Math.max(0,balKg));
        const val=coveredKg*u;
        out[e.rec.id]={ngn:val,unit:u};
        balKg=Math.max(0,balKg-kg); balVal=Math.max(0,balVal-val);
      } else {
        const cost=Number(e.rec.cost_ngn)||0;
        // A purchase logged without a price still adds kg; value those kg at
        // the going rate so they do not enter the store for free.
        balKg+=kg; balVal+=cost>0?cost:kg*(unit??avg??0);
      }
      if(balKg>0)unit=balVal/balKg;
    });
  });
  return out;
}
// Weighted average of every priced purchase of a feed type. Used to value kg
// that the moving average cannot price — feed eaten before the first purchase
// was logged, or a purchase entered without its cost.
function avgFeedPricePerKg(feedType){
  const want=canonFeedType(feedType);
  let kg=0,ngn=0;
  DB.getFeedStock().forEach(r=>{
    if((r.kind||'purchase')!=='purchase')return;
    if(canonFeedType(r.feed_type)!==want)return;
    if(!(Number(r.cost_ngn)>0&&Number(r.kg)>0))return;
    kg+=Number(r.kg); ngn+=Number(r.cost_ngn);
  });
  return kg>0?ngn/kg:lastFeedPricePerKg(feedType);
}
// ── Bird numbers through time ───────────────────────────────────────────
// Carry the last flock count forward. Built from every record for the pen, not
// just those in the window, so a period with no flock log still knows the size
// of the flock it is reporting on.
function penBirdsOnDateFn(penId,fallback){
  const legacy=legacyPenId();
  const recs=DB.getBirds()
    .filter(b=>((b.pen_id||legacy)===penId)&&(b.closing_birds||0)>0)
    .sort((a,b)=>a.date.localeCompare(b.date));
  const first=recs.length?recs[0].closing_birds:null;
  return date=>{
    let v=null;
    for(const r of recs){ if(r.date<=date)v=r.closing_birds; else break; }
    return v??first??fallback;
  };
}

// ── Production trend ─────────────────────────────────────────
// Age comes from the pen's own placement date, not from a farm-wide bird log.
// That is what lets two flocks of different ages be drawn on one axis: plotted
// against their own age, the curves line up and you can read whether the newer
// intake is out-laying the older one did at the same week.
function penAgeWeekOn(pen,date){
  if(!pen||!pen.flockStartDate)return null;
  const d=Math.floor((new Date(date+'T00:00:00')-new Date(pen.flockStartDate+'T00:00:00'))/864e5);
  if(d<0)return null;
  return Math.floor(d/7)+(pen.flockAgeAtArrival||0);
}
const TREND_MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// One pen's lay curve, bucketed by its own age in weeks or by calendar month.
// Each day's rate is worked out first and then averaged, so a day with a short
// collection cannot drag the bucket down by weight of eggs alone.
function penTrendPoints(pen,weekly){
  const eggsByDate={};
  DB.getCols().filter(c=>c.penId===pen.id).forEach(c=>{
    const n=(c.entries||[]).reduce((s,e)=>s+(e.eggs||0),0);
    if(n>0)eggsByDate[c.date]=(eggsByDate[c.date]||0)+n;
  });
  const birdsOn=penBirdsOnDateFn(pen.id,getPenTotalBirds(pen));
  const buckets={};
  Object.entries(eggsByDate).forEach(([date,eggs])=>{
    const birds=birdsOn(date); if(!birds)return;
    let key,label,sortKey;
    if(weekly){
      const w=penAgeWeekOn(pen,date); if(w==null)return;
      key='w'+w; label='Wk '+w; sortKey=w;
    } else {
      key=date.slice(0,7); sortKey=key;
      label=`${TREND_MONTHS[+date.slice(5,7)-1]} '${date.slice(2,4)}`;
    }
    const b=buckets[key]||(buckets[key]={hdpSum:0,days:0,eggs:0,label,sortKey});
    b.hdpSum+=eggs/birds*100; b.days++; b.eggs+=eggs;
  });
  return Object.values(buckets)
    .sort((a,b)=>weekly?a.sortKey-b.sortKey:String(a.sortKey).localeCompare(String(b.sortKey)))
    .map(b=>({...b,hdp:b.hdpSum/b.days}))
    .filter(b=>isFinite(b.hdp));
}
// Aligns every pen's curve onto one shared x-axis so lineChartSvg can overlay
// them. Weekly keys are flock age, so the pens genuinely line up; monthly keys
// are calendar, so they run side by side in real time instead.
function penTrendChartData(pens,weekly){
  const byPen={}, keys=new Map();
  pens.forEach(pen=>{
    const pts=penTrendPoints(pen,weekly);
    byPen[pen.id]=pts;
    pts.forEach(pt=>keys.set(pt.label,pt.sortKey));
  });
  const rows=[...keys.entries()]
    .sort((a,b)=>weekly?a[1]-b[1]:String(a[1]).localeCompare(String(b[1])))
    .map(([label])=>({label}));
  rows.forEach(r=>pens.forEach(pen=>{
    const hit=byPen[pen.id].find(p=>p.label===r.label);
    r['hdp_'+pen.id]=hit?hit.hdp:null;
    r['eggs_'+pen.id]=hit?hit.eggs:null;
  }));
  return{rows,byPen};
}
// The trend chart is drawn by hand rather than through lineChartSvg. A lay
// curve is read differently from a feed chart: the eye wants a dot on every
// week, the 70 and 80 lines it is judged against, and the best week called out
// without hovering. A generic auto-scaled chart gives none of those, and pads
// the axis below zero where a rate can never go.
function penTrendSvg(rows,drawn,isWeekly){
  const multi=drawn.length>1;
  const vals=rows.flatMap(r=>drawn.map(p=>r['hdp_'+p.id])).filter(v=>v!=null);
  if(rows.length<2||!vals.length)
    return`<div style="color:var(--gray);font-size:13px;padding:24px 0;text-align:center">Not enough data — log eggs across at least 2 ${isWeekly?'weeks':'months'} to see the trend.</div>`;
  const rawMax=Math.max(Math.ceil(Math.max(...vals)/5)*5+5,20);
  const yMax=Math.ceil(rawMax/10)*10;
  const svgW=600,cH=110,lblH=multi?30:18,svgH=cH+lblH,padL=36,padR=8,plotW=svgW-padL-padR;
  const n=rows.length;
  const yp=v=>(cH-6)-(Math.min(Math.max(v,0),yMax)/yMax)*(cH-12)+2;
  const xp=i=>padL+(i/Math.max(n-1,1))*plotW;
  const rateCol=v=>v>=80?'#27ae60':v>=70?'#e67e22':'#c0392b';

  let axis='';
  for(let v=0;v<=yMax;v+=10)
    axis+=`<text x="${padL-3}" y="${(yp(v)+3).toFixed(1)}" text-anchor="end" font-size="8" fill="#bbb">${v}</text>`;
  axis+=`<line x1="${padL}" y1="${yp(0).toFixed(1)}" x2="${svgW-padR}" y2="${yp(0).toFixed(1)}" stroke="#eee" stroke-width="1"/>`;
  const guide=(v,col)=>yMax>=v?`<line x1="${padL}" y1="${yp(v).toFixed(1)}" x2="${svgW-padR}" y2="${yp(v).toFixed(1)}" stroke="${col}" stroke-width="1" stroke-dasharray="5,3" opacity="0.7"/>
    <text x="${padL-3}" y="${(yp(v)+3).toFixed(1)}" text-anchor="end" font-size="8" fill="${col}" font-weight="700">${v}</text>`:'';
  const bench=guide(80,'#27ae60')+guide(70,'#e67e22');

  const tips=[];
  const body=drawn.map((pen,pi)=>{
    const penCol=PEN_LINE_COLOURS[pi%PEN_LINE_COLOURS.length];
    const pts=rows.map((r,i)=>r['hdp_'+pen.id]==null?null
      :{i,x:xp(i),y:yp(r['hdp_'+pen.id]),hdp:r['hdp_'+pen.id],eggs:r['eggs_'+pen.id]||0,label:r.label}).filter(Boolean);
    if(!pts.length)return'';
    const peak=pts.reduce((b,x)=>!b||x.hdp>b.hdp?x:b,null);
    // Only join points that sit on consecutive buckets, so a pen that was not
    // laying for a stretch shows a break instead of a line across the gap.
    let segs='';
    for(let k=1;k<pts.length;k++){
      const a=pts[k-1],b=pts[k];
      if(b.i!==a.i+1)continue;
      const col=multi?penCol:rateCol((a.hdp+b.hdp)/2);
      segs+=`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    // The soft fill under the curve only works for one line; with two it turns
    // into mud, so it is dropped as soon as a second pen is on the axis.
    const area=multi?'':`<polygon points="${pts[0].x.toFixed(1)},${cH+2} ${pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} ${pts[pts.length-1].x.toFixed(1)},${cH+2}" fill="url(#tGrad)" opacity="0.18"/>`;
    const dots=pts.map(p=>{
      const isPk=p===peak, col=multi?penCol:rateCol(p.hdp);
      const ti=tips.push({label:(multi?pen.name+' · ':'')+p.label,hdp:p.hdp,eggs:p.eggs})-1;
      return`<g onmouseenter="showTrendTip(event,_trendPts[${ti}])" onmouseleave="hideTrendTip()" onmousemove="positionTrendTip(event)" style="cursor:pointer">
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="11" fill="transparent"/>
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${isPk?4.5:2.5}" fill="${col}" stroke="white" stroke-width="1.5"/>
        ${isPk?`<text x="${p.x.toFixed(1)}" y="${(p.y-10).toFixed(1)}" text-anchor="middle" font-size="9" fill="${col}" font-weight="800">▲${p.hdp.toFixed(0)}%</text>`:''}</g>`;
    }).join('');
    return area+segs+dots;
  }).join('');
  window._trendPts=tips;

  const lstep=Math.ceil(n/10);
  const xlbls=rows.map((r,i)=>i%lstep===0||i===n-1
    ?`<text x="${xp(i).toFixed(1)}" y="${(cH+lblH-(multi?13:1)).toFixed(1)}" text-anchor="middle" font-size="7.5" fill="#aaa">${r.label}</text>`:'').join('');
  const legend=multi?drawn.map((pen,pi)=>{
    const x=padL+pi*120;
    return`<circle cx="${x}" cy="${svgH-4}" r="3.5" fill="${PEN_LINE_COLOURS[pi%PEN_LINE_COLOURS.length]}"/>
      <text x="${x+8}" y="${svgH-1}" font-size="8.5" fill="var(--gray)">${pen.name}</text>`;}).join(''):'';

  return`<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;height:auto;display:block;overflow:visible">
    <defs><linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#27ae60" stop-opacity="0.4"/><stop offset="100%" stop-color="#27ae60" stop-opacity="0"/></linearGradient></defs>
    ${axis}${bench}${body}${xlbls}${legend}</svg>`;
}
const PEN_LINE_COLOURS=['#12946a','#c77dff','#e67e22','#4895ef','#c0392b'];

// ── The main roll-up ────────────────────────────────────────────────────
function penEconomics(range){
  const farm=DB.getFarm()||{pens:[]};
  const pens=farm.pens||[];
  const r=range||anaDateRange();
  const legacy=legacyPenId();
  const usageVal=feedValuation();

  const cols=DB.getCols().filter(c=>inRange(c.date,r));
  const feedRecs=DB.getFeed().filter(x=>inRange(x.date,r)&&Number(x.feed_kg_used)>0);
  const birdRecs=DB.getBirds().filter(x=>inRange(x.date,r));
  // A feed-store purchase is stock, not cost. Its money reaches a pen through
  // the kg that pen eats, so counting the purchase as well would charge twice.
  const expenses=DB.getExpenses().filter(x=>inRange(x.date,r)&&!x.feed_stock_id);
  const sales=DB.getSales().filter(x=>inRange(x.date,r));
  const eggRevenue=sales.filter(s=>s.product===EGG_PRODUCT)
    .reduce((s,e)=>s+Number(e.total_amount_ngn||0),0);
  // Birds, manure and the rest come off one identifiable flock — cockerels sold
  // out of a pen are that pen's money. Untagged ones follow the same rule as
  // every other legacy record and go to the oldest pen.
  const otherSales=sales.filter(s=>s.product!==EGG_PRODUCT);

  // Eggs per pen first — the revenue split depends on the totals.
  const eggsBy={},brokenBy={},eggDatesBy={};
  cols.forEach(c=>{
    const id=c.penId; if(!id)return;
    const e=(c.entries||[]).reduce((s,x)=>s+(x.eggs||0),0);
    const b=(c.entries||[]).reduce((s,x)=>s+(x.broken||0),0);
    eggsBy[id]=(eggsBy[id]||0)+e; brokenBy[id]=(brokenBy[id]||0)+b;
    if(e>0)(eggDatesBy[id]=eggDatesBy[id]||new Set()).add(c.date);
  });
  const totalEggs=pens.reduce((s,p)=>s+(eggsBy[p.id]||0),0);

  const rows=pens.map(pen=>{
    const eggs=eggsBy[pen.id]||0, broken=brokenBy[pen.id]||0;
    const birdsNow=getPenTotalBirds(pen);
    const birdsOn=penBirdsOnDateFn(pen.id,birdsNow);

    // Feed — kg from the pen's own usage records, naira from the store price
    // on the day each of those kg was eaten.
    const pFeed=feedRecs.filter(x=>(x.pen_id||legacy)===pen.id);
    const feedKg=pFeed.reduce((s,x)=>s+Number(x.feed_kg_used||0),0);
    // Covered naira only. The uncovered kg were bought outside the store and
    // are already in the tagged expenses, so they are carried as kg for the
    // report to explain, not as money to charge again.
    const feedCost=pFeed.reduce((s,x)=>s+((usageVal[x.id]||{}).ngn||0),0);
    const feedDates=[...new Set(pFeed.map(x=>x.date))];
    const feedBirdDays=feedDates.reduce((s,d)=>s+(birdsOn(d)||0),0);

    // Laying rate over the days eggs were actually collected, so a pen that
    // was not collected on a day is not punished for it.
    const eggDates=[...(eggDatesBy[pen.id]||[])];
    const eggBirdDays=eggDates.reduce((s,d)=>s+(birdsOn(d)||0),0);

    // Mortality
    const pBirds=birdRecs.filter(x=>(x.pen_id||legacy)===pen.id)
      .sort((a,b)=>a.date.localeCompare(b.date));
    const deaths=pBirds.reduce((s,x)=>s+(x.deaths||0),0);
    const culls=pBirds.reduce((s,x)=>s+(x.culls||0),0);
    const opening=pBirds.length?pBirds[0].opening_birds:null;

    // Money. Only what was tagged to this pen, plus the feed it ate.
    const pExp=expenses.filter(x=>x.pen_id===pen.id);
    const tagged=pExp.reduce((s,x)=>s+Number(x.amount_ngn||0),0);
    const cats={};
    pExp.forEach(x=>{cats[x.category]=(cats[x.category]||0)+Number(x.amount_ngn||0);});
    if(feedCost>0)cats['Feed (eaten)']=(cats['Feed (eaten)']||0)+feedCost;
    const cost=tagged+feedCost;
    const eggRev=totalEggs>0?eggRevenue*eggs/totalEggs:0;
    const otherRev=otherSales.filter(x=>(x.pen_id||legacy)===pen.id)
      .reduce((s,e)=>s+Number(e.total_amount_ngn||0),0);
    const revenue=eggRev+otherRev;

    return{pen,stage:getPenStage(pen),birdsNow,eggs,broken,
      crackPct:eggs>0?broken/eggs*100:null,
      hdp:eggBirdDays>0?eggs/eggBirdDays*100:null,
      feedKg,feedCost,feedDays:feedDates.length,
      gPerBirdDay:feedBirdDays>0?feedKg*1000/feedBirdDays:null,
      fcr:eggs>0&&feedKg>0?feedKg/(eggs*EGG_KG):null,
      gPerEgg:eggs>0&&feedKg>0?feedKg*1000/eggs:null,
      deaths,culls,
      mortalityPct:opening>0?deaths/opening*100:null,
      tagged,cats,cost,revenue,eggRev,otherRev,
      sharePct:totalEggs>0?eggs/totalEggs*100:null,
      margin:revenue-cost,
      costPerEgg:eggs>0?cost/eggs:null,
      costPerCrate:eggs>0?cost/eggs*EGGS_PER_CRATE:null};
  });

  // Everything that was not charged to a pen, kept visible instead of spread.
  const untagged=expenses.filter(x=>!x.pen_id);
  const unCats={};
  untagged.forEach(x=>{unCats[x.category]=(unCats[x.category]||0)+Number(x.amount_ngn||0);});

  return{rows,range:r,
    unallocated:untagged.reduce((s,x)=>s+Number(x.amount_ngn||0),0),
    unallocatedCats:unCats,
    untaggedCount:untagged.length};
}

// ── Month by month ──────────────────────────────────────────
// Anyone drawing profit monthly needs a month's figure, not a running total.
// Built in one pass rather than by calling penEconomics twelve times, because
// each of those calls re-walks the whole feed ledger.
//
// The egg share is worked out inside each month: a pen earns the portion of
// that month's egg revenue matching the eggs it laid that month. Sharing on
// all-time eggs would credit a new pen for crates sold before it existed.
function penMonthlyPL(){
  const farm=DB.getFarm()||{pens:[]}, pens=farm.pens||[];
  const legacy=legacyPenId(), usage=feedValuation();
  const M={};
  const month=m=>M[m]||(M[m]={eggRev:0,byPen:{}});
  const cell=(m,id)=>{ const o=month(m);
    return o.byPen[id]||(o.byPen[id]={tagged:0,feedCost:0,eggs:0,otherRev:0}); };

  DB.getCols().forEach(c=>{
    if(!c.penId||!c.date)return;
    const n=(c.entries||[]).reduce((s,e)=>s+(e.eggs||0),0);
    if(n>0)cell(c.date.slice(0,7),c.penId).eggs+=n;
  });
  DB.getFeed().forEach(r=>{
    if(!(Number(r.feed_kg_used)>0)||!r.date)return;
    cell(r.date.slice(0,7),r.pen_id||legacy).feedCost+=((usage[r.id]||{}).ngn||0);
  });
  DB.getExpenses().forEach(e=>{
    // Feed-store purchases are stock; they reach a pen as the birds eat them.
    if(e.feed_stock_id||!e.pen_id||!e.date)return;
    cell(e.date.slice(0,7),e.pen_id).tagged+=Number(e.amount_ngn||0);
  });
  DB.getSales().forEach(sl=>{
    if(!sl.date)return;
    const m=sl.date.slice(0,7);
    if(sl.product===EGG_PRODUCT)month(m).eggRev+=Number(sl.total_amount_ngn||0);
    else cell(m,sl.pen_id||legacy).otherRev+=Number(sl.total_amount_ngn||0);
  });

  const months=Object.keys(M).sort().reverse();
  const byPen={};
  pens.forEach(pen=>{
    byPen[pen.id]=months.map(m=>{
      const o=M[m], c=o.byPen[pen.id]||{tagged:0,feedCost:0,eggs:0,otherRev:0};
      const totalEggs=Object.values(o.byPen).reduce((s,x)=>s+x.eggs,0);
      const eggRev=totalEggs>0?o.eggRev*c.eggs/totalEggs:0;
      const cost=c.tagged+c.feedCost, revenue=eggRev+c.otherRev;
      return{month:m,eggs:c.eggs,cost,tagged:c.tagged,feedCost:c.feedCost,
        eggRev,otherRev:c.otherRev,revenue,margin:revenue-cost,
        sharePct:totalEggs>0?c.eggs/totalEggs*100:null};
    }).filter(r=>r.cost>0||r.revenue>0||r.eggs>0);
  });
  return{months,byPen};
}
// The share only says anything when there is another pen to share with.
function multiPen(){ return (((DB.getFarm()||{}).pens)||[]).length>1; }
function fmtMonthLabel(m){
  return new Date(m+'-01T00:00:00').toLocaleDateString('en-GB',{month:'short',year:'numeric'});
}
function penMonthlyTable(penId){
  const rows=(penMonthlyPL().byPen[penId])||[];
  if(!rows.length)return'<div class="empty" style="padding:20px"><p>No monthly figures yet.</p></div>';
  const tot=rows.reduce((a,r)=>({cost:a.cost+r.cost,revenue:a.revenue+r.revenue,margin:a.margin+r.margin}),{cost:0,revenue:0,margin:0});
  return`<table class="ana-table">
    <tr><th>Month</th><th>Revenue</th><th>Cost</th><th>Margin</th></tr>
    ${rows.map(r=>`<tr>
      <td><b>${fmtMonthLabel(r.month)}</b>${r.eggs>0?`<br><small style="color:var(--gray)">${r.eggs.toLocaleString()} eggs</small>`:''}</td>
      <td style="color:var(--g2);font-weight:700">${fmtMoney(Math.round(r.revenue))}${multiPen()&&r.sharePct!==null&&r.eggRev>0?`<br><small style="color:var(--gray);font-weight:500">${r.sharePct.toFixed(0)}% egg share</small>`:''}</td>
      <td style="color:var(--red)">${fmtMoney(Math.round(r.cost))}</td>
      <td style="font-weight:800;color:${r.margin>=0?'var(--g2)':'var(--red)'}">${r.margin>=0?'+':''}${fmtMoney(Math.round(r.margin))}</td></tr>`).join('')}
    <tr style="background:var(--g5)">
      <td><b>All time</b></td>
      <td style="color:var(--g2);font-weight:800">${fmtMoney(Math.round(tot.revenue))}</td>
      <td style="color:var(--red);font-weight:800">${fmtMoney(Math.round(tot.cost))}</td>
      <td style="font-weight:800;color:${tot.margin>=0?'var(--g2)':'var(--red)'}">${tot.margin>=0?'+':''}${fmtMoney(Math.round(tot.margin))}</td></tr>
  </table>`;
}

// ── Report tab ────────────────────────────────────────────────
// Cost breakdowns are collapsed by default, same as the feed report's tables —
// the headline figures are what get read daily.
const PEN_TBL={};
function togglePenTbl(id){ PEN_TBL[id]=!PEN_TBL[id]; renderReports(); }
function penMoneyRow(label,value,color){
  return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f5f5f5">
    <span style="font-size:13px;color:var(--gray)">${label}</span>
    <span style="font-weight:800;font-size:13px;color:${color||'var(--g1)'}">${value}</span></div>`;
}
function penCatRows(cats){
  return Object.entries(cats).sort((a,b)=>b[1]-a[1])
    .map(([c,v])=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:var(--gray)">
      <span>${c}</span><span style="font-weight:700;color:var(--g1)">${fmtMoney(Math.round(v))}</span></div>`).join('');
}
// The money page for the pen you are inside. Same figures as the comparison
// card in Reports, laid out as a P&L because that is what you came here for.
let PL_MONTH=null;   // null = all time
function setPLMonth(v){ PL_MONTH=v||null; renderFinance(); }
function renderPenPL(penId){
  const monthly=penMonthlyPL();
  const mRows=monthly.byPen[penId]||[];
  // The month picker drives the headline block; the table below always shows
  // every month, because comparing them is the point.
  const sel=PL_MONTH&&mRows.some(r=>r.month===PL_MONTH)?PL_MONTH:null;
  const ec=penEconomics(sel?{from:sel+'-01',to:sel+'-31'}:{from:null,to:null});
  const p=ec.rows.find(r=>r.pen.id===penId);
  if(!p)return `<div class="empty" style="padding:24px"><p>No figures for this pen yet.</p></div>`;
  const open=!!PEN_TBL['pl_'+penId];
  const scopeLbl=sel?fmtMonthLabel(sel):'All time';
  return `
    <div style="background:var(--white);padding:10px 16px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;margin:0 16px 10px;border-radius:var(--radius);box-shadow:var(--shadow)">
      <span style="font-size:12px;font-weight:700;color:var(--gray);white-space:nowrap">Period:</span>
      <select style="flex:1;padding:8px 12px;border:1.5px solid #ddd;border-radius:10px;font-size:14px;font-weight:600;background:var(--white)"
        onchange="setPLMonth(this.value)">
        <option value="" ${!sel?'selected':''}>All time</option>
        ${mRows.map(r=>`<option value="${r.month}" ${sel===r.month?'selected':''}>${fmtMonthLabel(r.month)}</option>`).join('')}
      </select></div>
    <div style="margin:0 16px 8px;background:var(--g5);border-radius:10px;padding:12px;display:flex;justify-content:space-between;gap:12px">
      <div><div style="font-size:11px;color:var(--g1);font-weight:700;text-transform:uppercase">${scopeLbl} Margin</div>
        <div style="font-size:20px;font-weight:800;color:${p.margin>=0?'var(--g2)':'var(--red)'}">${p.margin>=0?'+':''}${fmtMoney(Math.round(p.margin))}</div></div>
      <div style="text-align:right"><div style="font-size:11px;color:var(--g1);font-weight:700;text-transform:uppercase">Cost / Crate</div>
        <div style="font-size:20px;font-weight:800;color:var(--g1)">${p.costPerCrate?'₦'+p.costPerCrate.toFixed(0):'—'}</div></div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
        <div style="font-size:10px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.4px">Profit &amp; Loss</div>
        ${Object.keys(p.cats).length?`<button class="tbtn" onclick="togglePenTbl('pl_${penId}')">${open?'Hide breakdown':'Breakdown'}</button>`:''}
      </div>
      ${penMoneyRow('Direct cost',fmtMoney(Math.round(p.cost)),'var(--red)')}
      ${open?`<div style="padding:4px 0 8px 10px;border-bottom:1px solid #f5f5f5">${penCatRows(p.cats)}</div>`:''}
      ${penMoneyRow('Revenue',fmtMoney(Math.round(p.revenue)),'var(--g2)')}
      ${p.revenue>0?`<div style="padding:2px 0 8px 10px;border-bottom:1px solid #f5f5f5">
        ${p.eggRev>0?`<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:var(--gray)">
          <span>Eggs${multiPen()&&p.sharePct!==null?` — ${p.sharePct.toFixed(0)}% share`:''}</span>
          <span style="font-weight:700;color:var(--g1)">${fmtMoney(Math.round(p.eggRev))}</span></div>`:''}
        ${p.otherRev>0?`<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:var(--gray)">
          <span>Birds, manure and other</span>
          <span style="font-weight:700;color:var(--g1)">${fmtMoney(Math.round(p.otherRev))}</span></div>`:''}
      </div>`:''}
      <div style="display:flex;justify-content:space-between;padding:9px 0;font-size:15px">
        <span style="font-weight:800">Margin</span>
        <span style="font-weight:800;color:${p.margin>=0?'var(--g2)':'var(--red)'}">${p.margin>=0?'+':''}${fmtMoney(Math.round(p.margin))}</span></div>
    </div>
    <div class="kpi-row-3">
      <div class="kpi"><div class="kpi-val">${p.costPerEgg?'₦'+p.costPerEgg.toFixed(1):'—'}</div><div class="kpi-lbl">Cost / Egg</div></div>
      <div class="kpi"><div class="kpi-val" style="color:${fcrColour(p.fcr)}">${p.fcr!==null?p.fcr.toFixed(2):'—'}</div><div class="kpi-lbl">FCR</div></div>
      <div class="kpi"><div class="kpi-val">${p.eggs.toLocaleString()}</div><div class="kpi-lbl">Eggs</div></div>
    </div>
    <div class="sec-hdr">Month by Month</div>
    <div class="card" style="padding:0;overflow:hidden">${penMonthlyTable(penId)}</div>`;
}
function renderPensReport(){
  const ec=penEconomics();
  const farm=DB.getFarm()||{pens:[]};
  if((farm.pens||[]).length===0)
    return `<div class="empty" style="padding:24px"><h3>No pens yet</h3><p>Add pens in Settings to compare them here.</p></div>`;

  const cards=ec.rows.map(p=>{
    const st=p.stage;
    const src=[p.pen.breed,p.pen.source].filter(Boolean).join(' · ');
    const open=!!PEN_TBL[p.pen.id];
    return `<div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
        <div>
          <div style="font-weight:800;font-size:16px">${p.pen.name}</div>
          <div style="font-size:12px;color:var(--gray);margin-top:2px">${st?`Wk ${st.weeks} · ${st.label}`:'Age not set'}${src?` · ${src}`:''}</div>
          ${p.pen.flockStartDate?`<div style="font-size:11px;color:var(--gray);margin-top:2px">Placed ${fmtDate(p.pen.flockStartDate)}${p.pen.flockAgeAtArrival?` at ${p.pen.flockAgeAtArrival}w`:''}</div>`:''}
        </div>
        <span class="badge ${p.margin>=0?'badge-green':'badge-red'}">${p.margin>=0?'In profit':'In loss'}</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:10px">
        <div class="kpi-sm"><div class="kpi-val-sm">${p.birdsNow.toLocaleString()}</div><div class="kpi-lbl">Birds</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm">${p.eggs.toLocaleString()}</div><div class="kpi-lbl">Eggs</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:${rateColor(p.hdp,p.stage)}">${p.hdp!==null?p.hdp.toFixed(0)+'%':'—'}</div><div class="kpi-lbl">Lay Rate</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:${p.mortalityPct===null?'var(--gray)':p.mortalityPct>3?'var(--red)':p.mortalityPct>1?'var(--amber)':'var(--g2)'}">${p.mortalityPct!==null?p.mortalityPct.toFixed(1)+'%':'—'}</div><div class="kpi-lbl">Mortality</div></div>
      </div>

      <div style="font-size:10px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Feed Efficiency</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px">
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:${fcrColour(p.fcr)}">${p.fcr!==null?p.fcr.toFixed(2):'—'}</div><div class="kpi-lbl-sm">FCR</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm">${p.gPerBirdDay!==null?p.gPerBirdDay.toFixed(0)+'g':'—'}</div><div class="kpi-lbl-sm">Feed/Bird/Day</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm">${p.feedKg>0?p.feedKg.toFixed(0)+'kg':'—'}</div><div class="kpi-lbl-sm">Feed Used</div></div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
        <div style="font-size:10px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.4px">Money</div>
        ${Object.keys(p.cats).length?`<button class="tbtn" onclick="togglePenTbl('${p.pen.id}')">${open?'Hide breakdown':'Breakdown'}</button>`:''}
      </div>
      ${penMoneyRow('Direct cost',fmtMoney(Math.round(p.cost)),'var(--red)')}
      ${open?`<div style="padding:4px 0 8px 10px;border-bottom:1px solid #f5f5f5">${penCatRows(p.cats)}</div>`:''}
      ${penMoneyRow(multiPen()&&p.sharePct!==null?`Revenue · ${p.sharePct.toFixed(0)}% of eggs`:'Revenue',fmtMoney(Math.round(p.revenue)),'var(--g2)')}
      <div style="display:flex;justify-content:space-between;padding:9px 0;font-size:15px">
        <span style="font-weight:800">Margin</span>
        <span style="font-weight:800;color:${p.margin>=0?'var(--g2)':'var(--red)'}">${p.margin>=0?'+':''}${fmtMoney(Math.round(p.margin))}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray);border-top:1px solid #f5f5f5;padding-top:8px">
        <span>Cost/egg <b style="color:var(--g1)">${p.costPerEgg?'₦'+p.costPerEgg.toFixed(1):'—'}</b></span>
        <span>Cost/crate <b style="color:var(--g1)">${p.costPerCrate?'₦'+p.costPerCrate.toFixed(0):'—'}</b></span>
      </div>
    </div>`;
  }).join('');

  const unOpen=!!PEN_TBL._un;
  return `<div class="sec-hdr" style="margin-top:8px">Per Pen — ${anaModeLabel()}</div>
    ${cards}
    ${ec.unallocated>0?`<div class="sec-hdr">Not Charged to Any Pen</div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
        <div style="font-size:10px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.4px">Farm-wide</div>
        <button class="tbtn" onclick="togglePenTbl('_un')">${unOpen?'Hide breakdown':'Breakdown'}</button>
      </div>
      ${penMoneyRow('Unassigned expenses'+(ec.untaggedCount?` (${ec.untaggedCount})`:''),fmtMoney(Math.round(ec.unallocated)),'var(--red)')}
      ${unOpen?`<div style="padding:4px 0 8px 10px">${penCatRows(ec.unallocatedCats)}</div>`:''}
    </div>`:''}`;
}
