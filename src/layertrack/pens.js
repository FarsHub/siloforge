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

// ── Feed valuation ──────────────────────────────────────────────────────
// Walks each feed type's store ledger keeping a running kg and a running naira
// value, so every usage record can be priced at what the store was actually
// worth per kg that day. A purchase adds value, a physical count re-anchors the
// kg and revalues at the prevailing unit price, a usage draws both down.
//
// Returns the usage prices plus the running totals needed to show, on screen,
// that no feed money went missing: what was bought, what has been eaten and
// charged to pens, and what is still sitting in the store. All time — stock
// reconciles over its life, not inside a reporting window.
function feedValuation(){
  const out={};
  let storeValue=0,bought=0,eaten=0,unpricedKg=0,
      // Feed the birds ate that no recorded purchase covers — eaten before the
      // feed store was ever used, or after the book ran dry. It is real feed and
      // a real cost, so the pen is still charged for it at the best price on
      // record, but it is kept out of the purchase reconciliation because there
      // is no purchase behind it.
      uncoveredKg=0,uncoveredNgn=0,coveredEaten=0;
  feedStoreTypes().forEach(t=>{
    let balKg=0,balVal=0,unit=null;
    const avg=avgFeedPricePerKg(t);
    feedStockEvents(t).forEach(e=>{
      const kg=Number(e.kg)||0;
      if(e.kind==='count'){
        const u=balKg>0?balVal/balKg:(unit??avg??0);
        balKg=kg; balVal=kg*u;
      } else if(e.kind==='usage'){
        const u=balKg>0?balVal/balKg:(unit??avg??0);
        const val=kg*u;
        out[e.rec.id]={ngn:val,unit:u};
        eaten+=val;
        // Feed eaten with no purchase anywhere on record cannot be priced.
        // Count the kg so the report can say so instead of charging ₦0.
        if(!(u>0))unpricedKg+=kg;
        // Split what the book could actually cover from what it could not. Only
        // the covered part draws the store down, so bought still equals eaten
        // plus what is left plus whatever counts wrote off.
        const coveredKg=Math.min(kg,Math.max(0,balKg));
        const uncKg=kg-coveredKg;
        coveredEaten+=coveredKg*u;
        uncoveredKg+=uncKg; uncoveredNgn+=uncKg*u;
        balKg=Math.max(0,balKg-kg); balVal=Math.max(0,balVal-coveredKg*u);
      } else {
        const cost=Number(e.rec.cost_ngn)||0;
        bought+=cost;
        // A purchase logged without a price still adds kg; value those kg at
        // the going rate so they do not enter the store for free.
        balKg+=kg; balVal+=cost>0?cost:kg*(unit??avg??0);
      }
      if(balKg>0)unit=balVal/balKg;
    });
    storeValue+=balVal;
  });
  return{usage:out,storeValue,bought,eaten,coveredEaten,uncoveredKg,uncoveredNgn,unpricedKg};
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

// ── The main roll-up ────────────────────────────────────────────────────
function penEconomics(range){
  const farm=DB.getFarm()||{pens:[]};
  const pens=farm.pens||[];
  const r=range||anaDateRange();
  const legacy=legacyPenId();
  const fv=feedValuation(), usageVal=fv.usage;

  const cols=DB.getCols().filter(c=>inRange(c.date,r));
  const feedRecs=DB.getFeed().filter(x=>inRange(x.date,r)&&Number(x.feed_kg_used)>0);
  const birdRecs=DB.getBirds().filter(x=>inRange(x.date,r));
  // A feed-store purchase is stock, not cost. Its money reaches a pen through
  // the kg that pen eats, so counting the purchase as well would charge twice.
  const expenses=DB.getExpenses().filter(x=>inRange(x.date,r)&&!x.feed_stock_id);
  const sales=DB.getSales().filter(x=>inRange(x.date,r));
  const eggRevenue=sales.filter(s=>s.product===EGG_PRODUCT)
    .reduce((s,e)=>s+Number(e.total_amount_ngn||0),0);

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
    const revenue=totalEggs>0?eggRevenue*eggs/totalEggs:0;

    return{pen,stage:getPenStage(pen),birdsNow,eggs,broken,
      crackPct:eggs>0?broken/eggs*100:null,
      hdp:eggBirdDays>0?eggs/eggBirdDays*100:null,
      feedKg,feedCost,feedDays:feedDates.length,
      gPerBirdDay:feedBirdDays>0?feedKg*1000/feedBirdDays:null,
      fcr:eggs>0&&feedKg>0?feedKg/(eggs*EGG_KG):null,
      gPerEgg:eggs>0&&feedKg>0?feedKg*1000/eggs:null,
      deaths,culls,
      mortalityPct:opening>0?deaths/opening*100:null,
      tagged,cats,cost,revenue,
      sharePct:totalEggs>0?eggs/totalEggs*100:null,
      margin:revenue-cost,
      costPerEgg:eggs>0?cost/eggs:null,
      costPerCrate:eggs>0?cost/eggs*EGGS_PER_CRATE:null};
  });

  // Everything that was not charged to a pen, kept visible instead of spread.
  const untagged=expenses.filter(x=>!x.pen_id);
  const unCats={};
  untagged.forEach(x=>{unCats[x.category]=(unCats[x.category]||0)+Number(x.amount_ngn||0);});

  return{rows,range:r,totalEggs,eggRevenue,
    otherRevenue:sales.filter(s=>s.product!==EGG_PRODUCT)
      .reduce((s,e)=>s+Number(e.total_amount_ngn||0),0),
    unallocated:untagged.reduce((s,x)=>s+Number(x.amount_ngn||0),0),
    unallocatedCats:unCats,
    untaggedCount:untagged.length,
    // Feed purchases sitting in this window, for the note that explains why
    // they are not in anybody's cost yet.
    feedBoughtPeriod:DB.getFeedStock()
      .filter(x=>(x.kind||'purchase')==='purchase'&&inRange(x.date,r))
      .reduce((s,x)=>s+Number(x.cost_ngn||0),0),
    feedFedPeriod:rows.reduce((s,x)=>s+x.feedCost,0),
    // All time — these three are what must reconcile.
    feedBought:fv.bought,feedFed:fv.coveredEaten,feedInStore:fv.storeValue,
    feedEatenTotal:fv.eaten,
    feedUncoveredKg:fv.uncoveredKg,feedUncoveredNgn:fv.uncoveredNgn,
    feedUnpricedKg:fv.unpricedKg};
}

