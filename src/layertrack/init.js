// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
initApp();

function showTrendTip(evt, pt) {
  const cr=Math.floor(pt.eggs/30),lp=pt.eggs%30;
  const eggStr=cr>0
    ?cr+' crate'+(cr>1?'s':'')+(lp>0?` <span style="font-size:10px;color:#999">${lp} pcs</span>`:'')
    :lp+' pcs';
  const col=pt.hdp>=80?'#27ae60':pt.hdp>=70?'#e67e22':'#c0392b';
  document.getElementById('trendTip').innerHTML=
    `<div style="font-weight:700;font-size:12px;margin-bottom:5px;color:#333">${pt.label}</div>`+
    `<div style="font-size:11px;margin-bottom:2px">Avg HDP: <b style="color:${col}">${pt.hdp.toFixed(1)}%</b></div>`+
    `<div style="font-size:11px">Eggs: <b>${eggStr}</b></div>`;
  document.getElementById('trendTip').style.display='block';
  positionTrendTip(evt);
}
function positionTrendTip(evt) {
  const tip=document.getElementById('trendTip');
  if(tip.style.display==='none')return;
  const x=evt.clientX+16,y=evt.clientY-14;
  const tw=tip.offsetWidth||160,th=tip.offsetHeight||70;
  tip.style.left=Math.min(x,window.innerWidth-tw-8)+'px';
  tip.style.top=Math.max(y-th,8)+'px';
}
function hideTrendTip(){document.getElementById('trendTip').style.display='none';}
