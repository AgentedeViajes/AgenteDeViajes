(() => {
  'use strict';

  const section=document.getElementById('home-explainer-videos');
  const track=document.getElementById('homeVideoTrack');
  const pagination=document.getElementById('homeVideoPagination');
  const chooser=document.getElementById('homeVideoChooser');
  const player=document.getElementById('homeVideoPlayerDialog');
  const data=window.ModoRumboHomeVideoData;
  if(!section||!track||!pagination||!chooser||!player||!data)return;

  const esc=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const routeAttribute=action=>action.type==='home-custom'?'data-home-video-custom':({
    'search-experience':'data-search-experience','search-mode':'data-search-mode','search-query':'data-search-query'
  })[action.type];
  const routeButton=(item,extraClass='')=>`<button class="home-video-route ${extraClass}" type="button" ${routeAttribute(item.action)}="${esc(item.action.value)}">${esc(item.action.label)} <i class="fas fa-arrow-right" aria-hidden="true"></i></button>`;
  const videoButton=(item,extraClass='')=>`<button class="home-video-thumb ${extraClass}" type="button" data-play-video="${esc(item.id)}" aria-label="Reproducir: ${esc(item.title)}">
    <img src="${esc(item.poster)}" alt="Fotograma de ${esc(item.title)}" width="384" height="216" loading="lazy" decoding="async">
    <span class="home-video-thumb-play"><i class="fas fa-play" aria-hidden="true"></i></span>
    <span class="home-video-duration">${Math.floor(item.duration/60)}:${String(item.duration%60).padStart(2,'0')}</span>
  </button>`;

  const title=document.getElementById('homeVideoPlayerTitle');
  const description=document.getElementById('homeVideoPlayerDescription');
  const poster=document.getElementById('homeVideoPlayerPoster');
  const video=document.getElementById('homeVideoPlayer');
  const playButton=player.querySelector('[data-start-video]');
  const status=document.getElementById('homeVideoPlayerStatus');
  const playerStage=player.querySelector('.home-video-player-stage');
  const playerRoute=player.querySelector('[data-player-route]');
  const previous=document.querySelector('[data-video-previous]');
  const next=document.querySelector('[data-video-next]');
  const chooserTrigger=document.querySelector('[data-open-video-chooser]');
  let items=[];
  let pageCount=0;
  let activeItem=null;

  function renderVideos() {
    track.innerHTML=items.map(item=>`<article class="home-video-card" data-video-card="${esc(item.id)}" aria-label="${esc(item.title)}">
      ${videoButton(item)}
      <div class="home-video-card-copy"><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p>${routeButton(item)}</div>
    </article>`).join('');
    document.getElementById('homeVideoChooserList').innerHTML=items.map(item=>`<article class="home-video-chooser-option">
      ${videoButton(item,'home-video-chooser-thumb')}
      <div class="home-video-chooser-copy"><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p>${routeButton(item)}</div>
    </article>`).join('');
    pageCount=Math.ceil(items.length/2);
    pagination.innerHTML=Array.from({length:pageCount},(_,page)=>`<button type="button" data-video-page="${page}" aria-label="Mostrar videos ${page*2+1} y ${Math.min(items.length,page*2+2)}" aria-controls="homeVideoTrack" aria-current="${page===0?'true':'false'}"></button>`).join('');
  }

  function clearRouteAttributes(button) {
    ['data-search-experience','data-search-mode','data-search-query','data-search-type','data-home-video-custom'].forEach(attribute=>button.removeAttribute(attribute));
  }
  function closeIfOpen(dialog) { if(dialog?.open)dialog.close(); }
  function resetPlayer() {
    video.pause();video.removeAttribute('src');video.load();video.hidden=true;
    playerStage.classList.remove('is-loading');poster.removeAttribute('src');poster.hidden=true;
    playButton.hidden=false;status.textContent='';activeItem=null;
  }
  function openVideo(id) {
    const item=items.find(candidate=>candidate.id===id);if(!item)return;
    resetPlayer();activeItem=item;title.textContent=item.title;description.textContent=item.description;
    poster.src=item.playerPoster;poster.alt=`Fotograma de ${item.title}`;poster.hidden=false;
    clearRouteAttributes(playerRoute);
    playerRoute.setAttribute(routeAttribute(item.action),item.action.value);
    playerRoute.innerHTML=`${esc(item.action.label)} <i class="fas fa-arrow-right" aria-hidden="true"></i>`;
    player.showModal();
  }
  function showDecodedVideoFrame() {
    if(video.videoWidth>0&&video.videoHeight>0&&video.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA){
      video.hidden=false;playerStage.classList.remove('is-loading');poster.hidden=true;playButton.hidden=true;status.textContent='';return true;
    }
    return false;
  }
  function startVideo() {
    if(!activeItem)return;
    if(video.getAttribute('src')){video.play().catch(()=>{status.textContent='Si el video no comenzó, usá el control de reproducción.';playButton.hidden=false;});return;}
    status.textContent='Cargando video…';video.hidden=false;playerStage.classList.add('is-loading');poster.hidden=false;
    video.addEventListener('loadeddata',showDecodedVideoFrame,{once:true});
    video.src=activeItem.source;video.load();
    const request=video.play();
    if(request?.catch)request.catch(()=>{status.textContent='No se pudo iniciar el video. Probá con el control de reproducción.';playButton.hidden=false;});
  }
  function mobileView() { return window.matchMedia('(max-width: 680px)').matches; }
  function currentCardIndex() {
    const first=track.querySelector('.home-video-card');if(!first)return 0;
    const gap=parseFloat(getComputedStyle(track).columnGap)||0;
    return Math.round(track.scrollLeft/(first.getBoundingClientRect().width+gap));
  }
  function scrollToCard(index) {
    const maxStart=Math.max(0,items.length-(mobileView()?1:2));
    const target=Math.max(0,Math.min(maxStart,index));
    track.children[target]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'});
  }
  function updateCarouselState() {
    if(!items.length)return;
    const index=currentCardIndex();
    const activePage=Math.min(pageCount-1,Math.ceil(index/2));
    pagination.querySelectorAll('[data-video-page]').forEach(dot=>dot.setAttribute('aria-current',String(Number(dot.dataset.videoPage)===activePage)));
    previous.disabled=index<=0;
    next.disabled=index>=items.length-(mobileView()?1:2);
  }

  async function initialize() {
    section.hidden=true;
    try {
      items=await data.loadPublishedVideos();
      if(!items.length)return;
      renderVideos();
      section.hidden=false;
      chooserTrigger.addEventListener('click',()=>{if(!chooser.open)chooser.showModal();});
      document.addEventListener('click',event=>{
        const playOpener=event.target.closest('[data-play-video]');
        if(playOpener){closeIfOpen(chooser);openVideo(playOpener.dataset.playVideo);return;}
        if(event.target.closest('[data-start-video]')){startVideo();return;}
        if(event.target.closest('[data-close-video-dialog]')){closeIfOpen(event.target.closest('dialog'));return;}
        if(event.target===chooser||event.target===player){closeIfOpen(event.target);return;}
        if(event.target.closest('[data-home-video-custom]')){
          event.preventDefault();closeIfOpen(event.target.closest('dialog'));
          if(typeof window.goHomeTo==='function')window.goHomeTo('custom-home');
          return;
        }
        const route=event.target.closest('.home-video-route');
        if(route&&route.closest('dialog[open]'))closeIfOpen(route.closest('dialog'));
      },true);
      player.addEventListener('close',resetPlayer);
      chooser.addEventListener('click',event=>{if(event.target===chooser)closeIfOpen(chooser);});
      player.addEventListener('click',event=>{if(event.target===player)closeIfOpen(player);});
      previous.addEventListener('click',()=>{const step=mobileView()?1:2;scrollToCard(Math.max(0,currentCardIndex()-step));});
      next.addEventListener('click',()=>{const step=mobileView()?1:2;scrollToCard(Math.min(items.length-(mobileView()?1:2),currentCardIndex()+step));});
      pagination.addEventListener('click',event=>{const dot=event.target.closest('[data-video-page]');if(dot)scrollToCard(Number(dot.dataset.videoPage)*2);});
      track.addEventListener('scroll',()=>window.requestAnimationFrame(updateCarouselState),{passive:true});
      window.addEventListener('resize',updateCarouselState,{passive:true});
      video.addEventListener('loadeddata',showDecodedVideoFrame);
      video.addEventListener('playing',showDecodedVideoFrame);
      video.addEventListener('error',()=>{playerStage.classList.remove('is-loading');status.textContent='No se pudo cargar este video. Cerrá la ventana e intentá nuevamente.';playButton.hidden=false;});
      video.addEventListener('ended',()=>{status.textContent='El video finalizó.';});
      updateCarouselState();
    } catch(error) {
      section.hidden=true;
      console.warn('Modo Rumbo: no se pudo cargar la sección de videos desde Supabase.',error);
    }
  }
  initialize();
})();
