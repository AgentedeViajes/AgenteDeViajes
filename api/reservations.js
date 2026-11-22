'use strict';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
// Same public, read-only project configuration used by public-programs.js.
const SUPABASE_URL = 'https://bwwgrbbovlkihtyhhapt.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_usKC88fBSVnNvb4LTEUXJQ_8lPKVvub';
const PROGRAM_ID_PREFIX = 'supabase:';
const MAX_BODY_BYTES = 12 * 1024;
const MIN_FORM_AGE_MS = 1500;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length > maxLength) return null;
  return cleaned;
}

function isEmail(value) {
  return typeof value === 'string'
    && value.length <= 254
    && !/[\r\n\s]/.test(value)
    && /^[^@]+@[^@.]+(?:\.[^@.]+)+$/.test(value);
}

function senderIsValid(value) {
  if (typeof value !== 'string' || /[\r\n]/.test(value)) return false;
  const match = value.match(/^(?:[^<>]{1,80}\s<([^<>]+)>|([^<>\s]+))$/);
  return Boolean(match && isEmail(match[1] || match[2]));
}

function readBody(req) {
  let body = req.body;
  if (body === undefined || body === null) body = '';
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) return { error: 'too_large' };
    try { body = JSON.parse(body); } catch { return { error: 'invalid_json' }; }
  } else {
    let size;
    try { size = Buffer.byteLength(JSON.stringify(body), 'utf8'); } catch { return { error: 'invalid_json' }; }
    if (size > MAX_BODY_BYTES) return { error: 'too_large' };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'invalid_json' };
  return { body };
}

function validCalendarDate(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function validatePayload(body, now, environment = 'preview') {
  const passenger = body.passenger;
  const program = body.program;
  if (!passenger || typeof passenger !== 'object' || Array.isArray(passenger)
      || !program || typeof program !== 'object' || Array.isArray(program)) return null;

  const fullName = cleanText(passenger.fullName, 120);
  const email = typeof passenger.email === 'string' ? passenger.email.trim() : '';
  const phone = cleanText(passenger.phone, 40);
  const programId = cleanText(program.id, 180);
  const departureDate = program.departureDate;
  const fareAmount = program.fareAmount;
  const formStartedAt = body.formStartedAt;
  const testMode = body.testMode === true;

  if (!fullName || !isEmail(email) || !phone || !/^[+0-9().\- ]{7,40}$/.test(phone)) return null;
  if (!programId || !programId.startsWith(PROGRAM_ID_PREFIX) || !/^[0-9a-f-]{36}$/i.test(programId.slice(PROGRAM_ID_PREFIX.length))) return null;
  if (departureDate !== null && departureDate !== undefined && !validCalendarDate(departureDate)) return null;
  if (fareAmount !== null && (typeof fareAmount !== 'number' || !Number.isFinite(fareAmount) || fareAmount < 0)) return null;
  if (testMode && environment !== 'preview') return null;
  if (!Number.isSafeInteger(formStartedAt) || formStartedAt > now - MIN_FORM_AGE_MS) return null;

  return {
    passenger: { fullName, email, phone },
    program: { id: programId.slice(PROGRAM_ID_PREFIX.length), departureDate: departureDate || null, fareAmount },
    testMode
  };
}

function fetchPublishedProgram(programId, fetchImpl = globalThis.fetch, signal) {
  if (typeof fetchImpl !== 'function') throw new TypeError('No hay transporte HTTP disponible.');
  const query = new URLSearchParams({
    select: '*,departures(*)',
    id: `eq.${programId}`,
    status: 'eq.published'
  });
  return fetchImpl(`${SUPABASE_URL}/rest/v1/programs?${query}`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
    },
    signal
  }).then(async response => {
    if (!response.ok) throw new Error('catalog_unavailable');
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length !== 1) return null;
    const program = rows[0];
    if (String(program.id) !== programId || program.status !== 'published') return null;
    return program;
  });
}

function numericPrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function resolvePublishedFare(program, departureDate) {
  const departures = Array.isArray(program.departures) ? program.departures : [];
  let departure = null;
  if (departureDate) {
    departure = departures.find(item => item.departure_date === departureDate);
    if (!departure) return { error: 'departure_not_published' };
  } else if (departures.some(item => validCalendarDate(item.departure_date))) {
    return { error: 'departure_required' };
  }

  const isDeparturePrice = departure && numericPrice(departure.price) !== null;
  const price = isDeparturePrice ? numericPrice(departure.price)
    : program.price_prefix === 'consult' ? null : numericPrice(program.price);
  return { price, isDeparturePrice: Boolean(isDeparturePrice) };
}

function formatPublishedFare(program, fare) {
  if (fare.price === null) return 'A consultar';
  const currency = cleanText(String(program.currency || 'USD'), 8) || 'USD';
  const amount = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(fare.price);
  const basis = fare.isDeparturePrice ? '' : ({
    double: ' por persona en doble',
    single: ' por persona en single',
    package: ' por paquete'
  }[program.price_basis] || '');
  const prefix = !fare.isDeparturePrice && program.price_prefix === 'from' ? 'Desde ' : '';
  return `${prefix}${currency} ${amount}${basis}`;
}

