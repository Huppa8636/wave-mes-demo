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
  let openGroup='g-dashboard';

  function ensureStyle(){
    if(document.getElementById('aqmsEnterpriseNavStyle'))return;
    const s=document.createElement('style');s.id='aqmsEnterpriseNavStyle';s.textContent=`
      #nav.enterprise-nav{display:block!important;overflow-y:auto!important;max-height:calc(100vh - 210px);padding-right:2px}
      #nav .aqms-group{margin:3px 0 5px;padding:0;border-bottom:1px solid rgba(255,255,255,.07)}
      #nav .aqms-group-label{position:relative;font-size:10px;line-height:1.2;color:#82d6f5;font-weight:900;padding:9px 24px 8px 9px;cursor:pointer;user-select:none}
      #nav .aqms-group-label:after{content:'›';position:absolute;right:9px;top:7px;font-size:16px;transition:transform .16s ease;color:#9cc7da}
      #nav .aqms-group.open>.aqms-group-label:after{transform:rotate(90deg)}
      #nav .aqms-group:not(.open)>button,#nav .aqms-group:not(.open)>.aqms-group-note{display:none!important}
      #nav .aqms-group button{margin:1px 0!important;padding:8px 11px!important;font-size:11px}
      #nav .aqms-group-note{font-size:8px;color:#758da8;padding:2px 11px 7px;line-height:1.35}
      #nav .aqms-group.empty{display:none!important}
      #nav .aqms-group.open>.aqms-group-label{background:rgba(255,255,255,.045);color:#b7ebff}
      @media(max-width:900px){#nav.enterprise-nav{display:flex!important;max-height:none;overflow-x:auto;overflow-y:hidden;gap:4px}.aqms-group{display:flex!important;align-items:center;margin:0!important;white-space:nowrap}.aqms-group-label{display:none}.aqms-group:not(.open)>button{display:block!important}.aqms-group-note{display:none!important}}
    `;document.head.appendChild(s);
  }

  function bindGroup(wrap){
    const label=wrap.querySelector(':scope>.aqms-group-label');if(!label||label.dataset.bound==='1')return;
    label.dataset.bound='1';label.onclick=()=>{
      const id=wrap.dataset.group;
      const was=wrap.classList.contains('open');
      document.querySelectorAll('#nav .aqms-group').forEach(g=>g.classList.remove('open'));
      if(!was){wrap.classList.add('open');openGroup=id}else openGroup='';
    };
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
      nav.appendChild(wrap);bindGroup(wrap);
    });
    const rest=buttons.filter(b=>!placed.has(b));
    if(rest.length){const wrap=document.createElement('div');wrap.className='aqms-group';wrap.dataset.group='g-other';wrap.innerHTML='<div class="aqms-group-label">기타 업무</div>';rest.forEach(b=>wrap.appendChild(b));nav.appendChild(wrap);bindGroup(wrap)}
    nav.dataset.aqmsLayer='1';
    openForActive();refreshVisibility();
  }

  function openForActive(){
    const nav=document.getElementById('nav');if(!nav)return;
    const active=nav.querySelector('button.active');const g=active?.closest('.aqms-group');
    if(g){document.querySelectorAll('#nav .aqms-group').forEach(x=>x.classList.remove('open'));g.classList.add('open');openGroup=g.dataset.group||'';}
    else if(openGroup){nav.querySelector(`[data-group="${openGroup}"]`)?.classList.add('open')}
  }

  function absorbLateGroups(){
    const nav=document.getElementById('nav');if(!nav)return;
    // Modules such as AQMS Document Center can add a group after this layer initializes.
    nav.querySelectorAll(':scope>.aqms-group').forEach(g=>{bindGroup(g);if(!g.classList.contains('open')&&g.dataset.group===openGroup)g.classList.add('open')});
  }

  function refreshVisibility(){
    const nav=document.getElementById('nav');if(!nav)return;
    absorbLateGroups();
    nav.querySelectorAll('.aqms-group').forEach(g=>{
      const buttons=[...g.querySelectorAll(':scope>button')];
      const visible=buttons.some(b=>b.style.display!=='none');
      const hasNote=!!g.querySelector(':scope>.aqms-group-note');
      g.classList.toggle('empty',!visible&&!hasNote);
    });
  }

  window.waveMesRefreshEnterpriseNav=function(){setTimeout(()=>{refreshVisibility();openForActive()},20)};
  build();
  setTimeout(refreshVisibility,250);setTimeout(refreshVisibility,700);setTimeout(refreshVisibility,1400);
  document.addEventListener('click',e=>{
    const btn=e.target.closest('#nav button');
    if(btn){const g=btn.closest('.aqms-group');if(g){document.querySelectorAll('#nav .aqms-group').forEach(x=>x.classList.remove('open'));g.classList.add('open');openGroup=g.dataset.group||''}}
    if(e.target.closest('#nav')||e.target.id==='wpLoginBtn'||e.target.id==='wpLogout')setTimeout(refreshVisibility,80)
  });
})();