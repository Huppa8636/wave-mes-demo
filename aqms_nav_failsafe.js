// AQMS navigation fail-safe: keep AQMS visible after login/accordion race conditions.
(function(){
  const LOGIN_KEY='wave_mes_demo_login_v2';
  function session(){try{return JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return null}}
  function canSee(){return session()?.role!=='손님'}
  function activate(btn){
    try{
      document.querySelectorAll('.view').forEach(v=>{v.style.display='none';v.classList.remove('active')});
      const v=document.getElementById('aqmsView');
      if(v){v.style.display='block';v.classList.add('active')}
      document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b===btn));
      const t=document.getElementById('title');if(t)t.textContent='AQMS 통합 관리';
      const s=document.getElementById('sub');if(s)s.textContent='프로세스 / 지침서 / 승인문서 / 산출물 / Rev·변경이력을 통합 관리합니다.';
      window.scrollTo(0,0);
    }catch(e){}
  }
  function ensure(){
    const nav=document.getElementById('nav'); if(!nav)return;
    let btn=nav.querySelector('[data-v="aqms"]');
    let group=btn?.closest('.aqms-group');
    if(!btn){
      group=document.createElement('div');group.className='aqms-group';group.dataset.group='g-aqms';
      const label=document.createElement('div');label.className='aqms-group-label';label.textContent='AQMS';group.appendChild(label);
      btn=document.createElement('button');btn.dataset.v='aqms';btn.textContent='프로세스 / 지침서';group.appendChild(btn);
      const admin=nav.querySelector('[data-group="g-admin"]');nav.insertBefore(group,admin||null);
    }
    btn.onclick=()=>activate(btn);
    const visible=canSee();
    btn.style.display=visible?'':'none';
    if(group){group.classList.toggle('empty',!visible); if(visible)group.style.display='';}
    // Bind accordion label even if the enterprise layer initialized earlier.
    const label=group?.querySelector(':scope>.aqms-group-label');
    if(label && label.dataset.aqmsSafeBound!=='1'){
      label.dataset.aqmsSafeBound='1';
      label.addEventListener('click',()=>{
        const was=group.classList.contains('open');
        document.querySelectorAll('#nav .aqms-group').forEach(g=>g.classList.remove('open'));
        if(!was)group.classList.add('open');
      });
    }
  }
  setTimeout(ensure,300);setTimeout(ensure,900);setTimeout(ensure,1800);
  setInterval(ensure,2500);
  document.addEventListener('click',e=>{if(e.target?.id==='wpLoginBtn'||e.target?.id==='wpLogout')setTimeout(ensure,250)});
})();