// ── Report tab ──────────────────────────────────────────────────────────
function penMoneyRow(label,value,color){
  return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f5f5f5">
    <span style="font-size:13px;color:var(--gray)">${label}</span>
    <span style="font-weight:800;font-size:13px;color:${color||'var(--g1)'}">${value}</span></div>`;
}
function renderPensReport(){
  const ec=penEconomics();
  const farm=DB.getFarm()||{pens:[]};
  if((farm.pens||[]).length===0)
    return `<div class="empty" style="padding:24px"><h3>No pens yet</h3><p>Add pens in Settings to compare them here.</p></div>`;

  const cards=ec.rows.map(p=>{
    const st=p.stage;
    const src=[p.pen.breed,p.pen.source].filter(Boolean).join(' · ');
    const marginCol=p.margin>=0?'var(--g2)':'var(--red)';
    const catRows=Object.entries(p.cats).sort((a,b)=>b[1]-a[1])
      .map(([c,v])=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:var(--gray)">
        <span>${c}</span><span style="font-weight:700;color:var(--g1)">${fmtMoney(Math.round(v))}</span></div>`).join('');
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
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:${rateColor(p.hdp)}">${p.hdp!==null?p.hdp.toFixed(0)+'%':'—'}</div><div class="kpi-lbl">Lay Rate</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:${p.mortalityPct===null?'var(--gray)':p.mortalityPct>3?'var(--red)':p.mortalityPct>1?'var(--amber)':'var(--g2)'}">${p.mortalityPct!==null?p.mortalityPct.toFixed(1)+'%':'—'}</div><div class="kpi-lbl">Mortality</div></div>
      </div>

      <div style="font-size:10px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Feed Efficiency</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px">
        <div class="kpi-sm"><div class="kpi-val-sm" style="color:${fcrColour(p.fcr)}">${p.fcr!==null?p.fcr.toFixed(2):'—'}</div><div class="kpi-lbl-sm">FCR</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm">${p.gPerBirdDay!==null?p.gPerBirdDay.toFixed(0)+'g':'—'}</div><div class="kpi-lbl-sm">Feed/Bird/Day</div></div>
        <div class="kpi-sm"><div class="kpi-val-sm">${p.feedKg>0?p.feedKg.toFixed(0)+'kg':'—'}</div><div class="kpi-lbl-sm">Feed Used</div></div>
      </div>

      <div style="font-size:10px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">Money</div>
      ${penMoneyRow('Direct cost',fmtMoney(Math.round(p.cost)),'var(--red)')}
      ${catRows?`<div style="padding:4px 0 8px 10px;border-bottom:1px solid #f5f5f5">${catRows}</div>`:''}
      ${penMoneyRow(`Revenue — ${p.sharePct!==null?p.sharePct.toFixed(0):'0'}% share of eggs`,fmtMoney(Math.round(p.revenue)),'var(--g2)')}
      <div style="display:flex;justify-content:space-between;padding:9px 0;font-size:15px">
        <span style="font-weight:800">Margin</span>
        <span style="font-weight:800;color:${marginCol}">${p.margin>=0?'+':''}${fmtMoney(Math.round(p.margin))}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray);border-top:1px solid #f5f5f5;padding-top:8px">
        <span>Cost/egg <b style="color:var(--g1)">${p.costPerEgg?'₦'+p.costPerEgg.toFixed(1):'—'}</b></span>
        <span>Cost/crate <b style="color:var(--g1)">${p.costPerCrate?'₦'+p.costPerCrate.toFixed(0):'—'}</b></span>
      </div>
    </div>`;
  }).join('');

  const unCatRows=Object.entries(ec.unallocatedCats).sort((a,b)=>b[1]-a[1])
    .map(([c,v])=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:var(--gray)">
      <span>${c}</span><span style="font-weight:700;color:var(--g1)">${fmtMoney(Math.round(v))}</span></div>`).join('');

  return `${(farm.pens||[]).length>1?'':`<div style="margin:10px 16px 0;background:var(--blueBg);border-left:3px solid var(--blue);padding:8px 12px;border-radius:0 6px 6px 0;font-size:12px;color:#1a5fa8">
      Only one pen is set up, so every figure below is the whole farm. Add the second pen in Settings to compare the two intakes.
    </div>`}
    <div class="sec-hdr" style="margin-top:8px">Per Pen — ${anaModeLabel()}</div>
    ${cards}
    <div class="sec-hdr">Not Charged to Any Pen</div>
    <div class="card">
      <p style="font-size:12px;color:var(--gray);margin:0 0 8px">Farm-wide spending stays here rather than being split across pens, so a pen's cost is only money you assigned to it. Tag an expense to a pen when you log it and it moves up.</p>
      ${penMoneyRow('Unassigned expenses'+(ec.untaggedCount?` (${ec.untaggedCount})`:''),fmtMoney(Math.round(ec.unallocated)),'var(--red)')}
      ${unCatRows?`<div style="padding:4px 0 8px 10px;border-bottom:1px solid #f5f5f5">${unCatRows}</div>`:''}
      ${ec.otherRevenue>0?penMoneyRow('Non-egg sales (birds, manure…)',fmtMoney(Math.round(ec.otherRevenue)),'var(--g2)'):''}
      ${ec.feedBoughtPeriod>0?`<div style="background:var(--blueBg);border-left:3px solid var(--blue);padding:8px 12px;border-radius:0 6px 6px 0;font-size:12px;color:#1a5fa8;margin-top:10px">
        🌾 Feed purchases of <b>${fmtMoney(Math.round(ec.feedBoughtPeriod))}</b> in this period are not counted above. They are stock, not a pen's cost, until the birds eat them — ${fmtMoney(Math.round(ec.feedFedPeriod))} of feed was eaten in this period and is already inside the pen costs. The trail below shows where the rest sits.
      </div>`:''}
    </div>
    ${(()=>{
      // Stock reconciles over its whole life, not inside a window, so this
      // block ignores the date filter. Bought = eaten + in store + the gap,
      // and the gap is named rather than quietly absorbed.
      const gap=ec.feedBought-ec.feedFed-ec.feedInStore;  // feedFed is the covered part
      const shown=Math.abs(gap)>=100;
      return `<div class="sec-hdr">Feed Money Trail — All Time</div>
    <div class="card">
      <p style="font-size:12px;color:var(--gray);margin:0 0 8px">A feed purchase is stock, not a cost. It becomes a pen's cost on the day that pen eats it, priced at what the store was worth per kg that day — so the full purchase never lands on one pen, and feed is never counted twice. These figures tie:</p>
      ${penMoneyRow('Bought (all time)',fmtMoney(Math.round(ec.feedBought)))}
      ${penMoneyRow('↓ Eaten from that stock — charged to pens',fmtMoney(Math.round(ec.feedFed)),'var(--red)')}
      ${penMoneyRow('↓ Still in the store, not yet a cost',fmtMoney(Math.round(ec.feedInStore)),'var(--g2)')}
      ${shown?penMoneyRow('↓ Unaccounted — stock counts and spillage',fmtMoney(Math.round(gap)),'var(--amber)'):''}
      ${shown?`<p style="font-size:11px;color:var(--gray);margin:8px 0 0">The unaccounted line is feed the store no longer holds that no pen was charged for — usually a physical count finding less than the book. It is shown rather than hidden so it can be chased.</p>`:
        `<p style="font-size:11px;color:var(--g2);font-weight:700;margin:8px 0 0">✓ Every naira of purchased feed is either eaten and charged to a pen, or still in the store.</p>`}
      ${ec.feedUncoveredKg>0?`<div style="background:var(--amberBg);border-radius:6px;padding:9px 11px;font-size:12px;color:#7d4e00;margin-top:10px;line-height:1.5">
        ℹ <b>${Math.round(ec.feedUncoveredKg).toLocaleString()}kg</b> eaten in your logs is not backed by any purchase in the store — feed the birds ate before you started booking purchases in, or after the book ran dry.
        It is still real feed, so pens are charged <b>${fmtMoney(Math.round(ec.feedUncoveredNgn))}</b> for it at the best price on record. That figure is an estimate, not a receipt, and it sits outside the reconciliation above because there is no purchase behind it.
      </div>`:''}
      ${ec.feedUnpricedKg>0?`<div style="background:var(--amberBg);border-radius:6px;padding:8px 10px;font-size:12px;color:#7d4e00;margin-top:10px">
        ⚠ ${Math.round(ec.feedUnpricedKg).toLocaleString()}kg was eaten with no purchase price on record at all, so it was charged at ₦0. Add a purchase in Feed → Store to price it.
      </div>`:''}
    </div>`;})()}`;
}
