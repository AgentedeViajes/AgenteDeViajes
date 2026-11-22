const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const helperSource=fs.readFileSync(path.join(root,'featured-carousel.js'),'utf8');
const travelSource=fs.readFileSync(path.join(root,'travel-search.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'premium-home.css'),'utf8');

function helper(){const window={};vm.runInNewContext(helperSource,{window});return window.ModoRumboFeaturedCarousel;}
const featured=(count)=>Array.from({length:count},(_,index)=>({id:`supabase:${index}`,source:'supabase',status:'published',featured:true}));

test('selecciona todos y solo los programas destacados publicados del administrador',()=>{
  const api=helper();
  const catalog=[...featured(5),
    {id:'draft',source:'supabase',status:'draft',featured:true},
    {id:'not-featured',source:'supabase',status:'published',featured:false},
    {id:'static',source:'static legacy',status:'published',featured:true}
  ];
  assert.deepEqual(Array.from(api.selectPublishedFeatured(catalog),item=>item.id),featured(5).map(item=>item.id));
  assert.equal(api.selectPublishedFeatured([]).length,0);
});

test('resuelve cero, uno, tres, cuatro, cinco y más destacados sin límites fijos',()=>{
  const api=helper();
  for(const count of [0,1,3,4,5,9]){
    const selected=api.selectPublishedFeatured(featured(count));
    assert.equal(selected.length,count,`count=${count}`);
    assert.equal(api.pageCount(count,4),Math.ceil(count/4));
    assert.equal(api.pageCount(count,2),Math.ceil(count/2));
    assert.equal(api.pageCount(count,1),count);
  }
});

test('usa cuatro tarjetas en escritorio, dos en tablet y una en celular',()=>{
  const api=helper();
  assert.equal(api.visibleCapacity(1440),4);
  assert.equal(api.visibleCapacity(1024),2);
  assert.equal(api.visibleCapacity(768),2);
  assert.equal(api.visibleCapacity(390),1);
  assert.equal(api.visibleCapacity(375),1);
});

test('las páginas cubren el último grupo sin dejar el indicador desfasado',()=>{
  const api=helper();
  assert.deepEqual([0,1].map(page=>api.pageStart(page,5,4)),[0,1]);
  assert.deepEqual([0,1,2].map(page=>api.pageStart(page,5,2)),[0,2,3]);
  assert.deepEqual([0,1,2,3,4].map(page=>api.pageStart(page,5,1)),[0,1,2,3,4]);
  assert.equal(api.activePage(1,5,4),1);
  assert.equal(api.activePage(3,5,2),2);
  assert.equal(api.activePage(4,5,1),4);
});

test('la portada oculta la sección vacía y mantiene título, enlace y franja de beneficios',()=>{
  assert.match(html,/id="featured-home" hidden/);
  assert.match(html,/Selección especial[\s\S]*?Salidas destacadas[\s\S]*?Ver todos los viajes/);
  assert.match(html,/id="featuredTripsGrid"/);
  assert.match(html,/id="featuredCarouselControls" hidden/);
  assert.match(html,/id="featuredPagination"/);
  assert.match(html,/class="trust-strip"/);
  assert.match(travelSource,/section\.hidden = picks\.length === 0/);
  assert.match(html,/featured-carousel\.js\?v=/);
  assert.match(html,/travel-search\.js\?v=20261122a/);
});

test('no usa selección por nombre, región ni tope fijo; las tarjetas mantienen su marcado existente',()=>{
  assert.match(travelSource,/featuredCarousel\.selectPublishedFeatured\(catalog\)/);
  assert.doesNotMatch(travelSource,/function diverseFeatured/);
  assert.doesNotMatch(travelSource,/slice\(0,\s*3\)/);
  assert.match(travelSource,/map\(cardHtml\)/);
  assert.match(css,/#featured-home \.featured-carousel-track \.trip-card \{[\s\S]*?flex:0 0 calc\(\(100% - 48px\)\/4\)/);
  assert.match(css,/@media \(min-width:681px\) and \(max-width:1024px\)[\s\S]*?flex-basis:calc\(\(100% - 16px\)\/2\)/);
  assert.match(css,/@media \(max-width:680px\)[\s\S]*?flex-basis:100%/);
  assert.match(css,/scroll-snap-type:x mandatory/);
  assert.match(travelSource,/scrollTo\(\{left,behavior:'smooth'\}\)/);
});
