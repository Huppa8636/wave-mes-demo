// Prevent document-level LTC refresh handlers from stealing focus while users edit fields.
(function(){
  function install(){
    const test=document.getElementById('test');
    if(!test||test.dataset.focusGuardInstalled==='1')return;
    test.dataset.focusGuardInstalled='1';

    // All controls in the Field LTC screen already have their own handlers/inline actions.
    // Stop the click before it reaches legacy document-level refresh listeners that rebuild testForm.
    test.addEventListener('click',function(e){
      const interactive=e.target.closest('input,select,textarea,button,label,.processes');
      if(interactive)e.stopPropagation();
    });

    // Keyboard editing must never cause a background render either.
    test.addEventListener('focusin',function(){test.dataset.userEditing='1';});
    test.addEventListener('focusout',function(){
      setTimeout(()=>{
        if(!test.contains(document.activeElement)||!document.activeElement.matches('input,select,textarea'))test.dataset.userEditing='0';
      },0);
    });
  }

  // Also guard renderTest itself: if a legacy callback tries to redraw while a field is actively edited,
  // ignore that redraw. Explicit saves/lookup can temporarily bypass by clearing focus first.
  const baseRender=window.renderTest;
  if(typeof baseRender==='function'){
    window.renderTest=function(){
      const test=document.getElementById('test');
      const ae=document.activeElement;
      const editing=test&&test.classList.contains('active')&&ae&&test.contains(ae)&&ae.matches('input,select,textarea');
      if(editing)return;
      return baseRender.apply(this,arguments);
    };
  }

  install();
  document.addEventListener('DOMContentLoaded',install,{once:true});
  setTimeout(install,100);
})();
