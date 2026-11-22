'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createReservationClient } = require('../reservation-client.js');

test('envía JSON al endpoint propio y solo considera éxito una respuesta explícita aceptada', async () => {
  let call;
  const client = createReservationClient(async (...args) => {
    call = args;
    return { ok: true, json: async () => ({ ok: true }) };
  });
  const payload = { passenger: { fullName: 'Test' }, program: { id: 'supabase:id' } };
  assert.deepEqual(await client.submit(payload), { ok: true });
  assert.equal(call[0], '/api/reservations');
  assert.equal(call[1].method, 'POST');
  assert.equal(call[1].headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(call[1].body), payload);
  assert.equal(call[1].credentials, 'same-origin');
});

test('rechaza respuesta HTTP fallida o respuesta sin confirmación explícita', async () => {
  const rejectedHttp = createReservationClient(async () => ({ ok: false, json: async () => ({ ok: true }) }));
  assert.deepEqual(await rejectedHttp.submit({}), { ok: false, error: 'email_delivery_failed' });
  const falseSuccess = createReservationClient(async () => ({ ok: true, json: async () => ({ ok: false, error: 'email_delivery_failed' }) }));
  assert.deepEqual(await falseSuccess.submit({}), { ok: false, error: 'email_delivery_failed' });
});

test('ignora el segundo envío mientras el primero está pendiente y libera el bloqueo al terminar', async () => {
  let resolveRequest;
  let calls = 0;
  const client = createReservationClient(() => {
    calls += 1;
    return new Promise(resolve => { resolveRequest = resolve; });
  });
  const first = client.submit({ attempt: 1 });
  const duplicate = await client.submit({ attempt: 2 });
  assert.deepEqual(duplicate, { ignored: true });
  assert.equal(calls, 1);
  assert.equal(client.pending, true);
  resolveRequest({ ok: true, json: async () => ({ ok: true }) });
  assert.deepEqual(await first, { ok: true });
  assert.equal(client.pending, false);
});

test('el fallo de red no bloquea un reintento posterior', async () => {
  let calls = 0;
  const client = createReservationClient(async () => {
    calls += 1;
    if (calls === 1) throw new Error('detalle privado');
    return { ok: true, json: async () => ({ ok: true }) };
  });
  assert.deepEqual(await client.submit({}), { ok: false, error: 'network_error' });
  assert.deepEqual(await client.submit({}), { ok: true });
  assert.equal(calls, 2);
});
