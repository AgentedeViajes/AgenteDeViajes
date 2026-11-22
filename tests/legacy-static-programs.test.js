const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const search = fs.readFileSync(path.join(root, 'travel-search.js'), 'utf8');

test('retira del HTML activo las fichas estáticas antiguas y sus accesos directos', () => {
  assert.doesNotMatch(html, /id="section-europa-conociendo"/);
  assert.doesNotMatch(html, /id="section-europa-promo"/);
  assert.doesNotMatch(html, /<h3>Conociendo Europa<\/h3>/);
  assert.doesNotMatch(html, /<h3>Europa en Promo - Código BTW<\/h3>/);
  assert.doesNotMatch(html, /showSection\('europa-conociendo'\)|showSection\('europa-promo'\)/);
});

test('conserva la carga del catálogo dinámico sin nombres destacados codificados', () => {
  assert.doesNotMatch(search, /Conociendo Europa/);
  assert.match(search, /collectPublicPrograms\(await window\.loadModoRumboPrograms\(\)\)/);
  assert.match(search, /name:program\.title/);
});

test('mantiene fichas vecinas de Europa y programas independientes con el mismo precio', () => {
  assert.match(html, /id="section-europa-turquia-griegas"/);
  assert.match(html, /id="section-exoticos-india"/);
  assert.match(html, /name:'Suiza, Austria y Eslovenia'[\s\S]*?price:'Desde USD 3\.600/);
});
