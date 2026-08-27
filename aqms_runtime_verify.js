// AQMS runtime verifier / UI bridge
(function(){
  const LOGIN_KEY='wave_mes_demo_login_v2';
  function verify(){
    const result={at:new Date().toISOString(),nav:false,view:false,master:false,controlled:false,role:false};
    const nav=document.querySelector('#nav [data-v="aqms"]');
    const view=document.getElementById('aqmsView');
    result.nav=!!nav;
    result.view=!!view;
    result.master=!!view && /프로세스/.test(view.innerText||'') && /지침서/.test(view.innerText||'');
    result.controlled=typeof window.waveMesOpenControlledAqms==='function';
    try{const s=JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null');result.role=!s||s.role==='손님'||(!!nav&&nav.style.display!=='none')}catch(e){}
    result.ok=result.nav&&result.view&&result.master&&result.controlled&&result.role;
    window.waveAqmsSelfTest=result;
    if(!result.ok)console.error('[AQMS SELF TEST FAIL]',result);else console.info('[AQMS SELF TEST PASS]',result);
    addViewerButton();
    return result;
  }
  function addViewerButton(){
    const detail=document.getElementById('aqDetailV2');if(!detail)return;
    const text=detail.innerText||'';const m=text.match(/WPQ(?:M|P|I)-?\d+/i);if(!m)return;
    const box=[...detail.querySelectorAll('.aq-box')].find(x=>/현재 승인 문서/.test(x.innerText||''));if(!box||box.querySelector('.aq-controlled-open'))return;
    const b=document.createElement('button');b.className='btn primary aq-controlled-open';b.style.marginLeft='8px';b.textContent='승인본 열기';b.onclick=()=>window.waveMesOpenControlledAqms?.(m[0].toUpperCase(),text);box.appendChild(b);
  }
  setTimeout(verify,700);setTimeout(verify,1600);setInterval(()=>{verify()},3000);
})();