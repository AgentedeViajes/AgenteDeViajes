const test=require('node:test');
const assert=require('node:assert/strict');
const {parseItinerary,detectHeading}=require('../admin/itinerary-parser.js');

function makeItinerary(count,headerFor){
  return Array.from({length:count},(_,index)=>{
    const day=index+1;
    return`${headerFor(day)}\nDescripción íntegra del día ${day}. Horario 10:30. Vuelo UX 1234. Valor USD 200.\nSegundo párrafo del día ${day}.`;
  }).join('\n\n');
}

test('formato A detecta 19 jornadas, fechas, régimen y secciones generales',()=>{
  const body=makeItinerary(19,day=>{
    if(day===1)return'Día 01 › Mie 03/03: BUENOS AIRES → CAIRO, vía Estambul (Box breakfast)';
    if(day===4)return'DÍA 04: CAIRO (Desayuno y cena)';
    return`Día ${String(day).padStart(2,'0')} › ${String(day+2).padStart(2,'0')}/03: DESTINO ${day}`;
  });
  const source=`Servicios incluidos:\nTraslados privados\n19 noches de alojamiento\n\n${body}\n\nNotas importantes:\nPasaporte vigente obligatorio.\n\nServicios no incluidos:\nPropinas.`;
  const result=parseItinerary(source);
  assert.equal(result.days.length,19);
  assert.equal(result.days[0].title,'BUENOS AIRES → CAIRO, vía Estambul');
  assert.equal(result.days[0].date,'03/03');
  assert.equal(result.days[0].meals,'Box breakfast');
  assert.equal(result.days[3].meals,'D/C');
  assert.match(result.days[0].description,/Descripción íntegra del día 1\. Horario 10:30\. Vuelo UX 1234\. Valor USD 200\.\nSegundo párrafo/);
  assert.match(result.includes,/Traslados privados/);
  assert.match(result.notes,/Pasaporte vigente obligatorio/);
  assert.match(result.notes,/Servicios no incluidos:\nPropinas/);
});

test('formato B detecta 18 encabezados pegados sin confundir números del relato',()=>{
  const source=makeItinerary(18,day=>`${day}${day===1?'BUENOS AIRES':day===2?'MADRID':day===10?'ROMA':`DESTINO ${day}`}`);
  const result=parseItinerary(source);
  assert.equal(result.days.length,18);
  assert.equal(result.days[0].title,'BUENOS AIRES');
  assert.equal(result.days[1].title,'MADRID');
  assert.equal(result.days[9].title,'ROMA');
  assert.equal(result.days[0].description.split('\n').length,2);
});

test('formato C detecta 13 jornadas con encabezados DIA N',()=>{
  const source=makeItinerary(13,day=>`DIA ${day} – ${day===1?'BUENOS AIRES':day===2?'MADRID / COPENHAGUE':`CIUDAD ${day}`}`);
  const result=parseItinerary(source);
  assert.equal(result.days.length,13);
  assert.equal(result.days[1].title,'MADRID / COPENHAGUE');
  assert.equal(result.days[12].sourceNumber,13);
});

test('reconoce encabezados partidos en varias líneas y fechas incompletas sin inventar año',()=>{
  const source='DÍA 01 › Mie 03/03:\nPARÍS\nLlegada y traslado.\n\nDÍA 02\nPARÍS – ROMA\nDesayuno. Salida hacia Roma.';
  const result=parseItinerary(source);
  assert.equal(result.days.length,2);
  assert.equal(result.days[0].title,'PARÍS');
  assert.equal(result.days[0].date,'03/03');
  assert.equal(result.days[1].title,'PARÍS – ROMA');
  assert.ok(result.days[0].warnings.some(item=>item.includes('dividido')));
});

test('solo extrae régimen del encabezado y no de actividades del relato',()=>{
  const source='DÍA 1: ROMA\nDesayuno en el hotel. Almuerzo durante la excursión.\n\nDÍA 2 | FLORENCIA (Desayuno, almuerzo y cena)\nRecorrido completo.';
  const result=parseItinerary(source);
  assert.equal(result.days[0].meals,'');
  assert.equal(result.days[1].meals,'D/A/C');
});

test('no crea jornadas falsas a partir de horarios, vuelos, precios o cantidades',()=>{
  const source='DÍA 1: MADRID\n10:30 salida del hotel.\n2 vuelos internos incluidos.\nVuelo UX 1234 confirmado.\nUSD 250 por excursión.\n\nDÍA 2: LISBOA\nLlegada.';
  const result=parseItinerary(source);
  assert.equal(result.days.length,2);
  assert.match(result.days[0].description,/10:30 salida/);
  assert.match(result.days[0].description,/2 vuelos internos/);
});

test('mantiene notas específicas dentro de la jornada cuando aparecen entre días',()=>{
  const source='DÍA 1: MADRID\nVisita panorámica.\nNotas importantes:\nLlevar pasaporte durante esta visita.\n\nDÍA 2: PARÍS\nLlegada.';
  const result=parseItinerary(source);
  assert.equal(result.days.length,2);
  assert.match(result.days[0].description,/Notas importantes:\nLlevar pasaporte/);
  assert.equal(result.notes,'');
  assert.ok(result.days[0].warnings.length>0);
});

test('una entrada mal formada genera advertencia y no inventa contenido',()=>{
  const result=parseItinerary('Programa turístico\nLlegada 10:30\nUSD 2.500 por persona.');
  assert.equal(result.days.length,0);
  assert.ok(result.warnings.some(item=>item.includes('No se reconocieron')));
});

test('detectHeading rechaza unidades y acepta destinos compactos',()=>{
  assert.equal(detectHeading('10USD por persona'),null);
  assert.equal(detectHeading('2 noches en Madrid'),null);
  assert.equal(detectHeading('10ROMA').number,10);
});
