// Process classification patch v4: OQC only = Quality inspection. Everything else = manufacturing process/inspection.
(function(){
  const MANUFACTURING_ROUTES=[
    'Plasma (PKG/PCB)','Die Attach','Epoxy Attach','Oven Cure','3D Scan','Plasma',
    'Wire Bonding','Wire Pull Test','Inspection','LID Attach','Leak Test','CSAM',
    'Impedance Measure','Laser Marking','HTRB','RF Test','Packing'
  ];
  const QUALITY_ROUTE='OQC';

  function cleanProcess(v){
    return String(v||'').replace(/^✓\s*/,'').replace(/\s*←\s*현재$/,'').trim();
  }
  function completedSet(l){
    const done=new Set((l?.done||[]).map(cleanProcess));
    try{
      (s.logs||[]).filter(x=>x.ltcId===l.id||x.draft===l.draft)
        .forEach(x=>done.add(cleanProcess(x.process)));
    }catch(e){}
    try{
      const qlogs=JSON.parse(localStorage.getItem('wave_mes_field_inspection_logs_v1'))||[];
      qlogs.filter(x=>x.draft===l.draft).forEach(x=>done.add(cleanProcess(x.process)));
    }catch(e){}
    return done;
  }
  function stateFor(l){
    const done=completedSet(l);
    const remaining=MANUFACTURING_ROUTES.filter(p=>!done.has(p));
    return {done,remaining,next:remaining[0]||'',mfgComplete:remaining.length===0,oqcDone:done.has(QUALITY_ROUTE)};
  }

  function tuneWorkArea(){
    if(typeof selected==='undefined'||!selected)return;
    const st=stateFor(selected);
    const sel=document.getElementById('tp');
    const testForm=document.getElementById('testForm');
    if(!testForm)return;

    if(sel){
      sel.innerHTML=MANUFACTURING_ROUTES.map(p=>`<option value="${p}">${st.done.has(p)?'✓ ':''}${p}</option>`).join('');
      if(st.next){
        sel.disabled=false;
        sel.value=st.next; // 항상 다음 미완료 공정을 자동 선택
      }else{
        sel.disabled=true;
        sel.selectedIndex=-1;
      }
    }

    const notice=testForm.querySelector('.notice');
    if(notice){
      const completed=MANUFACTURING_ROUTES.length-st.remaining.length;
      if(st.next){
        notice.innerHTML=`<b>현재 입력 공정 자동 선택: ${st.next}</b><br>완료 ${completed}개 / 잔여 ${st.remaining.length}개 · 다음 미완료 제조 공정을 자동으로 선택했습니다.`;
      }else{
        notice.innerHTML='<b>제조 공정 완료</b><br>모든 제조 공정 / 제조 검사가 완료되었습니다. 다음 단계는 OQC 품질검사입니다.';
      }
    }

    const processWrap=testForm.querySelector('.processes');
    if(processWrap){
      processWrap.innerHTML=MANUFACTURING_ROUTES.map((p,i)=>`<button class="${st.done.has(p)?'done':''}" ${st.mfgComplete?'disabled':''} onclick="document.getElementById('tp').selectedIndex=${i}">${st.done.has(p)?'✓ ':''}${p}${p===st.next?' ← 현재':''}</button>`).join('');
    }

    const completeBtn=[...testForm.querySelectorAll('button')].find(b=>/작업 완료 등록/.test(b.textContent));
    if(completeBtn){
      completeBtn.disabled=st.mfgComplete;
      completeBtn.title=st.mfgComplete?'제조 공정이 모두 완료되었습니다. OQC 품질검사를 진행하십시오.':'';
    }
  }

  function tuneInspectionArea(){
    if(typeof selected==='undefined'||!selected)return;
    const st=stateFor(selected);
    const section=document.getElementById('inspectionSection');
    if(!section)return;

    section.style.display=st.mfgComplete?'block':'none';
    if(!st.mfgComplete)return;

    const sel=document.getElementById('inspectionProcess');
    if(sel){sel.innerHTML='<option value="OQC">OQC</option>';sel.value='OQC';sel.disabled=st.oqcDone;}
    const head=section.querySelector('.head h2');if(head)head.textContent='③ 품질검사 실적 입력';
    const badge=section.querySelector('.head .status');
    if(badge){badge.textContent=st.oqcDone?'OQC 완료':'OQC 전용';badge.className='status '+(st.oqcDone?'good':'warn');}
    const labels=[...section.querySelectorAll('label')];
    const pl=labels.find(x=>/검사 항목|품질검사 항목/.test(x.textContent));if(pl)pl.textContent='품질검사 항목';
    const saveBtn=[...section.querySelectorAll('button')].find(b=>/검사 실적 등록|OQC 검사 완료/.test(b.textContent));
    if(saveBtn){saveBtn.disabled=st.oqcDone;saveBtn.textContent=st.oqcDone?'OQC 검사 완료':'검사 실적 등록';}
  }

  function apply(){tuneWorkArea();tuneInspectionArea();}

  const prevRender=window.renderTest;
  window.renderTest=function(){
    const r=typeof prevRender==='function'?prevRender():undefined;
    setTimeout(apply,0);
    return r;
  };

  // 작업실적 등록 후 반드시 다음 미완료 제조공정을 다시 계산한다.
  const prevSaveTest=window.saveTest;
  window.saveTest=function(){
    const sel=document.getElementById('tp');
    if(sel&&sel.selectedIndex>=0){sel.options[sel.selectedIndex].value=cleanProcess(sel.options[sel.selectedIndex].textContent);}
    const r=typeof prevSaveTest==='function'?prevSaveTest():undefined;
    setTimeout(()=>{try{if(typeof window.renderTest==='function')window.renderTest();else apply();}catch(e){}},0);
    return r;
  };

  const prevSaveInspection=window.saveInspectionResult;
  window.saveInspectionResult=function(){
    if(typeof selected==='undefined'||!selected)return alert('먼저 LTC를 조회해 주세요.');
    const st=stateFor(selected);
    if(!st.mfgComplete)return alert('제조 공정이 완료되지 않았습니다. OQC는 제조 완료 후 입력할 수 있습니다.');
    if(st.oqcDone)return alert('이미 OQC 실적이 등록된 PO입니다.');
    const sel=document.getElementById('inspectionProcess');if(sel)sel.value=QUALITY_ROUTE;
    const r=typeof prevSaveInspection==='function'?prevSaveInspection():undefined;
    setTimeout(apply,0);
    return r;
  };

  setTimeout(apply,0);
})();