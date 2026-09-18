// ═══════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════
let REP_TAB='batches', FEED_RPT_BATCH=null, FEED_CHART_OFFSET=0;
let GRW_SORT={field:null,dir:'desc'};
function setGrwSort(field){GRW_SORT=GRW_SORT.field===field?{field,dir:GRW_SORT.dir==='desc'?'asc':'desc'}:{field,dir:'desc'};renderReports();}
function sortGrowth(arr){
  if(!GRW_SORT.field)return arr;
  return [...arr].sort((a,b)=>{
    const av=GRW_SORT.field==='actual'?a.avg_weight_g:(a.benchmark_g?a.avg_weight_g/a.benchmark_g*100:-1);
    const bv=GRW_SORT.field==='actual'?b.avg_weight_g:(b.benchmark_g?b.avg_weight_g/b.benchmark_g*100:-1);
    return GRW_SORT.dir==='desc'?bv-av:av-bv;
  });
}
function renderReports(){
  const el=document.getElementById('v-reports');
  const batches=DB.getBatches();
  if(batches.length===0){
    el.innerHTML=`<div class="topbar"><div><h1>Reports</h1></div></div><div class="empty"><svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg><h3>No data yet</h3><p>Add batches and start logging to see reports.</p></div>`;
    return;
  }
  const expenses=DB.getExpenses(), sales=DB.getSales(), daily=DB.getDaily(), weight=DB.getWeight();
  let tabContent='';
  if(REP_TAB==='batches'){
    const batchCards=batches.map(b=>{
      const bDaily=daily.filter(r=>r.batch_id===b.id).sort((a,b2)=>a.date.localeCompare(b2.date));
      const bWeight=weight.filter(r=>r.batch_id===b.id).sort((a,b2)=>a.date.localeCompare(b2.date));
      const bExp=expenses.filter(e=>e.batch_id===b.id).reduce((s,e)=>s+(e.amount_ngn||0),0);
      const bSales=sales.filter(s=>s.batch_id===b.id).reduce((s,e)=>s+(e.total_amount_ngn||0),0);
      const totalDeaths=bDaily.reduce((s,r)=>s+(r.deaths||0),0);
      const totalFeed=DB.getFeed().filter(r=>r.batch_id===b.id).reduce((s,r)=>s+(r.feed_kg_used||0),0);
      const finalBirds=getBatchBirdCount(b);
      const survival=b.doc_count>0?(finalBirds/b.doc_count*100):null;
      const lastW=bWeight[bWeight.length-1];
      const benchmark=lastW?getWeightBenchmark(b.breed,lastW.week_num):null;
      // Feed efficiency metrics
      const bm=getFeedEffBenchmarks(getBirdType(b));
      const ageDays=batchAgeInDays(b)||0;
      const liveWtGainKg=lastW?Math.max(0,(lastW.avg_weight_g-DOC_WEIGHT_G)*finalBirds/1000):null;
      const fcr=liveWtGainKg>0?totalFeed/liveWtGainKg:null;
      const adg=lastW&&ageDays>0?(lastW.avg_weight_g-DOC_WEIGHT_G)/ageDays:null;
      const bFeedRecs=DB.getFeed().filter(r=>r.batch_id===b.id);
      const feedDays=bFeedRecs.filter(r=>r.feed_kg_used>0).length;
      const adfi=feedDays>0&&finalBirds>0?(totalFeed*1000)/feedDays/finalBirds:null;
      const fcrColor=fcr===null?'var(--gray)':fcr<=bm.fcrGood?'var(--g2)':fcr<=bm.fcrOk?'var(--amber)':'var(--red)';
      const adgColor=adg===null?'var(--gray)':adg>=bm.adgGood?'var(--g2)':adg>=bm.adgOk?'var(--amber)':'var(--red)';
      // Temperature compliance
      const batchBirdType=getBirdType(b);
      const broodDays=bDaily.filter(r=>r.temperature_c&&getTempTarget(r.age_days,batchBirdType));
      const inRangeDays=broodDays.filter(r=>{const t=getTempTarget(r.age_days,batchBirdType);return t&&r.temperature_c>=t.min&&r.temperature_c<=t.max;});
      const tempCompliance=broodDays.length>0?(inRangeDays.length/broodDays.length*100):null;
      return`<div class="card" style="border-left:4px solid ${b.status==='Active'?'var(--p2)':b.status==='Sold'?'var(--g3)':'var(--gray)'}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div><div style="font-weight:800;font-size:16px">${b.name}</div>
            <div style="font-size:12px;color:var(--gray)">${b.breed} · ${getBirdTypeLabel(getBirdType(b))}${b.supplier?` · ${b.supplier}`:''}</div>
            <div style="font-size:11px;color:var(--gray);margin-top:2px">DOC: ${fmtDate(b.arrival_date)}</div></div>
          <span class="badge ${b.status==='Active'?'badge-purple':b.status==='Sold'?'badge-green':'badge-gray'}">${b.status}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">
          <div class="kpi-sm"><div class="kpi-val-sm">${b.doc_count}</div><div class="kpi-lbl">DOC In</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:var(--red)">${totalDeaths}</div><div class="kpi-lbl">Total Deaths</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm" style="color:${survival>=95?'var(--g2)':survival>=90?'var(--amber)':'var(--red)'}">${survival!==null?survival.toFixed(1)+'%':'—'}</div><div class="kpi-lbl">Survival</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm">${totalFeed.toFixed(0)}kg</div><div class="kpi-lbl">Feed Used</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm">${lastW?lastW.avg_weight_g+'g':'—'}</div><div class="kpi-lbl">Last Weight</div></div>
          <div class="kpi-sm"><div class="kpi-val-sm">${tempCompliance!==null?tempCompliance.toFixed(0)+'%':'—'}</div><div class="kpi-lbl">Temp OK%</div></div>
        </div>
        <div style="margin-bottom:10px">
          <div style="font-size:10px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Feed Efficiency · ${bm.label}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div class="kpi-sm">
              <div class="kpi-val-sm" style="color:${fcrColor}">${fcr!==null?fcr.toFixed(2):'—'}</div>
              <div class="kpi-lbl-sm">FCR</div>
            </div>
            <div class="kpi-sm">
              <div class="kpi-val-sm" style="color:${adgColor}">${adg!==null?adg.toFixed(1)+'g':'—'}</div>
              <div class="kpi-lbl-sm">ADG/Bird</div>
            </div>
            <div class="kpi-sm">
              <div class="kpi-val-sm">${adfi!==null?adfi.toFixed(0)+'g':'—'}</div>
              <div class="kpi-lbl-sm">Feed/Bird/Day</div>
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px;background:${bSales-bExp>=0?'var(--g5)':'var(--redBg)'};border-radius:8px">
          <span style="font-size:13px;font-weight:700">Revenue − Costs</span>
          <span style="font-weight:800;color:${bSales-bExp>=0?'var(--g2)':'var(--red)'}">${bSales>0||bExp>0?(bSales-bExp>=0?'+':'')+fmtMoney(bSales-bExp):'No financial data'}</span>
        </div>
        ${bWeight.length>1?`
          <div style="margin-top:10px"><div style="font-size:11px;font-weight:800;color:var(--gray);text-transform:uppercase;margin-bottom:4px">Growth Chart</div>
            <div class="bar-chart-row" style="height:50px">
              ${bWeight.map(w=>{const bm=getWeightBenchmark(b.breed,w.week_num)||1;
                const h=Math.max(2,Math.round(w.avg_weight_g/bm*45));
                const c=w.avg_weight_g>=bm*0.95?'var(--g3)':w.avg_weight_g>=bm*0.85?'var(--amber)':'var(--red)';
                return`<div class="bar-col"><div class="bar-fill" style="height:${h}px;background:${c}"></div>
                  <div class="bar-lbl">W${w.week_num}</div></div>`;}).join('')}
            </div></div>`:''}</div>`;
    }).join('');
    tabContent=batchCards;

  } else if(REP_TAB==='mortality'){
    const allDeaths=daily.sort((a,b)=>b.date.localeCompare(a.date)).filter(r=>r.deaths>0);
    const last30=daily.filter(r=>{const d=new Date(DB.today());d.setDate(d.getDate()-30);return r.date>=d.toISOString().slice(0,10);});
    const totalDeaths30=last30.reduce((s,r)=>s+(r.deaths||0),0);
    const maxDeath=Math.max(...last30.map(r=>r.deaths||0),1);
    const bars=last30.slice(-14).map(r=>{
      const h=Math.max(2,Math.round((r.deaths||0)/maxDeath*50));
      return`<div class="bar-col"><div class="bar-fill" style="height:${h}px;background:${(r.deaths||0)===0?'var(--p4)':'var(--red)'}"></div>
        <div class="bar-lbl">${r.deaths||0}</div></div>`;}).join('');
    tabContent=`<div class="kpi-row-2">
      <div class="kpi"><div class="kpi-val" style="color:var(--red)">${totalDeaths30}</div><div class="kpi-lbl">Deaths (30d)</div></div>
      <div class="kpi"><div class="kpi-val">${DB.getBatches().reduce((s,b)=>s+b.doc_count,0)}</div><div class="kpi-lbl">Total DOC</div></div>
    </div>
    <div class="sec-hdr">Daily Mortality (Last 14 Days)</div>
    <div class="card"><div class="bar-chart-row">${bars||'No data'}</div></div>
    <div class="sec-hdr">Death Events (Last 30 Days)</div>
    <div class="card" style="padding:0;overflow:hidden">
      ${allDeaths.slice(0,20).map(r=>{
        const batch=DB.getBatches().find(b=>b.id===r.batch_id);
        const mortality=r.opening_birds>0?(r.deaths/r.opening_birds*100):0;
        return`<div class="list-item"><div>
          <div style="font-weight:700">${batch?.name||r.batch_id} — Day ${r.age_days}</div>
          <div style="font-size:12px;color:var(--gray)">${fmtDate(r.date)}</div></div>
          <span class="badge ${mortality>2?'badge-red':mortality>0.5?'badge-amber':'badge-gray'}">${r.deaths} deaths · ${mortality.toFixed(2)}%</span></div>`;}).join('')||
        '<div class="empty" style="padding:24px"><p>No death events in last 30 days.</p></div>'}
    </div>`;

  } else if(REP_TAB==='journal'){
    const allNotes=[];
    DB.getDaily().forEach(r=>{if(r.notes?.trim()){allNotes.push({date:r.date,icon:'📋',source:'Daily Log',meta:`${r.batch_name||r.batch_id||'—'} · Day ${r.age_days}`,note:r.notes});}});
    DB.getHealth().forEach(r=>{if(r.notes?.trim()){allNotes.push({date:r.date,icon:'🩺',source:'Health',meta:r.batch_name||'All batches',note:r.notes});}});
    DB.getExpenses().forEach(r=>{if(r.notes?.trim()){allNotes.push({date:r.date,icon:'💸',source:'Expense',meta:`${r.category}${r.batch_name?' · '+r.batch_name:''}`,note:r.notes});}});
    DB.getSales().forEach(r=>{if(r.notes?.trim()){allNotes.push({date:r.date,icon:'🐔',source:'Sale',meta:`${r.batch_name||'—'} · ${r.quantity} birds`,note:r.notes});}});
    DB.getWeight().forEach(r=>{if(r.notes?.trim()){allNotes.push({date:r.date,icon:'⚖️',source:'Weight',meta:`${r.batch_name||'—'} · Wk ${r.week_num}`,note:r.notes});}});
    allNotes.sort((a,b)=>b.date.localeCompare(a.date));
    if(allNotes.length===0){
      tabContent=`<div class="empty" style="padding:40px 24px"><p>No notes recorded yet.</p><p style="font-size:12px;margin-top:6px">Add notes when logging daily data, health, expenses, sales, or weights.</p></div>`;
    } else {
      const grouped={};
      allNotes.forEach(n=>{(grouped[n.date]=grouped[n.date]||[]).push(n);});
      tabContent=Object.entries(grouped).map(([date,entries])=>`
        <div class="sec-hdr" style="margin-top:8px">${fmtDate(date)}</div>
        <div class="card" style="padding:0;overflow:hidden">
          ${entries.map(n=>`<div class="list-item" style="align-items:flex-start">
            <div style="font-size:20px;margin-right:4px;flex-shrink:0">${n.icon}</div>
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span style="font-size:11px;font-weight:800;background:var(--p5);color:var(--p1);padding:2px 7px;border-radius:20px">${n.source}</span>
                <span style="font-size:11px;color:var(--gray)">${n.meta}</span>
              </div>
              <div style="font-size:13px;font-style:italic;color:var(--p1);margin-top:4px">"${n.note}"</div>
            </div>
          </div>`).join('')}
        </div>`).join('');
    }

  } else if(REP_TAB==='feed'){
    const allFeed=DB.getFeed();
    const fBatchId=FEED_RPT_BATCH||_activeBatchId||batches[0]?.id;
    const fBatch=batches.find(b=>b.id===fBatchId)||batches[0];
    const bFeed=allFeed.filter(r=>r.batch_id===fBatchId).sort((a,b2)=>a.date.localeCompare(b2.date));
    const batchOpts=batches.map(b=>`<option value="${b.id}" ${b.id===fBatchId?'selected':''}>${b.name}</option>`).join('');
    const totalFeedKg=bFeed.reduce((s,r)=>s+(r.feed_kg_used||0),0);
    const totalReqKg=bFeed.reduce((s,r)=>s+(r.feed_req_kg||0),0);
    // Weekly aggregation from batch start
    const batchStartDate=fBatch?.start_date||bFeed[0]?.date;
    const weekMap={};
    bFeed.forEach(r=>{
      const diffDays=Math.max(0,Math.floor((new Date(r.date)-new Date(batchStartDate))/86400000));
      const wk=Math.floor(diffDays/7)+1;
      if(!weekMap[wk])weekMap[wk]={wk,kg:0,req:0};
      weekMap[wk].kg+=r.feed_kg_used||0;
      weekMap[wk].req+=r.feed_req_kg||0;
    });
    const allWeeks=Object.values(weekMap).sort((a,b)=>a.wk-b.wk);
    const PAGE_W=8;
    const wTotal=allWeeks.length;
    const wPageEnd=Math.max(0,wTotal-FEED_CHART_OFFSET*PAGE_W);
    const wPageStart=Math.max(0,wPageEnd-PAGE_W);
    const chartWeeks=allWeeks.slice(wPageStart,wPageEnd);
    const hasPrev=wPageStart>0;
    const hasNext=FEED_CHART_OFFSET>0;
    const wLblStart=chartWeeks[0]?`Wk ${chartWeeks[0].wk}`:'';
    const wLblEnd=chartWeeks[chartWeeks.length-1]?`Wk ${chartWeeks[chartWeeks.length-1].wk}`:'';
    // SVG weekly feed chart
    const feedChartSvg=(()=>{
      const n=chartWeeks.length;
      if(n===0)return'<div style="color:var(--gray);font-size:13px;padding:20px 0">No feed data for this period.</div>';
      const svgW=600,cH=58,svgH=74,slot=svgW/n,bW=slot*0.52;
      const maxVal=Math.max(...chartWeeks.map(w=>Math.max(w.kg,w.req||0)),1);
      const bars=chartWeeks.map((w,i)=>{
        const x=i*slot+(slot-bW)/2,bH=Math.max(1,(w.kg/maxVal)*cH),y=cH-bH;
        const vr=w.req>0?(w.kg-w.req)/w.req*100:0;
        const col=Math.abs(vr)>15?'#c0392b':Math.abs(vr)>10?'#e67e22':'#27ae60';
        return`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bW.toFixed(1)}" height="${bH.toFixed(1)}" fill="${col}" rx="1.5"/><text x="${(x+bW/2).toFixed(1)}" y="${svgH-1}" text-anchor="middle" font-size="7" fill="#aaa">Wk${w.wk}</text>`;
      }).join('');
      const tPts=chartWeeks.map((w,i)=>{
        if(!w.req)return null;
        const x=i*slot+slot/2,y=cH-(w.req/maxVal)*cH;
        return`${x.toFixed(1)},${Math.max(0,y).toFixed(1)}`;
      }).filter(Boolean);
      const tLine=tPts.length>0?`<polyline points="${tPts.join(' ')}" fill="none" stroke="#4895ef" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${tPts.map(pt=>{const[px,py]=pt.split(',');return`<circle cx="${px}" cy="${py}" r="2.5" fill="#4895ef"/>`;}).join('')}`:'';
      return`<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;height:auto;display:block;overflow:visible">
        <line x1="0" y1="0.5" x2="${svgW}" y2="0.5" stroke="#f0f0f0" stroke-width="1"/>
        ${bars}${tLine}</svg>`;
    })();
    // Feed type donut — SVG with <title> tooltips, no verbose labels
    const byType={};
    bFeed.forEach(r=>{const ft=canonFeedType(r.feed_type);byType[ft]=(byType[ft]||0)+(r.feed_kg_used||0);});
    const typeEntries=Object.entries(byType).sort((a,b2)=>b2[1]-a[1]);
    const totalForPie=typeEntries.reduce((s,[,v])=>s+v,0);
    const PIE_COLORS=['#8b5cf6','#27ae60','#e67e22','#4895ef','#c0392b','#9b59b6','#f39c12'];
    const pieSlices=typeEntries.map(([type,kg],i)=>({type,kg,pct:totalForPie>0?kg/totalForPie*100:0,color:PIE_COLORS[i%PIE_COLORS.length]}));
    const donutSvg=(()=>{
      if(pieSlices.length===0)return'';
      const r0=0.95,r1=0.5;
      let ang=-Math.PI/2;
      const segs=pieSlices.map(s=>{
        const sw=(s.pct/100)*2*Math.PI;
        const a1=ang,a2=ang+sw; ang=a2;
        const x1=Math.cos(a1)*r0,y1=Math.sin(a1)*r0;
        const x2=Math.cos(a2)*r0,y2=Math.sin(a2)*r0;
        const x3=Math.cos(a2)*r1,y3=Math.sin(a2)*r1;
        const x4=Math.cos(a1)*r1,y4=Math.sin(a1)*r1;
        const lg=sw>Math.PI?1:0;
        const d=`M ${x1.toFixed(4)} ${y1.toFixed(4)} A ${r0} ${r0} 0 ${lg} 1 ${x2.toFixed(4)} ${y2.toFixed(4)} L ${x3.toFixed(4)} ${y3.toFixed(4)} A ${r1} ${r1} 0 ${lg} 0 ${x4.toFixed(4)} ${y4.toFixed(4)} Z`;
        return`<path d="${d}" fill="${s.color}"><title>${s.type}: ${s.kg.toFixed(0)}kg (${s.pct.toFixed(0)}%)</title></path>`;
      }).join('');
      return`<svg viewBox="-1 -1 2 2" style="width:110px;height:110px;flex-shrink:0">${segs}</svg>`;
    })();
    const donutLegend=pieSlices.map(s=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px"><div style="width:10px;height:10px;border-radius:2px;background:${s.color};flex-shrink:0"></div><span style="font-size:12px;font-weight:600;color:#444">${s.type}</span></div>`).join('');
    const donutHtml=typeEntries.length===0
      ?'<div style="text-align:center;color:var(--gray);padding:16px">No feed logs yet</div>'
      :`<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">${donutSvg}<div style="flex:1;min-width:100px">${donutLegend}<div style="font-size:11px;color:var(--gray);margin-top:6px">Hover segments for details</div></div></div>`;
    const navBtnStyle='border:none;background:none;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;line-height:1';
    const navBtnDis='opacity:.25;cursor:default;pointer-events:none';
    tabContent=`<div style="margin:12px 16px">
      <select style="width:100%;padding:10px;border:1.5px solid #ddd;border-radius:10px;font-size:14px" onchange="FEED_RPT_BATCH=this.value;FEED_CHART_OFFSET=0;renderReports()">
        ${batchOpts}</select></div>
      <div class="kpi-row-3">
        <div class="kpi"><div class="kpi-val">${totalFeedKg.toFixed(0)}</div><div class="kpi-lbl">kg Total</div></div>
        <div class="kpi"><div class="kpi-val">${totalReqKg.toFixed(0)}</div><div class="kpi-lbl">kg Required</div></div>
        <div class="kpi"><div class="kpi-val">${bFeed.length}</div><div class="kpi-lbl">Log Days</div></div>
      </div>
      ${bFeed.length>0?`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px 4px">
        <span style="font-size:12px;font-weight:800;color:var(--g1);text-transform:uppercase;letter-spacing:.4px">Weekly Feed Usage</span>
        <div style="display:flex;align-items:center;gap:4px">
          <button style="${navBtnStyle}${!hasPrev?navBtnDis:''}" onclick="FEED_CHART_OFFSET++;renderReports()" title="Earlier">←</button>
          <span style="font-size:11px;color:var(--gray);min-width:100px;text-align:center">${wLblStart}${wLblEnd&&wLblEnd!==wLblStart?' – '+wLblEnd:''}</span>
          <button style="${navBtnStyle}${!hasNext?navBtnDis:''}" onclick="FEED_CHART_OFFSET=Math.max(0,FEED_CHART_OFFSET-1);renderReports()" title="Later">→</button>
        </div>
      </div>
      <div class="card" style="padding:16px">
        ${feedChartSvg}
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:var(--gray)">
          <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:12px;height:10px;background:#27ae60;border-radius:2px"></span>On target (≤10%)</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:12px;height:10px;background:#e67e22;border-radius:2px"></span>10–15% off</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:12px;height:10px;background:#c0392b;border-radius:2px"></span>&gt;15% off</span>
          <span style="display:flex;align-items:center;gap:5px"><svg width="22" height="10" viewBox="0 0 22 10"><line x1="0" y1="5" x2="22" y2="5" stroke="#4895ef" stroke-width="2"/><circle cx="11" cy="5" r="2.5" fill="#4895ef"/></svg>Required (weekly)</span>
        </div>
      </div>
      <div class="sec-hdr">Feed Type Distribution</div>
      <div class="card">${donutHtml}</div>`
      :'<div class="empty" style="padding:40px 24px"><p>No feed logs for this batch yet.<br>Log feed in the <b>Feed</b> tab.</p></div>'}`;

  } else if(REP_TAB==='growth'){
    const batchSelect=batches[0]?.id;
    const bWeight=weight.filter(r=>batchSelect&&r.batch_id===batchSelect).sort((a,b)=>a.week_num-b.week_num);
    const batchOpts=batches.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    tabContent=`<div style="margin:12px 16px">
      <select style="width:100%;padding:10px;border:1.5px solid #ddd;border-radius:10px;font-size:14px" onchange="GRW_BATCH=this.value;renderReports()">
        ${batchOpts}</select></div>
      <div class="card" style="padding:0;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="background:var(--p5)">
            <th style="padding:9px 12px;text-align:left">Week</th>
            <th style="padding:9px 12px;cursor:pointer;user-select:none" onclick="setGrwSort('actual')">
              Actual (g) <span style="color:${GRW_SORT.field==='actual'?'var(--p2)':'var(--gray)'}">${GRW_SORT.field==='actual'?(GRW_SORT.dir==='desc'?'↓':'↑'):'↕'}</span>
            </th>
            <th style="padding:9px 12px">Target (g)</th>
            <th style="padding:9px 12px;cursor:pointer;user-select:none" onclick="setGrwSort('pct')">
              % Target <span style="color:${GRW_SORT.field==='pct'?'var(--p2)':'var(--gray)'}">${GRW_SORT.field==='pct'?(GRW_SORT.dir==='desc'?'↓':'↑'):'↕'}</span>
            </th>
          </tr>
          ${sortGrowth(bWeight.map(w=>{const bm=getWeightBenchmark(batches.find(b=>b.id===w.batch_id)?.breed||'Isa Brown',w.week_num);return{...w,benchmark_g:bm};})).map(w=>{
            const pct=w.benchmark_g?Math.round(w.avg_weight_g/w.benchmark_g*100):null;
            return`<tr><td style="padding:9px 12px;font-weight:700">Wk ${w.week_num}</td>
              <td style="padding:9px 12px;text-align:center;font-weight:800;color:var(--p2)">${w.avg_weight_g}g</td>
              <td style="padding:9px 12px;text-align:center;color:var(--gray)">${w.benchmark_g?w.benchmark_g+'g':'—'}</td>
              <td style="padding:9px 12px;text-align:center">
                <span class="badge ${pct===null?'badge-gray':pct>=95?'badge-green':pct>=85?'badge-amber':'badge-red'}">${pct!==null?pct+'%':'—'}</span>
              </td></tr>`;}).join('')||'<tr><td colspan="4" style="padding:24px;text-align:center;color:var(--gray)">No weight records for this batch.</td></tr>'}
        </table>
      </div>`;
  }

  el.innerHTML=`<div class="topbar"><div><h1>Reports</h1><small>Batch analytics</small></div></div>
    <div class="inner-tabs">
      <button class="inner-tab ${REP_TAB==='batches'?'active':''}" onclick="REP_TAB='batches';renderReports()">Batches</button>
      <button class="inner-tab ${REP_TAB==='mortality'?'active':''}" onclick="REP_TAB='mortality';renderReports()">Mortality</button>
      <button class="inner-tab ${REP_TAB==='feed'?'active':''}" onclick="REP_TAB='feed';renderReports()">🌾 Feed</button>
      <button class="inner-tab ${REP_TAB==='growth'?'active':''}" onclick="REP_TAB='growth';renderReports()">Growth</button>
      <button class="inner-tab ${REP_TAB==='journal'?'active':''}" onclick="REP_TAB='journal';renderReports()">📓 Journal</button>
    </div>
    ${tabContent}
    <div style="height:12px"></div>`;
}
let GRW_BATCH=null;
