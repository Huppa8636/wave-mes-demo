// WAVEPIA ERP-MES - enterprise/AQMS navigation layer
// Non-destructive: existing data-v buttons, view ids, storage keys, and runtime functions are preserved.
(function(){
  const GROUPS=[
    {id:'g-dashboard',label:'전사 현황',views:['dash']},
    {id:'g-sales',label:'영업',views:['req']},
    {id:'g-dev',label:'개발',views:[],note:'개발 프로젝트 / 형상관리 준비'},
    {id:'g-purchase',label:'구매 / 자재',views:['inv','issue']},
    {id:'g-production',label:'생산',views:['reqs','ltc','test']},
    {id:'g-quality',label:'품질',views:['qreq','quality']},
    {id:'g-resource',label:'설비 / 자원',views:[],note:'설비 / 계측기 / 교육·자격 준비'},
    {id:'g-doc',label:'문서 / 기록',views:['audit']},
    {id:'g-management',label:'경영',views:[],note:'KPI / 경영검토 준비'},
    {id:'g-admin',label:'관리',views:['admin']}
  ];

  function ensureStyle(){
    if(document.getElementById('aqmsEnterpriseNavStyle'))return;
    const s=document.createElement('style');s.id='aqmsEnterpriseNavStyle';s.textContent=`
      #nav.enterprise-nav{display:block!important;overflow-y:auto!important;max-height:calc(100vh - 210px);padding-right:2px}
      #nav .aqms-group{margin:8px 0 11px;padding:0}
      #nav .aqms-group-label{font-size:9px;line-height:1.2;color:#7fd0f2;font-weight:900;letter-spacing:.04em;text-transform:none;padding:7px 10px 4px;border-top:1px solid rgba(255,255,255,.08)}
      #nav .aqms-group:first-child .aqms-group-label{border-top:0;padding-top:1px}
      #nav .aqms-group button{margin:1px 0!important;padding:8px 11px!important;font-size:11px}
      #nav .aqms-group-note{font-size:8px;color:#758da8;padding:3px 11px 5px;line-height:1.35}
      #nav .aqms-group.empty{display:none}
      @media(max-width:900px){#nav.enterprise-nav{display:flex!important;max-height:none;overflow-x:auto;overflow-y:hidden;gap:4px}.aqms-group{display:flex!important;align-items:center;margin:0!important;white-space:nowrap}.aqms-group-label{display:none}.aqms-group-note{display:none}}
    `;document.head.appendChild(s);
  }

  function build(){
    const nav=document.getElementById('nav');if(!nav||nav.dataset.aqmsLayer==='1')return;
    ensureStyle();
    const buttons=[...nav.querySelectorAll(':scope > button')];
    if(!buttons.length)return;
    const byView=new Map(buttons.map(b=>[b.dataset.v,b]));
    nav.innerHTML='';nav.classList.add('enterprise-nav');
    const placed=new Set();
    GROUPS.forEach(g=>{
      const wrap=document.createElement('div');wrap.className='aqms-group';wrap.dataset.group=g.id;
      const label=document.createElement('div');label.className='aqms-group-label';label.textContent=g.label;wrap.appendChild(label);
      g.views.forEach(v=>{const b=byView.get(v);if(b){wrap.appendChild(b);placed.add(b)}});
      if(g.note){const n=document.createElement('div');n.className='aqms-group-note';n.textContent=g.note;wrap.appendChild(n)}
      nav.appendChild(wrap);
    });
    // Preserve any future/unknown existing modules without changing their handlers.
    const rest=buttons.filter(b=>!placed.has(b));
    if(rest.length){
      const wrap=document.createElement('div');wrap.className='aqms-group';wrap.dataset.group='g-other';
      const label=document.createElement('div');label.className='aqms-group-label';label.textContent='기타 업무';wrap.appendChild(label);
      rest.forEach(b=>wrap.appendChild(b));nav.appendChild(wrap);
    }
    nav.dataset.aqmsLayer='1';
    refreshVisibility();
  }

  function refreshVisibility(){
    const nav=document.getElementById('nav');if(!nav)return;
    nav.querySelectorAll('.aqms-group').forEach(g=>{
      const buttons=[...g.querySelectorAll('button')];
      const visible=buttons.some(b=>getComputedStyle(b).display!=='none');
      const hasNote=!!g.querySelector('.aqms-group-note');
      g.classList.toggle('empty',!visible&&!hasNote);
    });
  }

  build();
  // Login/role patch can change button visibility after startup. Only update group visibility; never rerender pages.
  setTimeout(refreshVisibility,400);
  setTimeout(refreshVisibility,1200);
  document.addEventListener('click',e=>{if(e.target.closest('#nav')||e.target.id==='wpLoginBtn'||e.target.id==='wpLogout')setTimeout(refreshVisibility,80)});
})();
