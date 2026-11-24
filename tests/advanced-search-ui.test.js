const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const searchUi = require('../advanced-search-ui.js');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('las opciones de países se obtienen del catálogo y normalizan duplicados', () => {
  const result = searchUi.collectOptions([
    {countries:['Francia','España']},
    {countries:['FRANCIA','Portugal']}
  ], 'countries');
  assert.deepEqual(result.options, ['España','Francia','Portugal']);
  assert.deepEqual(result.excludedRoutes, []);
});

test('las opciones de lugares conservan valores confirmados y omiten rutas ambiguas completas', () => {
  const result = searchUi.collectOptions([
    {destinations:['París','Londres','Madrid / Toledo','Beijng – Xian – Chengdu']},
    {destinations:['PARIS','Buenos Aires - Madrid']}
  ], 'destinations');
  assert.deepEqual(new Set(result.options.map(searchUi.normalize)), new Set(['paris','londres']));
  assert.equal(result.excludedRoutes.length, 3);
});

test('no divide destinos históricos en texto separados por comas o punto y coma', () => {
  const result = searchUi.collectOptions([
    {destinations:'París, Londres, Ámsterdam'},
    {destinations:'Roma; Florencia'},
    {destinations:['Buenos Aires','Madrid']}
  ], 'destinations');
  assert.deepEqual(result.options, ['Buenos Aires','Madrid']);
  assert.equal(result.excludedRoutes.length, 2);
});

test('el autocompletado busca por prefijo sin distinguir acentos ni mayúsculas', () => {
  assert.deepEqual(searchUi.filterSuggestions(['Francia','Francia continental','Brasil','España'], 'fra'), ['Francia','Francia continental']);
  assert.deepEqual(searchUi.filterSuggestions(['París','Madrid'], 'PAR'), ['París']);
});

test('las sugerencias excluyen valores ya seleccionados sin alterar las otras opciones', () => {
  assert.deepEqual(searchUi.filterSuggestions(['Francia','España','Francia continental'], 'fra', ['FRANCIA']), ['Francia continental']);
});

test('la selección permite varios valores, evita duplicados y admite quitar uno', () => {
  const selection = searchUi.createSelection(['Francia','Inglaterra','España']);
  assert.equal(selection.add('Francia').ok, true);
  assert.equal(selection.add('FRANCIA').reason, 'duplicate');
  assert.equal(selection.add('País no publicado').reason, 'invalid');
  assert.equal(selection.add('Inglaterra').ok, true);
  assert.deepEqual(selection.values(), ['Francia','Inglaterra']);
  assert.equal(selection.remove('FRANCIA'), true);
  assert.deepEqual(selection.values(), ['Inglaterra']);
});

test('al actualizar el catálogo solo conserva selecciones que continúan disponibles', () => {
  const selection = searchUi.createSelection(['Francia','Italia']);
  selection.add('Francia');
  selection.add('Italia');
  selection.replaceOptions(['Francia','España']);
  assert.deepEqual(selection.values(), ['Francia']);
});

test('el buscador avanzado queda activo y el formulario anterior deja de ofrecerse visualmente', () => {
  assert.ok(indexHtml.includes('id="advancedSearchPreview"'));
  assert.ok(!/Vista previa: los campos de nombre/i.test(indexHtml));
  assert.ok(!indexHtml.includes('Usar el buscador actual'));
  assert.ok(indexHtml.includes('id="advancedSearchForm"'));
  assert.match(indexHtml, /class="travel-search-submit" type="submit"/);
  assert.ok(indexHtml.includes('id="travelSearchForm" role="search"'));
  assert.match(indexHtml, /id="travelSearchForm" role="search" hidden/);
  assert.ok(indexHtml.includes('id="travelDestination"'));
});

test('mes y tipo mantienen sus identificadores existentes y no se duplican', () => {
  assert.equal((indexHtml.match(/id="travelMonth"/g) || []).length, 1);
  assert.equal((indexHtml.match(/id="travelType"/g) || []).length, 1);
  assert.match(indexHtml, /id="travelMonth"/);
  assert.match(indexHtml, /id="travelType"/);
});

