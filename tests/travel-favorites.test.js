const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const favorites = require('../travel-favorites.js');
const comparison = require('../travel-comparison.js');
const sharing = require('../program-sharing.js');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'travel-search.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'travel-favorites.css'), 'utf8');
const homeCss = fs.readFileSync(path.join(root, 'premium-home.css'), 'utf8');
const uuid = 'b6f80d6d-a0cc-4de4-a88d-92ac44102dd6';
const publishedId = `supabase:${uuid}`;

function memoryStorage(initial) {
  const data = new Map(initial ? [[favorites.STORAGE_KEY, initial]] : []);
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
    read: key => data.get(key)
  };
}

test('agrega y quita favoritos persistiendo solo identificadores estables', () => {
  const storage = memoryStorage();
  const store = favorites.create(storage);
  assert.deepEqual(store.toggle(publishedId), {changed:true, active:true, persisted:true});
  assert.deepEqual(JSON.parse(storage.read(favorites.STORAGE_KEY)), [publishedId]);
  assert.deepEqual(store.toggle(publishedId), {changed:true, active:false, persisted:true});
  assert.deepEqual(store.getIds(), []);
});

test('recupera favoritos al crear una nueva instancia y elimina IDs duplicados o inválidos', () => {
  const storage = memoryStorage(JSON.stringify([publishedId, publishedId, 'operator:CROWN', null, 'supabase:not-a-uuid']));
  const store = favorites.create(storage);
  assert.deepEqual(store.getIds(), [publishedId]);
  assert.deepEqual(JSON.parse(storage.read(favorites.STORAGE_KEY)), [publishedId]);
  assert.equal(store.has('operator:CROWN'), false);
  assert.deepEqual(favorites.normalizeIds(['static:europa:roma', 'static:europa:roma', 'static:bad']), ['static:europa:roma']);
});

test('descarta sin confusión un ID histórico inválido con espacios y conserva los IDs válidos', () => {
  const storage = memoryStorage(JSON.stringify(['lowcost:Europa Chic', 'lowcost:Eurojet']));
  const store = favorites.create(storage);
  assert.deepEqual(store.getIds(), ['lowcost:Eurojet']);
  assert.deepEqual(JSON.parse(storage.read(favorites.STORAGE_KEY)), ['lowcost:Eurojet']);
});

test('tolera datos JSON corruptos e identificadores con formato inseguro', () => {
  const storage = memoryStorage('{esto no es json');
  const store = favorites.create(storage);
  assert.deepEqual(store.getIds(), []);
  assert.equal(storage.read(favorites.STORAGE_KEY), undefined);
  assert.equal(favorites.isValidId('supabase:../../admin'), false);
  assert.equal(favorites.isValidId(`supabase:${uuid}`), true);
  assert.equal(favorites.isValidId('static:europa:roma'), true);
  assert.equal(favorites.isValidId('custom:europa'), false);
});

