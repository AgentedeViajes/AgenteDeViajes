'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/reservations.js');

const NOW = Date.parse('2026-11-21T12:00:00.000Z');
const PROGRAM_UUID = '123e4567-e89b-12d3-a456-426614174000';
const CANONICAL_PROGRAM = {
  id: PROGRAM_UUID,
  title: 'Japón y Tailandia',
  operator_code: 'ABC-12',
  status: 'published',
  currency: 'USD',
  price: 3500,
  price_prefix: null,
  price_basis: 'double',
  departures: [{ departure_date: '2027-03-14', price: 3500 }]
};
const ENV = {
  RESEND_API_KEY: 'server-only-test-key',
  RESERVATION_EMAIL: 'reservas@example.test',
  RESEND_FROM_EMAIL: 'Modo Rumbo <onboarding@resend.dev>',
  VERCEL_ENV: 'preview',
  VERCEL_URL: 'modorumbo-preview-abc.vercel.app'
};

function makeRequest(overrides = {}) {
  return {
    method: overrides.method || 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://modorumbo-preview-abc.vercel.app',
      'x-real-ip': '203.0.113.20',
      ...(overrides.headers || {})
    },
    body: typeof overrides.body === 'string' ? overrides.body : {
      passenger: {
        fullName: 'Ana Pérez', email: 'ana@example.test', phone: '+54 11 5555-1212',
        locality: 'Buenos Aires', adults: 1, minors: 0, minorAges: [], comments: '', contactConsent: true
      },
      program: {
        id: `supabase:${PROGRAM_UUID}`,
        departureDate: '2027-03-14',
        fareAmount: 3500
      },
      formStartedAt: NOW - 5000,
      ...(overrides.body || {})
    }
  };
}

function responseRecorder() {
  return {
    statusCode: null,
    payload: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
    setHeader(name, value) { this.headers[name] = value; }
  };
}

function buildHandler({ fetchImpl, env = ENV, log = () => {}, now = () => NOW, loadProgram } = {}) {
  return createHandler({ env, fetchImpl, log, now, loadProgram: loadProgram || (async id => id === PROGRAM_UUID ? CANONICAL_PROGRAM : null) });
}

async function invoke(handler, req = makeRequest()) {
  const res = responseRecorder();
  await handler(req, res);
  return res;
}

test('envía una solicitud válida a Resend con destinatario y remitente fijados en servidor', async () => {
  let call;
  const handler = buildHandler({ fetchImpl: async (...args) => {
    call = args;
    return { ok: true, status: 200 };
  } });
  const res = await invoke(handler);
  const [url, options] = call;
  const message = JSON.parse(options.body);
  assert.equal(res.statusCode, 200);
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Authorization, 'Bearer server-only-test-key');
  assert.deepEqual(message.to, ['reservas@example.test']);
  assert.equal(message.from, ENV.RESEND_FROM_EMAIL);
  assert.equal(message.reply_to, 'ana@example.test');
  assert.match(message.text, /Japón y Tailandia/);
  assert.match(message.text, /Código del operador: ABC-12/);
  assert.match(message.text, /14\/03\/2027/);
  assert.match(message.text, /USD 3\.500/);
  assert.match(message.text, /Localidad: Buenos Aires/);
  assert.match(message.text, /Adultos: 1/);
  assert.match(message.text, /Acepta contacto: Sí/);
  assert.equal(message.subject, 'Nueva solicitud de contratación - Japón y Tailandia');
  assert.match(message.text, /Fecha de salida o período: 14\/03\/2027/);
  assert.match(message.text, /Tarifa publicada y base tarifaria: USD 3\.500 por persona en doble/);
  assert.doesNotMatch(message.text, /total a pagar|importe total/i);
  assert.deepEqual(message.to, ['reservas@example.test']);
  assert.equal(res.payload.ok, true);
});