test('los selectores exponen semántica combobox, listbox y controles de quitar', () => {
  assert.ok(indexHtml.includes('id="advancedCountriesInput" type="text" role="combobox"'));
  assert.ok(indexHtml.includes('id="advancedCountriesOptions" role="listbox"'));
  assert.ok(indexHtml.includes('id="advancedDestinationsInput" type="text" role="combobox"'));
  assert.ok(indexHtml.includes('id="advancedDestinationsOptions" role="listbox"'));
  assert.ok(indexHtml.includes('aria-live="polite"'));
  assert.ok(indexHtml.includes('advanced-search-ui.js'));
  assert.ok(indexHtml.includes('advanced-search-ui.css'));
});

test('las listas de sugerencias quedan fuera del área desplazable de etiquetas para no recortarse', () => {
  assert.match(indexHtml, /data-search-selector="countries"[\s\S]*?<div class="advanced-token-control">[\s\S]*?<\/div>\s*<ul class="advanced-suggestions" id="advancedCountriesOptions"/);
  assert.match(indexHtml, /data-search-selector="destinations"[\s\S]*?<div class="advanced-token-control">[\s\S]*?<\/div>\s*<ul class="advanced-suggestions" id="advancedDestinationsOptions"/);
});

test('la interfaz no muestra una nota técnica sobre rutas ni reserva espacio para ella', () => {
  assert.ok(!indexHtml.includes('advancedDestinationsReview'));
  assert.ok(!indexHtml.includes('advanced-data-note'));
  assert.match(indexHtml, /aria-describedby="advancedDestinationsStatus"/);
  const result = searchUi.collectOptions([
    {destinations:['Madrid','Londres - York - Edimburgo']}
  ], 'destinations');
  assert.deepEqual(result.options, ['Madrid']);
  assert.deepEqual(result.excludedRoutes, ['londres york edimburgo']);
});

test('los filtros existentes tienen borde completo y conservan dimensiones alineadas en el buscador avanzado', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'advanced-search-ui.css'), 'utf8');
  assert.match(css, /#section-home \.advanced-search-grid \.advanced-existing-filter[\s\S]*?border: 1px solid #d9e1ec !important/);
  assert.match(css, /height: 42px !important/);
  assert.match(css, /#section-home \.advanced-search-grid > \.travel-search-submit[\s\S]*?height: 42px !important/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.advanced-search-grid > \.travel-search-submit \{ grid-column:1\/-1/);
});

const program = (overrides = {}) => ({
  id:'p1', name:'Conociendo Europa', published:true,
  countries:['Italia','Francia'], destinations:['Roma','París','Madrid'],
  months:['marzo','mayo'], types:['grupal','con-aereo'],
  searchDepartures:[{date:'2027-03-15',month:'marzo',price:'USD 3.890'},{date:'2027-05-10',month:'mayo',price:'USD 4.290'}],
  ...overrides
});

test('busca solo por nombre parcial, sin distinguir acentos ni mayúsculas', () => {
  assert.equal(searchUi.filterPrograms([program()], {name:'EUROPA'}).length, 1);
  assert.equal(searchUi.filterPrograms([program()], {name:'Europa cultural'}).length, 0);
  assert.equal(searchUi.filterPrograms([program({name:'París y Roma', summary:'Europa'})], {name:'Europa'}).length, 0);
});

test('países y lugares seleccionados se combinan con AND y requieren coincidencia estructurada', () => {
  assert.equal(searchUi.filterPrograms([program()], {countries:['Italia','Francia'],destinations:['Roma','París']}).length, 1);
  assert.equal(searchUi.filterPrograms([program()], {countries:['Italia','España']}).length, 0);
  assert.equal(searchUi.filterPrograms([program()], {destinations:['Roma','Londres']}).length, 0);
  assert.equal(searchUi.filterPrograms([program({destinations:['Roma','París / Londres']})], {destinations:['París']}).length, 0);
});

test('los cinco criterios se aplican simultáneamente y los duplicados de ID aparecen una sola vez', () => {
  const item = program();
  const filters = {name:'conociendo',countries:['Italia','Francia'],destinations:['Roma','París'],month:'mayo',type:'grupal'};
  assert.deepEqual(searchUi.filterPrograms([item,{...item}], filters), [item]);
  assert.equal(searchUi.filterPrograms([item], {...filters, type:'sin-aereo'}).length, 0);
});

