// WAVEPIA ERP-MES - single enterprise navigation owner
// Builds accordion business groups, a direct AQMS entry, and bottom-pinned utility buttons.
(function(){
  const LOGIN_KEY='wave_mes_demo_login_v2';
  const GROUPS=[
    {id:'g-dashboard',label:'전사 현황',views:['dash']},
    {id:'g-sales',label:'영업',views:['req']},
    {id:'g-dev',label:'개발',views:[],note:'개발 프로젝트 / 형상관리 준비'},
    {id:'g-purchase',label:'구매 / 자재',views:['inv','issue']},
    {id:'g-production',label:'생산',views:['reqs','ltc','test']},
    {id:'g-quality',label:'품질',views:['qreq','quality']},
    {id:'g-resource',label:'설비 / 자원',views:[],note:'설비 / 계측기 / 교육·자격 준비'},
    {id:'g-management',label:'경영',views:[],note:'KPI / 경영검토 준비'},
    {id:'g-aqms',label:'AQMS',views:['aqms'],aqms:true},
    {id:'g-doc',label:'문서 / 기록',views:['audit'],utility:true},
    {id:'g-admin',label:'관리',views:['admin'],utility:true}
  ];
  let openGroup='g-dashboard';

  function session(){try{return JSON.parse(sessionStorage.getItem(LOGIN_KEY)||'null')}catch(e){return null}}
  function canSeeAqms(){return session()?.role!=='손님'}

  function ensureStyle(){
    if(document.getElementById('enterpriseNavSingleStyle'))return;
    const s=document.createElement('style');s.id='enterpriseNavSingleStyle';s.textContent=`
      .side{display:flex!important;flex-direction:column!important}
      #nav.enterprise-nav{display:flex!important;flex-direction:column!important;flex:1 1 auto!important;min-height:0!important;max-height:none!important;overflow-y:auto!important;padding-right:2px}
      #nav .aqms-group{margin:3px 0 5px;padding:0;border-bottom:1px solid rgba(255,255,255,.07);flex:0 0 auto}
      #nav .aqms-group-label{position:relative;font-size:10px;line-height:1.2;color:#82d6f5;font-weight:900;padding:9px 24px 8px 9px;cursor:pointer;user-select:none}
      #nav .aqms-group-label:after{content:'›';position:absolute;right:9px;top:7px;font-size:16px;transition:transform .16s ease;color:#9cc7da}
      #nav .aqms-group.open>.aqms-group-label:after{transform:rotate(90deg)}
      #nav .aqms-group:not(.open)>button,#nav .aqms-group:not(.open)>.aqms-group-note{display:none!important}
      #nav .aqms-group button{margin:1px 0!important;padding:8px 11px!important;font-size:11px}
      #nav .aqms-group-note{font-size:8px;color:#758da8;padding:2px 11px 7px;line-height:1.35}
      #nav .aqms-group.empty{display:none!important}
      #nav .aqms-group.open>.aqms-group-label{background:rgba(255,255,255,.045);color:#b7ebff}
      #nav [data-group="g-aqms"]{margin-top:7px!important}
      #nav [data-group="g-aqms"]>.aqms-group-label{color:#9ce8ff}
      #nav [data-group="g-doc"]{margin-top:auto!important;padding-top:12px!important;border-top:1px solid rgba(255,255,255,.24)!important}
      #nav [data-group="g-doc"]>.aqms-group-label,#nav [data-group="g-admin"]>.aqms-group-label{display:none!important}
      #nav [data-group="g-doc"]>button,#nav [data-group="g-admin"]>button{display:block!important;margin:2px 0!important;padding:10px 11px!important;font-size:12px!important}
      #nav [data-group="g-doc"],#nav [data-group="g-admin"]{border-bottom:0!important;flex:0 0 auto}
      .side>.safe{flex:0 0 auto!important;margin-top:8px!important}
      @media(max-width:900px){.side{display:block!important}.app{grid-template-columns:1fr}#nav.enterprise-nav{display:flex!important;flex-direction:row!important;max-height:none;overflow-x:auto!important;overflow-y:hidden!important;gap:4px}.aqms-group{display:flex!important;align-items:center;margin:0!important;white-space:nowrap}.aqms-group-label{display:none!important}.aqms-group:not(.open)>button{display:block!important}.aqms-group-note{display:none!important}#nav [data-group="g-doc"]{margin-top:0!important;padding-top:0!important;border-top:0!important}}
    `;document.head.appendChild(s);
  }

  function hideAqms(){
    const v=document.getElementById('aqmsView');
    if(v){v.style.display='none';v.classList.remove('active')}
    document.querySelectorAll('#nav [data-v="aqms"]').forEach(b=>b.classList.remove('active'));
  }

  function openAqms(btn,wrap){
    if(!canSeeAqms())return;
    document.querySelectorAll('#nav .aqms-group').forEach(g=>g.classList.remove('open'));
    wrap?.classList.add('open');openGroup='g-aqms';
    const run=()=>{
      if(window.waveAqmsV2?.show){
        window.waveAqmsV2.show();
        document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b===btn));
        return true;
      }
      return false;
    };
    if(!run()){
      let n=0;const t=setInterval(()=>{n++;if(run()||n>=20)clearInterval(t)},50);
    }
  }

  function bindGroup(wrap){
    const label=wrap.querySelector(':scope>.aqms-group-label');if(!label)return;
    label.dataset.enterpriseBound='1';
    if(wrap.dataset.group==='g-aqms'){
      const btn=wrap.querySelector(':scope>[data-v="aqms"]');
      label.onclick=e=>{e.preventDefault();e.stopPropagation();openAqms(btn,wrap)};
      if(btn)btn.onclick=e=>{e.preventDefault();e.stopPropagation();openAqms(btn,wrap)};
      return;
    }
    if(wrap.dataset.utility==='1')return;
    label.onclick=()=>{
      const was=wrap.classList.contains('open');
      document.querySelectorAll('#nav .aqms-group').forEach(g=>g.classList.remove('open'));
      if(!was){wrap.classList.add('open');openGroup=wrap.dataset.group||''}else openGroup='';
    };
  }

  function makeAqmsButton(){
    const b=document.createElement('button');b.dataset.v='aqms';b.textContent='프로세스 / 지침서';return b;
  }

  function build(){
    const nav=document.getElementById('nav');if(!nav)return;
    if(nav.dataset.enterpriseSingle==='1'){refreshVisibility();return}
    ensureStyle();
    const buttons=[...nav.querySelectorAll(':scope > button')];
    if(!buttons.length)return;
    const byView=new Map(buttons.map(b=>[b.dataset.v,b]));
    if(!byView.has('aqms'))byView.set('aqms',makeAqmsButton());
    nav.innerHTML='';nav.classList.add('enterprise-nav');
    const placed=new Set();
    GROUPS.forEach(g=>{
      const wrap=document.createElement('div');wrap.className='aqms-group';wrap.dataset.group=g.id;if(g.utility)wrap.dataset.utility='1';
      const label=document.createElement('div');label.className='aqms-group-label';label.textContent=g.label;wrap.appendChild(label);
      g.views.forEach(v=>{const b=byView.get(v);if(b){wrap.appendChild(b);placed.add(b)}});
      if(g.note){const n=document.createElement('div');n.className='aqms-group-note';n.textContent=g.note;wrap.appendChild(n)}
      nav.appendChild(wrap);bindGroup(wrap);
    });
    const rest=buttons.filter(b=>!placed.has(b));
    if(rest.length){const wrap=document.createElement('div');wrap.className='aqms-group';wrap.dataset.group='g-other';wrap.innerHTML='<div class="aqms-group-label">기타 업무</div>';rest.forEach(b=>wrap.appendChild(b));nav.insertBefore(wrap,nav.querySelector('[data-group="g-aqms"]'));bindGroup(wrap)}
    nav.dataset.enterpriseSingle='1';
    openForActive();refreshVisibility();
  }

  function openForActive(){
    const nav=document.getElementById('nav');if(!nav)return;
    const active=nav.querySelector('button.active');const g=active?.closest('.aqms-group');
    document.querySelectorAll('#nav .aqms-group').forEach(x=>x.classList.remove('open'));
    if(g&&!g.dataset.utility){g.classList.add('open');openGroup=g.dataset.group||'';return}
    nav.querySelector(`[data-group="${openGroup}"]`)?.classList.add('open');
  }

  function refreshVisibility(){
    const nav=document.getElementById('nav');if(!nav)return;
    const aq=nav.querySelector('[data-group="g-aqms"]');if(aq)aq.style.display=canSeeAqms()?'':'none';
    nav.querySelectorAll('.aqms-group').forEach(g=>{
      if(g.dataset.group==='g-aqms')return;
      const buttons=[...g.querySelectorAll(':scope>button')];
      const visible=buttons.some(b=>b.style.display!=='none');
      const hasNote=!!g.querySelector(':scope>.aqms-group-note');
      g.classList.toggle('empty',!visible&&!hasNote);
    });
  }

  window.waveMesRefreshEnterpriseNav=function(){setTimeout(()=>{refreshVisibility();openForActive()},20)};
  build();
  setTimeout(refreshVisibility,250);setTimeout(refreshVisibility,700);

  document.addEventListener('click',e=>{
    const btn=e.target.closest('#nav button');
    if(!btn)return;
    if(btn.dataset.v!=='aqms')hideAqms();
    const g=btn.closest('.aqms-group');
    if(g&&!g.dataset.utility&&g.dataset.group!=='g-aqms'){
      document.querySelectorAll('#nav .aqms-group').forEach(x=>x.classList.remove('open'));
      g.classList.add('open');openGroup=g.dataset.group||'';
    }
    setTimeout(refreshVisibility,40);
  },true);
})();