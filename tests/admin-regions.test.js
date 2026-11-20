const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const filters = require('../program-search-filters.js');

const adminHtml = fs.readFileSync(require.resolve('../admin/index.html'), 'utf8');
const adminScript = fs.readFileSync(require.resolve('../admin/admin.js'), 'utf8');

test('el selector Región conserva las opciones existentes y agrega las tres nuevas una sola vez', () => {
  const selectors = [...adminHtml.matchAll(/<select id="region">([\s\S]*?)<\/select>/g)];
  assert.equal(selectors.length, 1, 'debe existir un único selector de región');
  const options = [...selectors[0][1].matchAll(/<option(?:\s+value="([^"]*)")?>([^<]*)<\/option>/g)]
    .map(([, value, label]) => value || label.trim())
    .filter(Boolean);
  for (const region of ['Europa','Caribe','Brasil','Estados Unidos','Asia','África','Islas del Índico','Medio Oriente','Oceanía','Oriente','Sudeste Asiático','Subcontinente Indio']) {
    assert.equal(options.filter(option => option === region).length, 1, `${region} debe aparecer una vez`);
  }
});

test('el formulario existente toma Región al guardar y la restaura al editar', () => {
  assert.ok(adminScript.includes("region:$('#region').value"));
  assert.ok(adminScript.includes("['title','operatorCode','status','region','countries'"));
  assert.ok(adminScript.includes("input.value=program[key]??''"));
});

test('las tres regiones nuevas se guardan y recuperan mediante el servicio local simulado', async () => {
  const rows = [];
  let lastPayload = null;
  const client = {
    auth: {},
    from(table) {
      return {
        upsert(payload) {
          lastPayload = JSON.parse(JSON.stringify(payload));
          const index = rows.findIndex(row => row.id === payload.id);
          const row = {...lastPayload, departures:[], itinerary_days:[]};
          if (index < 0) rows.push(row); else rows[index] = row;
          return this;
        },
        select() { return this; },
        single: async () => ({data:{id:lastPayload.id},error:null}),
        delete() { return this; },
        eq: async () => ({data:null,error:null}),
        order: async () => ({data:table === 'programs' ? rows : [],error:null})
      };
    }
  };
  const window = {
    MODO_RUMBO_CONFIG:{supabaseUrl:'https://mock.invalid',supabasePublishableKey:'mock-key'},
    supabase:{createClient:()=>client},
    ModoRumboDateMode:{normalizeMode:mode=>mode||'specific-dates'}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../admin/data-service.js'),'utf8'),{window,localStorage:{getItem:()=>null,setItem:()=>{}},console});

  for (const [index,region] of ['Oriente','Sudeste Asiático','Subcontinente Indio'].entries()) {
    const program = {
      id:`mock-${index}`, title:`Programa simulado ${index}`, status:'draft', region,
      countries:'', destinations:'', includes:'', travelTypes:[], departures:[], itinerary:[],
      dateMode:'specific-dates', currency:'USD', price:'', pricePrefix:'consult', priceBasis:'person'
    };
    const recovered = await window.ModoRumboData.saveProgram(program,[]);
    assert.equal(lastPayload.region,region);
    assert.equal(recovered.find(item => item.id === program.id).region,region);
  }
  assert.deepEqual(rows.map(row => row.region),['Oriente','Sudeste Asiático','Subcontinente Indio']);
});

test('los filtros públicos reconocen las nuevas regiones explícitas', () => {
  const samples = [
    [{region:'Oriente',countries:['Japón']},'Oriente'],
    [{region:'Sudeste Asiático',countries:['Tailandia']},'Sudeste Asiático'],
    [{region:'Subcontinente Indio',countries:['India']},'Subcontinente Indio']
  ];
  for (const [program, destination] of samples) assert.equal(filters.matchesDestination(program,destination),true,destination);
});
