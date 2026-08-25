// Material Issue Request patch for WAVE MES demo
(function(){
  function esc2(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function norm2(v){return String(v??'').replace(/\r/g,'\n').replace(/[｜|]/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim()}
  function compact(v){return String(v??'').replace(/\s/g,'')}
  function toDate(v){const m=String(v||'').match(/(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:''}
  function afterLabel(text,labelRx){
    const lines=norm2(text).split('\n').map(x=>x.trim()).filter(Boolean);
    for(let i=0;i<lines.length;i++){
      const m=lines[i].match(labelRx);
      if(!m)continue;
      const rest=lines[i].replace(labelRx,'').replace(/^[\s:：\-]+/,'').trim();
      if(rest)return rest;
      for(let j=i+1;j<Math.min(i+4,lines.length);j++){
        if(lines[j]&&!/(문서번호|기안일자|요청부서|보관장소|불출요청일|프로젝트명|사용용도|품목코드|품목명|수량|품질검사|비고)/.test(compact(lines[j])))return lines[j];
      }
    }
    return '';
  }
  function isMaterialIssue(text){
    const t=compact(text);
    return /자재불출요청서/.test(t) || (/불출요청/.test(t)&&/품목코드/.test(t)&&/보관장소/.test(t));
  }
  function mapMaterialIssue(text){
    const t=norm2(text), c=compact(t);
    const draft=(c.match(/(20\d{6}-\d{4})/)||[])[1]||'';
    let title=afterLabel(t,/문서\s*제목/i);
    if(!title){const m=t.match(/([^\n]{5,120}(?:불출|납품)[^\n]{0,80}(?:요청|건))/i);if(m)title=m[1].trim()}
    const dept=afterLabel(t,/요청\s*부서/i);
    const location=afterLabel(t,/보관\s*장소/i);
    let issueDate=afterLabel(t,/불출\s*요청\s*일/i); issueDate=toDate(issueDate)||toDate(t.match(/불출\s*요청\s*일[\s\S]{0,60}(20\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2})/i)?.[1]);
    const project=afterLabel(t,/프로젝트\s*명/i);
    const usage=afterLabel(t,/사용\s*용도/i);

    let itemCode='';
    let m=t.match(/품목\s*코드[\s:：\-]*([A-Z0-9][A-Z0-9_.\/-]{3,})/i);
    if(m)itemCode=m[1];
    if(!itemCode){m=t.match(/\b(BH-[A-Z0-9_.\/-]+)\b/i);if(m)itemCode=m[1]}

    let itemName='';
    m=t.match(/품목\s*명[\s:：\-]*([^\n]{2,60})/i); if(m)itemName=m[1].trim();
    if(!itemName){m=t.match(/\b\d{1,2}-\d{1,2}GHz[-–— ]*\d{1,3}W\s*PA\b/i);if(m)itemName=m[0]}

    let qty='';
    m=t.match(/(?:품목\s*명[^\n]*\n[^\n]*?)?수\s*량[\s:：\-]*(\d{1,6})/i); if(m)qty=m[1];
    if(!qty){m=t.match(/\b(\d{1,5})\s*EA\b/i);if(m)qty=m[1]}
    if(!qty){m=t.match(new RegExp((itemCode?itemCode.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'):'BH-[A-Z0-9_.\\/-]+')+'[\\s\\S]{0,160}?(\\d{1,5})(?:\\s|$)','i'));if(m)qty=m[1]}

    let customerPo='';
    m=t.match(/발주서\s*번호[\s:：\-]*([A-Z0-9][A-Z0-9_.\/-]{2,})/i);if(m)customerPo=m[1];
    if(!customerPo){m=t.match(/\b(POS\d{3,})\b/i);if(m)customerPo=m[1]}
    if(!customerPo)customerPo=draft;

    let product='';
    m=t.match(/제품\s*명[\s:：\-]*([A-Z0-9][A-Z0-9_.\/-]{3,})/i);if(m)product=m[1];
    if(!product){m=t.match(/\b(G\d{2}[A-Z0-9]{4,})\b/i);if(m)product=m[1]}
    if(!product)product=itemCode||itemName;

    return {draft,title,dept,location,issueDate,project,usage,itemCode,itemName,qty,customerPo,product};
  }

  async function readPdfMaterial(file,box){
    if(typeof extractPdfTextOrOcr==='function'){
      const r=await extractPdfTextOrOcr(file,(m,p)=>{if(box)box.textContent=m+(p!=null?` / ${p}%`:'')});
      return r.text||'';
    }
    if(typeof ensureOcrLibs==='function')await ensureOcrLibs();
    if(!window.pdfjsLib||!window.Tesseract)throw new Error('PDF/OCR 모듈을 불러오지 못했습니다.');
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
    let text='';
    for(let i=1;i<=Math.min(pdf.numPages,2);i++){
      if(box)box.textContent=`자재 불출요청서 OCR 중 ${i}/${Math.min(pdf.numPages,2)}`;
      const pg=await pdf.getPage(i),vp=pg.getViewport({scale:2.2}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
      await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
      const z=await Tesseract.recognize(cv,'kor+eng'); text+=z.data.text+'\n';
    }
    return text;
  }

  function injectMenuAndSection(){
    const nav=document.getElementById('nav'); if(!nav)return;
    const invBtn=nav.querySelector('[data-v="inv"]');
    if(invBtn){
      invBtn.innerHTML='▣ 재고 현황';
      if(!nav.querySelector('[data-v="issue"]')){
        const b=document.createElement('button');b.dataset.v='issue';b.innerHTML='⇢ 자재 불출 요청';
        invBtn.insertAdjacentElement('afterend',b);
      }
    }
    document.querySelectorAll('h1,h2').forEach(el=>{if(el.textContent.trim()==='재고 / 예약'||el.textContent.trim()==='재고 / 예약 현황')el.textContent=el.textContent.replace('재고 / 예약','재고 현황')});
    if(typeof titles==='object'&&titles){titles.inv=['재고 현황','현재고 / 가용재고 및 수입검사 상태'];titles.issue=['자재 불출 요청','자재 / 원자재 / 완제품의 외부 반출 및 사이트 이동 요청'];}

    const inv=document.getElementById('inv');
    if(inv&&!document.getElementById('issue')){
      const sec=document.createElement('section');sec.className='view';sec.id='issue';
      sec.innerHTML=`<div class="notice">[자재 불출요청서] PDF만 등록합니다. 문서번호를 중심 추적키로 사용하고, 불출 요청을 작업요청 현황에 함께 반영합니다.</div>
      <div class="card"><div class="head"><h2>자재 불출 요청 등록</h2><div><input id="issuePdf" type="file" accept="application/pdf,.pdf" hidden><button class="btn secondary" id="issuePdfBtn">PDF 파일 불러오기</button><span id="issueFileName" class="small" style="margin-left:8px">선택된 파일 없음</span></div></div>
      <div id="issuePdfInfo" class="ocr">PDF 선택 대기</div>
      <div class="form">
        <div class="field"><label>비즈메카 기안번호 / 중심 추적키</label><input id="iDraft"></div>
        <div class="field"><label>발주서 번호 / 고객 PO</label><input id="iPo"></div>
        <div class="field"><label>제품 / 품목</label><input id="iProd"></div>
        <div class="field"><label>품목코드</label><input id="iCode"></div>
        <div class="field"><label>품목명</label><input id="iName"></div>
        <div class="field"><label>불출 수량</label><input id="iQty" type="number"></div>
        <div class="field"><label>불출 요청일</label><input id="iDue" type="date"></div>
        <div class="field"><label>보관장소</label><input id="iLoc"></div>
        <div class="field"><label>프로젝트명</label><input id="iProject"></div>
        <div class="field"><label>요청부서</label><input id="iDept"></div>
        <div class="field"><label>사용용도</label><input id="iUsage"></div>
        <div class="field"><label>문서제목</label><input id="iTitle"></div>
      </div>
      <div class="toolbar" style="margin-top:12px"><button class="btn primary" id="issueRegisterBtn">불출 요청 접수</button><button class="btn secondary" id="issueClearBtn">초기화</button></div></div>`;
      inv.insertAdjacentElement('afterend',sec);
    }

    document.querySelectorAll('#nav button').forEach(b=>{
      b.onclick=()=>{
        const v=b.dataset.v;
        document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===v));
        document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x===b));
        if(typeof titles==='object'&&titles[v]){document.getElementById('title').textContent=titles[v][0];document.getElementById('sub').textContent=titles[v][1]}
      };
    });

    const file=document.getElementById('issuePdf'),btn=document.getElementById('issuePdfBtn');
    if(btn&&file)btn.onclick=()=>file.click();
    if(file)file.onchange=loadMaterialPdf;
    const reg=document.getElementById('issueRegisterBtn');if(reg)reg.onclick=registerMaterialIssue;
    const clr=document.getElementById('issueClearBtn');if(clr)clr.onclick=clearMaterialIssue;
  }

  function clearMaterialIssue(){
    ['iDraft','iPo','iProd','iCode','iName','iQty','iDue','iLoc','iProject','iDept','iUsage','iTitle'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
    const f=document.getElementById('issuePdf');if(f)f.value='';
    const n=document.getElementById('issueFileName');if(n)n.textContent='선택된 파일 없음';
    const info=document.getElementById('issuePdfInfo');if(info)info.textContent='PDF 선택 대기';
  }

  async function loadMaterialPdf(ev){
    const input=ev.target||ev, f=input.files&&input.files[0];if(!f)return;
    clearMaterialIssue(); input.files && (document.getElementById('issueFileName').textContent=f.name);
    const info=document.getElementById('issuePdfInfo');
    try{
      const text=await readPdfMaterial(f,info);
      if(!isMaterialIssue(text)){
        input.value=''; if(info)info.innerHTML='<b style="color:#b22936">양식 불일치</b>';
        return alert('첨부파일을 확인해 주세요.\n[자재 불출 요청] 메뉴에서는 [자재 불출요청서]만 첨부할 수 있습니다.');
      }
      const x=mapMaterialIssue(text);
      const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||''};
      set('iDraft',x.draft);set('iPo',x.customerPo);set('iProd',x.product);set('iCode',x.itemCode);set('iName',x.itemName);set('iQty',x.qty);set('iDue',x.issueDate);set('iLoc',x.location);set('iProject',x.project);set('iDept',x.dept);set('iUsage',x.usage);set('iTitle',x.title);
      const missing=[];if(!x.draft)missing.push('기안번호');if(!x.itemCode&&!x.product)missing.push('품목');if(!x.qty)missing.push('수량');
      if(info)info.innerHTML=`<b>자재 불출요청서 OCR 완료</b> / 기안 ${esc2(x.draft||'미인식')} / 발주서 ${esc2(x.customerPo||'미인식')} / 품목 ${esc2(x.itemCode||x.product||'미인식')} / 수량 ${esc2(x.qty||'미인식')} / 불출일 ${esc2(x.issueDate||'미인식')}${missing.length?`<div class="small" style="color:#b22936;margin-top:5px">확인 필요: ${missing.join(', ')}</div>`:'<div class="small" style="color:#087c51;margin-top:5px">필수 항목 인식 완료</div>'}`;
    }catch(e){if(info)info.textContent='PDF/OCR 인식 실패 / '+(e.message||e);}
  }

  function registerMaterialIssue(){
    const val=id=>document.getElementById(id)?.value.trim()||'';
    const draft=val('iDraft'),po=val('iPo')||draft,prod=val('iProd')||val('iCode')||val('iName'),qty=Number(val('iQty'))||0,due=val('iDue');
    if(!draft||!prod||qty<=0)return alert('기안번호, 품목/제품, 불출 수량을 확인해 주세요.');
    if((s.requests||[]).some(r=>r.draft===draft))return alert('이미 작업요청 현황에 등록된 기안번호입니다.');
    const detail={type:'MATERIAL_ISSUE',itemCode:val('iCode'),itemName:val('iName'),location:val('iLoc'),department:val('iDept'),usage:val('iUsage'),title:val('iTitle')};
    s.requests.push({id:typeof id==='function'?id():('ISS'+Date.now()),draft,cust:po,prod,qty,due,project:val('iProject'),status:'자재불출 요청',scenario:'자재 불출 요청',requestType:'자재불출',issueDetail:detail});
    if(!s.materialIssues)s.materialIssues=[];
    s.materialIssues.push({draft,po,prod,qty,due,project:val('iProject'),...detail});
    if(typeof save==='function')save();
    alert('자재 불출 요청이 작업요청 현황에 반영되었습니다.');
    clearMaterialIssue();
    const reqBtn=document.querySelector('#nav [data-v="reqs"]');if(reqBtn)reqBtn.click();
  }

  // wait until dynamically assembled MES has completed its own script execution
  setTimeout(injectMenuAndSection,50);
})();
