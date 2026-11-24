'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const html = read('admin/index.html');
const script = read('admin/admin.js');
const css = read('admin/admin.css');
const engine = require('../admin/destination-suggestions.js');

test('el formulario ofrece el panel accesible junto al campo de destinos y lo oculta inicialmente', () => {
  assert.match(html, /id="destinations"/);
  assert.match(html, /id="suggestDestinationsButton"[^>]*aria-expanded="false"[^>]*aria-controls="destinationSuggestionsPanel"/);
  assert.match(html, /id="destinationSuggestionsPanel"[^>]*hidden/);
  assert.match(html, /id="destinationSuggestionList"/);
  for (const label of ['Seleccionar todas las nuevas', 'Desmarcar todas', 'Cancelar', 'Agregar destinos seleccionados']) assert.ok(html.includes(label));
  assert.ok(script.includes("addEventListener('keydown',event=>{if(event.key==='Escape'"));
});

test('las sugerencias se generan desde el formulario y solo agregan seleccionadas al campo, sin guardar', () => {
  assert.match(script, /destinationSuggestions\.suggest\(currentProgram,\[\.\.\.state\.programs,currentProgram\]\)/);
  assert.match(script, /destinationSuggestions\.mergeSelected\(input\.value,state\.destinationSuggestions,state\.selectedDestinationSuggestionIds\)/);
  const suggestionHandlers = script.slice(script.indexOf('function closeDestinationSuggestions'), script.indexOf('function resetForm'));
  assert.doesNotMatch(suggestionHandlers, /dataService\.|fetch\s*\(|\.saveProgram\s*\(/);
  const cancelAction = script.slice(script.indexOf("if(event.target.closest('[data-cancel-destination-suggestions]'))"), script.indexOf("if(event.target.closest('[data-add-selected-destinations]'))"));
  assert.match(cancelAction, /selectedDestinationSuggestionIds\.clear\(\)/);
  assert.match(cancelAction, /closeDestinationSuggestions\(\)/);
  assert.doesNotMatch(cancelAction, /#destinations|\.value\s*=/);
  assert.match(script, /destinations:\$\('#destinations'\)\.value\.trim\(\)/);
  assert.match(script, /dataService\.saveProgram\(program,state\.programs\)/);
});

test('simulación de formulario: agregar seleccionadas solo cambia el campo y el guardado habitual persiste el resultado', async () => {
  const original = { id: 'program-1', destinations: 'París', itinerary: [{ title: 'Día 1 — Madrid / París' }] };
  const formValue = { destinations: original.destinations };
  const available = engine.suggest(original, [{ destinations: ['París', 'Madrid'] }]);
  const selected = new Set(['known:madrid']);
  let saves = 0;
  formValue.destinations = engine.mergeSelected(formValue.destinations, available, selected).join(', ');
  assert.equal(saves, 0, 'Agregar sugerencias no persiste cambios por sí solo');
  assert.equal(original.destinations, 'París', 'El objeto del catálogo no se modifica');
  assert.equal(formValue.destinations, 'París, Madrid');
  const usualSave = async program => { saves++; return { ...original, ...program }; };
  const saved = await usualSave({ ...original, destinations: formValue.destinations });
  assert.equal(saves, 1);
  assert.equal(saved.destinations, 'París, Madrid');
  assert.equal(original.destinations, 'París');
});

test('el filtro de destinos usa el catálogo en memoria, combina criterios y no consulta Supabase', () => {
  const render = script.slice(script.indexOf('function renderPrograms'), script.indexOf('function addDeparture'));
  assert.match(html, /id="destinationStatusFilter"/);
  for (const value of ['all', 'with-destinations', 'without-destinations', 'without-destinations-with-itinerary', 'without-destinations-without-itinerary']) assert.ok(html.includes(`value="${value}"`));
  assert.match(render, /state\.programs\.filter/);
  assert.match(render, /destinationSuggestions\.destinationCounts\(baseFiltered\)/);
  assert.match(render, /destinationSuggestions\.filterPrograms\(baseFiltered,destinationStatus\)/);
  assert.doesNotMatch(render, /dataService\.|fetch\s*\(/);
  assert.match(script, /'destinationStatusFilter'\]\s*\.forEach/);
});

test('la presentación adapta sugerencias a móvil y diferencia candidatos, destinos cargados y advertencias', () => {
  assert.match(script, /Destino conocido/);
  assert.match(script, /Candidato nuevo · requiere confirmación/);
  assert.match(script, /Ya cargado/);
  assert.match(script, /reviewWarnings/);
  assert.match(script, /Este programa no tiene títulos de itinerario/);
  assert.match(script, /No se encontraron destinos en los títulos/);
  assert.match(css, /\.destination-suggestion-card\.is-candidate/);
  assert.match(css, /\.destination-suggestion-card\.is-loaded/);
  assert.match(css, /@media\(max-width:780px\).*\.destination-entry-row\{grid-template-columns:1fr\}/s);
});
