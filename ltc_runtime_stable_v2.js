// WAVEPIA MES - consolidated stable Field LTC runtime v2
// Replaces the accumulated process/HOLD/qualification runtime patches with one state controller.
(function(){
  const WORKER_KEY='wave_mes_field_workers_v2';
  const INSPECTOR_KEY='wave_mes_field_inspectors_v1';
  const QLOG_KEY='wave_mes_field_inspection_logs_v1';
  const FIXED=['Plasma (PKG/PCB)','Die Attach','Epoxy Attach','Oven Cure','3D Scan','Plasma','Wire Bonding','Wire Pull Test','Inspection'];
  const FLEX=['LID Attach','Leak Test','CSAM','Impedance Measure','Laser Marking','HTRB','RF Test'];
  const OQC='OQC', PACK='Packing';
  const ALL=[...FIXED,...FLEX,OQC,PACK];
  const COOLDOWN_MS=10000;
  const COOLDOWN_PREFIX='wave_mes_ltc_cooldown_stable_';
  let cooldownTimer=null;

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function clean(v){return String(v||'').replace(/^✓\s*/,'').replace(/\s*←.*$/,'').trim();}
  function load(key,def){try{const x=JSON.parse(localStorage.getItem(key));return x??def}catch(e){return def}}
  function qlogs(){return load(QLOG_KEY,[])}
  function validRecord(x){return !['취소','무효'].includes(x?.recordStatus||x?.status||'')}
  function doneSet(l){
    const d=new Set((l?.done||[]).map(clean));
    try{(s.logs||[]).filter(x=>(x.ltcId===l.id||x.draft===l.draft)&&validRecord(x)).forEach(x=>d.add(clean(x.process)))}catch(e){}
    qlogs().filter(x=>x.draft===l?.draft&&validRecord(x)).forEach(x=>d.add(clean(x.process)));
    return d;
  }
  function activeHold(draft){try{return (s.nc||[]).find(n=>n.draft===draft&&n.holdManaged===true&&n.status==='HOLD')||null}catch(e){return null}}
  function stage(l){
    const done=doneSet(l);
    const fixed=FIXED.find(p=>!done.has(p));
    if(fixed)return {kind:'fixed',next:fixed,allowed:[fixed],done};
    const remain=FLEX.filter(p=>!done.has(p));
    if(remain.length)return {kind:'flex',next:remain[0],allowed:remain,done};
    if(!done.has(OQC))return {kind:'oqc',next:OQC,allowed:[OQC],done};
    if(!done.has(PACK))return {kind:'packing',next:PACK,allowed:[PACK],done};
    return {kind:'complete',next:'',allowed:[],done};
  }
  function lastGood(l){
    try{const a=(s.logs||[]).filter(x=>(x.ltcId===l.id||x.draft===l.draft)&&validRecord(x));if(a.length)return Number(a[0].good)||Number(l.qty)||0}catch(e){}
    const qa=qlogs().filter(x=>x.draft===l?.draft&&validRecord(x));if(qa.length)return Number(qa[0].good)||Number(l.qty)||0;
    return Number(l?.qty)||0;
  }
  function personState(p){
    if(!p||!p.qualified)return {ok:false,label:'자격 미등록'};
    if(!p.expiry)return {ok:false,label:'유효일 미등록'};
    const end=new Date(p.expiry+'T23:59:59');
    if(Number.isNaN(end.getTime()))return {ok:false,label:'유효일 오류'};
    if(end.getTime()<Date.now())return {ok:false,label:`자격 만료 (${p.expiry})`};
    return {ok:true,label:`자격 유효 / ${p.expiry}`};
  }
  function workers(){return load(WORKER_KEY,[]).map(x=>typeof x==='string'?{name:x,qualified:false,expiry:''}:x)}
  function inspectors(){return load(INSPECTOR_KEY,[]).map(x=>typeof x==='string'?{name:x,qualified:false,expiry:''}:x)}
  function personOptions(list){
    return list.map(p=>{const st=personState(p);return `<option value="${esc(p.name)}" ${st.ok?'':'disabled'}>${esc(p.name)} [${esc(st.label)}]</option>`}).join('');
  }
  function firstValid(list){return list.find(x=>personState(x).ok)||null}
  function cooldownKey(l){return l?.draft?COOLDOWN_PREFIX+l.draft:''}
  function cooldownLeft(l){const k=cooldownKey(l);if(!k)return 0;return Math.max(0,Number(localStorage.getItem(k)||0)-Date.now())}
  function startCooldown(l){const k=cooldownKey(l);if(k)localStorage.setItem(k,String(Date.now()+COOLDOWN_MS))}
  function persist(){try{if(typeof save==='function')save();else if(typeof window.save==='function')window.save()}catch(e){}}
  function audit(action,target,draft,before,after,reason){try{window.waveMesAudit?.(action,target,draft,before,after,reason)}catch(e){}}

  function ensureStyles(){
    if(document.getElementById('stableLtcRuntimeStyle'))return;
    const st=document.createElement('style');st.id='stableLtcRuntimeStyle';st.textContent=`
      .stable-hold{background:#fff0f1!important;border:2px solid #e5484d!important;color:#9f1720!important;padding:13px 15px!important;font-weight:700}
      .stable-hold b{font-size:15px}.stable-qual-ok{background:#eefaf4!important;border-color:#bde8ce!important;color:#176b4c!important}.stable-qual-bad{background:#fff0f1!important;border:2px solid #e5484d!important;color:#a41e28!important}
      .stable-actionbar{display:flex!important;align-items:center!important;width:100%!important;gap:8px!important}.stable-actionbar .lot-stop{margin-left:auto!important;background:#fff!important;color:#c32631!important;border:1px solid #eaa8ad!important}
      .stable-stage-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.stable-stage-box{border:1px solid #dce7ed;border-radius:9px;padding:9px;background:#fbfdfe}.stable-stage-box b{font-size:10px}.stable-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.stable-chip{font-size:9px;padding:5px 8px;border-radius:999px;border:1px solid #d7e2e8}.stable-chip.done{background:#e8f8ef;border-color:#bde9cf;color:#17734b}.stable-chip.now{background:#e9f6fd;border:2px solid #1594ce;color:#075d8c;font-weight:900}.stable-chip.pending{background:#f2f5f7;color:#9aa7af}.stable-ltc-hold{border:2px solid #e5484d!important}.stable-hold-tag{background:#d92d3a;color:#fff;border-radius:999px;padding:5px 9px;font-size:9px;font-weight:900}
      @media(max-width:900px){.stable-stage-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(st);
  }

  function renderWorkForm(){
    if(typeof selected==='undefined'||!selected)return;
    const form=document.getElementById('testForm');if(!form)return;
    const st=stage(selected),hold=activeHold(selected.draft),qty=lastGood(selected),ws=workers(),valid=firstValid(ws);
    if(st.kind==='oqc'||st.kind==='complete'){form.closest('.card').style.display='none';return}
    form.closest('.card').style.display='';
    const isPack=st.kind==='packing';
    const routeOptions=st.allowed.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
    const modeText=st.kind==='fixed'?`고정공정 자동 선택: ${st.next}`:(isPack?'OQC 완료 / Packing 진행':'제조공정 선택 가능 구간');
    const modeSub=st.kind==='fixed'?`고정공정 ${FIXED.filter(p=>st.done.has(p)).length}/${FIXED.length} 완료 · Inspection까지 순서 변경 및 스킵 불가`:(isPack?'Packing 완료 후 전체 공정이 종료됩니다.':`Inspection 이후 남은 제조공정 ${st.allowed.length}개 · 실제 수행 공정을 선택하세요.`);
    const qual=valid?`<div class="notice stable-qual-ok"><b>작업자 자격 확인 완료</b> / ${esc(valid.name)} · 유효일 ${esc(valid.expiry)}</div>`:`<div class="notice stable-qual-bad"><b>작업 가능한 유효 자격자가 없습니다.</b><br>작업자 관리에서 자격 등록 및 유효일을 확인해 주세요.</div>`;
    const holdBox=hold?`<div class="notice stable-hold"><b>LOT HOLD / 작업 입력 차단</b><br>공정 ${esc(hold.process||'-')} / 사유 ${esc(hold.reason||'-')}<br>품질 / 부적합에서 CLEAR 처리 후 입력 가능합니다.</div>`:'';
    form.innerHTML=`${holdBox}${qual}<div class="notice"><b>${esc(modeText)}</b><br>${esc(modeSub)}</div>
      <div class="form"><div class="field"><label>현재 입력 공정</label><select id="tp" ${st.kind==='fixed'||isPack?'disabled':''}>${routeOptions}</select></div>
      <div class="field"><label>작업자</label><select id="tw">${personOptions(ws)}</select></div><div class="field"><label>작업일시</label><input value="${new Date().toLocaleString('ko-KR')}" disabled></div>
      <div class="field"><label>투입수량</label><input id="ti" type="number" value="${qty}"></div><div class="field"><label>양품수량</label><input id="tg" type="number" value="${qty}"></div><div class="field"><label>불량수량</label><input id="tb" type="number" value="0" readonly></div>
      <div class="field span3"><label>비고</label><input id="tr" placeholder="선택 입력"></div></div>
      <div class="toolbar stable-actionbar" style="margin-top:12px"><button class="btn primary" id="stableWorkSave" onclick="saveTest()">작업 완료 등록</button><button class="btn danger lot-stop" id="workHoldBtn" onclick="registerLotHold('작업 실적')">부적합 / LOT 정지</button></div>
      <div style="margin-top:10px"><div class="small"><b>현재 단계</b> · 완료공정은 녹색 / 현재 가능 공정은 파란색</div><div class="processes" style="margin-top:6px">${(st.kind==='fixed'?FIXED:st.allowed).map(p=>`<button class="${st.done.has(p)?'done':''}" ${st.kind==='fixed'||isPack?'disabled':''} onclick="var x=document.getElementById('tp');x.value='${String(p).replace(/'/g,"\\'")}'">${st.done.has(p)?'✓ ':''}${esc(p)}${p===st.next?' ← 현재':''}</button>`).join('')}</div></div>`;
    if(valid)document.getElementById('tw').value=valid.name;
    const good=document.getElementById('tg'),input=document.getElementById('ti'),bad=document.getElementById('tb');
    const calc=()=>{bad.value=Math.max(0,(Number(input.value)||0)-(Number(good.value)||0))};good.oninput=calc;input.oninput=calc;
    if(hold){form.querySelectorAll('input,select,button').forEach(el=>{if(el.id!=='workHoldBtn')el.disabled=true});document.getElementById('workHoldBtn').disabled=true}
    updateCooldownUI();
  }

  function renderOqcForm(){
    const sec=document.getElementById('inspectionSection'),box=document.getElementById('inspectionForm');if(!sec||!box||typeof selected==='undefined'||!selected)return;
    const st=stage(selected);
    if(st.kind!=='oqc'){sec.style.display='none';return}
    sec.style.display='block';const hold=activeHold(selected.draft),qty=lastGood(selected),list=inspectors(),valid=firstValid(list);
    const h=sec.querySelector('.head h2');if(h)h.textContent='② 품질검사 실적 입력';const badge=sec.querySelector('.head .status');if(badge){badge.textContent='OQC 전용';badge.className='status warn'}
    const qual=valid?`<div class="notice stable-qual-ok"><b>검사자 자격 확인 완료</b> / ${esc(valid.name)} · 유효일 ${esc(valid.expiry)}</div>`:`<div class="notice stable-qual-bad"><b>검사 가능한 유효 자격자가 없습니다.</b><br>검사자 관리에서 자격 등록 및 유효일을 확인해 주세요.</div>`;
    const holdBox=hold?`<div class="notice stable-hold"><b>LOT HOLD / 검사 입력 차단</b><br>공정 ${esc(hold.process||'-')} / 사유 ${esc(hold.reason||'-')}</div>`:'';
    box.innerHTML=`${holdBox}${qual}<div class="form"><div class="field"><label>품질검사 항목</label><select id="inspectionProcess" disabled><option value="OQC">OQC</option></select></div>
      <div class="field"><label>검사자</label><select id="inspectorSelect">${personOptions(list)}</select></div><div class="field"><label>검사일시</label><input value="${new Date().toLocaleString('ko-KR')}" disabled></div>
      <div class="field"><label>검사수량</label><input id="inspectionInput" type="number" value="${qty}"></div><div class="field"><label>양품수량</label><input id="inspectionGood" type="number" value="${qty}"></div><div class="field"><label>불량수량</label><input id="inspectionBad" type="number" value="0" readonly></div><div class="field span3"><label>비고</label><input id="inspectionRemark" placeholder="선택 입력"></div></div>
      <div class="toolbar stable-actionbar" style="margin-top:12px"><button class="btn primary" id="stableOqcSave" onclick="saveInspectionResult()">OQC 검사 완료</button><button class="btn danger lot-stop" id="inspectionHoldBtn" onclick="registerLotHold('품질검사 실적')">부적합 / LOT 정지</button></div>`;
    if(valid)document.getElementById('inspectorSelect').value=valid.name;
    const good=document.getElementById('inspectionGood'),input=document.getElementById('inspectionInput'),bad=document.getElementById('inspectionBad');const calc=()=>{bad.value=Math.max(0,(Number(input.value)||0)-(Number(good.value)||0))};good.oninput=calc;input.oninput=calc;
    if(hold){box.querySelectorAll('input,select,button').forEach(el=>{if(el.id!=='inspectionHoldBtn')el.disabled=true});document.getElementById('inspectionHoldBtn').disabled=true}
    updateCooldownUI();
  }

  function renderComplete(){
    const sec=document.getElementById('inspectionSection');if(!sec||typeof selected==='undefined'||!selected)return;
    if(stage(selected).kind!=='complete')return;
    const work=document.getElementById('testForm')?.closest('.card');if(work)work.style.display='none';sec.style.display='block';
    const h=sec.querySelector('.head h2');if(h)h.textContent='② 전체 공정 완료';const badge=sec.querySelector('.head .status');if(badge){badge.textContent='완료';badge.className='status good'}
    const box=document.getElementById('inspectionForm');if(box)box.innerHTML='<div class="notice stable-qual-ok"><b>전체 공정 완료</b><br>제조공정 / OQC / Packing까지 완료된 LTC입니다.</div>';
  }

  function renderStableTest(){
    ensureStyles();
    if(typeof selected==='undefined'||!selected){if(typeof scanInfo!=='undefined'&&scanInfo)scanInfo.textContent='일치하는 LTC를 찾지 못했습니다.';if(typeof testForm!=='undefined'&&testForm)testForm.innerHTML='<div class="small">LTC 조회 후 입력할 수 있습니다.</div>';const q=document.getElementById('inspectionSection');if(q)q.style.display='none';return}
    if(typeof scanInfo!=='undefined'&&scanInfo)scanInfo.innerHTML=`호출완료 / <b>${esc(selected.no)}</b> / 기안 <b>${esc(selected.draft)}</b> / 고객문서 ${esc(selected.cust||'-')}`;
    const st=stage(selected);if(st.kind==='oqc')renderOqcForm();else if(st.kind==='complete')renderComplete();else{const q=document.getElementById('inspectionSection');if(q)q.style.display='none';renderWorkForm()}
  }

  function updateCooldownUI(){
    if(typeof selected==='undefined'||!selected)return;const ms=cooldownLeft(selected),sec=Math.ceil(ms/1000);const st=stage(selected);
    const btn=document.getElementById(st.kind==='oqc'?'stableOqcSave':'stableWorkSave');if(!btn)return;
    const hold=activeHold(selected.draft);if(hold)return;
    if(ms>0){btn.disabled=true;btn.textContent=`입력 대기 ${sec}초`}else{btn.disabled=false;btn.textContent=st.kind==='oqc'?'OQC 검사 완료':'작업 완료 등록'}
  }
  function startTimer(){if(cooldownTimer)clearInterval(cooldownTimer);cooldownTimer=setInterval(updateCooldownUI,250)}

  window.saveTest=function(){
    if(typeof selected==='undefined'||!selected)return alert('먼저 LTC를 조회해 주세요.');
    if(activeHold(selected.draft))return alert('LOT HOLD 상태입니다. HOLD 해제 후 입력해 주세요.');
    if(cooldownLeft(selected)>0)return alert('연속 입력 방지 대기시간입니다. 잠시 후 다시 입력해 주세요.');
    const st=stage(selected);if(!['fixed','flex','packing'].includes(st.kind))return alert(st.kind==='oqc'?'현재 단계는 OQC 품질검사입니다.':'이미 전체 공정이 완료되었습니다.');
    const sel=document.getElementById('tp'),chosen=clean(sel?.value||'');
    if(!st.allowed.includes(chosen)){renderStableTest();return alert('공정 상태가 갱신되었습니다. 현재 입력 가능한 공정을 다시 확인해 주세요.');}
    const w=workers().find(x=>x.name===document.getElementById('tw')?.value),ws=personState(w);if(!ws.ok)return alert(`작업자 자격 확인 실패\n${ws.label}`);
    const input=Number(document.getElementById('ti')?.value)||0,good=Number(document.getElementById('tg')?.value)||0,bad=Math.max(0,input-good);if(input<=0||good<0||good>input)return alert('투입수량 / 양품수량을 확인해 주세요.');
    const before=doneSet(selected);s.logs=s.logs||[];s.logs.unshift({id:typeof id==='function'?id():'LOG-'+Date.now(),ltcId:selected.id,draft:selected.draft,cust:selected.cust,ltc:selected.no,prod:selected.prod,process:chosen,input,good,bad,worker:w.name,remark:document.getElementById('tr')?.value.trim()||'',at:new Date().toLocaleString('ko-KR'),recordStatus:'유효',qualificationSnapshot:{qualified:w.qualified,expiry:w.expiry},processVersion:selected.processVersion||'PROC-2026.08-V1'});
    if(!Array.isArray(selected.done))selected.done=[];if(!selected.done.includes(chosen))selected.done.push(chosen);persist();audit('CREATE','작업실적',selected.draft,null,{process:chosen,worker:w.name,input,good,bad},'현장 LTC 작업 완료');startCooldown(selected);
    if(typeof renderLogs==='function')renderLogs();if(typeof renderAll==='function')renderAll();renderStableTest();startTimer();
  };

  window.saveInspectionResult=function(){
    if(typeof selected==='undefined'||!selected)return alert('먼저 LTC를 조회해 주세요.');
    if(activeHold(selected.draft))return alert('LOT HOLD 상태입니다. HOLD 해제 후 입력해 주세요.');
    if(cooldownLeft(selected)>0)return alert('연속 입력 방지 대기시간입니다. 잠시 후 다시 입력해 주세요.');
    if(stage(selected).kind!=='oqc'){renderStableTest();return alert('현재 단계는 OQC가 아닙니다. 현재 공정을 확인해 주세요.');}
    const p=inspectors().find(x=>x.name===document.getElementById('inspectorSelect')?.value),ps=personState(p);if(!ps.ok)return alert(`검사자 자격 확인 실패\n${ps.label}`);
    const input=Number(document.getElementById('inspectionInput')?.value)||0,good=Number(document.getElementById('inspectionGood')?.value)||0,bad=Math.max(0,input-good);if(input<=0||good<0||good>input)return alert('검사수량 / 양품수량을 확인해 주세요.');
    const logs=qlogs();logs.unshift({id:'INSP-'+Date.now(),draft:selected.draft,ltc:selected.no,prod:selected.prod,process:OQC,inspector:p.name,input,good,bad,remark:document.getElementById('inspectionRemark')?.value.trim()||'',at:new Date().toLocaleString('ko-KR'),recordStatus:'유효',qualificationSnapshot:{qualified:p.qualified,expiry:p.expiry},processVersion:selected.processVersion||'PROC-2026.08-V1'});localStorage.setItem(QLOG_KEY,JSON.stringify(logs));
    if(!Array.isArray(selected.done))selected.done=[];if(!selected.done.includes(OQC))selected.done.push(OQC);try{(s.quality||[]).filter(q=>q.draft===selected.draft&&q.type==='출하검사').forEach(q=>q.status='검사완료')}catch(e){}persist();audit('CREATE','품질검사실적',selected.draft,null,{process:OQC,inspector:p.name,input,good,bad},'OQC 검사 완료');startCooldown(selected);if(typeof renderAll==='function')renderAll();renderStableTest();startTimer();
  };

  window.registerLotHold=function(source){
    if(typeof selected==='undefined'||!selected)return alert('먼저 LTC를 조회해 주세요.');if(activeHold(selected.draft))return alert('이미 LOT HOLD 상태입니다.');
    const st=stage(selected),process=st.next||'-',reason=prompt(`부적합 사유를 입력해 주세요.\n공정: ${process}`,'');if(reason===null)return;if(!reason.trim())return alert('부적합 사유를 입력해 주세요.');
    s.nc=s.nc||[];const n={id:'NCR-'+Date.now(),draft:selected.draft,prod:selected.prod,qty:lastGood(selected),reason:reason.trim(),status:'HOLD',holdManaged:true,source:source||'현장 LTC',process,heldAt:new Date().toLocaleString('ko-KR'),clearedAt:'',clearReason:''};s.nc.unshift(n);persist();audit('HOLD','부적합',selected.draft,null,n,reason.trim());if(typeof renderAll==='function')renderAll();renderStableTest();alert('LOT HOLD 처리되었습니다. 해제 전까지 실적 입력이 차단됩니다.');
  };
  window.clearLotHold=function(nid){const n=(s.nc||[]).find(x=>String(x.id)===String(nid));if(!n||n.status!=='HOLD')return;const reason=prompt('부적합 HOLD 해제 사유를 입력해 주세요.','조치 완료');if(reason===null||!reason.trim())return;n.status='CLEAR';n.clearedAt=new Date().toLocaleString('ko-KR');n.clearReason=reason.trim();persist();audit('CLEAR','부적합',n.draft,{status:'HOLD'},{status:'CLEAR'},reason.trim());if(typeof renderAll==='function')renderAll();if(typeof selected!=='undefined'&&selected?.draft===n.draft)renderStableTest()};

  function renderQualityHoldList(){const box=document.getElementById('ncList');if(!box)return;const list=s.nc||[];box.innerHTML=list.length?list.map(n=>{const hold=n.holdManaged===true&&n.status==='HOLD',clear=n.holdManaged===true&&n.status==='CLEAR';return `<div class="log"><div class="head"><b>${esc(n.prod||'-')} / ${Number(n.qty)||0}ea</b><span class="status ${hold?'bad':clear?'good':'warn'}">${hold?'HOLD / 입력차단':clear?'CLEAR / 해제':'검토중'}</span></div><div class="small">기안 <span class="trace clicktrace" onclick="focusLtc('${esc(n.draft)}')">${esc(n.draft)}</span> / 공정 ${esc(n.process||'-')} / ${esc(n.reason||'-')}</div>${n.holdManaged===true?`<div class="small">등록 ${esc(n.heldAt||'-')}${clear?` / 해제 ${esc(n.clearedAt||'-')} / ${esc(n.clearReason||'-')}`:''}</div>${hold?`<div class="toolbar" style="margin-top:7px"><button class="btn primary" onclick="clearLotHold('${esc(n.id)}')">부적합 HOLD 해제</button></div>`:''}`:''}</div>`}).join(''):'<div class="small">등록된 부적합이 없습니다.</div>'}

  window.renderLtc=function(){
    ensureStyles();if(typeof ltcList==='undefined'||!ltcList)return;ltcList.innerHTML=(s.ltcs||[]).map(l=>{const st=stage(l),hold=activeHold(l.draft),done=st.done,open=(typeof expandedLtcDraft!=='undefined'&&expandedLtcDraft===l.draft),pct=Math.round(done.size/ALL.length*100),completed=ALL.filter(p=>done.has(p)),current=st.kind==='flex'?st.allowed:(st.next?[st.next]:[]),pending=ALL.filter(p=>!done.has(p)&&!current.includes(p));return `<div class="card ${hold?'stable-ltc-hold':''}" id="ltc-${esc(l.draft)}" style="box-shadow:none"><div class="head"><div><b class="trace clicktrace" onclick="toggleLtc('${esc(l.draft)}')">${esc(l.draft)}</b><div class="small">${esc(l.no)} / ${esc(l.prod||'-')} / ${Number(l.qty)||0}ea</div></div>${hold?'<span class="stable-hold-tag">HOLD / 작업중지</span>':st.kind==='complete'?'<span class="status good">전체 완료</span>':`<span class="status warn">${done.size}/${ALL.length} · ${pct}%</span>`}</div>${hold?`<div class="notice stable-hold"><b>LOT HOLD</b> / ${esc(hold.process||'-')} / ${esc(hold.reason||'-')}</div>`:''}<div class="progress"><i style="width:${pct}%"></i></div><div class="ltc-detail ${open?'open':''}"><div class="stable-stage-grid"><div class="stable-stage-box"><b style="color:#17734b">완료 ${completed.length}</b><div class="stable-chips">${completed.map(p=>`<span class="stable-chip done">✓ ${esc(p)}</span>`).join('')||'<span class="small">없음</span>'}</div></div><div class="stable-stage-box"><b style="color:#075d8c">현재 / 가능</b><div class="stable-chips">${current.map(p=>`<span class="stable-chip now">${esc(p)}</span>`).join('')||'<span class="small">전체 완료</span>'}</div></div><div class="stable-stage-box"><b style="color:#7b8993">미진행 ${pending.length}</b><div class="stable-chips">${pending.map(p=>`<span class="stable-chip pending">${esc(p)}</span>`).join('')||'<span class="small">없음</span>'}</div></div></div></div></div>`}).join('')
  };

  // Replace only field rendering; keep worker/inspector management panels created by the base patches.
  window.renderTest=renderStableTest;
  const prevRenderAll=window.renderAll;
  window.renderAll=function(){const r=typeof prevRenderAll==='function'?prevRenderAll.apply(this,arguments):undefined;try{window.renderLtc();renderQualityHoldList()}catch(e){}return r};
  document.addEventListener('click',e=>{if(e.target?.closest?.('#test')||e.target?.matches?.('#workerManageBtn,#inspectorManageBtn'))setTimeout(renderStableTest,40)});
  ensureStyles();setTimeout(()=>{try{window.renderLtc();renderQualityHoldList();if(document.getElementById('test')?.classList.contains('active'))renderStableTest();startTimer()}catch(e){}},250);
})();