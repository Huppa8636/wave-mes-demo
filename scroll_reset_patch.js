// Reset scroll position when switching main categories/views
(function(){
  function resetScroll(){
    try{window.scrollTo({top:0,left:0,behavior:'auto'});}catch(e){window.scrollTo(0,0)}
    const main=document.querySelector('main');
    if(main&&main.scrollTop)main.scrollTop=0;
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
  }

  function bindNav(){
    document.querySelectorAll('#nav button').forEach(btn=>{
      if(btn.dataset.scrollResetBound==='1')return;
      btn.dataset.scrollResetBound='1';
      btn.addEventListener('click',()=>{
        requestAnimationFrame(()=>requestAnimationFrame(resetScroll));
        setTimeout(resetScroll,40);
      },true);
    });
  }

  // Any programmatic view switch should also start from the top.
  const prevShow=window.show;
  if(typeof prevShow==='function'){
    window.show=function(){
      const r=prevShow.apply(this,arguments);
      requestAnimationFrame(()=>requestAnimationFrame(resetScroll));
      return r;
    };
  }

  document.addEventListener('click',()=>setTimeout(bindNav,0));
  setInterval(bindNav,1000);
  setTimeout(bindNav,100);
})();
