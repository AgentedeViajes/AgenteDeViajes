const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const favorites = require('../travel-favorites.js');
const comparison = require('../travel-comparison.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'travel-search.js'), 'utf8');
const advancedSource = fs.readFileSync(path.join(root, 'advanced-search-ui.js'), 'utf8');
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

test('Limpiar todo limpia criterios de búsqueda y conserva Favoritos, Comparador y otras claves', () => {
  const local = storage();
  const favoriteStore = favorites.create(local);
  const comparisonStore = comparison.create(local);
  favoriteStore.toggle(favoriteId);
  comparisonStore.toggle(compareId);

  const clearFlow = source.match(/function clearAllSearchFilters\(\) \{[\s\S]*?\n  \}/)?.[0] || '';
  assert.match(clearFlow,/activeNavigationFilter = null/);
  assert.match(clearFlow,/activeQuickCategories = new Set\(QUICK_CATEGORY_IDS\)/);
  assert.match(clearFlow,/activeResultSort = 'default'/);
  assert.match(clearFlow,/clearTravelFilters\(\)/);
  assert.match(clearFlow,/advancedSearchActive = true/);
  assert.match(clearFlow,/runAdvancedSearch\(\)/);
  assert.doesNotMatch(clearFlow,/favoriteStore|comparisonStore|localStorage|removeItem/);
  assert.deepEqual(favoriteStore.getIds(),[favoriteId]);
  assert.deepEqual(comparisonStore.getIds(),[compareId]);
  assert.equal(local.getItem('other-site-preference'),'keep-me');
  assert.deepEqual(local.removed,[]);
});

test('Limpiar todo restablece todos los campos y cierra autocompletados/refinamientos', () => {
  const clearFlow = source.match(/function clearTravelFilters\(\) \{[\s\S]*?\n  \}/)?.[0] || '';
  assert.match(clearFlow,/travelDestination/);
  assert.match(clearFlow,/advancedProgramName/);
  assert.match(clearFlow,/\['travelMonth','travelType'\]/);
  assert.match(clearFlow,/modo-rumbo:clear-search-filters/);
  assert.match(clearFlow,/modo-rumbo:clear-result-refinements/);
  assert.match(advancedSource,/modo-rumbo:clear-search-filters/);
  assert.match(advancedSource,/countrySelector\?\.clear\(\)/);
  assert.match(advancedSource,/destinationSelector\?\.clear\(\)/);
  assert.match(advancedSource,/close\(\);\s*status\.textContent = ''/);
});

test('Limpiar todo conserva una confirmación específica que no menciona borrado de Favoritos', () => {
  assert.match(html,/id="clearAllConfirmDialog"[^>]*aria-modal/);
  assert.match(html,/¿Querés limpiar todos los criterios de búsqueda\? Tus favoritos y comparaciones se conservarán\./);
  assert.match(html,/<button type="button" data-cancel-clear-all>Cancelar<\/button>/);
  assert.match(html,/<button type="button" class="confirm" data-confirm-clear-all>Limpiar todo<\/button>/);
  assert.match(source,/data-cancel-clear-all[^\n]*clearDialog\.close\(\)/);
  assert.doesNotMatch(source,/data-cancel-clear-all[^\n]*(?:clearAllSearchFilters|\.clear\(\))/);
  assert.match(source,/data-confirm-clear-all[^\n]*clearAllSearchFilters\(\)/);
});

test('Limpiar todo permanece disponible una sola vez en Resultados, Favoritos y Comparador', () => {
  for (const sectionId of ['travelResults','favoriteTripsSection','travelComparisonSection']) {
    const section = html.match(new RegExp(`<section[^>]*id="${sectionId}"[\\s\\S]*?<\\/section>`))?.[0] || '';
    assert.ok(section,`falta la vista ${sectionId}`);
    assert.equal((section.match(/data-request-clear-all/g) || []).length,1,`${sectionId} debe tener un solo botón`);
    assert.match(section,/<button class="clear-all-trigger" type="button" data-request-clear-all>Limpiar todo/);
  }
  assert.equal((html.match(/id="clearAllConfirmDialog"/g) || []).length,1,'se reutiliza un único diálogo');
  assert.match(source,/const clearRequest = event\.target\.closest\('\[data-request-clear-all\]'\)/);
});

test('Vaciar favoritos tiene un solo control y la confirmación exacta solicitada', () => {
  const section = html.match(/<section[^>]*id="favoriteTripsSection"[\s\S]*?<\/section>/)?.[0] || '';
  assert.equal((section.match(/data-request-clear-favorites/g) || []).length,1);
  assert.match(section,/<button class="clear-favorites-trigger" type="button" data-request-clear-favorites>Vaciar favoritos<\/button>/);
  assert.match(html,/id="clearFavoritesConfirmDialog"[^>]*aria-modal/);
  assert.match(html,/¿Querés eliminar todos tus favoritos y todas tus comparaciones\? Esta acción no se puede deshacer/);
  assert.match(html,/<button type="button" data-cancel-clear-favorites>Cancelar<\/button>/);
  assert.match(html,/<button type="button" class="confirm" data-confirm-clear-favorites>Vaciar favoritos<\/button>/);
  assert.equal((html.match(/data-request-clear-favorites/g) || []).length,1,'no se crean botones duplicados');
});

test('confirmar Vaciar favoritos elimina ambos stores y actualiza controles y vistas', () => {
  const clearFlow = source.match(/function clearFavoritesAndComparisons\(\) \{[\s\S]*?\n  \}/)?.[0] || '';
  assert.match(clearFlow,/favoriteStore\(\)\?\.clear\?\.\(\)/);
  assert.match(clearFlow,/comparisonStore\(\)\?\.clear\?\.\(\)/);
  assert.match(clearFlow,/updateFavoriteButtons\(\)/);
  assert.match(clearFlow,/updateComparisonButtons\(\)/);
  assert.match(clearFlow,/renderFavoriteTrips\(\)/);
  assert.match(clearFlow,/renderComparisonView\(\)/);
  assert.match(source,/data-confirm-clear-favorites[^\n]*clearFavoritesAndComparisons\(\)/);
  assert.match(source,/function clearFavoritesAndComparisons\(\) \{[\s\S]*?favoriteStore\(\)\?\.clear\?\.\(\)[\s\S]*?comparisonStore\(\)\?\.clear\?\.\(\)/);
});

test('Cancelar Vaciar favoritos solo cierra el diálogo y deja intacto el almacenamiento', () => {
  const local = storage();
  const favoriteStore = favorites.create(local);
  const comparisonStore = comparison.create(local);
  favoriteStore.toggle(favoriteId);
  comparisonStore.toggle(compareId);
  const cancelHandler = source.match(/data-cancel-clear-favorites[^\n]*\.addEventListener\('click',\s*\(\)\s*=>\s*([^;]+);/)?.[1] || '';
  assert.match(cancelHandler,/clearFavoritesDialog\.close\(\)/);
  assert.doesNotMatch(cancelHandler,/clearFavoritesAndComparisons|\.clear\(/);
  assert.deepEqual(favoriteStore.getIds(),[favoriteId]);
  assert.deepEqual(comparisonStore.getIds(),[compareId]);
  assert.deepEqual(local.removed,[]);
});

test('quitar un favorito individual no vacía toda la comparación', () => {
  const favoriteToggle = source.match(/const favoriteButton = event\.target\.closest\('\[data-toggle-favorite\]'\)[\s\S]*?return;\s*\}/)?.[0] || '';
  assert.match(favoriteToggle,/favoriteStore\(\)\?\.toggle\(favoriteButton\.dataset\.toggleFavorite\)/);
  assert.match(favoriteToggle,/comparisonStore\(\)\?\.reconcile\(favoritePrograms\(\)\)/);
  assert.doesNotMatch(favoriteToggle,/comparisonStore\(\)\?\.clear\(/);
});
