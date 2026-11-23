const test = require('node:test');
const assert = require('node:assert/strict');
const sharing = require('../program-sharing.js');

test('genera identificadores locales legibles, namespaced y únicos sin usar el código del operador', () => {
  const first = sharing.createLegacyIdentifier('europa', 'Roma y Florencia');
  const second = sharing.createLegacyIdentifier('europa', 'Roma y Florencia', 2);
  const other = sharing.createLegacyIdentifier('caribe', 'Roma y Florencia');
  assert.equal(first, 'static:europa:roma-y-florencia');
  assert.notEqual(first, second);
  assert.notEqual(first, other);

  const programs = [
    {id:'supabase:program-1',operator_code:'MISMO-CODIGO'},
    {id:'supabase:program-2',operator_code:'MISMO-CODIGO'}
  ];
  assert.notEqual(programs[0].id, programs[1].id);
  assert.notEqual(
    sharing.buildProgramUrl(programs[0].id,'https://modorumbo.vercel.app/'),
    sharing.buildProgramUrl(programs[1].id,'https://modorumbo.vercel.app/')
  );
});

test('normaliza nombres históricos para IDs guardables sin cambiar los IDs ya válidos', () => {
  const ids = sharing.createCatalogIdentifiers('lowcost', ['Europa Chic', 'Eurojet', 'Río de Janeiro', 'rio-de-janeiro']);
  assert.deepEqual(ids, ['lowcost:europa-chic', 'lowcost:Eurojet', 'lowcost:rio-de-janeiro-2', 'lowcost:rio-de-janeiro']);
  assert.equal(sharing.createCatalogIdentifiers('loaded', ['tailandia-clasica'])[0], 'loaded:tailandia-clasica');
  assert.deepEqual(sharing.createCatalogIdentifiers('custom', ['Viaje a medida']), []);
});

test('construye enlaces directos y conserva los parámetros presentes', () => {
  const result = new URL(sharing.buildProgramUrl('supabase:abc-123','https://modorumbo.vercel.app/?utm_source=whatsapp#inicio'));
  assert.equal(result.searchParams.get('programa'),'supabase:abc-123');
  assert.equal(result.searchParams.get('utm_source'),'whatsapp');
  assert.equal(result.hash,'');
});

test('resuelve el registro exacto publicado, rechaza borradores y ambigüedades', () => {
  const programs = [
    {id:'supabase:a',status:'published',title:'A'},
    {id:'supabase:b',status:'draft',title:'B'},
    {id:'supabase:c',status:'published',title:'C'},
    {id:'supabase:c',status:'published',title:'Duplicado'}
  ];
  assert.equal(sharing.findPublishedProgram(programs,'supabase:a').title,'A');
  assert.equal(sharing.findPublishedProgram(programs,'supabase:b'),null);
  assert.equal(sharing.findPublishedProgram(programs,'supabase:missing'),null);
  assert.equal(sharing.findPublishedProgram(programs,'supabase:c'),null);
});

test('la resolución espera la carga asincrónica del catálogo', async () => {
  let loaded = false;
  const outcome = await sharing.resolveProgramLink('supabase:after-load',async () => {
    await new Promise(resolve => setTimeout(resolve,5));
    loaded = true;
    return [{id:'supabase:after-load',status:'published',title:'Programa remoto'}];
  });
  assert.equal(loaded,true);
  assert.equal(outcome.status,'found');
  assert.equal(outcome.program.title,'Programa remoto');
});

test('abre una sola vez la ficha exacta cuando llega un enlace directo', async () => {
  let opened = null;
  const outcome = await sharing.openProgramLink('supabase:direct',async () => {
    await Promise.resolve();
    return [
      {id:'supabase:other',status:'published',title:'Otro programa'},
      {id:'supabase:direct',status:'published',title:'Programa solicitado'}
    ];
  },program => { opened = program; });
  assert.equal(outcome.opened,true);
  assert.equal(opened.title,'Programa solicitado');
});

test('no abre fichas inexistentes ni programas que dejaron de estar publicados', async () => {
  let openCount = 0;
  const open = program => { openCount++; };
  const draft = await sharing.openProgramLink('supabase:draft',async () => [{id:'supabase:draft',status:'draft'}],open);
  const missing = await sharing.openProgramLink('supabase:missing',async () => [],open);
  assert.equal(draft.opened,false);
  assert.equal(missing.opened,false);
  assert.equal(openCount,0);
});

test('distingue programa no disponible de catálogo inaccesible', async () => {
  assert.equal((await sharing.resolveProgramLink('x',async () => [])).status,'not-found');
  assert.equal((await sharing.resolveProgramLink('x',async () => { throw new Error('offline'); })).status,'unavailable');
});

test('usa compartir nativo cuando está disponible', async () => {
  let payload;
  const result = await sharing.shareOrCopy({
    url:'https://modorumbo.vercel.app/?programa=supabase%3Aa',title:'Viaje',text:'Compartí',
    navigatorRef:{share:async value => { payload = value; }}
  });
  assert.equal(result,'share-open');
  assert.equal(payload.title,'Viaje');
  assert.match(payload.url,/programa=/);
});

test('copia el enlace cuando no existe compartir nativo', async () => {
  let copied = '';
  const result = await sharing.shareOrCopy({url:'https://example.test/?programa=1',navigatorRef:{clipboard:{writeText:async value => { copied = value; }}}});
  assert.equal(result,'copied');
  assert.equal(copied,'https://example.test/?programa=1');
});

test('permite completar la copia manual si el portapapeles no está disponible', async () => {
  const result = await sharing.shareOrCopy({url:'https://example.test/?programa=1',navigatorRef:{}});
  assert.equal(result,'manual');
});
