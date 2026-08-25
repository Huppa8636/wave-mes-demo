// Field LTC UX patch: auto-load next process + worker management
(function(){
  const WORKER_KEY='wave_mes_field_workers_v1';
  const DEFAULT_WORKERS=['DEMO 작업자 A','DEMO 작업자 B','DEMO 작업자'];

  function loadWorkers(){
    try{
      const x=JSON.parse(localStorage.getItem(WORKER_KEY));
      if(Array.isArray(x)&&x.length)return [...new Set(x.map(v=>String(v).trim()).filter(Boolean))];
    }catch(e){}
    localStorage.setItem(WORKER_KEY,JSON.stringify(DEFAULT_WORKERS));
    return [...DEFAULT_WORKERS];
  }
  function saveWorkers(a){localStorage.setItem(WORKER_KEY,JSON.stringify([...new Set(a.map(v=>String(v).trim()).filter(Boolean))]));}
  function esc2(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  function ensureWorkerUI(){
    const test=document.getElementById('test'); if(!test)return;
    const firstCard=test.querySelector('.card'); if(!firstCard)return;
    const head=firstCard.querySelector('.head'); if(!head||document.getElementById('workerManageBtn'))return;
    const btn=document.createElement('button');
    btn.id='workerManageBtn'; btn.className='btn secondary'; btn.textContent='작업자 관리';
    btn.onclick=toggleWorkerPanel;
    head.appendChild(btn);

    const panel=document.createElement('div');
    panel.id='workerManagePanel'; panel.style.display='none';
    panel.innerHTML=`<div class="card" style="box-shadow:none;margin-top:10px;background:#f8fafc">
      <div class="head"><h2>작업자 관리</h2><span class="status">현장 LTC TEST 전용</span></div>
      <div class="toolbar"><input id="newWorkerName" class="search" style="flex:1" placeholder="작업자 이름 입력"><button class="btn primary" id="addWorkerBtn">작업자 등록</button></div>
      <div id="workerListBox"></div>
    </div>`;
    firstCard.appendChild(panel);
    panel.querySelector('#addWorkerBtn').onclick=addWorker;
    panel.querySelector('#newWorkerName').addEventListener('keydown',e=>{if(e.key==='Enter')addWorker()});
    renderWorkerList();
  }

  function toggleWorkerPanel(){
    const p=document.getElementById('workerManagePanel'); if(!p)return;
    p.style.display=p.style.display==='none'?'block':'none';
    renderWorkerList();
  }
  function addWorker(){
    const input=document.getElementById('newWorkerName'); if(!input)return;
    const name=input.value.trim(); if(!name)return alert('작업자 이름을 입력해 주세요.');
    const a=loadWorkers();
    if(a.includes(name))return alert('이미 등록된 작업자입니다.');
    a.push(name); saveWorkers(a); input.value=''; renderWorkerList(); refreshWorkerSelect(name);
  }
  window.deleteFieldWorker=function(name){
    let a=loadWorkers();
    if(a.length<=1)return alert('작업자는 최소 1명 이상 등록되어 있어야 합니다.');
    if(!confirm(name+' 작업자를 삭제하시겠습니까?'))return;
    a=a.filter(x=>x!==name); saveWorkers(a); renderWorkerList(); refreshWorkerSelect(a[0]||'');
  };
  function renderWorkerList(){
    const box=document.getElementById('workerListBox'); if(!box)return;
    const a=loadWorkers();
    box.innerHTML=a.map(n=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid #e5eaf1"><b style="font-size:10px">${esc2(n)}</b><button class="btn danger" onclick="deleteFieldWorker('${String(n).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">삭제</button></div>`).join('');
  }
  function refreshWorkerSelect(prefer){
    const sel=document.getElementById('tw'); if(!sel)return;
    const old=prefer||sel.value; const a=loadWorkers();
    sel.innerHTML=a.map(n=>`<option ${n===old?'selected':''}>${esc2(n)}</option>`).join('');
  }

  function completedFor(l){
    const done=new Set(l?.done||[]);
    // 실적 로그도 완료 공정으로 합산
    try{(s.logs||[]).filter(x=>x.ltcId===l.id||x.draft===l.draft).forEach(x=>done.add(x.process));}catch(e){}
    return done;
  }
  function nextProcessFor(l){
    const done=completedFor(l);
    return routes.find(p=>!done.has(p))||routes[routes.length-1]||'';
  }
  function latestGoodFor(l){
    try{
      const logs=(s.logs||[]).filter(x=>x.ltcId===l.id||x.draft===l.draft);
      if(logs.length)return Number(logs[0].good)||Number(l.qty)||0;
    }catch(e){}
    return Number(l?.qty)||0;
  }

  window.renderTest=function(){
    ensureWorkerUI();
    if(!selected){
      if(window.scanInfo)scanInfo.textContent='일치하는 LTC를 찾지 못했습니다.';
      if(window.testForm)testForm.innerHTML='<div class="small">LTC 조회 후 입력할 수 있습니다.</div>';
      return;
    }
    const done=completedFor(selected);
    const next=nextProcessFor(selected);
    const qty=latestGoodFor(selected);
    const workers=loadWorkers();
    if(window.scanInfo)scanInfo.innerHTML=`호출완료 / <b>${esc2(selected.no)}</b> / 기안 <b>${esc2(selected.draft)}</b> / 고객문서 ${esc2(selected.cust||'-')}`;

    const completed=routes.filter(p=>done.has(p));
    const remaining=routes.filter(p=>!done.has(p));
    const nextIndex=Math.max(0,routes.indexOf(next));
    testForm.innerHTML=`
      <div class="notice" style="margin-bottom:10px;background:#eefaf4;border-color:#ccebdc;color:#176b4c">
        <b>현재 입력 공정 자동 선택: ${esc2(next)}</b><br>
        완료 ${completed.length}개 / 잔여 ${remaining.length}개 · 이전 실적의 양품수량을 다음 투입수량으로 자동 반영했습니다.
      </div>
      <div class="form">
        <div class="field"><label>현재 입력 공정</label><select id="tp">${routes.map((p,i)=>`<option ${i===nextIndex?'selected':''} ${done.has(p)?'style="color:#999"':''}>${done.has(p)?'✓ ':''}${p}</option>`).join('')}</select></div>
        <div class="field"><label>작업자</label><select id="tw">${workers.map(n=>`<option>${esc2(n)}</option>`).join('')}</select></div>
        <div class="field"><label>작업일시</label><input value="${new Date().toLocaleString('ko-KR')}" disabled></div>
        <div class="field"><label>투입수량</label><input id="ti" type="number" value="${qty}"></div>
        <div class="field"><label>양품수량</label><input id="tg" type="number" value="${qty}"></div>
        <div class="field"><label>불량수량</label><input id="tb" type="number" value="0"></div>
        <div class="field span3"><label>비고</label><input id="tr" placeholder="선택 입력"></div>
      </div>
      <div class="toolbar" style="margin-top:12px"><button class="btn primary" onclick="saveTest()">작업 완료 등록</button></div>
      <div style="margin-top:10px"><div class="small" style="margin-bottom:6px"><b>공정 이력 / 선택</b> · 완료공정은 ✓ 표시, 다음 공정은 자동 선택됩니다.</div>
      <div class="processes">${routes.map((p,i)=>`<button class="${done.has(p)?'done':''}" onclick="document.getElementById('tp').selectedIndex=${i}">${done.has(p)?'✓ ':''}${esc2(p)}${p===next?' ← 현재':''}</button>`).join('')}</div></div>`;
  };

  // 기존 saveTest가 공정명 앞의 ✓ 텍스트까지 저장하지 않도록 정리
  const oldSave=window.saveTest;
  window.saveTest=function(){
    const sel=document.getElementById('tp');
    if(sel){
      const opt=sel.options[sel.selectedIndex];
      const clean=String(opt.textContent||'').replace(/^✓\s*/,'').trim();
      opt.value=clean;
    }
    if(typeof oldSave==='function') return oldSave();
  };

  // 작업 완료 뒤에도 같은 LTC를 유지하고 다음 미완료 공정으로 자동 이동
  const baseSave=window.saveTest;
  if(baseSave){
    window.saveTest=function(){
      const sel=document.getElementById('tp');
      if(sel){const clean=String(sel.options[sel.selectedIndex].textContent||'').replace(/^✓\s*/,'').replace(/\s*←\s*현재$/,'').trim();sel.options[sel.selectedIndex].value=clean;}
      const ret=baseSave();
      setTimeout(()=>{try{renderTest(); renderWorkerList();}catch(e){}},0);
      return ret;
    };
  }

  ensureWorkerUI();
})();