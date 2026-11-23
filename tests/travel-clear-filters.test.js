const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const favorites = require('../travel-favorites.js');
const comparison = require('../travel-comparison.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'travel-search.js'), 'utf8');
const favoriteId = 'static:europa:roma';
const compareId = 'loaded:tailandia-clasica';

function storage() {
  const data = new Map([['other-site-preference','keep-me']]);
  const removed = [];
  return {
    data, removed,
    getItem:key => data.has(key) ? data.get(key) : null,
    setItem:(key,value) => data.set(key,String(value)),
    removeItem:key => { removed.push(key); data.delete(key); }
  };
}

test('confirmar Limpiar todo elimina solo las claves de Favoritos y Comparador', () => {
  const local = storage();
  const favoriteStore = favorites.create(local);
  const comparisonStore = comparison.create(local);
  favoriteStore.toggle(favoriteId);
  comparisonStore.toggle(compareId);
  favoriteStore.clear();
  comparisonStore.clear();
  assert.equal(local.data.has(favorites.STORAGE_KEY), false);
  assert.equal(local.data.has(comparison.STORAGE_KEY), false);
  assert.deepEqual(local.removed, [favorites.STORAGE_KEY, comparison.STORAGE_KEY]);
  assert.equal(local.getItem('other-site-preference'), 'keep-me');
  assert.deepEqual(favoriteStore.getIds(), []);
  assert.deepEqual(comparisonStore.getIds(), []);
});

test('Limpiar filtros presenta la confirmación exacta y Cancelar no activa la limpieza', () => {
  assert.match(html,/id="clearAllConfirmDialog"[^>]*aria-modal/);
  assert.match(html,/¿Querés limpiar todos los filtros, favoritos y viajes seleccionados para comparar\?/);
  assert.match(html,/<button type="button" data-cancel-clear-all>Cancelar<\/button>/);
  assert.match(html,/<button type="button" class="confirm" data-confirm-clear-all>Limpiar todo<\/button>/);
  assert.match(source,/data-cancel-clear-all[^\n]*clearDialog\.close\(\)/);
  assert.doesNotMatch(source,/data-cancel-clear-all[^\n]*(?:clearAllFiltersFavoritesAndComparison|\.clear\(\))/);
});

test('Limpiar todo está disponible una vez en Resultados, Favoritos y Comparador', () => {
  for (const sectionId of ['travelResults','favoriteTripsSection','travelComparisonSection']) {
    const section = html.match(new RegExp(`<section[^>]*id="${sectionId}"[\\s\\S]*?<\\/section>`))?.[0] || '';
    assert.ok(section, `falta la vista ${sectionId}`);
    assert.equal((section.match(/data-request-clear-all/g) || []).length, 1, `${sectionId} debe tener un solo botón`);
    assert.match(section,/<button class="clear-all-trigger" type="button" data-request-clear-all>Limpiar todo/);
  }
  assert.equal((html.match(/id="clearAllConfirmDialog"/g) || []).length, 1, 'se reutiliza un único diálogo');
  assert.doesNotMatch(html,/data-request-clear-all onclick=/, 'el evento se delega una sola vez');
  assert.match(source,/const clearRequest = event\.target\.closest\('\[data-request-clear-all\]'\)/);
});

test('confirmar limpia filtros, stores y vistas, y luego muestra el catálogo sin filtros', () => {
  const clearFlow = source.match(/function clearAllFiltersFavoritesAndComparison\(\) \{[\s\S]*?\n  \}/)?.[0] || '';
  assert.match(clearFlow,/activeNavigationFilter = null/);
  assert.match(clearFlow,/clearTravelFilters\(\)/);
  assert.match(clearFlow,/favoriteStore\(\)\?\.clear\?\.\(\)/);
  assert.match(clearFlow,/comparisonStore\(\)\?\.clear\?\.\(\)/);
  assert.match(clearFlow,/updateFavoriteButtons\(\)/);
  assert.match(clearFlow,/updateComparisonButtons\(\)/);
  assert.match(clearFlow,/renderFavoriteTrips\(\)/);
  assert.match(clearFlow,/renderComparisonView\(\)/);
  assert.match(clearFlow,/window\.showAllTrips\(\)/);
  assert.match(source,/data-confirm-clear-all[^\n]*clearAllFiltersFavoritesAndComparison\(\)/);
  assert.match(html,/class="clear-all-trigger" type="button" data-request-clear-all>Limpiar todo/);
});
