// WAVEPIA AQMS controlled-document patch
(function(){
 const DOCS='wave_mes_aqms_controlled_files_v1', DH='wave_mes_aqms_controlled_history_v1';
 const LOGIN_KEY='wave_mes_demo_login_v2';
 const session=()=>{try{return JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return null}};
 const admin=()=>session()?.role==='관리자';
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const load=()=>{try{return JSON.parse(localStorage.getItem(DOCS)||'{}')}catch(e){return{}}};
 const save=x=>localStorage.setItem(DOCS,JSON.stringify(x));
 function hist(x){let a=[];try{a=JSON.parse(localStorage.getItem(DH)||'[]')}catch(e){}a.unshift({...x,at:new Date().toISOString(),user:session()?.name||'미로그인'});localStorage.setItem(DH,JSON.stringify(a.slice(0,500)));try{window.waveMesAudit?.('AQMS REV','문서관리',x.no,null,x,x.reason||'')}catch(e){}}
 function enhance(){
  const root=document.getElementById('aqmsView'); if(!root)return;
  let bar=document.getElementById('aqmsControlledBar');
  if(!bar){bar=document.createElement('div');bar.id='aqmsControlledBar';bar.style='margin:12px 0;padding:14px 16px;border:1px solid #b9dceb;border-radius:12px;background:#f4fbfe;display:flex;gap:10px;align-items:center;flex-wrap:wrap';root.prepend(bar)}
  bar.innerHTML='<b>승인 문서 관리</b><span style="font-size:12px;color:#52606d">사용자: 승인본 열람 전용 · 관리자: 신규 Rev 등록 / 원본 위치 관리 · 기존 Rev 이력 보존</span>'+(admin()?'<button id="aqmsUploadBtn" style="margin-left:auto;padding:8px 13px;border:1px solid #0b78b5;border-radius:8px;background:#0b78b5;color:white;font-weight:700">신규 Rev 등록</button>':'');
  const up=document.getElementById('aqmsUploadBtn');if(up&&!up.dataset.bound){up.dataset.bound='1';up.onclick=uploadDialog}
  if(root.dataset.controlledClicks!=='1'){
    root.dataset.controlledClicks='1';
    root.addEventListener('click',e=>{
      const item=e.target.closest('[data-aqid],tr,.aqitem');if(!item)return;
      if(e.target.closest('button,a,input,select'))return;
      const text=item.innerText||'';const m=text.match(/WPQ(?:M|P|I)-?\d+/i);if(!m)return;
      // Alt-click / double-click opens the controlled approved document without interfering with list selection.
      if(e.detail>1||e.altKey){e.preventDefault();openDoc(m[0].toUpperCase(),text)}
    });
  }
 }
 function openDoc(no,title){const db=load(),rec=db[no];document.getElementById('aqmsControlledModal')?.remove();const d=document.createElement('div');d.id='aqmsControlledModal';d.style='position:fixed;inset:0;background:#0008;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px';const body=rec?.data?'<iframe src="'+rec.data+'" style="width:100%;height:62vh;border:1px solid #ccd6dd;border-radius:8px;background:white"></iframe>':'<div style="padding:55px;text-align:center;background:#f6f8fa;border-radius:8px"><b>등록된 승인본 파일이 없습니다.</b><br><span style="font-size:12px;color:#667">관리자가 신규 Rev 등록에서 PDF 승인본을 등록하면 열람 전용으로 표시됩니다.</span></div>';d.innerHTML='<div style="background:white;width:min(1100px,96vw);max-height:92vh;overflow:auto;border-radius:14px;padding:18px;box-shadow:0 20px 60px #0005"><div style="display:flex;align-items:center;gap:10px"><div><b style="font-size:18px">'+esc(no)+'</b><div style="font-size:12px;color:#667">'+esc(rec?.title||title.split('\n')[0])+'</div></div><span style="margin-left:auto;background:#e8f7ef;color:#087443;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:700">승인본 / 열람전용</span><button id="aqClose">닫기</button></div><div style="margin:12px 0;font-size:13px">Rev <b>'+esc(rec?.rev||'-')+'</b> · 등록자 '+esc(rec?.user||'-')+' · 등록일 '+esc(rec?.date||'-')+(rec?.reason?' · 변경사유 '+esc(rec.reason):'')+'</div>'+body+(rec?.link?'<div style="margin-top:10px"><a target="_blank" rel="noopener" href="'+esc(rec.link)+'">원본 저장 위치 열기</a></div>':'')+'</div>';document.body.appendChild(d);d.querySelector('#aqClose').onclick=()=>d.remove()}
 function uploadDialog(){if(!admin())return alert('관리자 계정에서만 신규 Rev를 등록할 수 있습니다.');const no=prompt('문서번호를 입력하세요. 예: WPQI-807');if(!no)return;const rev=prompt('신규 Rev를 입력하세요. 예: 04');if(rev===null)return;const reason=prompt('변경 사유를 입력하세요. (필수)');if(!reason?.trim())return alert('변경 사유는 필수입니다.');const link=prompt('원본 저장 위치 하이퍼링크(선택)')||'';const inp=document.createElement('input');inp.type='file';inp.accept='application/pdf';inp.onchange=()=>{const f=inp.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const db=load(),key=no.toUpperCase(),prev=db[key];db[key]={no:key,rev,title:key,fileName:f.name,data:rd.result,link,reason,user:session()?.name||'관리자',date:new Date().toLocaleString('ko-KR'),previous:prev?{rev:prev.rev,fileName:prev.fileName,date:prev.date}:null};save(db);hist({action:'REV_REGISTER',no:key,rev,fileName:f.name,reason,previousRev:prev?.rev||null});alert(key+' Rev.'+rev+' 승인본이 등록되었습니다. 기존 Rev는 변경이력에 보존됩니다.');enhance()};rd.readAsDataURL(f)};inp.click()}
 window.waveMesOpenControlledAqms=openDoc;
 setTimeout(enhance,250);setTimeout(enhance,900);setInterval(enhance,2500);
})();