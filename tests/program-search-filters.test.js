const test = require('node:test');
const assert = require('node:assert/strict');
const filters = require('../program-search-filters.js');

test('clasifica países, tildes y variantes geográficas normalizadas', () => {
  assert.equal(filters.matchesDestination({countries:['Tailandia']},'Sudeste Asiático'),true);
  assert.equal(filters.matchesDestination({countries:['Japón']},'Oriente'),true);
  assert.equal(filters.matchesDestination({countries:['Egipto']},'África'),true);
  assert.equal(filters.matchesDestination({countries:['Emiratos Árabes Unidos']},'Medio Oriente'),true);
  assert.equal(filters.matchesDestination({countries:['Maldivas']},'Islas del Índico'),true);
  assert.equal(filters.matchesDestination({countries:['Nueva Zelanda']},'Oceanía'),true);
});

test('región explícita se conserva y un circuito multidestino queda en ambas regiones', () => {
  const circuit = {region:'Oriente',countries:['Japón','Tailandia'],destinations:['Tokyo','Bangkok']};
  assert.deepEqual(new Set(filters.categoriesForProgram(circuit)),new Set(['oriente','sudeste_asiatico']));
  assert.equal(filters.matchesDestination(circuit,'Oriente'),true);
  assert.equal(filters.matchesDestination(circuit,'Sudeste Asiático'),true);
});

test('una categoría futura explícita prevalece sobre una regla provisional de país', () => {
  const program = {region:'Oriente',countries:['Tailandia'],title:'Tailandia clásica'};
  assert.deepEqual(filters.categoriesForProgram(program),['oriente']);
});

test('usa las regiones de Brasil, Estados Unidos y Europa aunque el campo región sea genérico', () => {
  assert.equal(filters.matchesDestination({region:'América',countries:['Brasil']},'Brasil'),true);
  assert.equal(filters.matchesDestination({region:'América',countries:['Estados Unidos']},'EEUU'),true);
  assert.equal(filters.matchesDestination({region:'Europa',countries:['Italia']},'Europa'),true);
});

test('usa ciudades/destinos conocidos, pero evita inferencias de texto ambiguo', () => {
  assert.equal(filters.matchesDestination({destinations:'Tokyo, Kyoto, Osaka'},'Oriente'),true);
  assert.equal(filters.matchesDestination({name:'Oriente clásico'},'Oriente'),false);
  assert.equal(filters.matchesDestination({name:'Georgia y sus paisajes'},'Europa'),false);
});

test('la región general Asia no se asigna a una categoría geográfica más específica', () => {
  assert.deepEqual(filters.categoriesForProgram({region:'Asia'}),[]);
});

test('Subcontinente Indio usa solo países y destinos reconocidos, no la región general Asia', () => {
  for (const country of ['India','Nepal','Bután','Bhutan','Bangladesh','Bangladés']) {
    assert.equal(filters.matchesDestination({region:'Asia',countries:[country]},'Subcontinente Indio'),true,country);
  }
  for (const destination of ['Delhi','Kathmandu','Thimphu','Dhaka']) {
    assert.equal(filters.matchesDestination({region:'Asia',destinations:[destination]},'Subcontinente Indio'),true,destination);
  }
  assert.equal(filters.matchesDestination({region:'Asia'},'Subcontinente Indio'),false);
  assert.equal(filters.matchesDestination({region:'Asia',countries:['Japón']},'Subcontinente Indio'),false);
  assert.equal(filters.matchesDestination({region:'Asia',countries:['India']},'Oriente'),false);
  assert.equal(filters.matchesDestination({region:'Asia',countries:['Tailandia']},'Sudeste Asiático'),true);
});

test('un circuito con India y Japón aparece en subcontinente indio y Oriente', () => {
  const circuit = {region:'Asia',countries:'India; Japón'};
  assert.equal(filters.matchesDestination(circuit,'Subcontinente Indio'),true);
  assert.equal(filters.matchesDestination(circuit,'Oriente'),true);
  assert.deepEqual(filters.filterByNavigation([circuit],{kind:'destination',value:'Subcontinente Indio'}),[circuit]);
});

test('las experiencias usan etiquetas existentes y aceptan más de una etiqueta', () => {
  const program = {experienceTypes:['grupal','lujo']};
  assert.equal(filters.matchesExperience(program,'grupal'),true);
  assert.equal(filters.matchesExperience(program,'lujo'),true);
  assert.equal(filters.matchesExperience(program,'low-cost'),false);
  assert.equal(filters.matchesExperience({travel_types:'grupal,low-cost'},'low-cost'),true);
  assert.equal(filters.matchesExperience({types:['grupal']},'grupal'),false);
  assert.equal(filters.matchesExperience({name:'Viajes grupales por Europa',searchText:'salida grupal'},'grupal'),false);
});

test('el filtro de menú se reaplica a programas cargados después de elegir la experiencia', () => {
  const selected = {kind:'experience',value:'grupal'};
  const local = [{title:'Programa local',experienceTypes:['grupal']}];
  const remote = [...local,{title:'Nuevo programa publicado',experienceTypes:['grupal','lujo']}];
  assert.equal(filters.filterByNavigation(local,selected).length,1);
  assert.deepEqual(filters.filterByNavigation(remote,selected).map(item=>item.title),['Programa local','Nuevo programa publicado']);
  assert.deepEqual(filters.filterByNavigation(remote,{kind:'experience',value:'lujo'}).map(item=>item.title),['Nuevo programa publicado']);
});

