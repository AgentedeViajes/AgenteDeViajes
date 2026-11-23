const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const comparison = require('../travel-comparison.js');
const favorites = require('../travel-favorites.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'travel-search.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'travel-comparison.css'), 'utf8');
const favoritesCss = fs.readFileSync(path.join(root, 'travel-favorites.css'), 'utf8');
const sharing = require('../program-sharing.js');
const id1 = 'supabase:8eaa3606-5ec7-4c82-ae94-13d6e34fc233';
const id2 = 'supabase:9c2a9a07-0d89-4e8a-8137-3d8b09c25712';
const id3 = 'static:europa:roma';
const id4 = 'loaded:tailandia-clasica';

function storage(initial) {
  const values = new Map(initial == null ? [] : [[comparison.STORAGE_KEY, initial]]);
  return {
    getItem:key => values.has(key) ? values.get(key) : null,
    setItem:(key,value) => values.set(key,String(value)),
    removeItem:key => values.delete(key),
    read:key => values.get(key)
  };
}

test('agrega y quita programas conservando solo sus identificadores', () => {
  const local = storage();
  const store = comparison.create(local);
  assert.deepEqual(store.toggle(id1), {changed:true,active:true,persisted:true,reason:null});
  assert.deepEqual(JSON.parse(local.read(comparison.STORAGE_KEY)), [id1]);
  assert.deepEqual(store.toggle(id1), {changed:true,active:false,persisted:true,reason:null});
  assert.deepEqual(store.getIds(), []);
  assert.equal(local.read(favorites.STORAGE_KEY), undefined);
});

test('impide duplicados y limita la selección a tres programas', () => {
  const store = comparison.create(storage());
  store.toggle(id1);
  assert.deepEqual(store.toggle(id1), {changed:true,active:false,persisted:true,reason:null});
  store.toggle(id1); store.toggle(id2); store.toggle(id3);
  assert.deepEqual(store.toggle(id4), {changed:false,active:false,persisted:false,reason:'limit'});
  assert.equal(store.getIds().length, 3);
});

test('recupera la selección de localStorage y normaliza IDs repetidos e inválidos', () => {
  const local = storage(JSON.stringify([id1,id1,'operator:CROWN','supabase:not-a-uuid',id2,id3,id4]));
  const store = comparison.create(local);
  assert.deepEqual(store.getIds(), [id1,id2,id3]);
  assert.deepEqual(JSON.parse(local.read(comparison.STORAGE_KEY)), [id1,id2,id3]);
  assert.equal(comparison.isValidId('static:europa:roma'), true);
  assert.equal(comparison.isValidId('static:../../admin'), false);
});

test('limpia IDs históricos inválidos sin asociarlos con otro programa', () => {
  const local = storage(JSON.stringify(['lowcost:Europa Chic', 'lowcost:Eurojet']));
  const store = comparison.create(local);
  assert.deepEqual(store.getIds(), ['lowcost:Eurojet']);
  assert.deepEqual(JSON.parse(local.read(comparison.STORAGE_KEY)), ['lowcost:Eurojet']);
});

test('tolerа JSON inválido y conserva el estado funcional si localStorage falla', () => {
  const broken = storage('{no-json');
  assert.deepEqual(comparison.create(broken).getIds(), []);
  const denied = {getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){}};
  const store = comparison.create(denied);
  assert.equal(store.toggle(id1).active, true);
  assert.deepEqual(store.getIds(), [id1]);
});

test('oculta programas retirados, borradores y tarjetas personalizadas no comparables', () => {
  const store = comparison.create(storage(JSON.stringify([id1,id2,id3])));
  const records = [
    {id:id1,source:'supabase',status:'published'},
    {id:id2,source:'supabase',status:'draft'},
    {id:id3,source:'custom personalizado',published:true}
  ];
  assert.deepEqual(store.available(records).map(item => item.id), [id1]);
  store.reconcile(records);
  assert.deepEqual(store.getIds(), [id1]);
});

