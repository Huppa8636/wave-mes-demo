// WAVEPIA branded DEMO login for GitHub Pages PoC
// Static credentials below are for TEST only. Production must use server-side authentication and hashed passwords.
(function(){
  const CURRENT_USER_KEY='wave_mes_current_user_v1';
  const LOGIN_KEY='wave_mes_demo_login_v2';
  const LOGO='https://wavepia.com/upload/history/20240806081208_a672d359.png';
  const ACCOUNTS={
    admin:{pass:'Wavepia!2026',userId:'U-ADMIN',name:'DEMO 관리자',role:'관리자'},
    prod:{pass:'Prod!2026',userId:'U-PROD',name:'DEMO 생산',role:'생산'},
    qa:{pass:'Quality!2026',userId:'U-QA',name:'DEMO 품질',role:'품질'},
    purchase:{pass:'Purchase!2026',userId:'U-PUR',name:'DEMO 구매',role:'구매'},
    sales:{pass:'Sales!2026',userId:'U-SALES',name:'DEMO 영업',role:'영업'},
    rnd:{pass:'Rnd!2026',userId:'U-RND',name:'DEMO 개발',role:'개발'},
    mgmt:{pass:'Mgmt!2026',userId:'U-MGMT',name:'DEMO 경영',role:'경영'},
    guest:{pass:'Guest!2026',userId:'U-GUEST',name:'DEMO 손님',role:'손님'}
  };
  const ROLE_NAV={
    관리자:['dash','req','reqs','qreq','ltc','test','inv','issue','quality','audit','admin'],
    생산:['dash','reqs','ltc','test','inv','quality'],
    품질:['dash','reqs','qreq','ltc','test','inv','quality','audit'],
    구매:['dash','reqs','inv','issue'],
    영업:['dash','req','reqs','ltc','quality'],
    개발:['dash','reqs','ltc','quality'],
    경영:['dash','reqs','ltc','inv','quality','audit'],
    손님:['dash']
  };
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function addStyle(){
    if(document.getElementById('wavepiaBrandStyleV2'))return;
    const s=document.createElement('style');s.id='wavepiaBrandStyleV2';s.textContent=`
      :root{--wp-blue:#0878bd;--wp-light:#86d2ee;--wp-deep:#0a436c;--wp-ink:#273842;--wp-soft:#eef9fd}
      body{background:#f4f9fc!important;color:var(--wp-ink)!important}.side{background:linear-gradient(180deg,#073d63,#0b527f)!important}.nav button.active,.nav button:hover{background:#0b78b5!important;color:#fff!important}.primary{background:var(--wp-blue)!important}.badge{background:#e7f7fd!important;color:#0878bd!important}.trace{color:#0878bd!important}.progress i,.mini-progress i{background:#1aa6d9!important}.notice{background:#eef9fd!important;border-color:#c7e7f4!important;color:#245b78!important}.card,.metric{border-color:#d7e8f1!important}
      .brand{font-size:0!important;background:#fff!important;border-radius:10px!important;padding:8px!important;margin-bottom:18px!important}.brand:before{content:'';display:block;height:58px;background:url('${LOGO}') center/contain no-repeat}.brand small{display:block!important;font-size:9px!important;text-align:center!important;color:#66808e!important;margin-top:4px!important}
      #wpLoginOverlay{position:fixed;inset:0;z-index:999999;background:linear-gradient(135deg,#e9f8fd,#fbfdfe 52%,#dff3fb);display:flex;align-items:center;justify-content:center;padding:20px}
      #wpLoginCard{width:min(430px,94vw);background:#fff;border:1px solid #cfe7f1;border-radius:20px;box-shadow:0 24px 70px #0a436c26;padding:34px}
      #wpLoginLogo{height:105px;background:url('${LOGO}') center/contain no-repeat;margin-bottom:14px}#wpLoginCard h2{margin:0 0 6px;text-align:center;font-size:22px;color:#15394e}#wpLoginCard p{text-align:center;margin:0 0 24px;color:#718692;font-size:11px}
      .wp-field{margin-bottom:12px}.wp-field label{display:block;font-size:10px;color:#607783;margin-bottom:5px}.wp-field input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #cfdfe7;border-radius:9px;outline:none}.wp-field input:focus{border-color:#1aa6d9;box-shadow:0 0 0 3px #1aa6d91c}
      #wpLoginBtn{width:100%;border:0;border-radius:10px;padding:12px;background:#0878bd;color:#fff;font-weight:800;cursor:pointer}.wp-login-note{margin-top:14px;padding:10px;border-radius:8px;background:#fff8e6;color:#7a5a16;font-size:9px;line-height:1.5}
      #wpSessionBar{display:flex;align-items:center;gap:8px;margin-left:auto;margin-right:8px;font-size:10px}.wp-user-chip{padding:6px 9px;border-radius:14px;background:#eaf8fd;color:#075f91;font-weight:800}#wpLogout{border:1px solid #c8dce7;background:white;border-radius:8px;padding:6px 9px;cursor:pointer}
    `;document.head.appendChild(s);
  }
  function state(){try{return JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return null}}
  function applyRole(role){
    const allowed=ROLE_NAV[role]||['dash'];
    document.querySelectorAll('#nav button').forEach(b=>{b.style.display=allowed.includes(b.dataset.v)?'':'none'});
    const old=document.getElementById('demoUserWrap');if(old)old.style.display='none';
    const current=document.querySelector('#nav button.active');if(current&&current.style.display==='none'){const dash=document.querySelector('#nav [data-v="dash"]');if(dash)dash.click();}
  }
  function renderSession(a){
    const top=document.querySelector('.top');if(!top)return;let x=document.getElementById('wpSessionBar');if(!x){x=document.createElement('div');x.id='wpSessionBar';const badge=top.querySelector('.badge');if(badge)top.insertBefore(x,badge);else top.appendChild(x)}
    x.innerHTML=`<span class="wp-user-chip">${esc(a.name)} / ${esc(a.role)}</span><button id="wpLogout">로그아웃</button>`;document.getElementById('wpLogout').onclick=logout;
  }
  function showLogin(){
    if(document.getElementById('wpLoginOverlay'))return;
    const o=document.createElement('div');o.id='wpLoginOverlay';o.innerHTML=`<div id="wpLoginCard"><div id="wpLoginLogo"></div><h2>WAVEPIA ERP · MES</h2><p>사내 업무 통합 시스템 · WEB DEMO</p><div class="wp-field"><label>아이디</label><input id="wpId" autocomplete="username" placeholder="아이디 입력"></div><div class="wp-field"><label>비밀번호</label><input id="wpPw" type="password" autocomplete="current-password" placeholder="비밀번호 입력"></div><button id="wpLoginBtn">로그인</button><div id="wpLoginMsg" style="margin-top:9px;color:#b22936;font-size:10px;min-height:14px"></div><div class="wp-login-note"><b>DEMO 인증</b><br>현재 GitHub Pages에서는 역할/화면 흐름 검증용입니다. 정식 운영 시 서버 로그인, 암호화된 비밀번호, API 권한검증으로 교체합니다.</div></div>`;document.body.appendChild(o);
    const go=()=>{const id=document.getElementById('wpId').value.trim().toLowerCase(),pw=document.getElementById('wpPw').value,a=ACCOUNTS[id];if(!a||a.pass!==pw){document.getElementById('wpLoginMsg').textContent='아이디 또는 비밀번호가 올바르지 않습니다.';return}const st={id,userId:a.userId,name:a.name,role:a.role,at:new Date().toISOString()};sessionStorage.setItem(LOGIN_KEY,JSON.stringify(st));localStorage.setItem(CURRENT_USER_KEY,a.userId);o.remove();applyRole(a.role);renderSession(a);try{window.waveMesAudit?.('LOGIN','사용자 세션','',null,{user:a.name,role:a.role},'DEMO 로그인')}catch(e){}};
    document.getElementById('wpLoginBtn').onclick=go;document.getElementById('wpId').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('wpPw').focus()});document.getElementById('wpPw').addEventListener('keydown',e=>{if(e.key==='Enter')go()});setTimeout(()=>document.getElementById('wpId')?.focus(),50);
  }
  function logout(){const st=state();try{window.waveMesAudit?.('LOGOUT','사용자 세션','',st,null,'DEMO 로그아웃')}catch(e){}sessionStorage.removeItem(LOGIN_KEY);location.reload()}
  function init(){addStyle();const st=state();if(st&&ACCOUNTS[st.id]){localStorage.setItem(CURRENT_USER_KEY,st.userId);applyRole(st.role);renderSession(st)}else showLogin();}
  setTimeout(init,160);
})();