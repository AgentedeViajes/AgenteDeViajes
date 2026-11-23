(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ModoRumboTravelFavorites = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'modoRumbo:travel-favorites:v1';

  function isValidId(value) {
    if (typeof value !== 'string' || value.length > 200 || value !== value.trim() || /[\u0000-\u001f\u007f]/.test(value)) return false;
    const separator = value.indexOf(':');
    if (separator < 1 || separator === value.length - 1) return false;
    const namespace = value.slice(0, separator);
    const identifier = value.slice(separator + 1);
    if (namespace === 'supabase') return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    if (namespace === 'static') return /^[a-z0-9-]+:[a-z0-9-]+(?:-[1-9][0-9]*)?$/.test(identifier);
    return ['loaded', 'europa-medida', 'lowcost'].includes(namespace) && /^[A-Za-z0-9._-]+$/.test(identifier);
  }

  function normalizeIds(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value.filter(id => {
      if (!isValidId(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function isAvailableProgram(program) {
    if (!program || !isValidId(program.id) || program.source === 'custom personalizado' || program.published === false) return false;
    if (String(program.source || '').toLowerCase() === 'supabase') return program.status === 'published';
    return true;
  }

  function create(storage, key) {
    const storageKey = key || STORAGE_KEY;
    let memoryIds = null;

    function getIds() {
      if (!storage || typeof storage.getItem !== 'function') return memoryIds ? [...memoryIds] : [];
      try {
        const raw = storage.getItem(storageKey);
        if (raw == null) return memoryIds ? [...memoryIds] : [];
        const parsed = JSON.parse(raw);
        const ids = normalizeIds(parsed);
        memoryIds = ids;
        if (!Array.isArray(parsed) || ids.length !== parsed.length) {
          try { storage.setItem(storageKey, JSON.stringify(ids)); } catch (_) { /* Storage can be read-only. */ }
        }
        return ids;
      } catch (_) {
        try { storage.removeItem(storageKey); } catch (_) { /* Ignore unavailable storage. */ }
        return memoryIds ? [...memoryIds] : [];
      }
    }

    function save(ids) {
      const clean = normalizeIds(ids);
      memoryIds = clean;
      try {
        if (!storage || typeof storage.setItem !== 'function') return false;
        storage.setItem(storageKey, JSON.stringify(clean));
        return true;
      } catch (_) { return false; }
    }

    function has(id) { return isValidId(id) && getIds().includes(id); }

    function toggle(id) {
      if (!isValidId(id)) return {changed:false, active:false, persisted:false};
      const ids = getIds();
      const index = ids.indexOf(id);
      const active = index < 0;
      if (active) ids.push(id);
      else ids.splice(index, 1);
      return {changed:true, active, persisted:save(ids)};
    }

    function available(programs) {
      const ids = new Set(getIds());
      return (programs || []).filter(program => isAvailableProgram(program) && ids.has(program.id));
    }

    function clear() {
      memoryIds = [];
      try {
        if (!storage || typeof storage.removeItem !== 'function') return false;
        storage.removeItem(storageKey);
        return true;
      } catch (_) { return false; }
    }

    return {getIds, has, toggle, available, clear};
  }

  function buttonHtml(id, active, name) {
    if (!isValidId(id)) return '';
    const label = active ? `Quitar ${name || 'viaje'} de favoritos` : `Guardar ${name || 'viaje'} en favoritos`;
    const safeId = String(id).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const safeName = String(name || 'viaje').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const safeLabel = String(label).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    return `<button class="trip-favorite-button${active ? ' is-favorite' : ''}" type="button" data-toggle-favorite="${safeId}" data-favorite-name="${safeName}" aria-label="${safeLabel}" aria-pressed="${Boolean(active)}" title="${safeLabel}"><i class="${active ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i></button>`;
  }

  return {STORAGE_KEY, isValidId, normalizeIds, isAvailableProgram, create, buttonHtml};
});
