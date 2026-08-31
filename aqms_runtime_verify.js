// AQMS runtime verifier / non-invasive self test
(function(){
  const LOGIN_KEY='wave_mes_demo_login_v2';
  function verify(){
    const navRoot=document.getElementById('nav');
    const nav=navRoot?.querySelector('[data-v="aqms"]');
    const group=navRoot?.querySelector('[data-group="g-aqms"]');
    const doc=navRoot?.querySelector('[data-group="g-doc"]');
    const admin=navRoot?.querySelector('[data-group="g-admin"]');
    const view=document.getElementById('aqmsView');
    const children=navRoot?[...navRoot.children]:[];
    const gi=group?children.indexOf(group):-1,di=doc?children.indexOf(doc):-1,ai=admin?children.indexOf(admin):-1;
    const viewer=document.querySelector('#aqDetailV2 .aq-controlled-open');
    const result={
      at:new Date().toISOString(),
      nav:!!nav,
      view:!!view,
      master:!!view&&/프로세스/.test(view.innerText||'')&&/지침서/.test(view.innerText||''),
      controlled:typeof window.waveMesOpenControlledAqms==='function',
      viewerButton:!!viewer,
      show:typeof window.waveAqmsV2?.show==='function',
      labelHandler:typeof group?.querySelector(':scope>.aqms-group-label')?.onclick==='function',
      buttonHandler:typeof nav?.onclick==='function',
      order:gi>=0&&di>gi&&ai>di,
      utilityPinned:!!doc&&getComputedStyle(doc).marginTop==='auto',
      role:false
    };
    try{const s=JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null');result.role=!s||s.role==='손님'||(!!nav&&nav.style.display!=='none')}catch(e){}
    result.ok=result.nav&&result.view&&result.master&&result.controlled&&result.show&&result.labelHandler&&result.buttonHandler&&result.order&&result.role;
    window.waveAqmsSelfTest=result;
    if(!result.ok)console.error('[AQMS SELF TEST FAIL]',result);else console.info('[AQMS SELF TEST PASS]',result);
    return result;
  }
  setTimeout(verify,700);setTimeout(verify,1600);setInterval(verify,5000);
  window.waveAqmsVerify=verify;
})();