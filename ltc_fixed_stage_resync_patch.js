// Resync fixed-route UI and save target from actual LTC/log state.
// v2: event-driven only. Do NOT poll/rewrite the form every second because it causes visible flicker and duplicated notices.
(function(){
  const FIXED=['Plasma (PKG/PCB)','Die Attach','Epoxy Attach','Oven Cure','3D Scan','Plasma','Wire Bonding','Wire Pull Test','Inspection'];
  function clean(v){return String(v||'').replace(/^✓\s*/,'').replace(/\s*←\s*(현재|기본)$/,'').trim();}
  function done(l){
    const d=new Set((l?.done||[]).map(clean));
    try{(s.logs||[]).filter(x=>x.ltcId===l.id||x.draft===l.draft).forEach(x=>{if(x.status!=='취소'&&x.status!=='무효')d.add(clean(x.process));});}catch(e){}
    return d;
  }
  function nextFixed(l){const d=done(l);return FIXED.find(p=>!d.has(p))||'';}
  function sync(){
    if(typeof selected==='undefined'||!selected)return;
    const next=nextFixed(selected); if(!next)return;
    const sel=document.getElementById('tp'); if(sel){
      if(sel.options.length!==1||clean(sel.options[0]?.textContent)!==next){sel.innerHTML=`<option value="${next}">${next}</option>`;}
      sel.value=next; sel.disabled=true;
    }
    const form=document.getElementById('testForm');
    const notices=form?[...form.querySelectorAll('.notice')]:[];
    // Only update the main process notice. Never create a second notice.
    const notice=notices.find(n=>/고정공정|현재 입력 공정 자동 선택|제조공정 선택 가능 구간|OQC 품질검사 완료/.test(n.textContent||''))||notices[0];
    if(notice){const d=done(selected);notice.innerHTML=`<b>고정공정 자동 선택: ${next}</b><br>고정공정 ${FIXED.filter(p=>d.has(p)).length}/${FIXED.length} 완료 · 완료 등록 후 다음 공정으로 자동 전환됩니다.`;}
    const pw=form?.querySelector('.processes');
    if(pw){const d=done(selected);pw.innerHTML=FIXED.map(p=>`<button class="${d.has(p)?'done':''}" disabled>${d.has(p)?'✓ ':''}${p}${p===next?' ← 현재':''}</button>`).join('');}
  }
  const oldRender=window.renderTest;
  window.renderTest=function(){const r=typeof oldRender==='function'?oldRender.apply(this,arguments):undefined;setTimeout(sync,60);return r;};

  const oldSave=window.saveTest;
  window.saveTest=function(){
    if(typeof selected!=='undefined'&&selected){
      const next=nextFixed(selected),sel=document.getElementById('tp');
      if(next&&sel){sel.innerHTML=`<option value="${next}">${next}</option>`;sel.value=next;sel.disabled=true;}
    }
    const before=(s.logs||[]).length;
    const r=typeof oldSave==='function'?oldSave.apply(this,arguments):undefined;
    setTimeout(()=>{
      if((s.logs||[]).length>before){try{window.renderTest();}catch(e){sync();}}
      else sync();
    },80);
    return r;
  };

  // Sync only on meaningful user/navigation events. No timer polling.
  const oldLookup=window.lookup;
  if(typeof oldLookup==='function'){
    window.lookup=function(){const r=oldLookup.apply(this,arguments);setTimeout(sync,100);return r;};
  }
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#nav [data-v="test"]'))setTimeout(sync,120);
  });
  setTimeout(sync,300);
})();
