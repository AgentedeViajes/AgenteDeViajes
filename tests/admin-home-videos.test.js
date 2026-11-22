const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'admin/index.html'), 'utf8');
const adminJs = fs.readFileSync(path.join(root, 'admin/home-videos-admin.js'), 'utf8');
const serviceJs = fs.readFileSync(path.join(root, 'admin/data-service.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'admin/home-videos.css'), 'utf8');
const baseAdminCss = fs.readFileSync(path.join(root, 'admin/admin.css'), 'utf8');
const storageSql = fs.readFileSync(path.join(root, 'supabase/home-video-images-storage.sql'), 'utf8');
const baseAdminJs = fs.readFileSync(path.join(root, 'admin/admin.js'), 'utf8');

function loadDataService(mockClient) {
  const window = { MODO_RUMBO_CONFIG:{supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'publishable-only'}, supabase:{createClient:()=>mockClient} };
  vm.runInNewContext(serviceJs,{window,localStorage:{getItem(){return '[]'},setItem(){}},document:{},File:class{},URL,createImageBitmap(){}});
  return window.ModoRumboData;
}

test('la sección usa el administrador y el servicio Supabase existentes',()=>{
  assert.match(html,/data-view="homeVideos">Videos de portada/);
  assert.match(html,/id="homeVideosView"/);
  assert.match(html,/home-videos-admin\.js/);
  assert.match(serviceJs,/from\('home_videos'\)/);
  assert.match(serviceJs,/listHomeVideos,createHomeVideo,updateHomeVideo,deleteHomeVideo/);
});

test('los diálogos de agregar y previsualizar videos permanecen ocultos hasta abrirse',()=>{
  assert.match(html,/<dialog class="home-video-form-dialog" id="homeVideoFormDialog"/);
  assert.match(html,/<dialog class="home-video-preview-dialog" id="homeVideoPreviewDialog"/);
  assert.match(css,/\.home-video-form-dialog:not\(\[open\]\),\s*\.home-video-preview-dialog:not\(\[open\]\)\s*\{\s*display:none\s*\}/);
  assert.match(adminJs,/\$\('#homeVideoFormDialog'\)\.showModal\(\)/);
  assert.match(adminJs,/\$\('#homeVideoPreviewDialog'\)\.showModal\(\)/);
});

test('la navegación del administrador muestra un panel y oculta los demás',()=>{
  assert.match(baseAdminCss,/\.view\{display:none\}/);
  assert.match(baseAdminCss,/\.view\.active\{display:block\}/);
  assert.match(baseAdminJs,/const views=\{programs:\$\('#programsView'\),editor:\$\('#editorView'\),homeVideos:\$\('#homeVideosView'\),experiences:\$\('#travelerExperiencesView'\)\}/);
  assert.match(baseAdminJs,/Object\.entries\(views\)\.forEach/);
  assert.match(baseAdminJs,/classList\.toggle\('active',key===name\)/);
});

test('el listado consulta los registros publicados y ocultos, ordenados, sin cambiar datos de programas',async()=>{
  const calls=[];
  const query={select(value){calls.push(['select',value]);return this},order(column,options){calls.push(['order',column,options]);return this},then(resolve){resolve({data:[{id:'1',is_published:true},{id:'2',is_published:false}],error:null})}};
  const api=loadDataService({from(table){calls.push(['from',table]);return query}});
  const rows=await api.listHomeVideos();
  assert.deepEqual(Array.from(rows,row=>row.is_published),[true,false]);
  assert.deepEqual(calls.filter(call=>call[0]==='order').map(call=>call[1]),['sort_order','created_at']);
  assert.ok(calls.some(call=>call[0]==='from'&&call[1]==='home_videos'));
  assert.ok(!calls.some(call=>call[1]==='programs'));
});

test('crear, editar y eliminar usan operaciones simuladas y filtran los campos permitidos',async()=>{
  const calls=[];
  const query={select(value){calls.push(['select',value]);return this},single(){return Promise.resolve({data:{id:'row-1',slug:'nuevo-video'},error:null})},insert(payload){calls.push(['insert',payload]);return this},update(payload){calls.push(['update',payload]);return this},delete(){calls.push(['delete']);return this},eq(key,value){calls.push(['eq',key,value]);return this}};
  const api=loadDataService({from(table){calls.push(['from',table]);return query}});
  const inserted=await api.createHomeVideo({slug:'nuevo-video',title:'Video',video_url:'https://cdn.example/video.mp4',is_published:false,id:'no-se-envia',unexpected:'no-se-envia'});
  assert.equal(inserted.id,'row-1');
  await api.updateHomeVideo('row-1',{is_published:true,sort_order:2,unexpected:'no-se-envia'});
  await api.deleteHomeVideo('row-1');
  assert.ok(calls.every(call=>call[0]!=='from'||call[1]==='home_videos'));
  assert.deepEqual(JSON.parse(JSON.stringify(calls.find(call=>call[0]==='insert')[1])),{slug:'nuevo-video',title:'Video',video_url:'https://cdn.example/video.mp4',is_published:false});
  assert.deepEqual(JSON.parse(JSON.stringify(calls.find(call=>call[0]==='update')[1])),{is_published:true,sort_order:2});
  assert.ok(calls.some(call=>call[0]==='eq'&&call[1]==='id'&&call[2]==='row-1'));
});

test('la vista previa no asigna el MP4 hasta pulsar reproducir y lo libera al cerrar',()=>{
  assert.match(html,/id="homeVideoPreviewPlayer" controls playsinline preload="none"/);
  assert.match(adminJs,/function startPreview\(\)[\s\S]*?player\.src=item\.video_url;player\.load\(\)/);
  assert.match(adminJs,/function closePreview\(\)[\s\S]*?player\.removeAttribute\('src'\)/);
  assert.doesNotMatch(adminJs,/\.mp4["']/i);
  assert.doesNotMatch(adminJs,/storage\.from|\.upload\(/i);
});

test('URLs externas rechazan Supabase, credenciales, escapes y permiten otros hosts HTTPS',()=>{
  assert.match(adminJs,/host\.endsWith\('\.supabase\.co'\)/);
  assert.match(adminJs,/host==='bwwgrbbovlkihtyhhapt\.supabase\.co'/);
  assert.match(adminJs,/path\.startsWith\('\/storage\/v1\/'\)/);
  assert.match(adminJs,/authority\)\) return false/);
  assert.match(adminJs,/parsed\.protocol!=='https:'/);
});

test('formularios permiten solo URLs seguras para video y miniaturas HTTPS o rutas locales',()=>{
  assert.match(html,/id="homeVideoUrl" type="url"/);
  assert.doesNotMatch(html,/id="homeVideoUrl"[^>]*type="file"/);
  assert.match(adminJs,/assets\\\/videos/);
  assert.match(adminJs,/new URL\(raw\)/);
  assert.match(css,/max-width:780px/);
});


test('el generador carga el video solo al solicitarlo, habilita captura y comunica bloqueos CORS',()=>{
  assert.match(adminJs,/homeVideoGenerateThumbnails'\)\.addEventListener\('click',loadFrameVideo\)/);
  assert.match(adminJs,/player\.crossOrigin='anonymous'/);
  assert.match(adminJs,/player\.src=source;player\.load\(\)/);
  assert.match(adminJs,/function cropRect\(width,height,ratio\)/);
  assert.match(adminJs,/ratio:16\/9/);
  assert.match(adminJs,/ratio:9\/16/);
  assert.match(adminJs,/context\.drawImage\(source,crop\.sx,crop\.sy,crop\.sw,crop\.sh,0,0,canvas\.width,canvas\.height\)/);
  assert.match(adminJs,/type:'image\/webp'/);
  assert.match(adminJs,/error\.name==='SecurityError'/);
  assert.match(adminJs,/bloqueó la captura por CORS/);
  assert.match(adminJs,/No se intenta eludir esa restricción/);
});

test('las imágenes procesadas se optimizan y solo se suben después del guardado explícito',()=>{
  assert.match(adminJs,/file\.size>15\*1024\*1024/);
  assert.match(adminJs,/blob\.size<=1024\*1024/);
  assert.match(adminJs,/service\.uploadHomeVideoImage\(staged\.file,payload\.slug,kind\)/);
  assert.match(adminJs,/if\(!staged\)continue/);
  assert.match(serviceJs,/file\.size>1024\*1024/);
  assert.match(serviceJs,/allowedTypes=new Set\(\['image\/webp','image\/jpeg','image\/png'\]\)/);
});

test('el SQL configura solo el bucket público de imágenes y reserva escrituras a administradores',()=>{
  assert.match(storageSql,/insert into storage\.buckets/);
  assert.match(storageSql,/'home-video-images'[\s\S]*?1048576[\s\S]*?image\/webp[\s\S]*?image\/jpeg[\s\S]*?image\/png/);
  assert.match(storageSql,/public\.is_modo_rumbo_admin\(\)/);
  assert.match(storageSql,/for select[\s\S]*?to anon, authenticated[\s\S]*?bucket_id = 'home-video-images'/);
  assert.doesNotMatch(storageSql,/video\/mp4|video\/|storage\.buckets\s*\([^)]*\).*video/i);
  assert.doesNotMatch(storageSql,/drop table|drop function|drop policy if exists "(?!Public reads home video images|Admins (insert|update|delete) home video images)/i);
});

test('el aviso del administrador distingue Supabase de la persistencia local',()=>{
  assert.match(baseAdminJs,/Supabase conectado/);
  assert.match(baseAdminJs,/Supabase configurado/);
  assert.match(baseAdminJs,/Modo local/);
  assert.match(baseAdminJs,/updateBackendIndicator\(state\.mode,state\.user\)/);
});

test('la edición conserva las miniaturas existentes salvo que se reemplacen expresamente',()=>{
  assert.match(adminJs,/const staged=state\.imageStages\[kind\]; if\(!staged\)continue/);
  assert.match(adminJs,/oldImages=changedKinds\.map/);
  assert.match(adminJs,/service\.deleteHomeVideoImageIfUnreferenced\(url\)/);
  assert.match(serviceJs,/homeVideoImagePath\(value\)/);
});

test('al borrar o reemplazar miniaturas verifica referencias antes de usar Storage remove',()=>{
  assert.match(adminJs,/const images=\[video\.thumbnail_path,video\.player_poster_path\]/);
  assert.match(adminJs,/cleanupUnreferencedImages\(images/);
  assert.match(adminJs,/cleanupUnreferencedImages\(oldImages/);
  assert.match(serviceJs,/async function deleteHomeVideoImageIfUnreferenced/);
  assert.match(serviceJs,/await listHomeVideos\(\)/);
  assert.match(serviceJs,/homeVideoImagePath\(url\)===path/);
  assert.match(serviceJs,/storage\.from\('home-video-images'\)\.remove\(\[path\]\)/);
  assert.doesNotMatch(serviceJs,/from\('storage\.objects'\)/);
});

test('las miniaturas buscan objetivos WebP de 100 KB horizontal y 200 KB vertical sin deformar',()=>{
  assert.match(adminJs,/kind==='thumbnail'\?100\*1024:200\*1024/);
  assert.match(adminJs,/if\(blob\.size<=targetBytes\)/);
  assert.match(adminJs,/ratio:16\/9/);
  assert.match(adminJs,/ratio:9\/16/);
  assert.match(adminJs,/cropRect\(width,height,ratio\)/);
});

test('el selector ofrece las seis modalidades y la búsqueda personalizada con acciones existentes',()=>{
  for(const value of ['grupales','sin-aereo','playa','europa','exotico','a-medida','custom-query'])assert.match(html,new RegExp(`<option value="${value}">`));
  assert.match(adminJs,/grupales:\{type:'search-experience',value:'grupal'\}/);
  assert.match(adminJs,/playa:\{type:'search-mode',value:'playa'\}/);
  assert.match(adminJs,/europa:\{type:'search-query',value:'Europa'\}/);
  assert.match(adminJs,/exotico:\{type:'search-query',value:'Exóticos'\}/);
  assert.match(adminJs,/'a-medida':\{type:'home-custom',value:''\}/);
  assert.match(adminJs,/customQuery\?'search-query'/);
});

test('Storage no elimina una miniatura todavía usada por otro registro',async()=>{
  const calls=[];
  const rows=[
    {thumbnail_path:'https://test.supabase.co/storage/v1/object/public/home-video-images/shared/a.webp',player_poster_path:'https://cdn.example/b.webp'},
    {thumbnail_path:'https://cdn.example/c.webp',player_poster_path:'https://test.supabase.co/storage/v1/object/public/home-video-images/shared/poster.webp'}
  ];
  const query={select(){return this},order(){return this},then(resolve){resolve({data:rows,error:null})}};
  const storage={from(bucket){return{async remove(paths){calls.push([bucket,paths]);return{error:null}}}}};
  const api=loadDataService({from(table){assert.equal(table,'home_videos');return query},storage});
  const kept=await api.deleteHomeVideoImageIfUnreferenced(rows[0].thumbnail_path);
  assert.deepEqual(JSON.parse(JSON.stringify(kept)),{deleted:false,referenced:true});
  const keptPoster=await api.deleteHomeVideoImageIfUnreferenced(rows[1].player_poster_path);
  assert.deepEqual(JSON.parse(JSON.stringify(keptPoster)),{deleted:false,referenced:true});
  assert.equal(calls.length,0);
  const removed=await api.deleteHomeVideoImageIfUnreferenced('https://test.supabase.co/storage/v1/object/public/home-video-images/old/b.webp');
  assert.deepEqual(JSON.parse(JSON.stringify(removed)),{deleted:true,referenced:false});
  assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['home-video-images',['old/b.webp']]]);
});

test('un error leyendo referencias evita borrar imágenes y se propaga para informar',async()=>{
  const storage={from(){return{async remove(){throw new Error('No debería ejecutarse')}}}};
  const query={select(){return this},order(){return this},then(resolve){resolve({data:null,error:new Error('lectura denegada')})}};
  const api=loadDataService({from(){return query},storage});
  await assert.rejects(api.deleteHomeVideoImageIfUnreferenced('https://test.supabase.co/storage/v1/object/public/home-video-images/x.webp'),/lectura denegada/);
});

test('un error de Storage al eliminar se propaga al administrador',async()=>{
  const query={select(){return this},order(){return this},then(resolve){resolve({data:[],error:null})}};
  const storage={from(){return{async remove(){return{error:new Error('Storage no disponible')}}}}};
  const api=loadDataService({from(){return query},storage});
  await assert.rejects(api.deleteHomeVideoImageIfUnreferenced('https://test.supabase.co/storage/v1/object/public/home-video-images/x.webp'),/Storage no disponible/);
});


test('el servicio solo sube imágenes de hasta 1 MB al bucket exclusivo y limpia rutas propias',async()=>{
  const calls=[];
  const storage={from(bucket){calls.push(['bucket',bucket]);return{
    async upload(path,file,options){calls.push(['upload',path,file.type,file.size,options]);return{error:null}},
    getPublicUrl(path){return{data:{publicUrl:`https://test.supabase.co/storage/v1/object/public/home-video-images/${path}`}}},
    async remove(paths){calls.push(['remove',paths]);return{error:null}}
  }}};
  const api=loadDataService({from(){throw new Error('No debe tocar tablas para subir una imagen')},storage});
  await assert.rejects(api.uploadHomeVideoImage({type:'video/mp4',size:100},'ejemplo','thumbnail'),/Solo se permiten miniaturas/);
  await assert.rejects(api.uploadHomeVideoImage({type:'image/png',size:1024*1024+1},'ejemplo','thumbnail'),/1 MB/);
  assert.equal(calls.length,0);
  const uploaded=await api.uploadHomeVideoImage({type:'image/webp',size:500},'ejemplo','thumbnail');
  assert.match(uploaded.url,/home-video-images/);
  assert.deepEqual(calls.filter(call=>call[0]==='bucket').map(call=>call[1]),['home-video-images','home-video-images']);
  assert.equal(calls.find(call=>call[0]==='upload')[4].upsert,false);
  assert.equal(await api.deleteHomeVideoImage('https://images.example.com/thumb.webp'),false);
  assert.equal(await api.deleteHomeVideoImage(uploaded.url),true);
  assert.deepEqual(Array.from(calls.find(call=>call[0]==='remove')[1]),[uploaded.path]);
});
