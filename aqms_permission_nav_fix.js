// AQMS permission + navigation isolation + stable utility placement
(function(){
 const LOGIN_KEY='wave_mes_demo_login_v2';
 const session=()=>{try{return JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return null}};
 const role=()=>String(session()?.role||'');
 const canEdit=()=>['관리자','품질'].includes(role());
 let fixing=false;
 function hideAqms(){const v=document.getElementById('aqmsView');if(v){v.classList.remove('active');v.style.display='none';}document.querySelectorAll('#nav [data-v="aqms"]').forEach(b=>b.classList.remove('active'));}
 function ensureUtilityStyle(){if(document.getElementById('waveUtilityBottomStyle'))return;const s=document.createElement('style');s.id='waveUtilityBottomStyle';s.textContent=`
 #nav [data-group="g-doc"]{margin-top:18px!important;padding-top:10px!important;border-top:1px solid rgba(255,255,255,.18)!important}
 #nav [data-group="g-doc"]>.aqms-group-label,#nav [data-group="g-admin"]>.aqms-group-label{display:none!important}
 #nav [data-group="g-doc"]>button,#nav [data-group="g-admin"]>button{display:block!important;margin:2px 0!important;font-size:12px!important;padding:10px 11px!important}
 #nav [data-group="g-doc"],#nav [data-group="g-admin"]{border-bottom:0!important}
 #aqmsQualityEditBtn,#aqmsUploadBtn,#aqDetailV2>.head>.btn.secondary{display:none!important}
 `;document.head.appendChild(s)}
 function place(){if(fixing)return;const nav=document.getElementById('nav');if(!nav)return;fixing=true;ensureUtilityStyle();try{const aqms=nav.querySelector(':scope>[data-group="g-aqms"]');const doc=nav.querySelector(':scope>[data-group="g-doc"]');const admin=nav.querySelector(':scope>[data-group="g-admin"]');if(aqms)nav.appendChild(aqms);if(doc)nav.appendChild(doc);if(admin)nav.appendChild(admin);document.getElementById('aqmsQualityEditBtn')?.remove();document.getElementById('aqmsUploadBtn')?.remove();}finally{fixing=false}}
 document.addEventListener('click',e=>{const b=e.target.closest('#nav button');if(!b)return;if(b.dataset.v!=='aqms')hideAqms();requestAnimationFrame(place);},true);
 function boot(){place();const nav=document.getElementById('nav');if(nav)new MutationObserver(()=>requestAnimationFrame(place)).observe(nav,{childList:true,subtree:false});}
 setTimeout(boot,250);setTimeout(place,900);
 window.waveAqmsCanEdit=canEdit;
})();