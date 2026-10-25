const test = require('node:test');
const assert = require('node:assert/strict');
const dates = require('../date-mode.js');

test('programas antiguos se interpretan como fechas específicas', () => {
  assert.equal(dates.normalizeMode(undefined), dates.SPECIFIC_DATES);
  assert.equal(dates.normalizeMode('scheduled'), dates.SPECIFIC_DATES);
});

test('fechas específicas conservan salidas, precios especiales y cupos', () => {
  const departures = [
    {date:'2027-01-10', price:'1200', capacity:'12'},
    {date:'2027-02-10', price:'1300', capacity:'10'},
    {date:'2027-03-10', price:'1400', capacity:'8'}
  ];
  const result = dates.activeAvailability({mode:'specific_dates', departures, rangeStartDate:'2027-01-01', rangeEndDate:'2027-02-28'});
  assert.deepEqual(result.departures, departures);
  assert.equal(result.rangeStartDate, '');
  assert.equal(result.rangeEndDate, '');
});

test('paquete flexible almacena un único rango y no crea salidas diarias', () => {
  const result = dates.activeAvailability({mode:'date_range', rangeStartDate:'2027-01-01', rangeEndDate:'2027-02-28', departures:[{date:'2027-01-01'}]});
  assert.equal(result.dateMode, 'date_range');
  assert.equal(result.rangeStartDate, '2027-01-01');
  assert.equal(result.rangeEndDate, '2027-02-28');
  assert.deepEqual(result.departures, []);
  assert.equal(dates.rangeLabel(result.rangeStartDate, result.rangeEndDate), 'Para viajar del 01/01/2027 al 28/02/2027');
});

test('rango entre dos años incluye todos los meses buscables', () => {
  assert.deepEqual(dates.rangeMonths('2026-12-15','2027-03-15'), ['diciembre','enero','febrero','marzo']);
});

test('fecha final anterior a la inicial siempre es inválida', () => {
  const result = dates.validateAvailability({mode:'date_range', start:'2027-03-01', end:'2027-02-28', status:'draft'});
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /anterior/);
});

test('un programa publicado exige ambas fechas del rango', () => {
  assert.equal(dates.validateAvailability({mode:'date_range', start:'2027-01-01', end:'', status:'published'}).valid, false);
  assert.equal(dates.validateAvailability({mode:'date_range', start:'', end:'2027-02-28', status:'published'}).valid, false);
});

test('un borrador puede conservar un rango incompleto', () => {
  assert.equal(dates.validateAvailability({mode:'date_range', start:'2027-01-01', end:'', status:'draft'}).valid, true);
});

test('la duración permanece independiente del rango', () => {
  const program = {duration:'8 días / 7 noches', mode:'date_range', rangeStartDate:'2027-01-01', rangeEndDate:'2027-02-28'};
  const result = dates.activeAvailability(program);
  assert.equal(program.duration, '8 días / 7 noches');
  assert.equal(result.rangeStartDate, '2027-01-01');
  assert.equal(result.rangeEndDate, '2027-02-28');
});
