// Final LTC stage flow patch: Manufacturing -> OQC -> Packing + 30s anti-rapid-entry cooldown
(function(){
  const PRE_OQC_ROUTES=[
    'Plasma (PKG/PCB)','Die Attach','Epoxy Attach','Oven Cure','3D Scan','Plasma',
    'Wire Bonding','Wire Pull Test','Inspection','LID Attach','Leak Test','CSAM',
    'Impedance Measure','Laser Marking','HTRB','RF Test'
  ];
  const QUALITY_ROUTE='OQC';
  const PACKING_ROUTE='Packing';
  const COOLDOWN_MS=30000;
  const INSPECTION_LOG_KEY='wave_mes_field_inspection_logs_v1';
  let timer=null;

  function clean(v){return String(v||'').replace(/^✓\s*/,'').replace(/\s*←\s*현재$/,'').trim();}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function doneSet(l){
    const done=new Set((l?.done||[]).map(clean));
    try{(s.logs||[]).filter(x=>x.ltcId===l.id||x.draft===l.draft).forEach(x=>done.add(clean(x.process)));}catch(e){}
    try{const q=JSON.parse(localStorage.getItem(INSPECTION_LOG_KEY))||[];q.filter(x=>x.draft===l.draft).forEach(x=>done.add(clean(x.process)));}catch(e){}
    return done;
  }
  function stage(l){
    const done=doneSet(l);
    const preRemaining=PRE_OQC_ROUTES.filter(p=>!done.has(p));
    if(preRemaining.length)return {type:'work',next:preRemaining[0],routes:PRE_OQC_ROUTES,done,remaining:preRemaining};
    if(!done.has(QUALITY_ROUTE))return {type:'oqc',next:QUALITY_ROUTE,routes:[QUALITY_ROUTE],done,remaining:[QUALITY_ROUTE]};
    if(!done.has(PACKING_ROUTE))return {type:'packing',next:PACKING_ROUTE,routes:[PACKING_ROUTE],done,remaining:[PACKING_ROUTE]};
    return {type:'complete',next:'',routes:[],done,remaining:[]};
  }
  function cooldownKey(){return selected?.draft?'wave_mes_ltc_cooldown_'+selected.draft:'';}
  function cooldownLeft(){
    const k=cooldownKey();if(!k)return 0;
    const until=Number(localStorage.getItem(k)||0);
    return Math.max(0,until-Date.now());
  }
  function startCooldown(){const k=cooldownKey();if(k)localStorage.setItem(k,String(Date.now()+COOLDOWN_MS));}
  function workCard(){return document.getElementById('testForm')?.closest('.card')||null;}
  function inspectionSection(){return document.getElementById('inspectionSection');}
  function updateCooldownUI(){
    if(typeof selected==='undefined'||!selected)return;
    const ms=cooldownLeft(), sec=Math.ceil(ms/1000), st=stage(selected);
    const w=workCard(), q=inspectionSection();
    const wbtn=w?[...w.querySelectorAll('button')].find(b=>/작업 완료 등록|입력 대기/.test(b.textContent)):null;
    const qbtn=q?[...q.querySelectorAll('button')].find(b=>/검사 실적 등록|OQC 검사 완료|입력 대기/.test(b.textContent)):null;
    if(wbtn){
      if(ms>0){wbtn.disabled=true;wbtn.textContent=`입력 대기 ${sec}초`;wbtn.title='연속 공정 허위 입력 방지를 위한 30초 대기시간입니다.';}
      else if(st.type==='work'||st.type==='packing'){wbtn.disabled=false;wbtn.textContent='작업 완료 등록';wbtn.title='';}
    }
    if(qbtn){
      if(ms>0){qbtn.disabled=true;qbtn.textContent=`입력 대기 ${sec}초`;qbtn.title='연속 공정 허위 입력 방지를 위한 30초 대기시간입니다.';}
      else if(st.type==='oqc'){qbtn.disabled=false;qbtn.textContent='검사 실적 등록';qbtn.title='';}
    }
    let note=document.getElementById('ltcCooldownNotice');
    const host=(st.type==='oqc'?q:w);
    if(ms>0&&host){
      if(!note){note=document.createElement('div');note.id='ltcCooldownNotice';note.className='notice';note.style.cssText='margin:0 0 10px;background:#fff7e6;border-color:#f2d59b;color:#8a5a00';const body=st.type==='oqc'?document.getElementById('inspectionForm'):document.getElementById('testForm');body?.prepend(note);}
      note.innerHTML=`<b>연속 입력 방지 대기중</b><br>다음 실적은 ${sec}초 후 등록할 수 있습니다.`;
    }else if(note)note.remove();
  }
  function scheduleTimer(){
    if(timer)clearInterval(timer);
    timer=setInterval(()=>{try{updateCooldownUI();}catch(e){}},250);
  }

  function applyStage(){
    if(typeof selected==='undefined'||!selected)return;
    const st=stage(selected), w=workCard(), q=inspectionSection();
    if(!w||!q)return;

    if(st.type==='oqc'){
      w.style.display='none'; q.style.display='block';
      const h=q.querySelector('.head h2');if(h)h.textContent='② 품질검사 실적 입력';
      const badge=q.querySelector('.head .status');if(badge){badge.textContent='OQC 전용';badge.className='status warn';}
      const sel=document.getElementById('inspectionProcess');if(sel){sel.innerHTML='<option value="OQC">OQC</option>';sel.value='OQC';sel.disabled=false;}
    }else if(st.type==='work'||st.type==='packing'){
      w.style.display=''; q.style.display='none';
      const form=document.getElementById('testForm');
      const sel=document.getElementById('tp');
      if(sel){
        const list=st.type==='packing'?[PACKING_ROUTE]:PRE_OQC_ROUTES;
        sel.innerHTML=list.map(p=>`<option value="${esc(p)}">${st.done.has(p)?'✓ ':''}${esc(p)}</option>`).join('');
        sel.value=st.next; sel.disabled=false;
      }
      const n=form?.querySelector('.notice');
      if(n){
        if(st.type==='packing')n.innerHTML='<b>OQC 품질검사 완료</b><br>다음 공정은 Packing입니다. 포장 작업 실적을 입력해 주세요.';
        else{const completed=PRE_OQC_ROUTES.length-st.remaining.length;n.innerHTML=`<b>현재 입력 공정 자동 선택: ${esc(st.next)}</b><br>완료 ${completed}개 / 잔여 ${st.remaining.length}개 · 다음 미완료 제조 공정을 자동 선택했습니다.`;}
      }
      const pw=form?.querySelector('.processes');
      if(pw){
        const list=st.type==='packing'?[PACKING_ROUTE]:PRE_OQC_ROUTES;
        pw.innerHTML=list.map((p,i)=>`<button class="${st.done.has(p)?'done':''}" onclick="document.getElementById('tp').selectedIndex=${i}">${st.done.has(p)?'✓ ':''}${esc(p)}${p===st.next?' ← 현재':''}</button>`).join('');
      }
    }else{
      w.style.display='none';q.style.display='block';
      const h=q.querySelector('.head h2');if(h)h.textContent='② 품질검사 / 공정 완료';
      const badge=q.querySelector('.head .status');if(badge){badge.textContent='전체 완료';badge.className='status good';}
      const form=document.getElementById('inspectionForm');if(form)form.innerHTML='<div class="notice" style="background:#eefaf4;border-color:#ccebdc;color:#176b4c"><b>전체 공정 완료</b><br>OQC 및 Packing까지 완료된 LTC입니다.</div>';
    }
    updateCooldownUI();scheduleTimer();
  }

  const prevRender=window.renderTest;
  window.renderTest=function(){const r=typeof prevRender==='function'?prevRender():undefined;setTimeout(applyStage,20);return r;};

  const prevSaveTest=window.saveTest;
  window.saveTest=function(){
    if(cooldownLeft()>0)return alert('연속 입력 방지 대기시간입니다. 잠시 후 다시 입력해 주세요.');
    if(typeof selected==='undefined'||!selected)return alert('먼저 LTC를 조회해 주세요.');
    const st=stage(selected);
    if(st.type==='oqc')return alert('현재 단계는 OQC 품질검사입니다. 품질검사 실적을 입력해 주세요.');
    if(st.type==='complete')return alert('이미 모든 공정이 완료되었습니다.');
    const before=(s.logs||[]).length;
    const sel=document.getElementById('tp');if(sel&&sel.selectedIndex>=0)sel.options[sel.selectedIndex].value=clean(sel.options[sel.selectedIndex].textContent);
    const r=typeof prevSaveTest==='function'?prevSaveTest():undefined;
    const after=(s.logs||[]).length;
    if(after>before)startCooldown();
    setTimeout(()=>{try{window.renderTest();applyStage();}catch(e){}},30);
    return r;
  };

  const prevSaveInspection=window.saveInspectionResult;
  window.saveInspectionResult=function(){
    if(cooldownLeft()>0)return alert('연속 입력 방지 대기시간입니다. 잠시 후 다시 입력해 주세요.');
    if(typeof selected==='undefined'||!selected)return alert('먼저 LTC를 조회해 주세요.');
    const st=stage(selected);
    if(st.type!=='oqc')return alert(st.type==='packing'?'OQC가 완료되었습니다. 다음은 Packing 작업입니다.':'현재 단계는 제조 공정입니다. 작업 실적을 먼저 입력해 주세요.');
    let before=0;try{before=(JSON.parse(localStorage.getItem(INSPECTION_LOG_KEY))||[]).length;}catch(e){}
    const sel=document.getElementById('inspectionProcess');if(sel)sel.value='OQC';
    const r=typeof prevSaveInspection==='function'?prevSaveInspection():undefined;
    let after=before;try{after=(JSON.parse(localStorage.getItem(INSPECTION_LOG_KEY))||[]).length;}catch(e){}
    if(after>before)startCooldown();
    setTimeout(()=>{try{window.renderTest();applyStage();}catch(e){}},40);
    return r;
  };

  setTimeout(()=>{applyStage();scheduleTimer();},50);
})();