// WAVEPIA MES - QR / URL deep link to Field LTC
(function(){
  const LOGIN_KEY='wave_mes_demo_login_v2';
  let handled=false, tries=0;

  function getTarget(){
    try{
      const u=new URL(location.href);
      const q=(u.searchParams.get('ltc')||'').trim();
      if(q)return q;
      // Legacy QR support: ...___20260826-0001
      const raw=decodeURIComponent(location.href);
      const m=raw.match(/___\s*([A-Za-z0-9_.\/-]+)/);
      return m?m[1].trim():'';
    }catch(e){return ''}
  }
  const target=getTarget();
  if(!target)return;

  function session(){try{return JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return null}}

  function openLtc(){
    if(handled)return true;
    tries++;
    // 로그인 전이면 로그인 화면을 그대로 보여주고 로그인 완료까지 기다린다.
    if(!session())return false;
    if(typeof window.show!=='function'||typeof window.lookup!=='function')return false;
    const input=document.getElementById('scan');
    const view=document.getElementById('test');
    if(!input||!view)return false;

    // 역할상 현장 LTC 메뉴 접근이 차단된 경우 임의 우회하지 않는다.
    const nav=document.querySelector('#nav [data-v="test"]');
    if(nav && nav.style.display==='none'){
      handled=true;
      alert('현재 로그인 계정에는 현장 LTC 입력 권한이 없습니다.\n생산 / 품질 / 관리자 계정으로 로그인해 주세요.');
      return true;
    }

    handled=true;
    window.show('test');
    input.value=target;
    window.lookup();
    try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch(e){window.scrollTo(0,0)}
    setTimeout(()=>{
      const info=document.getElementById('scanInfo');
      if(info && /찾지 못했습니다/.test(info.textContent||'')){
        alert('QR의 LTC / 중심추적번호를 찾지 못했습니다.\n번호: '+target);
        input.focus();input.select();
      }
    },120);
    return true;
  }

  // 이미 로그인된 세션이면 즉시, 아니면 로그인 성공 직후 자동 진입.
  if(!openLtc()){
    const timer=setInterval(()=>{
      if(openLtc()||tries>240)clearInterval(timer);
    },250);
  }
})();
