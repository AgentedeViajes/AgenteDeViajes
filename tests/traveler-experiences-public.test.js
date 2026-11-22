'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const experiences=require('../traveler-experiences-public');
const root=path.resolve(__dirname,'..');
const sample={passenger_name:'Lucía Pérez',destination:'Kioto, Japón',travel_month:4,travel_year:2026,rating:5,comment:'Fue un viaje inolvidable y muy bien organizado.',published_at:'2026-05-01T12:00:00Z'};

test('la portada consulta solo la vista pública y no envía credenciales de usuario',async()=>{
  let request;
  const config={supabaseUrl:'https://project.example.supabase.co',supabasePublishableKey:'public-test-key'};
  const rows=await experiences.loadApprovedExperiences(config,async(url,options)=>{request={url,options};return{ok:true,json:async()=>[sample]};});
  const endpoint=new URL(request.url);
  assert.equal(endpoint.pathname,'/rest/v1/public_traveler_experiences');
  assert.equal(endpoint.searchParams.get('order'),'published_at.desc');
  assert.equal(endpoint.searchParams.get('limit'),'24');
  assert.equal(endpoint.searchParams.get('select'),'passenger_name,destination,travel_month,travel_year,rating,comment,published_at');
  assert.equal(request.options.method,'GET');assert.equal(request.options.cache,'no-store');assert.equal(request.options.credentials,'omit');
  assert.equal(request.options.headers.apikey,'public-test-key');assert.equal('Authorization' in request.options.headers,false);
  assert.equal(rows.length,1);assert.equal(rows[0].passengerName,'Lucía Pérez');
});

test('solo renderiza filas con campos válidos y escapa contenido aportado por pasajeros',async()=>{
  const rows=await experiences.loadApprovedExperiences({supabaseUrl:'https://project.example.supabase.co',supabasePublishableKey:'public-test-key'},async()=>({ok:true,json:async()=>[
    sample,
    {...sample,rating:6},
    {...sample,comment:'<script>alert(1)</script> comentario de prueba'}
  ]}));
  const section={hidden:true},target={innerHTML:''};
  assert.equal(experiences.render(section,target,rows),2);assert.equal(section.hidden,false);
  assert.match(target.innerHTML,/Lucía Pérez/);assert.match(target.innerHTML,/5 de 5 estrellas/);
  assert.match(target.innerHTML,/&lt;script&gt;/);assert.doesNotMatch(target.innerHTML,/<script>/);
  assert.doesNotMatch(target.innerHTML,/photo_object_path|invitation_id|public_photo_key/);
});

test('la sección permanece oculta si la vista no tiene reseñas o falla la consulta',async()=>{
  const section={hidden:false},target={innerHTML:'contenido anterior'},doc={getElementById:id=>id==='traveler-experiences-home'?section:target};
  assert.equal(experiences.render(section,target,[]),0);assert.equal(section.hidden,true);assert.equal(target.innerHTML,'');
  const count=await experiences.init(doc,{MODO_RUMBO_CONFIG:{},fetch:async()=>{}},async()=>{throw new Error('private detail must not leak');});
  assert.equal(count,0);assert.equal(section.hidden,true);assert.equal(target.innerHTML,'');
});

test('la portada conserva Tipos de viajes y Salidas destacadas e incorpora reseñas antes de beneficios',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/id="experiences-home"[\s\S]*?Tipos de viajes/);
  assert.match(html,/id="featured-home"[\s\S]*?Salidas destacadas/);
  assert.match(html,/id="traveler-experiences-home"[\s\S]*?Experiencias de viajeros[\s\S]*?id="travelerPublicExperiences"/);
  assert.ok(html.indexOf('id="featured-home"')<html.indexOf('id="traveler-experiences-home"'));
  assert.ok(html.indexOf('id="traveler-experiences-home"')<html.indexOf('class="trust-strip"'));
  assert.match(html,/traveler-experiences-public\.css\?v=/);
  assert.match(html,/traveler-experiences-public\.js\?v=/);
});

test('la vista SQL limita el conjunto público a reseñas aprobadas con consentimiento',()=>{
  const sql=fs.readFileSync(path.join(root,'supabase/traveler-experiences-migration.sql'),'utf8');
  const publicView=sql.slice(sql.indexOf('create view public.public_traveler_experiences'),sql.indexOf('alter view public.public_traveler_experiences'));
  assert.match(publicView,/where e\.status='approved' and e\.publication_consent=true/i);
  const source=fs.readFileSync(path.join(root,'traveler-experiences-public.js'),'utf8');
  assert.match(source,/rest\/v1\/public_traveler_experiences/);
  assert.doesNotMatch(source,/rest\/v1\/traveler_experiences(?:\?|['"`])/);
});

test('el botón Actualizar no pasa el PointerEvent como texto de confirmación',()=>{
  const source=fs.readFileSync(path.join(root,'admin/traveler-experiences-admin.js'),'utf8');
  assert.match(source,/\$\('#travelerExperiencesRefresh'\)\.addEventListener\('click',\(\)=>load\(\)\)/);
  assert.doesNotMatch(source,/\$\('#travelerExperiencesRefresh'\)\.addEventListener\('click',load\)/);
});
