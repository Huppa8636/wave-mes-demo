// WAVEPIA MES role/workflow hardening for GitHub DEMO
// UI hiding alone is not authorization. This PoC also guards write functions client-side.
(function(){
  const LOGIN_KEY='wave_mes_demo_login_v2';
  const AUDIT=()=>window.waveMesAudit;
  const ROLE_PERMS={
    '관리자':['*'],
    '영업':['WORK_REQUEST_CREATE','WORK_REQUEST_VIEW','LTC_VIEW','QUALITY_VIEW','TIMELINE_VIEW'],
    '생산':['WORK_REQUEST_VIEW','LTC_VIEW','WORK_EXECUTE','LOT_HOLD','INVENTORY_VIEW','QUALITY_VIEW','TIMELINE_VIEW'],
    '품질':['WORK_REQUEST_VIEW','QUALITY_REQUEST_CREATE','LTC_VIEW','OQC_EXECUTE','LOT_HOLD','LOT_CLEAR','QUALITY_VIEW','TIMELINE_VIEW'],
    '구매':['WORK_REQUEST_VIEW','INVENTORY_VIEW','INVENTORY_EDIT','MATERIAL_ISSUE_CREATE','TIMELINE_VIEW'],
    '개발':['WORK_REQUEST_VIEW','LTC_VIEW','QUALITY_VIEW','TIMELINE_VIEW'],
    '경영':['WORK_REQUEST_VIEW','LTC_VIEW','INVENTORY_VIEW','QUALITY_VIEW','TIMELINE_VIEW','AUDIT_VIEW'],
    '손님':['DASH_VIEW']
  };
  const ROLE_LANDING={관리자:'dash',영업:'req',생산:'test',품질:'quality',구매:'inv',개발:'dash',경영:'dash',손님:'dash'};
  let lastRole='';

  function session(){try{return JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return null}}
  function role(){return session()?.role||'손님'}
  function actor(){const s=session();return s?`${s.name} / ${s.role}`:'미로그인'}
  function can(p){const a=ROLE_PERMS[role()]||[];return a.includes('*')||a.includes(p)}
  function deny(p){alert(`권한이 없습니다.\n현재 역할: ${role()}\n필요 권한: ${p}`);try{AUDIT()?.('ACCESS_DENIED','권한검사','',null,{permission:p,role:role()},'권한 없는 기능 접근 차단')}catch(e){};return false}
  window.waveMesPermission={can,role,actor,permissions:ROLE_PERMS};

  const ACTIONS=[
    // core production request creation (name differs by historical demo revisions)
    {names:['addReq','addRequest','registerRequest'],perm:'WORK_REQUEST_CREATE'},
    {names:['saveTest'],perm:'WORK_EXECUTE'},
    {names:['saveInspectionResult'],perm:'OQC_EXECUTE'},
    {names:['registerLotHold'],perm:'LOT_HOLD'},
    {names:['clearLotHold'],perm:'LOT_CLEAR'},
    {names:['addQualityRequest'],perm:'QUALITY_REQUEST_CREATE'},
    {names:['registerMaterialIssue'],perm:'MATERIAL_ISSUE_CREATE'},
    {names:['addInventoryItem','editInventoryItem','importEcountInventory','loadEcountInventory'],perm:'INVENTORY_EDIT'},
    {names:['waveMesEditUser'],perm:'ADMIN_ONLY'}
  ];
  const wrapped=new Set();
  function wrapAction(name,perm){
    if(wrapped.has(name))return;
    const fn=window[name];if(typeof fn!=='function')return;
    window[name]=function(){
      if(perm==='ADMIN_ONLY'&&role()!=='관리자')return deny('관리자');
      if(perm!=='ADMIN_ONLY'&&!can(perm))return deny(perm);
      return fn.apply(this,arguments);
    };
    wrapped.add(name);
  }
  function bindGuards(){ACTIONS.forEach(x=>x.names.forEach(n=>wrapAction(n,x.perm)))}

  function setDisabled(el,disabled,title){
    if(!el)return;el.disabled=!!disabled;
    if(disabled){el.dataset.roleDisabled='1';el.title=title||'현재 계정 권한으로 사용할 수 없습니다.';el.style.opacity='.48'}
    else if(el.dataset.roleDisabled==='1'){delete el.dataset.roleDisabled;el.title='';el.style.opacity=''}
  }
  function text(el){return (el.textContent||'').replace(/\s+/g,' ').trim()}
  function applyButtons(){
    const r=role();
    document.querySelectorAll('button').forEach(b=>{
      const t=text(b);
      // Login/logout/navigation are handled separately.
      if(b.id==='wpLoginBtn'||b.id==='wpLogout'||b.closest('#nav'))return;
      let perm='';
      if(/작업요청 접수|LTC 생성/.test(t))perm='WORK_REQUEST_CREATE';
      else if(/작업 완료 등록/.test(t))perm='WORK_EXECUTE';
      else if(/OQC 검사 완료|검사 실적 등록/.test(t))perm='OQC_EXECUTE';
      else if(/부적합 \/ LOT 정지/.test(t))perm='LOT_HOLD';
      else if(/HOLD 해제|부적합.*해제/.test(t))perm='LOT_CLEAR';
      else if(/품질 검사 요청 등록/.test(t))perm='QUALITY_REQUEST_CREATE';
      else if(/불출 요청 접수/.test(t))perm='MATERIAL_ISSUE_CREATE';
      else if(/E-Count ERP 재고 불러오기|재고 항목 추가|^수정$/.test(t)&&b.closest('#inv'))perm='INVENTORY_EDIT';
      else if(/사용자 등록|자격 수정|작업자 등록|검사자 등록/.test(t))perm='ADMIN_ONLY';
      if(perm){const ok=perm==='ADMIN_ONLY'?r==='관리자':can(perm);setDisabled(b,!ok,!ok?`현재 역할(${r})에서는 이 기능을 사용할 수 없습니다.`:'')}
    });
  }

  function applyViews(){
    const r=role();
    // audit/admin are sensitive even if someone manipulates hidden navigation.
    const audit=document.getElementById('audit'),admin=document.getElementById('admin');
    if(audit&&!(r==='관리자'||can('AUDIT_VIEW')))audit.style.display='none';
    if(admin&&r!=='관리자')admin.style.display='none';
    // Role-specific descriptions
    let b=document.getElementById('roleScopeNotice');
    const main=document.querySelector('main');
    if(main&&!b){b=document.createElement('div');b.id='roleScopeNotice';b.className='notice';b.style.cssText='margin:0 16px 10px;display:none';main.insertBefore(b,main.firstChild)}
    if(b){
      const label={
        관리자:'전체 설정 / 사용자 / 감사 / 모든 업무 기능',
        영업:'생산 작업요청 기안 및 진행현황 조회',
        생산:'현장 LTC 작업실적 / LOT HOLD / 진행현황 조회',
        품질:'품질검사 요청 / OQC / 부적합 HOLD·CLEAR',
        구매:'재고 현황 / E-Count 반영 / 자재 불출 요청',
        개발:'생산·품질 현황 조회 (개발 프로젝트 모듈 준비)',
        경영:'전사 현황 / 감사이력 조회 중심',
        손님:'통합현황 열람 전용'
      }[r]||'';
      b.innerHTML=`<b>${r} 계정 권한</b> / ${label}`;b.style.display='block';
    }
  }

  function forceLandingOnRoleChange(){
    const r=role();if(!session()||r===lastRole)return;lastRole=r;
    setTimeout(()=>{
      const target=ROLE_LANDING[r]||'dash';const btn=document.querySelector(`#nav [data-v="${target}"]`);
      if(btn&&getComputedStyle(btn).display!=='none')btn.click();
    },80);
  }

  // Workflow integrity checks before writes. Existing patches still perform process/OQC/HOLD checks.
  function validateContext(){
    // Any inactive/no login session must not be able to write.
    if(!session()){
      ['WORK_REQUEST_CREATE','WORK_EXECUTE','OQC_EXECUTE','LOT_HOLD','LOT_CLEAR','QUALITY_REQUEST_CREATE','MATERIAL_ISSUE_CREATE','INVENTORY_EDIT'].forEach(()=>{});
    }
  }

  function apply(){bindGuards();applyButtons();applyViews();forceLandingOnRoleChange();validateContext()}
  document.addEventListener('click',()=>setTimeout(apply,10));
  setInterval(apply,700);
  setTimeout(apply,220);
})();