// Long-term MES governance / audit framework for GitHub DEMO
// NOTE: GitHub Pages implementation is a PoC. Server-side authentication/authorization and immutable DB audit logs are required for production.
(function(){
  const USER_KEY='wave_mes_users_v1';
  const CURRENT_USER_KEY='wave_mes_current_user_v1';
  const AUDIT_KEY='wave_mes_audit_v1';
  const DOC_KEY='wave_mes_documents_v1';
  const INSPECTION_LOG_KEY='wave_mes_field_inspection_logs_v1';
  const WORKER_KEY='wave_mes_field_workers_v2';
  const INSPECTOR_KEY='wave_mes_field_inspectors_v1';
  const PROCESS_VERSION='PROC-2026.08-V1';
  const ROLES=['관리자','생산','품질','구매','영업','개발','경영','손님'];
  const USER_STATES=['사용중','휴직','퇴사·비활성'];

  const DEFAULT_USERS=[
    {id:'U-ADMIN',name:'DEMO 관리자',role:'관리자',status:'사용중'},
    {id:'U-PROD',name:'DEMO 생산',role:'생산',status:'사용중'},
    {id:'U-QA',name:'DEMO 품질',role:'품질',status:'사용중'},
    {id:'U-PUR',name:'DEMO 구매',role:'구매',status:'사용중'},
    {id:'U-SALES',name:'DEMO 영업',role:'영업',status:'사용중'},
    {id:'U-RND',name:'DEMO 개발',role:'개발',status:'사용중'},
    {id:'U-MGMT',name:'DEMO 경영',role:'경영',status:'사용중'},
    {id:'U-GUEST',name:'DEMO 손님',role:'손님',status:'사용중'}
  ];

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function now(){return new Date().toLocaleString('ko-KR');}
  function uid(prefix){return prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);}
  function loadJson(key,def){try{const x=JSON.parse(localStorage.getItem(key));return x??def}catch(e){return def}}
  function saveJson(key,val){localStorage.setItem(key,JSON.stringify(val));}
  function deep(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}

  function users(){
    let a=loadJson(USER_KEY,null);
    if(!Array.isArray(a)||!a.length){a=deep(DEFAULT_USERS);saveJson(USER_KEY,a)}
    return a;
  }
  function currentUser(){
    const a=users();
    const id=localStorage.getItem(CURRENT_USER_KEY)||a[0]?.id;
    let u=a.find(x=>x.id===id&&x.status==='사용중');
    if(!u)u=a.find(x=>x.status==='사용중')||a[0]||{id:'UNKNOWN',name:'미지정 사용자',role:'손님',status:'사용중'};
    localStorage.setItem(CURRENT_USER_KEY,u.id);
    return u;
  }
  function setCurrentUser(id){
    const u=users().find(x=>x.id===id&&x.status==='사용중');
    if(!u)return alert('사용중 상태의 사용자만 현재 사용자로 선택할 수 있습니다.');
    localStorage.setItem(CURRENT_USER_KEY,id);audit('SESSION_USER_CHANGE','사용자 세션','',null,{user:u.name,role:u.role},'DEMO 사용자 전환');renderUserBadge();renderAdmin();
  }
  function actorText(){const u=currentUser();return `${u.name} / ${u.role}`;}

  function audit(action,target,draft,before,after,reason,extra){
    const u=currentUser();
    const a=loadJson(AUDIT_KEY,[]);
    a.unshift({id:uid('AUD'),at:now(),iso:new Date().toISOString(),userId:u.id,user:u.name,role:u.role,action,target,draft:draft||'',before:deep(before),after:deep(after),reason:reason||'',extra:deep(extra||{})});
    saveJson(AUDIT_KEY,a.slice(0,10000));
    return a[0];
  }
  window.waveMesAudit=audit;

  function qualificationSnapshot(kind,name){
    const key=kind==='inspection'?INSPECTOR_KEY:WORKER_KEY;
    const list=loadJson(key,[]);
    const q=(Array.isArray(list)?list:[]).find(x=>(typeof x==='string'?x:x?.name)===name);
    if(!q)return{name:name||'',qualified:false,expiry:'',capturedAt:now(),source:'미등록'};
    if(typeof q==='string')return{name:q,qualified:false,expiry:'',capturedAt:now(),source:'legacy'};
    return{name:q.name||name||'',qualified:!!q.qualified,expiry:q.expiry||'',capturedAt:now(),source:'qualification-master'};
  }

  function stampLtcVersions(){
    try{
      (s.ltcs||[]).forEach(l=>{if(!l.processVersion)l.processVersion=PROCESS_VERSION});
      if(typeof save==='function')saveJson(K,s);
    }catch(e){}
  }

  function ensureNavAndSections(){
    const nav=document.getElementById('nav');if(!nav)return;
    if(!nav.querySelector('[data-v="audit"]')){
      const b=document.createElement('button');b.dataset.v='audit';b.innerHTML='▤ 감사이력 / Timeline';nav.appendChild(b);
    }
    if(!nav.querySelector('[data-v="admin"]')){
      const b=document.createElement('button');b.dataset.v='admin';b.innerHTML='⚙ 관리자 설정';nav.appendChild(b);
    }
    const main=document.querySelector('main');if(!main)return;
    if(!document.getElementById('audit')){
      const sec=document.createElement('section');sec.className='view';sec.id='audit';
      sec.innerHTML=`<div class="card"><div class="head"><h2>감사이력 / Audit Trail</h2><span class="status good">삭제 금지 구조 DEMO</span></div>
      <div class="toolbar"><input id="auditSearch" class="search" placeholder="PO / LTC / 사용자 / 작업 검색"><button class="btn secondary" id="auditRefreshBtn">새로고침</button></div>
      <div class="notice">중요 변경은 변경자 / 변경일시 / 변경사유와 함께 누적됩니다. 정식 서버에서는 DB의 불변 감사로그로 전환합니다.</div><div id="auditList"></div></div>
      <div class="card"><div class="head"><h2>PO / LTC 전체 이력 타임라인</h2><span class="status">중심 추적키 조회</span></div>
      <div class="toolbar"><input id="timelineDraft" class="search" placeholder="예: 20260825-0004"><button class="btn primary" id="timelineBtn">타임라인 조회</button></div><div id="timelineList" class="small">기안번호를 입력하십시오.</div></div>`;
      main.insertBefore(sec,main.querySelector('.footer'));
    }
    if(!document.getElementById('admin')){
      const sec=document.createElement('section');sec.className='view';sec.id='admin';
      sec.innerHTML=`<div class="card"><div class="head"><h2>관리자 설정 / 기본 틀</h2><span class="status warn">GitHub DEMO 권한 구조</span></div>
      <div class="notice"><b>공정표 버전: ${PROCESS_VERSION}</b><br>정식 서버에서는 사용자 인증과 API 권한검사를 서버에서 수행합니다.</div>
      <div class="form"><div class="field"><label>사용자 이름</label><input id="adminUserName" placeholder="이름"></div><div class="field"><label>역할</label><select id="adminUserRole">${ROLES.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field"><label>사용자 상태</label><select id="adminUserStatus">${USER_STATES.map(x=>`<option>${x}</option>`).join('')}</select></div></div>
      <div class="toolbar" style="margin-top:10px"><button class="btn primary" id="adminAddUserBtn">사용자 등록</button></div><div style="overflow:auto"><table><thead><tr><th>사용자</th><th>역할</th><th>상태</th><th>관리</th></tr></thead><tbody id="adminUserList"></tbody></table></div></div>
      <div class="card"><div class="head"><h2>역할 구조</h2></div><div class="small">관리자 / 생산 / 품질 / 구매 / 영업 / 개발 / 경영 / 손님 역할을 기준으로 향후 서버 API 권한을 분리합니다. 현재 GitHub DEMO에서는 UI 구조 검증용입니다.</div></div>
      <div class="card"><div class="head"><h2>문서 첨부 이력</h2><span class="status">파일명 / 등록자 / 등록일 / 종류</span></div><div id="docMetaList"></div></div>`;
      main.insertBefore(sec,main.querySelector('.footer'));
    }

    if(typeof titles==='object'){
      titles.audit=['감사이력 / Audit Trail','변경자 / 변경일시 / 사유 및 PO별 전체 이력을 확인합니다.'];
      titles.admin=['관리자 설정','사용자 역할 / 상태 / 공정버전 및 장기운영 기본 설정'];
    }
    document.querySelectorAll('#nav button').forEach(b=>{
      b.onclick=()=>{
        const v=b.dataset.v;document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===v));document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x===b));
        if(typeof titles==='object'&&titles[v]){const h=document.getElementById('title'),sub=document.getElementById('sub');if(h)h.textContent=titles[v][0];if(sub)sub.textContent=titles[v][1]}
        if(v==='audit'){renderAudit();}
        if(v==='admin'){renderAdmin();}
      };
    });
    document.getElementById('auditRefreshBtn')?.addEventListener('click',renderAudit);
    document.getElementById('auditSearch')?.addEventListener('input',renderAudit);
    document.getElementById('timelineBtn')?.addEventListener('click',renderTimeline);
    document.getElementById('timelineDraft')?.addEventListener('keydown',e=>{if(e.key==='Enter')renderTimeline()});
    document.getElementById('adminAddUserBtn')?.addEventListener('click',addUser);
  }

  function renderUserBadge(){
    const top=document.querySelector('.top');if(!top)return;
    let wrap=document.getElementById('demoUserWrap');
    if(!wrap){wrap=document.createElement('div');wrap.id='demoUserWrap';wrap.style.cssText='display:flex;gap:6px;align-items:center;margin-left:auto;margin-right:8px';const badge=top.querySelector('.badge');if(badge)top.insertBefore(wrap,badge);else top.appendChild(wrap);}
    const u=currentUser(),a=users().filter(x=>x.status==='사용중');
    wrap.innerHTML=`<span class="small">현재 사용자</span><select id="demoUserSelect" style="padding:6px 8px;border:1px solid #dce4ee;border-radius:7px;font-size:10px">${a.map(x=>`<option value="${esc(x.id)}" ${x.id===u.id?'selected':''}>${esc(x.name)} / ${esc(x.role)}</option>`).join('')}</select>`;
    document.getElementById('demoUserSelect').onchange=e=>setCurrentUser(e.target.value);
  }

  function addUser(){
    const name=document.getElementById('adminUserName')?.value.trim();const role=document.getElementById('adminUserRole')?.value;const status=document.getElementById('adminUserStatus')?.value;
    if(!name)return alert('사용자 이름을 입력해 주세요.');
    const a=users();if(a.some(x=>x.name===name&&x.status!=='퇴사·비활성'))return alert('동일 이름의 활성 사용자가 있습니다.');
    const u={id:uid('U'),name,role,status};a.push(u);saveJson(USER_KEY,a);audit('CREATE','사용자',u.id,null,u,'사용자 등록');document.getElementById('adminUserName').value='';renderAdmin();renderUserBadge();
  }
  window.waveMesEditUser=function(id){
    const a=users(),u=a.find(x=>x.id===id);if(!u)return;
    const role=prompt('역할을 입력해 주세요.\n'+ROLES.join(' / '),u.role);if(role===null)return;if(!ROLES.includes(role))return alert('정의된 역할만 사용할 수 있습니다.');
    const status=prompt('상태를 입력해 주세요.\n'+USER_STATES.join(' / '),u.status);if(status===null)return;if(!USER_STATES.includes(status))return alert('정의된 사용자 상태만 사용할 수 있습니다.');
    const before=deep(u);u.role=role;u.status=status;saveJson(USER_KEY,a);audit('UPDATE','사용자',u.id,before,u,'역할 / 상태 변경');renderAdmin();renderUserBadge();
  };
  function renderAdmin(){
    const box=document.getElementById('adminUserList');if(box)box.innerHTML=users().map(u=>`<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.role)}</td><td><span class="status ${u.status==='사용중'?'good':u.status==='휴직'?'warn':'bad'}">${esc(u.status)}</span></td><td><button class="btn secondary" onclick="waveMesEditUser('${esc(u.id)}')">수정</button></td></tr>`).join('');
    const d=document.getElementById('docMetaList'),docs=loadJson(DOC_KEY,[]);if(d)d.innerHTML=docs.length?docs.slice(0,50).map(x=>`<div class="log"><b>${esc(x.fileName)}</b> / ${esc(x.docType)}<div class="small">${esc(x.at)} / ${esc(x.user)} / 연결 PO ${esc(x.draft||'미연결')}</div></div>`).join(''):'<div class="small">등록된 문서 첨부 이력이 없습니다.</div>';
  }

  function renderAudit(){
    const box=document.getElementById('auditList');if(!box)return;const q=(document.getElementById('auditSearch')?.value||'').toLowerCase();
    const a=loadJson(AUDIT_KEY,[]).filter(x=>!q||[x.draft,x.user,x.role,x.action,x.target,x.reason].some(v=>String(v||'').toLowerCase().includes(q)));
    box.innerHTML=a.length?a.slice(0,300).map(x=>`<div class="log"><div class="head" style="margin-bottom:3px"><b>${esc(x.action)} / ${esc(x.target)}</b><span class="status">${esc(x.role)}</span></div><div class="small">${esc(x.at)} / ${esc(x.user)}${x.draft?' / PO '+esc(x.draft):''}${x.reason?' / 사유 '+esc(x.reason):''}</div></div>`).join(''):'<div class="small">조건에 맞는 감사이력이 없습니다.</div>';
  }

  function timelineEvents(draft){
    const out=[];
    try{(s.requests||[]).filter(x=>x.draft===draft).forEach(x=>out.push({at:x.createdAt||'',sort:0,type:'작업요청',txt:`${x.status||'접수'} / ${x.prod||''} / ${x.qty||0}ea`}));}catch(e){}
    try{(s.logs||[]).filter(x=>x.draft===draft).forEach(x=>out.push({at:x.at||'',sort:1,type:'작업실적',txt:`${x.process} / ${x.status||'유효'} / ${x.worker||''} / 양품 ${x.good} / 불량 ${x.bad}`}));}catch(e){}
    const ins=loadJson(INSPECTION_LOG_KEY,[]);ins.filter(x=>x.draft===draft).forEach(x=>out.push({at:x.at||'',sort:2,type:'검사실적',txt:`${x.process} / ${x.status||'유효'} / ${x.inspector||''} / 양품 ${x.good} / 불량 ${x.bad}`}));
    try{(s.nc||[]).filter(x=>x.draft===draft).forEach(x=>{out.push({at:x.heldAt||'',sort:3,type:'부적합',txt:`HOLD / ${x.process||'-'} / ${x.reason||'-'}`});if(x.clearedAt)out.push({at:x.clearedAt,sort:4,type:'부적합',txt:`CLEAR / ${x.clearReason||'-'}`})});}catch(e){}
    loadJson(AUDIT_KEY,[]).filter(x=>x.draft===draft).forEach(x=>out.push({at:x.at||'',sort:5,type:'AUDIT',txt:`${x.action} / ${x.target} / ${x.user}${x.reason?' / '+x.reason:''}`}));
    return out;
  }
  function renderTimeline(){
    const draft=document.getElementById('timelineDraft')?.value.trim();const box=document.getElementById('timelineList');if(!box)return;if(!draft){box.innerHTML='기안번호를 입력하십시오.';return}
    const e=timelineEvents(draft);box.innerHTML=e.length?`<div class="notice"><b>${esc(draft)} 전체 이력</b> / 공정표 ${PROCESS_VERSION}</div>`+e.map(x=>`<div class="log"><b>${esc(x.type)}</b><div class="small">${esc(x.at||'시간정보 없음')} / ${esc(x.txt)}</div></div>`).join(''):'<div class="small">해당 PO의 이력을 찾지 못했습니다.</div>';
  }

  function documentTypeForInput(id){return ({pdfFileInput:'생산 작업요청서',qPdfFileInput:'품질 검사 요청서',issuePdf:'자재 불출요청서'})[id]||'';}
  function captureDocument(input){
    const f=input.files&&input.files[0],docType=documentTypeForInput(input.id);if(!f||!docType)return;
    const u=currentUser(),docs=loadJson(DOC_KEY,[]);docs.unshift({id:uid('DOC'),fileName:f.name,docType,user:u.name,userId:u.id,at:now(),draft:'',inputId:input.id});saveJson(DOC_KEY,docs.slice(0,2000));audit('ATTACH','문서','',null,{fileName:f.name,docType},'문서 첨부');
  }
  function linkLatestDocument(inputId,draft){
    if(!draft)return;const docs=loadJson(DOC_KEY,[]);const d=docs.find(x=>x.inputId===inputId&&!x.draft);if(d){d.draft=draft;saveJson(DOC_KEY,docs);audit('LINK','문서',draft,null,{fileName:d.fileName,docType:d.docType},'중심 추적키 연결');}
  }

  function decorateLtcVersion(){
    document.querySelectorAll('[id^="ltc-"]').forEach(card=>{
      if(card.querySelector('.process-version-tag'))return;
      const head=card.querySelector('.head');if(!head)return;const t=document.createElement('div');t.className='small process-version-tag';t.style.marginTop='4px';t.textContent='공정표 버전 '+PROCESS_VERSION;head.querySelector('div')?.appendChild(t);
    });
  }

  function statusClass(st){return st==='유효'?'good':st==='수정'?'warn':st==='취소'||st==='무효'?'bad':'';}
  function renderGovernedWorkLogs(){
    const box=document.getElementById('testLogs');if(!box)return;let logs=[];try{logs=s.logs||[]}catch(e){}
    const draft=(typeof selected!=='undefined'&&selected)?selected.draft:'';if(draft)logs=logs.filter(x=>x.draft===draft);
    box.innerHTML=logs.length?logs.map(x=>`<div class="log"><div class="head" style="margin-bottom:3px"><b>${esc(x.process)}</b><span class="status ${statusClass(x.status||'유효')}">${esc(x.status||'유효')}</span></div><div class="small">${esc(x.at||'')} / ${esc(x.worker||'')} / 투입 ${x.input} / 양품 ${x.good} / 불량 ${x.bad}<br>공정버전 ${esc(x.processVersion||PROCESS_VERSION)}${x.qualificationSnapshot?` / 당시자격 ${x.qualificationSnapshot.qualified?'등록':'미등록'} ${esc(x.qualificationSnapshot.expiry||'')}`:''}</div><div class="toolbar" style="margin-top:6px"><button class="btn secondary" onclick="waveMesEditWorkLog('${esc(x.id)}')" ${(x.status==='취소'||x.status==='무효')?'disabled':''}>수정</button><button class="btn secondary" onclick="waveMesSetWorkLogStatus('${esc(x.id)}','취소')" ${(x.status==='취소'||x.status==='무효')?'disabled':''}>취소</button><button class="btn danger" onclick="waveMesSetWorkLogStatus('${esc(x.id)}','무효')" ${(x.status==='무효')?'disabled':''}>무효</button></div></div>`).join(''):'<div class="small">등록된 작업 실적이 없습니다.</div>';
  }
  window.waveMesEditWorkLog=function(id){
    const x=(s.logs||[]).find(z=>String(z.id)===String(id));if(!x)return;const reason=prompt('수정 사유를 입력해 주세요.','');if(reason===null||!reason.trim())return alert('수정 사유가 필요합니다.');const before=deep(x);const g=prompt('양품수량',String(x.good));if(g===null)return;const good=Number(g);if(!Number.isFinite(good)||good<0||good>x.input)return alert('양품수량을 확인해 주세요.');x.good=good;x.bad=Number(x.input)-good;x.status='수정';x.lastChangedBy=actorText();x.lastChangedAt=now();x.changeReason=reason.trim();if(typeof save==='function')save();audit('UPDATE','작업실적',x.draft,before,x,reason.trim());renderGovernedWorkLogs();
  };
  window.waveMesSetWorkLogStatus=function(id,status){
    const x=(s.logs||[]).find(z=>String(z.id)===String(id));if(!x)return;const reason=prompt(`${status} 사유를 입력해 주세요.`,'');if(reason===null||!reason.trim())return alert('사유가 필요합니다.');const before=deep(x);x.status=status;x.lastChangedBy=actorText();x.lastChangedAt=now();x.changeReason=reason.trim();if(typeof save==='function')save();audit(status==='취소'?'CANCEL':'VOID','작업실적',x.draft,before,x,reason.trim());renderGovernedWorkLogs();
  };

  function renderGovernedInspectionHistory(){
    const box=document.getElementById('inspectionHistory');if(!box||typeof selected==='undefined'||!selected)return;const a=loadJson(INSPECTION_LOG_KEY,[]).filter(x=>x.draft===selected.draft);
    box.innerHTML=a.length?a.map(x=>`<div class="log"><div class="head" style="margin-bottom:3px"><b>${esc(x.process)}</b><span class="status ${statusClass(x.status||'유효')}">${esc(x.status||'유효')}</span></div><div class="small">${esc(x.at||'')} / ${esc(x.inspector||'')} / 검사 ${x.input} / 양품 ${x.good} / 불량 ${x.bad}<br>공정버전 ${esc(x.processVersion||PROCESS_VERSION)}${x.qualificationSnapshot?` / 당시자격 ${x.qualificationSnapshot.qualified?'등록':'미등록'} ${esc(x.qualificationSnapshot.expiry||'')}`:''}</div><div class="toolbar" style="margin-top:6px"><button class="btn secondary" onclick="waveMesEditInspectionLog('${esc(x.id)}')" ${(x.status==='취소'||x.status==='무효')?'disabled':''}>수정</button><button class="btn secondary" onclick="waveMesSetInspectionStatus('${esc(x.id)}','취소')" ${(x.status==='취소'||x.status==='무효')?'disabled':''}>취소</button><button class="btn danger" onclick="waveMesSetInspectionStatus('${esc(x.id)}','무효')" ${x.status==='무효'?'disabled':''}>무효</button></div></div>`).join(''):'<div class="small">등록된 검사 실적이 없습니다.</div>';
  }
  window.waveMesEditInspectionLog=function(id){
    const a=loadJson(INSPECTION_LOG_KEY,[]),x=a.find(z=>String(z.id)===String(id));if(!x)return;const reason=prompt('수정 사유를 입력해 주세요.','');if(reason===null||!reason.trim())return alert('수정 사유가 필요합니다.');const before=deep(x);const g=prompt('양품수량',String(x.good));if(g===null)return;const good=Number(g);if(!Number.isFinite(good)||good<0||good>x.input)return alert('양품수량을 확인해 주세요.');x.good=good;x.bad=Number(x.input)-good;x.status='수정';x.lastChangedBy=actorText();x.lastChangedAt=now();x.changeReason=reason.trim();saveJson(INSPECTION_LOG_KEY,a);audit('UPDATE','검사실적',x.draft,before,x,reason.trim());renderGovernedInspectionHistory();
  };
  window.waveMesSetInspectionStatus=function(id,status){
    const a=loadJson(INSPECTION_LOG_KEY,[]),x=a.find(z=>String(z.id)===String(id));if(!x)return;const reason=prompt(`${status} 사유를 입력해 주세요.`,'');if(reason===null||!reason.trim())return alert('사유가 필요합니다.');const before=deep(x);x.status=status;x.lastChangedBy=actorText();x.lastChangedAt=now();x.changeReason=reason.trim();saveJson(INSPECTION_LOG_KEY,a);audit(status==='취소'?'CANCEL':'VOID','검사실적',x.draft,before,x,reason.trim());renderGovernedInspectionHistory();
  };

  // Hard-disable destructive TEST history deletion; statuses replace deletion.
  window.clearLogs=function(){alert('작업실적은 삭제할 수 없습니다. 수정 / 취소 / 무효 상태로 관리해 주세요.');};
  function removeDeleteControls(){
    document.querySelectorAll('button').forEach(b=>{if(/TEST 이력 삭제|실적 삭제|부적합 삭제/.test(b.textContent||'')){b.style.display='none';}});
  }

  function wrapBusinessFunctions(){
    const oldSaveTest=window.saveTest;
    if(typeof oldSaveTest==='function'&&!oldSaveTest.__gov){
      const f=function(){
        const before=(s.logs||[]).length;const worker=document.getElementById('tw')?.value||'';const draft=(typeof selected!=='undefined'&&selected)?selected.draft:'';
        const r=oldSaveTest.apply(this,arguments);const after=(s.logs||[]).length;
        if(after>before){const x=s.logs[0];x.status=x.status||'유효';x.processVersion=PROCESS_VERSION;x.qualificationSnapshot=qualificationSnapshot('work',worker);x.createdBy=actorText();x.createdAt=now();if(typeof save==='function')save();audit('CREATE','작업실적',draft,null,x,'작업 실적 등록');}
        setTimeout(()=>{renderGovernedWorkLogs();decorateLtcVersion();},80);return r;
      };f.__gov=true;window.saveTest=f;
    }
    const oldSaveInspection=window.saveInspectionResult;
    if(typeof oldSaveInspection==='function'&&!oldSaveInspection.__gov){
      const f=function(){
        const before=loadJson(INSPECTION_LOG_KEY,[]).length;const name=document.getElementById('inspectorSelect')?.value||'';const draft=(typeof selected!=='undefined'&&selected)?selected.draft:'';
        const r=oldSaveInspection.apply(this,arguments);const a=loadJson(INSPECTION_LOG_KEY,[]);
        if(a.length>before){const x=a[0];x.status=x.status||'유효';x.processVersion=PROCESS_VERSION;x.qualificationSnapshot=qualificationSnapshot('inspection',name);x.createdBy=actorText();x.createdAt=now();saveJson(INSPECTION_LOG_KEY,a);audit('CREATE','검사실적',draft,null,x,'검사 실적 등록');}
        setTimeout(()=>{renderGovernedInspectionHistory();decorateLtcVersion();},100);return r;
      };f.__gov=true;window.saveInspectionResult=f;
    }
    const oldHold=window.registerLotHold;
    if(typeof oldHold==='function'&&!oldHold.__gov){const f=function(){const draft=(typeof selected!=='undefined'&&selected)?selected.draft:'';const before=deep((s.nc||[]).filter(x=>x.draft===draft));const r=oldHold.apply(this,arguments);const after=deep((s.nc||[]).filter(x=>x.draft===draft));if(JSON.stringify(before)!==JSON.stringify(after))audit('HOLD','부적합',draft,before,after,'LOT HOLD 등록');return r};f.__gov=true;window.registerLotHold=f;}
    const oldClear=window.clearLotHold;
    if(typeof oldClear==='function'&&!oldClear.__gov){const f=function(id){const n=(s.nc||[]).find(x=>String(x.id)===String(id));const before=deep(n);const r=oldClear.apply(this,arguments);const after=deep((s.nc||[]).find(x=>String(x.id)===String(id)));if(before&&after&&before.status!==after.status)audit('CLEAR','부적합',after.draft,before,after,after.clearReason||'HOLD 해제');return r};f.__gov=true;window.clearLotHold=f;}
    const oldAddReq=window.addRequest;
    if(typeof oldAddReq==='function'&&!oldAddReq.__gov){const f=function(){const draft=document.getElementById('rDraft')?.value.trim()||'';const before=(s.requests||[]).length;const r=oldAddReq.apply(this,arguments);if((s.requests||[]).length>before){const x=(s.requests||[]).find(z=>z.draft===draft);if(x){x.createdBy=actorText();x.createdAt=now();x.processVersion=PROCESS_VERSION;}linkLatestDocument('pdfFileInput',draft);audit('CREATE','생산 작업요청',draft,null,x||{},'작업요청 접수');}return r};f.__gov=true;window.addRequest=f;}
    const oldQReq=window.addQualityRequest;
    if(typeof oldQReq==='function'&&!oldQReq.__gov){const f=function(){const draft=document.getElementById('qDraft')?.value.trim()||'';const r=oldQReq.apply(this,arguments);linkLatestDocument('qPdfFileInput',draft);audit('CREATE','품질 검사 요청',draft,null,{draft},'품질 검사 요청 등록');return r};f.__gov=true;window.addQualityRequest=f;}
    const oldIssue=window.registerMaterialIssue;
    if(typeof oldIssue==='function'&&!oldIssue.__gov){const f=function(){const draft=document.getElementById('iDraft')?.value.trim()||'';const r=oldIssue.apply(this,arguments);linkLatestDocument('issuePdf',draft);audit('CREATE','자재 불출 요청',draft,null,{draft},'자재 불출 요청 등록');return r};f.__gov=true;window.registerMaterialIssue=f;}
  }

  function bindFileCapture(){
    document.addEventListener('change',e=>{const t=e.target;if(t&&t.matches('input[type="file"]')&&documentTypeForInput(t.id))captureDocument(t);},true);
  }

  function refreshEnhancements(){
    ensureNavAndSections();renderUserBadge();renderAdmin();removeDeleteControls();decorateLtcVersion();renderGovernedWorkLogs();renderGovernedInspectionHistory();wrapBusinessFunctions();
  }

  const oldRenderAll=window.renderAll;
  if(typeof oldRenderAll==='function'){window.renderAll=function(){const r=oldRenderAll.apply(this,arguments);setTimeout(refreshEnhancements,50);return r;};}
  const oldRenderTest=window.renderTest;
  if(typeof oldRenderTest==='function'){window.renderTest=function(){const r=oldRenderTest.apply(this,arguments);setTimeout(refreshEnhancements,100);return r;};}
  bindFileCapture();stampLtcVersions();
  setTimeout(refreshEnhancements,150);
  setInterval(()=>{removeDeleteControls();decorateLtcVersion();},1500);
})();
