// Input usability patch: auto-calc bad qty + manual due-date entry normalization
(function(){
  function toNum(v){const n=Number(v);return Number.isFinite(n)?n:0;}

  function bindQtyAutoCalc(){
    // 제조 작업 실적: 투입수량 - 양품수량 = 불량수량
    const input=document.getElementById('ti');
    const good=document.getElementById('tg');
    const bad=document.getElementById('tb');
    if(input&&good&&bad&&good.dataset.autoBadBound!=='1'){
      good.dataset.autoBadBound='1';
      const calc=()=>{
        const total=toNum(input.value), g=toNum(good.value);
        if(g<0||total<0)return;
        bad.value=String(Math.max(0,total-g));
      };
      good.addEventListener('input',calc);
      input.addEventListener('input',calc);
      bad.readOnly=true;
      bad.title='투입수량 - 양품수량으로 자동 계산됩니다.';
    }

    // OQC 검사 실적: 검사수량 - 양품수량 = 불량수량
    const qInput=document.getElementById('inspectionInput');
    const qGood=document.getElementById('inspectionGood');
    const qBad=document.getElementById('inspectionBad');
    if(qInput&&qGood&&qBad&&qGood.dataset.autoBadBound!=='1'){
      qGood.dataset.autoBadBound='1';
      const calcQ=()=>{
        const total=toNum(qInput.value), g=toNum(qGood.value);
        if(g<0||total<0)return;
        qBad.value=String(Math.max(0,total-g));
      };
      qGood.addEventListener('input',calcQ);
      qInput.addEventListener('input',calcQ);
      qBad.readOnly=true;
      qBad.title='검사수량 - 양품수량으로 자동 계산됩니다.';
    }
  }

  function normalizeDateDigits(v){
    const d=String(v||'').replace(/\D/g,'').slice(0,8);
    if(d.length<=4)return d;
    if(d.length<=6)return d.slice(0,4)+'-'+d.slice(4);
    return d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8);
  }
  function validDate(v){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
    const [y,m,d]=v.split('-').map(Number);
    const x=new Date(y,m-1,d);
    return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d;
  }
  function bindManualDueDate(){
    const due=document.getElementById('rDue');
    if(!due||due.dataset.manualDateBound==='1')return;
    due.dataset.manualDateBound='1';

    // Chrome의 분절형 date 입력이 수기 입력 시 꼬이는 문제를 피하기 위해
    // 직접 YYYY-MM-DD 형식의 일반 입력칸으로 사용한다.
    const existing=due.value;
    try{due.type='text';}catch(e){}
    due.inputMode='numeric';
    due.maxLength=10;
    due.placeholder='YYYY-MM-DD';
    due.autocomplete='off';
    due.value=existing&&/^\d{4}-\d{2}-\d{2}$/.test(existing)?existing:'';
    due.addEventListener('input',()=>{
      const pos=due.selectionStart;
      due.value=normalizeDateDigits(due.value);
    });
    due.addEventListener('blur',()=>{
      if(due.value&&!validDate(due.value)){
        due.setCustomValidity('납기일을 YYYY-MM-DD 형식으로 입력해 주세요.');
      }else due.setCustomValidity('');
    });
  }

  function apply(){bindQtyAutoCalc();bindManualDueDate();}

  // 화면 렌더링 때 입력 요소가 다시 생성되므로 renderTest 뒤에도 재바인딩
  const prevRender=window.renderTest;
  if(typeof prevRender==='function'){
    window.renderTest=function(){
      const r=prevRender.apply(this,arguments);
      setTimeout(apply,30);
      return r;
    };
  }

  // 작업요청 화면 전환 후에도 납기 입력을 보정
  document.addEventListener('click',()=>setTimeout(apply,0));
  setInterval(apply,1000);
  setTimeout(apply,50);
})();