test('envía la segunda salida elegida con su tarifa canónica, sin calcular totales de pasajeros', async () => {
  let call;
  const multi = { ...CANONICAL_PROGRAM, departures: [
    { departure_date: '2027-03-14', price: 3500 },
    { departure_date: '2027-05-01', price: 3900 }
  ] };
  const handler = buildHandler({ loadProgram: async () => multi, fetchImpl: async (...args) => { call = args; return { ok: true }; } });
  const res = await invoke(handler, makeRequest({ body: { program: {
    id: `supabase:${PROGRAM_UUID}`, departureDate: '2027-05-01', fareAmount: 3900
  }, passenger: { ...makeRequest().body.passenger, adults: 2, minors: 1, minorAges: [7] } } }));
  const email = JSON.parse(call[1].body);
  assert.equal(res.statusCode, 200);
  assert.match(email.text, /Fecha de salida o período: 01\/05\/2027/);
  assert.match(email.text, /Tarifa publicada y base tarifaria: USD 3\.900 por persona en doble/);
  assert.match(email.text, /Adultos: 2/);
  assert.match(email.text, /Menores: 1/);
  assert.match(email.text, /Edades de menores: 7/);
  assert.doesNotMatch(email.text, /Total de pasajeros|Total a pagar|Importe total/i);
});

test('no permite enviar varias salidas sin elegir una fecha', async () => {
  let sends = 0;
  const handler = buildHandler({
    loadProgram: async () => ({ ...CANONICAL_PROGRAM, departures: [
      { departure_date: '2027-03-14', price: 3500 }, { departure_date: '2027-05-01', price: 3900 }
    ] }),
    fetchImpl: async () => { sends += 1; return { ok: true }; }
  });
  const res = await invoke(handler, makeRequest({ body: { program: {
    id: `supabase:${PROGRAM_UUID}`, departureDate: null, fareAmount: 3500
  } } }));
  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.error, 'departure_required');
  assert.equal(sends, 0);
});

test('envía períodos publicados como rango sin inventar fecha de salida ni tarifa total', async () => {
  let call;
  const rangeProgram = {
    ...CANONICAL_PROGRAM, date_mode: 'date_range', travel_start_date: '2027-04-01', travel_end_date: '2027-08-31',
    departures: [], price: 3500, price_basis: 'double'
  };
  const handler = buildHandler({ loadProgram: async () => rangeProgram, fetchImpl: async (...args) => { call = args; return { ok: true }; } });
  const res = await invoke(handler, makeRequest({ body: { program: {
    id: `supabase:${PROGRAM_UUID}`, departureDate: null, fareAmount: 3500
  } } }));
  const email = JSON.parse(call[1].body);
  assert.equal(res.statusCode, 200);
  assert.match(email.text, /Fecha de salida o período: 01\/04\/2027 al 31\/08\/2027 \(período de viaje\)/);
  assert.match(email.text, /Tarifa publicada y base tarifaria: USD 3\.500 por persona en doble/);
  assert.doesNotMatch(email.text, /salida puntual|total a pagar/i);
});

test('ignora los datos del programa enviados por el navegador y arma el correo desde el catálogo publicado', async () => {
  let call;
  const handler = buildHandler({ fetchImpl: async (...args) => { call = args; return { ok: true }; } });
  const res = await invoke(handler, makeRequest({ body: { program: {
    id: `supabase:${PROGRAM_UUID}`, title: 'Título falsificado', operatorName: 'Operador falso',
    operatorCode: 'FALSO', departureDate: '2027-03-14', fareAmount: 3500
  } } }));
  const message = JSON.parse(call[1].body);
  assert.equal(res.statusCode, 200);
  assert.match(message.text, /Programa: Japón y Tailandia/);
  assert.match(message.text, /Código del operador: ABC-12/);
  assert.doesNotMatch(message.text, /falsificado|Operador falso|FALSO/);
});

test('omite el código del operador cuando no existe en el programa publicado', async () => {
  let call;
  const handler = buildHandler({
    loadProgram: async () => ({ ...CANONICAL_PROGRAM, operator_code: null }),
    fetchImpl: async (...args) => { call = args; return { ok: true }; }
  });
  const res = await invoke(handler);
  const message = JSON.parse(call[1].body);
  assert.equal(res.statusCode, 200);
  assert.doesNotMatch(message.text, /Código del operador/);
});

test('la solicitud de prueba solo puede marcarse en Preview y aparece claramente identificada', async () => {
  let call;
  const preview = buildHandler({ fetchImpl: async (...args) => { call = args; return { ok: true }; } });
  let res = await invoke(preview, makeRequest({ body: { testMode: true } }));
  let message = JSON.parse(call[1].body);
  assert.equal(res.statusCode, 200);
  assert.match(message.subject, /^PRUEBA DE CONTRATACIÓN/);
  assert.match(message.text, /^PRUEBA DE CONTRATACIÓN/);
  const production = buildHandler({ env: { ...ENV, VERCEL_ENV: 'production' }, fetchImpl: async () => assert.fail('No debe enviar') });
  res = await invoke(production, makeRequest({ headers: { origin: 'https://modorumbo.vercel.app' }, body: { testMode: true } }));
  assert.equal(res.statusCode, 400);
});

