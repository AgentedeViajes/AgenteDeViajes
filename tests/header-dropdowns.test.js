const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'premium-home.css'), 'utf8');
const dropdownStart = html.indexOf('let navDropdownCloseTimer');
const dropdownLogic = html.slice(dropdownStart, html.indexOf('</script>', dropdownStart));
const escapeStart = html.indexOf("document.addEventListener('keydown', event => {", html.indexOf("navSearchPanel.querySelector"));
const escapeLogic = html.slice(escapeStart, html.indexOf("window.addEventListener('scroll'", escapeStart));

test('Destinos y Experiencias conservan apertura accesible y anuncian el estado expandido', () => {
  for (const id of ['mobileDestinationsMenu', 'mobileExperiencesMenu']) {
    assert.match(html, new RegExp(`aria-expanded="false" aria-controls="${id}" onclick="toggleDropdown\\(event, this\\)"`));
  }
  assert.match(dropdownLogic, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(dropdownLogic, /setAttribute\('aria-expanded',String\(active\)\)/);
});

test('seleccionar una opción cierra su menú y evita que hover o focus lo reabran', () => {
  assert.match(dropdownLogic, /event\.target\.closest\('\.dropdown'\)\?\.closest\('\.has-dropdown'\)/);
  assert.match(dropdownLogic, /dismissNavDropdown\(selectedDropdown, event\.detail > 0 \? 'pointer' : 'keyboard'\)/);
  assert.match(dropdownLogic, /setOpenNavDropdown\(null\)/);
  assert.match(css, /\.has-dropdown\.dropdown-dismissed > \.dropdown[\s\S]*?visibility:hidden!important[\s\S]*?pointer-events:none!important/);
  assert.match(css, /@media \(max-width:900px\) \{\s*#navbar \.premium-nav-links \.has-dropdown\.dropdown-dismissed > \.dropdown \{ display:none!important; \}/);
  assert.match(dropdownLogic, /item\.addEventListener\('mouseenter',[\s\S]*?!item\.classList\.contains\('dropdown-dismissed'\)/);
});

test('en escritorio una salida disparada al ocultar el menú no libera la marca hasta mover el cursor fuera', () => {
  assert.match(dropdownLogic, /item\.addEventListener\('pointerleave',[\s\S]*?item\.dataset\.dropdownDismissedBy !== 'pointer'/);
  assert.match(dropdownLogic, /item\.addEventListener\('focusout',[\s\S]*?item\.dataset\.dropdownDismissedBy !== 'pointer'/);
  assert.match(dropdownLogic, /document\.addEventListener\('pointermove',[\s\S]*?event\.pointerType !== 'mouse'[\s\S]*?document\.elementFromPoint\(event\.clientX,\s*event\.clientY\)[\s\S]*?!item\.contains\(pointerTarget\)[\s\S]*?clearDismissedNavDropdown\(item\)/);
  assert.match(dropdownLogic, /function dismissNavDropdown\(item,\s*source='keyboard'\)[\s\S]*?item\.dataset\.dropdownDismissedBy = source/);
  assert.match(dropdownLogic, /function clearDismissedNavDropdown\(item\)[\s\S]*?removeAttribute\('data-dropdown-dismissed-by'\)/);
});

test('clic fuera y Escape cierran menús y Escape devuelve el foco al disparador', () => {
  assert.match(dropdownLogic, /document\.addEventListener\('click', event => \{\s*if \(!navLinks\.contains\(event\.target\)\) closeNavDropdowns\(\{source:'pointer'\}\)/);
  assert.match(escapeLogic, /event\.key === 'Escape'/);
  assert.match(escapeLogic, /item\.matches\(':hover,:focus-within'\)/);
  assert.match(escapeLogic, /activeItem\.querySelector\('\.nav-link-btn'\)\?\.focus\(\)/);
});

test('abrir Destinos o Experiencias colapsa el menú anterior y actualiza aria-expanded', () => {
  assert.match(dropdownLogic, /button\.nextElementSibling\.classList\.toggle\('show',active\)/);
  assert.match(dropdownLogic, /clearDismissedNavDropdown\(button\.parentElement\)/);
  assert.match(dropdownLogic, /setOpenNavDropdown\(el\)/);
});
