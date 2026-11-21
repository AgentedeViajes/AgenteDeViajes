const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'home-explainer-videos.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'home-videos.css'), 'utf8');

test('la sección se inserta inmediatamente después de las cinco tarjetas MODO y antes de Salidas destacadas', () => {
  const modes = html.indexOf('class="travel-modes-section"');
  const section = html.indexOf('id="home-explainer-videos"');
  const results = html.indexOf('id="travelResults"');
  const featured = html.indexOf('id="featured-home"');
  assert.ok(modes >= 0 && section > modes && results > section && featured > results);
  assert.equal((html.match(/class="travel-mode-card/g) || []).length, 5);
  const intro = html.slice(html.indexOf('<div class="home-video-intro">'), html.indexOf('<div class="home-video-carousel"'));
  assert.doesNotMatch(intro,/MODO RUMBO EN 15 SEGUNDOS/i);
  assert.match(intro,/¿Cuál es tu modo de viajar\?/);
  assert.match(intro,/¿Qué tipo de viaje elegir\?/);
});

test('se definen las seis modalidades, en el orden de sus páginas y con las rutas existentes', () => {
  const ids = [...js.matchAll(/id:'([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(ids, ['grupales','sin-aereo','playa','europa','exotico','a-medida']);
  for (const marker of ["data-search-experience',value:'grupal'","data-search-experience',value:'sin-aereo'","data-search-mode',value:'playa'","data-search-query',value:'Europa'","data-search-query',value:'Exóticos'","data-home-video-custom',value:''"]) assert.ok(js.includes(marker), marker);
});

test('los MP4 no se cargan desde el HTML ni al montar las tarjetas; el src se asigna solo desde la acción de reproducir', () => {
  const section = html.slice(html.indexOf('id="home-explainer-videos"'), html.indexOf('id="travelResults"'));
  assert.doesNotMatch(section, /\.mp4|<source\b[^>]*src=/i);
  assert.match(section, /<video[^>]*preload="none"[^>]*hidden/);
  assert.doesNotMatch(section, /\bautoplay\b|\bloop\b/i);
  assert.match(js, /if \(!activeItem\) return;[\s\S]*?video\.src = activeItem\.source/);
  assert.match(js, /if \(video\.getAttribute\('src'\)\)[\s\S]*?video\.play\(\)/);
  assert.match(js, /video\.removeAttribute\('src'\);[\s\S]*?video\.load\(\)/);
});

test('los seis recursos son miniaturas WebP horizontales 16:9 y son livianos', () => {
  for (const name of ['grupales','sin-aereo','playa','europa','exoticos','a-medida']) {
    const file = path.join(root,'assets','videos',`${name}.webp`);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.toString('ascii',0,4),'RIFF',name);
    assert.equal(bytes.toString('ascii',8,12),'WEBP',name);
    assert.ok(bytes.length < 100_000, `${name} is ${bytes.length} bytes`);
  }
  assert.match(js,/width="384" height="216"/);
  assert.match(js,/poster:'assets\/videos\/[^']+\.webp', playerPoster:'assets\/videos\/player-[^']+\.webp'/);
  assert.match(css,/aspect-ratio:\s*16\s*\/\s*9/);
});

test('el carrusel expone tres páginas, controles táctiles y una tarjeta visible en móviles', () => {
  assert.match(js,/Math\.ceil\(items\.length \/ 2\)/);
  assert.match(js,/scrollToCard\(Math\.min\(items\.length - \(mobileView\(\) \? 1 : 2\)/);
  assert.match(css,/max-width: 680px[\s\S]*?flex-basis: 100%/);
  assert.match(css,/scroll-snap-type: x mandatory/);
  assert.match(css,/aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(css,/grid-template-columns: minmax\(100px,48%\)/);
  assert.match(css,/home-video-thumb \{[^}]*height: auto; align-self: center;/);
  assert.match(css,/\.home-video-section \*, \.home-video-dialog \* \{ box-sizing: border-box;/);
});


test('las portadas del reproductor conservan la proporción vertical de los videos', () => {
  for (const name of ['grupales','sin-aereo','playa','europa','exoticos','a-medida']) {
    const file = path.join(root,'assets','videos',`player-${name}.webp`);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.toString('ascii',0,4),'RIFF',name);
    assert.equal(bytes.toString('ascii',8,12),'WEBP',name);
    assert.ok(bytes.length < 100_000, `${name} is ${bytes.length} bytes`);
  }
  assert.match(js,/poster\.src = item\.playerPoster/);
});

test('el reproductor solo oculta la miniatura después de disponer de un fotograma decodificado', () => {
  assert.match(js,/videoWidth > 0 && video\.videoHeight > 0 && video\.readyState >= HTMLMediaElement\.HAVE_CURRENT_DATA/);
  assert.match(js,/status.textContent = 'Cargando video…';[\s\S]*?video.hidden = false;[\s\S]*?playerStage.classList.add\('is-loading'\)/);
  assert.match(css,/is-loading video \{ opacity: 0;/);
  assert.match(js,/video\.addEventListener\('loadeddata', showDecodedVideoFrame/);
  assert.match(css,/\.home-video-player-stage \[hidden\] \{ display: none !important;/);
  assert.match(js,/video\.removeAttribute\('src'\);[\s\S]*?video\.load\(\)/);
});

test('el selector de modalidades ofrece miniatura 16:9, reproducción, duración, descripción y enlace para cada video', () => {
  assert.match(js,/home-video-chooser-thumb/);
  assert.match(js,/home-video-duration/);
  assert.match(js,/home-video-chooser-copy/);
  assert.match(css,/home-video-chooser-list \{ display: grid; grid-template-columns: repeat\(3/);
  assert.match(css,/home-video-chooser-option \.home-video-route/);
  assert.match(css,/home-video-player-route \{[^}]*background: #ff6508; color: #fff;/);
});

test('el reproductor usa dos columnas en escritorio y título, video, descripción y enlace en pantallas estrechas', () => {
  assert.match(css,/home-video-player-content \{ display: grid; grid-template-columns: minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css,/@media \(min-width: 681px\) and \(max-width: 860px\)[\s\S]*?home-video-player-content \{ display: flex/);
  assert.match(css,/@media \(max-width: 680px\)[\s\S]*?home-video-player-copy \{ order: 1; \}[\s\S]*?home-video-player-stage \{ order: 2;[\s\S]*?home-video-player-description \{ order: 3;[\s\S]*?home-video-player-route \{ order: 4;/);
});

test('el reproductor reserva una superficie vertical 9:16 compacta y adaptable', () => {
  assert.match(css,/home-video-player-stage \{[^}]*aspect-ratio: 9\/16/);
  assert.match(css,/home-video-player-dialog \{ width: min\(940px/);
  assert.match(css,/home-video-dialog \{ position: fixed; inset: 0;[\s\S]*?margin: auto;/);
  assert.match(css,/max-width: 680px[\s\S]*?55dvh/);
});
