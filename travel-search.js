(function () {
  'use strict';

  const dateMode = window.ModoRumboDateMode;
  const programFilters = window.ModoRumboProgramFilters;
  const programSharing = window.ModoRumboProgramSharing;
  const featuredCarousel = window.ModoRumboFeaturedCarousel;
  const programBooking = window.ModoRumboProgramBooking;
  const favoritesModule = window.ModoRumboTravelFavorites;
  const comparisonModule = window.ModoRumboTravelComparison;
  let favoritesStore = null;
  let comparisonStoreInstance = null;
  let comparisonToastTimer = null;
  let publicCatalogReady = false;

  const MONTHS = [
    ['enero','Enero'],['febrero','Febrero'],['marzo','Marzo'],['abril','Abril'],
    ['mayo','Mayo'],['junio','Junio'],['julio','Julio'],['agosto','Agosto'],
    ['septiembre','Septiembre'],['octubre','Octubre'],['noviembre','Noviembre'],['diciembre','Diciembre']
  ];

  const MONTH_ALIASES = {
    ene:'enero', enero:'enero', feb:'febrero', febrero:'febrero', mar:'marzo', marzo:'marzo',
    abr:'abril', abril:'abril', may:'mayo', mayo:'mayo', jun:'junio', junio:'junio',
    jul:'julio', julio:'julio', ago:'agosto', agosto:'agosto', sep:'septiembre', sept:'septiembre',
    septiembre:'septiembre', oct:'octubre', octubre:'octubre', nov:'noviembre', noviembre:'noviembre',
    dic:'diciembre', diciembre:'diciembre'
  };

  const REGION_IMAGES = {
    europa: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=760&q=82',
    caribe: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=760&q=82',
    brasil: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=760&q=82',
    asia: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=760&q=82',
    africa: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=760&q=82',
    usa: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=760&q=82',
    oceania: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=760&q=82',
    default: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=760&q=82'
  };

  // Used only when a program does not already provide its own photograph.
  // The earliest destination mentioned in the title wins for multi-destination tours.
  const DESTINATION_IMAGES = [
    {keys:['costa amalfitana','napoles','italia'], image:'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=760&q=82'},
    {keys:['malasia','kuala lumpur'], image:'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=760&q=82'},
    {keys:['singapur'], image:'https://images.unsplash.com/photo-1525625293386-3f8f99389edd8?w=760&q=82'},
    {keys:['bali','indonesia'], image:'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=760&q=82'},
    {keys:['tailandia','bangkok'], image:'https://images.unsplash.com/photo-1528181304800-259b08848526?w=760&q=82'},
    {keys:['vietnam','hanoi'], image:'https://images.unsplash.com/photo-1528127269322-539801943592?w=760&q=82'},
    {keys:['camboya','siem reap'], image:'https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=760&q=82'},
    {keys:['laos'], image:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=760&q=82'},
    {keys:['china','beijing','hong kong'], image:'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=760&q=82'},
    {keys:['japon','tokyo'], image:'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=760&q=82'},
    {keys:['corea','seul'], image:'https://images.unsplash.com/photo-1538485399081-7c897b5f3f94?w=760&q=82'},
    {keys:['india','delhi'], image:'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=760&q=82'},
    {keys:['maldivas'], image:'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=760&q=82'},
    {keys:['egipto','cairo','nilo'], image:'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=760&q=82'},
    {keys:['turquia','estambul'], image:'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=760&q=82'},
    {keys:['grecia','atenas'], image:'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=760&q=82'},
    {keys:['sudafrica','kenia','tanzania','uganda','ruanda'], image:'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=760&q=82'},
    {keys:['marruecos'], image:'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=760&q=82'},
    {keys:['mauritius','mauricio'], image:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=760&q=82'},
    {keys:['seychelles'], image:'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=760&q=82'},
    {keys:['zanzibar'], image:'https://images.unsplash.com/photo-1528275646751-ff237d1cd935?w=760&q=82'},
    {keys:['filipinas'], image:'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=760&q=82'},
    {keys:['tahiti','bora bora','moorea'], image:'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=760&q=82'},
    {keys:['noruega','fiordos'], image:'https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=760&q=82'},
    {keys:['suiza','zurich','lucerna'], image:'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=760&q=82'},
    {keys:['portugal','lisboa'], image:'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=760&q=82'},
    {keys:['sicilia'], image:'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=760&q=82'},
    {keys:['provenza'], image:'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=760&q=82'},
    {keys:['balcanes'], image:'https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?w=760&q=82'},
    {keys:['galicia'], image:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=760&q=82'},
    {keys:['espana','madrid'], image:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=760&q=82'},
    {keys:['francia','paris'], image:'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=760&q=82'},
    {keys:['reino unido','londres'], image:'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=760&q=82'},
    {keys:['estados unidos','nueva york'], image:'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=760&q=82'},
    {keys:['europa'], image:'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=760&q=82'}
  ];

  const catalog = [];
  const catalogById = new Map();
  let dialogReturnFocus = null;
  let activeNavigationFilter = null;

  function normalize(value) {
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, char => ({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    })[char]);
  }

  function favoriteStore() {
    if (favoritesStore) return favoritesStore;
    let storage = null;
    try { storage = window.localStorage; } catch (_) { /* Favorites remain unavailable if browser storage is blocked. */ }
    favoritesStore = favoritesModule && favoritesModule.create(storage);
    return favoritesStore;
  }

  function comparisonStore() {
    if (comparisonStoreInstance) return comparisonStoreInstance;
    let storage = null;
    try { storage = window.localStorage; } catch (_) { /* Comparison stays in memory when storage is blocked. */ }
    comparisonStoreInstance = comparisonModule && comparisonModule.create(storage);
    return comparisonStoreInstance;
  }

  function canCompare(record) {
    return Boolean(comparisonModule && record && record.source !== 'custom personalizado' && comparisonModule.isValidId(record.id));
  }

  function favoritePrograms() {
    return favoriteStore()?.available(catalog) || [];
  }

  function updateComparisonButtons() {
    const store = comparisonStore();
    if (!store) return;
    document.querySelectorAll('[data-toggle-compare]').forEach(button => {
      const id = button.dataset.toggleCompare;
      const active = store.has(id);
      const record = catalogById.get(id);
      const name = record?.name || button.dataset.compareName || 'viaje';
      const label = active ? `Quitar ${name} del comparador` : `Agregar ${name} a comparar`;
      button.classList.toggle('is-compared', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', label);
      button.title = label;
      const text = button.querySelector('span');
      if (text) text.textContent = active ? 'Seleccionado' : 'Comparar';
    });
    const count = store.available(favoritePrograms()).length;
    const action = document.getElementById('compareFavoritesButton');
    const status = document.getElementById('favoriteComparisonStatus');
    if (action) {
      action.textContent = `Comparar seleccionados (${count})`;
      action.disabled = count < 2;
      action.setAttribute('aria-label', `Comparar seleccionados (${count})`);
    }
    if (status) status.textContent = `${count} ${count === 1 ? 'viaje seleccionado' : 'viajes seleccionados'} para comparar`;
  }

  function renderComparisonView() {
    const section = document.getElementById('travelComparisonSection');
    const grid = document.getElementById('travelComparisonGrid');
    const summary = document.getElementById('comparisonSummary');
    const store = comparisonStore();
    if (!section || !grid || !summary || !store || !comparisonModule) return;
    const favorites = favoritePrograms();
    if (publicCatalogReady) store.reconcile(favorites);
    const records = store.available(favorites);
    summary.textContent = records.length
      ? `${records.length} de ${comparisonModule.MAX_PROGRAMS} programas seleccionados`
      : 'Elegí al menos dos viajes desde Mis favoritos para compararlos acá.';
    grid.innerHTML = records.length
      ? records.map(comparisonModule.renderCard).join('')
      : '<div class="comparison-empty"><i class="fas fa-scale-balanced" aria-hidden="true"></i><strong>Todavía no seleccionaste viajes</strong><p>Agregá tus programas a Favoritos y elegí cuáles querés comparar.</p></div>';
    section.hidden = false;
    updateComparisonButtons();
  }

  function showComparisonLimitNotice() {
    const notice = document.getElementById('comparisonLimitToast');
    if (!notice) return;
    notice.textContent = `Podés comparar hasta ${comparisonModule.MAX_PROGRAMS} programas. Quitá uno para agregar otro.`;
    notice.hidden = false;
    window.clearTimeout(comparisonToastTimer);
    comparisonToastTimer = window.setTimeout(() => { notice.hidden = true; }, 4500);
  }

  function canFavorite(record) {
    return Boolean(favoritesModule && record && record.source !== 'custom personalizado' && favoritesModule.isValidId(record.id));
  }

  function updateFavoriteCount() {
    const count = document.getElementById('favoriteCount');
    const store = favoriteStore();
    if (!count || !store) return;
    const available = store.available(catalog).length;
    count.textContent = String(available);
    const button = count.closest('[aria-label]');
    if (button) button.setAttribute('aria-label', `Ver mis favoritos (${available})`);
  }

  function updateFavoriteButtons() {
    const store = favoriteStore();
    if (!store) return;
    document.querySelectorAll('[data-toggle-favorite]').forEach(button => {
      const active = store.has(button.dataset.toggleFavorite);
      const name = button.closest('[data-open-trip]')?.querySelector('.trip-card-body h3')?.textContent.trim()
        || button.closest('.detail-summary')?.querySelector('#detailProgramTitle')?.textContent.trim()
        || button.dataset.favoriteName || 'viaje';
      const label = active ? `Quitar ${name} de favoritos` : `Guardar ${name} en favoritos`;
      button.classList.toggle('is-favorite', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', label);
      button.title = label;
      const icon = button.querySelector('i');
      if (icon) { icon.classList.toggle('fas', active); icon.classList.toggle('far', !active); }
    });
    updateFavoriteCount();
  }

  function renderFavoriteTrips() {
    const section = document.getElementById('favoriteTripsSection');
    const grid = document.getElementById('favoriteTripsGrid');
    const summary = document.getElementById('favoriteTripsSummary');
    const store = favoriteStore();
    if (!section || !grid || !summary || !store) return;
    const records = store.available(catalog);
    if (publicCatalogReady) comparisonStore()?.reconcile(records);
    summary.textContent = records.length
      ? `${records.length} ${records.length === 1 ? 'viaje guardado' : 'viajes guardados'}`
      : 'Todavía no tenés viajes favoritos disponibles. Podés guardar uno con el corazón de cada tarjeta.';
    grid.innerHTML = records.length
      ? records.map(record => cardHtml(record, {includeCompare:true})).join('')
      : '<div class="search-results-empty" style="grid-column:1/-1"><i class="far fa-heart" aria-hidden="true"></i><strong>No hay favoritos disponibles</strong><p>Los programas que ya no están publicados no aparecen en esta lista.</p></div>';
    section.hidden = false;
    updateFavoriteButtons();
    updateComparisonButtons();
  }

  window.showFavoriteTrips = function () {
    showSection('home');
    renderFavoriteTrips();
    document.getElementById('favoriteTripsSection')?.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.hideTravelComparisonView = function () {
    const section = document.getElementById('travelComparisonSection');
    if (section) section.hidden = true;
  };

  window.showTravelComparison = function () {
    if (comparisonStore()?.available(favoritePrograms()).length < 2) return;
    showSection('home');
    document.getElementById('favoriteTripsSection')?.setAttribute('hidden', '');
    renderComparisonView();
    document.getElementById('travelComparisonSection')?.scrollIntoView({behavior:'smooth',block:'start'});
  };

  function inferRegion(text, source) {
    const n = normalize(`${source} ${text}`);
    if (/\b(?:caribe|punta cana|cancun|jamaica|aruba|curazao|colombia)\b/.test(n)) return 'Caribe';
    if (/\b(?:brasil|buzios|rio de janeiro|maceio|florianopolis|porto de galinhas|imbassai)\b/.test(n)) return 'Brasil';
    if (/\b(?:estados unidos|miami|orlando|new york|nueva york|las vegas|los angeles)\b/.test(n)) return 'Estados Unidos';
    if (/\b(?:africa|sudafrica|kenia|tanzania|uganda|ruanda|rwanda|mauritius|mauricio|seychelles|marruecos|egipto|zanzibar|madagascar|etiopia|namibia|botswana|zimbabue|zimbabwe|mozambique|senegal|tunez)\b|\b(?:isla reunion|reunion island)\b/.test(n)) return 'África';
    if (/\b(?:asia|japon|china|tailandia|vietnam|camboya|india|nepal|bali|indonesia|filipinas|maldivas|corea|laos|dubai|emiratos|jordania|israel|butan|bhutan|myanmar|birmania|malasia|singapur|qatar|oman|mongolia|tibet)\b|\bsri lanka\b/.test(n)) return 'Asia y Exóticos';
    if (/\b(?:australia|nueva zelanda|tahiti|bora bora|moorea|polinesia)\b/.test(n)) return 'Oceanía';
    if (/\b(?:europa|italia|francia|espana|grecia|turquia|portugal|suiza|austria|eslovenia|noruega|finlandia|londres|paris|roma|madrid|barcelona)\b/.test(n)) return 'Europa';
    return 'Otros destinos';
  }

  function imageFor(region) {
    if (region === 'Europa') return REGION_IMAGES.europa;
    if (region === 'Caribe') return REGION_IMAGES.caribe;
    if (region === 'Brasil') return REGION_IMAGES.brasil;
    if (region === 'África') return REGION_IMAGES.africa;
    if (region === 'Estados Unidos') return REGION_IMAGES.usa;
    if (region === 'Oceanía') return REGION_IMAGES.oceania;
    if (region === 'Asia y Exóticos') return REGION_IMAGES.asia;
    return REGION_IMAGES.default;
  }

  function imageForTitle(title, region) {
    const name = normalize(title);
    let selected = null;
    DESTINATION_IMAGES.forEach(destination => {
      destination.keys.forEach(key => {
        const position = name.indexOf(normalize(key));
        if (position !== -1 && (!selected || position < selected.position)) {
          selected = {position, image:destination.image};
        }
      });
    });
    return selected ? selected.image : imageFor(region);
  }

  function inferTypes(text, source) {
    const n = normalize(`${source} ${text}`);
    const result = new Set();
    if (/europa medida|personaliz|a medida/.test(n)) result.add('personalizado');
    if (/lujo|premium|experience/.test(n)) result.add('lujo');
    if (/low cost|economico|promo/.test(n)) result.add('low-cost');
    if (/sin aereo|no incluye vuelo internacional|plane slash|circuito/.test(n) || /loaded|lowcost/.test(source)) result.add('sin-aereo');
    if (/con aereo|aereos internacionales|ticket aereo|vuelos internacionales/.test(n) || /luxury/.test(source)) result.add('con-aereo');
    if (/grupal|salida grupal|guia acompanante/.test(n) || /luxury/.test(source)) result.add('grupal');
    if (/luna de miel|romantic/.test(n)) result.add('luna-de-miel');
    if (!result.size) result.add('programa');
    return [...result];
  }

  function extractMonths(text) {
    const n = normalize(text);
    if (/todos los dias|todo el ano|salidas regulares|salidas diarias|semanal|todos los (lunes|martes|miercoles|jueves|viernes|sabados|domingos)/.test(n)) {
      return MONTHS.map(item => item[0]);
    }
    const found = new Set();
    Object.keys(MONTH_ALIASES).forEach(alias => {
      if (new RegExp(`(^|\\s)${alias}(\\s|$)`).test(n)) found.add(MONTH_ALIASES[alias]);
    });
    return [...found];
  }

  function parsePrice(text) {
    const raw = String(text || '');
    const match = raw.match(/(?:USD|U\$S|US\$|\$)\s*([0-9][0-9.,]*)/i);
    if (!match) return null;
    let digits = match[1].replace(/[^0-9]/g, '');
    const value = Number(digits);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function extractDuration(text) {
    const match = String(text || '').match(/\b\d+\s*(?:d[ií]as?|noches?)\b(?:\s*\/\s*\d+\s*(?:d[ií]as?|noches?))?/i);
    return match ? match[0] : '';
  }

  function hasConcreteDepartureDate(text) {
    const normalized = normalize(text);
    const months = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
    return new RegExp(`\\b(?:[0-3]?\\d)\\s*(?:de\\s+)?(?:${months})\\b|\\b(?:${months})\\s+(?:[0-3]?\\d)\\b`).test(normalized)
      || /\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b/.test(normalized);
  }

  function hasProgramCode(text, code) {
    return new RegExp(`\\bcodigo\\s+${normalize(code)}\\b`).test(normalize(text));
  }

  function applyClassificationRules(record) {
    const name = normalize(record.name);
    const allText = record.name;
    const source = normalize(record.source);

    // Explicit business rules have priority over inferred words such as
    // "premium", "a medida" or "circuito" found inside descriptions.
    if (hasProgramCode(allText, 'oriente') || name.includes('balcanes y capitales imperiales')) {
      return ['sin-aereo'];
    }
    if (['cancun','riviera maya','costa mujeres'].includes(name)) {
      return ['programa'];
    }
    if (name.includes('costa amalfitana') && name.includes('sicilia') && name.includes('malta')) {
      return ['lujo','con-aereo'];
    }
    if (name.includes('malasia singapur y bali') || name.includes('china con tibet')) {
      return ['lujo','con-aereo'];
    }
    if (name.includes('paraiso de tailandia y playas')) {
      return ['grupal','con-aereo'];
    }
    if (['eba','btw','vips','pi'].some(code => hasProgramCode(allText, code))) {
      return ['grupal','con-aereo'];
    }
    if (source === 'luxury') {
      return ['lujo','con-aereo'];
    }
    if (hasConcreteDepartureDate(record.departureText)) {
      return ['grupal','con-aereo'];
    }

    const types = record.types || [];
    if (types.includes('sin-aereo')) {
      return ['sin-aereo', ...types.filter(type => !['sin-aereo','grupal','con-aereo','lujo','personalizado'].includes(type))];
    }
    return types.length ? types : ['programa'];
  }

  function addRecord(record) {
    if (!record || !record.name || catalogById.has(record.id)) return;
    record.region = record.region || inferRegion(record.searchText || record.name, record.source);
    record.image = record.image || imageForTitle(record.name, record.region);
    record.types = record.types || inferTypes(record.searchText || record.name, record.source);
    record.types = record.authoritativeTypes ? record.types : applyClassificationRules(record);
    record.months = record.months || extractMonths(record.departureText);
    record.priceFrom = record.priceFrom == null ? parsePrice(record.priceText) : record.priceFrom;
    record.duration = record.duration || extractDuration(record.searchText);
    record.normalized = normalize([record.name, record.region, record.searchText, record.types.join(' ')].join(' '));
    catalog.push(record);
    catalogById.set(record.id, record);
  }

  function collectStaticPrograms() {
    const identifiersByBase = new Map();
    document.querySelectorAll('.page-section[id^="section-"]').forEach(section => {
      const sectionKey = section.id.replace('section-', '');
      if (['home','hotel-search','tour-sin-aereos','europa-medida','tour-low-cost'].includes(sectionKey)) return;
      section.querySelectorAll('.package-card').forEach((card, index) => {
        const title = card.querySelector('.package-info h3, h3');
        if (!title) return;
        const info = card.querySelector('.package-info') || card;
        const tag = card.querySelector('.package-tag');
        const prices = [...card.querySelectorAll('.package-price')].map(item => item.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
        const img = card.querySelector('.package-image img, img');
        const explicitTypes = (card.dataset.travelTypes || section.dataset.travelTypes || '').split(',').map(type => type.trim()).filter(Boolean);
        const programName = title.textContent.trim();
        const staticAvailability = [...card.querySelectorAll('.package-details li')].map(item => item.textContent.replace(/\s+/g,' ').trim()).filter(text => /fecha|salida|vigencia|per[ií]odo|inicio/i.test(text));
        const staticRange = staticAvailability.some(text => /vigencia|per[ií]odo|para viajar/i.test(text));
        const staticFixedDates = staticAvailability.some(text => hasConcreteDepartureDate(text));
        const baseId = programSharing.createLegacyIdentifier(sectionKey, programName);
        const occurrence = (identifiersByBase.get(baseId) || 0) + 1;
        identifiersByBase.set(baseId, occurrence);
        const id = programSharing.createLegacyIdentifier(sectionKey, programName, occurrence);
        card.dataset.tripId = id;
        const record = {
          id,
          name: title.textContent.trim(),
          source: `static ${sectionKey}`,
          searchText: `${info.textContent} ${section.textContent}`,
          departureText: `${tag ? tag.textContent : ''} ${info.textContent}`,
          departureDates: programFilters.extractConcreteDates(tag ? tag.textContent : ''),
          priceText: prices.join(' · '),
          image: img ? img.src : '',
          geographyRegion: section.dataset.region || '',
          countries: card.dataset.countries || section.dataset.countries || [],
          destinations: card.dataset.destinations || section.dataset.destinations || [],
          published: true,
          types: explicitTypes.length ? explicitTypes : undefined,
          experienceTypes:explicitTypes,
          authoritativeTypes: explicitTypes.length > 0,
          duration: extractDuration(info.textContent),
          comparison: {
            image:img ? img.currentSrc || img.src : '',
            destinations:[card.dataset.destinations || section.dataset.destinations || '',card.dataset.countries || section.dataset.countries || ''].filter(Boolean),
            duration:extractDuration(info.textContent),
            availabilityLabel:staticRange ? 'Período de viaje' : staticFixedDates ? 'Fechas de salida' : 'Disponibilidad informada',
            availability:staticAvailability,
            priceText:prices.join(' · '),
            included:readHeadingItems(card,/^(incluye|servicios incluidos|el programa incluye)$/),
            excluded:readHeadingItems(card,/(no incluye|servicios no incluidos|no incluido)/),
            operatorCode:card.dataset.operatorCode || card.querySelector('[data-operator-code],.operator-code')?.textContent.trim() || ''
          },
          open: function () {
            if (showHistoricalProgram(record, card, section)) return;
            showSection(sectionKey);
            window.setTimeout(() => {
              const target = document.querySelector(`[data-trip-id="${id}"]`);
              if (target && section.querySelectorAll('.package-card').length > 1) target.scrollIntoView({behavior:'smooth',block:'center'});
            }, 120);
          }
        };
        addRecord(record);
        if (canFavorite(record) && !card.querySelector('[data-toggle-favorite]')) {
          card.insertAdjacentHTML('afterbegin', favoritesModule.buttonHtml(id, favoriteStore()?.has(id), record.name));
        }
      });
    });
  }

  function collectCustomDestinations() {
    document.querySelectorAll('[data-custom-destination]').forEach(section => {
      const name = section.dataset.customDestination;
      const region = section.dataset.customRegion || inferRegion(name, 'custom');
      const sectionKey = section.id.replace('section-', '');
      addRecord({
        id: `custom:${sectionKey}`,
        name,
        source: 'custom personalizado',
        searchText: `${name} ${region} EEUU Estados Unidos viaje a medida personalizado`,
        departureText: 'Viaje a medida',
        priceText: '',
        image: section.dataset.customImage || imageFor(region),
        region,
        geographyRegion:section.dataset.customRegion || '',
        countries:section.dataset.countries || [],
        destinations:section.dataset.destinations || [name],
        types: ['personalizado'],
        experienceTypes:[],
        open: function () { showSection(sectionKey); }
      });
    });
  }

  function collectObjectPrograms(object, source, openFn, options) {
    if (!object) return;
    const entries = Object.entries(object);
    const identifiers = programSharing.createCatalogIdentifiers(source, entries.map(([key]) => key));
    entries.forEach(([key, trip], index) => {
      const name = trip.name || key;
      const route = trip.route || trip.itinerary || [];
      const routeText = route.map(item => Array.isArray(item) ? item.join(' ') : typeof item === 'object' ? [item.title, item.description, item.text].filter(Boolean).join(' ') : item).join(' ');
      const includes = Array.isArray(trip.includes) ? trip.includes.join(' ') : trip.includes || '';
      const departures = trip.departures || trip.departure || '';
      const departureList = Array.isArray(trip.departures) ? trip.departures : [];
      const departureDates = [
        ...departureList.map(item => typeof item === 'string' ? item : item && (item.departure_date || item.date)),
        ...programFilters.extractConcreteDates(departures)
      ];
      const prices = Array.isArray(trip.prices) ? trip.prices.join(' ') : (trip.price || '');
      const priceValue = Array.isArray(trip.prices) ? trip.prices[0] : trip.price;
      const priceText = typeof priceValue === 'number'
        ? `${trip.currency || 'USD'} ${new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(priceValue)}`
        : String(priceValue == null ? prices : priceValue);
      const routeItems = (Array.isArray(route) ? route : []).map(item => typeof item === 'string' ? item : Array.isArray(item) ? item.join(' · ') : item && typeof item === 'object' ? [item.title || item.name, item.description || item.text].filter(Boolean).join(' · ') : '').filter(Boolean);
      const departureItems = departureList.map(item => typeof item === 'string' ? item : item && typeof item === 'object' ? item.departure_date || item.date || item.label || '' : '').filter(Boolean);
      const rawTaggedTypes = trip.travel_types || trip.travelTypes || [];
      const taggedTypes = Array.isArray(rawTaggedTypes) ? rawTaggedTypes : String(rawTaggedTypes).split(/[,;|]+/).map(type => type.trim()).filter(Boolean);
      const text = [name, trip.subtitle, trip.cities, trip.duration, departures, prices, includes, routeText].filter(Boolean).join(' ');
      const record = {
        id: identifiers[index],
        name,
        source,
        searchText: text,
        departureText: departures,
        departureDates,
        date_mode:trip.date_mode || trip.dateMode || '',
        geographyRegion:trip.region || '',
        countries:trip.countries || [],
        destinations:trip.destinations || trip.cities || [],
        priceText: prices,
        duration: trip.duration || extractDuration(text),
        types: options && options.types
          ? [...new Set([...options.types, ...(taggedTypes.length ? taggedTypes : inferTypes(text, source))])]
          : inferTypes(text, source),
        authoritativeTypes:taggedTypes.length > 0,
        experienceTypes:taggedTypes,
        published: true,
        comparison: {
          image:trip.image_path || trip.image || (Array.isArray(trip.images) ? (typeof trip.images[0] === 'string' ? trip.images[0] : trip.images[0]?.url || '') : ''),
          destinations:trip.destinations || trip.countries || trip.cities || '',
          route:routeItems,
          duration:trip.duration || '',
          availabilityLabel:isRangeProgram({date_mode:trip.date_mode || trip.dateMode}) ? 'Período de viaje' : departureItems.some(value => hasConcreteDepartureDate(String(value))) ? 'Fechas de salida' : 'Disponibilidad informada',
          availability:departureItems.length ? departureItems : (departures ? [String(departures)] : []),
          priceText:priceText || '',
          priceBasis:trip.price_basis || trip.priceBasis || '',
          included:detailValues(trip.includes),
          excluded:detailValues(trip.excludes || trip.notIncluded || trip.not_included),
          operatorCode:trip.operator_code || trip.operatorCode || trip.code || ''
        },
        open: function () { showObjectProgram(record, trip, source, key, openFn); }
      };
      addRecord(record);
    });
  }

  function buildCatalog() {
    collectStaticPrograms();
    collectCustomDestinations();
    collectObjectPrograms(typeof loadedTours !== 'undefined' ? loadedTours : null, 'loaded', showLoadedTour, {types:['sin-aereo']});
    collectObjectPrograms(typeof europaMedidaTours !== 'undefined' ? europaMedidaTours : null, 'europa-medida', showEuropaMedida, {types:['personalizado','con-aereo']});
    collectObjectPrograms(typeof lowCostTours !== 'undefined' ? lowCostTours : null, 'lowcost', showLowCost, {types:['low-cost','sin-aereo']});
    window.travelCatalog = catalog;
  }

  function publicPrice(program) {
    if (program.price_prefix === 'consult' || program.price == null) return '';
    const amount = new Intl.NumberFormat('es-AR', {maximumFractionDigits:0}).format(Number(program.price));
    const prefix = program.price_prefix === 'from' ? 'Desde ' : '';
    const basis = {double:' por persona en doble',single:' por persona en single',package:' por paquete'}[program.price_basis] || '';
    return `${prefix}${program.currency || 'USD'} ${amount}${basis}`;
  }

  function basePriceForComparison(program) {
    if (program.price_prefix === 'consult' || program.price == null || !Number.isFinite(Number(program.price))) return '';
    const amount = new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(Number(program.price));
    return `${program.price_prefix === 'from' ? 'Desde ' : ''}${program.currency || 'USD'} ${amount}`;
  }

  function publicDate(value) {
    if (!value) return '';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-AR', {day:'numeric',month:'long',year:'numeric'}).format(date);
  }

  function isRangeProgram(program) {
    return dateMode.normalizeMode(program && program.date_mode) === dateMode.DATE_RANGE;
  }

  function publicAvailability(program) {
    if (isRangeProgram(program)) return dateMode.rangeLabel(program.travel_start_date, program.travel_end_date);
    const departures = [...(program.departures || [])].sort((a,b) => String(a.departure_date || '').localeCompare(String(b.departure_date || '')));
    return departures.map(item => publicDate(item.departure_date)).filter(Boolean).join(' · ')
      || (program.departure_type === 'weekly' ? 'Salidas semanales' : program.departure_type === 'on-request' ? 'A solicitud' : 'Consultar salida');
  }

  function publicTypes(program) {
    const types = new Set(program.travel_types || []);
    if (program.flight_type === 'with-flight') types.add('con-aereo');
    if (program.flight_type === 'without-flight') types.add('sin-aereo');
    if (!types.size) types.add('programa');
    return [...types];
  }

  function detailEmpty(message) {
    return `<div class="detail-empty"><i class="far fa-folder-open" aria-hidden="true"></i><p>${escapeHtml(message)}</p></div>`;
  }

  function detailTypeLabel(types) {
    const labels = {'personalizado':'A medida','lujo':'Lujo','low-cost':'Low cost','sin-aereo':'Circuito sin aéreo','con-aereo':'Con aéreo','grupal':'Salida grupal','luna-de-miel':'Luna de miel','programa':'Programa'};
    return (types || []).map(type => labels[type] || type).join(' · ');
  }

  function detailValues(value) {
    if (Array.isArray(value)) return value.filter(item => item != null && String(item) !== '').map(item => String(item));
    if (value == null || String(value) === '') return [];
    return [String(value)];
  }

  function detailText(value) {
    return escapeHtml(value).replace(/\r\n?|\n/g, '<br>');
  }

  function detailMoney(value, currency) {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? `${currency || 'USD'} ${new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(amount)}`
      : String(value == null ? '' : value);
  }

  function ensureProgramDialog() {
    let dialog = document.getElementById('publicProgramDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'publicProgramDialog';
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      dialog.addEventListener('close', () => {
        const target = dialogReturnFocus;
        dialogReturnFocus = null;
        if (target && target.isConnected && typeof target.focus === 'function') target.focus({preventScroll:true});
      });
      document.body.appendChild(dialog);
    }
    dialog.className = 'program-dialog program-dialog-v2';
    dialog.setAttribute('aria-labelledby', 'detailProgramTitle');
    return dialog;
  }

  function renderProgramDetail(detail) {
    const dialog = ensureProgramDialog();
    const title = escapeHtml(detail.title || 'Programa de viaje');
    const images = [...new Set((detail.images || []).filter(Boolean).map(image => String(image)))];
    const departures = detail.departures || [];
    const selectableIndexes = departures.map((item,index) => item.selectable ? index : -1).filter(index => index >= 0);
    const selectedIndex = detail.selectedDepartureIndex != null
      ? detail.selectedDepartureIndex
      : selectableIndexes.length === 1 ? selectableIndexes[0] : -1;
    const selectedDepartureItem = selectedIndex >= 0 ? departures[selectedIndex] : null;
    const selectedDeparture = selectedDepartureItem ? selectedDepartureItem.label : '';
    const waitingForDeparture = selectableIndexes.length > 1 && selectedIndex < 0;
    const selectedPrice = selectedDepartureItem && selectedDepartureItem.price ? selectedDepartureItem.price : '';
    const displayedPriceLabel = waitingForDeparture ? 'Tarifa' : selectedPrice ? 'Precio de la salida' : (detail.priceLabel || 'Precio');
    const displayedPriceValue = waitingForDeparture ? 'Seleccioná una salida para ver la tarifa' : selectedPrice || detail.priceValue || 'A consultar';
    const whatsappMessage = 'Hola, quiero consultar por el programa ' + (detail.title || '') + (selectedDeparture ? ', salida ' + selectedDeparture : '') + '.';
    const whatsappUrl = 'https://wa.me/5491134821978?text=' + encodeURIComponent(whatsappMessage);
    const imageHtml = images.length ? `<div class="detail-gallery">
      <img class="detail-main-image" data-detail-main-image src="${escapeHtml(images[0])}" alt="${title}">
      ${images.length > 1 ? `<div class="detail-thumbnails" aria-label="Galería de fotografías">${images.map((image,index) => `<button type="button" class="detail-thumbnail${index === 0 ? ' active' : ''}" data-detail-image-index="${index}" aria-label="Ver fotografía ${index + 1}" aria-pressed="${index === 0 ? 'true' : 'false'}"><img src="${escapeHtml(image)}" alt=""></button>`).join('')}</div>` : ''}
    </div>` : detailEmpty('Este programa no tiene fotografías disponibles.');
    const itineraryHtml = detail.itinerary && detail.itinerary.length ? `<div class="detail-timeline">${detail.itinerary.map((day,index) => `<article class="detail-day">
      <div class="detail-day-marker" aria-hidden="true">${escapeHtml(day.day || String(index + 1))}</div>
      <div><h4>${escapeHtml(day.title || 'Día ' + (index + 1))}</h4>${day.date ? `<small>${escapeHtml(day.date)}</small>` : ''}${day.description ? `<p>${detailText(day.description)}</p>` : ''}${day.notes ? `<p class="detail-day-notes">${detailText(day.notes)}</p>` : ''}</div>
    </article>`).join('')}</div>` : detailEmpty('El itinerario todavía no fue informado para este programa.');
    const included = detail.included || [];
    const excluded = detail.excluded || [];
    const extraDetails = detail.additionalDetails || [];
    const includedHtml = included.length ? `<ul class="detail-service-list included">${included.map(item => `<li><i class="fas fa-check" aria-hidden="true"></i><span>${detailText(item)}</span></li>`).join('')}</ul>` : detailEmpty('No hay servicios incluidos informados.');
    const excludedHtml = excluded.length ? `<ul class="detail-service-list excluded">${excluded.map(item => `<li><i class="fas fa-times" aria-hidden="true"></i><span>${detailText(item)}</span></li>`).join('')}</ul>` : detailEmpty('No hay servicios no incluidos informados.');
    const extraHtml = extraDetails.length ? `<div class="detail-additional-info"><h4>Otros datos del paquete</h4><ul>${extraDetails.map(item => `<li>${detailText(item)}</li>`).join('')}</ul></div>` : '';
    const priceOptions = detail.priceOptions || [];
    const priceOptionsHtml = priceOptions.length ? `<section class="detail-price-options"><h4>Otras tarifas informadas</h4><ul>${priceOptions.map(item => `<li>${detailText(item)}</li>`).join('')}</ul></section>` : '';
    let datesHtml = '';
    if (detail.rangeText) {
      datesHtml = `<div class="detail-range"><strong>${detailText(detail.rangeText)}</strong>${detail.rangeNotice ? `<p>${detailText(detail.rangeNotice)}</p>` : ''}</div>`;
    } else if (departures.length) {
      datesHtml = `<div class="detail-departures">${departures.map((item,index) => {
        const label = item.label || 'Fecha no informada';
        const price = item.price ? `<strong>${detailText(item.price)}</strong>` : '';
        if (item.selectable) return `<button type="button" class="detail-departure${index === selectedIndex ? ' active' : ''}" data-departure-index="${index}" aria-pressed="${index === selectedIndex ? 'true' : 'false'}"><i class="far fa-calendar-alt" aria-hidden="true"></i><span>${detailText(label)}</span>${price}</button>`;
        return `<div class="detail-departure detail-departure-static"><i class="far fa-calendar-alt" aria-hidden="true"></i><span>${detailText(label)}</span>${price}</div>`;
      }).join('')}</div>`;
    } else if (detail.availabilityText) {
      datesHtml = `<div class="detail-availability"><i class="far fa-calendar-alt" aria-hidden="true"></i><span>${detailText(detail.availabilityText)}</span></div>`;
    } else {
      datesHtml = detailEmpty('No hay fechas de salida informadas.');
    }
    datesHtml += priceOptionsHtml;
    const conditionsHtml = detail.conditions && detail.conditions.length ? `<div class="detail-conditions">${detail.conditions.map(item => `<p>${detailText(item)}</p>`).join('')}</div>` : detailEmpty('No hay condiciones adicionales informadas.');
    const facts = [
      detail.region ? `<span><i class="fas fa-map-marker-alt" aria-hidden="true"></i><strong>${escapeHtml(detail.region)}</strong></span>` : '',
      detail.destination ? `<span><i class="fas fa-location-dot" aria-hidden="true"></i><strong>${escapeHtml(detail.destination)}</strong></span>` : '',
      detail.departureText ? `<span><i class="far fa-calendar-alt" aria-hidden="true"></i><strong>${detailText(detail.departureText)}</strong></span>` : '',
      detail.duration ? `<span><i class="fas fa-bed" aria-hidden="true"></i><strong>${escapeHtml(detail.duration)}</strong></span>` : ''
    ].filter(Boolean).join('');
    const codeHtml = detail.operatorCode != null && String(detail.operatorCode).trim() !== ''
      ? `<span class="detail-code">Código ${escapeHtml(detail.operatorCode)}</span>` : '';
    const typeHtml = detail.type ? `<span class="detail-type">${escapeHtml(detail.type)}</span>` : '';
    const summaryHtml = detail.summary ? `<p class="detail-summary-copy">${detailText(detail.summary)}</p>` : '';
    const detailFavoriteHtml = favoritesModule && favoritesModule.isValidId(detail.programId)
      ? favoritesModule.buttonHtml(detail.programId, favoriteStore()?.has(detail.programId), detail.title || 'viaje').replace('trip-favorite-button','detail-favorite-button')
      : '';
    const priceHtml = `<div class="detail-price"><small data-detail-price-label>${escapeHtml(displayedPriceLabel)}</small><strong data-detail-price-value>${detailText(displayedPriceValue)}</strong><span data-detail-price-basis${waitingForDeparture || !detail.priceBasis ? ' hidden' : ''}>${!waitingForDeparture ? escapeHtml(detail.priceBasis || '') : ''}</span></div>`;
    const emailUrl = 'mailto:javier@tresortravel.com.ar?subject=' + encodeURIComponent('Consulta: ' + (detail.title || ''));
    dialog.innerHTML = `<article class="detail-v2">
      <button class="program-dialog-close" type="button" aria-label="Cerrar ficha">×</button>
      <div class="detail-top">
        ${imageHtml}
        <aside class="detail-summary">
          <div class="detail-breadcrumb">Inicio <i class="fas fa-chevron-right" aria-hidden="true"></i> ${escapeHtml(detail.region || 'Viajes')}</div>
          ${typeHtml}${codeHtml}
          <h2 id="detailProgramTitle">${title}</h2>
          ${summaryHtml}
          ${facts ? `<div class="detail-facts">${facts}</div>` : ''}
          ${priceHtml}
          <div class="detail-actions">
            <a class="detail-whatsapp" data-detail-whatsapp href="${whatsappUrl}" target="_blank" rel="noopener noreferrer"><i class="fab fa-whatsapp" aria-hidden="true"></i><span><strong>Consultá por WhatsApp</strong><small>Quiero más información</small></span></a>
            <button class="detail-share" type="button" data-share-program="${escapeHtml(detail.programId || '')}" aria-label="Compartir ${title}"><i class="fas fa-share-alt" aria-hidden="true"></i><span>Compartir</span></button>
            ${detailFavoriteHtml}
          </div>
          ${detail.bookingProgramId ? `<a class="detail-booking" data-detail-booking href="${escapeHtml(programBooking.buildBookingUrl(detail.bookingProgramId, selectedDepartureItem?.date || null))}"><i class="fas fa-suitcase" aria-hidden="true"></i> RESERVAR</a>` : ''}
          <span class="detail-share-status" role="status" aria-live="polite"></span>
          <a class="detail-email" href="${emailUrl}"><i class="far fa-envelope" aria-hidden="true"></i> Consultar por email</a>
        </aside>
      </div>
      <div class="detail-tabs" role="tablist" aria-label="Información del programa">
        <button type="button" class="active" id="detailTabItinerary" role="tab" aria-selected="true" aria-controls="detailPanelItinerary" tabindex="0" data-detail-tab="itinerary"><i class="far fa-calendar-alt" aria-hidden="true"></i>Itinerario</button>
        <button type="button" id="detailTabServices" role="tab" aria-selected="false" aria-controls="detailPanelServices" tabindex="-1" data-detail-tab="services"><i class="fas fa-shield-alt" aria-hidden="true"></i>Servicios</button>
        <button type="button" id="detailTabDates" role="tab" aria-selected="false" aria-controls="detailPanelDates" tabindex="-1" data-detail-tab="dates"><i class="far fa-calendar-check" aria-hidden="true"></i>Fechas y precios</button>
        <button type="button" id="detailTabConditions" role="tab" aria-selected="false" aria-controls="detailPanelConditions" tabindex="-1" data-detail-tab="conditions"><i class="fas fa-info-circle" aria-hidden="true"></i>Condiciones</button>
      </div>
      <div class="detail-panels">
        <section class="detail-panel active" id="detailPanelItinerary" role="tabpanel" aria-labelledby="detailTabItinerary" tabindex="0" data-detail-panel="itinerary"><h3>Itinerario completo</h3>${itineraryHtml}</section>
        <section class="detail-panel" id="detailPanelServices" role="tabpanel" aria-labelledby="detailTabServices" tabindex="0" data-detail-panel="services" hidden><div class="detail-services-grid"><div><h3>Servicios incluidos</h3>${includedHtml}${extraHtml}</div><div><h3>Servicios no incluidos</h3>${excludedHtml}</div></div></section>
        <section class="detail-panel" id="detailPanelDates" role="tabpanel" aria-labelledby="detailTabDates" tabindex="0" data-detail-panel="dates"><h3>Fechas y precios</h3>${datesHtml}</section>
        <section class="detail-panel" id="detailPanelConditions" role="tabpanel" aria-labelledby="detailTabConditions" tabindex="0" data-detail-panel="conditions" hidden><h3>Condiciones</h3>${conditionsHtml}</section>
      </div>
    </article>`;
    dialog.querySelector('.program-dialog-close').addEventListener('click', () => dialog.close());
    const shareButton = dialog.querySelector('[data-share-program]');
    shareButton.addEventListener('click', async () => {
      const programId = shareButton.dataset.shareProgram;
      const shareUrl = programSharing.buildProgramUrl(programId, window.location.href);
      const status = dialog.querySelector('.detail-share-status');
      shareButton.disabled = true;
      try {
        const result = await programSharing.shareOrCopy({
          url:shareUrl,
          title:detail.title || 'Modo Rumbo',
          text:`Mirá este programa de Modo Rumbo: ${detail.title || 'viaje'}`,
          onStatus:shareResult => {
            if (shareResult === 'shared') status.textContent = 'Programa compartido.';
            else if (shareResult === 'copied') status.textContent = 'Enlace copiado.';
            else if (shareResult === 'cancelled') status.textContent = 'Compartir cancelado.';
            else if (shareResult === 'manual') {
              status.textContent = 'No se pudo copiar automáticamente. Copiá el enlace manualmente.';
              window.prompt('Copiá el enlace para compartir este programa:', shareUrl);
            }
          }
        });
        if (result === 'manual') {
          window.prompt('Copiá el enlace para compartir este programa:', shareUrl);
          status.textContent = 'Podés copiar el enlace desde el cuadro que se abrió.';
        } else if (result === 'copied') {
          status.textContent = 'Enlace copiado.';
        } else if (result === 'share-open') {
          status.textContent = 'Se abrió el menú para compartir.';
        } else if (result === 'cancelled') {
          status.textContent = 'Compartir cancelado.';
        }
      } catch (_) {
        status.textContent = 'No se pudo preparar el enlace para compartir.';
      } finally {
        shareButton.disabled = false;
      }
    });
    const tabs = [...dialog.querySelectorAll('[data-detail-tab]')];
    const panels = [...dialog.querySelectorAll('[data-detail-panel]')];
    function activateTab(button, moveFocus) {
      tabs.forEach(tab => {
        const active = tab === button;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.setAttribute('tabindex', active ? '0' : '-1');
      });
      panels.forEach(panel => {
        const active = panel.dataset.detailPanel === button.dataset.detailTab;
        panel.classList.toggle('active', active);
        panel.hidden = !active;
      });
      if (moveFocus) button.focus();
      dialog.scrollTop = 0;
    }
    tabs.forEach((button,index) => {
      button.addEventListener('click', () => activateTab(button, false));
      button.addEventListener('keydown', event => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        activateTab(tabs[next], true);
      });
    });
    dialog.querySelectorAll('[data-detail-image-index]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.detailImageIndex);
      const image = images[index];
      const main = dialog.querySelector('[data-detail-main-image]');
      if (main && image) main.src = image;
      dialog.querySelectorAll('[data-detail-image-index]').forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }));
    dialog.querySelectorAll('[data-departure-index]').forEach(button => button.addEventListener('click', () => {
      const item = departures[Number(button.dataset.departureIndex)];
      if (!item || !item.selectable) return;
      dialog.querySelectorAll('[data-departure-index]').forEach(candidate => {
        const active = candidate === button;
        candidate.classList.toggle('active', active);
        candidate.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      const message = 'Hola, quiero consultar por el programa ' + (detail.title || '') + ', salida ' + item.label + '.';
      const link = dialog.querySelector('[data-detail-whatsapp]');
      if (link) link.href = 'https://wa.me/5491134821978?text=' + encodeURIComponent(message);
      const priceLabel = dialog.querySelector('[data-detail-price-label]');
      const priceValue = dialog.querySelector('[data-detail-price-value]');
      if (priceLabel && priceValue) {
        priceLabel.textContent = item.price ? 'Precio de la salida' : (detail.priceLabel || 'Precio');
        priceValue.textContent = item.price || detail.priceValue || 'A consultar';
      }
      const priceBasis = dialog.querySelector('[data-detail-price-basis]');
      if (priceBasis) {
        priceBasis.textContent = item.price ? '' : (detail.priceBasis || '');
        priceBasis.hidden = !priceBasis.textContent;
      }
      const bookingLink = dialog.querySelector('[data-detail-booking]');
      if (bookingLink && item.date && detail.bookingProgramId) {
        bookingLink.href = programBooking.buildBookingUrl(detail.bookingProgramId, item.date);
      }
    }));
    if (!dialogReturnFocus || !dialogReturnFocus.isConnected) dialogReturnFocus = document.activeElement;
    dialog.showModal();
  }

  function readHeadingItems(container, pattern) {
    const headings = [...container.querySelectorAll('h2,h3,h4')].filter(heading => pattern.test(normalize(heading.textContent)));
    return headings.flatMap(heading => [...(heading.parentElement?.querySelectorAll('li') || [])].map(item => item.textContent.replace(/\s+/g,' ').trim()).filter(Boolean));
  }

  function showHistoricalProgram(record, card, section) {
    if (section.querySelectorAll('.package-card').length !== 1) return false;
    const detailItems = [...card.querySelectorAll('.package-details li')].map(item => item.textContent.replace(/\s+/g,' ').trim()).filter(Boolean);
    const tagText = card.querySelector('.package-tag')?.textContent.replace(/\s+/g,' ').trim() || '';
    const dateDetails = [...card.querySelectorAll('.package-details li')].filter(item => {
      const text = item.textContent.replace(/\s+/g,' ').trim();
      return item.querySelector('.fa-calendar-alt,.fa-calendar,.fa-calendar-check') || /^(salida|fecha|vigencia|inicio|salidas)\b/i.test(text);
    }).map(item => item.textContent.replace(/\s+/g,' ').trim()).filter(Boolean);
    const availabilityText = [tagText, ...dateDetails].filter((value,index,array) => value && array.indexOf(value) === index && (/salida|fecha|vigencia|inicio|semanal|solicitud/i.test(value) || hasConcreteDepartureDate(value))).join(' · ');
    const tagIsDate = tagText && hasConcreteDepartureDate(tagText);
    const explicitCodeNode = card.querySelector('[data-operator-code],.operator-code');
    const titleCodeMatch = record.name.match(/\bC[oó]digo\s+([A-Za-z0-9][A-Za-z0-9._/-]*)/i);
    const explicitCode = card.dataset.operatorCode || explicitCodeNode?.getAttribute('data-operator-code') || explicitCodeNode?.textContent || titleCodeMatch?.[1] || '';
    const detailTitle = titleCodeMatch
      ? record.name.replace(/\s*(?:[·—–-]\s*)?C[oó]digo\s+[A-Za-z0-9][A-Za-z0-9._/-]*\s*$/i,'').trim()
      : record.name;
    const priceOptions = [...card.querySelectorAll('.package-price')].map(item => item.textContent.replace(/\s+/g,' ').trim()).filter(Boolean);
    const itineraryNodes = [...section.querySelectorAll('strong')].filter(item => {
      const text = item.textContent.replace(/\s+/g,' ').trim();
      return /^(?:d[ií]as?\s+\d+\b|\d{1,2}\s+(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\b)/i.test(text);
    });
    const itinerary = itineraryNodes.map((node,index) => {
      const sourceTitle = node.textContent.replace(/\s+/g,' ').trim();
      const numbered = sourceTitle.match(/^D[ií]as?\s+(\d+)\s*[-–—:]\s*(.*)$/i);
      const dated = sourceTitle.match(/^(\d{1,2}\s+(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\s*:\s*)(.*)$/i);
      const block = node.parentElement || node;
      const paragraphs = [...block.querySelectorAll('p')].map(item => item.textContent.trim()).filter(Boolean);
      return {
        day: numbered ? numbered[1] : String(index + 1),
        title: numbered ? (numbered[2] || sourceTitle) : dated ? (dated[1] + dated[2]).trim() : sourceTitle,
        description: paragraphs.join('\n\n')
      };
    });
    const allImages = [...card.querySelectorAll('.package-image img')].map(image => image.currentSrc || image.src).filter(Boolean);
    const explicitIncluded = readHeadingItems(section, /^(incluye|servicios incluidos|el programa incluye)$/);
    const excluded = readHeadingItems(section, /(no incluye|servicios no incluidos|no incluido)/);
    const conditions = readHeadingItems(section, /(condiciones|notas importantes|importante)/);
    const summary = section.querySelector('.dest-hero p')?.textContent.trim() || '';
    const priceSource = priceOptions[0] || record.priceText || '';
    const priceLabel = /^desde\b/i.test(priceSource) ? 'Desde' : 'Tarifa informada';
    const priceValue = priceSource.replace(/^desde\s*/i,'');
    const detailsWithoutHeading = explicitIncluded.length ? [] : detailItems;
    renderProgramDetail({
      title:detailTitle || record.name,
      programId:record.id,
      operatorCode:explicitCode,
      region:record.region || '',
      destination:'',
      type:!tagIsDate ? tagText : detailTypeLabel(record.types),
      summary,
      images:allImages,
      departureText:availabilityText,
      availabilityText:availabilityText && !dateDetails.length ? availabilityText : '',
      departures:dateDetails.map(label => ({label,price:'',selectable:false})),
      duration:record.duration || '',
      priceLabel,
      priceValue:priceValue || 'A consultar',
      priceBasis:'',
      priceOptions:priceOptions.slice(1),
      itinerary,
      included:explicitIncluded,
      excluded,
      additionalDetails:detailsWithoutHeading,
      conditions
    });
    return true;
  }

  function showObjectProgram(record, trip, source, key, fallbackOpen) {
    const rawRoute = trip.route || trip.itinerary || [];
    const rawDepartures = trip.departures || trip.departure || '';
    const rawPrices = Array.isArray(trip.prices) ? trip.prices : trip.price != null ? [trip.price] : [];
    const explicitImages = [trip.image_path,trip.image].filter(Boolean);
    [trip.images,trip.gallery,trip.image_urls].forEach(group => {
      if (Array.isArray(group)) group.forEach(item => explicitImages.push(typeof item === 'string' ? item : item?.url || item?.path || item?.image_path || ''));
    });
    const images = [...new Set(explicitImages.filter(Boolean))];
    const includes = detailValues(trip.includes);
    const excluded = detailValues(trip.excludes || trip.notIncluded || trip.not_included);
    const hasSourceDetail = Boolean((Array.isArray(rawRoute) && rawRoute.length) || rawDepartures || rawPrices.length || images.length || includes.length || excluded.length || trip.subtitle || trip.cities || trip.duration || trip.notes || trip.conditions);
    if (!hasSourceDetail) {
      if (typeof fallbackOpen === 'function') fallbackOpen(key);
      return;
    }
    const route = Array.isArray(rawRoute) ? rawRoute : [];
    const itinerary = route.map((item,index) => {
      if (typeof item === 'string') return {day:String(index + 1),title:'Día ' + (index + 1),description:item};
      if (Array.isArray(item)) return {day:String(index + 1),title:String(item[0] || 'Día ' + (index + 1)),description:item.slice(1).map(String).join(' ')};
      return {day:String(item.day || item.position || index + 1),title:item.title || item.name || 'Día ' + (index + 1),description:item.description || item.text || '',date:item.date || '',notes:item.notes || item.meals || ''};
    });
    const rawDepartureList = Array.isArray(rawDepartures) ? rawDepartures : rawDepartures ? [rawDepartures] : [];
    const departures = rawDepartureList.filter(item => typeof item === 'object' && item !== null).map(item => {
      const rawDate = item.departure_date || item.date || item.label || '';
      const label = item.departure_date ? publicDate(item.departure_date) : String(rawDate);
      const price = item.price != null && item.price !== '' ? (typeof item.price === 'number' ? detailMoney(item.price,trip.currency || 'USD') : String(item.price)) : '';
      return {label,price,selectable:Boolean(rawDate && hasConcreteDepartureDate(String(rawDate)))};
    });
    const textDepartures = rawDepartureList.filter(item => typeof item !== 'object' || item === null).map(item => String(item));
    const availabilityText = textDepartures.join(' · ') || (trip.departureType === 'weekly' ? 'Salidas semanales' : trip.departureType === 'on-request' ? 'A solicitud' : '');
    const namedCodeMatch = String(trip.name || record.name).match(/\bC[oó]digo\s+([A-Za-z0-9][A-Za-z0-9._/-]*)/i);
    const operatorCode = trip.operator_code || trip.operatorCode || trip.code || (source === 'loaded' && typeof tourCodeByKey !== 'undefined' ? tourCodeByKey[key] || '' : '') || namedCodeMatch?.[1] || '';
    const detailTitle = namedCodeMatch
      ? String(trip.name || record.name).replace(/\s*(?:[·—–-]\s*)?C[oó]digo\s+[A-Za-z0-9][A-Za-z0-9._/-]*\s*$/i,'').trim()
      : record.name;
    const firstPrice = rawPrices.length ? rawPrices[0] : '';
    const priceValue = firstPrice == null || firstPrice === '' ? 'A consultar' : String(firstPrice);
    const priceOptions = rawPrices.slice(1).map(value => String(value));
    const cityText = Array.isArray(trip.cities) ? trip.cities.join(', ') : trip.cities || '';
    renderProgramDetail({
      title:detailTitle || record.name,
      programId:record.id,
      operatorCode,
      region:record.region || '',
      destination:cityText,
      type:detailTypeLabel(record.types),
      summary:trip.subtitle || cityText,
      images,
      departureText:availabilityText || (departures.length === 1 ? departures[0].label : departures.length > 1 ? departures.length + ' fechas de salida' : ''),
      availabilityText,
      departures,
      duration:trip.duration || record.duration || '',
      priceLabel:/^desde\b/i.test(priceValue) ? 'Desde' : 'Tarifa informada',
      priceValue,
      priceBasis:trip.price_basis || '',
      priceOptions,
      itinerary,
      included,
      excluded,
      additionalDetails:detailValues(trip.additionalDetails || trip.details),
      conditions:detailValues(trip.conditions || trip.notes || trip.notice)
    });
  }

  function showPublicProgram(program) {
    const departures = [...(program.departures || [])].sort((a,b) => String(a.departure_date || '').localeCompare(String(b.departure_date || '')));
    const rangeMode = isRangeProgram(program);
    const rangeText = rangeMode ? dateMode.rangeLabel(program.travel_start_date,program.travel_end_date) : '';
    const currency = program.currency || 'USD';
    const basePriceAvailable = program.price != null && program.price_prefix !== 'consult';
    const priceBasis = {double:'por persona en doble',single:'por persona en single',package:'por paquete'}[program.price_basis] || '';
    const destinations = Array.isArray(program.destinations) ? program.destinations.join(', ') : String(program.destinations || '');
    const countries = Array.isArray(program.countries) ? program.countries.join(', ') : String(program.countries || '');
    const departureRows = rangeMode ? [] : departures.map(item => ({
      label:item.departure_date ? publicDate(item.departure_date) : '',
      date:item.departure_date || null,
      price:item.price != null ? detailMoney(item.price,currency) : '',
      selectable:Boolean(item.departure_date)
    }));
    const weeklyOrRequest = program.departure_type === 'weekly' ? 'Salidas semanales' : program.departure_type === 'on-request' ? 'A solicitud' : '';
    const departureSummary = rangeText || (departures.length === 1 ? publicDate(departures[0].departure_date) : departures.length > 1 ? departures.length + ' fechas de salida' : weeklyOrRequest);
    const itinerary = [...(program.itinerary_days || [])].sort((a,b) => Number(a.position || 0) - Number(b.position || 0)).map(day => ({
      day:String(day.position || ''),title:day.title || '',description:day.description || '',notes:day.meals || ''
    }));
    renderProgramDetail({
      title:program.title,
      programId:`supabase:${program.id}`,
      bookingProgramId:`supabase:${program.id}`,
      operatorCode:program.operator_code,
      region:program.region || '',
      destination:destinations || countries,
      type:detailTypeLabel(publicTypes(program)),
      summary:program.summary || '',
      images:program.image_path ? [program.image_path] : [],
      departureText:departureSummary,
      availabilityText:rangeMode ? '' : departures.length ? '' : weeklyOrRequest,
      rangeText,
      rangeNotice:rangeMode ? dateMode.RANGE_NOTICE : '',
      departures:departureRows,
      duration:program.duration || '',
      priceLabel:program.price_prefix === 'from' ? 'Desde' : 'Precio',
      priceValue:basePriceAvailable ? detailMoney(program.price,currency) : 'A consultar',
      priceBasis,
      itinerary,
      included:detailValues(program.includes),
      excluded:[],
      additionalDetails:[],
      conditions:detailValues(program.notes)
    });
  }

  function collectPublicPrograms(programs) {
    (programs || []).forEach(program => {
      if (!program.title || (program.status && program.status !== 'published')) return;
      const departures = [...(program.departures || [])].sort((a,b) => String(a.departure_date || '').localeCompare(String(b.departure_date || '')));
      const departureText = publicAvailability(program);
      const itineraryText = (program.itinerary_days || []).map(day => `${day.title || ''} ${day.description || ''}`).join(' ');
      const searchText = [program.title,program.operator_code,program.region,(program.countries || []).join(' '),(program.destinations || []).join(' '),program.duration,departureText,program.summary,program.notes,(program.includes || []).join(' '),itineraryText].filter(Boolean).join(' ');
      addRecord({
        id:`supabase:${program.id}`,
        name:program.title,
        source:'supabase',
        operator_code:program.operator_code || '',
        status:program.status || 'published',
        searchText,
        departureText,
        departureDates:isRangeProgram(program) ? [] : departures.map(item => item.departure_date).filter(Boolean),
        geographyRegion:program.region || '',
        countries:program.countries || [],
        destinations:program.destinations || [],
        experienceTypes:Array.isArray(program.travel_types) ? program.travel_types : [],
        priceText:publicPrice(program),
        priceFrom:program.price == null ? null : Number(program.price),
        duration:program.duration || '',
        image:program.image_path || '',
        region:program.region || inferRegion(searchText,'supabase'),
        types:publicTypes(program),
        authoritativeTypes:true,
        months:isRangeProgram(program)?dateMode.rangeMonths(program.travel_start_date,program.travel_end_date):departures.map(item => MONTHS[new Date(`${item.departure_date}T12:00:00`).getMonth()]?.[0]).filter(Boolean),
        featured:Boolean(program.featured),
        comparison: {
          image:program.image_path || '',
          destinations:[...(Array.isArray(program.destinations) ? program.destinations : detailValues(program.destinations)),...(Array.isArray(program.countries) ? program.countries : detailValues(program.countries))],
          route:[...(program.itinerary_days || [])].sort((a,b) => Number(a.position || 0) - Number(b.position || 0)).map(day => day.title || '').filter(Boolean),
          duration:program.duration || '',
          availabilityLabel:isRangeProgram(program) ? 'Período de viaje' : departures.some(item => item.departure_date) ? 'Fechas de salida' : 'Disponibilidad informada',
          availability:isRangeProgram(program) ? [dateMode.rangeLabel(program.travel_start_date,program.travel_end_date)].filter(Boolean) : departures.map(item => item.departure_date ? publicDate(item.departure_date) : '').filter(Boolean).concat(!departures.length && program.departure_type === 'weekly' ? ['Salidas semanales'] : !departures.length && program.departure_type === 'on-request' ? ['A solicitud'] : []),
          priceText:basePriceForComparison(program),
          priceBasis:({double:'Por persona en doble',single:'Por persona en single',package:'Por paquete'}[program.price_basis] || ''),
          included:detailValues(program.includes),
          excluded:detailValues(program.excludes || program.not_included),
          operatorCode:program.operator_code || ''
        },
        open:function () { showPublicProgram(program); }
      });
    });
    window.travelCatalog = catalog;
    comparisonStore()?.reconcile(favoritePrograms());
    updateComparisonButtons();
    if (!document.getElementById('travelComparisonSection')?.hidden) renderComparisonView();
  }

  function isExoticQuery(query) {
    return /^exoticos?$/.test(query);
  }

  function isExoticRecord(record) {
    return record.region === 'África'
      || record.region === 'Asia y Exóticos'
      || /\b(?:islas? del indico|oceano indico|maldivas|mauritius|mauricio|seychelles|zanzibar|madagascar|isla reunion|reunion island)\b/.test(record.normalized);
  }

  function score(record, query) {
    if (!query) return 1;
    const name = normalize(record.name);
    const region = normalize(record.region);
    let value = 0;
    if (isExoticQuery(query) && isExoticRecord(record)) value += 100;
    if (name === query) value += 120;
    if (name.startsWith(query)) value += 80;
    if (name.includes(query)) value += 55;
    if (region.includes(query)) value += 30;
    query.split(' ').filter(Boolean).forEach(token => {
      if (record.normalized.includes(token)) value += 8;
    });
    return value;
  }

  function currentFilters() {
    return {
      query: normalize(document.getElementById('travelDestination').value),
      month: document.getElementById('travelMonth').value,
      type: document.getElementById('travelType').value,
      navigation:activeNavigationFilter
    };
  }

  function filterCatalog(filters) {
    const exactDestination = filters.query && programFilters.destinationKey(filters.query);
    const source = programFilters.filterByNavigation(catalog,filters.navigation,{days:60});
    const matched = source
      .map(record => ({record, score:score(record, filters.query)}))
      .filter(item => !filters.query || (isExoticQuery(filters.query)
        ? isExoticRecord(item.record)
        : exactDestination ? programFilters.matchesDestination(item.record, exactDestination) : item.score > 0))
      .filter(item => !filters.month || item.record.months.includes(filters.month))
      .filter(item => !filters.type || item.record.types.includes(filters.type))
      .filter(item => !filters.experience || programFilters.matchesExperience(item.record,filters.experience))
      .sort((a,b) => b.score - a.score || (a.record.priceFrom || Infinity) - (b.record.priceFrom || Infinity))
      .map(item => item.record);
    return programFilters.dedupePrograms(matched);
  }

  function readableType(record) {
    const labels = {
      'personalizado':'A medida','lujo':'Lujo','low-cost':'Low cost','sin-aereo':'Sin aéreo',
      'con-aereo':'Con aéreo','grupal':'Salida grupal','luna-de-miel':'Luna de miel','programa':'Programa'
    };
    return labels[record.types[0]] || 'Programa';
  }

  function compactDeparture(text) {
    const clean = String(text || '').replace(/\s+/g,' ').trim();
    return clean ? (clean.length > 46 ? `${clean.slice(0,43)}…` : clean) : 'Consultar salida';
  }

  function cardHtml(record, options = {}) {
    const departure = record.nextDepartureDate ? displayUpcomingDate(record.nextDepartureDate) : compactDeparture(record.departureText);
    const favorite = canFavorite(record) ? favoritesModule.buttonHtml(record.id, favoriteStore()?.has(record.id), record.name) : '';
    const compare = options.includeCompare && canCompare(record)
      ? comparisonModule.buttonHtml(record.id, record.name, comparisonStore()?.has(record.id)).replace('trip-compare-button','favorite-card-compare-button')
      : '';
    return `<article class="trip-card" data-open-trip="${escapeHtml(record.id)}" tabindex="0" role="group" aria-label="Programa ${escapeHtml(record.name)}">
      ${favorite}
      <div class="trip-card-media"><img src="${escapeHtml(record.image)}" alt="${escapeHtml(record.name)}" loading="lazy"><span class="trip-chip">${escapeHtml(readableType(record))}</span></div>
      <div class="trip-card-body">
        <h3>${escapeHtml(record.name)}</h3>
        <div class="trip-meta"><span><i class="far fa-calendar-alt"></i>${escapeHtml(departure)}</span>${record.duration ? `<span><i class="far fa-clock"></i>${escapeHtml(record.duration)}</span>` : ''}</div>
        <div class="trip-price">${record.priceText ? escapeHtml(compactPrice(record.priceText)) : 'Precio a consultar'}</div>
      </div>
      ${compare ? `<div class="favorite-compare-actions">${compare}</div>` : ''}
    </article>`;
  }

  function compactPrice(text) {
    const clean = String(text || '').replace(/\s+/g,' ').trim();
    const match = clean.match(/(?:Desde\s+)?(?:USD|U\$S|US\$|\$)\s*[0-9][0-9.,]*/i);
    if (match) return /^desde/i.test(match[0]) ? match[0] : `Desde ${match[0]}`;
    return clean.length > 38 ? `${clean.slice(0,35)}…` : clean;
  }

  function renderResults(records, filters, emptyMessage) {
    window.hideFavoriteTripsView?.();
    const section = document.getElementById('travelResults');
    const summary = document.getElementById('travelResultsSummary');
    const grid = document.getElementById('travelResultsGrid');
    section.classList.add('visible');
    const experienceLabels = {grupal:'Viajes grupales',personalizado:'Viajes a medida','sin-aereo':'Circuitos sin aéreo',lujo:'Viajes de lujo','low-cost':'Low cost'};
    const navigationLabel = filters.navigation && filters.navigation.kind === 'destination' ? filters.navigation.value
      : filters.navigation && filters.navigation.kind === 'experience' ? experienceLabels[filters.navigation.value]
      : filters.navigation && filters.navigation.kind === 'upcoming' ? 'Próximas salidas · próximos 60 días'
      : filters.navigation && filters.navigation.kind === 'mode' ? ({playa:'Modo Playa'}[filters.navigation.value] || 'este modo') : '';
    const detail = [navigationLabel, filters.query && `“${document.getElementById('travelDestination').value.trim()}”`, filters.month && MONTHS.find(m => m[0] === filters.month)?.[1], filters.type && document.getElementById('travelType').selectedOptions[0].text].filter(Boolean).join(' · ');
    summary.textContent = `${records.length} ${records.length === 1 ? 'viaje encontrado' : 'viajes encontrados'}${detail ? ` para ${detail}` : ''}`;
    grid.innerHTML = records.length
      ? records.map(cardHtml).join('')
      : `<div class="search-results-empty" style="grid-column:1/-1"><i class="fas fa-compass"></i><strong>${escapeHtml(emptyMessage || 'No encontramos programas con esos filtros.')}</strong><p>${emptyMessage ? 'Volvé a consultar más adelante o probá con otro destino.' : 'Probá con otro destino, mes o tipo de viaje.'}</p></div>`;
    updateFavoriteButtons();
    updateComparisonButtons();
    section.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function runSearch(event, emptyMessage) {
    if (event) event.preventDefault();
    const filters = currentFilters();
    renderResults(filterCatalog(filters), filters, emptyMessage);
  }

  window.runModoRumboSearch = function () {
    activeNavigationFilter = null;
    runSearch();
  };

  function runTravelMode(mode) {
    activeNavigationFilter = {kind:'mode',value:mode};
    clearTravelFilters();
    runSearch();
  }

  function clearTravelFilters() {
    document.getElementById('travelDestination').value = '';
    ['travelMonth','travelType'].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      select.value = '';
      const field = select.closest('.compact-select-field');
      const valueLabel = field && field.querySelector('[data-select-value]');
      if (valueLabel && field.dataset.placeholder) valueLabel.textContent = field.dataset.placeholder;
    });
  }

  function hideTravelResults() {
    const section = document.getElementById('travelResults');
    const summary = document.getElementById('travelResultsSummary');
    const grid = document.getElementById('travelResultsGrid');
    if (section) section.classList.remove('visible');
    if (summary) summary.textContent = '';
    if (grid) grid.innerHTML = '';
  }

  function openTrip(id, invoker) {
    const record = catalogById.get(id);
    if (record && typeof record.open === 'function') {
      dialogReturnFocus = invoker || document.activeElement;
      record.open();
    }
  }

  function renderFeatured() {
    const target = document.getElementById('featuredTripsGrid');
    const section = document.getElementById('featured-home');
    if (!target || !section || !featuredCarousel) return;
    const picks = featuredCarousel.selectPublishedFeatured(catalog);
    target.innerHTML = picks.map(cardHtml).join('');
    section.hidden = picks.length === 0;
    updateFavoriteButtons();
    updateComparisonButtons();
    renderFeaturedCarouselControls();
  }

  function featuredTrack() { return document.getElementById('featuredTripsGrid'); }
  function featuredCapacity() { return featuredCarousel.visibleCapacity(window.innerWidth); }
  function featuredPageCount() {
    return featuredCarousel.pageCount(featuredTrack()?.children.length || 0,featuredCapacity());
  }
  function featuredCurrentIndex() {
    const track=featuredTrack(), first=track?.firstElementChild;
    if(!track||!first)return 0;
    const gap=parseFloat(getComputedStyle(track).columnGap)||0;
    return Math.round(track.scrollLeft/(first.getBoundingClientRect().width+gap));
  }
  function updateFeaturedCarouselControls() {
    const track=featuredTrack(), controls=document.getElementById('featuredCarouselControls');
    const previous=document.getElementById('featuredPrevious'), next=document.getElementById('featuredNext');
    const pagination=document.getElementById('featuredPagination');
    if(!track||!controls||!previous||!next||!pagination)return;
    const count=track.children.length,capacity=featuredCapacity(),pages=featuredCarousel.pageCount(count,capacity);
    controls.hidden=count<=capacity;
    const currentIndex=featuredCurrentIndex();
    const activePage=featuredCarousel.activePage(currentIndex,count,capacity);
    if(pagination.children.length!==pages){
      pagination.innerHTML=Array.from({length:pages},(_,page)=>`<button type="button" data-featured-page="${page}" aria-label="Mostrar página ${page+1} de ${pages}" aria-controls="featuredTripsGrid" aria-current="${page===activePage?'true':'false'}"></button>`).join('');
    }
    pagination.querySelectorAll('[data-featured-page]').forEach(dot=>dot.setAttribute('aria-current',String(Number(dot.dataset.featuredPage)===activePage)));
    previous.disabled=activePage<=0;
    next.disabled=activePage>=pages-1;
  }
  function renderFeaturedCarouselControls() { updateFeaturedCarouselControls(); }
  function scrollFeaturedToPage(page) {
    const track=featuredTrack(),count=track?.children.length||0,capacity=featuredCapacity();
    if(!track||!count)return;
    const index=featuredCarousel.pageStart(page,count,capacity),card=track.children[index];
    if(card){const left=track.scrollLeft+card.getBoundingClientRect().left-track.getBoundingClientRect().left;track.scrollTo({left,behavior:'smooth'});}
  }
  function bindFeaturedCarousel() {
    const track=featuredTrack(),pagination=document.getElementById('featuredPagination');
    document.getElementById('featuredPrevious')?.addEventListener('click',()=>scrollFeaturedToPage(featuredCarousel.activePage(featuredCurrentIndex(),track.children.length,featuredCapacity())-1));
    document.getElementById('featuredNext')?.addEventListener('click',()=>scrollFeaturedToPage(featuredCarousel.activePage(featuredCurrentIndex(),track.children.length,featuredCapacity())+1));
    pagination?.addEventListener('click',event=>{const dot=event.target.closest('[data-featured-page]');if(dot)scrollFeaturedToPage(Number(dot.dataset.featuredPage));});
    track?.addEventListener('scroll',()=>window.requestAnimationFrame(updateFeaturedCarouselControls),{passive:true});
    window.addEventListener('resize',updateFeaturedCarouselControls,{passive:true});
  }

  function renderDepartures() {
    const target = document.getElementById('upcomingDepartures');
    if (!target) return;
    const records = programFilters.upcomingDepartures(catalog,{days:60}).slice(0,6);
    target.innerHTML = records.map(({program,departureDate}) => {
      return `<article class="departure-item" data-open-trip="${escapeHtml(program.id)}" tabindex="0" role="button">
        <div class="departure-date">${escapeHtml(displayUpcomingDate(departureDate))}</div>
        <div class="departure-info"><h3>${escapeHtml(program.name)}</h3><p>${escapeHtml(program.duration || '')}</p></div>
        <i class="fas fa-arrow-right"></i>
      </article>`;
    }).join('');
  }

  function displayUpcomingDate(value) {
    if (!programFilters.validIsoDate(value)) return '';
    return new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})
      .format(new Date(`${value}T12:00:00Z`));
  }

  window.showUpcomingDepartures = function () {
    showSection('home');
    activeNavigationFilter = {kind:'upcoming'};
    clearTravelFilters();
    runSearch(null,'No hay salidas confirmadas dentro de los próximos 60 días.');
  };

  function clearAllFiltersFavoritesAndComparison() {
    activeNavigationFilter = null;
    clearTravelFilters();
    favoriteStore()?.clear?.();
    comparisonStore()?.clear?.();
    updateFavoriteButtons();
    updateComparisonButtons();
    if (!document.getElementById('favoriteTripsSection')?.hidden) renderFavoriteTrips();
    if (!document.getElementById('travelComparisonSection')?.hidden) renderComparisonView();
    window.showAllTrips();
  }

  window.requestClearAll = function () {
    const dialog = document.getElementById('clearAllConfirmDialog');
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    else if (window.confirm('¿Querés limpiar los filtros y eliminar todos tus favoritos y viajes seleccionados para comparar?')) clearAllFiltersFavoritesAndComparison();
  };

  function bindEvents() {
    bindFeaturedCarousel();
    const form = document.getElementById('travelSearchForm');
    if (form) form.addEventListener('submit', runSearch);
    const clearDialog = document.getElementById('clearAllConfirmDialog');
    clearDialog?.querySelector('[data-cancel-clear-all]')?.addEventListener('click', () => clearDialog.close());
    clearDialog?.querySelector('[data-confirm-clear-all]')?.addEventListener('click', () => { clearDialog.close(); clearAllFiltersFavoritesAndComparison(); });
    document.addEventListener('click', event => {
      const clearRequest = event.target.closest('[data-request-clear-all]');
      if (clearRequest) { event.preventDefault(); window.requestClearAll(); return; }
      const comparisonButton = event.target.closest('[data-toggle-compare]');
      if (comparisonButton) {
        event.preventDefault();
        event.stopPropagation();
        if (!comparisonButton.closest('#favoriteTripsGrid') || document.getElementById('favoriteTripsSection')?.hidden) return;
        const result = comparisonStore()?.toggle(comparisonButton.dataset.toggleCompare);
        if (result?.reason === 'limit') showComparisonLimitNotice();
        if (result?.changed) {
          updateComparisonButtons();
          if (!document.getElementById('favoriteTripsSection')?.hidden) renderFavoriteTrips();
          if (!document.getElementById('travelComparisonSection')?.hidden) renderComparisonView();
        }
        return;
      }
      const removeComparison = event.target.closest('[data-remove-comparison]');
      if (removeComparison) {
        event.preventDefault();
        event.stopPropagation();
        comparisonStore()?.toggle(removeComparison.dataset.removeComparison);
        updateComparisonButtons();
        if (!document.getElementById('travelComparisonSection')?.hidden) renderComparisonView();
        return;
      }
      if (event.target.closest('[data-close-comparison]')) {
        window.hideTravelComparisonView?.();
        document.getElementById('travel-search')?.scrollIntoView({behavior:'smooth',block:'center'});
        return;
      }
      const favoriteButton = event.target.closest('[data-toggle-favorite]');
      if (favoriteButton) {
        event.preventDefault();
        event.stopPropagation();
        favoriteStore()?.toggle(favoriteButton.dataset.toggleFavorite);
        if (publicCatalogReady) comparisonStore()?.reconcile(favoritePrograms());
        updateFavoriteButtons();
        updateComparisonButtons();
        if (!document.getElementById('favoriteTripsSection')?.hidden) renderFavoriteTrips();
        if (!document.getElementById('travelComparisonSection')?.hidden) renderComparisonView();
        return;
      }
      if (event.target.closest('[data-close-favorites]')) {
        const section = document.getElementById('favoriteTripsSection');
        if (section) section.hidden = true;
        document.getElementById('travel-search')?.scrollIntoView({behavior:'smooth',block:'center'});
        return;
      }
      const opener = event.target.closest('[data-open-trip]');
      if (opener) openTrip(opener.dataset.openTrip, opener);
      const query = event.target.closest('[data-search-query]');
      if (query) {
        showSection('home');
        clearTravelFilters();
        if (query.closest('#mobileDestinationsMenu')) {
          activeNavigationFilter = {kind:'destination',value:query.dataset.searchQuery};
        } else {
          activeNavigationFilter = null;
          document.getElementById('travelDestination').value = query.dataset.searchQuery;
        }
        runSearch();
      }
      const type = event.target.closest('[data-search-type]');
      if (type) {
        showSection('home');
        activeNavigationFilter = null;
        clearTravelFilters();
        document.getElementById('travelType').value = type.dataset.searchType;
        runSearch();
      }
      const experience = event.target.closest('[data-search-experience]');
      if (experience) {
        showSection('home');
        activeNavigationFilter = {kind:'experience',value:experience.dataset.searchExperience};
        clearTravelFilters();
        runSearch();
      }
      const mode = event.target.closest('[data-search-mode]');
      if (mode) {
        showSection('home');
        runTravelMode(mode.dataset.searchMode);
      }
    });
    document.addEventListener('keydown', event => {
      if (event.target.closest && event.target.closest('[data-toggle-favorite]')) return;
      if (event.target.closest && event.target.closest('[data-toggle-compare],[data-remove-comparison]')) return;
      const action = event.target.closest && event.target.closest('[data-open-trip],[data-search-query],[data-search-type],[data-search-experience],[data-search-mode],[data-upcoming-departures]');
      if (action && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        action.click();
      }
    });
    window.addEventListener('storage', event => {
      if (favoritesModule && event.key === favoritesModule.STORAGE_KEY) {
        if (publicCatalogReady) comparisonStore()?.reconcile(favoritePrograms());
        updateFavoriteButtons();
        updateComparisonButtons();
        if (!document.getElementById('favoriteTripsSection')?.hidden) renderFavoriteTrips();
        if (!document.getElementById('travelComparisonSection')?.hidden) renderComparisonView();
      }
      if (comparisonModule && event.key === comparisonModule.STORAGE_KEY) {
        updateComparisonButtons();
        if (!document.getElementById('travelComparisonSection')?.hidden) renderComparisonView();
      }
    });
  }

  window.goHomeTo = function (id) {
    showSection('home');
    window.setTimeout(() => {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({behavior:'smooth',block:'start'});
    }, 80);
  };

  window.showAllTrips = function () {
    showSection('home');
    activeNavigationFilter = null;
    clearTravelFilters();
    runSearch();
  };

  window.goHomeAndReset = function () {
    showSection('home');
    activeNavigationFilter = null;
    clearTravelFilters();
    hideTravelResults();
  };

  async function init() {
    buildCatalog();
    bindEvents();
    renderFeatured();
    renderDepartures();
    updateFavoriteButtons();
    updateComparisonButtons();
    const count = document.getElementById('catalogCount');
    if (count) count.textContent = catalog.length;
    let publicCatalogLoadFailed = false;
    if (typeof window.loadModoRumboPrograms === 'function') {
      try {
        collectPublicPrograms(await window.loadModoRumboPrograms());
        renderFeatured();
        renderDepartures();
        updateFavoriteButtons();
        if (count) count.textContent = catalog.length;
        if (document.getElementById('travelResults')?.classList.contains('visible')) runSearch();
      } catch (error) {
        publicCatalogLoadFailed = true;
        console.warn('Los programas del panel no pudieron cargarse; se conserva el catálogo local.', error);
      }
    }
    publicCatalogReady = true;
    comparisonStore()?.reconcile(favoritePrograms());
    updateFavoriteButtons();
    updateComparisonButtons();
    const requestedProgramId = new URLSearchParams(window.location.search).get('programa');
    if (requestedProgramId) {
      const resolution = await programSharing.openProgramLink(
        requestedProgramId,
        async () => catalog,
        program => openTrip(program.id)
      );
      if (resolution.opened) {
        return;
      } else {
        const message = publicCatalogLoadFailed
          ? 'No pudimos cargar el catálogo para abrir este programa. Revisá tu conexión e intentá nuevamente.'
          : 'Este programa ya no está disponible o no se encuentra publicado.';
        renderResults([], {query:'',month:'',type:'',navigation:null}, message);
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

