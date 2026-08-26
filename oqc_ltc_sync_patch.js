// OQC completion -> Digital LTC sync patch
(function(){
  const QLOG_KEY='wave_mes_field_inspection_logs_v1';
  function qlogCount(draft){
    try{return (JSON.parse(localStorage.getItem(QLOG_KEY))||[]).filter(x=>x.draft===draft&&String(x.process||'').trim()==='OQC').length;}catch(e){return 0;}
  }
  function syncOqcToLtc(l){
    if(!l)return;
    if(!Array.isArray(l.done))l.done=[];
    if(!l.done.includes('OQC'))l.done.push('OQC');
    try{
      if(typeof s!=='undefined'&&Array.isArray(s.quality)){
        s.quality.filter(q=>q.draft===l.draft&&q.type==='출하검사').forEach(q=>q.status='검사완료');
      }
    }catch(e){}
    try{
      if(typeof window.save==='function')window.save();
      else if(typeof save==='function')save();
      else if(typeof window.renderAll==='function')window.renderAll();
    }catch(e){try{if(typeof window.renderAll==='function')window.renderAll();}catch(_){} }
  }
  const prev=window.saveInspectionResult;
  if(typeof prev!=='function')return;
  window.saveInspectionResult=function(){
    if(typeof selected==='undefined'||!selected)return prev.apply(this,arguments);
    const target=selected;
    const before=qlogCount(target.draft);
    const r=prev.apply(this,arguments);
    const after=qlogCount(target.draft);
    if(after>before){
      syncOqcToLtc(target);
      setTimeout(()=>{
        try{
          if(typeof window.renderLtc==='function')window.renderLtc();
          if(typeof window.renderTest==='function')window.renderTest();
        }catch(e){}
      },0);
    }
    return r;
  };
})();