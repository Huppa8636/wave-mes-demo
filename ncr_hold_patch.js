// NCR/HOLD workflow patch + worker/inspector date input normalization
(function(){
  const HOLD_STATUS='HOLD';
  const CLEAR_STATUS='CLEAR';

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function cleanProcess(v){return String(v||'').replace(/^✓\s*/,'').replace(/\s*←\s*현재$/,'').trim();}
  function normalizeDateDigits(v){
    const d=String(v||'').replace(/\D/g,'').slice(0,8);
    if(d.length<=4)return d;
    if(d.length<=6)return d.slice(0,4)+'-'+d.slice(4);
    return d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8);
  }
  function validDate(v){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
    const [y,m,d]=v.split('-').map(Number),x=new Date(y,m-1,d);
    return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d;
  }

  // 작업자/검사자 관리의 date input도 수동입력 친화형으로 통일
  function normalizeCredentialDateInput(id){
    const e=document.getElementById(id);if(!e||e.dataset.textDateFixed==='1')return;
    e.dataset.textDateFixed='1';
    const existing=e.value;
    try{e.type='text';}catch(err){}
    e.inputMode='numeric';e.maxLength=10;e.placeholder='YYYY-MM-DD';e.autocomplete='off';
    if(existing)e.value=existing;
    e.addEventListener('input',()=>{e.value=normalizeDateDigits(e.value)});
    e.addEventListener('blur',()=>{e.setCustomValidity(e.value&&!validDate(e.value)?'YYYY-MM-DD 형식으로 입력해 주세요.':'')});
  }
  function fixCredentialDates(){
    normalizeCredentialDateInput('newWorkerExpiry');
    normalizeCredentialDateInput('newInspectorExpiry');
  }

  function activeHold(draft){
    try{return (s.nc||[]).find(n=>n.draft===draft&&n.holdManaged===true&&n.status===HOLD_STATUS)||null}catch(e){return null}
  }
  function holdLabel(n){return n.status===CLEAR_STATUS?'부적합 해제':'LOT HOLD';}
  function getSelectedProcess(){
    const tp=document.getElementById('tp');
    if(tp&&tp.selectedIndex>=0)return cleanProcess(tp.options[tp.selectedIndex].textContent);
    const ip=document.getElementById('inspectionProcess');
    if(ip&&ip.value)return cleanProcess(ip.value);
    return '-';
  }
  function getSelectedQty(){
    const q=document.getElementById('ti')||document.getElementById('inspectionInput');
    return Number(q?.value)||Number(selected?.qty)||0;
  }

  window.registerLotHold=function(source){
    if(typeof selected==='undefined'||!selected)return alert('먼저 LTC를 조회해 주세요.');
    if(activeHold(selected.draft))return alert('이미 부적합 HOLD 상태인 LOT입니다.');
    const process=getSelectedProcess();
    const reason=prompt(`부적합 사유를 입력해 주세요.\n공정: ${process}`,'');
    if(reason===null)return;
    if(!reason.trim())return alert('부적합 사유를 입력해 주세요.');
    s.nc=s.nc||[];
    s.nc.unshift({
      id:'NCR-'+Date.now(),draft:selected.draft,prod:selected.prod,qty:getSelectedQty(),
      reason:reason.trim(),status:HOLD_STATUS,holdManaged:true,source:source||'현장 LTC',process,
      heldAt:new Date().toLocaleString('ko-KR'),clearedAt:'',clearReason:''
    });
    try{if(typeof save==='function')save();else localStorage.setItem(K,JSON.stringify(s));}catch(e){}
    alert('부적합 등록 및 LOT HOLD 처리되었습니다.\n해제 전까지 현장 LTC 실적 입력이 차단됩니다.');
    try{if(typeof show==='function')show('quality');}catch(e){}
    setTimeout(()=>{try{renderQualityHoldList();}catch(e){}},30);
  };

  window.clearLotHold=function(id){
    const n=(s.nc||[]).find(x=>String(x.id)===String(id));if(!n)return;
    if(n.status===CLEAR_STATUS)return alert('이미 해제된 부적합입니다.');
    const reason=prompt('부적합 HOLD 해제 사유를 입력해 주세요.','조치 완료');
    if(reason===null)return;
    if(!reason.trim())return alert('해제 사유를 입력해 주세요.');
    n.status=CLEAR_STATUS;n.clearedAt=new Date().toLocaleString('ko-KR');n.clearReason=reason.trim();
    try{if(typeof save==='function')save();else localStorage.setItem(K,JSON.stringify(s));}catch(e){}
    renderQualityHoldList();
    alert('부적합 HOLD가 해제되었습니다.\n해당 LOT는 현장 LTC 입력이 다시 가능합니다.');
  };

  function addHoldButton(){
    if(typeof selected==='undefined'||!selected)return;
    const hold=activeHold(selected.draft);
    const testForm=document.getElementById('testForm');
    if(testForm){
      let btn=document.getElementById('workHoldBtn');
      if(!btn){
        const toolbar=[...testForm.querySelectorAll('.toolbar')].find(x=>x.querySelector('button'));
        if(toolbar){btn=document.createElement('button');btn.id='workHoldBtn';btn.className='btn danger';btn.textContent='부적합 / LOT 정지';btn.onclick=()=>registerLotHold('작업 실적');toolbar.appendChild(btn);}
      }
      if(btn){btn.disabled=!!hold;btn.title=hold?'현재 LOT HOLD 상태입니다.':'';}
    }
    const form=document.getElementById('inspectionForm');
    if(form){
      let btn=document.getElementById('inspectionHoldBtn');
      if(!btn){
        const toolbar=[...form.querySelectorAll('.toolbar')].find(x=>x.querySelector('button'));
        if(toolbar){btn=document.createElement('button');btn.id='inspectionHoldBtn';btn.className='btn danger';btn.textContent='부적합 / LOT 정지';btn.onclick=()=>registerLotHold('품질검사 실적');toolbar.appendChild(btn);}
      }
      if(btn){btn.disabled=!!hold;btn.title=hold?'현재 LOT HOLD 상태입니다.':'';}
    }
  }

  function applyHoldBlock(){
    if(typeof selected==='undefined'||!selected)return;
    const hold=activeHold(selected.draft);
    ['testForm','inspectionForm'].forEach(id=>{
      const form=document.getElementById(id);if(!form)return;
      let note=form.querySelector('.lot-hold-notice');
      if(hold){
        if(!note){note=document.createElement('div');note.className='notice lot-hold-notice';note.style.cssText='background:#fff0f1;border-color:#efb7bc;color:#a51f2d;margin-bottom:10px';form.prepend(note);}
        note.innerHTML=`<b>LOT HOLD / 실적 입력 차단</b><br>부적합 공정: ${esc(hold.process||'-')} / 사유: ${esc(hold.reason||'-')}<br>품질 / 부적합 메뉴에서 HOLD 해제 후 입력할 수 있습니다.`;
        [...form.querySelectorAll('input,select,button')].forEach(el=>{if(!/HoldBtn/.test(el.id))el.disabled=true;});
      }else{
        if(note)note.remove();
      }
    });
    addHoldButton();
  }

  function renderQualityHoldList(){
    const box=document.getElementById('ncList');if(!box)return;
    const list=s.nc||[];
    if(!list.length){box.innerHTML='<div class="small">등록된 부적합이 없습니다.</div>';return;}
    box.innerHTML=list.map(n=>{
      const managed=n.holdManaged===true;
      const status=managed?(n.status||HOLD_STATUS):'검토중';
      const badge=status===CLEAR_STATUS?'<span class="status good">CLEAR / 해제</span>':(status===HOLD_STATUS?'<span class="status bad">HOLD / 입력차단</span>':'<span class="status warn">검토중</span>');
      const id=esc(n.id||'');
      return `<div class="log"><div class="head" style="margin-bottom:4px"><b>${esc(n.prod||'-')} / ${Number(n.qty)||0}ea</b>${badge}</div><div class="small">기안 <span class="trace clicktrace" onclick="focusLtc('${esc(n.draft)}')">${esc(n.draft)}</span> / 공정 ${esc(n.process||'-')} / ${esc(n.reason||'-')}</div>${managed?`<div class="small" style="margin-top:4px">등록 ${esc(n.heldAt||'-')}${n.status===CLEAR_STATUS?` / 해제 ${esc(n.clearedAt||'-')} / 해제사유 ${esc(n.clearReason||'-')}`:''}</div><div class="toolbar" style="margin-top:7px">${n.status===HOLD_STATUS?`<button class="btn primary" onclick="clearLotHold('${id}')">부적합 HOLD 해제</button>`:'<button class="btn secondary" disabled>해제 완료</button>'}</div>`:''}</div>`;
    }).join('');
  }

  // 기존 저장함수 앞단에서 HOLD를 강제 차단
  const prevSaveTest=window.saveTest;
  window.saveTest=function(){
    if(typeof selected!=='undefined'&&selected){const h=activeHold(selected.draft);if(h)return alert('부적합 HOLD 상태입니다.\n품질 / 부적합에서 HOLD 해제 후 입력할 수 있습니다.');}
    return typeof prevSaveTest==='function'?prevSaveTest.apply(this,arguments):undefined;
  };
  const prevSaveInspection=window.saveInspectionResult;
  window.saveInspectionResult=function(){
    if(typeof selected!=='undefined'&&selected){const h=activeHold(selected.draft);if(h)return alert('부적합 HOLD 상태입니다.\n품질 / 부적합에서 HOLD 해제 후 입력할 수 있습니다.');}
    return typeof prevSaveInspection==='function'?prevSaveInspection.apply(this,arguments):undefined;
  };

  const prevRenderTest=window.renderTest;
  if(typeof prevRenderTest==='function')window.renderTest=function(){const r=prevRenderTest.apply(this,arguments);setTimeout(()=>{fixCredentialDates();addHoldButton();applyHoldBlock();},60);return r;};

  const prevRenderAll=window.renderAll;
  if(typeof prevRenderAll==='function')window.renderAll=function(){const r=prevRenderAll.apply(this,arguments);setTimeout(()=>{renderQualityHoldList();fixCredentialDates();},0);return r;};

  document.addEventListener('click',()=>setTimeout(()=>{fixCredentialDates();renderQualityHoldList();applyHoldBlock();},20));
  setInterval(()=>{fixCredentialDates();addHoldButton();applyHoldBlock();},1000);
  setTimeout(()=>{fixCredentialDates();renderQualityHoldList();addHoldButton();applyHoldBlock();},100);
})();
