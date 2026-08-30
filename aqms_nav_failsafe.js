// AQMS navigation fail-safe: keep AQMS visible and make both header/submenu open the AQMS screen.
(function(){
  const LOGIN_KEY='wave_mes_demo_login_v2';
  function session(){try{return JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return null}}
  function canSee(){return session()?.role!=='손님'}
  function showAqms(btn){
    try{
      if(window.waveAqmsV2 && typeof window.waveAqmsV2.show==='function'){
        window.waveAqmsV2.show();
      }else{
        const v=document.getElementById('aqmsView');
        if(!v)throw new Error('AQMS view missing');
        document.querySelectorAll('.view').forEach(x=>{x.style.display='none';x.classList.remove('active')});
        v.style.display='block';v.classList.add('active');
      }
      document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b===btn));
      const t=document.getElementById('title');if(t)t.textContent='AQMS 통합 관리';
      const s=document.getElementById('sub');if(s)s.textContent='회사 AQMS 규격표 기준 프로세스 · 지침서 · 산출물 · Rev / 변경이력';
      window.scrollTo(0,0);
      return true;
    }catch(e){console.error('[AQMS NAV]',e);return false}
  }
  function ensure(){
    const nav=document.getElementById('nav');if(!nav)return;
    let btn=nav.querySelector('[data-v="aqms"]');
    let group=btn?.closest('.aqms-group');
    if(!group){
      group=document.createElement('div');group.className='aqms-group';group.dataset.group='g-aqms';
      const label=document.createElement('div');label.className='aqms-group-label';label.textContent='AQMS';group.appendChild(label);
      btn=document.createElement('button');btn.dataset.v='aqms';btn.textContent='프로세스 / 지침서';group.appendChild(btn);
      const admin=nav.querySelector('[data-group="g-admin"]');nav.insertBefore(group,admin||null);
    }else if(!btn){
      btn=document.createElement('button');btn.dataset.v='aqms';btn.textContent='프로세스 / 지침서';group.appendChild(btn);
    }
    const visible=canSee();
    btn.style.display=visible?'':'none';group.style.display=visible?'':'none';group.classList.toggle('empty',!visible);
    btn.onclick=function(e){e.preventDefault();e.stopPropagation();showAqms(btn)};
    const label=group.querySelector(':scope>.aqms-group-label');
    if(label){
      label.textContent='AQMS';
      label.onclick=function(e){e.preventDefault();e.stopPropagation();
        document.querySelectorAll('#nav .aqms-group').forEach(g=>g.classList.remove('open'));
        group.classList.add('open');
        showAqms(btn);
      };
    }
  }
  function verify(){
    ensure();
    const btn=document.querySelector('#nav [data-v="aqms"]');
    const view=document.getElementById('aqmsView');
    const renderer=!!(window.waveAqmsV2&&typeof window.waveAqmsV2.show==='function');
    console.info('[AQMS VERIFY]',{button:!!btn,view:!!view,renderer});
  }
  setTimeout(verify,350);setTimeout(verify,1000);setTimeout(verify,2200);
  setInterval(ensure,3000);
  document.addEventListener('click',e=>{if(e.target?.id==='wpLoginBtn'||e.target?.id==='wpLogout')setTimeout(verify,300)});
})();