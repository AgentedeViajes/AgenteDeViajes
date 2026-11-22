(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const service = window.ModoRumboData;
  const navButton = $('[data-view="homeVideos"]');
  const view = $('#homeVideosView');
  if (!service || !navButton || !view) return;

  const state = {videos: [], editingId: null, saving: false, activePreview: null, lastFocus: null, imageStages:{thumbnail:null,playerPoster:null}, frameSourceUrl:'', frameLoadMode:'cors', frameCanCapture:false};
  const imageConfig={thumbnail:{url:'homeVideoThumbnail',file:'homeVideoThumbnailFile',preview:'homeVideoThumbnailPreview',field:'thumbnail_path',ratio:16/9},playerPoster:{url:'homeVideoPlayerPoster',file:'homeVideoPlayerPosterFile',preview:'homeVideoPlayerPosterPreview',field:'player_poster_path',ratio:9/16}};
  const experienceOptions = [
    ['grupal','Viajes grupales'],['personalizado','Viajes a medida'],['sin-aereo','Circuitos sin aéreo'],['lujo','Viajes de lujo'],['low-cost','Low cost']
  ];
  const modeOptions = [['playa','MODO Playa']];
  const navigationPresets={
    grupales:{type:'search-experience',value:'grupal'},
    'sin-aereo':{type:'search-experience',value:'sin-aereo'},
    playa:{type:'search-mode',value:'playa'},
    europa:{type:'search-query',value:'Europa'},
    exotico:{type:'search-query',value:'Exóticos'},
    'a-medida':{type:'home-custom',value:''}
  };
  const customNavigation='custom-query';

  function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function notify(message, kind='') { const node=$('#homeVideosNotice'); node.textContent=message; node.className=`home-videos-notice${kind?` ${kind}`:''}`; node.hidden=false; }
  function clearNotice() { const node=$('#homeVideosNotice'); node.hidden=true; node.textContent=''; node.className='home-videos-notice'; }
  function dialogNotice(id,message='',kind='') { const node=$(`#${id}`); node.textContent=message; node.className=`home-video-dialog-notice${kind?` ${kind}`:''}`; node.hidden=!message; }
  function imageSource(value) {
    const raw=String(value||'').trim();
    if (/^assets\/videos\/[A-Za-z0-9._/-]+$/.test(raw) && !/(^|\/)\.\.($|\/)/.test(raw)) return `../${raw}`;
    try { const parsed=new URL(raw); if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password) return parsed.href; } catch (_) {}
    return '';
  }
  function validVideoUrl(value) {
    const raw=String(value||'').trim();
    const authority=raw.match(/^https:\/\/([^/?#]+)/i)?.[1]||'';
    if (!authority || /[@%\\]/.test(authority)) return false;
    try {
      const parsed=new URL(raw);
      if (parsed.protocol!=='https:' || parsed.username || parsed.password) return false;
      const host=parsed.hostname.toLowerCase().replace(/\.$/,'');
      if (host==='supabase.co' || host.endsWith('.supabase.co') || host==='bwwgrbbovlkihtyhhapt.supabase.co') return false;
      let path=parsed.pathname.toLowerCase();
      try { path=decodeURIComponent(path); } catch (_) { return false; }
      if (path.startsWith('/storage/v1/')) return false;
      return raw.length<=2048;
    } catch (_) { return false; }
  }
  function makeSlug(title) {
    return String(title||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'video';
  }
  function uniqueSlug(title, currentId='') {
    const base=makeSlug(title); let candidate=base; let suffix=2;
    const exists=slug=>state.videos.some(video=>video.slug===slug&&video.id!==currentId);
    while(exists(candidate)) candidate=`${base}-${suffix++}`;
    return candidate;
  }
  function formatDuration(seconds) { const value=Math.max(0,Number(seconds)||0); return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`; }
  function renderVideos() {
    const list=[...state.videos].sort((a,b)=>(Number(a.sort_order)-Number(b.sort_order))||String(a.created_at||'').localeCompare(String(b.created_at||'')));
    $('#homeVideosEmpty').hidden=list.length>0;
    $('#homeVideosGrid').hidden=list.length===0;
    $('#homeVideosOrderActions').hidden=list.length<2;
    $('#homeVideosGrid').innerHTML=list.map(video=>{
      const id=escapeHtml(video.id), title=escapeHtml(video.title), thumb=imageSource(video.thumbnail_path);
      const status=video.is_published?'<span class="is-published">Publicado</span>':'<span class="is-hidden">Oculto</span>';
      return `<article class="home-video-admin-card" data-home-video-card="${id}">
        <div class="home-video-admin-card-top">
          <button class="home-video-admin-thumb" type="button" data-home-video-action="preview" data-id="${id}" aria-label="Vista previa: ${title}">
            ${thumb?`<img src="${escapeHtml(thumb)}" alt="Miniatura de ${title}" loading="lazy" decoding="async">`:''}<span>${formatDuration(video.duration_seconds)}</span>
          </button>
          <div class="home-video-admin-info"><h3>${title}</h3><div class="home-video-admin-meta">${status}<span>Orden ${Number(video.sort_order)||0}</span></div><p class="home-video-admin-desc">${escapeHtml(video.description)}</p><div class="home-video-admin-actions">
            <button class="secondary-button" type="button" data-home-video-action="edit" data-id="${id}">Editar</button>
            <button class="text-button" type="button" data-home-video-action="preview" data-id="${id}">Vista previa</button>
            <button class="text-button" type="button" data-home-video-action="toggle" data-id="${id}">${video.is_published?'Ocultar':'Publicar'}</button>
            <button class="text-button" type="button" data-home-video-action="delete" data-id="${id}">Eliminar</button>
          </div></div>
        </div>
        <div class="home-video-admin-order"><label>Orden de aparición<input type="number" min="0" step="1" data-home-video-order="${id}" value="${Number(video.sort_order)||0}" aria-label="Orden de aparición para ${title}"></label></div>
      </article>`;
    }).join('');
  }
  async function loadVideos() {
    if (!service.configured) { state.videos=[]; renderVideos(); notify('Conectá el administrador a Supabase para gestionar los videos de portada.','error'); return; }
    if (!$('#authGate').hidden) { notify('Iniciá sesión como administrador para ver los videos.','error'); return; }
    clearNotice(); $('#homeVideosGrid').setAttribute('aria-busy','true');
    try { state.videos=await service.listHomeVideos(); renderVideos(); }
    catch(error) { notify(`No se pudieron cargar los videos: ${error.message||'Error de acceso.'}`,'error'); }
    finally { $('#homeVideosGrid').removeAttribute('aria-busy'); }
  }
  function switchToVideos() {
    if (!$('#authGate').hidden) { notify('Iniciá sesión como administrador para ver los videos.','error'); return; }
    $$('.view').forEach(item=>item.classList.toggle('active',item===view));
    $$('.nav-button').forEach(item=>item.classList.toggle('active',item===navButton));
    $('#pageTitle').textContent='Videos de portada';
    $('#newProgramButton').hidden=true;
    loadVideos();
  }
  function setFrameStatus(message) { const node=$('#homeVideoFrameStatus'); node.textContent=message; node.hidden=!message; }
  function clearImageStage(kind) { const staged=state.imageStages[kind]; if(staged?.objectUrl)URL.revokeObjectURL(staged.objectUrl); state.imageStages[kind]=null; }
  function clearImageStages() { Object.keys(imageConfig).forEach(clearImageStage); }
  function stageImage(kind,file) {
    clearImageStage(kind);
    const config=imageConfig[kind], objectUrl=URL.createObjectURL(file);
    state.imageStages[kind]={file,objectUrl};
    $(`#${config.url}`).value=''; $(`#${config.file}`).value='';
    const image=$(`#${config.preview}`); image.src=objectUrl; image.hidden=false;
  }
  function localImagePreview(kind) {
    const config=imageConfig[kind], input=$(`#${config.url}`), image=$(`#${config.preview}`);
    const src=imageSource(input.value);
    if(src){image.src=src;image.hidden=false;}else{image.removeAttribute('src');image.hidden=true;}
  }
  function resetFrameGenerator() {
    const player=$('#homeVideoFramePlayer');
    if(player){player.pause();player.removeAttribute('src');player.removeAttribute('crossorigin');player.preload='none';player.load();player.hidden=true;}
    $('#homeVideoFramePicker').hidden=true; $('#homeVideoFramePosition').value='0'; $('#homeVideoFramePosition').max='0';
    $('#homeVideoCaptureFrame').disabled=true; $('#homeVideoFrameTime').textContent='0:00';
    setFrameStatus(''); state.frameSourceUrl='';state.frameLoadMode='cors';state.frameCanCapture=false;
  }
  function updateNavigationValue(value='') {
    const custom=$('#homeVideoNavigationType').value===customNavigation;
    const label=$('#homeVideoNavigationValueLabel');
    label.hidden=!custom;
    $('#homeVideoNavigationValue').value=custom?value:'';
  }
  function openForm(video=null) {
    if (!$('#authGate').hidden) { notify('Iniciá sesión como administrador para gestionar videos.','error'); return; }
    resetFrameGenerator(); clearImageStages();
    state.editingId=video?.id||null; state.lastFocus=document.activeElement;
    $('#homeVideoForm').reset(); $('#homeVideoId').value=video?.id||'';
    $('#homeVideoFormTitle').textContent=video?'Editar video':'Agregar video'; dialogNotice('homeVideoFormNotice');
    $('#homeVideoTitle').value=video?.title||''; $('#homeVideoDescription').value=video?.description||'';
    $('#homeVideoUrl').value=video?.video_url||''; $('#homeVideoThumbnail').value=video?.thumbnail_path||''; $('#homeVideoPlayerPoster').value=video?.player_poster_path||'';
    $('#homeVideoDuration').value=video?.duration_seconds??15; $('#homeVideoOrder').value=video?.sort_order??state.videos.length;
    $('#homeVideoButtonLabel').value=video?.button_label||''; $('#homeVideoPublished').checked=Boolean(video?.is_published);
    const navSelect=$('#homeVideoNavigationType');
    const storedType=video?.navigation_type||'search-experience';
    const legacyPreset=Object.entries(navigationPresets).find(([,item])=>item.type===storedType&&item.value===(video?.navigation_value||''))?.[0];
    navSelect.value=legacyPreset||customNavigation;
    updateNavigationValue(video?.navigation_value||'');
    $('#homeVideoSlug').value=video?.slug||uniqueSlug($('#homeVideoTitle').value);
    localImagePreview('thumbnail'); localImagePreview('playerPoster');
    $('#homeVideoSaveButton').disabled=false; $('#homeVideoSaveButton').textContent='Guardar video';
    $('#homeVideoFormDialog').showModal(); $('#homeVideoTitle').focus();
  }
  function closeForm() { resetFrameGenerator(); clearImageStages(); const dialog=$('#homeVideoFormDialog'); if(dialog.open)dialog.close(); state.lastFocus?.focus?.(); }
  function cropRect(width,height,ratio) {
    let sx=0,sy=0,sw=width,sh=height;
    if(width/height>ratio){sw=height*ratio;sx=(width-sw)/2;}else{sh=width/ratio;sy=(height-sh)/2;}
    return {sx,sy,sw,sh};
  }
  async function canvasBlob(canvas,quality) {
    return new Promise((resolve,reject)=>{
      try{canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No se pudo convertir la imagen a WebP.')),'image/webp',quality);}
      catch(error){reject(error);}
    });
  }
  async function makeWebpCrop(source,width,height,kind,name) {
    if(!width||!height)throw new Error('No se pudo leer el tamaño del fotograma.');
    const ratio=imageConfig[kind].ratio, crop=cropRect(width,height,ratio);
    const baseWidth=ratio>=1?1280:720, baseHeight=Math.round(baseWidth/ratio);
    const targetBytes=kind==='thumbnail'?100*1024:200*1024;
    let bestBlob=null;
    for(let scale=1;scale>=.38;scale*=.82){
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(baseWidth*scale));canvas.height=Math.max(1,Math.round(baseHeight*scale));
      const context=canvas.getContext('2d',{alpha:false});
      context.drawImage(source,crop.sx,crop.sy,crop.sw,crop.sh,0,0,canvas.width,canvas.height);
      for(let quality=.84;quality>=.52;quality-=.08){
        const blob=await canvasBlob(canvas,quality);
        if(blob.size<=1024*1024&&(!bestBlob||blob.size<bestBlob.size))bestBlob=blob;
        if(blob.size<=targetBytes)return new File([blob],`${name}-${kind}.webp`,{type:'image/webp'});
      }
    }
    if(bestBlob)return new File([bestBlob],`${name}-${kind}.webp`,{type:'image/webp'});
    throw new Error('La imagen resultante supera 1 MB incluso optimizada.');
  }
  async function imageFileToWebp(file,kind) {
    if(!['image/webp','image/jpeg','image/png'].includes(file.type))throw new Error('Elegí una imagen WebP, JPEG o PNG.');
    if(file.size>15*1024*1024)throw new Error('La imagen manual supera el límite de 15 MB.');
    let bitmap;
    try{bitmap=await createImageBitmap(file);return await makeWebpCrop(bitmap,bitmap.width,bitmap.height,kind,'modo-rumbo');}
    finally{bitmap?.close?.();}
  }
  function formatFrameTime(seconds) { const value=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`; }
  function loadFrameVideo() {
    const source=$('#homeVideoUrl').value.trim(), player=$('#homeVideoFramePlayer');
    if(!validVideoUrl(source)){setFrameStatus('Ingresá primero una URL HTTPS válida de un proveedor externo.');return;}
    resetFrameGenerator();state.frameSourceUrl=source;state.frameLoadMode='cors';state.frameCanCapture=false;
    $('#homeVideoFramePicker').hidden=false;player.crossOrigin='anonymous';player.preload='metadata';player.hidden=false;
    setFrameStatus('Cargando el video externo para elegir un fotograma…');player.src=source;player.load();
  }
  function fallbackToPreviewOnly() {
    const player=$('#homeVideoFramePlayer');
    if(state.frameLoadMode==='preview-only'){setFrameStatus('No se pudo cargar el video externo. Podés usar imágenes manuales o URLs externas.');return;}
    state.frameLoadMode='preview-only';state.frameCanCapture=false;$('#homeVideoCaptureFrame').disabled=true;
    player.pause();player.removeAttribute('src');player.removeAttribute('crossorigin');player.load();player.preload='metadata';player.hidden=false;player.src=state.frameSourceUrl;player.load();
    setFrameStatus('El proveedor no permite extraer fotogramas por CORS. Podés ver el video, pero usá una URL de imagen o cargá las miniaturas manualmente. No se intenta eludir esa restricción.');
  }
  async function waitForDecodedFrame(player) {
    if(player.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA&&!player.seeking)return;
    await new Promise((resolve,reject)=>{
      let timer;
      const finish=()=>{clearTimeout(timer);player.removeEventListener('loadeddata',finish);player.removeEventListener('seeked',finish);resolve();};
      player.addEventListener('loadeddata',finish,{once:true});player.addEventListener('seeked',finish,{once:true});
      timer=window.setTimeout(()=>{player.removeEventListener('loadeddata',finish);player.removeEventListener('seeked',finish);reject(new Error('Esperá a que el video cargue el fotograma seleccionado.'));},10000);
    });
  }
  async function captureFrame() {
    const player=$('#homeVideoFramePlayer'),button=$('#homeVideoCaptureFrame');
    if(!state.frameCanCapture){setFrameStatus('Este proveedor no habilita la captura de fotogramas. Usá imágenes manuales o URLs externas.');return;}
    button.disabled=true;
    try{
      const requested=Number($('#homeVideoFramePosition').value);
      if(Math.abs(player.currentTime-requested)>.04)player.currentTime=requested;
      await waitForDecodedFrame(player);
      const thumb=await makeWebpCrop(player,player.videoWidth,player.videoHeight,'thumbnail','modo-rumbo');
      const poster=await makeWebpCrop(player,player.videoWidth,player.videoHeight,'playerPoster','modo-rumbo');
      stageImage('thumbnail',thumb);stageImage('playerPoster',poster);
      setFrameStatus(`Se generaron ambas miniaturas WebP desde ${formatFrameTime(player.currentTime)}. Podés repetir la captura o reemplazar cada imagen por separado.`);
    }catch(error){
      if(error.name==='SecurityError'){state.frameCanCapture=false;setFrameStatus('El proveedor bloqueó la captura por CORS. Usá imágenes manuales o URLs externas; no se descargará el video mediante un proxy.');}
      else setFrameStatus(error.message||'No se pudo capturar el fotograma.');
    }finally{button.disabled=!state.frameCanCapture;}
  }

  function collectVideo() {
    const title=$('#homeVideoTitle').value.trim(), description=$('#homeVideoDescription').value.trim();
    const videoUrl=$('#homeVideoUrl').value.trim(), thumbnail=$('#homeVideoThumbnail').value.trim(), playerPoster=$('#homeVideoPlayerPoster').value.trim();
    const duration=Number($('#homeVideoDuration').value), order=Number($('#homeVideoOrder').value);
    const selection=$('#homeVideoNavigationType').value;
    const customQuery=selection===customNavigation;
    const route=navigationPresets[selection];
    if(!customQuery&&!route)throw new Error('Elegí una modalidad válida.');
    const type=customQuery?'search-query':route.type;
    const navigationValue=customQuery?($('#homeVideoNavigationValue').value||'').trim():route.value;
    const buttonLabel=$('#homeVideoButtonLabel').value.trim();
    if(!title||title.length>120)throw new Error('Ingresá un título de hasta 120 caracteres.');
    if(!description||description.length>1200)throw new Error('Ingresá una descripción de hasta 1200 caracteres.');
    if(!validVideoUrl(videoUrl))throw new Error('La URL debe usar HTTPS y pertenecer a un proveedor externo; no se aceptan URLs de Supabase ni de Supabase Storage.');
    if((!state.imageStages.thumbnail&&!imageSource(thumbnail))||(!state.imageStages.playerPoster&&!imageSource(playerPoster)))throw new Error('Ingresá las dos miniaturas mediante HTTPS, rutas locales o imágenes generadas/manuales.');
    if(!Number.isInteger(duration)||duration<1||duration>86400)throw new Error('La duración debe ser un número entero entre 1 y 86400 segundos.');
    if(!Number.isInteger(order)||order<0)throw new Error('El orden debe ser un número entero igual o mayor que cero.');
    if(customQuery&&(!navigationValue||navigationValue.length>160))throw new Error('Completá el destino o la palabra de búsqueda.');
    if(!buttonLabel||buttonLabel.length>100)throw new Error('Ingresá un texto para el botón de hasta 100 caracteres.');
    return {slug:state.editingId?$('#homeVideoSlug').value:uniqueSlug(title),title,description,video_url:videoUrl,thumbnail_path:thumbnail,player_poster_path:playerPoster,duration_seconds:duration,navigation_type:type,navigation_value:navigationValue,button_label:buttonLabel,sort_order:order,is_published:$('#homeVideoPublished').checked};
  }
  async function saveForm(event) {
    event.preventDefault(); if(state.saving)return;
    let payload; try{payload=collectVideo();}catch(error){dialogNotice('homeVideoFormNotice',error.message);return;}
    const editingId=state.editingId, previous=state.videos.find(item=>item.id===editingId), uploaded=[];
    state.saving=true; $('#homeVideoSaveButton').disabled=true; $('#homeVideoSaveButton').textContent='Guardando…';
    try {
      for(const kind of Object.keys(imageConfig)){
        const staged=state.imageStages[kind]; if(!staged)continue;
        const result=await service.uploadHomeVideoImage(staged.file,payload.slug,kind);
        uploaded.push(result.url);payload[imageConfig[kind].field]=result.url;
      }
      if(editingId)await service.updateHomeVideo(editingId,payload); else await service.createHomeVideo(payload);
    } catch(error) {
      for(const url of uploaded){try{await service.deleteHomeVideoImage(url);}catch(_){}}
      dialogNotice('homeVideoFormNotice',`No se pudo guardar: ${error.message||'revisá los campos y permisos.'}`);
      state.saving=false;$('#homeVideoSaveButton').disabled=false;$('#homeVideoSaveButton').textContent='Guardar video';return;
    }
    const changedKinds=Object.keys(imageConfig).filter(kind=>state.imageStages[kind]);
    const oldImages=changedKinds.map(kind=>previous?.[imageConfig[kind].field]).filter(Boolean);
    closeForm(); await loadVideos(); notify(editingId?'Video actualizado.':'Video agregado.','success');
    await cleanupUnreferencedImages(oldImages,'El video se guardó, pero no se pudo limpiar una miniatura anterior');
    state.saving=false; $('#homeVideoSaveButton').disabled=false; $('#homeVideoSaveButton').textContent='Guardar video';
  }
  async function cleanupUnreferencedImages(urls,context='No se pudo limpiar una miniatura'){
    for(const url of new Set(urls.filter(Boolean))){
      try{await service.deleteHomeVideoImageIfUnreferenced(url);}
      catch(error){notify(`${context}: ${error.message||'revisá Storage y las referencias.'}`,'error');}
    }
  }
  function preview(video) {
    if(!video)return;
    closePreview(); state.activePreview={...video};
    dialogNotice('homeVideoPreviewStatus');
    $('#homeVideoPreviewTitle').textContent=video.title||'Vista previa del video';
    $('#homeVideoPreviewDescription').textContent=video.description||'';
    $('#homeVideoPreviewDuration').textContent=`Duración: ${formatDuration(video.duration_seconds)}`;
    const poster=state.imageStages.playerPoster?.objectUrl||imageSource(video.player_poster_path), thumb=state.imageStages.thumbnail?.objectUrl||imageSource(video.thumbnail_path);
    const posterEl=$('#homeVideoPreviewPoster'), thumbEl=$('#homeVideoPreviewThumbnail'), player=$('#homeVideoPreviewPlayer');
    posterEl.src=poster; posterEl.hidden=!poster; thumbEl.src=thumb; thumbEl.hidden=!thumb;
    player.poster=poster||''; player.hidden=true; $('#homeVideoPreviewPlay').hidden=false;
    $('#homeVideoPreviewDialog').showModal();
  }
  function startPreview() {
    const item=state.activePreview, player=$('#homeVideoPreviewPlayer'); if(!item||!validVideoUrl(item.video_url)) {dialogNotice('homeVideoPreviewStatus','La URL externa del video no es válida.');return;}
    if(!player.getAttribute('src')){player.src=item.video_url;player.load();}
    player.hidden=false; $('#homeVideoPreviewPlay').hidden=true;
    const result=player.play(); if(result?.catch)result.catch(()=>dialogNotice('homeVideoPreviewStatus','No se pudo reproducir la vista previa. Revisá la URL externa y volvé a intentarlo.'));
  }
  function closePreview() {
    const dialog=$('#homeVideoPreviewDialog'), player=$('#homeVideoPreviewPlayer');
    if(player){player.pause();player.removeAttribute('src');player.removeAttribute('poster');player.load();player.hidden=true;}
    if(dialog?.open)dialog.close(); state.activePreview=null;
  }
  async function togglePublished(video) {
    if(state.saving)return; state.saving=true;
    try{await service.updateHomeVideo(video.id,{is_published:!video.is_published});await loadVideos();notify(video.is_published?'Video ocultado.':'Video publicado.','success');}
    catch(error){notify(`No se pudo cambiar el estado: ${error.message||'error de permisos.'}`,'error');}
    finally{state.saving=false;}
  }
  async function deleteVideo(video) {
    if(!window.confirm(`¿Eliminar el video “${video.title}”? Esta acción no se puede deshacer.`))return;
    if(state.saving)return;state.saving=true;
    const images=[video.thumbnail_path,video.player_poster_path];
    try{await service.deleteHomeVideo(video.id);await loadVideos();notify('Video eliminado.','success');await cleanupUnreferencedImages(images,'El video se eliminó, pero no se pudo limpiar una miniatura');}
    catch(error){notify(`No se pudo eliminar: ${error.message||'error de permisos.'}`,'error');}
    finally{state.saving=false;}
  }
  async function saveOrder() {
    if(state.saving)return;
    const entries=$$('[data-home-video-order]').map(input=>({id:input.dataset.homeVideoOrder,order:Number(input.value)}));
    if(entries.some(item=>!Number.isInteger(item.order)||item.order<0)){notify('Todos los órdenes deben ser enteros iguales o mayores que cero.','error');return;}
    if(new Set(entries.map(item=>item.order)).size!==entries.length){notify('Usá un número de orden distinto para cada video.','error');return;}
    state.saving=true;$('#homeVideosSaveOrder').disabled=true;
    try{for(const item of entries)await service.updateHomeVideo(item.id,{sort_order:item.order});await loadVideos();notify('Orden de aparición actualizado.','success');}
    catch(error){await loadVideos();notify(`No se pudo completar el orden: ${error.message||'revisá los permisos.'} Si algunos cambios se guardaron, comprobá el listado antes de reintentar.`,'error');}
    finally{state.saving=false;$('#homeVideosSaveOrder').disabled=false;}
  }

  navButton.addEventListener('click',switchToVideos);
  $$('.nav-button').filter(button=>button!==navButton).forEach(button=>button.addEventListener('click',()=>{ $('#newProgramButton').hidden=false; }));
  $('#homeVideoAddButton').addEventListener('click',()=>openForm());
  $('#homeVideosEmpty').addEventListener('click',event=>{if(event.target.closest('[data-home-video-add]'))openForm();});
  $('#homeVideosGrid').addEventListener('click',event=>{
    const button=event.target.closest('[data-home-video-action]');if(!button)return;
    const video=state.videos.find(item=>String(item.id)===button.dataset.id);if(!video)return;
    if(button.dataset.homeVideoAction==='edit')openForm(video);
    if(button.dataset.homeVideoAction==='preview')preview(video);
    if(button.dataset.homeVideoAction==='toggle')togglePublished(video);
    if(button.dataset.homeVideoAction==='delete')deleteVideo(video);
  });
  $('#homeVideosSaveOrder').addEventListener('click',saveOrder);
  $('#homeVideoForm').addEventListener('submit',saveForm);
  $$('[data-close-home-video-form]').forEach(button=>button.addEventListener('click',closeForm));
  $('#homeVideoTitle').addEventListener('input',()=>{if(!state.editingId)$('#homeVideoSlug').value=uniqueSlug($('#homeVideoTitle').value);});
  $('#homeVideoNavigationType').addEventListener('change',()=>updateNavigationValue());
  $('#homeVideoThumbnail').addEventListener('input',()=>localImagePreview($('#homeVideoThumbnail'),$('#homeVideoThumbnailPreview')));
  $('#homeVideoPlayerPoster').addEventListener('input',()=>localImagePreview($('#homeVideoPlayerPoster'),$('#homeVideoPlayerPosterPreview')));
  $('#homeVideoGenerateThumbnails').addEventListener('click',loadFrameVideo);
  $('#homeVideoCaptureFrame').addEventListener('click',captureFrame);
  $('#homeVideoFramePosition').addEventListener('input',event=>{const player=$('#homeVideoFramePlayer'),time=Number(event.target.value);$('#homeVideoFrameTime').textContent=formatFrameTime(time);if(Number.isFinite(time)&&player.readyState>=1)player.currentTime=time;});
  $('#homeVideoFramePlayer').addEventListener('loadedmetadata',()=>{
    const player=$('#homeVideoFramePlayer'),slider=$('#homeVideoFramePosition');
    if(!Number.isFinite(player.duration)||player.duration<=0){setFrameStatus('Este video no expone una duración compatible para seleccionar fotogramas.');return;}
    slider.max=String(player.duration);slider.value='0';$('#homeVideoFrameTime').textContent='0:00';
    state.frameCanCapture=state.frameLoadMode==='cors';$('#homeVideoCaptureFrame').disabled=!state.frameCanCapture;
    if(state.frameCanCapture)setFrameStatus('Mové la barra o pausá el video en el fotograma deseado y capturalo.');
  });
  $('#homeVideoFramePlayer').addEventListener('timeupdate',()=>{const player=$('#homeVideoFramePlayer'),slider=$('#homeVideoFramePosition');if(document.activeElement!==slider&&Number.isFinite(player.currentTime)){slider.value=String(player.currentTime);$('#homeVideoFrameTime').textContent=formatFrameTime(player.currentTime);}});
  $('#homeVideoFramePlayer').addEventListener('error',fallbackToPreviewOnly);
  $('#homeVideoThumbnail').addEventListener('input',()=>{clearImageStage('thumbnail');localImagePreview('thumbnail');});
  $('#homeVideoPlayerPoster').addEventListener('input',()=>{clearImageStage('playerPoster');localImagePreview('playerPoster');});
  for(const [kind,config] of Object.entries(imageConfig)){
    $(`#${config.file}`).addEventListener('change',async event=>{
      const file=event.target.files?.[0];if(!file)return;
      try{const optimized=await imageFileToWebp(file,kind);stageImage(kind,optimized);}
      catch(error){dialogNotice('homeVideoFormNotice',error.message||'No se pudo procesar la imagen.');event.target.value='';}
    });
  }
  $('#homeVideoFormPreview').addEventListener('click',()=>{try{const payload=collectVideo();preview({...payload,id:state.editingId||'preview'});}catch(error){dialogNotice('homeVideoFormNotice',error.message,'error');}});
  $('#homeVideoPreviewPlay').addEventListener('click',startPreview);
  $('#homeVideoPreviewPlayer').addEventListener('error',()=>dialogNotice('homeVideoPreviewStatus','No se pudo cargar el video externo. Revisá el enlace y volvé a intentarlo.'));
  $$('[data-close-home-video-preview]').forEach(button=>button.addEventListener('click',closePreview));
  $('#homeVideoPreviewDialog').addEventListener('close',()=>{const player=$('#homeVideoPreviewPlayer');if(player.getAttribute('src')){player.pause();player.removeAttribute('src');player.removeAttribute('poster');player.load();player.hidden=true;}state.activePreview=null;});
  $('#homeVideoPreviewDialog').addEventListener('click',event=>{if(event.target===$('#homeVideoPreviewDialog'))closePreview();});
  $('#homeVideoFormDialog').addEventListener('click',event=>{if(event.target===$('#homeVideoFormDialog'))closeForm();});
  $('#homeVideoFormDialog').addEventListener('close',()=>{resetFrameGenerator();clearImageStages();state.lastFocus?.focus?.();});
})();
