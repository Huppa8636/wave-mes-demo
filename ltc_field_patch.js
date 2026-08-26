// Field LTC UX patch: auto-load next process + worker management with qualification tracking
(function(){
  const WORKER_KEY='wave_mes_field_workers_v2';
  const LEGACY_WORKER_KEY='wave_mes_field_workers_v1';
  const DEFAULT_WORKERS=[
    {name:'DEMO 작업자 A',qualified:true,expiry:'2027-03-31'},
    {name:'DEMO 작업자 B',qualified:true,expiry:'2026-12-31'},
    {name:'DEMO 작업자',qualified:false,expiry:''}
  ];

  function normalizeWorker(v){
    if(typeof v==='string') return {name:v.trim(),qualified:false,expiry:''};
    return {
      name:String(v?.name||'').trim(),
      qualified:!!v?.qualified,
      expiry:String(v?.expiry||'').trim()
    };
  }
  function loadWorkers(){
    try{
      const x=JSON.parse(localStorage.getItem(WORKER_KEY));
      if(Array.isArray(x)&&x.length) return x.map(normalizeWorker).filter(x=>x.name);
    }catch(e){}
    try{
      const old=JSON.parse(localStorage.getItem(LEGACY_WORKER_KEY));
      if(Array.isArray(old)&&old.length){
        const migrated=old.map(normalizeWorker).filter(x=>x.name);
        saveWorkers(migrated);
        return migrated;
      }
    }catch(e){}
    saveWorkers(DEFAULT_WORKERS);
    return DEFAULT_WORKERS.map(x=>({...x}));
  }
  function saveWorkers(a){
    const seen=new Set();
    const clean=a.map(normalizeWorker).filter(x=>x.name&&!seen.has(x.name)&&(seen.add(x.name),true));
    localStorage.setItem(WORKER_KEY,JSON.stringify(clean));
  }
  function esc2(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function dday(expiry){
    if(!expiry)return {text:'-',cls:'status'};
    const today=new Date(); today.setHours(0,0,0,0);
    const end=new Date(expiry+'T00:00:00');
    if(Number.isNaN(end.getTime())) return {text:'날짜 오류',cls:'status bad'};
    const d=Math.ceil((end-today)/86400000);
    if(d<0)return {text:`D+${Math.abs(d)} 만료`,cls:'status bad'};
    if(d===0)return {text:'D-DAY',cls:'status bad'};
    if(d<=30)return {text:`D-${d}`,cls:'status warn'};
    return {text:`D-${d}`,cls:'status good'};
  }
  function qualificationBadge(w){
    if(!w.qualified)return '<span class="status">미등록</span>';
    const d=dday(w.expiry);
    if(w.expiry && d.text.includes('만료'))return '<span class="status bad">등록 / 만료</span>';
    return '<span class="status good">등록</span>';
  }

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
      <div class="form" style="margin-bottom:10px">
        <div class="field"><label>작업자 이름</label><input id="newWorkerName" placeholder="작업자 이름 입력"></div>
        <div class="field"><label>작업자 자격인증</label><select id="newWorkerQualified"><option value="false">미등록</option><option value="true">등록</option></select></div>
        <div class="field"><label>자격 인증 유효일</label><input id="newWorkerExpiry" type="date"></div>
      </div>
      <div class="toolbar"><button class="btn primary" id="addWorkerBtn">작업자 등록</button></div>
      <div style="overflow:auto"><table><thead><tr><th>작업자</th><th>자격인증</th><th>유효일</th><th>오늘 기준</th><th>관리</th></tr></thead><tbody id="workerListBox"></tbody></table></div>
      <div class="small" style="margin-top:8px">※ 자격인증 정보와 유효일 / D-Day는 작업자 관리 화면에서만 관리·표시됩니다.</div>
    </div>`;
    firstCard.appendChild(panel);
    panel.querySelector('#addWorkerBtn').onclick=addWorker;
    panel.querySelector('#newWorkerName').addEventListener('keydown',e=>{if(e.key==='Enter')addWorker()});
    panel.querySelector('#newWorkerQualified').addEventListener('change',syncExpiryField);
    syncExpiryField();
    renderWorkerList();
  }

  function syncExpiryField(){
    const q=document.getElementById('newWorkerQualified'), e=document.getElementById('newWorkerExpiry');
    if(!q||!e)return;
    const on=q.value==='true'; e.disabled=!on; if(!on)e.value='';
  }
  function toggleWorkerPanel(){
    const p=document.getElementById('workerManagePanel'); if(!p)return;
    p.style.display=p.style.display==='none'?'block':'none';
    renderWorkerList();
  }
  function addWorker(){
    const input=document.getElementById('newWorkerName'); if(!input)return;
    const name=input.value.trim(); if(!name)return alert('작업자 이름을 입력해 주세요.');
    const qualified=document.getElementById('newWorkerQualified')?.value==='true';
    const expiry=document.getElementById('newWorkerExpiry')?.value||'';
    if(qualified&&!expiry)return alert('자격인증 등록 작업자는 유효일을 입력해 주세요.');
    const a=loadWorkers();
    if(a.some(x=>x.name===name))return alert('이미 등록된 작업자입니다.');
    a.push({name,qualified,expiry:qualified?expiry:''}); saveWorkers(a);
    input.value=''; document.getElementById('newWorkerQualified').value='false'; document.getElementById('newWorkerExpiry').value=''; syncExpiryField();
    renderWorkerList(); refreshWorkerSelect(name);
  }
  window.editFieldWorker=function(name){
    const a=loadWorkers(); const w=a.find(x=>x.name===name); if(!w)return;
    const q=confirm(`${name} 작업자의 자격인증을 등록 상태로 설정하시겠습니까?\n확인 = 등록 / 취소 = 미등록`);
    let expiry='';
    if(q){
      expiry=prompt('자격 인증 유효일을 YYYY-MM-DD 형식으로 입력해 주세요.',w.expiry||'');
      if(expiry===null)return;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(expiry))return alert('유효일 형식을 확인해 주세요. 예: 2027-03-31');
    }
    w.qualified=q; w.expiry=q?expiry:''; saveWorkers(a); renderWorkerList();
  };
  window.deleteFieldWorker=function(name){
    let a=loadWorkers();
    if(a.length<=1)return alert('작업자는 최소 1명 이상 등록되어 있어야 합니다.');
    if(!confirm(name+' 작업자를 삭제하시겠습니까?'))return;
    a=a.filter(x=>x.name!==name); saveWorkers(a); renderWorkerList(); refreshWorkerSelect(a[0]?.name||'');
  };
  function renderWorkerList(){
    const box=document.getElementById('workerListBox'); if(!box)return;
    const a=loadWorkers();
    box.innerHTML=a.map(w=>{
      const d=dday(w.expiry);
      return `<tr><td><b>${esc2(w.name)}</b></td><td>${qualificationBadge(w)}</td><td>${w.qualified?esc2(w.expiry||'-'):'-'}</td><td><span class="${d.cls}">${w.qualified?esc2(d.text):'-'}</span></td><td><button class="btn secondary" onclick="editFieldWorker('${String(w.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">자격 수정</button> <button class="btn danger" onclick="deleteFieldWorker('${String(w.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">삭제</button></td></tr>`;
    }).join('');
  }
  function refreshWorkerSelect(prefer){
    const sel=document.getElementById('tw'); if(!sel)return;
    const old=prefer||sel.value; const a=loadWorkers();
    sel.innerHTML=a.map(w=>`<option ${w.name===old?'selected':''}>${esc2(w.name)}</option>`).join('');
  }

  function completedFor(l){
    const done=new Set(l?.done||[]);
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
        <div class="field"><label>작업자</label><select id="tw">${workers.map(w=>`<option>${esc2(w.name)}</option>`).join('')}</select></div>
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