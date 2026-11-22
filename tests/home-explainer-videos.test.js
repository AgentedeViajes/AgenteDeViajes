const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'home-explainer-videos.js'), 'utf8');
const dataJs = fs.readFileSync(path.join(root, 'home-video-public-data.js'), 'utf8');
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

test('la portada lee home_videos publicado y ya no define videos estáticos como contenido', () => {
  assert.match(html,/admin\/config\.js\?v=/);
  assert.match(html,/home-video-public-data\.js\?v=/);
  assert.match(js,/data\.loadPublishedVideos\(\)/);
  assert.doesNotMatch(js,/const items\s*=\s*\[/);
  assert.doesNotMatch(js,/res\.cloudinary\.com|\.mp4/);
  assert.match(dataJs,/rest\/v1\/home_videos/);
  assert.match(dataJs,/is_published','eq\.true'/);
  assert.match(dataJs,/sort_order\.asc,created_at\.asc,slug\.asc/);
});

test('los MP4 no se cargan desde el HTML ni al montar las tarjetas; el src se asigna solo desde la acción de reproducir', () => {
  const section = html.slice(html.indexOf('id="home-explainer-videos"'), html.indexOf('id="travelResults"'));
  assert.doesNotMatch(section, /\.mp4|<source\b[^>]*src=/i);
  assert.match(section, /<video[^>]*preload="none"[^>]*hidden/);
  assert.doesNotMatch(section, /\bautoplay\b|\bloop\b/i);
  assert.match(js, /if\(!activeItem\)return;[\s\S]*?video\.src=activeItem\.source/);
  assert.match(js, /if\(video\.getAttribute\('src'\)\)[\s\S]*?video\.play\(\)/);
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
  assert.match(dataJs,/thumbnail_path/);
  assert.match(dataJs,/player_poster_path/);
  assert.match(css,/aspect-ratio:\s*16\s*\/\s*9/);
});

test('el carrusel adapta páginas, controles táctiles y cantidad visible a los videos publicados', () => {
  assert.match(js,/Math\.ceil\(items\.length\/2\)/);
  assert.match(js,/scrollToCard\(Math\.min\(items\.length-\(mobileView\(\)\?1:2\)/);
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
  assert.match(js,/poster\.src=item\.playerPoster/);
});

test('el reproductor solo oculta la miniatura después de disponer de un fotograma decodificado', () => {
  assert.match(js,/video\.videoWidth>0&&video\.videoHeight>0&&video\.readyState>=HTMLMediaElement\.HAVE_CURRENT_DATA/);
  assert.match(js,/status.textContent='Cargando video…';video.hidden=false;playerStage.classList.add\('is-loading'\)/);
  assert.match(css,/is-loading video \{ opacity: 0;/);
  assert.match(js,/video\.addEventListener\('loadeddata',showDecodedVideoFrame/);
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
