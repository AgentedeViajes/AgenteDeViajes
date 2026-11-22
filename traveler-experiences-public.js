(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.ModoRumboTravelerExperiencesPublic=api;if(root.document)api.init(root.document,root);}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const fields='passenger_name,destination,travel_month,travel_year,rating,comment,published_at';
  const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function normalizeRow(row){
    if(!row||typeof row!=='object')return null;
    const passengerValue=row.passenger_name??row.passengerName;
    const destinationValue=row.destination;
    const commentValue=row.comment;
    const passengerName=typeof passengerValue==='string'?passengerValue.trim():'';
    const destination=typeof destinationValue==='string'?destinationValue.trim():'';
    const comment=typeof commentValue==='string'?commentValue.trim():'';
    const month=Number(row.travel_month??row.month),year=Number(row.travel_year??row.year),rating=Number(row.rating);
    if(!passengerName||passengerName.length>120||!destination||destination.length>160||!comment||comment.length>4000||!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<1900||year>2200||!Number.isInteger(rating)||rating<1||rating>5)return null;
    return{passengerName,destination,month,year,rating,comment};
  }
  async function loadApprovedExperiences(config,fetchImpl){
    config=config||(typeof window!=='undefined'?window.MODO_RUMBO_CONFIG:null);
    fetchImpl=fetchImpl||(typeof window!=='undefined'?window.fetch.bind(window):fetch);
    if(!config?.supabaseUrl||!config?.supabasePublishableKey)throw new Error('public_experiences_unconfigured');
    const base=new URL(config.supabaseUrl);
    if(base.protocol!=='https:')throw new Error('public_experiences_https_required');
    const endpoint=new URL('/rest/v1/public_traveler_experiences',base.origin);
    endpoint.searchParams.set('select',fields);
    endpoint.searchParams.set('order','published_at.desc');
    endpoint.searchParams.set('limit','24');
    const response=await fetchImpl(endpoint.href,{method:'GET',cache:'no-store',credentials:'omit',headers:{apikey:config.supabasePublishableKey,Accept:'application/json'}});
    if(!response.ok)throw new Error('public_experiences_unavailable');
    const rows=await response.json();
    if(!Array.isArray(rows))throw new Error('public_experiences_invalid_response');
    return rows.map(normalizeRow).filter(Boolean);
  }
  function cardHtml(item){
    const when=months[item.month-1]+' '+item.year;
    const stars='★'.repeat(item.rating)+'☆'.repeat(5-item.rating);
    return `<article class="traveler-public-card"><header class="traveler-public-card-header"><div><h3>${escapeHtml(item.passengerName)}</h3><p>${escapeHtml(item.destination)} <span aria-hidden="true">·</span> ${escapeHtml(when)}</p></div><span class="traveler-public-stars" role="img" aria-label="${item.rating} de 5 estrellas">${stars}</span></header><blockquote>${escapeHtml(item.comment)}</blockquote></article>`;
  }
  function visibleCapacity(width){return width<=680?1:width<=1024?2:3;}
  function carouselState(count,width,start){
    const capacity=visibleCapacity(width),maxStart=Math.max(0,count-capacity);
    const currentStart=Math.min(Math.max(0,Number(start)||0),maxStart);
    return{capacity,maxStart,start:currentStart,controlsHidden:count<=capacity,previousDisabled:currentStart===0,nextDisabled:currentStart>=maxStart,centered:count<=capacity,single:count===1};
  }
  function bindCarousel(section,target,doc,win){
    const controls=doc.getElementById('travelerPublicCarouselControls');
    const previous=doc.getElementById('travelerPublicPrevious');
    const next=doc.getElementById('travelerPublicNext');
    if(!controls||!previous||!next)return;
    const reducedMotion=()=>win.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
    function currentStart(){
      const card=target.firstElementChild;
      if(!card)return 0;
      const gap=parseFloat(win.getComputedStyle(target).columnGap||win.getComputedStyle(target).gap)||0;
      return Math.round(target.scrollLeft/(card.getBoundingClientRect().width+gap||1));
    }
    function update(){
      const state=carouselState(target.children.length,win.innerWidth,currentStart());
      target.dataset.visibleCount=String(Math.min(target.children.length,state.capacity));
      target.classList.toggle('is-centered',state.centered);
      target.classList.toggle('is-single',state.single);
      controls.hidden=state.controlsHidden;
      previous.disabled=state.previousDisabled;
      next.disabled=state.nextDisabled;
    }
    function scrollToStart(start){
      const state=carouselState(target.children.length,win.innerWidth,start);
      const card=target.children[state.start];
      if(!card)return;
      target.scrollTo({left:card.offsetLeft,behavior:reducedMotion()?'auto':'smooth'});
    }
    previous.addEventListener('click',()=>scrollToStart(currentStart()-visibleCapacity(win.innerWidth)));
    next.addEventListener('click',()=>scrollToStart(currentStart()+visibleCapacity(win.innerWidth)));
    target.addEventListener('scroll',update,{passive:true});
    target.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'&&!previous.disabled){event.preventDefault();previous.click();}
      if(event.key==='ArrowRight'&&!next.disabled){event.preventDefault();next.click();}
    });
    win.addEventListener('resize',update,{passive:true});
    update();
  }
  function render(section,target,rows){
    if(!section||!target)return 0;
    const safeRows=(rows||[]).map(normalizeRow).filter(Boolean);
    target.innerHTML=safeRows.map(cardHtml).join('');
    target.dataset.visibleCount='3';
    target.classList.toggle('is-centered',safeRows.length<=3);
    target.classList.toggle('is-single',safeRows.length===1);
    section.hidden=safeRows.length===0;
    return safeRows.length;
  }
  async function init(doc,win,loader){
    const section=doc&&doc.getElementById('traveler-experiences-home');
    const target=doc&&doc.getElementById('travelerPublicExperiences');
    if(!section||!target)return 0;
    section.hidden=true;target.innerHTML='';
    try{
      const count=render(section,target,await (loader||loadApprovedExperiences)(win.MODO_RUMBO_CONFIG,win.fetch.bind(win)));
      bindCarousel(section,target,doc,win);
      return count;
    }
    catch(_){section.hidden=true;target.innerHTML='';return 0;}
  }
  return{fields,normalizeRow,loadApprovedExperiences,cardHtml,visibleCapacity,carouselState,render,init};
});
