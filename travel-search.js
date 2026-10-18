(function () {
  'use strict';

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
    if (/sin aereo|no incluye vuelo internacional|plane slash|circuito/.test(n) || /loaded|midas|lowcost/.test(source)) result.add('sin-aereo');
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
    record.types = applyClassificationRules(record);
    record.months = record.months || extractMonths(record.departureText);
    record.priceFrom = record.priceFrom == null ? parsePrice(record.priceText) : record.priceFrom;
    record.duration = record.duration || extractDuration(record.searchText);
    record.normalized = normalize([record.name, record.region, record.searchText, record.types.join(' ')].join(' '));
    catalog.push(record);
    catalogById.set(record.id, record);
  }

  function collectStaticPrograms() {
    document.querySelectorAll('.page-section[id^="section-"]').forEach(section => {
      const sectionKey = section.id.replace('section-', '');
      if (['home','hotel-search','tour-sin-aereos','europa-medida','tour-low-cost'].includes(sectionKey)) return;
      section.querySelectorAll('.package-card').forEach((card, index) => {
        const title = card.querySelector('.package-info h3, h3');
        if (!title) return;
        const info = card.querySelector('.package-info') || card;
        const tag = card.querySelector('.package-tag');
        const price = card.querySelector('.package-price');
        const img = card.querySelector('img');
        const explicitTypes = (card.dataset.travelTypes || section.dataset.travelTypes || '').split(',').map(type => type.trim()).filter(Boolean);
        const id = `static:${sectionKey}:${index}`;
        card.dataset.tripId = id;
        addRecord({
          id,
          name: title.textContent.trim(),
          source: `static ${sectionKey}`,
          searchText: `${info.textContent} ${section.textContent}`,
          departureText: `${tag ? tag.textContent : ''} ${info.textContent}`,
          priceText: price ? price.textContent : '',
          image: img ? img.src : '',
          types: explicitTypes.length ? explicitTypes : undefined,
          duration: extractDuration(info.textContent),
          open: function () {
            showSection(sectionKey);
            window.setTimeout(() => {
              const target = document.querySelector(`[data-trip-id="${id}"]`);
              if (target && section.querySelectorAll('.package-card').length > 1) target.scrollIntoView({behavior:'smooth',block:'center'});
            }, 120);
          }
        });
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
        types: ['personalizado'],
        open: function () { showSection(sectionKey); }
      });
    });
  }

  function collectObjectPrograms(object, source, openFn, options) {
    if (!object) return;
    Object.entries(object).forEach(([key, trip]) => {
      const name = trip.name || key;
      const route = trip.route || trip.itinerary || [];
      const routeText = route.map(item => Array.isArray(item) ? item.join(' ') : item).join(' ');
      const includes = (trip.includes || []).join(' ');
      const departures = trip.departures || trip.departure || '';
      const prices = Array.isArray(trip.prices) ? trip.prices.join(' ') : (trip.price || '');
      const text = [name, trip.subtitle, trip.cities, trip.duration, departures, prices, includes, routeText].filter(Boolean).join(' ');
      addRecord({
        id: `${source}:${key}`,
        name,
        source,
        searchText: text,
        departureText: departures,
        priceText: prices,
        duration: trip.duration || extractDuration(text),
        types: options && options.types
          ? [...new Set([...options.types, ...inferTypes(text, source)])]
          : inferTypes(text, source),
        open: function () { openFn(key); }
      });
    });
  }

  function buildCatalog() {
    collectStaticPrograms();
    collectCustomDestinations();
    collectObjectPrograms(typeof loadedTours !== 'undefined' ? loadedTours : null, 'loaded', showLoadedTour, {types:['sin-aereo']});
    collectObjectPrograms(typeof europaMedidaTours !== 'undefined' ? europaMedidaTours : null, 'europa-medida', showEuropaMedida, {types:['personalizado','con-aereo']});
    collectObjectPrograms(typeof additionalMidasTours !== 'undefined' ? additionalMidasTours : null, 'midas', showTourSinAereos, {types:['sin-aereo']});
    collectObjectPrograms(typeof luxuryTours !== 'undefined' ? luxuryTours : null, 'luxury', showLuxuryTour, {types:['lujo','grupal','con-aereo']});
    collectObjectPrograms(typeof lowCostTours !== 'undefined' ? lowCostTours : null, 'lowcost', showLowCost, {types:['low-cost','sin-aereo']});
    window.travelCatalog = catalog;
  }

  function budgetMatches(record, value) {
    if (!value) return true;
    if (record.priceFrom == null) return false;
    if (value === 'hasta-2000') return record.priceFrom <= 2000;
    if (value === '2000-3500') return record.priceFrom > 2000 && record.priceFrom <= 3500;
    if (value === '3500-5000') return record.priceFrom > 3500 && record.priceFrom <= 5000;
    if (value === 'mas-5000') return record.priceFrom > 5000;
    return true;
  }

  function isExoticQuery(query) {
    return /^exoticos?$/.test(query);
  }

  function isExoticRecord(record) {
    return record.region === 'África'
      || record.region === 'Asia y Exóticos'
      || /\b(?:islas? del indico|oceano indico|maldivas|mauritius|mauricio|seychelles|zanzibar|madagascar|isla reunion|reunion island)\b/.test(record.normalized);
  }

  function exactRegionForQuery(query) {
    const regions = {
      europa: 'Europa',
      caribe: 'Caribe',
      brasil: 'Brasil',
      'estados unidos': 'Estados Unidos',
      eeuu: 'Estados Unidos',
      usa: 'Estados Unidos',
      oceania: 'Oceanía'
    };
    return regions[query] || '';
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
      budget: document.getElementById('travelBudget').value
    };
  }

  function filterCatalog(filters) {
    const exactRegion = exactRegionForQuery(filters.query);
    return catalog
      .map(record => ({record, score:score(record, filters.query)}))
      .filter(item => !filters.query || (isExoticQuery(filters.query)
        ? isExoticRecord(item.record)
        : exactRegion ? item.record.region === exactRegion : item.score > 0))
      .filter(item => !filters.month || item.record.months.includes(filters.month))
      .filter(item => !filters.type || item.record.types.includes(filters.type))
      .filter(item => budgetMatches(item.record, filters.budget))
      .sort((a,b) => b.score - a.score || (a.record.priceFrom || Infinity) - (b.record.priceFrom || Infinity))
      .map(item => item.record);
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

  function cardHtml(record) {
    return `<article class="trip-card" data-open-trip="${escapeHtml(record.id)}" tabindex="0" role="button" aria-label="Ver ${escapeHtml(record.name)}">
      <div class="trip-card-media"><img src="${escapeHtml(record.image)}" alt="${escapeHtml(record.name)}" loading="lazy"><span class="trip-chip">${escapeHtml(readableType(record))}</span></div>
      <div class="trip-card-body">
        <h3>${escapeHtml(record.name)}</h3>
        <div class="trip-meta"><span><i class="far fa-calendar-alt"></i>${escapeHtml(compactDeparture(record.departureText))}</span>${record.duration ? `<span><i class="far fa-clock"></i>${escapeHtml(record.duration)}</span>` : ''}</div>
        <div class="trip-price">${record.priceText ? escapeHtml(compactPrice(record.priceText)) : 'Precio a consultar'}</div>
      </div>
    </article>`;
  }

  function compactPrice(text) {
    const clean = String(text || '').replace(/\s+/g,' ').trim();
    const match = clean.match(/(?:Desde\s+)?(?:USD|U\$S|US\$|\$)\s*[0-9][0-9.,]*/i);
    if (match) return /^desde/i.test(match[0]) ? match[0] : `Desde ${match[0]}`;
    return clean.length > 38 ? `${clean.slice(0,35)}…` : clean;
  }

  function renderResults(records, filters) {
    const section = document.getElementById('travelResults');
    const summary = document.getElementById('travelResultsSummary');
    const grid = document.getElementById('travelResultsGrid');
    section.classList.add('visible');
    const detail = [filters.query && `“${document.getElementById('travelDestination').value.trim()}”`, filters.month && MONTHS.find(m => m[0] === filters.month)?.[1], filters.type && document.getElementById('travelType').selectedOptions[0].text].filter(Boolean).join(' · ');
    summary.textContent = `${records.length} ${records.length === 1 ? 'viaje encontrado' : 'viajes encontrados'}${detail ? ` para ${detail}` : ''}`;
    grid.innerHTML = records.length
      ? records.map(cardHtml).join('')
      : '<div class="search-results-empty" style="grid-column:1/-1"><i class="fas fa-compass"></i><strong>No encontramos programas con esos filtros.</strong><p>Probá con otro destino, mes o rango de presupuesto.</p></div>';
    section.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function runSearch(event) {
    if (event) event.preventDefault();
    const filters = currentFilters();
    renderResults(filterCatalog(filters), filters);
  }

  function runTravelMode(mode) {
    const modeLabels = {playa:'Modo Playa'};
    let records = catalog;
    if (mode === 'playa') {
      records = catalog.filter(record => record.region === 'Caribe'
        || record.region === 'Brasil');
    }
    clearTravelFilters();
    renderResults(records, {query:'',month:'',type:'',budget:''});
    const summary = document.getElementById('travelResultsSummary');
    if (summary) summary.textContent = `${records.length} ${records.length === 1 ? 'viaje encontrado' : 'viajes encontrados'} para ${modeLabels[mode] || 'este modo'}`;
  }

  function clearTravelFilters() {
    document.getElementById('travelDestination').value = '';
    document.getElementById('travelMonth').value = '';
    document.getElementById('travelType').value = '';
    document.getElementById('travelBudget').value = '';
  }

  function hideTravelResults() {
    const section = document.getElementById('travelResults');
    const summary = document.getElementById('travelResultsSummary');
    const grid = document.getElementById('travelResultsGrid');
    if (section) section.classList.remove('visible');
    if (summary) summary.textContent = '';
    if (grid) grid.innerHTML = '';
  }

  function openTrip(id) {
    const record = catalogById.get(id);
    if (record && typeof record.open === 'function') record.open();
  }

  function diverseFeatured() {
    const wanted = ['Punta Cana Verano 2027','Conociendo Europa','Tesoros de Corea y Japón','Tailandia Clásica'];
    const picks = [];
    wanted.forEach(name => {
      const found = catalog.find(item => normalize(item.name) === normalize(name));
      if (found && !picks.includes(found)) picks.push(found);
    });
    const regions = ['Caribe','Europa','Asia y Exóticos','África'];
    regions.forEach(region => {
      if (picks.length >= 4) return;
      const found = catalog.find(item => item.region === region && item.image && !picks.includes(item));
      if (found) picks.push(found);
    });
    return picks.slice(0,4);
  }

  function renderFeatured() {
    const target = document.getElementById('featuredTripsGrid');
    if (target) target.innerHTML = diverseFeatured().map(cardHtml).join('');
  }

  function monthDistance(month) {
    const now = new Date();
    const current = now.getMonth();
    const index = MONTHS.findIndex(item => item[0] === month);
    return index < 0 ? 99 : (index - current + 12) % 12;
  }

  function renderDepartures() {
    const target = document.getElementById('upcomingDepartures');
    if (!target) return;
    const records = catalog
      .filter(item => item.months.length && item.departureText && !/todos los dias|todo el ano/i.test(normalize(item.departureText)))
      .sort((a,b) => monthDistance(a.months[0]) - monthDistance(b.months[0]))
      .slice(0,6);
    target.innerHTML = records.map(record => {
      const month = MONTHS.find(item => item[0] === record.months[0]);
      return `<article class="departure-item" data-open-trip="${escapeHtml(record.id)}" tabindex="0" role="button">
        <div class="departure-date">${escapeHtml(month ? month[1] : 'Salida')}</div>
        <div class="departure-info"><h3>${escapeHtml(record.name)}</h3><p>${escapeHtml(compactDeparture(record.departureText))}${record.duration ? ` · ${escapeHtml(record.duration)}` : ''}</p></div>
        <i class="fas fa-arrow-right"></i>
      </article>`;
    }).join('');
  }

  function bindEvents() {
    const form = document.getElementById('travelSearchForm');
    if (form) form.addEventListener('submit', runSearch);
    document.addEventListener('click', event => {
      const opener = event.target.closest('[data-open-trip]');
      if (opener) openTrip(opener.dataset.openTrip);
      const query = event.target.closest('[data-search-query]');
      if (query) {
        showSection('home');
        clearTravelFilters();
        document.getElementById('travelDestination').value = query.dataset.searchQuery;
        runSearch();
      }
      const type = event.target.closest('[data-search-type]');
      if (type) {
        showSection('home');
        clearTravelFilters();
        document.getElementById('travelType').value = type.dataset.searchType;
        runSearch();
      }
      const mode = event.target.closest('[data-search-mode]');
      if (mode) {
        showSection('home');
        runTravelMode(mode.dataset.searchMode);
      }
    });
    document.addEventListener('keydown', event => {
      const action = event.target.closest && event.target.closest('[data-open-trip],[data-search-query],[data-search-type],[data-search-mode]');
      if (action && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        action.click();
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
    clearTravelFilters();
    runSearch();
  };

  window.goHomeAndReset = function () {
    showSection('home');
    clearTravelFilters();
    hideTravelResults();
  };

  function init() {
    buildCatalog();
    bindEvents();
    renderFeatured();
    renderDepartures();
    const count = document.getElementById('catalogCount');
    if (count) count.textContent = catalog.length;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

