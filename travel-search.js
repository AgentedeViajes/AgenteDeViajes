(function () {
  'use strict';

  const dateMode = window.ModoRumboDateMode;

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
        const id = `static:${sectionKey}:${index}`;
        card.dataset.tripId = id;
        const record = {
          id,
          name: title.textContent.trim(),
          source: `static ${sectionKey}`,
          searchText: `${info.textContent} ${section.textContent}`,
          departureText: `${tag ? tag.textContent : ''} ${info.textContent}`,
          priceText: prices.join(' · '),
          image: img ? img.src : '',
          types: explicitTypes.length ? explicitTypes : undefined,
          duration: extractDuration(info.textContent),
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
      const routeText = route.map(item => Array.isArray(item) ? item.join(' ') : typeof item === 'object' ? [item.title, item.description, item.text].filter(Boolean).join(' ') : item).join(' ');
      const includes = Array.isArray(trip.includes) ? trip.includes.join(' ') : trip.includes || '';
      const departures = trip.departures || trip.departure || '';
      const prices = Array.isArray(trip.prices) ? trip.prices.join(' ') : (trip.price || '');
      const text = [name, trip.subtitle, trip.cities, trip.duration, departures, prices, includes, routeText].filter(Boolean).join(' ');
      const record = {
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
    const selectedPrice = selectedDepartureItem && selectedDepartureItem.price ? selectedDepartureItem.price : '';
    const displayedPriceLabel = selectedPrice ? 'Precio de la salida' : (detail.priceLabel || 'Precio');
    const displayedPriceValue = selectedPrice || detail.priceValue || 'A consultar';
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
    const priceHtml = `<div class="detail-price"><small data-detail-price-label>${escapeHtml(displayedPriceLabel)}</small><strong data-detail-price-value>${detailText(displayedPriceValue)}</strong>${detail.priceBasis ? `<span>${escapeHtml(detail.priceBasis)}</span>` : ''}</div>`;
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
          <a class="detail-whatsapp" data-detail-whatsapp href="${whatsappUrl}" target="_blank" rel="noopener noreferrer"><i class="fab fa-whatsapp" aria-hidden="true"></i><span><strong>Consultá por WhatsApp</strong><small>Quiero más información</small></span></a>
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
      if (!program.title) return;
      const departures = [...(program.departures || [])].sort((a,b) => String(a.departure_date || '').localeCompare(String(b.departure_date || '')));
      const departureText = publicAvailability(program);
      const itineraryText = (program.itinerary_days || []).map(day => `${day.title || ''} ${day.description || ''}`).join(' ');
      const searchText = [program.title,program.operator_code,program.region,(program.countries || []).join(' '),(program.destinations || []).join(' '),program.duration,departureText,program.summary,program.notes,(program.includes || []).join(' '),itineraryText].filter(Boolean).join(' ');
      addRecord({
        id:`supabase:${program.id}`,
        name:program.title,
        source:'supabase',
        searchText,
        departureText,
        priceText:publicPrice(program),
        priceFrom:program.price == null ? null : Number(program.price),
        duration:program.duration || '',
        image:program.image_path || '',
        region:program.region || inferRegion(searchText,'supabase'),
        types:publicTypes(program),
        authoritativeTypes:true,
        months:isRangeProgram(program)?dateMode.rangeMonths(program.travel_start_date,program.travel_end_date):departures.map(item => MONTHS[new Date(`${item.departure_date}T12:00:00`).getMonth()]?.[0]).filter(Boolean),
        featured:Boolean(program.featured),
        open:function () { showPublicProgram(program); }
      });
    });
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

  function openTrip(id, invoker) {
    const record = catalogById.get(id);
    if (record && typeof record.open === 'function') {
      dialogReturnFocus = invoker || document.activeElement;
      record.open();
    }
  }

  function diverseFeatured() {
    const wanted = ['Punta Cana Verano 2027','Conociendo Europa','Tesoros de Corea y Japón','Tailandia Clásica'];
    const picks = catalog.filter(item => item.featured).slice(0,3);
    wanted.forEach(name => {
      const found = catalog.find(item => normalize(item.name) === normalize(name));
      if (found && !picks.includes(found)) picks.push(found);
    });
    const regions = ['Caribe','Europa','Asia y Exóticos','África'];
    regions.forEach(region => {
      if (picks.length >= 3) return;
      const found = catalog.find(item => item.region === region && item.image && !picks.includes(item));
      if (found) picks.push(found);
    });
    return picks.slice(0,3);
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
      if (opener) openTrip(opener.dataset.openTrip, opener);
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

  async function init() {
    buildCatalog();
    bindEvents();
    renderFeatured();
    renderDepartures();
    const count = document.getElementById('catalogCount');
    if (count) count.textContent = catalog.length;
    if (typeof window.loadModoRumboPrograms === 'function') {
      try {
        collectPublicPrograms(await window.loadModoRumboPrograms());
        renderFeatured();
        renderDepartures();
        if (count) count.textContent = catalog.length;
        if (document.getElementById('travelResults')?.classList.contains('visible')) runSearch();
      } catch (error) {
        console.warn('Los programas del panel no pudieron cargarse; se conserva el catálogo local.', error);
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

