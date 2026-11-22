(() => {
  'use strict';

  const fields = [
    'slug','title','description','video_url','thumbnail_path','player_poster_path',
    'duration_seconds','navigation_type','navigation_value','button_label',
    'sort_order','created_at','is_published'
  ].join(',');

  function imageSource(value) {
    const raw=String(value||'').trim();
    if(/^\/?assets\/videos\/[A-Za-z0-9._/-]+$/.test(raw)&&!/(^|\/)\.\.($|\/)/.test(raw))return raw.replace(/^\//,'');
    try{const url=new URL(raw);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;}catch(_){}
    return '';
  }

  function externalVideoUrl(value) {
    try {
      const url=new URL(String(value||''));
      const host=url.hostname.toLowerCase().replace(/\.$/,'');
      return url.protocol==='https:'&&!url.username&&!url.password&&host!=='supabase.co'&&!host.endsWith('.supabase.co')&&!url.pathname.toLowerCase().startsWith('/storage/v1/');
    } catch(_){return false;}
  }

  function normalizeRow(row) {
    if(!row||row.is_published!==true)return null;
    const slug=String(row.slug||'').trim();
    const title=String(row.title||'').trim();
    const description=String(row.description||'').trim();
    const thumbnail=imageSource(row.thumbnail_path);
    const playerPoster=imageSource(row.player_poster_path);
    const type=String(row.navigation_type||'');
    const value=String(row.navigation_value||'').trim();
    const buttonLabel=String(row.button_label||'').trim();
    const duration=Number(row.duration_seconds);
    const order=Number(row.sort_order);
    const allowedTypes=new Set(['search-experience','search-mode','search-query','home-custom']);
    if(!/^[a-z0-9][a-z0-9-]{0,119}$/i.test(slug)||!title||!description||!thumbnail||!playerPoster||!externalVideoUrl(row.video_url)||!allowedTypes.has(type)||!buttonLabel||!Number.isInteger(duration)||duration<1||!Number.isInteger(order)||order<0)return null;
    if((type==='home-custom'&&value!=='')||(type!=='home-custom'&&!value))return null;
    const action={type,value,label:buttonLabel};
    return{
      id:slug,slug,title,description,source:String(row.video_url),poster:thumbnail,
      playerPoster,duration,sortOrder:order,createdAt:String(row.created_at||''),action
    };
  }

  async function loadPublishedVideos(config=window.MODO_RUMBO_CONFIG,fetchImpl=window.fetch.bind(window)) {
    if(!config?.supabaseUrl||!config?.supabasePublishableKey)throw new Error('La conexión pública al catálogo de videos no está configurada.');
    const base=new URL(config.supabaseUrl);
    if(base.protocol!=='https:')throw new Error('La conexión pública al catálogo requiere HTTPS.');
    const endpoint=new URL('/rest/v1/home_videos',base.origin);
    endpoint.searchParams.set('select',fields);
    endpoint.searchParams.set('is_published','eq.true');
    endpoint.searchParams.set('order','sort_order.asc,created_at.asc,slug.asc');
    const response=await fetchImpl(endpoint.href,{method:'GET',cache:'no-store',credentials:'omit',headers:{apikey:config.supabasePublishableKey,Accept:'application/json'}});
    if(!response.ok)throw new Error(`Supabase respondió ${response.status} al cargar los videos de portada.`);
    const rows=await response.json();
    if(!Array.isArray(rows))throw new Error('Supabase devolvió un formato inesperado para los videos de portada.');
    return rows.map(normalizeRow).filter(Boolean).sort((a,b)=>a.sortOrder-b.sortOrder||a.createdAt.localeCompare(b.createdAt)||a.slug.localeCompare(b.slug));
  }

  window.ModoRumboHomeVideoData={fields,imageSource,externalVideoUrl,normalizeRow,loadPublishedVideos};
})();
