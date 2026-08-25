// E-Count ERP inventory import patch for WAVE MES demo
(function(){
  function relabel(){
    const inv=document.getElementById('inv');
    if(!inv)return;
    const notice=inv.querySelector('.notice');
    if(notice) notice.textContent='E-Count ERP에서 내려받은 재고현황 Excel / CSV 파일을 불러와 현재 재고표에 반영합니다. E-Count 파일의 [재고현황] 양식(품목코드 / 품목명 / 규격 / 재고수량 / 품목구분 / 적요 / Location / 세부정보1~3)을 자동 인식합니다. 파일은 브라우저에서만 읽습니다.';
    const buttons=[...inv.querySelectorAll('button')];
    const loadBtn=buttons.find(b=>/재고 불러오기/.test(b.textContent));
    if(loadBtn) loadBtn.textContent='E-Count ERP 재고 불러오기';
    const file=inv.querySelector('input[type=file]');
    if(file){ file.id='ecountInvFile'; file.setAttribute('onchange','loadEcountInventory(this)'); }
    const info=inv.querySelector('#bizInvInfo');
    if(info){ info.id='ecountInvInfo'; info.textContent='E-Count ERP 파일 선택 대기'; }
    if(loadBtn) loadBtn.onclick=()=>document.getElementById('ecountInvFile').click();
  }

  function norm(v){return String(v??'').replace(/\s/g,'').toLowerCase()}
  function num(v){const n=Number(String(v??'').replace(/,/g,'').trim());return Number.isFinite(n)?n:0}

  window.loadEcountInventory=async function(input){
    const f=input.files&&input.files[0]; if(!f)return;
    const info=document.getElementById('ecountInvInfo'); if(info)info.textContent='E-Count ERP 재고현황 읽는 중...';
    try{
      if(!window.XLSX){
        await new Promise((resolve,reject)=>{const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';sc.onload=resolve;sc.onerror=reject;document.head.appendChild(sc)});
      }
      const data=await f.arrayBuffer();
      const wb=XLSX.read(data,{type:'array'});
      const sheetName=wb.SheetNames.find(n=>/재고현황/i.test(n))||wb.SheetNames[0];
      const ws=wb.Sheets[sheetName];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
      if(!rows.length) throw new Error('빈 파일입니다.');

      let h=-1;
      for(let r=0;r<Math.min(rows.length,20);r++){
        const a=rows[r].map(norm);
        if(a.some(x=>x==='품목코드') && a.some(x=>x==='재고수량')){h=r;break;}
      }
      if(h<0) throw new Error('E-Count 재고현황 헤더(품목코드 / 재고수량)를 찾지 못했습니다.');

      const headers=rows[h].map(v=>String(v||'').trim());
      const idx=(name)=>headers.findIndex(x=>norm(x)===norm(name));
      const ci=idx('품목코드'), ni=idx('품목명'), si=idx('재고수량');
      const specI=idx('규격'), typeI=idx('품목구분'), noteI=idx('적요'), locI=idx('Location');
      if(ci<0||ni<0||si<0) throw new Error('필수 열: 품목코드 / 품목명 / 재고수량');

      const prev=new Map((s.inventory||[]).map(x=>[String(x[0]),x]));
      const mapped=[];
      const meta=[];
      for(let r=h+1;r<rows.length;r++){
        const row=rows[r];
        const code=String(row[ci]??'').trim();
        const name=String(row[ni]??'').trim();
        if(!code&&!name)continue;
        const stock=num(row[si]);
        const old=prev.get(code);
        const reserved=old?num(old[3]):0; // E-Count 재고현황에는 예약 열이 없으므로 기존 MES 예약값 유지
        const inspection=old&&old[4]?String(old[4]):'-'; // 수입검사 상태도 E-Count 파일에는 없음
        mapped.push([code,name,stock,reserved,inspection]);
        meta.push({code,name,spec:specI>=0?String(row[specI]??'').trim():'',type:typeI>=0?String(row[typeI]??'').trim():'',note:noteI>=0?String(row[noteI]??'').trim():'',location:locI>=0?String(row[locI]??'').trim():''});
      }
      if(!mapped.length) throw new Error('불러올 재고 품목이 없습니다.');
      s.inventory=mapped;
      s.ecountInventoryMeta=meta;
      save();
      if(info) info.textContent=`E-Count ERP 반영 완료 / ${f.name} / ${sheetName} / ${mapped.length.toLocaleString()}개 품목 / 예약 및 수입검사 상태는 MES 기존값 유지`;
    }catch(e){
      if(info)info.textContent='E-Count ERP 불러오기 실패 / '+(e.message||e);
      alert('E-Count ERP 재고현황 파일을 확인해 주세요.\n현재 양식은 1행 보고서 제목, 2행 헤더(품목코드 / 품목명 / 규격 / 재고수량 / 품목구분 / 적요 / Location / 세부정보1~3)를 기준으로 읽습니다.');
    }finally{input.value='';}
  };

  // 이전 함수명으로 호출되어도 E-Count 파서 사용
  window.loadBizmekaInventory=window.loadEcountInventory;
  relabel();
})();
