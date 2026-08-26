// Process classification patch: OQC = quality inspection only, all other routes = manufacturing process/inspection
(function(){
  const QUALITY_PROCESSES=['OQC'];

  function completedSet(l){
    const done=new Set(l?.done||[]);
    try{(s.logs||[]).filter(x=>x.ltcId===l.id||x.draft===l.draft).forEach(x=>done.add(String(x.process||'').replace(/^✓\s*/,'')));}catch(e){}
    try{
      const qlogs=JSON.parse(localStorage.getItem('wave_mes_field_inspection_logs_v1'))||[];
      qlogs.filter(x=>x.draft===l.draft).forEach(x=>done.add(String(x.process||'')));
    }catch(e){}
    return done;
  }

  function manufacturingRoutes(){
    const all=Array.isArray(window.routes)?window.routes:[];
    return all.filter(p=>!QUALITY_PROCESSES.includes(p));
  }

  function tuneWorkArea(){
    if(typeof selected==='undefined'||!selected)return;
    const manufacturing=manufacturingRoutes();
    const done=completedSet(selected);
    const remaining=manufacturing.filter(p=>!done.has(p));
    const next=remaining[0]||'';

    const sel=document.getElementById('tp');
    if(sel){
      const current=String(sel.value||'').replace(/^✓\s*/,'').replace(/\s*←\s*현재$/,'').trim();
      sel.innerHTML=manufacturing.map(p=>`<option value="${p}">${done.has(p)?'✓ ':''}${p}</option>`).join('');
      if(next){
        sel.disabled=false;
        sel.value=(manufacturing.includes(current)&&!done.has(current))?current:next;
      }else{
        sel.disabled=true;
        sel.selectedIndex=-1;
      }
    }

    const testForm=document.getElementById('testForm');
    if(testForm){
      const notice=testForm.querySelector('.notice');
      if(notice){
        const completed=manufacturing.filter(p=>done.has(p)).length;
        if(next){
          notice.innerHTML=`<b>현재 입력 공정 자동 선택: ${next}</b><br>완료 ${completed}개 / 잔여 ${remaining.length}개 · OQC는 제조공정 완료 후 품질검사 실적에서 입력합니다.`;
        }else{
          notice.innerHTML='<b>제조 공정 완료</b><br>모든 제조 공정 / 제조 검사가 완료되었습니다. 다음 단계는 OQC 품질검사입니다.';
        }
      }
      const processWrap=testForm.querySelector('.processes');
      if(processWrap){
        processWrap.innerHTML=manufacturing.map((p,i)=>`<button class="${done.has(p)?'done':''}" ${next?'':'disabled'} onclick="document.getElementById('tp').selectedIndex=${i}">${done.has(p)?'✓ ':''}${p}${p===next?' ← 현재':''}</button>`).join('');
      }
      const completeBtn=[...testForm.querySelectorAll('button')].find(b=>/작업 완료 등록/.test(b.textContent));
      if(completeBtn){
        completeBtn.disabled=!next;
        completeBtn.title=!next?'제조 공정이 모두 완료되었습니다. OQC 품질검사를 진행하십시오.':'';
      }
    }
  }

  function tuneInspectionArea(){
    if(typeof selected==='undefined'||!selected)return;
    const manufacturing=manufacturingRoutes();
    const done=completedSet(selected);
    const mfgComplete=manufacturing.length>0 && manufacturing.every(p=>done.has(p));
    const oqcDone=done.has('OQC');
    const section=document.getElementById('inspectionSection');
    if(!section)return;

    // 핵심: OQC는 모든 PO에 상시 노출하지 않는다. 제조 완료 PO에서만 활성화한다.
    section.style.display=mfgComplete?'block':'none';
    if(!mfgComplete)return;

    const sel=document.getElementById('inspectionProcess');
    if(sel){sel.innerHTML='<option value="OQC">OQC</option>';sel.value='OQC';sel.disabled=oqcDone;}
    const head=section.querySelector('.head h2'); if(head)head.textContent='③ 품질검사 실적 입력';
    const badge=section.querySelector('.head .status');
    if(badge){badge.textContent=oqcDone?'OQC 완료':'OQC 전용';badge.className='status '+(oqcDone?'good':'warn');}
    const label=section.querySelector('label'); if(label&&/검사 항목|품질검사 항목/.test(label.textContent))label.textContent='품질검사 항목';
    const saveBtn=[...section.querySelectorAll('button')].find(b=>/검사 실적 등록/.test(b.textContent));
    if(saveBtn){saveBtn.disabled=oqcDone;saveBtn.textContent=oqcDone?'OQC 검사 완료':'검사 실적 등록';}
    if(oqcDone){
      const form=section.querySelector('#inspectionForm');
      const old=form?.querySelector('.oqc-complete-note');
      if(!old&&form){const n=document.createElement('div');n.className='notice oqc-complete-note';n.style.marginBottom='10px';n.innerHTML='<b>OQC 완료</b><br>이 PO는 품질검사 실적이 이미 등록되어 있습니다.';form.prepend(n);}
    }
  }

  function apply(){tuneWorkArea();tuneInspectionArea();}

  const prevRender=window.renderTest;
  window.renderTest=function(){
    const r=typeof prevRender==='function'?prevRender():undefined;
    setTimeout(apply,0);
    return r;
  };

  const prevSaveInspection=window.saveInspectionResult;
  window.saveInspectionResult=function(){
    if(typeof selected==='undefined'||!selected)return alert('먼저 LTC를 조회해 주세요.');
    const manufacturing=manufacturingRoutes();
    const done=completedSet(selected);
    if(!manufacturing.every(p=>done.has(p)))return alert('제조 공정이 완료되지 않았습니다. OQC는 제조 완료 후 입력할 수 있습니다.');
    if(done.has('OQC'))return alert('이미 OQC 실적이 등록된 PO입니다.');
    const sel=document.getElementById('inspectionProcess');if(sel)sel.value='OQC';
    const r=typeof prevSaveInspection==='function'?prevSaveInspection():undefined;
    setTimeout(apply,0);
    return r;
  };

  setTimeout(apply,0);
})();