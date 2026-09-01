// AQMS department filter - right side of the top tab row.
(function(){
 const KEY='wave_mes_aqms_docs_v2';
 let dept='전체';
 let running=false;
 const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}};
 function ensureStyle(){
   if(document.getElementById('aqmsDeptFilterStyle'))return;
   const s=document.createElement('style');s.id='aqmsDeptFilterStyle';s.textContent=`
     #aqmsView .aq-tabs{align-items:center;width:100%}
     #aqmsView .aq-dept-controls{margin-left:auto;display:flex;align-items:center;justify-content:flex-end;gap:5px;flex-wrap:wrap}
     #aqmsView .aq-dept-label{font-size:10px;font-weight:900;color:#657684;margin-right:2px;white-space:nowrap}
     #aqmsView .aq-dept-controls button{padding:7px 10px;border:1px solid #cddce5;background:#f8fbfc;color:#486271;border-radius:8px;font-size:10px;font-weight:800;cursor:pointer}
     #aqmsView .aq-dept-controls button.on{background:#245edb;border-color:#245edb;color:#fff}
     @media(max-width:1150px){#aqmsView .aq-dept-controls{width:100%;margin-left:0;justify-content:flex-start;padding-top:3px}}
   `;document.head.appendChild(s)
 }
 function owners(){
   const preferred=['품질','생산','제조','연구소','구매','영업','경영'];
   const set=[...new Set(load().filter(x=>!x.inactive).map(x=>String(x.owner||'').trim()).filter(Boolean))];
   return [...preferred.filter(x=>set.includes(x)),...set.filter(x=>!preferred.includes(x)).sort((a,b)=>a.localeCompare(b,'ko'))]
 }
 function currentTab(){return document.querySelector('#aqmsView [data-tab].on')?.dataset.tab||'전체'}
 function apply(){
   const docs=load();const byId=new Map(docs.map(x=>[x.id,x]));
   document.querySelectorAll('#aqListV2 .aq-row[data-aqid]').forEach(r=>{
     const d=byId.get(r.dataset.aqid);
     const visible=!!d&&!d.inactive&&(dept==='전체'||String(d.owner||'')===dept);
     r.style.display=visible?'':'none';
   });
   const controls=document.querySelector('#aqmsView .aq-dept-controls');
   if(controls)controls.style.display=['산출물','이력'].includes(currentTab())?'none':'flex';
 }
 function ensure(){
   if(running)return;const root=document.getElementById('aqmsView');const tabs=root?.querySelector('.aq-tabs');if(!tabs)return;running=true;
   try{
     ensureStyle();
     let controls=tabs.querySelector('.aq-dept-controls');
     const names=owners();
     const signature=['전체',...names].join('|');
     if(!controls){controls=document.createElement('div');controls.className='aq-dept-controls';tabs.appendChild(controls)}
     if(controls.dataset.signature!==signature){
       controls.dataset.signature=signature;
       controls.innerHTML='<span class="aq-dept-label">주관부서</span>'+['전체',...names].map(x=>`<button type="button" data-dept="${x}" class="${x===dept?'on':''}">${x==='전체'?'전체부서':x}</button>`).join('');
       controls.querySelectorAll('[data-dept]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();dept=b.dataset.dept;controls.querySelectorAll('[data-dept]').forEach(x=>x.classList.toggle('on',x.dataset.dept===dept));apply()})
     }else controls.querySelectorAll('[data-dept]').forEach(x=>x.classList.toggle('on',x.dataset.dept===dept));
     apply();
   }finally{running=false}
 }
 setTimeout(ensure,350);setTimeout(ensure,900);
 const obs=new MutationObserver(()=>requestAnimationFrame(ensure));
 setTimeout(()=>{const root=document.getElementById('aqmsView');if(root)obs.observe(root,{childList:true,subtree:true})},800);
 document.addEventListener('input',e=>{if(e.target?.id==='aqSearchV2')setTimeout(apply,0)});
 window.waveAqmsDeptFilter={apply,reset(){dept='전체';ensure()}};
})();