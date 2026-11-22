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
  function render(section,target,rows){
    if(!section||!target)return 0;
    const safeRows=(rows||[]).map(normalizeRow).filter(Boolean);
    target.innerHTML=safeRows.map(cardHtml).join('');
    section.hidden=safeRows.length===0;
    return safeRows.length;
  }
  async function init(doc,win,loader){
    const section=doc&&doc.getElementById('traveler-experiences-home');
    const target=doc&&doc.getElementById('travelerPublicExperiences');
    if(!section||!target)return 0;
    section.hidden=true;target.innerHTML='';
    try{return render(section,target,await (loader||loadApprovedExperiences)(win.MODO_RUMBO_CONFIG,win.fetch.bind(win)));}
    catch(_){section.hidden=true;target.innerHTML='';return 0;}
  }
  return{fields,normalizeRow,loadApprovedExperiences,cardHtml,render,init};
});
