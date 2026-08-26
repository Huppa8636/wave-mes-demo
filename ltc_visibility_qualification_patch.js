// WAVEPIA MES: HOLD visibility, digital LTC status structure, worker qualification enforcement
(function(){
  const WORKER_KEY='wave_mes_field_workers_v2';
  const INSPECTION_LOG_KEY='wave_mes_field_inspection_logs_v1';
  const FIXED=['Plasma (PKG/PCB)','Die Attach','Epoxy Attach','Oven Cure','3D Scan','Plasma','Wire Bonding','Wire Pull Test','Inspection'];
  const FLEX=['LID Attach','Leak Test','CSAM','Impedance Measure','Laser Marking','HTRB','RF Test'];
  const ALL=[...FIXED,...FLEX,'OQC','Packing'];

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function load(key,def){try{const x=JSON.parse(localStorage.getItem(key));return x??def}catch(e){return def}}
  function clean(v){return String(v||'').replace(/^✓\s*/,'').replace(/\s*←.*$/,'').trim()}
  function activeHold(draft){try{return (s.nc||[]).find(n=>n.draft===draft&&n.holdManaged===true&&n.status==='HOLD')||null}catch(e){return null}}
  function doneSet(l){
    const set=new Set((l?.done||[]).map(clean));
    try{(s.logs||[]).filter(x=>x.ltcId===l.id||x.draft===l.draft).filter(x=>!['취소','무효'].includes(x.recordStatus)).forEach(x=>set.add(clean(x.process)))}catch(e){}
    try{load(INSPECTION_LOG_KEY,[]).filter(x=>x.draft===l.draft).filter(x=>!['취소','무효'].includes(x.recordStatus)).forEach(x=>set.add(clean(x.process)))}catch(e){}
    return set;
  }
  function nextStage(l){
    const done=doneSet(l);
    const fixed=FIXED.find(p=>!done.has(p));
    if(fixed)return {kind:'fixed',label:fixed,done};
    const remain=FLEX.filter(p=>!done.has(p));
    if(remain.length)return {kind:'flex',label:'제조 유동공정',done,remain};
    if(!done.has('OQC'))return {kind:'oqc',label:'OQC',done};
    if(!done.has('Packing'))return {kind:'packing',label:'Packing',done};
    return {kind:'complete',label:'전체 완료',done};
  }

  function workerState(w){
    if(!w||!w.qualified)return {ok:false,label:'자격 미등록',reason:'작업자 자격인증이 등록되지 않았습니다.'};
    if(!w.expiry)return {ok:false,label:'유효일 미등록',reason:'작업자 자격 유효일이 없습니다.'};
    const end=new Date(w.expiry+'T23:59:59');
    if(Number.isNaN(end.getTime()))return {ok:false,label:'유효일 오류',reason:'작업자 자격 유효일 형식이 올바르지 않습니다.'};
    if(end.getTime()<Date.now())return {ok:false,label:'자격 만료',reason:`작업자 자격이 ${w.expiry}자로 만료되었습니다.`};
    return {ok:true,label:`자격 유효 / ${w.expiry}`,reason:''};
  }
  function workers(){return load(WORKER_KEY,[]).map(x=>typeof x==='string'?{name:x,qualified:false,expiry:''}:x)}
  function selectedWorker(){const sel=document.getElementById('tw');if(!sel)return null;return workers().find(w=>w.name===sel.value)||null}

  function addStyle(){
    if(document.getElementById('ltcVisibilityQualificationStyle'))return;
    const st=document.createElement('style');st.id='ltcVisibilityQualificationStyle';st.textContent=`
      .lot-hold-notice,.mes-hold-banner{background:#fff0f1!important;border:2px solid #e5484d!important;color:#9f1720!important;box-shadow:0 0 0 3px rgba(229,72,77,.08)!important}
      .mes-hold-banner{padding:12px 14px;border-radius:10px;margin:8px 0;font-size:12px;line-height:1.55}
      .mes-hold-banner b{font-size:14px}.mes-hold-tag{display:inline-flex;align-items:center;gap:5px;background:#d92d3a;color:white;border-radius:999px;padding:5px 9px;font-weight:900;font-size:10px;letter-spacing:.2px}
      #workHoldBtn,#inspectionHoldBtn{margin-left:auto!important;background:#fff!important;color:#c32631!important;border:1px solid #eaa8ad!important}
      #workHoldBtn:hover,#inspectionHoldBtn:hover{background:#fff0f1!important}.toolbar:has(#workHoldBtn),.toolbar:has(#inspectionHoldBtn){display:flex!important;align-items:center!important;width:100%!important}
      .ltc-status-board{display:grid;grid-template-columns:1fr;gap:9px;margin-top:10px}.ltc-stage-row{border:1px solid #dce7ed;border-radius:9px;padding:9px;background:#fbfdfe}
      .ltc-stage-title{font-size:10px;font-weight:900;margin-bottom:7px}.ltc-stage-title.done-title{color:#19724b}.ltc-stage-title.now-title{color:#0878bd}.ltc-stage-title.pending-title{color:#768995}
      .ltc-stage-chips{display:flex;flex-wrap:wrap;gap:6px}.ltc-chip{padding:5px 8px;border-radius:999px;font-size:9px;font-weight:750;border:1px solid #d7e2e8;background:#fff;color:#73828c}
      .ltc-chip.done{background:#e8f8ef;border-color:#bde9cf;color:#17734b}.ltc-chip.now{background:#e9f6fd;border:2px solid #1594ce;color:#075d8c;box-shadow:0 0 0 3px rgba(21,148,206,.08)}.ltc-chip.pending{background:#f2f5f7;border-color:#e1e7eb;color:#9aa7af}
      .ltc-card-hold{border:2px solid #e5484d!important;box-shadow:0 0 0 3px rgba(229,72,77,.06)!important}.worker-invalid{background:#fff0f1!important;border-color:#e5484d!important;color:#a41e28!important}.worker-valid{border-color:#97d6b3!important}
      .worker-qual-warning{background:#fff0f1!important;border:2px solid #e5484d!important;color:#a41e28!important;margin:0 0 10px!important}.worker-qual-ok{background:#eefaf4!important;border-color:#bde8ce!important;color:#176b4c!important;margin:0 0 10px!important}
    `;document.head.appendChild(st);
  }

  // Digital LTC: distinguish HOLD / complete / current / pending at a glance.
  window.renderLtc=function(){
    if(typeof ltcList==='undefined'||!ltcList)return;
    ltcList.innerHTML=(s.ltcs||[]).map(l=>{
      const st=nextStage(l),done=st.done,hold=activeHold(l.draft),open=(typeof expandedLtcDraft!=='undefined'&&expandedLtcDraft===l.draft);
      const pct=Math.round(done.size/ALL.length*100);
      const completed=ALL.filter(p=>done.has(p));
      const pending=ALL.filter(p=>!done.has(p));
      let current=[];
      if(st.kind==='fixed'||st.kind==='oqc'||st.kind==='packing')current=[st.label];
      else if(st.kind==='flex')current=st.remain||[];
      const pendingOnly=pending.filter(p=>!current.includes(p));
      const status=hold?'<span class="mes-hold-tag">HOLD / 작업중지</span>':(st.kind==='complete'?'<span class="status good">전체 완료</span>':`<span class="status warn">${done.size}/${ALL.length} · ${pct}%</span>`);
      const currentTitle=st.kind==='flex'?'현재 단계 / 순서 선택 가능':'현재 / 다음 공정';
      return `<div class="card ${hold?'ltc-card-hold':''}" id="ltc-${esc(l.draft)}" style="box-shadow:none"><div class="head"><div><b class="trace clicktrace" onclick="toggleLtc('${esc(l.draft)}')">${esc(l.draft)}</b><div class="small">${esc(l.no)} · 고객문서 ${esc(l.cust||'-')} · ${esc(l.prod||'-')} · ${Number(l.qty)||0}ea</div><div class="small">공정표 버전 ${esc(l.processVersion||'PROC-2026.08-V1')}</div></div>${status}</div>${hold?`<div class="mes-hold-banner"><b>LOT HOLD / 공정 진행 금지</b><br>발생공정: ${esc(hold.process||'-')} / 사유: ${esc(hold.reason||'-')}<br>품질 / 부적합에서 CLEAR 처리 전까지 현장 실적 입력이 차단됩니다.</div>`:''}<div class="progress"><i style="width:${pct}%"></i></div><div class="small" style="margin-top:7px">기안번호를 누르면 완료 / 현재 / 미진행 공정을 구분해서 확인할 수 있습니다.</div><div class="ltc-detail ${open?'open':''}"><div class="ltc-status-board"><div class="ltc-stage-row"><div class="ltc-stage-title done-title">완료 공정 · ${completed.length}개</div><div class="ltc-stage-chips">${completed.length?completed.map(p=>`<span class="ltc-chip done">✓ ${esc(p)}</span>`).join(''):'<span class="small">완료된 공정 없음</span>'}</div></div>${st.kind!=='complete'?`<div class="ltc-stage-row"><div class="ltc-stage-title now-title">${currentTitle}</div><div class="ltc-stage-chips">${current.map(p=>`<span class="ltc-chip now">${esc(p)}${st.kind==='flex'?' / 선택':''}</span>`).join('')}</div></div>`:''}<div class="ltc-stage-row"><div class="ltc-stage-title pending-title">미진행 공정 · ${pendingOnly.length}개</div><div class="ltc-stage-chips">${pendingOnly.length?pendingOnly.map(p=>`<span class="ltc-chip pending">${esc(p)}</span>`).join(''):'<span class="small">미진행 공정 없음</span>'}</div></div></div></div></div>`;
    }).join('');
  };

  function applyWorkerQualification(){
    const sel=document.getElementById('tw');if(!sel)return;
    const list=workers();
    let firstValid='';
    [...sel.options].forEach(opt=>{
      const w=list.find(x=>x.name===opt.value||x.name===opt.textContent.replace(/\s*\[.*\]$/,''));
      const q=workerState(w);const base=w?.name||opt.value;
      opt.value=base;opt.textContent=q.ok?`${base} [자격 유효]`:`${base} [${q.label}]`;opt.disabled=!q.ok;
      if(q.ok&&!firstValid)firstValid=base;
    });
    let w=selectedWorker(),q=workerState(w);
    if(!q.ok&&firstValid){sel.value=firstValid;w=selectedWorker();q=workerState(w)}
    sel.classList.toggle('worker-invalid',!q.ok);sel.classList.toggle('worker-valid',q.ok);
    const form=document.getElementById('testForm');if(!form)return;
    let note=document.getElementById('workerQualificationNotice');
    if(!note){note=document.createElement('div');note.id='workerQualificationNotice';form.prepend(note)}
    note.className=`notice ${q.ok?'worker-qual-ok':'worker-qual-warning'}`;
    note.innerHTML=q.ok?`<b>작업자 자격 확인 완료</b> / ${esc(w?.name||'-')} · 유효일 ${esc(w?.expiry||'-')}`:`<b>작업자 자격으로 작업 불가</b><br>${esc(q.reason)} 작업자 관리에서 유효한 자격을 등록한 뒤 작업할 수 있습니다.`;
    const btn=[...form.querySelectorAll('button')].find(b=>/작업 완료 등록|입력 대기/.test(b.textContent));if(btn&&!activeHold(selected?.draft)){btn.disabled=!q.ok;btn.title=q.ok?'':q.reason}
    sel.onchange=()=>setTimeout(applyWorkerQualification,0);
  }

  const prevSave=window.saveTest;
  window.saveTest=function(){
    const w=selectedWorker(),q=workerState(w);
    if(!q.ok){try{window.waveMesAudit?.('QUALIFICATION_DENIED','작업실적',selected?.draft||'',null,{worker:w?.name||'',qualification:q.label},q.reason)}catch(e){};return alert(`작업자 자격 확인 실패\n${q.reason}\n유효한 자격 보유 작업자로 변경해 주세요.`)}
    return typeof prevSave==='function'?prevSave.apply(this,arguments):undefined;
  };

  function reinforceHoldUX(){
    const holdBtn=document.getElementById('workHoldBtn');if(holdBtn){holdBtn.textContent='부적합 / LOT 정지';const bar=holdBtn.parentElement;if(bar){bar.style.display='flex';bar.style.width='100%';bar.style.alignItems='center'}holdBtn.style.marginLeft='auto'}
    const qHold=document.getElementById('inspectionHoldBtn');if(qHold){const bar=qHold.parentElement;if(bar){bar.style.display='flex';bar.style.width='100%'}qHold.style.marginLeft='auto'}
    if(typeof selected!=='undefined'&&selected&&activeHold(selected.draft)){
      const form=document.getElementById('testForm')||document.getElementById('inspectionForm');
      const note=form?.querySelector('.lot-hold-notice');if(note){note.innerHTML=`<b style="font-size:15px">LOT HOLD / 작업 입력 차단</b><br>이 LOT는 부적합으로 정지되어 있습니다.<br>${note.innerHTML.replace(/^.*?<br>/,'')}`}
    }
  }

  function apply(){addStyle();applyWorkerQualification();reinforceHoldUX()}
  const prevRenderTest=window.renderTest;
  if(typeof prevRenderTest==='function')window.renderTest=function(){const r=prevRenderTest.apply(this,arguments);setTimeout(apply,80);return r};
  const prevRenderAll=window.renderAll;
  if(typeof prevRenderAll==='function')window.renderAll=function(){const r=prevRenderAll.apply(this,arguments);setTimeout(()=>{try{window.renderLtc()}catch(e){};apply()},60);return r};
  document.addEventListener('click',()=>setTimeout(apply,30));
  setInterval(apply,700);
  setTimeout(()=>{try{window.renderLtc()}catch(e){};apply()},300);
})();