test('el mes respeta fechas elegibles y períodos; no infiere fechas cuando no están informadas', () => {
  assert.equal(searchUi.filterPrograms([program()], {month:'mayo'}).length, 1);
  assert.equal(searchUi.filterPrograms([program()], {month:'junio'}).length, 0);
  assert.equal(searchUi.filterPrograms([program({months:['mayo','junio'],searchDepartures:[]})], {month:'junio'}).length, 1);
  assert.equal(searchUi.filterPrograms([program({months:[],searchDepartures:[]})], {month:'mayo'}).length, 0);
});

test('la salida seleccionada conserva su propia fecha y tarifa, y los períodos conservan el resumen', () => {
  assert.deepEqual(searchUi.matchingDeparture(program(), 'mayo'), {date:'2027-05-10',month:'mayo',price:'USD 4.290'});
  assert.equal(searchUi.matchingDeparture(program({months:['mayo'],searchDepartures:[]}), 'mayo'), null);
});

test('programas sin destinos o no publicados no se inventan ni aparecen con filtros incompatibles', () => {
  assert.equal(searchUi.filterPrograms([program({destinations:[],countries:[]})], {destinations:['Roma']}).length, 0);
  assert.equal(searchUi.filterPrograms([program({published:false})], {}).length, 0);
});

test('los cinco filtros rápidos usan únicamente clasificaciones del catálogo, nunca el precio', () => {
  const records = [
    program({id:'group',types:['grupal']}),
    program({id:'no-air',types:['sin-aereo']}),
    program({id:'custom',types:['personalizado']}),
    program({id:'budget',types:['low-cost'],priceText:'USD 100'}),
    program({id:'luxury',types:['lujo'],priceText:'USD 100000'}),
    program({id:'cheap-unclassified',types:[],priceText:'USD 1'}),
    program({id:'flight-fallback',types:[],flight_type:'without-flight'})
  ];
  assert.deepEqual(searchUi.QUICK_FILTERS.map(filter => filter.id), ['grupal','sin-aereo','personalizado','low-cost','lujo']);
  assert.deepEqual(searchUi.filterQuickCategories(records).map(item => item.id), ['group','no-air','custom','budget','luxury','flight-fallback']);
  assert.deepEqual(searchUi.filterQuickCategories(records, ['low-cost']).map(item => item.id), ['budget']);
  assert.deepEqual(searchUi.filterQuickCategories(records, ['lujo']).map(item => item.id), ['luxury']);
  assert.deepEqual(searchUi.filterQuickCategories(records, []).map(item => item.id), []);
});

test('los filtros rápidos se combinan por OR y un programa con varias etiquetas aparece una vez', () => {
  const multi = program({id:'multi',types:['grupal','low-cost','lujo']});
  const one = program({id:'one',types:['personalizado']});
  assert.deepEqual(searchUi.filterQuickCategories([multi,one,multi], ['grupal','lujo','personalizado']), [multi,one]);
  assert.deepEqual(searchUi.filterPrograms([multi,one], {name:'Europa'}), [multi,one]);
  assert.deepEqual(searchUi.filterQuickCategories(searchUi.filterPrograms([multi,one], {name:'Europa'}), ['lujo']), [multi]);
});

test('el orden habitual conserva el orden del catálogo y las tarifas respetan salida, mes y moneda', () => {
  const usd = program({id:'usd',currency:'USD',searchDepartures:[
    {date:'2027-03-10',month:'marzo',price:'USD 3.000'},
    {date:'2027-05-10',month:'mayo',price:'USD 4.200'}
  ]});
  const eur = program({id:'eur',currency:'EUR',searchDepartures:[
    {date:'2027-05-12',month:'mayo',price:'EUR 2.100'}
  ]});
  assert.deepEqual(searchUi.sortPrograms([eur,usd]).map(row => row.program), [eur,usd]);
  const byMonth = searchUi.sortPrograms([usd], 'price-asc', 'mayo');
  assert.equal(byMonth[0].departure.date, '2027-05-10');
  assert.equal(byMonth[0].priceValue, 4200);
  const byPrice = searchUi.sortPrograms([usd], 'price-asc');
  assert.equal(byPrice[0].departure.date, '2027-03-10');
  assert.equal(byPrice[0].priceValue, 3000);
  // EUR and USD stay in catalog bucket order; their numeric amounts are never compared.
  assert.deepEqual(searchUi.sortPrograms([eur,usd], 'price-asc').map(row => row.program), [eur,usd]);
});

