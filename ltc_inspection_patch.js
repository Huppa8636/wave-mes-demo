// Field LTC inspection UX patch: inspection result entry + inspector management
(function(){
  const INSPECTOR_KEY='wave_mes_field_inspectors_v1';
  const INSPECTION_LOG_KEY='wave_mes_field_inspection_logs_v1';
  const DEFAULT_INSPECTORS=[
    {name:'DEMO 검사자 A',qualified:true,expiry:'2027-03-31'},
    {name:'DEMO 검사자 B',qualified:true,expiry:'2026-12-31'},
    {name:'DEMO 검사자',qualified:false,expiry:''}
  ];
  const INSPECTION_PROCESSES=['Wire Pull Test','Inspection','Leak Test','CSAM','Impedance Measure','RF Test','OQC'];

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function normalize(v){
    if(typeof v==='string')return{name:v.trim(),qualified:false,expiry:''};
    return{name:String(v?.name||'').trim(),qualified:!!v?.qualified,expiry:String(v?.expiry||'').trim()};
  }
  function loadInspectors(){
    try{const a=JSON.parse(localStorage.getItem(INSPECTOR_KEY));if(Array.isArray(a)&&a.length)return a.map(normalize).filter(x=>x.name);}catch(e){}
    saveInspectors(DEFAULT_INSPECTORS);return DEFAULT_INSPECTORS.map(x=>({...x}));
  }
  function saveInspectors(a){
    const seen=new Set();
    const clean=a.map(normalize).filter(x=>x.name&&!seen.has(x.name)&&(seen.add(x.name),true));
    localStorage.setItem(INSPECTOR_KEY,JSON.stringify(clean));
  }
  function loadInspectionLogs(){try{return JSON.parse(localStorage.getItem(INSPECTION_LOG_KEY))||[]}catch(e){return[]}}
  function saveInspectionLogs(a){localStorage.setItem(INSPECTION_LOG_KEY,JSON.stringify(a));}
  function dday(expiry){
    if(!expiry)return{text:'-',cls:'status'};
    const today=new Date();today.setHours(0,0,0,0);const end=new Date(expiry+'T00:00:00');
    if(Number.isNaN(end.getTime()))return{text:'날짜 오류',cls:'status bad'};
    const d=Math.ceil((end-today)/86400000);
    if(d<0)return{text:`D+${Math.abs(d)} 만료`,cls:'status bad'};
    if(d===0)return{text:'D-DAY',cls:'status bad'};
    if(d<=30)return{text:`D-${d}`,cls:'status warn'};
    return{text:`D-${d}`,cls:'status good'};
  }
  function qualBadge(w){
    if(!w.qualified)return'<span class="status">미등록</span>';
    const d=dday(w.expiry);if(w.expiry&&d.text.includes('만료'))return'<span class="status bad">등록 / 만료</span>';
    return'<span class="status good">등록</span>';
  }
  function jsq(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}

  function ensureInspectorButton(){
    const test=document.getElementById('test');if(!test)return;
    const firstCard=test.querySelector('.card');if(!firstCard)return;
    const head=firstCard.querySelector('.head');if(!head||document.getElementById('inspectorManageBtn'))return;
    const btn=document.createElement('button');btn.id='inspectorManageBtn';btn.className='btn secondary';btn.textContent='검사자 관리';btn.onclick=toggleInspectorPanel;
    const workerBtn=document.getElementById('workerManageBtn');
    if(workerBtn&&workerBtn.parentNode===head)head.insertBefore(btn,workerBtn.nextSibling);else head.appendChild(btn);

    const panel=document.createElement('div');panel.id='inspectorManagePanel';panel.style.display='none';
    panel.innerHTML=`<div class="card" style="box-shadow:none;margin-top:10px;background:#f8fafc">
      <div class="head"><h2>검사자 관리</h2><span class="status">현장 LTC TEST 전용</span></div>
      <div class="form" style="margin-bottom:10px">
        <div class="field"><label>검사자 이름</label><input id="newInspectorName" placeholder="검사자 이름 입력"></div>
        <div class="field"><label>검사자 자격인증</label><select id="newInspectorQualified"><option value="false">미등록</option><option value="true">등록</option></select></div>
        <div class="field"><label>자격 인증 유효일</label><input id="newInspectorExpiry" type="date"></div>
      </div>
      <div class="toolbar"><button class="btn primary" id="addInspectorBtn">검사자 등록</button></div>
      <div style="overflow:auto"><table><thead><tr><th>검사자</th><th>자격인증</th><th>유효일</th><th>오늘 기준</th><th>관리</th></tr></thead><tbody id="inspectorListBox"></tbody></table></div>
      <div class="small" style="margin-top:8px">※ 자격인증 정보와 유효일 / D-Day는 검사자 관리 화면에서만 관리·표시됩니다.</div>
    </div>`;
    firstCard.appendChild(panel);
    document.getElementById('addInspectorBtn').onclick=addInspector;
    document.getElementById('newInspectorName').addEventListener('keydown',e=>{if(e.key==='Enter')addInspector()});
    document.getElementById('newInspectorQualified').addEventListener('change',syncInspectorExpiry);
    syncInspectorExpiry();renderInspectorList();
  }
  function syncInspectorExpiry(){
    const q=document.getElementById('newInspectorQualified'),e=document.getElementById('newInspectorExpiry');if(!q||!e)return;
    const on=q.value==='true';e.disabled=!on;if(!on)e.value='';
  }
  function toggleInspectorPanel(){
    const p=document.getElementById('inspectorManagePanel');if(!p)return;p.style.display=p.style.display==='none'?'block':'none';renderInspectorList();
  }
  function addInspector(){
    const n=document.getElementById('newInspectorName');if(!n)return;const name=n.value.trim();if(!name)return alert('검사자 이름을 입력해 주세요.');
    const qualified=document.getElementById('newInspectorQualified').value==='true';const expiry=document.getElementById('newInspectorExpiry').value||'';
    if(qualified&&!expiry)return alert('자격인증 등록 검사자는 유효일을 입력해 주세요.');
    const a=loadInspectors();if(a.some(x=>x.name===name))return alert('이미 등록된 검사자입니다.');
    a.push({name,qualified,expiry:qualified?expiry:''});saveInspectors(a);n.value='';document.getElementById('newInspectorQualified').value='false';document.getElementById('newInspectorExpiry').value='';syncInspectorExpiry();renderInspectorList();refreshInspectorSelect(name);
  }
  window.editFieldInspector=function(name){
    const a=loadInspectors(),w=a.find(x=>x.name===name);if(!w)return;
    const q=confirm(`${name} 검사자의 자격인증을 등록 상태로 설정하시겠습니까?\n확인 = 등록 / 취소 = 미등록`);let expiry='';
    if(q){expiry=prompt('자격 인증 유효일을 YYYY-MM-DD 형식으로 입력해 주세요.',w.expiry||'');if(expiry===null)return;if(!/^\d{4}-\d{2}-\d{2}$/.test(expiry))return alert('유효일 형식을 확인해 주세요. 예: 2027-03-31');}
    w.qualified=q;w.expiry=q?expiry:'';saveInspectors(a);renderInspectorList();
  };
  window.deleteFieldInspector=function(name){
    let a=loadInspectors();if(a.length<=1)return alert('검사자는 최소 1명 이상 등록되어 있어야 합니다.');if(!confirm(name+' 검사자를 삭제하시겠습니까?'))return;
    a=a.filter(x=>x.name!==name);saveInspectors(a);renderInspectorList();refreshInspectorSelect(a[0]?.name||'');
  };
  function renderInspectorList(){
    const box=document.getElementById('inspectorListBox');if(!box)return;const a=loadInspectors();
    box.innerHTML=a.map(w=>{const d=dday(w.expiry);return`<tr><td><b>${esc(w.name)}</b></td><td>${qualBadge(w)}</td><td>${w.qualified?esc(w.expiry||'-'):'-'}</td><td><span class="${d.cls}">${w.qualified?esc(d.text):'-'}</span></td><td><button class="btn secondary" onclick="editFieldInspector('${jsq(w.name)}')">자격 수정</button> <button class="btn danger" onclick="deleteFieldInspector('${jsq(w.name)}')">삭제</button></td></tr>`}).join('');
  }
  function refreshInspectorSelect(prefer){
    const sel=document.getElementById('inspectorSelect');if(!sel)return;const old=prefer||sel.value;const a=loadInspectors();sel.innerHTML=a.map(w=>`<option ${w.name===old?'selected':''}>${esc(w.name)}</option>`).join('');
  }

  function ensureInspectionSection(){
    const test=document.getElementById('test');if(!test||document.getElementById('inspectionSection'))return;
    const section=document.createElement('div');section.id='inspectionSection';section.className='card';section.style.marginTop='14px';
    section.innerHTML=`<div class="head"><h2>③ 검사 실적 입력</h2><span class="status good">검사 전용</span></div><div id="inspectionForm"><div class="small">LTC 조회 후 검사 실적을 입력할 수 있습니다.</div></div>`;
    const row2=test.querySelector('.row2');if(row2&&row2.parentNode===test)test.insertBefore(section,row2.nextSibling);else test.appendChild(section);
  }
  function renderInspectionForm(){
    ensureInspectionSection();const box=document.getElementById('inspectionForm');if(!box)return;
    if(typeof selected==='undefined'||!selected){box.innerHTML='<div class="small">LTC 조회 후 검사 실적을 입력할 수 있습니다.</div>';return;}
    const inspectors=loadInspectors();const logs=loadInspectionLogs().filter(x=>x.draft===selected.draft);const last=logs[0];const qty=last?Number(last.good)||Number(selected.qty)||0:Number(selected.qty)||0;
    box.innerHTML=`<div class="form">
      <div class="field"><label>검사 항목</label><select id="inspectionProcess">${INSPECTION_PROCESSES.map(p=>`<option>${esc(p)}</option>`).join('')}</select></div>
      <div class="field"><label>검사자</label><select id="inspectorSelect">${inspectors.map(w=>`<option>${esc(w.name)}</option>`).join('')}</select></div>
      <div class="field"><label>검사일시</label><input value="${new Date().toLocaleString('ko-KR')}" disabled></div>
      <div class="field"><label>검사수량</label><input id="inspectionInput" type="number" value="${qty}"></div>
      <div class="field"><label>양품수량</label><input id="inspectionGood" type="number" value="${qty}"></div>
      <div class="field"><label>불량수량</label><input id="inspectionBad" type="number" value="0"></div>
      <div class="field span3"><label>비고</label><input id="inspectionRemark" placeholder="선택 입력"></div>
    </div>
    <div class="toolbar" style="margin-top:12px"><button class="btn primary" onclick="saveInspectionResult()">검사 실적 등록</button></div>
    <div style="margin-top:12px"><div class="small" style="margin-bottom:6px"><b>검사 이력</b></div><div id="inspectionHistory"></div></div>`;
    renderInspectionHistory();
  }
  window.saveInspectionResult=function(){
    if(typeof selected==='undefined'||!selected)return alert('먼저 LTC를 조회해 주세요.');
    const input=Number(document.getElementById('inspectionInput').value)||0,good=Number(document.getElementById('inspectionGood').value)||0,bad=Number(document.getElementById('inspectionBad').value)||0;
    if(input<=0)return alert('검사수량을 입력해 주세요.');if(good+bad!==input)return alert('양품수량 + 불량수량 = 검사수량이어야 합니다.');
    const logs=loadInspectionLogs();logs.unshift({id:'INSP-'+Date.now(),draft:selected.draft,ltc:selected.no,prod:selected.prod,process:document.getElementById('inspectionProcess').value,inspector:document.getElementById('inspectorSelect').value,input,good,bad,remark:document.getElementById('inspectionRemark').value.trim(),at:new Date().toLocaleString('ko-KR')});saveInspectionLogs(logs);renderInspectionForm();
  };
  function renderInspectionHistory(){
    const box=document.getElementById('inspectionHistory');if(!box||typeof selected==='undefined'||!selected)return;const logs=loadInspectionLogs().filter(x=>x.draft===selected.draft);
    box.innerHTML=logs.length?logs.map(x=>`<div class="log"><b>${esc(x.process)}</b> / 검사 ${x.input} / 양품 ${x.good} / 불량 ${x.bad}<div class="small">${esc(x.at)} / ${esc(x.inspector)} / 기안 ${esc(x.draft)}${x.remark?' / '+esc(x.remark):''}</div></div>`).join(''):'<div class="small">등록된 검사 실적이 없습니다.</div>';
  }

  const baseRenderTest=window.renderTest;
  window.renderTest=function(){const r=typeof baseRenderTest==='function'?baseRenderTest():undefined;ensureInspectorButton();renderInspectionForm();return r;};

  ensureInspectorButton();ensureInspectionSection();renderInspectionForm();
})();