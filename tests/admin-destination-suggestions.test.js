'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const suggestions = require('../admin/destination-suggestions.js');

const dictionaryPrograms = [
  { destinations: ['Buenos Aires', 'Madrid', 'París', 'Roma', 'Lisboa', 'El Cairo', 'Beijing', 'Seúl', 'Dubái', 'Johannesburgo', 'Río de Janeiro', 'Costa Amalfitana'], countries: ['Argentina', 'España', 'Francia', 'Italia', 'Portugal', 'Egipto', 'China', 'Corea del Sur', 'Emiratos Árabes Unidos'] },
  { destinations: ['Marrakech', 'Península de Sorrento', 'Puglia'], countries: ['Marruecos', 'Italia'] },
  { destinations: ['Buenos Aires', 'PARIS'], countries: ['Argentina'] }
];

test('usa destinos confirmados como diccionario y normaliza acentos, mayúsculas y repetidos', () => {
  const options = suggestions.dictionaryFrom(dictionaryPrograms);
  assert.equal(options.get('paris'), 'París');
  assert.equal(options.get('buenos aires'), 'Buenos Aires');
  assert.equal(options.has('rio de janeiro'), true);
  assert.equal(options.has('madrid paris'), false);
  assert.equal(options.size, 15);
});

test('detecta destinos completos en títulos de circuitos europeos y asiáticos sin falsos parciales', () => {
  const result = suggestions.suggest({
    destinations: [],
    itinerary: [
      { position: 1, title: 'Día 1 — MADRID' },
      { position: 2, title: 'Día 2 — París — Visita panorámica' },
      { position: 3, title: 'Día 3 — ROMA' },
      { position: 4, title: 'Día 4 — PARIS' },
      { position: 5, title: 'Día 6 — BEIJING' },
      { position: 6, title: 'Día 7 — Seúl' },
      { position: 7, title: 'Día 8 — Ciudad de Madrid' }
    ]
  }, dictionaryPrograms);
  assert.deepEqual(result.filter(item => item.kind === 'known').map(item => item.name).sort(), ['Beijing', 'Madrid', 'París', 'Roma', 'Seúl'].sort());
  const paris = result.find(item => item.name === 'París');
  assert.equal(paris.sources.length, 2);
  assert.equal(paris.selected, false);
  assert.equal(result.some(item => item.name === 'Ciudad de Madrid'), false);
});

test('reconoce destinos compuestos y regiones con límites de palabra', () => {
  const result = suggestions.suggest({
    itinerary: [
      { title: 'Día 1: Río de Janeiro' },
      { title: 'Día 2: Costa Amalfitana' },
      { title: 'Día 3: Puglia' },
      { title: 'Día 4: Sorrento' }
    ]
  }, dictionaryPrograms);
  assert.deepEqual(result.filter(item => item.kind === 'known').map(item => item.name).sort(), ['Costa Amalfitana', 'Puglia', 'Río de Janeiro'].sort());
  assert.equal(result.some(item => item.name === 'Río' || item.name === 'Amalfi'), false);
});

test('señala guiones pegados como posible ruta sin dividir ni confirmar sus partes', () => {
  const result = suggestions.suggest({ itinerary: [{ title: 'Día 4: MADRID-SALAMANCA - VIGO (630 km)' }] }, [
    ...dictionaryPrograms,
    { destinations: ['Salamanca', 'Vigo'], countries: ['España'] }
  ]);
  for (const name of ['Madrid', 'Salamanca', 'Vigo']) {
    const item = result.find(candidate => candidate.name === name);
    assert.ok(item);
    assert.ok(item.reviewWarnings.some(warning => /ruta o varios tramos/i.test(warning)));
  }
});

