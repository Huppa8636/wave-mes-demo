// WAVEPIA AQMS controlled-document patch - approved PDF viewer only; no external hyperlinks.
(function(){
 const DOCS='wave_mes_aqms_controlled_files_v1';
 const BAR_HTML='<b>승인 문서 관리</b><span style="font-size:12px;color:#52606d">일반 사용자: 등록된 승인본 열람 전용 · 품질/관리자: 각 문서의 수정 버튼에서 Rev·제목·산출물·승인 PDF 관리 · 기존 이력 보존</span>';
 let enhancing=false;
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const load=()=>{try{return JSON.parse(localStorage.getItem(DOCS)||'{}')}catch(e){return{}}};
 function addOpenButton(){
   const detail=document.getElementById('aqDetailV2');if(!detail)return;
   // The old global Rev button conflicts with per-row QA/Admin editing, so keep it hidden.
   detail.querySelector(':scope>.head>.btn.secondary')?.remove();
   const text=detail.innerText||'';const m=text.match(/WPQ(?:M|P|I)-?\d+/i);if(!m)return;
   const box=[...detail.querySelectorAll('.aq-box')].find(x=>/현재 승인 문서/.test(x.innerText||''));if(!box)return;
   // Remove all legacy hyperlink UI. Approved PDF is the single user-facing document source.
   box.querySelectorAll('a.aq-link,.aq-link.off').forEach(x=>x.remove());
   [...box.querySelectorAll('div')].forEach(x=>{if(!x.children.length&&!x.textContent.trim())x.remove()});
   let b=box.querySelector('.aq-controlled-open');
   if(!b){b=document.createElement('button');b.className='btn primary aq-controlled-open';b.textContent='승인본 열기';box.appendChild(b)}
   b.style.display='block';b.style.margin='14px 0 0 0';b.style.width='fit-content';
   const no=m[0].toUpperCase();
   b.onclick=e=>{e.preventDefault();e.stopPropagation();openDoc(no,text)};
 }
 function enhance(){
   if(enhancing)return;const root=document.getElementById('aqmsView');if(!root)return;enhancing=true;
   try{
     document.getElementById('aqmsUploadBtn')?.remove();document.getElementById('aqmsQualityEditBtn')?.remove();
     let bar=document.getElementById('aqmsControlledBar');
     if(!bar){
       bar=document.createElement('div');bar.id='aqmsControlledBar';bar.style='margin:12px 0;padding:14px 16px;border:1px solid #b9dceb;border-radius:12px;background:#f4fbfe;display:flex;gap:10px;align-items:center;flex-wrap:wrap';bar.innerHTML=BAR_HTML;bar.dataset.ready='1';root.prepend(bar)
     }else if(bar.dataset.ready!=='1'){
       bar.innerHTML=BAR_HTML;bar.dataset.ready='1';
     }
     addOpenButton();
     if(root.dataset.controlledClicks!=='1'){
       root.dataset.controlledClicks='1';
       root.addEventListener('click',e=>{const item=e.target.closest('[data-aqid],tr,.aqitem');if(!item||e.target.closest('button,a,input,select'))return;const text=item.innerText||'';const m=text.match(/WPQ(?:M|P|I)-?\d+/i);if(m&&(e.detail>1||e.altKey)){e.preventDefault();openDoc(m[0].toUpperCase(),text)}})
     }
   }finally{enhancing=false}
 }
 function openDoc(no,title){
   const db=load(),rec=db[no];document.getElementById('aqmsControlledModal')?.remove();
   const d=document.createElement('div');d.id='aqmsControlledModal';d.style='position:fixed;inset:0;background:#0008;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px';
   const body=rec?.data?'<iframe src="'+rec.data+'" style="width:100%;height:62vh;border:1px solid #ccd6dd;border-radius:8px;background:white"></iframe>':'<div style="padding:55px;text-align:center;background:#f6f8fa;border-radius:8px"><b>등록된 승인본 파일이 없습니다.</b><br><span style="font-size:12px;color:#667">품질 또는 관리자가 해당 문서의 수정 버튼에서 승인 PDF를 등록하면 열람 전용으로 표시됩니다.</span></div>';
   d.innerHTML='<div style="background:white;width:min(1100px,96vw);max-height:92vh;overflow:auto;border-radius:14px;padding:18px"><div style="display:flex;align-items:center;gap:10px"><div><b style="font-size:18px">'+esc(no)+'</b><div style="font-size:12px;color:#667">'+esc(rec?.title||title.split('\n')[0])+'</div></div><span style="margin-left:auto;background:#e8f7ef;color:#087443;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:700">승인본 / 열람전용</span><button id="aqClose">닫기</button></div><div style="margin:12px 0;font-size:13px">Rev <b>'+esc(rec?.rev||'-')+'</b> · 등록자 '+esc(rec?.user||'-')+' · 등록일 '+esc(rec?.date||'-')+(rec?.reason?' · 변경사유 '+esc(rec.reason):'')+'</div>'+body+'</div>';
   document.body.appendChild(d);d.querySelector('#aqClose').onclick=()=>d.remove()
 }
 window.waveMesOpenControlledAqms=openDoc;
 setTimeout(enhance,250);setTimeout(enhance,700);setTimeout(enhance,1200);
 const obs=new MutationObserver(()=>requestAnimationFrame(enhance));
 setTimeout(()=>{const root=document.getElementById('aqmsView');if(root)obs.observe(root,{childList:true,subtree:true})},700);
})();