test('acepta programas publicados de categorías distintas aunque no tengan fechas, precio o itinerario', () => {
  const ids = [id1, id2, id3];
  const programs = [
    {id:id1,source:'supabase',status:'published',name:'Circuito grupal',types:['grupal','con-aereo'],comparison:{availabilityLabel:'Fechas de salida',availability:['14 de marzo de 2027'],priceText:'USD 6.560'}},
    {id:id2,source:'supabase',status:'published',name:'Paquete sin aéreo',types:['sin-aereo'],comparison:{availabilityLabel:'Período de viaje',availability:['01/05/2027 al 30/09/2027']}},
    {id:id3,source:'supabase',status:'published',name:'Viaje a medida',types:['personalizado'],comparison:{availabilityLabel:'Disponibilidad informada',availability:[]}}
  ];
  const local = storage();
  const compareStore = comparison.create(local);
  const favoriteStore = favorites.create({getItem:local.getItem,setItem:local.setItem,removeItem:local.removeItem});
  ids.forEach(id => { favoriteStore.toggle(id); compareStore.toggle(id); });
  const currentFavorites = favoriteStore.available(programs);
  assert.deepEqual(compareStore.available(currentFavorites).map(item => item.id), ids);
  assert.equal(compareStore.getIds().length, 3);
  assert.match(comparison.renderCard(programs[1]), /Período de viaje[\s\S]*01\/05\/2027 al 30\/09\/2027/);
  assert.match(comparison.renderCard(programs[2]), /Precio publicado[\s\S]*No informado/);
  assert.match(comparison.renderCard(programs[2]), /Disponibilidad informada[\s\S]*No informado/);
  assert.match(comparison.renderCard(programs[2]), /Servicios incluidos[\s\S]*No informado/);
});

test('compara pares grupales, sin aéreo y a medida, además de selecciones mixtas', () => {
  const lowCostIds = sharing.createCatalogIdentifiers('lowcost', ['Europa Chic', 'Eurojet']);
  const scenarios = [
    [{id:id1,types:['grupal','con-aereo']},{id:id2,types:['grupal','con-aereo']}],
    lowCostIds.map((id,index) => ({id,source:'lowcost',published:true,types:['low-cost','sin-aereo'],name:index ? 'Eurojet' : 'Europa Chic'})),
    [{id:id1,types:['personalizado']},{id:id2,types:['personalizado']}],
    [{id:id1,types:['grupal','con-aereo']},{id:lowCostIds[0],source:'lowcost',published:true,types:['sin-aereo']}],
    [{id:id1,types:['grupal','con-aereo']},{id:id2,types:['personalizado']}],
    [{id:id1,types:['grupal']},{id:lowCostIds[0],source:'lowcost',published:true,types:['sin-aereo']},{id:id3,types:['personalizado']}]
  ];

  scenarios.forEach((scenario,index) => {
    const local = storage();
    const compareStore = comparison.create(local);
    const favoriteStore = favorites.create({getItem:local.getItem,setItem:local.setItem,removeItem:local.removeItem});
    scenario.forEach(program => {
      favoriteStore.toggle(program.id);
      compareStore.toggle(program.id);
    });
    const records = scenario.map((program,index) => ({status:'published',...program,name:program.name || `Viaje de prueba ${index + 1}`}));
    assert.equal(compareStore.available(favoriteStore.available(records)).length, scenario.length, `escenario ${index + 1}`);
  });
});

test('permite quitar, volver a agregar y recuperar tras recargar una selección de cualquier categoría', () => {
  const local = storage();
  const programs = [
    {id:id1,source:'supabase',status:'published',types:['grupal','con-aereo']},
    {id:id2,source:'supabase',status:'published',types:['sin-aereo']},
    {id:id3,source:'supabase',status:'published',types:['personalizado']}
  ];
  let store = comparison.create(local);
  store.toggle(id1); store.toggle(id2); store.toggle(id3);
  store.toggle(id2);
  assert.deepEqual(store.available(programs).map(item => item.id), [id1,id3]);
  store.toggle(id2);
  store = comparison.create(local);
  assert.deepEqual(store.available(programs).map(item => item.id), [id1,id2,id3]);
});

test('muestra los campos reales disponibles y No informado para datos faltantes', () => {
  const htmlCard = comparison.renderCard({
    id:id1,name:'Ruta <Europa>',image:'https://example.test/ruta.webp',
    comparison:{destinations:['Roma','Madrid'],duration:'10 días / 8 noches',availabilityLabel:'Fechas de salida',availability:['12 de mayo de 2027'],priceText:'Desde EUR 1.800',priceBasis:'Por persona en doble',included:['Desayuno'],operatorCode:'ABC'}
  });
  assert.match(htmlCard,/Ruta &lt;Europa&gt;/);
  assert.match(htmlCard,/Roma/);
  assert.match(htmlCard,/EUR 1.800/);
  assert.match(htmlCard,/12 de mayo de 2027/);
  assert.match(htmlCard,/Código de operador/);
  assert.match(htmlCard,/Servicios no incluidos[\s\S]*?No informado/);
  const missing = comparison.renderCard({id:id3,name:'Programa histórico'});
  assert.match(missing,/Imagen no informada/);
  assert.equal((missing.match(/No informado/g) || []).length, 8);
});

