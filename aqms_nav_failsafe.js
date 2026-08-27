// AQMS navigation fail-safe: keep AQMS visible and make click reliably open the AQMS center.
(function(){
  const LOGIN_KEY='wave_mes_demo_login_v2';
  function session(){try{return JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return null}}
  function canSee(){return session()?.role!=='손님'}

  function fallbackShow(btn){
    const v=document.getElementById('aqmsView');
    if(!v)return false;
    document.querySelectorAll('.view').forEach(x=>{x.style.display='none';x.classList.remove('active')});
    v.style.display='block';v.classList.add('active');
    document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b===btn));
    const t=document.getElementById('title');if(t)t.textContent='AQMS 통합 관리';
    const s=document.getElementById('sub');if(s)s.textContent='회사 AQMS 규격표 기준 프로세스 · 지침서 · 승인문서 · 산출물 · Rev / 변경이력';
    // v2 module renders body only when render/show runs. If its public show exists, use it.
    try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch(e){window.scrollTo(0,0)}
    return true;
  }

  function activate(btn){
    try{
      // Primary path: use the AQMS module's own renderer. This creates/refreshes cards, tabs and detail data.
      if(window.waveAqmsV2 && typeof window.waveAqmsV2.show==='function'){
        window.waveAqmsV2.show();
        document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b===btn));
        return;
      }
      fallbackShow(btn);
    }catch(e){
      console.error('[AQMS] open failed',e);
      fallbackShow(btn);
    }
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
    // Overwrite old/stale handlers every pass so another late module cannot leave a dead button.
    btn.onclick=function(e){e.preventDefault();e.stopPropagation();activate(btn)};
    const visible=canSee();
    btn.style.display=visible?'':'none';
    if(group){group.classList.toggle('empty',!visible); if(visible)group.style.display='';}

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

  function selfCheck(){
    const btn=document.querySelector('#nav [data-v="aqms"]');
    const view=document.getElementById('aqmsView');
    const api=!!(window.waveAqmsV2&&typeof window.waveAqmsV2.show==='function');
    console.info('[AQMS CHECK]',{menu:!!btn,view:!!view,renderer:api,role:session()?.role||'none'});
  }

  setTimeout(ensure,250);setTimeout(ensure,700);setTimeout(ensure,1400);setTimeout(selfCheck,1700);
  setInterval(ensure,2500);
  document.addEventListener('click',e=>{if(e.target?.id==='wpLoginBtn'||e.target?.id==='wpLogout')setTimeout(ensure,250)});
})();