// USB QR/Barcode scanner support: LTC___<draft> + Enter -> Field LTC lookup
(function(){
  let buf='';
  let last=0;
  const RESET_MS=180;

  function extract(raw){
    const s=String(raw||'').trim();
    const m=s.match(/(?:^|[^A-Za-z0-9])LTC___([A-Za-z0-9_.\/-]+)/i) || s.match(/^LTC___([A-Za-z0-9_.\/-]+)$/i);
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
    try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch(e){window.scrollTo(0,0)}
    return true;
  }

  // Global scanner capture. Most USB scanners behave like a keyboard and append Enter.
  document.addEventListener('keydown',function(e){
    const now=Date.now();
    if(now-last>RESET_MS)buf='';
    last=now;

    if(e.key==='Enter'){
      const code=extract(buf);
      if(code){
        e.preventDefault();
        e.stopPropagation();
        go(code);
      }
      buf='';
      return;
    }

    if(e.key && e.key.length===1){
      buf+=e.key;
      if(buf.length>120)buf=buf.slice(-120);
    }
  },true);

  // Also support pasting/scanning the code directly into the LTC scan box.
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter')return;
    const el=e.target;
    if(!el || el.id!=='scan')return;
    const code=extract(el.value);
    if(code){
      e.preventDefault();
      e.stopPropagation();
      el.value=code;
      if(typeof window.lookup==='function')window.lookup();
    }
  },true);
})();
