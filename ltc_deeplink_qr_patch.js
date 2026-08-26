// WAVEPIA MES - QR / URL deep link to Field LTC
(function(){
  const LOGIN_KEY='wave_mes_demo_login_v2';
  let tries=0, finished=false;

  function getTarget(){
    try{
      const u=new URL(location.href);
      const q=(u.searchParams.get('ltc')||'').trim();
      if(q)return q;
      const raw=decodeURIComponent(location.href);
      const m=raw.match(/(?:LTC)?___\s*([A-Za-z0-9_.\/-]+)/i);
      return m?m[1].trim():'';
    }catch(e){return ''}
  }
  const target=getTarget();
  if(!target)return;

  // Other startup/role patches must not redirect a QR deep-link back to dashboard.
  window.waveMesDeepLinkActive=true;
  window.waveMesDeepLinkTarget=target;

  function session(){try{return JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return null}}
  function fieldVisible(){const v=document.getElementById('test');return !!v && getComputedStyle(v).display!=='none'}
  function ensureFieldLtc(){
    if(finished)return true;
    tries++;
    if(!session())return false;
    if(typeof window.show!=='function'||typeof window.lookup!=='function')return false;
    const input=document.getElementById('scan');
    const view=document.getElementById('test');
    if(!input||!view)return false;

    const nav=document.querySelector('#nav [data-v="test"]');
    if(nav && getComputedStyle(nav).display==='none'){
      finished=true;
      alert('현재 로그인 계정에는 현장 LTC 입력 권한이 없습니다.\n생산 / 품질 / 관리자 계정으로 로그인해 주세요.');
      return true;
    }

    // Force the actual Field LTC category first, then inject LOT and execute the same lookup as the 조회 button.
    window.show('test');
    input.value=target;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    window.lookup();

    // Some startup patches render dashboard after this script. Reassert Field LTC a few times,
    // but do NOT re-run lookup after the first successful population.
    let n=0;
    const hold=setInterval(()=>{
      n++;
      if(typeof window.show==='function'&&!fieldVisible())window.show('test');
      const scan=document.getElementById('scan');
      if(scan && scan.value!==target)scan.value=target;
      if(n>=12){clearInterval(hold);finished=true;window.waveMesDeepLinkActive=false;}
    },150);

    try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch(e){window.scrollTo(0,0)}
    setTimeout(()=>{
      const info=document.getElementById('scanInfo');
      if(info && /찾지 못했습니다/.test(info.textContent||'')){
        alert('QR의 LTC / 중심추적번호를 찾지 못했습니다.\n번호: '+target);
        input.focus();input.select();
      }
    },500);
    return true;
  }

  if(!ensureFieldLtc()){
    const timer=setInterval(()=>{
      if(ensureFieldLtc()||tries>240)clearInterval(timer);
    },250);
  }
})();