test('mantiene moneda y base tarifaria por programa, sin convertir ni sumar precios', () => {
  const first = comparison.renderCard({id:id1,name:'Europa',comparison:{priceText:'USD 2.000',priceBasis:'Por persona en doble'}});
  const second = comparison.renderCard({id:id2,name:'Japón',comparison:{priceText:'JPY 300.000'}});
  assert.match(first,/USD 2\.000/);
  assert.match(first,/Por persona en doble/);
  assert.match(second,/JPY 300\.000/);
  assert.doesNotMatch(`${first}${second}`,/total|convertido/i);
});

test('Favoritos y Comparador usan claves y controles independientes', () => {
  const local = storage();
  const compareStore = comparison.create(local);
  const favoriteLocal = {getItem:key => local.getItem(key),setItem:(key,value)=>local.setItem(key,value),removeItem:key=>local.removeItem(key)};
  const favoriteStore = favorites.create(favoriteLocal);
  compareStore.toggle(id1);
  favoriteStore.toggle(id2);
  assert.deepEqual(compareStore.getIds(), [id1]);
  assert.deepEqual(favoriteStore.getIds(), [id2]);
  assert.notEqual(comparison.STORAGE_KEY, favorites.STORAGE_KEY);
});

test('Comparar solo se ofrece dentro de Mis favoritos y usa los datos actuales del catálogo', () => {
  assert.doesNotMatch(html,/nav-comparison-button/);
  assert.match(html,/id="compareFavoritesButton"[^>]*disabled>Comparar seleccionados \(0\)<\/button>/);
  assert.match(html,/id="favoriteComparisonStatus" role="status" aria-live="polite"/);
  assert.match(html,/id="travelComparisonSection" hidden/);
  assert.match(html,/id="travelComparisonGrid"/);
  assert.match(html,/data-close-comparison/);
  assert.match(html,/travel-comparison\.js/);
  assert.match(source,/records\.map\(record => cardHtml\(record, \{includeCompare:true\}\)/);
  assert.match(source,/options\.includeCompare && canCompare\(record\)/);
  assert.match(source,/comparisonModule\.buttonHtml\(record\.id, record\.name/);
  assert.match(source,/createCatalogIdentifiers\(source, entries\.map\(\(\[key\]\) => key\)\)/);
  assert.doesNotMatch(source,/detailCompareHtml/);
  assert.doesNotMatch(source,/card\.insertAdjacentHTML\('afterbegin', comparisonModule\.buttonHtml/);
  assert.match(source,/store\.available\(favorites\)/);
  assert.match(source,/localStorage/);
});

test('el control de cuarto programa anuncia el límite de manera accesible', () => {
  assert.match(html,/id="comparisonLimitToast" role="status" aria-live="polite" hidden/);
  assert.match(source,/Podés comparar hasta \$\{comparisonModule\.MAX_PROGRAMS\} programas/);
  assert.match(source,/closest\('\[data-toggle-favorite\]'\)/);
  assert.match(source,/closest\('\[data-toggle-compare\],\[data-remove-comparison\]'\)/);
});

test('el diseño es responsive, táctil, accesible y mantiene el foco en los controles', () => {
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media \(min-width:681px\) and \(max-width:1050px\)/);
  assert.match(css,/scroll-snap-type:x mandatory/);
  assert.match(css,/overflow-x:auto/);
  assert.match(css,/\.trip-compare-button:focus-visible/);
  assert.match(css,/\.comparison-remove:focus-visible/);
});

test('Favoritos y Comparador reservan espacio bajo el encabezado fijo al navegar', () => {
  assert.match(favoritesCss, /\.travel-favorites-section \{ scroll-margin-top:86px; \}/);
  assert.match(css, /\.travel-comparison-section \{ font-family:Inter,sans-serif; scroll-margin-top:86px; \}/);
});

test('Inicio y otros cambios de sección ocultan el comparador sin vaciar su selección', () => {
  assert.match(html,/function showSection\(id\)\s*\{\s*hideFavoriteTripsView\(\);\s*window\.hideTravelComparisonView\?\.\(\);/);
  assert.match(source,/window\.showTravelComparison = function/);
  assert.match(source,/window\.hideTravelComparisonView = function/);
  assert.match(source,/comparisonStore\(\)\?\.reconcile\(favoritePrograms\(\)\)/);
  assert.match(source,/function clearAllFiltersFavoritesAndComparison[\s\S]*?favoriteStore\(\)\?\.clear\?\.\(\)[\s\S]*?comparisonStore\(\)\?\.clear\?\.\(\)/);
});
