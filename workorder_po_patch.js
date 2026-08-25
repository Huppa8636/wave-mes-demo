// Production work-order customer PO mapping patch
(function(){
  const BAD = new Set(['frequency','power','qty','quantity','assembly','hybrid','work','request','제품','품번','수량']);
  function clean(v){return String(v??'').replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim()}
  function validLoosePo(v){
    v=clean(v);
    if(!v || v.length<4 || v.length>40) return false;
    if(BAD.has(v.toLowerCase())) return false;
    if(/frequency|power|qty|quantity|assembly|ghz|mhz|watt/i.test(v)) return false;
    if(/^20\d{6}-\d{4}$/.test(v)) return false;
    return /[A-Z0-9]/i.test(v) && /[-/_]/.test(v);
  }
  function parseCustomerPo(text,draft){
    const t=String(text||'').replace(/｜/g,'|');
    // Company work-order PO format, e.g. G08/SD/05511
    const strong=t.match(/\b([A-Z]\d{1,3}\s*\/\s*[A-Z]{1,6}\s*\/\s*\d{3,})\b/i);
    if(strong) return {value:strong[1].replace(/\s/g,'').toUpperCase(),state:'ok'};

    const lines=t.split(/\r?\n/).map(clean).filter(Boolean);
    const labelRe=/(발\s*주\s*서\s*번\s*호|발\s*주\s*번\s*호|고객사?\s*(?:문서\s*번호|PO)|customer\s*po)/i;
    for(let i=0;i<lines.length;i++){
      if(!labelRe.test(lines[i])) continue;
      let rest=clean(lines[i].replace(labelRe,''));
      rest=rest.replace(/^[:：#=\-| ]+/,'').trim();
      if(validLoosePo(rest)) return {value:rest,state:'ok'};
      for(let j=i+1;j<Math.min(lines.length,i+3);j++){
        const n=clean(lines[j]);
        if(labelRe.test(n)) continue;
        if(validLoosePo(n)) return {value:n,state:'ok'};
        // A recognizable but invalid token beside the label means OCR failed; never use it.
        if(n && /[A-Za-z0-9]/.test(n) && /frequency|power|qty|quantity|ghz|mhz/i.test(n)) return {value:'',state:'fail'};
      }
      // Label exists but has no value: business rule = use the Bizmeka draft number.
      return {value:draft||'',state:'fallback'};
    }
    // No PO field/value in the form: business rule = use the Bizmeka draft number.
    return {value:draft||'',state:'fallback'};
  }

  const oldLoad = window.loadPdfFile;
  window.loadPdfFile = async function(input){
    const f=input && input.files && input.files[0];
    if(!f) return;
    const info=document.getElementById('pdfLoadInfo');
    const name=document.getElementById('pdfFileName');
    if(name) name.textContent=f.name;
    ['rDraft','rCust','rProd','rDue','rProject'].forEach(id=>{const e=document.getElementById(id); if(e)e.value='';});
    const rq=document.getElementById('rQty'); if(rq)rq.value='';
    try{
      if(typeof extractPdfTextOrOcr!=='function' || typeof extractMappedFields!=='function'){
        if(oldLoad) return oldLoad.call(this,input);
        throw new Error('PDF 인식 모듈을 찾지 못했습니다.');
      }
      if(info) info.innerHTML='<b>작업요청서 인식 중...</b>';
      const result=await extractPdfTextOrOcr(f,(m,p)=>{if(info)info.textContent=m+(p!=null?` / ${p}%`:'')});
      const x=extractMappedFields(result.text);
      const doc=(typeof detectDocumentType==='function')?detectDocumentType(result.text):(x.docType||'UNKNOWN');
      if(doc!=='WORK_ORDER' && doc!=='WORK'){
        input.value='';
        if(info) info.innerHTML='<b style="color:#b22936">양식 불일치</b> / 생산 작업요청에서는 [작업요청서]만 첨부할 수 있습니다.';
        return alert('첨부파일을 확인해 주세요.\n생산 작업요청에서는 [작업요청서]만 첨부할 수 있습니다.');
      }
      const draft=String(x.draft||'').trim();
      const po=parseCustomerPo(result.text,draft);
      if(document.getElementById('rDraft'))rDraft.value=draft;
      if(document.getElementById('rProd'))rProd.value=x.prod||'';
      if(document.getElementById('rQty'))rQty.value=x.qty||'';
      if(document.getElementById('rDue'))rDue.value=x.due||'';
      if(document.getElementById('rProject'))rProject.value=x.project||'';
      if(document.getElementById('rCust'))rCust.value=po.value;

      const missing=[];
      if(!draft)missing.push('기안번호');
      if(!x.prod)missing.push('제품/품번');
      if(!x.qty)missing.push('수량');
      let poMsg='';
      if(po.state==='ok') poMsg=`고객PO ${po.value}`;
      else if(po.state==='fallback') poMsg=`고객PO 없음 → 기안번호 대체 ${po.value||'기안번호 미인식'}`;
      else poMsg='고객PO 인식 실패';

      if(info){
        info.innerHTML=`<b>${result.mode==='OCR'?'OCR':'PDF 텍스트'} 인식 완료 / 작업요청서 확인</b> / 기안 ${draft||'미인식'} / ${poMsg} / 제품 ${x.prod||'미인식'} / 수량 ${x.qty||'미인식'} / 납기 ${x.due||'미인식'}${po.state==='fail'?'<div style="margin-top:5px;color:#b22936">발주서 번호를 읽지 못했습니다. 임의의 값을 넣지 않았습니다. 원본을 확인해 주세요.</div>':''}${missing.length?`<div style="margin-top:5px;color:#b22936">미인식 필드: ${missing.join(', ')}</div>`:'<div style="margin-top:5px;color:#087c51">필수 항목 인식 완료 / 접수 가능합니다.</div>'}`;
      }
    }catch(e){
      if(info)info.innerHTML=`<b style="color:#b22936">PDF/OCR 인식 실패</b> / ${clean(e.message||e)}`;
    }
  };
})();