test('marca tramos y contextos de escala, traslado y excursión opcional para revisión', () => {
  const result = suggestions.suggest({
    itinerary: [
      { title: 'Día 1 — BUENOS AIRES / MADRID / PARÍS' },
      { title: 'Día 2 — Vuelo a Roma vía Madrid' },
      { title: 'Día 3 — Excursión opcional a Toledo' },
      { title: 'Día 4 — Traslado a Marrakech' }
    ]
  }, dictionaryPrograms);
  const madrid = result.find(item => item.name === 'Madrid');
  const rome = result.find(item => item.name === 'Roma');
  const toledo = result.find(item => item.name === 'Toledo');
  const marrakech = result.find(item => item.name === 'Marrakech');
  assert.ok(madrid.reviewWarnings.some(text => /escala o conexi[oó]n/i.test(text)));
  assert.ok(madrid.reviewWarnings.some(text => /ruta o varios tramos/i.test(text)));
  assert.ok(rome.reviewWarnings.some(text => /escala o conexi[oó]n/i.test(text)));
  assert.ok(toledo.reviewWarnings.some(text => /excursi[oó]n opcional/i.test(text)));
  assert.ok(marrakech.reviewWarnings.some(text => /traslado/i.test(text)));
  assert.equal(result.some(item => item.name === 'Roma vía Madrid'), false);
});

test('propone lugares desconocidos solo como candidatos no confirmados y con evidencia del título', () => {
  const result = suggestions.suggest({
    itinerary: [
      { position: 1, title: 'BUENOS AIRES / ADDIS ABEBA / BEIJING' },
      { position: 2, title: 'Día 2 — Safari en Maasai Mara' },
      { position: 3, title: 'Día 3 — A BORDO' },
      { position: 4, title: 'Día libre para actividades personales' }
    ]
  }, dictionaryPrograms);
  const unknown = result.filter(item => item.kind === 'unknown');
  const addis = unknown.find(item => item.name === 'ADDIS ABEBA');
  const maasai = unknown.find(item => item.name === 'Maasai Mara');
  assert.ok(addis);
  assert.ok(maasai);
  assert.equal(addis.confidence, 'low');
  assert.equal(addis.selected, false);
  assert.equal(addis.alreadyLoaded, false);
  assert.ok(addis.reviewWarnings.some(text => /ruta o varios tramos/i.test(text)));
  assert.ok(maasai.sources.some(source => source.title === 'Día 2 — Safari en Maasai Mara'));
  assert.equal(unknown.some(item => /a bordo|día libre|actividades personales/i.test(item.name)), false);
});

test('no presenta orígenes ni medios de transporte como lugares desconocidos', () => {
  const result = suggestions.suggest({
    itinerary: [
      { title: 'AEROPARQUE / JOHANNESBURGO / JOHANNESBURGO' },
      { title: 'EZEIZA / A BORDO / EL CAIRO' },
      { title: 'Vuelo vía Madrid' },
      { title: 'Ferry — Estambul' }
    ]
  }, dictionaryPrograms);
  const unknownNames = result.filter(item => item.kind === 'unknown').map(item => item.name.toLowerCase());
  assert.equal(unknownNames.some(name => /aerparque|aeroparque|ezeiza|buenos aires|bsas|ferry|a bordo|vuelo|tren|bus/.test(name)), false);
  assert.ok(result.some(item => item.name === 'Johannesburgo'));
  assert.ok(result.some(item => item.name === 'El Cairo'));
  assert.ok(result.some(item => item.name === 'Madrid'));
  assert.ok(result.some(item => item.name === 'Estambul'));
});

test('marca destinos ya cargados y agrega solo IDs seleccionados sin borrar ni duplicar destinos existentes', () => {
  const result = suggestions.suggest({
    destinations: ['París', 'Buenos Aires'],
    itinerary: [{ title: 'Día 1 — Buenos Aires / Madrid / París' }]
  }, dictionaryPrograms);
  assert.equal(result.find(item => item.name === 'París').alreadyLoaded, true);
  assert.equal(result.find(item => item.name === 'Madrid').alreadyLoaded, false);
  assert.deepEqual(suggestions.mergeSelected(['París', 'Buenos Aires'], result, new Set(['known:madrid'])), ['París', 'Buenos Aires', 'Madrid']);
  assert.deepEqual(suggestions.mergeSelected(['París'], result, new Set()), ['París']);
});

test('programas sin itinerario devuelven cero sugerencias y no generan nombres', () => {
  assert.deepEqual(suggestions.suggest({ destinations: ['Roma'], itinerary: [] }, dictionaryPrograms), []);
  assert.deepEqual(suggestions.suggest({ destinations: [], itinerary: null }, dictionaryPrograms), []);
});

