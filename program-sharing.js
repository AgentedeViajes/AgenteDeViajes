(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ModoRumboProgramSharing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeSlug(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'programa';
  }

  function createLegacyIdentifier(section, title, occurrence = 1) {
    const suffix = Number(occurrence) > 1 ? `-${Number(occurrence)}` : '';
    return `static:${normalizeSlug(section)}:${normalizeSlug(title)}${suffix}`;
  }

  function createCatalogIdentifiers(namespace, values) {
    const acceptedNamespaces = new Set(['loaded', 'europa-medida', 'lowcost']);
    if (!acceptedNamespaces.has(namespace) || !Array.isArray(values)) return [];

    const keys = values.map(value => String(value == null ? '' : value));
    const isValid = value => new RegExp(`^${namespace}:[A-Za-z0-9._-]+$`).test(value);
    const reserved = new Set(keys.map(key => `${namespace}:${key}`).filter(isValid));
    const assigned = new Set();

    return keys.map(key => {
      const original = `${namespace}:${key}`;
      let id = original;
      if (!isValid(original) || assigned.has(id)) {
        const base = `${namespace}:${normalizeSlug(key)}`;
        id = base;
        let suffix = 2;
        while (reserved.has(id) || assigned.has(id)) id = `${base}-${suffix++}`;
      }
      assigned.add(id);
      return id;
    });
  }

  function buildProgramUrl(identifier, baseUrl) {
    if (!identifier) throw new TypeError('Falta el identificador del programa');
    const url = new URL(baseUrl || (typeof location !== 'undefined' ? location.href : 'https://modorumbo.vercel.app/'));
    url.searchParams.set('programa', String(identifier));
    url.hash = '';
    return url.toString();
  }

  function isPublished(program) {
    return Boolean(program)
      && program.published !== false
      && (!program.status || program.status === 'published');
  }

  function findPublishedProgram(programs, identifier) {
    const matches = (Array.isArray(programs) ? programs : [])
      .filter(program => program && String(program.id || '') === String(identifier || ''));
    return matches.length === 1 && isPublished(matches[0]) ? matches[0] : null;
  }

  async function resolveProgramLink(identifier, loadPrograms) {
    try {
      const programs = await loadPrograms();
      const program = findPublishedProgram(programs, identifier);
      return program ? {status:'found', program} : {status:'not-found', program:null};
    } catch (error) {
      return {status:'unavailable', program:null, error};
    }
  }

  async function openProgramLink(identifier, loadPrograms, openProgram) {
    const resolution = await resolveProgramLink(identifier, loadPrograms);
    if (resolution.status === 'found' && typeof openProgram === 'function') {
      openProgram(resolution.program);
      return {...resolution, opened:true};
    }
    return {...resolution, opened:false};
  }

  function settleBeforeTimeout(promise, timeoutMs) {
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      Promise.resolve(promise).then(
        () => { clearTimeout(timer); resolve(true); },
        () => { clearTimeout(timer); resolve(false); }
      );
    });
  }

  async function shareOrCopy({url, title, text, navigatorRef, documentRef, onStatus}) {
    const nav = navigatorRef || (typeof navigator !== 'undefined' ? navigator : {});
    const doc = documentRef || (typeof document !== 'undefined' ? document : null);

    async function copyUrl() {
      if (nav.clipboard && typeof nav.clipboard.writeText === 'function') {
        try {
          const copied = await settleBeforeTimeout(nav.clipboard.writeText(url), 1800);
          if (copied) return 'copied';
        } catch (_) {}
      }

      if (doc && typeof doc.createElement === 'function' && doc.body) {
        const input = doc.createElement('textarea');
        input.value = url;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        doc.body.appendChild(input);
        input.select();
        let copied = false;
        try { copied = Boolean(doc.execCommand && doc.execCommand('copy')); } catch (_) {}
        input.remove();
        if (copied) return 'copied';
      }
      return 'manual';
    }

    if (typeof nav.share === 'function') {
      let operation;
      try {
        operation = nav.share({title, text, url});
      } catch (error) {
        if (error && error.name === 'AbortError') return 'cancelled';
        return copyUrl();
      }
      if (operation && typeof operation.then === 'function') {
        Promise.resolve(operation).then(
          () => { if (onStatus) onStatus('shared'); },
          async error => {
            if (error && error.name === 'AbortError') {
              if (onStatus) onStatus('cancelled');
              return;
            }
            if (onStatus) onStatus(await copyUrl());
          }
        );
      }
      return 'share-open';
    }
    return copyUrl();
  }

  return {normalizeSlug, createLegacyIdentifier, createCatalogIdentifiers, buildProgramUrl, isPublished, findPublishedProgram, resolveProgramLink, openProgramLink, shareOrCopy};
});
