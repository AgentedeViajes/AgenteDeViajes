(function(){
  'use strict';
  const localKey='modoRumboAdminProgramsV1';
  const config=window.MODO_RUMBO_CONFIG||{};
  const configured=Boolean(config.supabaseUrl&&config.supabasePublishableKey&&window.supabase?.createClient);
  const client=configured?window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey):null;

  const splitList=value=>String(value||'').split(',').map(item=>item.trim()).filter(Boolean);
  const joinList=value=>Array.isArray(value)?value.join(', '):(value||'');
  const readLocal=()=>{try{return JSON.parse(localStorage.getItem(localKey)||'[]')}catch(error){return[]}};
  const writeLocal=programs=>localStorage.setItem(localKey,JSON.stringify(programs));

  function fromDatabase(row){
    return{
      id:row.id,title:row.title,operatorCode:row.operator_code||'',status:row.status,region:row.region||'',countries:joinList(row.countries),destinations:joinList(row.destinations),duration:row.duration||'',featured:Boolean(row.featured),travelTypes:row.travel_types||[],flightType:row.flight_type,departureType:row.departure_type,currency:row.currency,price:row.price??'',pricePrefix:row.price_prefix,priceBasis:row.price_basis,includes:(row.includes||[]).join('\n'),summary:row.summary||'',notes:row.notes||'',image:row.image_path||'',updatedAt:row.updated_at,
      dateMode:window.ModoRumboDateMode.normalizeMode(row.date_mode),rangeStartDate:row.travel_start_date||'',rangeEndDate:row.travel_end_date||'',
      departures:(row.departures||[]).sort((a,b)=>(a.departure_date||'').localeCompare(b.departure_date||'')).map(item=>({date:item.departure_date||'',price:item.price??'',capacity:item.capacity??''})),
      itinerary:(row.itinerary_days||[]).sort((a,b)=>a.position-b.position).map(item=>({title:item.title||'',meals:item.meals||'',description:item.description||''}))
    };
  }

  function toDatabase(program){
    return{id:program.id,title:program.title,operator_code:program.operatorCode||null,status:program.status,region:program.region||null,countries:splitList(program.countries),destinations:splitList(program.destinations),duration:program.duration||null,featured:Boolean(program.featured),travel_types:program.travelTypes||[],flight_type:program.flightType,departure_type:program.departureType,date_mode:window.ModoRumboDateMode.normalizeMode(program.dateMode),travel_start_date:program.rangeStartDate||null,travel_end_date:program.rangeEndDate||null,currency:program.currency,price:program.price===''?null:Number(program.price),price_prefix:program.pricePrefix,price_basis:program.priceBasis,includes:String(program.includes||'').split('\n').map(item=>item.trim()).filter(Boolean),summary:program.summary||null,notes:program.notes||null,image_path:program.image||null};
  }

  async function initialize(){
    if(!configured)return{mode:'local',requiresAuth:false,user:null,programs:readLocal()};
    const{data,error}=await client.auth.getSession();if(error)throw error;
    if(!data.session)return{mode:'supabase',requiresAuth:true,user:null,programs:[]};
    return{mode:'supabase',requiresAuth:false,user:data.session.user,programs:await listPrograms()};
  }
  async function signIn(email,password){if(!client)throw new Error('Supabase todavía no está configurado.');const{data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;return data.user}
  async function signOut(){if(client){const{error}=await client.auth.signOut();if(error)throw error}}
  async function listPrograms(){
    if(!client)return readLocal();
    const{data,error}=await client.from('programs').select('*, departures(*), itinerary_days(*)').order('updated_at',{ascending:false});if(error)throw error;return(data||[]).map(fromDatabase);
  }
  async function saveProgram(program,currentPrograms){
    if(!client){const programs=[...currentPrograms];const index=programs.findIndex(item=>item.id===program.id);if(index>=0)programs[index]=program;else programs.unshift(program);writeLocal(programs);return programs}
    const payload=toDatabase(program);const{data,error}=await client.from('programs').upsert(payload).select('id').single();if(error)throw error;const id=data.id;
    const cleanup=await Promise.all([client.from('departures').delete().eq('program_id',id),client.from('itinerary_days').delete().eq('program_id',id)]);const cleanupError=cleanup.find(result=>result.error)?.error;if(cleanupError)throw cleanupError;
    if(program.departures?.length){const{error:departureError}=await client.from('departures').insert(program.departures.map(item=>({program_id:id,departure_date:item.date||null,price:item.price===''?null:Number(item.price),capacity:item.capacity===''?null:Number(item.capacity)})));if(departureError)throw departureError}
    if(program.itinerary?.length){const{error:itineraryError}=await client.from('itinerary_days').insert(program.itinerary.map((item,index)=>({program_id:id,position:index+1,title:item.title||null,meals:item.meals||null,description:item.description||''})));if(itineraryError)throw itineraryError}
    return listPrograms();
  }
  async function deleteProgram(id,currentPrograms){if(!client){const programs=currentPrograms.filter(item=>item.id!==id);writeLocal(programs);return programs}const{error}=await client.from('programs').delete().eq('id',id);if(error)throw error;return listPrograms()}

  async function optimizeImage(file){
    if(!file?.type?.startsWith('image/'))throw new Error('Seleccioná un archivo de imagen válido.');
    if(file.size>15*1024*1024)throw new Error('La imagen supera el límite de 15 MB.');
    try{
      const bitmap=await createImageBitmap(file);const maxWidth=1800;const ratio=Math.min(1,maxWidth/bitmap.width);const width=Math.round(bitmap.width*ratio);const height=Math.round(bitmap.height*ratio);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{alpha:false});context.drawImage(bitmap,0,0,width,height);bitmap.close?.();
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('No se pudo optimizar la imagen.')),'image/webp',0.86));
      return new File([blob],`${file.name.replace(/\.[^.]+$/,'')}.webp`,{type:'image/webp'});
    }catch(error){if(file.type==='image/webp')return file;throw error}
  }
  async function uploadImage(file,programId){
    if(!client)throw new Error('La carga de imágenes requiere conectar Supabase.');
    const optimized=await optimizeImage(file);const safeName=optimized.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9.-]+/g,'-');const path=`${programId}/${Date.now()}-${safeName}`;
    const{error}=await client.storage.from('travel-programs').upload(path,optimized,{cacheControl:'31536000',contentType:'image/webp',upsert:false});if(error)throw error;
    const{data}=client.storage.from('travel-programs').getPublicUrl(path);return data.publicUrl;
  }

  const HOME_VIDEO_FIELDS = new Set(['slug','title','description','video_url','thumbnail_path','player_poster_path','duration_seconds','navigation_type','navigation_value','button_label','sort_order','is_published']);
  function requireSupabase(){if(!client)throw new Error('La gestión de videos requiere la conexión con Supabase.')}
  async function listHomeVideos(){requireSupabase();const{data,error}=await client.from('home_videos').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true});if(error)throw error;return data||[]}
  async function createHomeVideo(video){requireSupabase();const payload=Object.fromEntries(Object.entries(video).filter(([key])=>HOME_VIDEO_FIELDS.has(key)));const{data,error}=await client.from('home_videos').insert(payload).select('*').single();if(error)throw error;return data}
  async function updateHomeVideo(id,changes){requireSupabase();const payload=Object.fromEntries(Object.entries(changes).filter(([key])=>HOME_VIDEO_FIELDS.has(key)));const{data,error}=await client.from('home_videos').update(payload).eq('id',id).select('*').single();if(error)throw error;return data}
  async function deleteHomeVideo(id){requireSupabase();const{data,error}=await client.from('home_videos').delete().eq('id',id).select('id').single();if(error)throw error;return data.id}
  async function uploadHomeVideoImage(file,slug,kind){
    requireSupabase();
    const allowedTypes=new Set(['image/webp','image/jpeg','image/png']);
    if(!file||!allowedTypes.has(file.type))throw new Error('Solo se permiten miniaturas WebP, JPEG o PNG.');
    if(file.size>1024*1024)throw new Error('Cada miniatura debe pesar como máximo 1 MB.');
    const safeSlug=String(slug||'video').toLowerCase().replace(/[^a-z0-9-]/g,'-');
    const nonce=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const extension=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
    const path=`${safeSlug}/${Date.now()}-${nonce}-${kind}.${extension}`;
    const{error}=await client.storage.from('home-video-images').upload(path,file,{cacheControl:'31536000',contentType:file.type,upsert:false});
    if(error){if(error.message?.toLowerCase().includes('bucket'))throw new Error('Falta configurar el bucket home-video-images con el SQL de preparación.');throw error;}
    const{data}=client.storage.from('home-video-images').getPublicUrl(path);
    return{path,url:data.publicUrl};
  }
  function homeVideoImagePath(value){
    try{const url=new URL(value);const base=new URL(config.supabaseUrl);if(url.origin!==base.origin)return null;const prefix='/storage/v1/object/public/home-video-images/';if(!url.pathname.startsWith(prefix))return null;const path=decodeURIComponent(url.pathname.slice(prefix.length));return path&&!path.split('/').includes('..')?path:null;}catch(_){return null}
  }
  async function deleteHomeVideoImage(value){
    requireSupabase();const path=homeVideoImagePath(value);if(!path)return false;
    const{error}=await client.storage.from('home-video-images').remove([path]);if(error)throw error;return true;
  }

  async function deleteHomeVideoImageIfUnreferenced(value){
    requireSupabase();const path=homeVideoImagePath(value);if(!path)return{deleted:false,external:true};
    const rows=await listHomeVideos();
    const referenced=rows.some(row=>[row.thumbnail_path,row.player_poster_path].some(url=>homeVideoImagePath(url)===path));
    if(referenced)return{deleted:false,referenced:true};
    const{error}=await client.storage.from('home-video-images').remove([path]);if(error)throw error;
    return{deleted:true,referenced:false};
  }

  window.ModoRumboData={configured,initialize,signIn,signOut,listPrograms,saveProgram,deleteProgram,uploadImage,listHomeVideos,createHomeVideo,updateHomeVideo,deleteHomeVideo,uploadHomeVideoImage,deleteHomeVideoImage,deleteHomeVideoImageIfUnreferenced};
})();
