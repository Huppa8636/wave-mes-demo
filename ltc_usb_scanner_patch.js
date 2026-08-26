// USB QR/Barcode scanner support: accepts LTC___<draft> and URL...LTC___<draft> + Enter
(function(){
  let buf='';
  let last=0;
  const RESET_MS=250;

  function extract(raw){
    const s=String(raw||'').trim();
    // Accept plain LTC___CODE or any scanned URL/text containing LTC___CODE.
    const m=s.match(/LTC___([A-Za-z0-9_.\/-]+)/i);
    if(m)return m[1].trim();
    return '';
  }

  function go(code){
    if(!code)return false;
    if(typeof window.show!=='function'||typeof window.lookup!=='function')return false;
    const scan=document.getElementById('scan');
    if(!scan)return false;
    try{window.show('test');}catch(e){}
    scan.value=code;
    window.lookup();
    // Some legacy handlers can return to dashboard after Enter; force Field LTC after lookup settles.
    setTimeout(function(){
      try{window.show('test');}catch(e){}
      const s=document.getElementById('scan');
      if(s)s.value=code;
      try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch(e){window.scrollTo(0,0)}
    },80);
    return true;
  }

  document.addEventListener('keydown',function(e){
    const now=Date.now();
    if(now-last>RESET_MS)buf='';
    last=now;

    if(e.key==='Enter'){
      const code=extract(buf);
      if(code){
        e.preventDefault();
        e.stopImmediatePropagation();
        go(code);
      }
      buf='';
      return;
    }

    if(e.key && e.key.length===1){
      buf+=e.key;
      if(buf.length>300)buf=buf.slice(-300);
    }
  },true);

  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter')return;
    const el=e.target;
    if(!el || el.id!=='scan')return;
    const code=extract(el.value);
    if(code){
      e.preventDefault();
      e.stopImmediatePropagation();
      go(code);
    }
  },true);
})();