test('mantiene el estado de la sesión si el navegador bloquea localStorage', () => {
  const store = favorites.create({getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')},removeItem(){throw new Error('blocked')}});
  assert.equal(store.toggle(publishedId).persisted, false);
  assert.equal(store.has(publishedId), true);
  assert.deepEqual(store.getIds(), [publishedId]);
});

test('clear quita la clave de Favoritos y vacía la instancia actual', () => {
  const local = memoryStorage();
  const store = favorites.create(local);
  store.toggle(publishedId);
  assert.equal(store.clear(), true);
  assert.equal(local.read(favorites.STORAGE_KEY), undefined);
  assert.deepEqual(store.getIds(), []);
});

test('los programas históricos sin aéreo con espacios en el nombre reciben IDs válidos para Favoritos y Comparador', () => {
  const [europaChic, eurojet] = sharing.createCatalogIdentifiers('lowcost', ['Europa Chic', 'Eurojet']);
  assert.equal(favorites.isValidId('lowcost:Europa Chic'), false);
  assert.equal(favorites.isValidId(europaChic), true);
  assert.equal(comparison.isValidId(europaChic), true);
  assert.equal(favorites.isValidId(eurojet), true);
  assert.equal(comparison.isValidId(eurojet), true);
});

test('lista solo favoritos que todavía están publicados y soporta programas históricos', () => {
  const store = favorites.create(memoryStorage(JSON.stringify([
    publishedId, 'supabase:11111111-1111-4111-8111-111111111111', 'static:europa:roma', 'loaded:circuito-uno'
  ])));
  const catalog = [
    {id:publishedId, source:'supabase', status:'published', title:'Viaje publicado'},
    {id:'supabase:11111111-1111-4111-8111-111111111111', source:'supabase', status:'draft', title:'Borrador'},
    {id:'static:europa:roma', source:'static europa', published:true, title:'Programa histórico'},
    {id:'loaded:circuito-uno', source:'loaded', published:true, title:'Circuito histórico'},
    {id:'loaded:retirado', source:'loaded', published:false, title:'Retirado'},
    {id:'custom:viaje-a-medida', source:'custom personalizado', published:true, title:'Destino personalizado'}
  ];
  assert.deepEqual(store.available(catalog).map(program => program.title), ['Viaje publicado', 'Programa histórico', 'Circuito histórico']);
});

test('los controles de tarjetas son botones accesibles y no convierten el operador en ID', () => {
  const button = favorites.buttonHtml(publishedId, true, 'India con Fiesta Holi');
  assert.match(button, /type="button"/);
  assert.match(button, /aria-pressed="true"/);
  assert.match(button, /Quitar India con Fiesta Holi de favoritos/);
  assert.match(button, /data-toggle-favorite="supabase:/);
  assert.match(button, /data-favorite-name="India con Fiesta Holi"/);
  assert.equal(favorites.buttonHtml('operator:CROWN', false, 'Programa'), '');
});

test('la portada integra favoritos en búsqueda, destacados y una lista accesible', () => {
  assert.match(source, /favoritesModule\.buttonHtml\(record\.id/);
  assert.match(source, /function cardHtml\(record, options = \{\}\)/);
  assert.match(source, /card\.insertAdjacentHTML\('afterbegin', favoritesModule\.buttonHtml/);
  assert.match(source, /detailFavoriteHtml/);
  assert.match(source, /role="group" aria-label="Programa/);
  assert.match(source, /event\.target\.closest\('\[data-toggle-favorite\]'\)/);
  assert.match(source, /if \(event\.target\.closest && event\.target\.closest\('\[data-toggle-favorite\]'\)\) return/);
  assert.match(html, /id="favoriteTripsSection" hidden/);
  assert.match(html, /onclick="showFavoriteTrips\(\)"/);
  assert.match(html, /id="favoriteTripsGrid"/);
  assert.match(html, /travel-favorites\.js/);
});

test('la interfaz se adapta a pantalla táctil, usa controles visibles y conserva foco accesible', () => {
  assert.match(css, /\.trip-favorite-button:focus-visible/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /min-height:40px/);
  assert.match(html, /aria-label="Ver mis favoritos"/);
});

test('el título Mis favoritos mantiene la tipografía y usa un tamaño de sección compacto', () => {
  assert.match(css, /\.travel-favorites-section \.premium-heading h2 \{[^}]*font-family:Inter,sans-serif;[^}]*font-size:1\.75rem;[^}]*font-weight:900;[^}]*font-style:normal;[^}]*letter-spacing:-\.04em/);
  assert.match(css, /@media\(max-width:680px\)[\s\S]*?\.travel-favorites-section \.premium-heading h2 \{ font-size:1\.45rem; \}/);
});

test('las tarjetas de Favoritos reutilizan la presentación de las tarjetas de resultados', () => {
  assert.match(homeCss, /#travelResults \.trip-card,\s*#favoriteTripsSection \.trip-card\s*\{[^}]*border:1px solid #dbe3ee;[^}]*border-radius:13px;[^}]*box-shadow:0 5px 15px/);
  assert.match(homeCss, /#travelResults \.trip-card h3,\s*#favoriteTripsSection \.trip-card h3\s*\{[^}]*color:#06275f !important;[^}]*font-family:Inter,sans-serif !important;[^}]*font-size:1\.02rem !important/);
  assert.match(homeCss, /#travelResults \.trip-meta,\s*#favoriteTripsSection \.trip-meta\s*\{[^}]*color:#102652 !important;[^}]*font-family:Inter,sans-serif !important/);
  assert.match(homeCss, /#travelResults \.trip-price,\s*#favoriteTripsSection \.trip-price\s*\{[^}]*color:#ff6508 !important;[^}]*font-family:Inter,sans-serif !important/);
  assert.match(homeCss, /#travelResults \.trip-card-media,\s*#favoriteTripsSection \.trip-card-media\s*\{ height:132px !important; \}/);
  assert.match(homeCss, /@media \(max-width:680px\)[\s\S]*?#favoriteTripsSection \.trip-card-media \{ height:170px !important; \}/);
  assert.match(homeCss, /#favoriteTripsSection \.trip-card::after/);
  assert.match(css, /\.trip-favorite-button\.is-favorite/);
});

test('la navegación general y los resultados cierran Favoritos sin borrar su persistencia', () => {
  assert.match(html, /function hideFavoriteTripsView\(\) \{[\s\S]*?favorites\.hidden = true/);
  assert.match(html, /function showSection\(id\) \{\s*hideFavoriteTripsView\(\);[\s\S]*?window\.scrollTo\(\{ top: 0/);
  assert.match(source, /function renderResults\(records, filters, emptyMessage\) \{\s*window\.hideFavoriteTripsView\?\.\(\);/);
  assert.match(source, /window\.goHomeAndReset = function \(\) \{\s*showSection\('home'\)/);
  assert.match(html, /data-close-favorites>Volver a explorar/);
  assert.match(source, /favoriteStore\(\)\?\.toggle\(favoriteButton\.dataset\.toggleFavorite\)/);
  assert.doesNotMatch(html.match(/function hideFavoriteTripsView\(\) \{[^}]*\}/)?.[0] || '', /localStorage|removeItem|STORAGE_KEY/);
});
