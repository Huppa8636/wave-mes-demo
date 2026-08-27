// Quality inspection request OCR guard
// Accept only quality inspection request/commission forms; reject work orders and unrelated PDFs.
(function(){
  const old=window.loadQualityPdf;
  if(typeof old!=='function')return;

  function escQ(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function clearFields(){
    ['qDraft','qCust','qProd','qDate','qRemark'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
    const q=document.getElementById('qQty');if(q)q.value='';
  }

  window.loadQualityPdf=async function(input){
    const f=input?.files?.[0];if(!f)return;
    const box=document.getElementById('qOcrInfo');const name=document.getElementById('qPdfFileName');
    if(name)name.textContent=f.name;clearFields();
    try{
      if(typeof extractPdfTextOrOcr!=='function'||typeof extractMappedFields!=='function'||typeof detectDocumentType!=='function')return old.call(this,input);
      if(box)box.innerHTML='<b>품질 검사 요청서 인식 중...</b>';
      const result=await extractPdfTextOrOcr(f,(m,p)=>{if(box)box.textContent=m+(p!=null?` / ${p}%`:'')});
      const x=extractMappedFields(result.text);
      const doc=detectDocumentType(result.text);
      if(doc!=='QUALITY_REQUEST'){
        input.value='';clearFields();
        if(box)box.innerHTML='<b style="color:#b22936">양식 불일치 · 품질 검사 요청/의뢰서가 아닙니다.</b>';
        const detail=doc==='WORK_ORDER'?'생산 [작업요청서]는 왼쪽 [영업 > 작업요청]에서 등록해 주세요.':'품질 검사 요청 메뉴에서는 [품질 검사 요청서/의뢰서]만 등록할 수 있습니다.';
        return alert('첨부파일을 확인해 주세요.\n'+detail);
      }
      const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v||''};
      set('qDraft',x.draft);set('qCust',x.cust);set('qProd',x.prod);set('qQty',x.qty);if(x.type)set('qType',x.type);
      const d=document.getElementById('qDate');if(d&&!d.value)d.value=new Date().toISOString().slice(0,10);
      const missing=[];if(!x.draft)missing.push('기안번호');if(!x.prod)missing.push('제품/품번');if(!x.qty)missing.push('검사수량');if(!x.type)missing.push('검사구분');
      if(box)box.innerHTML=`<b>${result.mode==='OCR'?'OCR':'PDF 텍스트'} 인식 완료 · 품질 검사 요청서 확인</b> / ${escQ(x.type||'검사구분 미인식')} / 기안 ${escQ(x.draft||'미인식')} / 품번 ${escQ(x.prod||'미인식')} / 수량 ${escQ(x.qty||'미인식')}${missing.length?`<div class="small" style="margin-top:5px;color:#b22936">확인 필요: ${missing.join(', ')}</div>`:'<div class="small" style="margin-top:5px;color:#087c51">필수 항목 인식 완료 / 등록 가능합니다.</div>'}`;
    }catch(e){if(box)box.innerHTML=`<b style="color:#b22936">PDF/OCR 인식 실패</b> / ${escQ(e.message||e)}`;}
  };
})();
