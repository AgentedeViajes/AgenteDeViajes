(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ModoRumboProgramFilters = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DESTINATIONS = {
    europa:'Europa', caribe:'Caribe', brasil:'Brasil', eeuu:'EEUU', africa:'África',
    indico:'Islas del Índico', medio_oriente:'Medio Oriente', oriente:'Oriente',
    subcontinente_indio:'Subcontinente Indio', sudeste_asiatico:'Sudeste Asiático', oceania:'Oceanía'
  };

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }

  const regionAliases = {
    europa:'europa', europe:'europa', caribe:'caribe', caribbean:'caribe', brasil:'brasil', brazil:'brasil',
    'estados unidos':'eeuu', eeuu:'eeuu', usa:'eeuu', 'united states':'eeuu', africa:'africa',
    'islas del indico':'indico', 'oceano indico':'indico', 'indian ocean':'indico',
    'medio oriente':'medio_oriente', 'oriente medio':'medio_oriente', 'middle east':'medio_oriente',
    oriente:'oriente', 'asia oriental':'oriente', 'east asia':'oriente',
    'sudeste asiatico':'sudeste_asiatico', 'sudeste de asia':'sudeste_asiatico', 'southeast asia':'sudeste_asiatico',
    'subcontinente indio':'subcontinente_indio', 'subcontinente de india':'subcontinente_indio',
    'indian subcontinent':'subcontinente_indio',
    oceania:'oceania'
  };

  const countryDestinations = {
    'espana':['europa'], spain:['europa'], italia:['europa'], italy:['europa'], francia:['europa'], france:['europa'],
    portugal:['europa'], grecia:['europa'], greece:['europa'], alemania:['europa'], germany:['europa'],
    'reino unido':['europa'], 'united kingdom':['europa'], inglaterra:['europa'], irlanda:['europa'], ireland:['europa'],
    suiza:['europa'], switzerland:['europa'], austria:['europa'], belgica:['europa'], belgium:['europa'],
    'paises bajos':['europa'], holanda:['europa'], netherlands:['europa'], luxemburgo:['europa'], luxembourg:['europa'],
    dinamarca:['europa'], denmark:['europa'], suecia:['europa'], sweden:['europa'], noruega:['europa'], norway:['europa'],
    finlandia:['europa'], finland:['europa'], islandia:['europa'], iceland:['europa'], polonia:['europa'], poland:['europa'],
    chequia:['europa'], 'republica checa':['europa'], czechia:['europa'], hungria:['europa'], hungary:['europa'],
    croacia:['europa'], croatia:['europa'], eslovenia:['europa'], slovenia:['europa'], serbia:['europa'], rumania:['europa'],
    bulgaria:['europa'], albania:['europa'], montenegro:['europa'], 'bosnia y herzegovina':['europa'],
    'estados unidos':['eeuu'], 'united states':['eeuu'], eeuu:['eeuu'], usa:['eeuu'], 'puerto rico':['caribe'],
    'republica dominicana':['caribe'], dominicana:['caribe'], 'dominican republic':['caribe'], cuba:['caribe'], jamaica:['caribe'],
    bahamas:['caribe'], barbados:['caribe'], aruba:['caribe'], curazao:['caribe'], curacao:['caribe'], haiti:['caribe'],
    'san martin':['caribe'], martinica:['caribe'], 'santa lucia':['caribe'], grenada:['caribe'],
    trinidad:['caribe'], 'trinidad y tobago':['caribe'],
    brasil:['brasil'], brazil:['brasil'],
    japon:['oriente'], japan:['oriente'], china:['oriente'], 'corea del sur':['oriente'], 'south korea':['oriente'],
    'corea del norte':['oriente'], 'north korea':['oriente'], taiwan:['oriente'], mongolia:['oriente'],
    'hong kong':['oriente'], macao:['oriente'], macau:['oriente'],
    india:['subcontinente_indio'], 'bharat':['subcontinente_indio'], 'republica de india':['subcontinente_indio'],
    nepal:['subcontinente_indio'], butan:['subcontinente_indio'], bhutan:['subcontinente_indio'],
    bangladesh:['subcontinente_indio'], banglades:['subcontinente_indio'],
    tailandia:['sudeste_asiatico'], thailand:['sudeste_asiatico'], vietnam:['sudeste_asiatico'], camboya:['sudeste_asiatico'],
    cambodia:['sudeste_asiatico'], laos:['sudeste_asiatico'], indonesia:['sudeste_asiatico'], malasia:['sudeste_asiatico'],
    malaysia:['sudeste_asiatico'], singapur:['sudeste_asiatico'], singapore:['sudeste_asiatico'], filipinas:['sudeste_asiatico'],
    philippines:['sudeste_asiatico'], myanmar:['sudeste_asiatico'], birmania:['sudeste_asiatico'], brunei:['sudeste_asiatico'],
    'timor oriental':['sudeste_asiatico'], 'timor leste':['sudeste_asiatico'],
    egipto:['africa'], egypt:['africa'], marruecos:['africa'], morocco:['africa'], tunez:['africa'], tunisia:['africa'],
    'sudafrica':['africa'], 'south africa':['africa'], kenia:['africa'], kenya:['africa'], tanzania:['africa'],
    uganda:['africa'], ruanda:['africa'], rwanda:['africa'], etiopia:['africa'], ethiopia:['africa'], namibia:['africa'],
    botswana:['africa'], zambia:['africa'], zimbabwe:['africa'], zimbabue:['africa'], senegal:['africa'], ghana:['africa'],
    madagascar:['africa','indico'], maldivas:['indico'], maldives:['indico'], mauricio:['africa','indico'], mauritius:['africa','indico'],
    seychelles:['africa','indico'], 'isla reunion':['africa','indico'], 'reunion island':['africa','indico'], mozambique:['africa','indico'], zanzibar:['africa','indico'],
    'emiratos arabes unidos':['medio_oriente'], 'emiratos arabes':['medio_oriente'], 'united arab emirates':['medio_oriente'], emiratos:['medio_oriente'],
    jordania:['medio_oriente'], jordan:['medio_oriente'], israel:['medio_oriente'], 'arabia saudita':['medio_oriente'],
    'saudi arabia':['medio_oriente'], oman:['medio_oriente'], qatar:['medio_oriente'], kuwait:['medio_oriente'], bahrein:['medio_oriente'],
    australia:['oceania'], 'nueva zelanda':['oceania'], 'new zealand':['oceania'], fiyi:['oceania'], fiji:['oceania'],
    samoa:['oceania'], tonga:['oceania'], vanuatu:['oceania'], 'polinesia francesa':['oceania'], tahiti:['oceania'],
    'bora bora':['oceania'], papua:['oceania']
  };

  // Explicitly recognized city/destination names. Ambiguous names are omitted.
  const cityDestinations = {
    madrid:['europa'], barcelona:['europa'], sevilla:['europa'], roma:['europa'], venecia:['europa'], florencia:['europa'],
    paris:['europa'], londres:['europa'], lisboa:['europa'], atenas:['europa'], berlin:['europa'], amsterdam:['europa'],
    'punta cana':['caribe'], cancun:['caribe'], 'riviera maya':['caribe'], 'costa mujeres':['caribe'], aruba:['caribe'],
    'rio de janeiro':['brasil'], buzios:['brasil'], maceio:['brasil'], florianopolis:['brasil'],
    'nueva york':['eeuu'], 'new york':['eeuu'], miami:['eeuu'], orlando:['eeuu'], 'las vegas':['eeuu'], 'los angeles':['eeuu'],
    tokyo:['oriente'], tokio:['oriente'], kioto:['oriente'], kyoto:['oriente'], osaka:['oriente'], seul:['oriente'], seoul:['oriente'],
    beijing:['oriente'], pekin:['oriente'], shanghai:['oriente'], 'hong kong':['oriente'],
    bangkok:['sudeste_asiatico'], phuket:['sudeste_asiatico'], 'chiang mai':['sudeste_asiatico'], hanoi:['sudeste_asiatico'],
    'ho chi minh':['sudeste_asiatico'], 'siem reap':['sudeste_asiatico'], 'kuala lumpur':['sudeste_asiatico'],
    singapur:['sudeste_asiatico'], bali:['sudeste_asiatico'], jakarta:['sudeste_asiatico'], manila:['sudeste_asiatico'],
    delhi:['subcontinente_indio'], 'nueva delhi':['subcontinente_indio'], 'new delhi':['subcontinente_indio'],
    mumbai:['subcontinente_indio'], bombay:['subcontinente_indio'], jaipur:['subcontinente_indio'],
    agra:['subcontinente_indio'], varanasi:['subcontinente_indio'], kathmandu:['subcontinente_indio'],
    katmandu:['subcontinente_indio'], pokhara:['subcontinente_indio'], thimphu:['subcontinente_indio'],
    paro:['subcontinente_indio'], dhaka:['subcontinente_indio'], dacca:['subcontinente_indio'],
    cairo:['africa'], 'el cairo':['africa'], luxor:['africa'], 'ciudad del cabo':['africa'], nairobi:['africa'],
    'isla mauricio':['africa','indico'], maldivas:['indico'], mahe:['africa','indico'], zanzibar:['africa','indico'],
    dubai:['medio_oriente'], 'abu dhabi':['medio_oriente'], 'abu dabi':['medio_oriente'], amman:['medio_oriente'], petra:['medio_oriente'], jerusalen:['medio_oriente'],
    sydney:['oceania'], melbourne:['oceania'], auckland:['oceania'], 'nueva zelanda':['oceania']
  };

  function values(value) {
    if (Array.isArray(value)) return value.flatMap(values);
    if (value == null) return [];
    return String(value).split(/[,;|/\n]+/).map(part => part.trim()).filter(Boolean);
  }

  function addNameMatches(target, text, dictionary) {
    const normalized = ` ${normalize(text)} `;
    Object.keys(dictionary).sort((a,b) => b.length - a.length).forEach(alias => {
      const phrase = ` ${normalize(alias)} `;
      if (normalized.includes(phrase)) dictionary[alias].forEach(category => target.add(category));
    });
  }

  function categoriesForProgram(program) {
    const categories = new Set();
    const explicitRegion = normalize(program && (program.geographyRegion ?? program.region));
    const explicitCategory = regionAliases[explicitRegion];
    if (explicitCategory) categories.add(explicitCategory);

    const countryValues = values(program && program.countries);
    const destinationValues = values(program && (program.destinations ?? program.cities));
    // When the admin later supplies one of the detailed East Asia regions,
    // keep it authoritative for a single-country program. Multi-country
    // itineraries still receive every matching country classification.
    const explicitEastAsia = ['oriente','sudeste_asiatico'].includes(explicitCategory);
    const useProvisionalRules = !explicitEastAsia || countryValues.length > 1;
    if (useProvisionalRules) {
      [...countryValues,...destinationValues].forEach(value => {
        const key = normalize(value);
        (countryDestinations[key] || cityDestinations[key] || []).forEach(category => categories.add(category));
      });
      addNameMatches(categories,countryValues.join(' '),countryDestinations);
      addNameMatches(categories,destinationValues.join(' '),cityDestinations);

      // Legacy local catalog entries can lack structured country fields. Match
      // only a curated, explicit list of country/city names in their title.
      const safeCountryAliases = Object.fromEntries(Object.entries(countryDestinations)
        .filter(([alias]) => !['jordan','mauricio','granada'].includes(alias)));
      addNameMatches(categories, program && (program.title || program.name), safeCountryAliases);
      addNameMatches(categories, program && (program.title || program.name), cityDestinations);
    }
    return [...categories];
  }

  function destinationKey(value) {
    const key = normalize(value);
    if (regionAliases[key]) return regionAliases[key];
    return Object.keys(DESTINATIONS).find(id => normalize(DESTINATIONS[id]) === key) || '';
  }

  function matchesDestination(program, destination) {
    const key = destinationKey(destination);
    return Boolean(key && categoriesForProgram(program).includes(key));
  }

  function matchesExperience(program, experience) {
    const tags = program && (program.experienceTypes || program.travel_types || []);
    const values = Array.isArray(tags) ? tags : String(tags || '').split(/[,;|]+/).map(tag => tag.trim());
    return values.includes(experience);
  }

  function filterByNavigation(programs, navigation, options = {}) {
    const records = Array.isArray(programs) ? programs : [];
    if (!navigation) return records;
    if (navigation.kind === 'destination') {
      return records.filter(program => matchesDestination(program,navigation.value));
    }
    if (navigation.kind === 'experience') {
      return records.filter(program => matchesExperience(program,navigation.value));
    }
    if (navigation.kind === 'upcoming') {
      return upcomingDepartures(records,{days:options.days == null ? 60 : options.days,today:options.today,now:options.now})
        .map(({program,departureDate}) => ({...program,nextDepartureDate:departureDate}));
    }
    if (navigation.kind === 'mode' && navigation.value === 'playa') {
      return records.filter(program => ['Caribe','Brasil'].includes(program.region));
    }
    return records;
  }

  function dedupePrograms(programs) {
    const unique = [];
    const ids = new Set();
    const localTitles = new Map();
    const publishedTitles = new Set();
    const publishedTitleCodes = new Set();
    (programs || []).forEach(program => {
      if (!program) return;
      const id = String(program.id || '');
      if (id && ids.has(id)) return;
      if (id) ids.add(id);
      const title = normalize(program.name || program.title);
      if (program.source === 'supabase') {
        const operator = normalize(program.operator_code || program.operatorCode);
        const identity = title ? `${title}\u0000${operator}` : `id:${id}`;
        if (publishedTitleCodes.has(identity)) return;
        publishedTitleCodes.add(identity);
        const localIndex = title ? localTitles.get(title) : undefined;
        if (localIndex !== undefined) {
          unique[localIndex] = program;
          localTitles.delete(title);
        } else {
          unique.push(program);
        }
        if (title) publishedTitles.add(title);
        return;
      }
      if (title && publishedTitles.has(title)) return;
      if (title && localTitles.has(title)) return;
      if (title) localTitles.set(title,unique.length);
      unique.push(program);
    });
    return unique;
  }

  function validIsoDate(value) {
    const text = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const [year,month,day] = text.split('-').map(Number);
    const date = new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month-1 && date.getUTCDate() === day;
  }

  function parseConcreteDate(value) {
    const text = String(value || '').trim();
    if (validIsoDate(text)) return text;
    const match = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
    if (!match) return '';
    const iso = `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
    return validIsoDate(iso) ? iso : '';
  }

  function argentinaToday(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone:'America/Argentina/Buenos_Aires', year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(now).reduce((result,part) => (result[part.type] = part.value,result),{});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function addDays(date, days) {
    if (!validIsoDate(date)) return '';
    const [year,month,day] = date.split('-').map(Number);
    const value = new Date(Date.UTC(year,month-1,day + Number(days || 0)));
    return value.toISOString().slice(0,10);
  }

  function departureDates(program) {
    if (program.date_mode === 'date_range' || program.dateMode === 'date_range') return [];
    const entries = Array.isArray(program.departures) ? program.departures : [];
    const dates = [
      ...(Array.isArray(program.departureDates) ? program.departureDates : []),
      ...entries.map(item => typeof item === 'string' ? item : item && (item.departure_date || item.date))
    ].map(parseConcreteDate).filter(Boolean);
    return [...new Set(dates)];
  }

  function upcomingDepartures(programs, options = {}) {
    const today = options.today || argentinaToday(options.now || new Date());
    const horizon = addDays(today, options.days == null ? 60 : options.days);
    if (!validIsoDate(today) || !horizon) return [];
    const results = [];
    dedupePrograms(programs).forEach(program => {
      if (!program || (program.status && program.status !== 'published')) return;
      if (program.date_mode === 'date_range' || program.dateMode === 'date_range') return;
      const nextDate = departureDates(program).filter(date => date >= today && date <= horizon).sort()[0];
      if (!nextDate) return;
      results.push({program,departureDate:nextDate});
    });
    return results.sort((a,b) => a.departureDate.localeCompare(b.departureDate));
  }

  function extractConcreteDates(text) {
    const source = String(text || '');
    const matches = source.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}\b/g) || [];
    return [...new Set(matches.map(parseConcreteDate).filter(Boolean))];
  }

  return {DESTINATIONS, normalize, destinationKey, categoriesForProgram, matchesDestination, matchesExperience, filterByNavigation, dedupePrograms,
    validIsoDate, parseConcreteDate, argentinaToday, addDays, departureDates, upcomingDepartures, extractConcreteDates};
});
