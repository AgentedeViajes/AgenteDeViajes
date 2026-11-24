(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ModoRumboAdvancedSearchUI = api;
  if (root.document) api.init(root.document, root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-AR').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function isAmbiguousRoute(value) {
    return /[\/→➜–—]|\s-\s|\s>\s/.test(String(value || ''));
  }

  function sourceValues(value, kind) {
    if (Array.isArray(value)) return value.map(item => ({ value: item, ambiguous: false }));
    const text = String(value || '').trim();
    if (!text) return [];
    if (kind === 'countries') return text.split(/[,;]+/).map(item => ({ value: item, ambiguous: false }));
    // A scalar destination may be a route written as a comma-separated phrase.
    // Keep it whole and omit it for manual review instead of inferring stops.
    return [{ value: text, ambiguous: /[,;]/.test(text) || isAmbiguousRoute(text) }];
  }

  function collectOptions(programs, kind) {
    const sourceKey = kind === 'countries' ? 'countries' : 'destinations';
    const entries = new Map();
    const excludedRoutes = new Set();
    (Array.isArray(programs) ? programs : []).forEach(program => {
      sourceValues(program && program[sourceKey], kind).forEach(entry => {
        const raw = entry.value;
        const label = String(raw || '').replace(/\s+/g, ' ').trim();
        const key = normalize(label);
        if (!key || label.length > 90) return;
        if (kind === 'destinations' && (entry.ambiguous || isAmbiguousRoute(label))) {
          excludedRoutes.add(key);
          return;
        }
        if (!entries.has(key)) entries.set(key, label);
      });
    });
    return { options: [...entries.values()].sort((a, b) => a.localeCompare(b, 'es')), excludedRoutes: [...excludedRoutes] };
  }

  function filterSuggestions(options, query, selected = [], limit = 8) {
    const prefix = normalize(query);
    if (!prefix) return [];
    const selectedKeys = new Set(selected.map(normalize));
    return (Array.isArray(options) ? options : [])
      .filter(option => normalize(option).startsWith(prefix) && !selectedKeys.has(normalize(option)))
      .slice(0, limit);
  }

  function createSelection(options = []) {
    const allowed = new Map(options.map(value => [normalize(value), value]));
    const selected = [];
    return {
      add(value) {
        const key = normalize(value);
        if (!key || !allowed.has(key)) return { ok: false, reason: 'invalid' };
        if (selected.some(item => normalize(item) === key)) return { ok: false, reason: 'duplicate' };
        selected.push(allowed.get(key));
        return { ok: true };
      },
      remove(value) {
        const key = normalize(value);
        const index = selected.findIndex(item => normalize(item) === key);
        if (index < 0) return false;
        selected.splice(index, 1);
        return true;
      },
      clear() { selected.splice(0, selected.length); },
      values() { return [...selected]; },
      replaceOptions(nextOptions) {
        const next = new Map(nextOptions.map(value => [normalize(value), value]));
        for (let index = selected.length - 1; index >= 0; index -= 1) {
          const replacement = next.get(normalize(selected[index]));
          if (replacement) selected[index] = replacement;
          else selected.splice(index, 1);
        }
        allowed.clear();
        next.forEach((value, key) => allowed.set(key, value));
      }
    };
  }

  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const QUICK_FILTERS = [
    { id: 'grupal', label: 'Grupales' },
    { id: 'sin-aereo', label: 'Tours sin aéreo' },
    { id: 'personalizado', label: 'A medida' },
    { id: 'low-cost', label: 'Low Cost' },
    { id: 'lujo', label: 'Lujo' }
  ];

  function valuesOf(value, kind) {
    if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
    const text = String(value || '').trim();
    if (!text) return [];
    return kind === 'countries' ? text.split(/[,;]+/).map(item => item.trim()).filter(Boolean) : [text];
  }

  function monthOfDate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? MONTHS[Number(match[2]) - 1] || '' : '';
  }

  function dateMatchesMonth(program, month) {
    if (!month) return true;
    const target = normalize(month);
    const possibleMonths = (program && program.months || []).map(value => normalize(value));
    if (possibleMonths.includes(target)) return true;
    const dates = (program && (program.searchDepartures || program.departureDates) || [])
      .map(item => typeof item === 'string' ? item : item && (item.date || item.departure_date))
      .filter(Boolean);
    return dates.some(date => normalize(MONTHS[Number(String(date).slice(5, 7)) - 1] || '') === target);
  }

  function filterPrograms(programs, criteria = {}) {
    const name = normalize(criteria.name || criteria.query || '');
    const countries = (criteria.countries || []).map(normalize).filter(Boolean);
    const destinations = (criteria.destinations || []).map(normalize).filter(Boolean);
    const month = criteria.month || '';
    const type = normalize(criteria.type || '');
    const seen = new Set();
    return (Array.isArray(programs) ? programs : []).filter(program => {
      if (!program || !program.id || program.published === false || (program.status && program.status !== 'published')) return false;
      const id = String(program.id);
      if (seen.has(id)) return false;
      if (name && !normalize(program.name || program.title).includes(name)) return false;
      const programCountries = new Set(valuesOf(program.countries, 'countries').map(normalize));
      if (countries.some(value => !programCountries.has(value))) return false;
      const programDestinations = new Set(valuesOf(program.destinations, 'destinations')
        .filter(value => !isAmbiguousRoute(value) && !/[;,]/.test(value)).map(normalize));
      if (destinations.some(value => !programDestinations.has(value))) return false;
      if (!dateMatchesMonth(program, month)) return false;
      const programTypes = new Set(valuesOf(program.types || program.travel_types || [], 'types').map(normalize));
      if (type && !programTypes.has(type)) return false;
      seen.add(id);
      return true;
    });
  }

  function matchingDeparture(program, month) {
    if (!month) return null;
    const target = normalize(month);
    return (program && program.searchDepartures || []).find(item => normalize(item.month || monthOfDate(item.date)) === target) || null;
  }

  function quickFilterKeys(program) {
    const rawTypes = ['types','travel_types','experienceTypes'].flatMap(key => {
      const value = program && program[key];
      return Array.isArray(value) ? value : String(value || '').split(/[,;|]+/);
    });
    const types = new Set(rawTypes.map(value => normalize(value).replace(/ /g, '-')));
    const flightType = normalize(program && (program.flight_type || program.flightType)).replace(/ /g, '-');
    if (flightType === 'without-flight') types.add('sin-aereo');
    return QUICK_FILTERS.filter(filter => types.has(filter.id)).map(filter => filter.id);
  }

  function filterQuickCategories(programs, active = QUICK_FILTERS.map(filter => filter.id)) {
    const selected = new Set((active || []).map(value => normalize(value).replace(/ /g, '-')));
    if (!selected.size) return [];
    const seen = new Set();
    return (Array.isArray(programs) ? programs : []).filter(program => {
      const id = program && program.id != null ? String(program.id) : '';
      if (id && seen.has(id)) return false;
      if (!quickFilterKeys(program).some(key => selected.has(key))) return false;
      if (id) seen.add(id);
      return true;
    });
  }

  function numberFromPrice(value) {
    if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
    const match = String(value || '').match(/[0-9][0-9.,\s]*/);
    if (!match) return null;
    let amount = match[0].replace(/\s/g, '');
    const comma = amount.lastIndexOf(',');
    const dot = amount.lastIndexOf('.');
    if (comma >= 0 && dot >= 0) {
      const decimalIndex = Math.max(comma, dot);
      const decimals = amount.length - decimalIndex - 1;
      amount = decimals > 0 && decimals <= 2
        ? `${amount.slice(0, decimalIndex).replace(/[.,]/g, '')}.${amount.slice(decimalIndex + 1)}`
        : amount.replace(/[.,]/g, '');
    } else if (comma >= 0 || dot >= 0) {
      const index = Math.max(comma, dot);
      const decimals = amount.length - index - 1;
      amount = decimals > 0 && decimals <= 2
        ? `${amount.slice(0, index).replace(/[.,]/g, '')}.${amount.slice(index + 1)}`
        : amount.replace(/[.,]/g, '');
    }
    const number = Number(amount);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function priceCurrency(value, fallback = '') {
    const text = typeof value === 'string' ? value.toUpperCase() : '';
    return text.match(/\b(USD|EUR|ARS|GBP)\b/)?.[1] || fallback || 'USD';
  }

  function localIsoDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function sortPriceCandidates(program, month, today) {
    const exactDepartures = (program && program.searchDepartures || []).filter(item => item && /^\d{4}-\d{2}-\d{2}$/.test(String(item.date || '')));
    const departures = (program && program.searchDepartures || []).filter(item =>
      item && item.date && item.date >= today && (!month || normalize(item.month || monthOfDate(item.date)) === normalize(month))
    );
    const departurePrices = departures.map(item => ({
      departure: item,
      value: numberFromPrice(item.price),
      currency: priceCurrency(item.price, program.currency || '')
    })).filter(item => item.value != null);

    if (departurePrices.length) {
      const currency = priceCurrency(program.currency, departurePrices[0].currency);
      const basis = normalize(program.priceBasis || program.price_basis || program.comparison?.priceBasis || '');
      return departurePrices.filter(item => item.currency === currency).map(item => ({ ...item, basis }));
    }
    if (month && exactDepartures.length) return [];
    const base = numberFromPrice(program && (program.priceFrom ?? program.priceText));
    return base == null ? [] : [{
      departure: null,
      value: base,
      currency: priceCurrency(program.priceText, program.currency || ''),
      basis: normalize(program.priceBasis || program.price_basis || program.comparison?.priceBasis || '')
    }];
  }

  function sortPrograms(programs, sort = 'default', month = '', today = localIsoDate()) {
    const rows = (Array.isArray(programs) ? programs : []).map((program, index) => ({
      program, index, departure: null, priceValue: null, currency: '', basis: '', date: ''
    }));
    if (sort === 'default') return rows;

    if (sort === 'price-asc' || sort === 'price-desc') {
      rows.forEach(row => {
        const candidates = sortPriceCandidates(row.program, month, today);
        if (!candidates.length) return;
        const currenciesInOrder = [...new Set(candidates.map(item => `${item.currency}\u0000${item.basis}`))];
        const bucketKey = currenciesInOrder[0];
        const comparable = candidates.filter(item => `${item.currency}\u0000${item.basis}` === bucketKey);
        const chosen = comparable.reduce((best, item) => !best || (sort === 'price-asc' ? item.value < best.value : item.value > best.value) ? item : best, null);
        if (chosen) {
          row.departure = chosen.departure;
          row.priceValue = chosen.value;
          row.currency = chosen.currency;
          row.basis = chosen.basis;
          row.date = chosen.departure && chosen.departure.date || '';
        }
      });
      // Currency and tariff bases are separate groups. Their relative order
      // follows the catalog; prices are compared only inside the same group.
      const bucketOrder = new Map();
      rows.forEach(row => {
        if (row.priceValue == null) return;
        const key = `${row.currency}\u0000${row.basis}`;
        if (!bucketOrder.has(key)) bucketOrder.set(key, bucketOrder.size);
      });
      return rows.sort((a, b) => {
        if (a.priceValue == null || b.priceValue == null) return a.priceValue == null ? (b.priceValue == null ? a.index - b.index : 1) : -1;
        const aKey = `${a.currency}\u0000${a.basis}`;
        const bKey = `${b.currency}\u0000${b.basis}`;
        if (aKey !== bKey) return bucketOrder.get(aKey) - bucketOrder.get(bKey) || a.index - b.index;
        return (sort === 'price-asc' ? a.priceValue - b.priceValue : b.priceValue - a.priceValue) || a.index - b.index;
      });
    }

    if (sort === 'departure-asc' || sort === 'departure-desc') {
      rows.forEach(row => {
        const candidates = (row.program && row.program.searchDepartures || [])
          .filter(item => item && item.date && item.date >= today && (!month || normalize(item.month || monthOfDate(item.date)) === normalize(month)))
          .map(item => ({ ...item, isoDate: String(item.date) }))
          .filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.isoDate))
          .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
        const chosen = sort === 'departure-desc' ? candidates.at(-1) : candidates[0];
        if (chosen) {
          row.departure = chosen;
          row.date = chosen.isoDate;
        }
      });
      return rows.sort((a, b) => {
        if (!a.date || !b.date) return a.date ? -1 : b.date ? 1 : a.index - b.index;
        return (sort === 'departure-asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.index - b.index;
      });
    }
    return rows;
  }

  function createSelector(document, config) {
    const input = document.getElementById(config.inputId);
    const chips = document.getElementById(config.chipsId);
    const list = document.getElementById(config.listId);
    const status = document.getElementById(config.statusId);
    if (!input || !chips || !list || !status) return null;

    let options = [];
    let visibleOptions = [];
    let activeIndex = -1;
    const selection = createSelection();

    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      activeIndex = -1;
    }

    function renderChips() {
      chips.replaceChildren();
      selection.values().forEach(value => {
        const chip = document.createElement('span');
        chip.className = 'advanced-selected-chip';
        const label = document.createElement('span');
        label.textContent = value;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'advanced-chip-remove';
        remove.setAttribute('aria-label', `Quitar ${value}`);
        remove.textContent = '×';
        remove.addEventListener('click', () => {
          selection.remove(value);
          renderChips();
          renderSuggestions();
          input.focus();
        });
        chip.append(label, remove);
        chips.append(chip);
      });
    }

    function renderSuggestions() {
      const query = input.value;
      visibleOptions = filterSuggestions(options, query, selection.values());
      list.replaceChildren();
      activeIndex = -1;
      if (!normalize(query)) {
        close();
        status.textContent = '';
        return;
      }
      if (!visibleOptions.length) {
        close();
        status.textContent = 'No hay coincidencias disponibles.';
        return;
      }
      visibleOptions.forEach((value, index) => {
        const option = document.createElement('li');
        option.id = `${config.listId}-option-${index}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.textContent = value;
        option.addEventListener('pointerdown', event => event.preventDefault());
        option.addEventListener('click', () => select(index));
        list.append(option);
      });
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      status.textContent = `${visibleOptions.length} coincidencia${visibleOptions.length === 1 ? '' : 's'}. Usá las flechas y Enter para elegir.`;
    }

    function setActive(index) {
      if (!visibleOptions.length) return;
      activeIndex = (index + visibleOptions.length) % visibleOptions.length;
      [...list.children].forEach((option, optionIndex) => {
        const active = optionIndex === activeIndex;
        option.setAttribute('aria-selected', String(active));
        if (active) input.setAttribute('aria-activedescendant', option.id);
      });
    }

    function select(index) {
      const value = visibleOptions[index];
      if (!value) return;
      selection.add(value);
      input.value = '';
      renderChips();
      close();
      status.textContent = `${value} agregado. Podés elegir otro ${config.noun}.`;
      input.focus();
    }

    input.addEventListener('input', renderSuggestions);
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' && visibleOptions.length) {
        event.preventDefault(); setActive(activeIndex + 1);
      } else if (event.key === 'ArrowUp' && visibleOptions.length) {
        event.preventDefault(); setActive(activeIndex < 0 ? visibleOptions.length - 1 : activeIndex - 1);
      } else if (event.key === 'Enter' && visibleOptions.length) {
        event.preventDefault(); select(activeIndex < 0 ? 0 : activeIndex);
      } else if (event.key === 'Escape') {
        close();
      }
    });
    document.addEventListener('pointerdown', event => {
      if (!event.target.closest(`[data-search-selector="${config.kind}"]`)) close();
    });

    return {
      setOptions(nextOptions) {
        options = Array.isArray(nextOptions) ? nextOptions : [];
        selection.replaceOptions(options);
        renderChips();
        renderSuggestions();
      },
      values: () => selection.values(),
      clear() {
        input.value = '';
        selection.clear();
        renderChips();
        close();
        status.textContent = '';
      },
      close
    };
  }

  function init(document, root) {
    if (!document.getElementById('advancedSearchPreview') || document.documentElement.dataset.advancedSearchBound) return;
    document.documentElement.dataset.advancedSearchBound = 'true';
    const countrySelector = createSelector(document, {
      kind: 'countries', inputId: 'advancedCountriesInput', chipsId: 'advancedCountriesSelected',
      listId: 'advancedCountriesOptions', statusId: 'advancedCountriesStatus', noun: 'país'
    });
    const destinationSelector = createSelector(document, {
      kind: 'destinations', inputId: 'advancedDestinationsInput', chipsId: 'advancedDestinationsSelected',
      listId: 'advancedDestinationsOptions', statusId: 'advancedDestinationsStatus', noun: 'lugar'
    });
    function applyCatalog(programs) {
      const countries = collectOptions(programs, 'countries');
      const destinations = collectOptions(programs, 'destinations');
      countrySelector?.setOptions(countries.options);
      destinationSelector?.setOptions(destinations.options);
    }

    root.addEventListener('modo-rumbo:catalog-geography-updated', event => applyCatalog(event.detail?.programs));
    root.addEventListener('modo-rumbo:clear-search-filters', () => {
      countrySelector?.clear();
      destinationSelector?.clear();
    });
    if (Array.isArray(root.travelCatalog)) applyCatalog(root.travelCatalog);
    else {
      const countryStatus = document.getElementById('advancedCountriesStatus');
      const destinationStatus = document.getElementById('advancedDestinationsStatus');
      if (countryStatus) countryStatus.textContent = 'Cargando opciones del catálogo…';
      if (destinationStatus) destinationStatus.textContent = 'Cargando opciones del catálogo…';
    }
    const selectors = { countrySelector, destinationSelector };
    root.modoRumboAdvancedSearchSelectors = selectors;
    return selectors;
  }

  return { normalize, isAmbiguousRoute, collectOptions, filterSuggestions, createSelection, filterPrograms, matchingDeparture, monthOfDate, QUICK_FILTERS, quickFilterKeys, filterQuickCategories, sortPrograms, init };
});