test('no permite que el cliente elija destinatario ni registra o devuelve datos personales', async () => {
  const logged = [];
  let call;
  const handler = buildHandler({
    fetchImpl: async (...args) => { call = args; return { ok: true }; },
    log: (...args) => logged.push(args)
  });
  const req = makeRequest({ body: { to: 'attacker@example.test', passenger: { ...makeRequest().body.passenger, fullName: 'Datos Privados' } } });
  const res = await invoke(handler, req);
  const serialized = JSON.stringify({ response: res.payload, logs: logged });
  assert.deepEqual(JSON.parse(call[1].body).to, ['reservas@example.test']);
  assert.equal(serialized.includes('Datos Privados'), false);
  assert.equal(serialized.includes('ana@example.test'), false);
  assert.equal(serialized.includes('server-only-test-key'), false);
});

test('rechaza métodos distintos de POST y tipos de contenido distintos de JSON', async () => {
  const handler = buildHandler({ fetchImpl: async () => assert.fail('No debería enviar') });
  let res = await invoke(handler, makeRequest({ method: 'GET' }));
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'POST');
  res = await invoke(handler, makeRequest({ headers: { 'content-type': 'text/plain' } }));
  assert.equal(res.statusCode, 415);
});

test('limita el origen a producción, preview asignado o localhost de desarrollo', async () => {
  const handler = buildHandler({ fetchImpl: async () => ({ ok: true }) });
  let res = await invoke(handler, makeRequest({ headers: { origin: 'https://evil.example' } }));
  assert.equal(res.statusCode, 403);
  const production = buildHandler({ env: { ...ENV, VERCEL_ENV: 'production' }, fetchImpl: async () => ({ ok: true }) });
  res = await invoke(production, makeRequest({ headers: { origin: 'https://modorumbo.vercel.app' } }));
  assert.equal(res.statusCode, 200);
  res = await invoke(production, makeRequest({ headers: { origin: 'https://preview.modorumbo.vercel.app' } }));
  assert.equal(res.statusCode, 403);
  const local = buildHandler({ env: { ...ENV, VERCEL_ENV: 'development' }, fetchImpl: async () => ({ ok: true }) });
  res = await invoke(local, makeRequest({ headers: { origin: 'http://localhost:4175' } }));
  assert.equal(res.statusCode, 200);
});

test('rechaza solicitudes inválidas, fechas imposibles y formularios enviados demasiado rápido', async (t) => {
  const invalidBodies = [
    { passenger: { fullName: '', email: 'ana@example.test', phone: '+541155551212' } },
    { passenger: { fullName: 'Ana', email: 'no-es-mail', phone: '+541155551212' } },
    { passenger: { fullName: 'Ana', email: 'ana@example.test', phone: '12' } },
    { program: { ...makeRequest().body.program, departureDate: '2027-02-30' } },
    { program: { ...makeRequest().body.program, fareAmount: '3500' } },
    { formStartedAt: NOW - 500 },
    { formStartedAt: 'not-a-timestamp' },
    { passenger: { ...makeRequest().body.passenger, contactConsent: false } },
    { passenger: { ...makeRequest().body.passenger, adults: 20, minors: 1, minorAges: [8] } },
    { passenger: { ...makeRequest().body.passenger, minors: 1, minorAges: [] } },
    { passenger: { ...makeRequest().body.passenger, minors: 1, minorAges: [18] } }
  ];
  for (const body of invalidBodies) {
    await t.test(JSON.stringify(body).slice(0, 60), async () => {
      const handler = buildHandler({ fetchImpl: async () => assert.fail('No debería enviar') });
      const res = await invoke(handler, makeRequest({ body }));
      assert.equal(res.statusCode, 400);
    });
  }
});

test('rechaza JSON inválido y cuerpos mayores al límite', async () => {
  const handler = buildHandler({ fetchImpl: async () => assert.fail('No debería enviar') });
  let res = await invoke(handler, makeRequest({ body: '{not-json' }));
  assert.equal(res.statusCode, 400);
  res = await invoke(handler, makeRequest({ body: 'x'.repeat(12 * 1024 + 1) }));
  assert.equal(res.statusCode, 413);
});