test('marca como ya cargado un candidato que aún no forma parte del diccionario general', () => {
  const result = suggestions.suggest({
    destinations: ['Valle del Rift'],
    itinerary: [{ title: 'Día 1 — Safari en Valle del Rift' }]
  }, dictionaryPrograms);
  const candidate = result.find(item => item.name === 'Valle del Rift');
  assert.equal(candidate.kind, 'unknown');
  assert.equal(candidate.alreadyLoaded, true);
  assert.deepEqual(suggestions.mergeSelected(['Valle del Rift'], result, new Set([candidate.id])), ['Valle del Rift']);
});

test('usa ejemplos literales tomados de títulos de itinerarios publicados de varias regiones', () => {
  const actualTitles = [
    'BUENOS AIRES / ADDIS ABEBA / BEIJING',
    'Viernes, : Buenos Aires',
    'Sábado, : Dubái - Seúl',
    'Domingo, : Seúl',
    'BSAS / LISBOA / LISBOA',
    'BUENOS AIRES - MADRID',
    'MADRID - ROMA',
    'EZEIZA / A BORDO / EL CAIRO',
    'FRANKFURT - ESTAMBUL'
  ];
  const expandedDictionary = [...dictionaryPrograms, { destinations: ['Estambul'], countries: ['Turquía'] }];
  const result = suggestions.suggest({ itinerary: actualTitles.map((title, index) => ({ position: index + 1, title })) }, expandedDictionary);
  const known = new Set(result.filter(item => item.kind === 'known').map(item => item.name));
  assert.ok(known.has('Buenos Aires'));
  assert.ok(known.has('Beijing'));
  assert.ok(known.has('Dubái'));
  assert.ok(known.has('Seúl'));
  assert.ok(known.has('Lisboa'));
  assert.ok(known.has('Madrid'));
  assert.ok(known.has('Roma'));
  assert.ok(known.has('El Cairo'));
  assert.ok(known.has('Estambul'));
  assert.ok(result.every(item => item.selected === false));
});

test('clasifica destinos e itinerarios sin asumir que un campo opcional está cargado', () => {
  const withBoth = { destinations: 'París, Roma', itinerary: [{ title: 'París' }] };
  const withoutDestinationsWithItinerary = { destinations: '  ', itinerary: [{ title: 'Día 1 — Madrid' }] };
  const withoutEither = { destinations: [], itinerary: [] };
  assert.equal(suggestions.hasDestinations(withBoth), true);
  assert.equal(suggestions.hasItinerary(withBoth), true);
  assert.equal(suggestions.hasDestinations(withoutDestinationsWithItinerary), false);
  assert.equal(suggestions.hasItinerary(withoutDestinationsWithItinerary), true);
  assert.equal(suggestions.hasItinerary(withoutEither), false);
});

test('los filtros administrativos se combinan con los otros criterios y cuentan el catálogo recibido', () => {
  const programs = [
    { id: 'a', title: 'Europa', destinations: ['París'], itinerary: [{ title: 'Día 1 — París' }] },
    { id: 'b', title: 'Asia', destinations: [], itinerary: [{ title: 'Día 1 — Tokyo' }] },
    { id: 'c', title: 'Brasil', destinations: [], itinerary: [] },
    { id: 'd', title: 'Roma', destinations: ['Roma'], itinerary: [] }
  ];
  assert.deepEqual(suggestions.filterPrograms(programs, 'with-destinations').map(item => item.id), ['a', 'd']);
  assert.deepEqual(suggestions.filterPrograms(programs, 'without-destinations').map(item => item.id), ['b', 'c']);
  assert.deepEqual(suggestions.filterPrograms(programs, 'without-destinations-with-itinerary').map(item => item.id), ['b']);
  assert.deepEqual(suggestions.filterPrograms(programs, 'without-destinations-without-itinerary').map(item => item.id), ['c']);
  assert.deepEqual(suggestions.destinationCounts(programs), {
    all: 4,
    'with-destinations': 2,
    'without-destinations': 2,
    'without-destinations-with-itinerary': 1,
    'without-destinations-without-itinerary': 1
  });
  assert.deepEqual(suggestions.filterPrograms(programs.filter(item => item.title === 'Europa'), 'with-destinations').map(item => item.id), ['a']);
});
