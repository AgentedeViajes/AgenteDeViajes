'use strict';
const crypto = require('node:crypto');
const SUPABASE_URL = 'https://bwwgrbbovlkihtyhhapt.supabase.co';
const PUBLIC_KEY = 'sb_publishable_usKC88fBSVnNvb4LTEUXJQ_8lPKVvub';
const BUCKET = 'traveler-experience-photos';
const MAX_BODY = 900 * 1024;
const MAX_PHOTO = 500 * 1024;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class ApiError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status || 503; } }
function diagnostic(error, stage, category, httpStatus, missingEnvironmentVariables) {
  const result = error instanceof Error ? error : new ApiError('service_unavailable', 503);
  result.diagnostic = { stage, category };
  if (Number.isInteger(httpStatus)) result.diagnostic.httpStatus = httpStatus;
  if (Array.isArray(missingEnvironmentVariables)) result.diagnostic.missingEnvironmentVariables = missingEnvironmentVariables;
  return result;
}
function hashToken(token) { return crypto.createHash('sha256').update(token).digest(); }
function dbBytea(hash) { return '\\x' + hash.toString('hex'); }
function clean(value, max, min) {
  if (typeof value !== 'string') return null;
  const result = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return result.length >= (min || 1) && result.length <= max ? result : null;
}
function bodyOf(req) {
  let body = req.body;
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > MAX_BODY) return { error: 'large' };
    try { body = JSON.parse(body); } catch (_) { return { error: 'invalid' }; }
  } else {
    try { if (Buffer.byteLength(JSON.stringify(body || {})) > MAX_BODY) return { error: 'large' }; }
    catch (_) { return { error: 'invalid' }; }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? { body: body } : { error: 'invalid' };
}
function allowedOrigin(origin, env) {
  if (!origin) return false;
  let url; try { url = new URL(origin); } catch (_) { return false; }
  if (url.origin !== origin) return false;
  if (env.VERCEL_ENV === 'production') return origin === 'https://modorumbo.vercel.app' || origin === 'https://agentedeviajes.github.io';
  const hosts = [env.VERCEL_URL, env.VERCEL_BRANCH_URL].filter(Boolean).map(x => String(x).replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase());
  if (url.protocol === 'https:' && hosts.includes(url.host.toLowerCase())) return true;
  return env.VERCEL_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
}
function publicOrigin(env) {
  if (env.VERCEL_ENV === 'production') return 'https://modorumbo.vercel.app';
  if (env.VERCEL_URL) return 'https://' + String(env.VERCEL_URL).replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (env.PUBLIC_SITE_URL) return new URL(env.PUBLIC_SITE_URL).origin;
  return 'http://localhost:4175';
}
function decodeWebp(text, mime) {
  if (mime !== 'image/webp' || typeof text !== 'string' || text.length > 700000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) throw new ApiError('invalid_photo', 400);
  const buf = Buffer.from(text, 'base64');
  if (!buf.length || buf.length > MAX_PHOTO || buf.toString('base64').replace(/=+$/, '') !== text.replace(/=+$/, '') || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') throw new ApiError('invalid_photo', 400);
  return buf;
}
async function processPhoto(input, sharpImpl) {
  const sharp = sharpImpl || require('sharp');
  try {
    const meta = await sharp(input, { failOn: 'error', limitInputPixels: 14400000 }).metadata();
    if (meta.format !== 'webp' || !meta.width || !meta.height || meta.width > 1200 || meta.height > 1200) throw new ApiError('invalid_photo', 400);
    let output;
    for (const quality of [78, 68, 58, 48, 38]) {
      output = await sharp(input, { failOn: 'error', limitInputPixels: 14400000 }).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality, effort: 4 }).toBuffer();
      if (output.length <= 300 * 1024) break;
    }
    if (!output || output.length > MAX_PHOTO) throw new ApiError('photo_too_large', 400);
    const finalMeta = await sharp(output, { failOn: 'error', limitInputPixels: 14400000 }).metadata();
    if (finalMeta.format !== 'webp' || !finalMeta.width || !finalMeta.height || finalMeta.width > 1200 || finalMeta.height > 1200) throw new ApiError('invalid_photo', 400);
    return output;
  } catch (err) { if (err instanceof ApiError) throw err; throw new ApiError('invalid_photo', 400); }
}
function createBackend(env, fetcher) {
  const url = env.SUPABASE_URL || SUPABASE_URL;
  const pub = env.SUPABASE_PUBLISHABLE_KEY || PUBLIC_KEY;
  function serviceKey(){return env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY||''}
  function serviceHeaders(json=false, stage='supabase_request'){
    const key=serviceKey();if(!key)throw diagnostic(new ApiError('service_unavailable',503),stage,'missing_service_key',undefined,['SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY']);
    const headers={apikey:key};
    // New opaque secret keys are not JWTs: send them only as `apikey`.
    // Legacy service_role JWTs keep the bearer header for compatibility.
    if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
    if(json)headers['Content-Type']='application/json';
    return headers;
  }
  async function request(stage, requestUrl, init) {
    try { return await fetcher(requestUrl, init); }
    catch (_) { throw diagnostic(new ApiError('service_unavailable',503),stage,'network_error'); }
  }
  async function responseJson(response, stage) {
    try { return await response.json(); }
    catch (_) { throw diagnostic(new ApiError('service_unavailable',503),stage,'invalid_supabase_response',response.status); }
  }
  async function rpc(name, data) {
    const stage='supabase_rpc_'+name;
    const r = await request(stage,url + '/rest/v1/rpc/' + name, { method: 'POST', headers: serviceHeaders(true,stage), body: JSON.stringify(data) });
    if (!r.ok) { let j={}; try { j=await r.json(); } catch (_) {} const e=new ApiError('database_unavailable',r.status>=500?503:409); e.dbCode=j.code; throw diagnostic(e,stage,'supabase_http_error',r.status); }
    return r.status===204 ? null : responseJson(r,stage);
  }
  async function rest(path,stage='supabase_postgrest_read') { const r=await request(stage,url+'/rest/v1/'+path,{headers:serviceHeaders(false,stage)});if(!r.ok)throw diagnostic(new ApiError('database_unavailable',r.status>=500?503:409),stage,'supabase_http_error',r.status);return responseJson(r,stage); }
  return {
    async getUser(jwt) { const stage='supabase_auth_get_user';const r=await request(stage,url+'/auth/v1/user',{headers:{apikey:pub,Authorization:'Bearer '+jwt}}); if(!r.ok)return null; const u=await responseJson(r,stage); return u&&UUID_RE.test(u.id||'')?{id:u.id}:null; },
    async isAdmin(id) { return (await rpc('is_modo_rumbo_admin',{check_user:id}))===true; },
    createInvite(data) { return rpc('create_traveler_experience_invite',data); },
    revokeInvite(data) { return rpc('revoke_traveler_experience_invite',data); },
    moderateExperience(data) { return rpc('moderate_traveler_experience',data); },
    async listInvitations(){return rest('traveler_experience_invites?select=id,destination,program_title_snapshot,passenger_name,status,created_at,expires_at,used_at,revoked_at&order=created_at.desc&limit=100','supabase_list_invitations')},
    async listExperiences(){return rest('traveler_experiences?select=id,passenger_name,destination,travel_month,travel_year,rating,comment,photo_object_path,status,created_at,reviewed_at,published_at&order=created_at.desc&limit=100','supabase_list_experiences')},
    async getPublishedProgram(id){const query=new URLSearchParams({select:'id,title',id:'eq.'+id,status:'eq.published',limit:'1'});const rows=await rest('programs?'+query.toString(),'supabase_get_published_program');return rows[0]||null},
    async getExperiencePhoto(id){
      const query=new URLSearchParams({select:'photo_object_path',id:'eq.'+id,limit:'1'});const rows=await rest('traveler_experiences?'+query.toString(),'supabase_get_experience_photo_record');
      const path=rows[0]?.photo_object_path;if(typeof path!=='string'||!/^traveler-experiences\/[0-9a-f-]{36}\.webp$/i.test(path))throw new ApiError('photo_unavailable',404);
      const stage='supabase_download_experience_photo';const r=await request(stage,url+'/storage/v1/object/'+BUCKET+'/'+path,{headers:serviceHeaders(false,stage)});if(r.status===404)throw new ApiError('photo_unavailable',404);if(!r.ok)throw diagnostic(new ApiError('storage_unavailable',503),stage,'supabase_http_error',r.status);
      const contentType=String(r.headers.get('content-type')||'').split(';')[0].toLowerCase();if(contentType!=='image/webp')throw new ApiError('photo_unavailable',404);
      const bytes=Buffer.from(await r.arrayBuffer());if(!bytes.length||bytes.length>MAX_PHOTO)throw new ApiError('photo_unavailable',404);return bytes;
    },
    async lookup(hash) { const x=await rpc('lookup_traveler_experience_invite',{p_token_hash:dbBytea(hash)}); return Array.isArray(x)?x[0]||null:x||null; },
    consume(data) { return rpc('consume_traveler_experience_invite',data); },
    async upload(path, bytes, ownership) { const stage='supabase_upload_experience_photo';const metadata=Buffer.from(JSON.stringify({experience_invitation_id:ownership.invitationId,upload_nonce:ownership.nonce})).toString('base64'); const headers={...serviceHeaders(false,stage),'Content-Type':'image/webp','Cache-Control':'no-store','x-upsert':'false','x-metadata':metadata}; const r=await request(stage,url+'/storage/v1/object/'+BUCKET+'/'+path,{method:'POST',headers,body:bytes}); if(!r.ok)throw diagnostic(new ApiError('storage_unavailable',503),stage,'supabase_http_error',r.status); },
    async objectInfo(path) { const stage='supabase_verify_experience_photo';const r=await request(stage,url+'/storage/v1/object/info/'+BUCKET+'/'+path,{headers:serviceHeaders(false,stage)}); if(r.status===404)return null; if(!r.ok)throw diagnostic(new ApiError('storage_unavailable',503),stage,'supabase_http_error',r.status); return responseJson(r,stage); },
    photoReferenced(path) { return rpc('traveler_experience_photo_is_referenced',{p_photo_object_path:path}); },
    async remove(path) { const stage='supabase_remove_experience_photo';const r=await request(stage,url+'/storage/v1/object/'+BUCKET,{method:'DELETE',headers:serviceHeaders(true,stage),body:JSON.stringify({prefixes:[path]})}); if(!r.ok)throw diagnostic(new ApiError('storage_unavailable',503),stage,'supabase_http_error',r.status); }
  };
}
function createHandler(options) {
  options=options||{}; const env=options.env||process.env; const fetcher=options.fetchImpl||fetch;
  const db=options.backend||createBackend(env,fetcher); const log=options.log||((x)=>console.error(x));
  const now=options.now||Date.now; const newToken=options.newToken||(()=>crypto.randomBytes(32).toString('base64url'));
  const newId=options.newId||(()=>crypto.randomUUID()); const processImage=options.processImage||processPhoto; const hits=new Map();
  function logDiagnostic(error, fallbackStage, fallbackCategory) {
    const source=error&&error.diagnostic||{};
    const record={event:'traveler_experience_api_failure',stage:source.stage||fallbackStage||'request',category:source.category||fallbackCategory||'unexpected_error'};
    if(Number.isInteger(source.httpStatus)&&source.httpStatus>=100&&source.httpStatus<=599)record.http_status=source.httpStatus;
    const allowedMissing=new Set(['SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY']);
    const missing=Array.isArray(source.missingEnvironmentVariables)?source.missingEnvironmentVariables.filter(name=>allowedMissing.has(name)):[];
    if(missing.length)record.missing_environment_variables=missing;
    log(JSON.stringify(record));
  }
  function limited(req,action) { const t=now(); for(const [k,v] of hits)if(t-v.start>900000)hits.delete(k); const ip=String(req.headers['x-real-ip']||req.headers['x-forwarded-for']||'unknown').split(',')[0].slice(0,80); const k=action+':'+ip; const v=hits.get(k)||{start:t,count:0}; const limit=['list-invitations','list-experiences','get-experience-photo'].includes(action)?60:['create-invitation','revoke-invitation','moderate-experience'].includes(action)?20:action==='validate-invitation'?30:8; if(v.count>=limit)return true; v.count++;hits.set(k,v);if(hits.size>1200)hits.clear();return false; }
  function photoMatches(info,photo) { const metadata=info&&info.metadata||{},user=info&&(info.user_metadata||info.userMetadata)||{};return !!info&&info.name===photo.path&&Number(metadata.size)===photo.size&&metadata.mimetype==='image/webp'&&user.experience_invitation_id===photo.invitationId&&user.upload_nonce===photo.nonce; }
  async function cleanupOwnedPhoto(photo) {
    const referenced=await db.photoReferenced(photo.path);
    if(referenced===true)return false;
    if(referenced!==false)throw new ApiError('photo_reference_unverified',503);
    const info=await db.objectInfo(photo.path);
    if(!info)return true;
    if(!photoMatches(info,photo))throw new ApiError('photo_ownership_unverified',503);
    await db.remove(photo.path);
    return true;
  }
  async function admin(req) { const m=String(req.headers.authorization||'').match(/^Bearer ([^\s]{20,4096})$/);if(!m)throw new ApiError('unauthorized',401);const u=await db.getUser(m[1]);if(!u)throw new ApiError('unauthorized',401);if(!(await db.isAdmin(u.id)))throw new ApiError('forbidden',403);return u; }
  return async function handler(req,res) {
    res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
    const send=(s,b)=>res.status(s).json(b);
    const origin=String(req.headers.origin||'');
    if(!allowedOrigin(origin,env))return send(403,{ok:false,error:'origin_not_allowed'});
    res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Max-Age','600');return res.status(204).end();}
    if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{ok:false,error:'method_not_allowed'});}
    if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type']||'')))return send(415,{ok:false,error:'unsupported_media_type'});
    const parsed=bodyOf(req);if(parsed.error==='large')return send(413,{ok:false,error:'request_too_large'});if(parsed.error)return send(400,{ok:false,error:'invalid_request'});
    const b=parsed.body, action=b.action;
    if(!['create-invitation','revoke-invitation','list-invitations','list-experiences','moderate-experience','get-experience-photo','validate-invitation','submit-experience'].includes(action))return send(400,{ok:false,error:'invalid_request'});
    if(limited(req,action))return send(429,{ok:false,error:'too_many_requests'});
    if(typeof b.website==='string'&&b.website.trim())return send(202,{ok:true});
    try {
      if(action==='create-invitation') {
        const u=await admin(req), destination=clean(b.destination,160,2);
        const passenger=b.passengerName==null||b.passengerName===''?null:clean(b.passengerName,120,2);
        const programId=b.programId==null||b.programId===''?null:String(b.programId);
        if(!destination||(b.passengerName&&!passenger)||(programId&&!UUID_RE.test(programId)))return send(400,{ok:false,error:'invalid_request'});
        const program=programId?await db.getPublishedProgram(programId):null;if(programId&&!program)return send(400,{ok:false,error:'invalid_program'});
        const token=newToken();if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw diagnostic(new ApiError('service_unavailable',503),'generate_invitation_token','invalid_generated_value');
        const result=await db.createInvite({p_admin_user_id:u.id,p_token_hash:dbBytea(hashToken(token)),p_program_id:programId,p_destination:destination,p_program_title:program?.title||null,p_passenger_name:passenger,p_valid_days:30});
        const row=Array.isArray(result)?result[0]:result;if(!row||!UUID_RE.test(row.invite_id||''))throw diagnostic(new ApiError('service_unavailable',503),'create_invitation_rpc','invalid_rpc_result');
        return send(201,{ok:true,invitationId:row.invite_id,expiresAt:row.expires_at,link:publicOrigin(env)+'/compartir-experiencia.html#'+token});
      }
      if(action==='revoke-invitation') { const u=await admin(req);if(!UUID_RE.test(String(b.invitationId||'')))return send(400,{ok:false,error:'invalid_request'});const revoked=await db.revokeInvite({p_admin_user_id:u.id,p_invitation_id:b.invitationId});if(revoked===false)return send(409,{ok:false,error:'invitation_unavailable'});return send(200,{ok:true}); }
      if(action==='list-invitations') { await admin(req);const rows=await db.listInvitations();return send(200,{ok:true,invitations:(rows||[]).map(i=>({id:i.id,destination:i.destination,programTitle:i.program_title_snapshot||null,passengerName:i.passenger_name||null,status:i.status==='pending'&&Date.parse(i.expires_at)<=now()?'expired':i.status,createdAt:i.created_at,expiresAt:i.expires_at,usedAt:i.used_at||null,revokedAt:i.revoked_at||null}))}); }
      if(action==='list-experiences') { await admin(req);const rows=await db.listExperiences();return send(200,{ok:true,experiences:(rows||[]).map(e=>({id:e.id,passengerName:e.passenger_name,destination:e.destination,travelMonth:e.travel_month,travelYear:e.travel_year,rating:e.rating,comment:e.comment,status:e.status,createdAt:e.created_at,reviewedAt:e.reviewed_at||null,publishedAt:e.published_at||null,hasPhoto:Boolean(e.photo_object_path)}))}); }
      if(action==='moderate-experience') { const u=await admin(req);if(!UUID_RE.test(String(b.experienceId||''))||!['approve','reject','hide'].includes(b.moderationAction))return send(400,{ok:false,error:'invalid_request'});const changed=await db.moderateExperience({p_admin_user_id:u.id,p_experience_id:b.experienceId,p_action:b.moderationAction});if(changed===false)return send(409,{ok:false,error:'experience_unavailable'});return send(200,{ok:true}); }
      if(action==='get-experience-photo') { await admin(req);if(!UUID_RE.test(String(b.experienceId||'')))return send(400,{ok:false,error:'invalid_request'});const bytes=await db.getExperiencePhoto(b.experienceId);return send(200,{ok:true,mimeType:'image/webp',imageData:bytes.toString('base64')}); }
      if(typeof b.token!=='string'||!TOKEN_RE.test(b.token))return send(404,{ok:false,error:'invitation_unavailable'});
      const hash=hashToken(b.token);
      if(action==='validate-invitation') { const i=await db.lookup(hash);if(!i||!i.expires_at||Date.parse(i.expires_at)<=now())return send(404,{ok:false,error:'invitation_unavailable'});return send(200,{ok:true,invitation:{destination:i.destination,programTitle:i.program_title_snapshot||null,passengerName:i.passenger_name||null,expiresAt:i.expires_at}}); }
      const name=clean(b.passengerName,120,2), comment=clean(b.comment,4000,10), month=b.travelMonth, year=b.travelYear, rating=b.rating;
      if(!name||!comment||!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<1900||year>new Date(now()).getUTCFullYear()+1||!Number.isInteger(rating)||rating<1||rating>5||b.publicationConsent!==true)return send(400,{ok:false,error:'invalid_request'});
      const invite=await db.lookup(hash);if(!invite||Date.parse(invite.expires_at)<=now())return send(404,{ok:false,error:'invitation_unavailable'});
      let photo=null;
      try {
        let photoPath=null;
        if(b.imageData){const input=decodeWebp(b.imageData,b.imageType);const output=await processImage(input,options.sharp);if(!Buffer.isBuffer(output)||output.length>MAX_PHOTO)throw new ApiError('photo_too_large',400);const objectId=newId();photo={path:'traveler-experiences/'+objectId+'.webp',invitationId:invite.invitation_id,nonce:newId(),size:output.length};await db.upload(photo.path,output,{invitationId:photo.invitationId,nonce:photo.nonce});const stored=await db.objectInfo(photo.path);if(!photoMatches(stored,photo))throw new ApiError('storage_object_unverified',503);photoPath=photo.path;}
        await db.consume({p_token_hash:dbBytea(hash),p_passenger_name:name,p_travel_month:month,p_travel_year:year,p_rating:rating,p_comment:comment,p_publication_consent:true,p_photo_object_path:photoPath});
        photo=null;
      }
      catch(err) { if(photo)try{await cleanupOwnedPhoto(photo);}catch(cleanupError){logDiagnostic(cleanupError,'cleanup_experience_photo','cleanup_failed');} if(err.status===409||err.dbCode==='P0001'||err.dbCode==='22023')return send(409,{ok:false,error:'invitation_unavailable'});throw err; }
      return send(201,{ok:true});
    } catch(err) { if(err instanceof ApiError){if(err.status>=500)logDiagnostic(err,'request_'+action,'api_error');return send(err.status,{ok:false,error:err.status===401?'unauthorized':err.status===403?'forbidden':err.code});}logDiagnostic(err,'request_'+action,'unexpected_error');return send(503,{ok:false,error:'service_unavailable'}); }
  };
}
// Vercel's Node.js runtime invokes the CommonJS function export as the HTTP handler.
// Keep test helpers attached as properties, matching the existing reservations API
// pattern without defining additional HTTP routes.
module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.createBackend = createBackend;
module.exports.processPhoto = processPhoto;
module.exports.hashToken = hashToken;
module.exports.decodeWebp = decodeWebp;
module.exports.allowedOrigin = allowedOrigin;
module.exports.MAX_BODY = MAX_BODY;
module.exports.MAX_PHOTO = MAX_PHOTO;
