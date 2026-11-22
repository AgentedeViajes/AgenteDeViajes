(function (root, factory) {
  const api = factory(root.fetch && root.fetch.bind(root));
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ModoRumboReservationClient = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaultFetch) {
  'use strict';

  function createReservationClient(fetchImpl = defaultFetch, endpoint = '/api/reservations') {
    let pending = false;

    async function submit(payload) {
      if (pending) return { ignored: true };
      if (typeof fetchImpl !== 'function') return { ok: false, error: 'network_error' };
      pending = true;
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'same-origin',
          cache: 'no-store'
        });
        let result = null;
        try { result = await response.json(); } catch (_) { /* respuestas no JSON se tratan como fallo */ }
        if (!response.ok || !result || result.ok !== true) {
          return { ok: false, error: result && typeof result.error === 'string' ? result.error : 'email_delivery_failed' };
        }
        return { ok: true };
      } catch (_) {
        return { ok: false, error: 'network_error' };
      } finally {
        pending = false;
      }
    }

    return { submit, get pending() { return pending; } };
  }

  return { createReservationClient };
});
