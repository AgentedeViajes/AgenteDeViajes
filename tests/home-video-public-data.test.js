const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'home-video-public-data.js'),'utf8');

function createApi(){
  const window={MODO_RUMBO_CONFIG:{supabaseUrl:'https://bwwgrbbovlkihtyhhapt.supabase.co',supabasePublishableKey:'public-test-key'}};
  vm.runInNewContext(source,{window,URL});
  return{window,api:window.ModoRumboHomeVideoData};
}
function row(overrides={}){
  return{
    slug:'video-demo',title:'Video demo',description:'Descripción demo',
    video_url:'https://cdn.example/video.mp4',
    thumbnail_path:'assets/videos/demo.webp',
    player_poster_path:'https://bwwgrbbovlkihtyhhapt.supabase.co/storage/v1/object/public/home-video-images/demo.webp',
    duration_seconds:15,navigation_type:'search-query',navigation_value:'Europa',
    button_label:'Ver programas',sort_order:1,created_at:'2026-01-01T00:00:00Z',is_published:true,
    ...overrides
  };
}

test('la consulta pública pide solo publicados y orden determinista sin caché',async()=>{
  const{window,api}=createApi();let request;
  const fetchImpl=async(url,options)=>{request={url,options};return{ok:true,json:async()=>[row()]};};
  const result=await api.loadPublishedVideos(window.MODO_RUMBO_CONFIG,fetchImpl);
  const url=new URL(request.url);
  assert.equal(url.pathname,'/rest/v1/home_videos');
  assert.equal(url.searchParams.get('is_published'),'eq.true');
  assert.equal(url.searchParams.get('order'),'sort_order.asc,created_at.asc,slug.asc');
  assert.equal(request.options.cache,'no-store');
  assert.equal(request.options.credentials,'omit');
  assert.equal(request.options.headers.apikey,'public-test-key');
  assert.deepEqual(Array.from(result,item=>item.slug),['video-demo']);
});

test('normaliza miniaturas locales, Storage y URLs externas junto con la acción guardada',async()=>{
  const{window,api}=createApi();
  const rows=[row({slug:'local',sort_order:2}),row({slug:'storage',thumbnail_path:'https://bwwgrbbovlkihtyhhapt.supabase.co/storage/v1/object/public/home-video-images/horizontal.webp',player_poster_path:'assets/videos/vertical.webp',sort_order:1})];
  const result=await api.loadPublishedVideos(window.MODO_RUMBO_CONFIG,async()=>({ok:true,json:async()=>rows}));
  assert.deepEqual(Array.from(result,item=>item.slug),['storage','local']);
  assert.equal(result[0].poster,rows[1].thumbnail_path);
  assert.equal(result[0].playerPoster,'assets/videos/vertical.webp');
  assert.deepEqual(JSON.parse(JSON.stringify(result[1].action)),{type:'search-query',value:'Europa',label:'Ver programas'});
});

test('descarta borradores e información mal formada aunque el servicio devuelva filas',async()=>{
  const{window,api}=createApi();
  const rows=[row({slug:'borrador',is_published:false}),row({slug:'video-invalido',video_url:'https://bwwgrbbovlkihtyhhapt.supabase.co/storage/v1/object/public/home-video-images/video.mp4'}),row({slug:'sin-poster',player_poster_path:'javascript:alert(1)'})];
  const result=await api.loadPublishedVideos(window.MODO_RUMBO_CONFIG,async()=>({ok:true,json:async()=>rows}));
  assert.equal(result.length,0);
});

test('cero publicados se distingue de error HTTP y errores se propagan al controlador para ocultar la sección',async()=>{
  const{window,api}=createApi();
  const empty=await api.loadPublishedVideos(window.MODO_RUMBO_CONFIG,async()=>({ok:true,json:async()=>[]}));
  assert.deepEqual(Array.from(empty),[]);
  await assert.rejects(api.loadPublishedVideos(window.MODO_RUMBO_CONFIG,async()=>({ok:false,status:503})),/503/);
});
