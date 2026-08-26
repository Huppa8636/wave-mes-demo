// Material Issue OCR mapping hardening
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function norm(v){return String(v||'').replace(/\r/g,'\n').replace(/[｜|]/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
  function compact(v){return String(v||'').replace(/\s+/g,'');}
  function date(v){const m=String(v||'').match(/(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:'';}
  function cleanCell(v){return String(v||'').replace(/^[\s:：|｜\-]+|[\s|｜]+$/g,'').trim();}
  const LABELS='문서번호|기안일자|기안부서|요청부서|보관장소|불출요청일|프로젝트명|사용용도|품목코드|품목명|수량|발주서번호|제품명|문서제목|비고';
  function lines(text){return norm(text).split('\n').map(x=>x.trim()).filter(Boolean);}
  function valueNear(text,label){
    const a=lines(text), rx=new RegExp(label.replace(/\s+/g,'\\s*'),'i');
    for(let i=0;i<a.length;i++){
      if(!rx.test(a[i]))continue;
      let rest=cleanCell(a[i].replace(rx,''));
      // 같은 행에 다른 라벨이 연달아 있으면 첫 셀만 사용
      rest=rest.split(new RegExp(`\\s+(?=${LABELS})`,'i'))[0].trim();
      if(rest && !new RegExp(`^(?:${LABELS})$`,'i').test(compact(rest))) return rest;
      // 표 OCR은 보통 다음 1~3줄 안에 실제 값이 옴. 다른 라벨은 건너뜀.
      for(let j=i+1;j<Math.min(a.length,i+5);j++){
        const c=cleanCell(a[j]);
        if(!c)continue;
        if(new RegExp(`^(?:${LABELS})$`,'i').test(compact(c)))continue;
        if(new RegExp(`^(?:${LABELS})`,'i').test(compact(c)))continue;
        return c;
      }
    }
    return '';
  }
  function tokenAfter(text,label,pattern){
    const flat=norm(text).replace(/\n/g,' '), lr=label.replace(/\s+/g,'\\s*');
    const m=flat.match(new RegExp(lr+'[\\s:：|｜-]{0,20}'+pattern,'i'));return m?m[1]:'';
  }
  function parse(text){
    const t=norm(text), c=compact(t);
    const draft=(c.match(/(20\d{6}-\d{4})/)||[])[1]||'';
    let po=tokenAfter(t,'발주서 번호','([A-Z]{2,6}[A-Z0-9_.\\/-]{2,})');
    if(!po){const m=t.match(/\b(POS\d{3,})\b/i);if(m)po=m[1];}
    if(!po)po=draft;

    let product=tokenAfter(t,'제품명','([A-Z0-9][A-Z0-9_.\\/-]{4,})');
    if(!product){const m=t.match(/\b(G\d{2}[A-Z0-9]{4,})\b/i);if(m)product=m[1];}

    let itemCode=tokenAfter(t,'품목코드','([A-Z0-9][A-Z0-9_.\\/-]{3,})');
    if(!itemCode){const m=t.match(/\b(BH-[A-Z0-9_.\\/-]+)\b/i);if(m)itemCode=m[1];}

    // 품목명은 '품목명' 뒤에 '수량' 라벨을 값으로 오인하지 않도록 강한 패턴 우선
    let itemName='';
    const ghz=t.match(/\b\d{1,2}\s*[-~]\s*\d{1,2}\s*GHz\s*[-–— ]*\d{1,4}\s*W\s*PA\b/i); if(ghz)itemName=ghz[0].replace(/\s+/g,' ');
    if(!itemName){
      const v=valueNear(t,'품목명');
      if(v && !/^(수량|품목코드|제품명)$/i.test(compact(v)))itemName=v;
    }

    let qty='';
    const ea=t.match(/\b(\d{1,6})\s*EA\b/i); if(ea)qty=ea[1];
    if(!qty){const m=t.match(/수\s*량[\s:：|｜-]{0,20}(\d{1,6})\b/i);if(m)qty=m[1];}
    if(!qty && itemCode){const p=t.indexOf(itemCode);if(p>=0){const m=t.slice(p,p+260).match(/\b(\d{1,6})\b/);if(m)qty=m[1];}}

    let issueDate='';
    const md=t.match(/불출\s*요청\s*일[\s\S]{0,100}?(20\d{2}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2})/i); if(md)issueDate=date(md[1]);
    if(!issueDate){
      // 이 양식은 1페이지 본문에 2026.08.11 형태가 존재함. 기안일보다 뒤쪽 날짜를 우선.
      const ds=[...t.matchAll(/20\d{2}\s*[.\-/]\s*\d{1,2}\s*[.\-/]\s*\d{1,2}/g)].map(m=>date(m[0])).filter(Boolean);
      if(ds.length) issueDate=ds[ds.length-1];
    }

    let project=valueNear(t,'프로젝트명');
    if(project && /^(요청부서|보관장소|불출요청일|사용용도)$/i.test(compact(project)))project='';
    const title=valueNear(t,'문서제목');

    // 요청부서/보관장소/사용용도는 값이 라벨명으로 오염되면 실패 처리
    let dept=valueNear(t,'요청부서');
    let location=valueNear(t,'보관장소');
    let usage=valueNear(t,'사용용도');
    const bad=v=>!v||new RegExp(`^(?:${LABELS})$`,'i').test(compact(v))||/^[A-Z]{1,4}$/.test(v);
    if(bad(dept))dept='';
    if(bad(location))location='';
    if(bad(usage))usage='';

    // 문서에서 자주 보이는 명시값 보완
    if(!usage){const m=t.match(/(?:사용\s*용도)[\s\S]{0,80}?(납품용|샘플용|개발용|시험용|이동용)/i);if(m)usage=m[1];}
    if(!project){const m=t.match(/\b([XCKKuU]-?band[^\n]{0,60})/i);if(m)project=m[1].trim();}

    if(!product)product=itemCode||itemName;
    return {draft,po,product,itemCode,itemName,qty,issueDate,project,dept,location,usage,title};
  }
  async function read(file,box){
    if(typeof window.extractPdfTextOrOcr==='function'){
      const r=await window.extractPdfTextOrOcr(file,(m,p)=>{if(box)box.textContent=m+(p!=null?` / ${p}%`:'')});
      return r?.text||'';
    }
    if(typeof window.ensureOcrLibs==='function')await window.ensureOcrLibs();
    if(!window.pdfjsLib||!window.Tesseract)throw new Error('PDF/OCR 모듈을 불러오지 못했습니다.');
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let out='';
    for(let i=1;i<=Math.min(pdf.numPages,2);i++){
      if(box)box.textContent=`자재 불출요청서 OCR 중 ${i}/${Math.min(pdf.numPages,2)}`;
      const pg=await pdf.getPage(i),vp=pg.getViewport({scale:2.5}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
      await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
      const z=await Tesseract.recognize(cv,'kor+eng');out+=z.data.text+'\n';
    }
    return out;
  }
  function install(){
    const input=document.getElementById('issuePdf');if(!input||input.dataset.ocrFix==='1')return;
    input.dataset.ocrFix='1';
    // 기존 onchange를 제거하고 강화 파서를 사용
    input.onchange=null;
    input.addEventListener('change',async function(ev){
      const f=this.files&&this.files[0];if(!f)return;
      const info=document.getElementById('issuePdfInfo');const fn=document.getElementById('issueFileName');if(fn)fn.textContent=f.name;
      try{
        const text=await read(f,info);
        const c=compact(text);
        if(!/자재불출요청서/.test(c)&&!(/불출요청/.test(c)&&/품목코드/.test(c)))throw new Error('자재 불출요청서 양식으로 확인되지 않습니다.');
        const x=parse(text),set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v||''};
        set('iDraft',x.draft);set('iPo',x.po);set('iProd',x.product);set('iCode',x.itemCode);set('iName',x.itemName);set('iQty',x.qty);set('iDue',x.issueDate);set('iLoc',x.location);set('iProject',x.project);set('iDept',x.dept);set('iUsage',x.usage);set('iTitle',x.title);
        const missing=[];if(!x.draft)missing.push('기안번호');if(!x.itemCode&&!x.product)missing.push('품목');if(!x.qty)missing.push('수량');if(!x.issueDate)missing.push('불출요청일');
        if(info)info.innerHTML=`<b>자재 불출요청서 OCR 완료</b> / 기안 ${esc(x.draft||'미인식')} / 발주서 ${esc(x.po||'미인식')} / 품목 ${esc(x.itemCode||x.product||'미인식')} / 수량 ${esc(x.qty||'미인식')} / 불출일 ${esc(x.issueDate||'미인식')}<div class="small" style="margin-top:5px;color:${missing.length?'#b22936':'#087c51'}">${missing.length?'확인 필요: '+missing.join(', '):'필수 항목 인식 완료'}</div>`;
      }catch(e){if(info)info.innerHTML=`<b style="color:#b22936">OCR 인식 실패</b> / ${esc(e.message||e)}`;alert('첨부파일을 확인해 주세요.\n'+(e.message||e));}
    });
  }
  document.addEventListener('click',()=>setTimeout(install,0));setInterval(install,800);setTimeout(install,150);
})();