test('honeypot devuelve aceptación silenciosa sin contactar a Resend', async () => {
  let calls = 0;
  const handler = buildHandler({ fetchImpl: async () => { calls += 1; return { ok: true }; } });
  const res = await invoke(handler, makeRequest({ body: { website: 'bot-filled-field' } }));
  assert.equal(res.statusCode, 202);
  assert.deepEqual(res.payload, { ok: false, error: 'request_rejected' });
  assert.equal(calls, 0);
});

test('limita a tres solicitudes por IP en una ventana sin persistir los datos', async () => {
  let calls = 0;
  const handler = buildHandler({ fetchImpl: async () => { calls += 1; return { ok: true }; } });
  for (let index = 0; index < 3; index += 1) assert.equal((await invoke(handler)).statusCode, 200);
  const blocked = await invoke(handler);
  assert.equal(blocked.statusCode, 429);
  assert.equal(calls, 3);
});

test('trata errores del proveedor sin revelar su respuesta ni registrar datos personales', async () => {
  const logged = [];
  const handler = buildHandler({
    fetchImpl: async () => ({ ok: false, status: 401, text: async () => 'secret provider details' }),
    log: (...args) => logged.push(args)
  });
  const res = await invoke(handler);
  assert.equal(res.statusCode, 502);
  assert.deepEqual(res.payload, { ok: false, error: 'email_delivery_failed' });
  assert.deepEqual(logged, [['reservations_email_provider_failure']]);
  assert.equal(JSON.stringify(logged).includes('ana@example.test'), false);
});

test('maneja una falla de red de forma genérica y devuelve 503 si falta configuración', async () => {
  const failure = buildHandler({ fetchImpl: async () => { throw new Error('private provider detail'); } });
  assert.equal((await invoke(failure)).statusCode, 502);
  const noKey = buildHandler({ env: { ...ENV, RESEND_API_KEY: '' }, fetchImpl: async () => assert.fail('No debería enviar') });
  assert.equal((await invoke(noKey)).statusCode, 503);
});

test('aborta una solicitud que supera el tiempo límite de Resend', async () => {
  const handler = createHandler({
    env: ENV,
    now: () => NOW,
    timeoutMs: 5,
    log: () => {},
    loadProgram: async () => CANONICAL_PROGRAM,
    fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
    })
  });
  const res = await invoke(handler);
  assert.equal(res.statusCode, 502);
  assert.deepEqual(res.payload, { ok: false, error: 'email_delivery_failed' });
});

test('consulta solo lectura el programa publicado por ID con la clave pública existente', async () => {
  const { fetchPublishedProgram } = require('../api/reservations.js');
  let call;
  const result = await fetchPublishedProgram(PROGRAM_UUID, async (...args) => {
    call = args;
    return { ok: true, json: async () => [CANONICAL_PROGRAM] };
  });
  const [url, options] = call;
  const parsed = new URL(url);
  assert.equal(options.method, 'GET');
  assert.equal(parsed.searchParams.get('id'), `eq.${PROGRAM_UUID}`);
  assert.equal(parsed.searchParams.get('status'), 'eq.published');
  assert.match(parsed.searchParams.get('select'), /departures/);
  assert.equal(options.headers.apikey, 'sb_publishable_usKC88fBSVnNvb4LTEUXJQ_8lPKVvub');
  assert.equal(result.title, CANONICAL_PROGRAM.title);
});

test('rechaza programa no publicado, salida ajena al registro o tarifa alterada sin enviar correo', async () => {
  let sends = 0;
  const handler = buildHandler({ fetchImpl: async () => { sends += 1; return { ok: true }; } });
  let res = await invoke(handler, makeRequest({ body: { program: { id: `supabase:${PROGRAM_UUID}`, departureDate: '2027-03-15', fareAmount: 3500 } } }));
  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.error, 'departure_not_published');
  res = await invoke(handler, makeRequest({ body: { program: { id: `supabase:${PROGRAM_UUID}`, departureDate: '2027-03-14', fareAmount: 999 } } }));
  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.error, 'fare_changed');
  const unpublished = buildHandler({
    fetchImpl: async () => { sends += 1; return { ok: true }; },
    loadProgram: async () => null
  });
  res = await invoke(unpublished);
  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.error, 'program_not_published');
  assert.equal(sends, 0);
});
