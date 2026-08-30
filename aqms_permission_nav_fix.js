// AQMS permission + navigation isolation + utility placement
(function(){
 const LOGIN_KEY='wave_mes_demo_login_v2';
 const session=()=>{try{return JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return null}};
 const role=()=>String(session()?.role||'');
 const canEdit=()=>['관리자','품질'].includes(role());
 function isAqmsActive(){const v=document.getElementById('aqmsView');return !!(v&&(v.classList.contains('active')||v.style.display==='block'));}
 function hideAqms(){const v=document.getElementById('aqmsView');if(v){v.classList.remove('active');v.style.display='none';}document.querySelectorAll('#nav [data-v="aqms"]').forEach(b=>b.classList.remove('active'));}
 function utilityBottom(){const nav=document.getElementById('nav');if(!nav)return;const doc=nav.querySelector('[data-group="g-doc"]'), admin=nav.querySelector('[data-group="g-admin"]');if(doc)nav.appendChild(doc);if(admin)nav.appendChild(admin);}
 function editButton(){const root=document.getElementById('aqmsView');if(!root)return;let b=document.getElementById('aqmsQualityEditBtn');if(!canEdit()){b?.remove();return;}if(!b){b=document.createElement('button');b.id='aqmsQualityEditBtn';b.textContent='AQMS 문서 / Rev 수정';b.style='position:absolute;right:18px;top:10px;padding:9px 13px;border:1px solid #087db8;border-radius:8px;background:#087db8;color:#fff;font-weight:800;z-index:3';root.style.position='relative';root.appendChild(b);}b.onclick=()=>{const up=document.getElementById('aqmsUploadBtn');if(up){up.click();return;}alert('수정 권한이 확인되었습니다. 문서를 선택한 뒤 신규 Rev 등록을 사용하세요.');};}
 // Any non-AQMS nav click must close AQMS before the original view handler runs.
 document.addEventListener('click',e=>{const b=e.target.closest('#nav button');if(!b)return;if(b.dataset.v!=='aqms')hideAqms();setTimeout(()=>{utilityBottom();if(isAqmsActive())editButton();},0);},true);
 function maintain(){utilityBottom();if(isAqmsActive())editButton();else document.getElementById('aqmsQualityEditBtn')?.remove();}
 setTimeout(maintain,300);setTimeout(maintain,1000);setInterval(maintain,2500);
 window.waveAqmsCanEdit=canEdit;
})();