test('salidas ordena solo fechas exactas y deja períodos sin salida puntual al final', () => {
  const later = program({id:'later',searchDepartures:[
    {date:'2027-09-10',month:'septiembre',price:'USD 5000'},
    {date:'2027-11-10',month:'noviembre',price:'USD 5200'}
  ]});
  const period = program({id:'period',months:['mayo','junio'],date_mode:'date_range',searchDepartures:[]});
  const sooner = program({id:'sooner',searchDepartures:[
    {date:'2027-03-10',month:'marzo',price:'USD 4000'},
    {date:'2027-06-10',month:'junio',price:'USD 4300'}
  ]});
  const rowsAsc = searchUi.sortPrograms([later,period,sooner], 'departure-asc', '', '2027-01-01');
  assert.deepEqual(rowsAsc.map(row => row.program), [sooner,later,period]);
  assert.equal(rowsAsc[0].departure.date, '2027-03-10');
  assert.equal(rowsAsc[1].departure.date, '2027-09-10');
  const rowsDesc = searchUi.sortPrograms([sooner,later], 'departure-desc', '', '2027-01-01');
  assert.deepEqual(rowsDesc.map(row => row.program), [later,sooner]);
  assert.equal(rowsDesc[0].departure.date, '2027-11-10');
  assert.equal(rowsDesc[1].departure.date, '2027-06-10');
  const afterDepartures = searchUi.sortPrograms([sooner,later,period], 'departure-asc', '', '2028-01-01');
  assert.deepEqual(afterDepartures.map(row => row.program), [sooner,later,period]);
  assert.ok(afterDepartures.every(row => !row.departure));
});

test('el orden por precio conserva el precio base para períodos y manda precios no informados al final', () => {
  const period = program({id:'period',date_mode:'date_range',searchDepartures:[],priceFrom:2500,priceText:'Desde EUR 2.500'});
  const noPrice = program({id:'no-price',searchDepartures:[],priceFrom:null,priceText:''});
  const dated = program({id:'dated',searchDepartures:[{date:'2027-05-10',month:'mayo',price:'USD 3.000'}]});
  const rows = searchUi.sortPrograms([noPrice,dated,period], 'price-asc', '', '2027-01-01');
  assert.deepEqual(rows.map(row => row.program), [dated,period,noPrice]);
  assert.equal(rows.find(row => row.program.id === 'period').priceValue, 2500);
  assert.equal(rows.at(-1).priceValue, null);
});

test('los precios ignoran salidas vencidas y respetan el mes al elegir la tarifa asociada', () => {
  const item = program({id:'dated',currency:'USD',searchDepartures:[
    {date:'2026-01-15',month:'enero',price:'USD 1000'},
    {date:'2027-03-10',month:'marzo',price:'USD 3000'},
    {date:'2027-05-10',month:'mayo',price:'USD 4200'}
  ]});
  const cheapest = searchUi.sortPrograms([item], 'price-asc', '', '2026-11-23')[0];
  assert.equal(cheapest.departure.date, '2027-03-10');
  assert.equal(cheapest.priceValue, 3000);
  const may = searchUi.sortPrograms([item], 'price-asc', 'mayo', '2026-11-23')[0];
  assert.equal(may.departure.date, '2027-05-10');
  assert.equal(may.priceValue, 4200);
  const noEligible = searchUi.sortPrograms([item], 'price-asc', 'enero', '2026-11-23')[0];
  assert.equal(noEligible.priceValue, null);
});

test('los resultados ofrecen cinco chips y las cinco opciones de ordenamiento', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'travel-search.js'), 'utf8');
  const engineSource = fs.readFileSync(path.join(__dirname, '..', 'advanced-search-ui.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'advanced-search-ui.css'), 'utf8');
  assert.match(html, /id="searchResultRefinements"/);
  for (const label of ['Grupales','Tours sin aéreo','A medida','Low Cost','Lujo']) assert.ok(engineSource.includes(`label: '${label}'`));
  for (const option of ['Orden habitual','Menor precio','Mayor precio','Próxima salida','Salida más lejana']) assert.ok(source.includes(option));
  assert.match(source, /aria-pressed="\$\{activeQuickCategories\.has\(filter\.id\)\}"/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.search-result-category-group \{ flex-basis:100%/);
  assert.match(css, /search-result-sort select \{ flex:1; width:1px; \}/);
});
