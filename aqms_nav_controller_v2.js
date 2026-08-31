// WAVEPIA AQMS navigation controller v2
// Single owner for AQMS menu placement/click behavior. Loaded last to avoid patch conflicts.
(function(){
 const LOGIN_KEY='wave_mes_demo_login_v2';
 const session=()=>{try{return JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return null}};
 const canSee=()=>session()?.role!=='손님';
 let mutating=false;

 function ensureStyle(){
   if(document.getElementById('aqmsNavControllerV2Style'))return;
   const s=document.createElement('style');
   s.id='aqmsNavControllerV2Style';
   s.textContent=`
     #nav [data-group="g-doc"]{margin-top:16px!important;padding-top:10px!important;border-top:1px solid rgba(255,255,255,.2)!important;border-bottom:0!important}
     #nav [data-group="g-doc"]>.aqms-group-label,#nav [data-group="g-admin"]>.aqms-group-label{display:none!important}
     #nav [data-group="g-doc"]>button,#nav [data-group="g-admin"]>button{display:block!important;margin:2px 0!important;padding:10px 11px!important;font-size:12px!important}
     #nav [data-group="g-admin"]{border-bottom:0!important}
     #nav [data-group="g-aqms"]{margin-top:4px!important}
   `;
   document.head.appendChild(s);
 }

 function hideAqms(){
   const v=document.getElementById('aqmsView');
   if(v){v.style.display='none';v.classList.remove('active')}
   document.querySelectorAll('#nav [data-v="aqms"]').forEach(b=>b.classList.remove('active'));
 }

 function openAqms(btn,group){
   if(!canSee())return;
   document.querySelectorAll('#nav .aqms-group').forEach(g=>g.classList.remove('open'));
   group?.classList.add('open');
   try{
     if(window.waveAqmsV2 && typeof window.waveAqmsV2.show==='function') window.waveAqmsV2.show();
     const v=document.getElementById('aqmsView');
     if(v){
       document.querySelectorAll('.view').forEach(x=>{if(x!==v){x.style.display='none';x.classList.remove('active')}});
       v.style.display='block';v.classList.add('active');
     }
     document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b===btn));
     window.scrollTo(0,0);
   }catch(err){console.error('[AQMS NAV V2]',err)}
 }

 function ensure(){
   if(mutating)return;
   const nav=document.getElementById('nav');if(!nav)return;
   mutating=true;ensureStyle();
   try{
     let group=nav.querySelector(':scope>[data-group="g-aqms"]');
     if(!group){
       group=document.createElement('div');group.className='aqms-group';group.dataset.group='g-aqms';
       const label=document.createElement('div');label.className='aqms-group-label';label.textContent='AQMS';group.appendChild(label);
     }
     let btn=group.querySelector(':scope>[data-v="aqms"]');
     if(!btn){btn=document.createElement('button');btn.dataset.v='aqms';btn.textContent='프로세스 / 지침서';group.appendChild(btn)}
     const label=group.querySelector(':scope>.aqms-group-label');
     if(label)label.textContent='AQMS';

     // Fixed bottom order: ... business groups -> AQMS -> Audit/Timeline -> Admin -> footer.
     const doc=nav.querySelector(':scope>[data-group="g-doc"]');
     const admin=nav.querySelector(':scope>[data-group="g-admin"]');
     nav.appendChild(group);
     if(doc)nav.appendChild(doc);
     if(admin)nav.appendChild(admin);

     const visible=canSee();group.style.display=visible?'':'none';btn.style.display=visible?'':'none';

     // Replace any earlier handlers. Clicking either AQMS header or submenu opens AQMS reliably.
     btn.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();openAqms(btn,group)};
     if(label)label.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();openAqms(btn,group)};
   }finally{mutating=false}
 }

 // AQMS must disappear immediately when a different menu is selected.
 document.addEventListener('click',function(e){
   const b=e.target.closest('#nav button');
   if(b && b.dataset.v!=='aqms') hideAqms();
 },true);

 function boot(){
   ensure();
   const nav=document.getElementById('nav');
   if(nav)new MutationObserver(()=>requestAnimationFrame(ensure)).observe(nav,{childList:true,subtree:false});
 }
 setTimeout(boot,200);setTimeout(ensure,700);setTimeout(ensure,1400);
 document.addEventListener('click',e=>{if(e.target?.id==='wpLoginBtn'||e.target?.id==='wpLogout')setTimeout(ensure,150)});
 window.waveAqmsNavV2={ensure,open:()=>{ensure();const g=document.querySelector('#nav [data-group="g-aqms"]');const b=g?.querySelector('[data-v="aqms"]');if(b)openAqms(b,g)}};
})();