test('cada nueva selección de menú reemplaza el filtro anterior', () => {
  const program = {title:'Circuito Tokio Bangkok',countries:['Japón','Tailandia'],experienceTypes:['grupal','lujo']};
  const records = [program];
  assert.equal(filters.filterByNavigation(records,{kind:'destination',value:'Oriente'}).length,1);
  assert.equal(filters.filterByNavigation(records,{kind:'experience',value:'grupal'}).length,1);
  assert.equal(filters.filterByNavigation(records,{kind:'experience',value:'personalizado'}).length,0);
});

test('el código de operador no deduplica programas publicados distintos', () => {
  const programs = [
    {id:'local:1',name:'Circuito A',source:'local',operator_code:'MISMO-OPERADOR'},
    {id:'supabase:1',name:'Circuito A',source:'supabase',operator_code:'MISMO-OPERADOR'},
    {id:'supabase:2',name:'Circuito B',source:'supabase',operator_code:'MISMO-OPERADOR'},
    {id:'supabase:4',name:'Circuito A',source:'supabase',operator_code:'OTRO-OPERADOR'},
    {id:'supabase:3',name:'Circuito C',source:'supabase',operator_code:'OTRO-OPERADOR'},
    {id:'supabase:3',name:'Duplicado por ID',source:'supabase',operator_code:'TERCER-OPERADOR'},
    {id:'supabase:5',name:'Circuito C',source:'supabase',operator_code:'OTRO-OPERADOR'}
  ];
  const result = filters.dedupePrograms(programs);
  assert.deepEqual(result.map(program=>program.id),['supabase:1','supabase:2','supabase:4','supabase:3']);
  assert.equal(result[0].source,'supabase');
});

test('la ventana de 60 días incluye hoy y el límite y excluye fechas fuera del período', () => {
  const records = [
    {id:'past',name:'Anterior',departureDates:['2026-12-19']},
    {id:'today',name:'Hoy',departureDates:['2026-12-20']},
    {id:'limit',name:'Límite',departures:[{departure_date:'2027-02-18'}]},
    {id:'late',name:'Fuera',departureDates:['2027-02-19']}
  ];
  assert.deepEqual(filters.upcomingDepartures(records,{today:'2026-12-20',days:60}).map(item=>[item.program.id,item.departureDate]),[
    ['today','2026-12-20'],['limit','2027-02-18']
  ]);
});

test('elige la próxima fecha válida y muestra cada programa una vez', () => {
  const records = [
    {id:'multi',name:'Circuito',source:'supabase',operator_code:'MR-1',departures:[{departure_date:'2027-01-14'},{departure_date:'2027-01-03'},{departure_date:'2027-01-03'}]},
    {id:'duplicate-local',name:'Circuito',source:'local',departures:[{departure_date:'2027-01-03'}]}
  ];
  const result = filters.upcomingDepartures(records,{today:'2027-01-01',days:60});
  assert.equal(result.length,1);
  assert.equal(result[0].departureDate,'2027-01-03');
});

test('próximas salidas no colapsa programas distintos del mismo operador', () => {
  const programs = [
    {id:'supabase:a',source:'supabase',name:'Circuito A',operator_code:'MISMO-OPERADOR',status:'published',departures:[{departure_date:'2027-01-05'}]},
    {id:'supabase:b',source:'supabase',name:'Circuito B',operator_code:'MISMO-OPERADOR',status:'published',departures:[{departure_date:'2027-01-06'}]}
  ];
  assert.deepEqual(filters.upcomingDepartures(programs,{today:'2027-01-01'}).map(item=>item.program.name),['Circuito A','Circuito B']);
});

test('excluye programas borrador y períodos de vigencia', () => {
  const records = [
    {name:'Borrador',status:'draft',departures:[{departure_date:'2027-01-05'}]},
    {name:'Vigencia',status:'published',date_mode:'date_range',travel_start_date:'2027-01-01',travel_end_date:'2027-02-01',departures:[]},
    {name:'Publicado',status:'published',departures:[{departure_date:'2027-01-06'}]}
  ];
  assert.deepEqual(filters.upcomingDepartures(records,{today:'2027-01-01'}).map(item=>item.program.name),['Publicado']);
});

test('admite cambios de mes/año y fecha puntual local con año explícito', () => {
  assert.equal(filters.addDays('2026-12-20',60),'2027-02-18');
  assert.deepEqual(filters.extractConcreteDates('Salida 03/01/2027 y 2027-02-18'),['2027-01-03','2027-02-18']);
  assert.deepEqual(filters.extractConcreteDates('Salidas todos los días · abril'),[]);
});

test('la fecha de hoy se calcula en el calendario local de Argentina', () => {
  assert.equal(filters.argentinaToday(new Date('2026-01-01T02:00:00.000Z')),'2025-12-31');
});
