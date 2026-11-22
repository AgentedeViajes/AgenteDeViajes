'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const booking = require('../program-booking.js');

const id = 'supabase:123e4567-e89b-12d3-a456-426614174000';

test('acepta solo identificadores estables de programas publicados', () => {
  assert.equal(booking.isProgramId(id), true);
  assert.equal(booking.isProgramId('supabase:not-a-uuid'), false);
  assert.equal(booking.isProgramId('Japón y Tailandia'), false);
});

test('construye enlaces con programa y salida, sin incluir título ni tarifa confiada al navegador', () => {
  const url = new URL(booking.buildBookingUrl(id, '2027-03-14'));
  assert.equal(url.pathname, '/contratar.html');
  assert.equal(url.searchParams.get('programa'), id);
  assert.equal(url.searchParams.get('salida'), '2027-03-14');
  assert.equal(url.searchParams.has('precio'), false);
  assert.equal(url.searchParams.has('titulo'), false);
  assert.throws(() => booking.buildBookingUrl('legacy-static-program'));
});

test('ordena salidas confirmadas y calcula tarifa de salida o tarifa base con base tarifaria', () => {
  const program = {
    price: 6560, currency: 'USD', price_basis: 'double', price_prefix: 'from',
    departures: [
      { departure_date: '2027-05-01', price: null },
      { departure_date: '2027-03-14', price: 6600 }
    ]
  };
  assert.deepEqual(booking.departureOptions(program).map(item => item.departure_date), ['2027-03-14', '2027-05-01']);
  assert.equal(booking.formatFare(program, booking.fareFor(program, '2027-03-14')), 'USD 6.600 por persona en doble');
  assert.equal(booking.formatFare(program, booking.fareFor(program, '2027-05-01')), 'Desde USD 6.560 por persona en doble');
  assert.equal(booking.fareFor(program, '2027-09-01').valid, false);
  assert.equal(booking.fareFor(program).error, 'departure_required');
});

test('una única salida se selecciona automáticamente y oculta el selector', () => {
  const program = { price: 3000, currency: 'USD', departures: [{ departure_date: '2027-03-14', price: 3200 }] };
  const selection = booking.departureSelection(program);
  assert.equal(selection.selectedDate, '2027-03-14');
  assert.equal(selection.selectorVisible, false);
  assert.equal(selection.dateRequired, false);
  assert.equal(selection.fare.amount, 3200);
});

test('varias salidas sin elección permiten entrar y no muestran una tarifa final', () => {
  const program = { price: 3000, currency: 'USD', departures: [
    { departure_date: '2027-03-14', price: 3200 }, { departure_date: '2027-05-01', price: 3400 }
  ] };
  const selection = booking.departureSelection(program);
  assert.equal(selection.selectedDate, null);
  assert.equal(selection.selectorVisible, true);
  assert.equal(selection.dateRequired, true);
  assert.equal(selection.availability, 'Seleccioná tu fecha de salida');
  assert.equal(selection.fare.error, 'departure_required');
});

test('conserva la salida elegida en la ficha y resuelve su tarifa publicada', () => {
  const program = { price: 3000, currency: 'USD', departures: [
    { departure_date: '2027-03-14', price: 3200 }, { departure_date: '2027-05-01', price: 3400 }
  ] };
  const selection = booking.departureSelection(program, '2027-05-01');
  assert.equal(selection.selectedDate, '2027-05-01');
  assert.equal(selection.selectorVisible, true);
  assert.equal(selection.fare.amount, 3400);
});

test('presenta períodos de viaje sin inventar una fecha de salida puntual', () => {
  const program = { date_mode: 'date_range', travel_start_date: '2027-01-01', travel_end_date: '2027-06-30', price: 2000 };
  assert.equal(booking.isDateRange(program), true);
  assert.equal(booking.availabilityLabel(program), 'Período de viaje: 01/01/2027 al 30/06/2027');
  assert.equal(booking.fareFor(program).amount, 2000);
  const selection = booking.departureSelection(program);
  assert.equal(selection.selectedDate, null);
  assert.equal(selection.selectorVisible, false);
  assert.equal(selection.availability, 'Período de viaje: 01/01/2027 al 30/06/2027');
  assert.equal(selection.fare.amount, 2000);
});

test('la página conecta el endpoint y confirma solo tras una respuesta exitosa', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'contratar.html'), 'utf8');
  const script = fs.readFileSync(path.join(__dirname, '..', 'program-booking-page.js'), 'utf8');
  for (const field of ['fullName', 'email', 'phone', 'locality', 'adults', 'minors', 'comments', 'contactConsent']) {
    assert.match(html, new RegExp(`name="${field}"`));
  }
  assert.match(html, /ENVIAR SOLICITUD DE CONTRATACIÓN/);
  assert.match(html, /No implica un pago ni constituye una reserva confirmada/);
  assert.match(script, /requestClient\.submit\(buildPayload\(\)\)/);
  assert.match(script, /data-booking-confirmation/);
  assert.match(script, /result\.ok === true/);
  assert.match(script, /Enviando solicitud/);
  assert.match(script, /submitButton\.disabled = true/);
  assert.match(script, /submitButton\.disabled = false/);
  assert.doesNotMatch(script, /form\.reset\(/);
  assert.match(html, /¡Recibimos tu solicitud!/);
  assert.match(html, /Volver al inicio/);
  assert.doesNotMatch(script, /localStorage|sessionStorage/);
  const detail = fs.readFileSync(path.join(__dirname, '..', 'travel-search.js'), 'utf8');
  assert.match(detail, /> RESERVAR</);
  assert.doesNotMatch(detail, /aria-disabled="true" tabindex="-1"/);
  assert.match(detail, /programBooking\.buildBookingUrl\(detail\.bookingProgramId, item\.date\)/);
});
