// Process classification patch: OQC = quality inspection, all others = manufacturing process/inspection
(function(){
  const QUALITY_PROCESSES=['OQC'];

  function completedSet(l){
    const done=new Set(l?.done||[]);
    try{(s.logs||[]).filter(x=>x.ltcId===l.id||x.draft===l.draft).forEach(x=>done.add(String(x.process||'').replace(/^✓\s*/,'')));}catch(e){}
    return done;
  }

  function tuneWorkArea(){
    if(typeof selected==='undefined'||!selected)return;
    const all=Array.isArray(window.routes)?window.routes:[];
    const manufacturing=all.filter(p=>!QUALITY_PROCESSES.includes(p));
    const done=completedSet(selected);
    const next=manufacturing.find(p=>!done.has(p))||manufacturing[manufacturing.length-1]||'';

    const sel=document.getElementById('tp');
    if(sel){
      const current=String(sel.value||'').replace(/^✓\s*/,'').trim();
      sel.innerHTML=manufacturing.map(p=>`<option value="${p}">${done.has(p)?'✓ ':''}${p}</option>`).join('');
      const target=manufacturing.includes(current)&&current!=='OQC'?current:next;
      sel.value=target;
    }

    const testForm=document.getElementById('testForm');
    if(testForm){
      const notice=testForm.querySelector('.notice');
      if(notice){
        const completed=manufacturing.filter(p=>done.has(p)).length;
        const remaining=manufacturing.length-completed;
        notice.innerHTML=`<b>현재 입력 공정 자동 선택: ${next}</b><br>완료 ${completed}개 / 잔여 ${remaining}개 · OQC는 품질검사 실적에서 별도 입력합니다.`;
      }
      const processWrap=testForm.querySelector('.processes');
      if(processWrap){
        processWrap.innerHTML=manufacturing.map((p,i)=>`<button class="${done.has(p)?'done':''}" onclick="document.getElementById('tp').selectedIndex=${i}">${done.has(p)?'✓ ':''}${p}${p===next?' ← 현재':''}</button>`).join('');
      }
    }
  }

  function tuneInspectionArea(){
    const sel=document.getElementById('inspectionProcess');
    if(sel){
      sel.innerHTML='<option value="OQC">OQC</option>';
      sel.value='OQC';
    }
    const section=document.getElementById('inspectionSection');
    if(section){
      const head=section.querySelector('.head h2'); if(head)head.textContent='③ 품질검사 실적 입력';
      const badge=section.querySelector('.head .status'); if(badge)badge.textContent='OQC 전용';
      const label=section.querySelector('label'); if(label&&/검사 항목/.test(label.textContent))label.textContent='품질검사 항목';
    }
  }

  function apply(){tuneWorkArea();tuneInspectionArea();}

  const prevRender=window.renderTest;
  window.renderTest=function(){
    const r=typeof prevRender==='function'?prevRender():undefined;
    setTimeout(apply,0);
    return r;
  };

  // 검사 실적 등록 직전에도 OQC 강제
  const prevSaveInspection=window.saveInspectionResult;
  window.saveInspectionResult=function(){
    const sel=document.getElementById('inspectionProcess'); if(sel)sel.value='OQC';
    return typeof prevSaveInspection==='function'?prevSaveInspection():undefined;
  };

  setTimeout(apply,0);
})();