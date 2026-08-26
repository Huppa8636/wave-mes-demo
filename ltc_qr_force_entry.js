// Hard QR entry controller: URL/QR -> Field LTC view -> populate LOT -> lookup.
(function(){
  const LOGIN_KEY='wave_mes_demo_login_v2';
  function target(){
    try{
      const raw=decodeURIComponent(location.href);
      const u=new URL(location.href);
      const q=(u.searchParams.get('ltc')||'').trim();
      if(q)return q;
      const m=raw.match(/LTC___([A-Za-z0-9_.\/-]+)/i)||raw.match(/___([A-Za-z0-9_.\/-]+)/i);
      return m?m[1].trim():'';
    }catch(e){return ''}
  }
  const code=target();
  if(!code)return;
  window.waveMesDeepLinkActive=true;
  window.waveMesDeepLinkTarget=code;

  function loggedIn(){try{return !!JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return false}}
  function forceView(){
    const view=document.getElementById('test');
    const scan=document.getElementById('scan');
    if(!loggedIn()||!view||!scan)return false;

    // Directly set view/nav state so no legacy show/landing handler can leave dashboard active.
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='test'));
    document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.v==='test'));
    const title=document.getElementById('title'); if(title)title.textContent='현장 LTC 입력 TEST';
    const sub=document.getElementById('sub'); if(sub)sub.textContent='QR/바코드 조회 후 최소 입력으로 공정실적을 등록합니다.';

    scan.value=code;
    scan.dispatchEvent(new Event('input',{bubbles:true}));
    scan.dispatchEvent(new Event('change',{bubbles:true}));
    if(typeof window.lookup==='function')window.lookup();
    try{window.scrollTo(0,0)}catch(e){}
    return true;
  }

  let attempts=0, lookedUp=false;
  const timer=setInterval(()=>{
    attempts++;
    if(forceView()){
      lookedUp=true;
      // Keep owning navigation for startup race conditions, then release.
      if(attempts>20){clearInterval(timer);window.waveMesDeepLinkActive=false;}
    }else if(attempts>80){clearInterval(timer);window.waveMesDeepLinkActive=false;}
  },150);

  // Reassert if any delayed handler tries to switch away during startup.
  document.addEventListener('click',()=>{
    if(window.waveMesDeepLinkActive&&!lookedUp)setTimeout(forceView,0);
  },true);
})();
