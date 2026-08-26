// Ensure Field LTC advances immediately after a successful save without requiring manual refresh.
(function(){
  const QLOG_KEY='wave_mes_field_inspection_logs_v1';
  function qCount(){try{return (JSON.parse(localStorage.getItem(QLOG_KEY))||[]).length}catch(e){return 0}}
  function logCount(){try{return (s.logs||[]).length}catch(e){return 0}}
  function safeRefresh(){
    const test=document.getElementById('test');
    if(!test||!test.classList.contains('active'))return;
    const ae=document.activeElement;
    if(ae && test.contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) ae.blur();
    try{ if(typeof window.renderTest==='function') window.renderTest(); }catch(e){}
  }

  const baseSaveTest=window.saveTest;
  if(typeof baseSaveTest==='function'){
    window.saveTest=function(){
      const before=logCount();
      const r=baseSaveTest.apply(this,arguments);
      const after=logCount();
      if(after>before){
        try{document.activeElement?.blur?.()}catch(e){}
        // Re-render only on a real successful save. This avoids background/focus stealing.
        setTimeout(safeRefresh,30);
        setTimeout(safeRefresh,180);
      }
      return r;
    };
  }

  const baseSaveInspection=window.saveInspectionResult;
  if(typeof baseSaveInspection==='function'){
    window.saveInspectionResult=function(){
      const before=qCount();
      const r=baseSaveInspection.apply(this,arguments);
      const after=qCount();
      if(after>before){
        try{document.activeElement?.blur?.()}catch(e){}
        setTimeout(safeRefresh,30);
        setTimeout(safeRefresh,180);
      }
      return r;
    };
  }
})();