function formatDateForEmail(value) {
  if (!value) return 'A coordinar';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function allowedOrigin(origin, env) {
  if (!origin) return false;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  if (origin !== parsed.origin) return false;
  if (parsed.protocol !== 'https:' && !(env.VERCEL_ENV !== 'production' && parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) return false;

  if (env.VERCEL_ENV === 'production') return parsed.origin === 'https://modorumbo.vercel.app';
  const knownHosts = [env.VERCEL_URL, env.VERCEL_BRANCH_URL]
    .filter(Boolean)
    .map(value => String(value).replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase());
  if (knownHosts.includes(parsed.host.toLowerCase())) return true;
  return env.VERCEL_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
}

function createHandler(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || Date.now;
  const log = options.log || (event => console.error(event));
  const timeoutMs = options.timeoutMs || 8000;
  const loadProgram = options.loadProgram || ((id, signal) => fetchPublishedProgram(id, options.catalogFetch || globalThis.fetch, signal));
  const limits = new Map();

  function rateLimited(ip, timestamp) {
    for (const [key, record] of limits) {
      if (timestamp - record.startedAt >= RATE_LIMIT_WINDOW_MS) limits.delete(key);
    }
    if (limits.size > 1000) {
      const oldest = [...limits.entries()].sort((a, b) => a[1].startedAt - b[1].startedAt).slice(0, limits.size - 800);
      oldest.forEach(([key]) => limits.delete(key));
    }
    const record = limits.get(ip) || { startedAt: timestamp, count: 0 };
    if (record.count >= RATE_LIMIT_MAX) return true;
    record.count += 1;
    limits.set(ip, record);
    return false;
  }

  return async function reservationsHandler(req, res) {
    const respond = (status, payload) => res.status(status).json(payload);
    if (req.method !== 'POST') {
      res.setHeader?.('Allow', 'POST');
      return respond(405, { ok: false, error: 'method_not_allowed' });
    }
    const contentType = String(req.headers?.['content-type'] || '');
    if (!/^application\/json(?:\s*;|$)/i.test(contentType)) return respond(415, { ok: false, error: 'unsupported_media_type' });
    if (!allowedOrigin(req.headers?.origin, env)) return respond(403, { ok: false, error: 'origin_not_allowed' });

    const read = readBody(req);
    if (read.error === 'too_large') return respond(413, { ok: false, error: 'request_too_large' });
    if (read.error) return respond(400, { ok: false, error: 'invalid_request' });
    if (typeof read.body.website === 'string' && read.body.website.trim()) {
      return respond(202, { ok: true });
    }

    const timestamp = now();
    const payload = validatePayload(read.body, timestamp, env.VERCEL_ENV);
    if (!payload) return respond(400, { ok: false, error: 'invalid_request' });

    const ip = String(req.headers?.['x-real-ip'] || req.headers?.['x-forwarded-for'] || 'unknown').split(',')[0].trim().slice(0, 100);
    if (rateLimited(ip, timestamp)) return respond(429, { ok: false, error: 'too_many_requests' });

    const apiKey = env.RESEND_API_KEY;
    const recipient = env.RESERVATION_EMAIL;
    const sender = env.RESEND_FROM_EMAIL;
    if (!apiKey || !isEmail(recipient) || !senderIsValid(sender) || typeof fetchImpl !== 'function') {
      log('reservations_email_configuration_missing');
      return respond(503, { ok: false, error: 'service_unavailable' });
    }

    let canonicalProgram;
    const catalogController = new AbortController();
    const catalogTimeout = setTimeout(() => catalogController.abort(), timeoutMs);
    try {
      canonicalProgram = await loadProgram(payload.program.id, catalogController.signal);
    } catch {
      log('reservations_catalog_unavailable');
      return respond(503, { ok: false, error: 'catalog_unavailable' });
    } finally {
      clearTimeout(catalogTimeout);
    }
    if (!canonicalProgram) return respond(409, { ok: false, error: 'program_not_published' });
    const canonicalFare = resolvePublishedFare(canonicalProgram, payload.program.departureDate);
    if (canonicalFare.error) return respond(409, { ok: false, error: canonicalFare.error });
    if (canonicalFare.price !== payload.program.fareAmount) return respond(409, { ok: false, error: 'fare_changed' });

    const operatorCode = cleanText(canonicalProgram.operator_code || '', 80);
    const program = {
      id: `supabase:${canonicalProgram.id}`,
      title: cleanText(canonicalProgram.title, 180),
      operatorCode,
      departureDate: formatDateForEmail(payload.program.departureDate),
      fare: formatPublishedFare(canonicalProgram, canonicalFare)
    };
    if (!program.title) return respond(409, { ok: false, error: 'program_not_published' });

    const { passenger } = payload;
    const testPrefix = payload.testMode ? 'PRUEBA DE CONTRATACIÓN — ' : '';
    const text = [
      `${testPrefix}Nueva solicitud de contratación — Modo Rumbo`,
      '',
      'PASAJERO',
      `Nombre: ${passenger.fullName}`,
      `Email: ${passenger.email}`,
      `Teléfono: ${passenger.phone}`,
      '',
      'PROGRAMA',
      `Programa: ${program.title}`,
      `Identificador: ${program.id}`,
      ...(program.operatorCode ? [`Código del operador: ${program.operatorCode}`] : []),
      `Fecha seleccionada: ${program.departureDate}`,
      `Tarifa seleccionada: ${program.fare}`
    ].join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: sender,
          to: [recipient],
          reply_to: passenger.email,
          subject: `${testPrefix}Solicitud de contratación: ${program.title}`,
          text
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        log('reservations_email_provider_failure');
        return respond(502, { ok: false, error: 'email_delivery_failed' });
      }
      return respond(200, { ok: true, message: 'Solicitud enviada correctamente.' });
    } catch {
      log('reservations_email_provider_failure');
      return respond(502, { ok: false, error: 'email_delivery_failed' });
    } finally {
      clearTimeout(timeout);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.validatePayload = validatePayload;
module.exports.fetchPublishedProgram = fetchPublishedProgram;
module.exports.resolvePublishedFare = resolvePublishedFare;
