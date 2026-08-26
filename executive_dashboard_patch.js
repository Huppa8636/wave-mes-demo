// WAVEPIA MES executive / shop-floor integrated dashboard
// Rebuilds the main dashboard into a dense live LOT board for at-a-glance monitoring.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function activeHold(draft){try{return (s.nc||[]).find(n=>n.draft===draft&&n.holdManaged===true&&n.status==='HOLD')||null}catch(e){return null}}
  function doneSet(l){
    const d=new Set(l?.done||[]);
    try{(s.logs||[]).filter(x=>x.ltcId===l.id||x.draft===l.draft).forEach(x=>{if(x.status!=='취소'&&x.status!=='무효')d.add(x.process)})}catch(e){}
    try{const q=JSON.parse(localStorage.getItem('wave_mes_field_inspection_logs_v1')||'[]');(q||[]).filter(x=>x.draft===l.draft&&x.status!=='취소'&&x.status!=='무효').forEach(x=>d.add(x.process||'OQC'))}catch(e){}
    return d;
  }
  function nextProcess(l){const d=doneSet(l);return (routes||[]).find(p=>!d.has(p))||'전체 완료'}
  function pct(l){const total=(routes||[]).length||1;return Math.min(100,Math.round(doneSet(l).size/total*100))}
  function requestFor(l){try{return (s.requests||[]).find(r=>r.draft===l.draft)||{}}catch(e){return{}}}
  function days(due){if(!due)return null;const a=new Date();a.setHours(0,0,0,0);const b=new Date(due+'T00:00:00');if(Number.isNaN(b.getTime()))return null;return Math.ceil((b-a)/86400000)}
  function dueText(n){if(n==null)return '-';if(n<0)return `D+${Math.abs(n)}`;if(n===0)return 'D-DAY';return `D-${n}`}
  function dueClass(n){if(n==null)return 'neutral';if(n<0||n<=2)return 'danger';if(n<=7)return 'warn';return 'ok'}
  function stageClass(l){const hold=activeHold(l.draft),p=nextProcess(l),per=pct(l);if(hold)return 'hold';if(per>=100)return 'complete';if(p==='OQC')return 'quality';if(p==='Packing')return 'packing';return 'run'}
  function stageText(l){const hold=activeHold(l.draft),p=nextProcess(l);if(hold)return `HOLD · ${hold.process||p}`;if(pct(l)>=100)return '완료';if(p==='OQC')return 'OQC 대기';if(p==='Packing')return '포장 대기';return p}
  function currentQty(l){try{const logs=(s.logs||[]).filter(x=>x.draft===l.draft&&x.status!=='취소'&&x.status!=='무효');if(logs.length)return Number(logs[0].good)||Number(l.qty)||0}catch(e){}return Number(l.qty)||0}
  function focus(draft){try{if(typeof focusLtc==='function')focusLtc(draft)}catch(e){}}
  window.waveDashFocus=focus;

  function injectStyle(){if(document.getElementById('execDashStyle'))return;const st=document.createElement('style');st.id='execDashStyle';st.textContent=`
    #dash{--dblue:#0878bd;--dcyan:#1aa6d9;--dgreen:#0b8f61;--dred:#c43845;--dorange:#bd7700;--dpurple:#7252b8}
    .ed-kpis{display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:10px;margin-bottom:12px}.ed-kpi{background:#fff;border:1px solid #d8e7ef;border-radius:12px;padding:12px 14px;box-shadow:0 2px 9px #16394d0b}.ed-kpi .n{font-size:25px;font-weight:900;line-height:1.05;color:#173b50}.ed-kpi .l{font-size:9px;color:#718894;margin-top:5px;font-weight:700}.ed-kpi.alert .n{color:var(--dred)}.ed-kpi.quality .n{color:var(--dpurple)}.ed-kpi.good .n{color:var(--dgreen)}
    .ed-board{background:#fff;border:1px solid #d8e7ef;border-radius:13px;overflow:hidden;margin-bottom:12px;box-shadow:0 3px 12px #16394d0c}.ed-board-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e4edf2}.ed-board-head h2{font-size:14px;margin:0}.ed-legend{display:flex;gap:6px;align-items:center;font-size:8px;color:#718894}.ed-dot{width:7px;height:7px;border-radius:50%;display:inline-block}.ed-dot.run{background:var(--dblue)}.ed-dot.hold{background:var(--dred)}.ed-dot.quality{background:var(--dpurple)}.ed-dot.complete{background:var(--dgreen)}
    .ed-row{display:grid;grid-template-columns:32px minmax(170px,1.35fr) minmax(150px,.9fr) minmax(145px,1fr) minmax(180px,1.35fr) 82px 92px;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid #edf2f5;cursor:pointer;transition:.12s}.ed-row:last-child{border-bottom:0}.ed-row:hover{background:#f7fbfd}.ed-row.is-hold{background:#fff5f5;border-left:5px solid var(--dred);padding-left:9px}.ed-row.is-quality{background:#faf8ff}.ed-row.is-complete{opacity:.8}.ed-state{width:25px;height:25px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#fff;background:var(--dblue)}.ed-state.hold{background:var(--dred);animation:edPulse 1.2s infinite}.ed-state.quality{background:var(--dpurple)}.ed-state.packing{background:var(--dorange)}.ed-state.complete{background:var(--dgreen)}@keyframes edPulse{50%{box-shadow:0 0 0 5px #c4384520}}
    .ed-id{font-size:11px;font-weight:900;color:#0878bd}.ed-sub{font-size:8px;color:#748995;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ed-process{font-size:11px;font-weight:900;color:#173b50}.ed-process.hold{color:var(--dred)}.ed-process.quality{color:var(--dpurple)}.ed-process.packing{color:var(--dorange)}.ed-process.complete{color:var(--dgreen)}
    .ed-progress-line{display:flex;align-items:center;gap:8px}.ed-progressbar{height:9px;background:#eaf0f3;border-radius:20px;overflow:hidden;flex:1}.ed-progressbar i{display:block;height:100%;background:linear-gradient(90deg,#1aa6d9,#0878bd)}.ed-progress-num{min-width:36px;text-align:right;font-size:9px;font-weight:900}.ed-steptext{font-size:8px;color:#7b8c96;margin-top:4px}.ed-due{font-size:10px;font-weight:900;text-align:center;padding:5px 6px;border-radius:10px;background:#f0f3f5;color:#71808a}.ed-due.danger{background:#ffe7e9;color:#b82331}.ed-due.warn{background:#fff1d4;color:#966000}.ed-due.ok{background:#e5f7ef;color:#087c51}.ed-badge{font-size:9px;font-weight:900;text-align:center;padding:5px 7px;border-radius:10px;background:#e9f5fb;color:#0878bd}.ed-badge.hold{background:#ffe4e7;color:#ba2030}.ed-badge.quality{background:#eee8fb;color:#6945ac}.ed-badge.packing{background:#fff0d5;color:#9a6100}.ed-badge.complete{background:#e4f7ee;color:#087c51}
    .ed-exceptions{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:12px}.ed-panel{background:#fff;border:1px solid #d8e7ef;border-radius:12px;padding:13px;min-height:120px}.ed-panel h3{margin:0 0 9px;font-size:11px}.ed-item{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid #edf2f5;font-size:9px}.ed-item:last-child{border-bottom:0}.ed-item b{font-size:9px}.ed-empty{font-size:9px;color:#80919a;padding:12px 0}.ed-hold-item{background:#fff2f3;border:1px solid #ffd3d7;border-radius:8px;padding:8px;margin:6px 0}.ed-hold-item b{color:#b82331}.ed-hold-item .reason{font-size:8px;color:#7d5358;margin-top:3px}
    @media(max-width:1200px){.ed-row{grid-template-columns:28px 1.3fr 1fr 1fr 1.2fr 72px}.ed-row>.ed-badge{display:none}.ed-exceptions{grid-template-columns:1fr 1fr}.ed-kpis{grid-template-columns:repeat(3,1fr)}}@media(max-width:800px){.ed-kpis{grid-template-columns:1fr 1fr}.ed-row{grid-template-columns:25px 1.4fr 1fr 72px}.ed-row>.ed-product,.ed-row>.ed-progress{display:none}.ed-exceptions{grid-template-columns:1fr}}
  `;document.head.appendChild(st)}

  function buildDash(){
    const dash=document.getElementById('dash');if(!dash||dash.dataset.execBuilt==='1')return;
    dash.dataset.execBuilt='1';
    dash.innerHTML=`<div class="ed-kpis" id="edKpis"></div>
      <div class="ed-board"><div class="ed-board-head"><h2>실시간 LOT 진행현황</h2><div class="ed-legend"><span class="ed-dot run"></span>진행 <span class="ed-dot quality"></span>OQC <span class="ed-dot hold"></span>HOLD <span class="ed-dot complete"></span>완료</div></div><div id="edLotRows"></div></div>
      <div class="ed-exceptions"><div class="ed-panel"><h3>⚠ 즉시 확인 / HOLD</h3><div id="edHold"></div></div><div class="ed-panel"><h3>⏱ 납기 위험</h3><div id="edDue"></div></div><div class="ed-panel"><h3>◎ OQC / 포장 대기</h3><div id="edQueue"></div></div></div>`;
  }

  function sortLots(a,b){
    const ah=!!activeHold(a.draft),bh=!!activeHold(b.draft);if(ah!==bh)return ah?-1:1;
    const ar=requestFor(a),br=requestFor(b),ad=days(ar.due),bd=days(br.due);const av=ad==null?9999:ad,bv=bd==null?9999:bd;if(av!==bv)return av-bv;
    return pct(a)-pct(b);
  }
  function render(){
    buildDash();
    const lots=(s.ltcs||[]).slice().sort(sortLots);const active=lots.filter(l=>pct(l)<100),holds=lots.filter(l=>activeHold(l.draft));const oqc=active.filter(l=>nextProcess(l)==='OQC'),packing=active.filter(l=>nextProcess(l)==='Packing');const dueRisk=active.filter(l=>{const d=days(requestFor(l).due);return d!=null&&d<=7});const completed=lots.filter(l=>pct(l)>=100);
    const k=document.getElementById('edKpis');if(k)k.innerHTML=`<div class="ed-kpi"><div class="n">${active.length}</div><div class="l">진행 LOT</div></div><div class="ed-kpi alert"><div class="n">${holds.length}</div><div class="l">HOLD / 입력차단</div></div><div class="ed-kpi quality"><div class="n">${oqc.length}</div><div class="l">OQC 대기</div></div><div class="ed-kpi"><div class="n">${dueRisk.length}</div><div class="l">7일 이내 납기 위험</div></div><div class="ed-kpi good"><div class="n">${completed.length}</div><div class="l">완료 LOT</div></div>`;

    const rows=document.getElementById('edLotRows');if(rows)rows.innerHTML=lots.length?lots.map(l=>{
      const r=requestFor(l),hold=activeHold(l.draft),p=pct(l),done=doneSet(l),next=nextProcess(l),sc=stageClass(l),d=days(r.due),qty=currentQty(l),status=stageText(l);const idx=(routes||[]).indexOf(next);const step=p>=100?(routes||[]).length:Math.max(1,idx+1);
      return `<div class="ed-row ${hold?'is-hold':''} ${sc==='quality'?'is-quality':''} ${sc==='complete'?'is-complete':''}" onclick="waveDashFocus('${esc(l.draft)}')"><div class="ed-state ${sc}">${hold?'!':sc==='complete'?'✓':step}</div><div><div class="ed-id">${esc(l.draft)}</div><div class="ed-sub">${esc(l.no||'-')} / ${esc(l.cust||r.cust||'-')}</div></div><div class="ed-product"><div style="font-size:10px;font-weight:800">${esc(l.prod||r.prod||'-')}</div><div class="ed-sub">현재 ${qty}ea / 최초 ${Number(l.qty)||0}ea</div></div><div><div class="ed-process ${sc}">${esc(status)}</div><div class="ed-sub">${hold?'공정 정지 / 품질 조치 필요':p>=100?'전체 공정 완료':`다음 작업 위치`}</div></div><div class="ed-progress"><div class="ed-progress-line"><div class="ed-progressbar"><i style="width:${p}%"></i></div><div class="ed-progress-num">${p}%</div></div><div class="ed-steptext">${done.size}/${(routes||[]).length} 공정 완료</div></div><div class="ed-due ${dueClass(d)}">${dueText(d)}</div><div class="ed-badge ${sc}">${hold?'HOLD':sc==='quality'?'OQC':sc==='packing'?'PACK':sc==='complete'?'완료':'진행중'}</div></div>`
    }).join(''):'<div class="ed-empty" style="padding:20px">등록된 LOT가 없습니다.</div>';

    const hb=document.getElementById('edHold');if(hb)hb.innerHTML=holds.length?holds.map(l=>{const h=activeHold(l.draft);return `<div class="ed-hold-item" onclick="waveDashFocus('${esc(l.draft)}')" style="cursor:pointer"><b>${esc(l.draft)} / ${esc(l.prod)}</b><div class="reason">${esc(h.process||'-')} / ${esc(h.reason||'사유 미입력')}</div></div>`}).join(''):'<div class="ed-empty">현재 HOLD LOT가 없습니다.</div>';
    const db=document.getElementById('edDue');if(db){const a=active.map(l=>({l,d:days(requestFor(l).due),r:requestFor(l)})).filter(x=>x.d!=null&&x.d<=7).sort((a,b)=>a.d-b.d).slice(0,6);db.innerHTML=a.length?a.map(x=>`<div class="ed-item" onclick="waveDashFocus('${esc(x.l.draft)}')" style="cursor:pointer"><div><b>${esc(x.l.draft)}</b><div class="ed-sub">${esc(x.l.prod)}</div></div><span class="ed-due ${dueClass(x.d)}">${dueText(x.d)}</span></div>`).join(''):'<div class="ed-empty">7일 이내 납기 위험 LOT가 없습니다.</div>'}
    const qb=document.getElementById('edQueue');if(qb){const q=active.filter(l=>['OQC','Packing'].includes(nextProcess(l))).slice(0,8);qb.innerHTML=q.length?q.map(l=>`<div class="ed-item" onclick="waveDashFocus('${esc(l.draft)}')" style="cursor:pointer"><div><b>${esc(l.draft)}</b><div class="ed-sub">${esc(l.prod)}</div></div><span class="ed-badge ${nextProcess(l)==='OQC'?'quality':'packing'}">${nextProcess(l)==='OQC'?'OQC':'포장'}</span></div>`).join(''):'<div class="ed-empty">대기 LOT가 없습니다.</div>'}
  }
  window.renderExecutiveDashboard=render;
  injectStyle();buildDash();
  const oldRenderAll=window.renderAll;if(typeof oldRenderAll==='function')window.renderAll=function(){const x=oldRenderAll.apply(this,arguments);setTimeout(render,0);return x};
  document.addEventListener('click',e=>{if(e.target.closest?.('#nav [data-v="dash"]'))setTimeout(render,20)});
  setInterval(()=>{const d=document.getElementById('dash');if(d&&d.classList.contains('active'))render()},5000);
  setTimeout(render,250);
})();
