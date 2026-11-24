(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ModoRumboDestinationSuggestions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const GENERIC = new Set([
    'a bordo', 'aeropuerto', 'aeroparque', 'america', 'arribo', 'dia libre', 'dia de vuelo',
    'dia de llegada', 'dia de salida', 'dia de traslado', 'escala', 'excursion', 'excursion opcional',
    'aerparque', 'ezeiza', 'ferry', 'hotel', 'inicio del viaje', 'llegada',
    'noche a bordo', 'noche en vuelo', 'salida', 'traslado',
    'visita panoramica', 'vuelo', 'vuelo internacional', 'vuelo domestico', 'bus', 'tren', 'avion', 'barco'
  ]);
  const PREFIX = /^(?:(?:d[ií]a|dia)\s*\d{1,2}\s*[:.)—–-]?\s*|(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s*,?\s*(?:\d{1,2}\s*[:.)-]?\s*)?)/i;
  const ROUTE_SPLIT = /\s*(?:\/|→|➜|->|\s+[–—-]\s+)\s*/;
  const REVIEW_PATTERNS = [
    { pattern: /\b(?:escala|conexi[oó]n|v[ií]a|via|a bordo|vuelo|aeropuerto)\b/i, label: 'Posible escala o conexión: confirmar si se visita.' },
    { pattern: /\bexcursi[oó]n(?:es)?\s+opcional(?:es)?\b/i, label: 'Excursión opcional: confirmar si forma parte del recorrido.' },
    { pattern: /\b(?:traslado|transfer|en tr[aá]nsito|por carretera|en tren)\b/i, label: 'Posible traslado: confirmar si es un destino visitado.' }
  ];
  const NON_DESTINATION_ALIASES = new Set(['aerparque', 'aeroparque', 'aerparque', 'bsas', 'buenos aires', 'ezeiza']);
  const ACTION_PREFIX = /^(?:(?:visita(?:\s+panor[aá]mica)?|city\s*tour|recorrido|safari|llegada|noche|pernocte|traslado|transfer|vuelo|escala|conexi[oó]n|excursi[oó]n(?:\s+opcional)?|d[ií]a\s+libre)\s+(?:a|en|por|hacia|v[ií]a|via|de)\s+)+/i;
  const ACTION_SUFFIX = /\s+(?:d[ií]a\s+libre|visita\s+panor[aá]mica|excursi[oó]n\s+opcional|por\s+carretera|en\s+vuelo|a\s+bordo|v[ií]a|via).*$/i;

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-AR').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function listValues(value) {
    if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
    return String(value || '').split(/[,;]+/).map(item => item.trim()).filter(Boolean);
  }

  function isCompositeRoute(value) {
    return /\/|→|➜|->|\s+[–—-]\s+|[\p{L}\d][–—-][\p{L}\d]/u.test(String(value || ''));
  }

  function dictionaryFrom(programs) {
    const entries = new Map();
    (Array.isArray(programs) ? programs : []).forEach(program => {
      listValues(program && program.destinations).forEach(value => {
        const key = normalize(value);
        if (!key || key.length > 70 || isCompositeRoute(value) || GENERIC.has(key)) return;
        if (!entries.has(key)) entries.set(key, value.replace(/\s+/g, ' ').trim());
      });
    });
    return entries;
  }

  function countryKeys(programs) {
    const keys = new Set();
    (Array.isArray(programs) ? programs : []).forEach(program => {
      listValues(program && program.countries).forEach(value => {
        const key = normalize(value);
        if (key) keys.add(key);
      });
    });
    return keys;
  }

  function titleOf(day) {
    return String(day && typeof day === 'object' ? day.title || '' : day || '').replace(/\s+/g, ' ').trim();
  }

  function titleText(title) {
    return title.replace(PREFIX, '').replace(/^[:.,\s-]+/, '').trim();
  }

  function tokenBoundaryMatch(normalizedTitle, phrase) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^| )${escaped}(?:$| )`).test(normalizedTitle);
  }

  function warningLabels(title) {
    const labels = REVIEW_PATTERNS.filter(item => item.pattern.test(title)).map(item => item.label);
    if (isCompositeRoute(title)) labels.push('El título presenta una ruta o varios tramos: confirmar qué lugares se visitan.');
    return labels;
  }

  function looksLikePlace(value) {
    const key = normalize(value);
    if (!key || key.length < 3 || key.length > 70 || GENERIC.has(key)
      || [...GENERIC].some(generic => generic.includes(' ') && key.startsWith(`${generic} `))) return false;
    const words = key.split(' ');
    if (words.length > 5 || words.some(word => GENERIC.has(word))) return false;
    return words.some(word => word.length >= 3);
  }

  function cleanUnknownCandidate(value) {
    return String(value || '').replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ')
      .replace(ACTION_PREFIX, '').replace(ACTION_SUFFIX, '')
      .replace(/^(?:ezeiza|buenos aires)\s*[:.,]?\s*/i, text => text.trim())
      .replace(/\s*[,;:]+\s*/g, ' ').replace(/[.!?()[\]{}"'“”‘’]+$/g, '')
      .replace(/^[.!?()[\]{}"'“”‘’]+/g, '').trim();
  }

  function unknownCandidates(title) {
    const body = titleText(title);
    if (!body) return [];
    const fragments = body.split(ROUTE_SPLIT).map(cleanUnknownCandidate).filter(Boolean);
    const result = new Map();
    fragments.forEach(fragment => {
      const candidate = cleanUnknownCandidate(fragment);
      const key = normalize(candidate);
      if (looksLikePlace(candidate) && key && !result.has(key)) result.set(key, candidate);
    });
    // Extract only names directly attached to explicit location cues. This is
    // intentionally a review queue, not a named-entity detector or auto-save.
    const cue = /\b(?:visita(?:\s+panor[aá]mica)?|city\s*tour|recorrido|safari|llegada|noche|pernocte|traslado|transfer|vuelo|escala|conexi[oó]n|excursi[oó]n(?:\s+opcional)?|d[ií]a\s+libre)\s+(?:a|en|por|hacia|v[ií]a|via|de)\s+([^,;:()]+?)(?=$|[,;:()]|\s+(?:y|con|para|durante|seguimos|continuamos|regreso|retorno)\b)/giu;
    for (const match of title.matchAll(cue)) {
      const candidate = cleanUnknownCandidate(match[1]);
      const key = normalize(candidate);
      if (looksLikePlace(candidate) && key && !result.has(key)) result.set(key, candidate);
    }
    return [...result.entries()].map(([key, name]) => ({ key, name }));
  }

  function containsKnownPhrase(candidateKey, dictionary) {
    for (const key of dictionary.keys()) {
      if (tokenBoundaryMatch(candidateKey, key)) return true;
    }
    return false;
  }

  function suggest(program, dictionaryPrograms) {
    const dictionary = dictionaryFrom(dictionaryPrograms);
    const countries = countryKeys(dictionaryPrograms);
    const existing = new Set(listValues(program && program.destinations).map(normalize));
    const days = Array.isArray(program && (program.itinerary || program.itinerary_days))
      ? (program.itinerary || program.itinerary_days) : [];
    const found = new Map();

    days.forEach((day, index) => {
      const title = titleOf(day);
      if (!title) return;
      const normalizedTitle = normalize(title);
      const warnings = warningLabels(title);
      dictionary.forEach((displayName, key) => {
        if (!tokenBoundaryMatch(normalizedTitle, key)) return;
        const suggestion = found.get(key) || {
          id: `known:${key}`, name: displayName, kind: 'known', selected: false,
          alreadyLoaded: existing.has(key), reviewWarnings: [], sources: []
        };
        warnings.forEach(warning => { if (!suggestion.reviewWarnings.includes(warning)) suggestion.reviewWarnings.push(warning); });
        if (!suggestion.sources.some(source => source.title === title && source.day === index + 1)) {
          suggestion.sources.push({ day: Number(day && day.position) || index + 1, title });
        }
        found.set(key, suggestion);
      });

      unknownCandidates(title).forEach(({ key, name }) => {
        if (dictionary.has(key) || containsKnownPhrase(key, dictionary) || countries.has(key)
          || NON_DESTINATION_ALIASES.has(key) || found.has(key)) return;
        const suggestion = found.get(key) || {
          id: `unknown:${key}`, name, kind: 'unknown', selected: false,
          alreadyLoaded: existing.has(key), confidence: 'low',
          reviewWarnings: ['No aparece en el diccionario de destinos confirmados; requiere revisión manual.'], sources: []
        };
        warnings.forEach(warning => { if (!suggestion.reviewWarnings.includes(warning)) suggestion.reviewWarnings.push(warning); });
        if (!suggestion.sources.some(source => source.title === title && source.day === index + 1)) {
          suggestion.sources.push({ day: Number(day && day.position) || index + 1, title });
        }
        found.set(key, suggestion);
      });
    });
    return [...found.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  function mergeSelected(existingValues, suggestions, selectedIds) {
    const values = listValues(existingValues);
    const seen = new Set(values.map(normalize));
    const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
    (Array.isArray(suggestions) ? suggestions : []).forEach(item => {
      if (!item || !selected.has(item.id)) return;
      const key = normalize(item.name);
      if (!key || seen.has(key)) return;
      values.push(item.name);
      seen.add(key);
    });
    return values;
  }

  function hasDestinations(program) {
    return listValues(program && program.destinations).some(value => Boolean(normalize(value)));
  }

  function hasItinerary(program) {
    const days = program && (program.itinerary || program.itinerary_days);
    return Array.isArray(days) && days.some(day => Boolean(titleOf(day) || String(day && day.description || '').trim()));
  }

  function filterPrograms(programs, status = 'all') {
    const records = Array.isArray(programs) ? programs : [];
    if (status === 'with-destinations') return records.filter(hasDestinations);
    if (status === 'without-destinations') return records.filter(program => !hasDestinations(program));
    if (status === 'without-destinations-with-itinerary') return records.filter(program => !hasDestinations(program) && hasItinerary(program));
    if (status === 'without-destinations-without-itinerary') return records.filter(program => !hasDestinations(program) && !hasItinerary(program));
    return [...records];
  }

  function destinationCounts(programs) {
    const records = Array.isArray(programs) ? programs : [];
    return {
      all: records.length,
      'with-destinations': filterPrograms(records, 'with-destinations').length,
      'without-destinations': filterPrograms(records, 'without-destinations').length,
      'without-destinations-with-itinerary': filterPrograms(records, 'without-destinations-with-itinerary').length,
      'without-destinations-without-itinerary': filterPrograms(records, 'without-destinations-without-itinerary').length
    };
  }

  return { normalize, dictionaryFrom, suggest, mergeSelected, hasDestinations, hasItinerary, filterPrograms, destinationCounts };
});
