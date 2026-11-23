(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ModoRumboTravelComparison = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'modoRumbo:travel-comparison:v1';
  const MAX_PROGRAMS = 3;

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
      if (!isValidId(id) || seen.has(id) || seen.size >= MAX_PROGRAMS) return false;
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
      let raw;
      try { raw = storage.getItem(storageKey); }
      catch (_) { return memoryIds ? [...memoryIds] : []; }
      if (raw == null) return memoryIds ? [...memoryIds] : [];
      try {
        const parsed = JSON.parse(raw);
        const ids = normalizeIds(parsed);
        memoryIds = ids;
        if (!Array.isArray(parsed) || ids.length !== parsed.length) {
          try { storage.setItem(storageKey, JSON.stringify(ids)); } catch (_) { /* Storage may be read-only. */ }
        }
        return [...ids];
      } catch (_) {
        try { storage.removeItem(storageKey); } catch (_) { /* Ignore unavailable storage. */ }
        memoryIds = [];
        return [];
      }
    }
    function save(ids) {
      memoryIds = normalizeIds(ids);
      try {
        if (!storage || typeof storage.setItem !== 'function') return false;
        storage.setItem(storageKey, JSON.stringify(memoryIds));
        return true;
      } catch (_) { return false; }
    }
    function has(id) { return isValidId(id) && getIds().includes(id); }
    function toggle(id) {
      if (!isValidId(id)) return {changed:false,active:false,persisted:false,reason:'invalid'};
      const ids = getIds();
      const index = ids.indexOf(id);
      if (index >= 0) {
        ids.splice(index, 1);
        return {changed:true,active:false,persisted:save(ids),reason:null};
      }
      if (ids.length >= MAX_PROGRAMS) return {changed:false,active:false,persisted:false,reason:'limit'};
      ids.push(id);
      return {changed:true,active:true,persisted:save(ids),reason:null};
    }
    function available(programs) {
      const ids = new Set(getIds());
      return (programs || []).filter(program => isAvailableProgram(program) && ids.has(program.id));
    }
    function reconcile(programs) {
      const availableIds = new Set((programs || []).filter(isAvailableProgram).map(program => program.id));
      return save(getIds().filter(id => availableIds.has(id)));
    }
    function clear() {
      memoryIds = [];
      try {
        if (!storage || typeof storage.removeItem !== 'function') return false;
        storage.removeItem(storageKey);
        return true;
      } catch (_) { return false; }
    }
    return {getIds,has,toggle,available,reconcile,clear};
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function values(value) {
    if (Array.isArray(value)) return value.flat(Infinity).filter(item => item != null && String(item).trim() !== '').map(item => String(item).trim());
    return value == null || String(value).trim() === '' ? [] : [String(value).trim()];
  }

  function renderCard(program) {
    const info = program.comparison || {};
    const image = info.image || program.image || '';
    const name = program.name || 'Programa de viaje';
    const field = (label, value) => {
      const items = values(value);
      return `<div class="comparison-field"><dt>${escapeHtml(label)}</dt><dd>${items.length ? items.map(item => `<span>${escapeHtml(item)}</span>`).join('') : '<span class="comparison-unreported">No informado</span>'}</dd></div>`;
    };
    const imageHtml = image
      ? `<img class="comparison-image" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy">`
      : '<div class="comparison-image comparison-image-empty" aria-label="Imagen no informada"><i class="far fa-image" aria-hidden="true"></i><span>Imagen no informada</span></div>';
    return `<article class="comparison-card" data-comparison-card="${escapeHtml(program.id)}">
      <div class="comparison-card-media">${imageHtml}<button type="button" class="comparison-remove" data-remove-comparison="${escapeHtml(program.id)}" aria-label="Quitar ${escapeHtml(name)} del comparador" title="Quitar del comparador">×</button></div>
      <div class="comparison-card-content"><h3>${escapeHtml(name)}</h3>
        <button type="button" class="comparison-open-program" data-open-trip="${escapeHtml(program.id)}">Ver ficha del programa <i class="fas fa-arrow-right" aria-hidden="true"></i></button>
        <dl class="comparison-fields">
          ${field('Destinos o recorrido', values(info.destinations).length ? info.destinations : info.route)}
          ${field('Duración', info.duration || program.duration)}
          ${field(info.availabilityLabel || 'Fechas de salida', info.availability)}
          ${field(info.priceLabel || 'Precio publicado', info.priceText || program.priceText)}
          ${field('Base tarifaria', info.priceBasis)}
          ${field('Servicios incluidos', info.included)}
          ${field('Servicios no incluidos', info.excluded)}
          ${field('Código de operador', info.operatorCode || program.operator_code)}
        </dl>
      </div>
    </article>`;
  }

  function buttonHtml(id, name, active) {
    if (!isValidId(id)) return '';
    const label = active ? `Quitar ${name || 'viaje'} del comparador` : `Agregar ${name || 'viaje'} a comparar`;
    const safe = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    return `<button type="button" class="trip-compare-button${active ? ' is-compared' : ''}" data-toggle-compare="${safe(id)}" aria-label="${safe(label)}" aria-pressed="${Boolean(active)}" title="${safe(label)}"><i class="fas fa-scale-balanced" aria-hidden="true"></i><span>Comparar</span></button>`;
  }

  return {STORAGE_KEY,MAX_PROGRAMS,isValidId,normalizeIds,isAvailableProgram,create,renderCard,buttonHtml};
});
