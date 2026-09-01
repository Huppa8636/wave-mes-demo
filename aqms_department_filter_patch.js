// AQMS department filter - process/procedure/output views.
(function(){
 const KEY='wave_mes_aqms_docs_v2';
 let dept='전체';
 let running=false;
 const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}};
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function ownerParts(owner){return String(owner||'').split(/[\/,·&]+/).map(x=>x.trim()).filter(Boolean)}
 function ownerMatch(owner,target){return target==='전체'||ownerParts(owner).includes(target)||String(owner||'').trim()===target}
 function ensureStyle(){
   if(document.getElementById('aqmsDeptFilterStyle'))return;
   const s=document.createElement('style');s.id='aqmsDeptFilterStyle';s.textContent=`
     #aqmsView .aq-tabs{align-items:center;width:100%}
     #aqmsView .aq-dept-controls{margin-left:auto;display:flex;align-items:center;justify-content:flex-end;gap:5px;flex-wrap:wrap}
     #aqmsView .aq-dept-label{font-size:10px;font-weight:900;color:#657684;margin-right:2px;white-space:nowrap}
     #aqmsView .aq-dept-controls button{padding:7px 10px;border:1px solid #cddce5;background:#f8fbfc;color:#486271;border-radius:8px;font-size:10px;font-weight:800;cursor:pointer}
     #aqmsView .aq-dept-controls button.on{background:#245edb;border-color:#245edb;color:#fff}
     #aqmsView .aq-output-filter-empty td{padding:28px!important;text-align:center!important;color:#748493!important;background:#fafcfd!important}
     @media(max-width:1150px){#aqmsView .aq-dept-controls{width:100%;margin-left:0;justify-content:flex-start;padding-top:3px}}
   `;document.head.appendChild(s)
 }
 function owners(){
   const preferred=['품질','생산','제조','연구소','구매','영업','경영'];
   const set=[...new Set(load().filter(x=>!x.inactive).flatMap(x=>ownerParts(x.owner)))];
   return [...preferred.filter(x=>set.includes(x)),...set.filter(x=>!preferred.includes(x)).sort((a,b)=>a.localeCompare(b,'ko'))]
 }
 function currentTab(){return document.querySelector('#aqmsView [data-tab].on')?.dataset.tab||'전체'}
 function applyDocumentList(docs){
   const byId=new Map(docs.map(x=>[x.id,x]));
   document.querySelectorAll('#aqListV2 .aq-row[data-aqid]').forEach(r=>{
     const d=byId.get(r.dataset.aqid);
     const visible=!!d&&!d.inactive&&ownerMatch(d.owner,dept);
     r.style.display=visible?'':'none';
   });
 }
 function applyOutputs(docs){
   if(currentTab()!=='산출물')return;
   const tbody=document.querySelector('#aqV2Body table.aq-hist tbody');if(!tbody)return;
   tbody.querySelector('.aq-output-filter-empty')?.remove();
   const rows=[...tbody.querySelectorAll(':scope>tr')];let shown=0;
   rows.forEach(r=>{
     const cells=r.querySelectorAll('td');if(cells.length<2)return;
     const output=(cells[0].innerText||'').trim();
     const linked=docs.filter(d=>!d.inactive&&(d.outputs||[]).includes(output));
     const matched=dept==='전체'?linked:linked.filter(d=>ownerMatch(d.owner,dept));
     const visible=matched.length>0;
     r.style.display=visible?'':'none';
     if(visible){
       shown++;
       cells[1].innerHTML=matched.map(d=>`${esc(d.no)} ${esc(d.title)} <span style="color:#7a8790">/ ${esc(d.owner)}</span>`).join('<br>');
     }
   });
   if(!shown){const tr=document.createElement('tr');tr.className='aq-output-filter-empty';tr.innerHTML=`<td colspan="2">${esc(dept)} 부서에 연결된 양식 / 산출물이 없습니다.</td>`;tbody.appendChild(tr)}
 }
 function apply(){
   const docs=load();
   applyDocumentList(docs);
   applyOutputs(docs);
   const controls=document.querySelector('#aqmsView .aq-dept-controls');
   if(controls)controls.style.display=currentTab()==='이력'?'none':'flex';
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
       controls.innerHTML='<span class="aq-dept-label">주관부서</span>'+['전체',...names].map(x=>`<button type="button" data-dept="${esc(x)}" class="${x===dept?'on':''}">${x==='전체'?'전체부서':esc(x)}</button>`).join('');
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