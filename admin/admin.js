(function(){
  'use strict';
  const $=selector=>document.querySelector(selector);
  const $$=selector=>Array.from(document.querySelectorAll(selector));
  const dataService=window.ModoRumboData;
  const dateMode=window.ModoRumboDateMode;
  const state={programs:[],editingId:null,mode:'local',user:null,activeDateMode:dateMode.SPECIFIC_DATES};
  const views={programs:$('#programsView'),editor:$('#editorView')};

  function uid(){return crypto.randomUUID?crypto.randomUUID():`program-${Date.now()}-${Math.random().toString(16).slice(2)}`}
  function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
  function showToast(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('visible');window.setTimeout(()=>toast.classList.remove('visible'),2600)}
  function typeLabel(type){return({grupal:'Viaje grupal',personalizado:'Viaje a medida','sin-aereo':'Circuito sin aéreo',lujo:'Viaje de lujo','luna-de-miel':'Luna de miel','low-cost':'Low Cost'})[type]||type}
  function statusLabel(status){return({published:'Publicado',draft:'Borrador',paused:'Pausado'})[status]||status}
  function priceLabel(program){if(program.pricePrefix==='consult'||!program.price)return'Consultar';return`${program.pricePrefix==='from'?'Desde ':''}${program.currency} ${Number(program.price).toLocaleString('es-AR')}`}

  function switchView(name){
    Object.entries(views).forEach(([key,view])=>view.classList.toggle('active',key===name));
    $$('.nav-button').forEach(button=>button.classList.toggle('active',button.dataset.view===name));
    $('#pageTitle').textContent=name==='editor'?(state.editingId?'Editar programa':'Nuevo programa'):'Programas de viajes';
    if(name==='programs')renderPrograms();
  }

  function renderPrograms(){
    const query=$('#programSearch').value.trim().toLowerCase();
    const status=$('#statusFilter').value;
    const type=$('#typeFilter').value;
    const filtered=state.programs.filter(program=>{
      const haystack=[program.title,program.operatorCode,program.countries,program.destinations].join(' ').toLowerCase();
      return(!query||haystack.includes(query))&&(!status||program.status===status)&&(!type||program.travelTypes.includes(type));
    });
    $('#totalCount').textContent=state.programs.length;
    $('#publishedCount').textContent=state.programs.filter(item=>item.status==='published').length;
    $('#draftCount').textContent=state.programs.filter(item=>item.status==='draft').length;
    $('#featuredCount').textContent=state.programs.filter(item=>item.featured).length;
    $('#emptyState').hidden=filtered.length>0;
    $('#programTableWrap').hidden=filtered.length===0;
    $('#programTableBody').innerHTML=filtered.map(program=>{
      const next=(program.departures||[]).map(item=>item.date).filter(Boolean).sort()[0];
      const availability=dateMode.normalizeMode(program.dateMode)===dateMode.DATE_RANGE?dateMode.rangeLabel(program.rangeStartDate,program.rangeEndDate):(next?new Date(`${next}T12:00:00`).toLocaleDateString('es-AR'):'A solicitud');
      return`<tr><td><strong>${escapeHtml(program.title)}</strong><small>${escapeHtml(program.operatorCode||'Sin código')} · ${escapeHtml(program.region||'Sin región')}</small></td><td>${escapeHtml((program.travelTypes||[]).map(typeLabel).join(', ')||'Sin asignar')}</td><td>${escapeHtml(availability||'Rango incompleto')}</td><td>${escapeHtml(priceLabel(program))}</td><td><span class="status-pill ${escapeHtml(program.status)}">${escapeHtml(statusLabel(program.status))}</span></td><td><div class="table-actions"><button class="icon-button" data-action="edit" data-id="${program.id}" aria-label="Editar">✎</button><button class="icon-button" data-action="duplicate" data-id="${program.id}" aria-label="Duplicar">⧉</button><button class="icon-button remove-row" data-action="delete" data-id="${program.id}" aria-label="Eliminar">×</button></div></td></tr>`;
    }).join('');
  }

  function addDeparture(data={}){const node=$('#departureTemplate').content.firstElementChild.cloneNode(true);Object.entries(data).forEach(([key,value])=>{const input=node.querySelector(`[data-field="${key}"]`);if(input)input.value=value??''});$('#departuresList').append(node)}
  function addDay(data={}){const node=$('#dayTemplate').content.firstElementChild.cloneNode(true);Object.entries(data).forEach(([key,value])=>{const input=node.querySelector(`[data-field="${key}"]`);if(input)input.value=value??''});$('#itineraryList').append(node);renumberDays()}
  function renumberDays(){$$('#itineraryList .itinerary-day').forEach((day,index)=>day.querySelector('[data-day-number]').textContent=`Día ${index+1}`)}
  function rowData(row){return Object.fromEntries(Array.from(row.querySelectorAll('[data-field]')).map(field=>[field.dataset.field,field.value.trim()]))}
  function updateImagePreview(source){const preview=$('#imagePreview');const image=preview.querySelector('img');if(source){image.src=source;preview.hidden=false}else{image.removeAttribute('src');preview.hidden=true}}
  function hasSpecificDateData(){return $$('#departuresList .departure-row').some(row=>{const item=rowData(row);return item.date||item.price||item.capacity})}
  function hasRangeData(){return Boolean($('#rangeStartDate').value||$('#rangeEndDate').value)}
  function setDateMode(mode,{confirmChange=false,autoPrice=false}={}){
    const next=dateMode.normalizeMode(mode);const current=state.activeDateMode;
    if(confirmChange&&next!==current&&((current===dateMode.SPECIFIC_DATES&&hasSpecificDateData())||(current===dateMode.DATE_RANGE&&hasRangeData()))){
      const message=current===dateMode.SPECIFIC_DATES?'Las fechas específicas cargadas dejarán de guardarse si confirmás el programa con rango flexible. Se conservarán en pantalla mientras editás. ¿Querés cambiar de modalidad?':'El rango cargado dejará de guardarse si confirmás el programa con fechas específicas. Se conservará en pantalla mientras editás. ¿Querés cambiar de modalidad?';
      if(!window.confirm(message)){$$('[name="dateMode"]').forEach(input=>input.checked=input.value===current);return false}
    }
    state.activeDateMode=next;$$('[name="dateMode"]').forEach(input=>input.checked=input.value===next);
    $('#specificDatesPanel').hidden=next!==dateMode.SPECIFIC_DATES;$('#dateRangePanel').hidden=next!==dateMode.DATE_RANGE;
    if(autoPrice&&next===dateMode.DATE_RANGE)$('#pricePrefix').value='from';
    return true;
  }

  function resetForm(){
    $('#programForm').reset();state.editingId=null;$('#programId').value='';$('#departuresList').innerHTML='';$('#itineraryList').innerHTML='';$('#rangeStartDate').value='';$('#rangeEndDate').value='';updateImagePreview('');addDeparture();addDay();setDateMode(dateMode.SPECIFIC_DATES);
  }
  function openNew(){resetForm();switchView('editor')}
  function editProgram(id){
    const program=state.programs.find(item=>item.id===id);if(!program)return;
    resetForm();state.editingId=id;$('#programId').value=id;
    ['title','operatorCode','status','region','countries','destinations','duration','flightType','departureType','currency','price','pricePrefix','priceBasis','includes','summary','notes','image'].forEach(key=>{const input=$(`#${key}`);if(input)input.value=program[key]??''});
    updateImagePreview(program.image);
    $('#featured').checked=Boolean(program.featured);$$('#travelTypes input').forEach(input=>input.checked=(program.travelTypes||[]).includes(input.value));
    $('#departuresList').innerHTML='';(program.departures?.length?program.departures:[{}]).forEach(addDeparture);
    $('#rangeStartDate').value=program.rangeStartDate||'';$('#rangeEndDate').value=program.rangeEndDate||'';setDateMode(program.dateMode);
    $('#itineraryList').innerHTML='';(program.itinerary?.length?program.itinerary:[{}]).forEach(addDay);
    switchView('editor');
  }
  function collectProgram(statusOverride){
    const title=$('#title').value.trim();if(!title){$('#title').focus();showToast('Ingresá el nombre del programa.');return null}
    const status=statusOverride||$('#status').value;
    const availability=dateMode.activeAvailability({mode:state.activeDateMode,rangeStartDate:$('#rangeStartDate').value,rangeEndDate:$('#rangeEndDate').value,departures:$$('#departuresList .departure-row').map(rowData).filter(item=>item.date||item.price||item.capacity)});
    const validation=dateMode.validateAvailability({mode:availability.dateMode,start:availability.rangeStartDate,end:availability.rangeEndDate,status});
    if(!validation.valid){showToast(validation.errors[0]);if(!availability.rangeStartDate)$('#rangeStartDate').focus();else $('#rangeEndDate').focus();return null}
    return{
      id:state.editingId||uid(),title,operatorCode:$('#operatorCode').value.trim(),status,region:$('#region').value,countries:$('#countries').value.trim(),destinations:$('#destinations').value.trim(),duration:$('#duration').value.trim(),featured:$('#featured').checked,
      travelTypes:$$('#travelTypes input:checked').map(input=>input.value),flightType:$('#flightType').value,departureType:$('#departureType').value,currency:$('#currency').value,price:$('#price').value,pricePrefix:$('#pricePrefix').value,priceBasis:$('#priceBasis').value,
      dateMode:availability.dateMode,rangeStartDate:availability.rangeStartDate,rangeEndDate:availability.rangeEndDate,departures:availability.departures,includes:$('#includes').value.trim(),itinerary:$$('#itineraryList .itinerary-day').map(rowData).filter(item=>item.title||item.meals||item.description),summary:$('#summary').value.trim(),notes:$('#notes').value.trim(),image:$('#image').value.trim(),updatedAt:new Date().toISOString()
    };
  }
  async function saveProgram(statusOverride){const program=collectProgram(statusOverride);if(!program)return;try{const file=$('#imageFile').files[0];if(file){showToast('Optimizando y subiendo imagen...');program.image=await dataService.uploadImage(file,program.id)}state.programs=await dataService.saveProgram(program,state.programs);showToast(statusOverride==='draft'?'Borrador guardado.':'Programa guardado.');resetForm();switchView('programs')}catch(error){showToast(`No se pudo guardar: ${error.message}`)}}

  window.ModoRumboItineraryImporter.init({
    addDay,
    clearDays:()=>{$('#itineraryList').innerHTML=''},
    getExistingDays:()=>$$('#itineraryList .itinerary-day').map(rowData).filter(item=>item.title||item.meals||item.description),
    getFieldValue:id=>$(`#${id}`).value,
    setFieldValue:(id,value)=>{$(`#${id}`).value=value},
    showToast
  });

  $('#programForm').addEventListener('submit',event=>{event.preventDefault();saveProgram()});
  $('#saveDraft').addEventListener('click',()=>saveProgram('draft'));
  $('#newProgramButton').addEventListener('click',openNew);$('#cancelEdit').addEventListener('click',()=>{resetForm();switchView('programs')});
  $('#addDeparture').addEventListener('click',()=>addDeparture());$('#addDay').addEventListener('click',()=>addDay());
  $$('[name="dateMode"]').forEach(input=>input.addEventListener('change',()=>setDateMode(input.value,{confirmChange:true,autoPrice:true})));
  $('#imageFile').addEventListener('change',event=>{const file=event.target.files[0];if(!file)return;updateImagePreview(URL.createObjectURL(file))});
  $$('.nav-button').forEach(button=>button.addEventListener('click',()=>button.dataset.view==='editor'?openNew():switchView(button.dataset.view)));
  ['programSearch','statusFilter','typeFilter'].forEach(id=>$(`#${id}`).addEventListener('input',renderPrograms));
  document.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]');if(action?.dataset.action==='new')openNew();
    const remove=event.target.closest('.remove-row');if(remove&&!remove.dataset.action){remove.closest('.repeat-card').remove();renumberDays()}
    const moveUp=event.target.closest('.move-up');if(moveUp){const row=moveUp.closest('.itinerary-day');if(row.previousElementSibling)row.parentNode.insertBefore(row,row.previousElementSibling);renumberDays()}
    const moveDown=event.target.closest('.move-down');if(moveDown){const row=moveDown.closest('.itinerary-day');if(row.nextElementSibling)row.parentNode.insertBefore(row.nextElementSibling,row);renumberDays()}
    if(action?.dataset.action==='edit')editProgram(action.dataset.id);
    if(action?.dataset.action==='duplicate'){const original=state.programs.find(item=>item.id===action.dataset.id);if(original){const copy={...structuredClone(original),id:uid(),title:`${original.title} (copia)`,status:'draft',updatedAt:new Date().toISOString()};dataService.saveProgram(copy,state.programs).then(programs=>{state.programs=programs;renderPrograms();showToast('Programa duplicado como borrador.')}).catch(error=>showToast(`No se pudo duplicar: ${error.message}`))}}
    if(action?.dataset.action==='delete'){const program=state.programs.find(item=>item.id===action.dataset.id);if(program&&window.confirm(`¿Eliminar “${program.title}”?`)){dataService.deleteProgram(program.id,state.programs).then(programs=>{state.programs=programs;renderPrograms();showToast('Programa eliminado.')}).catch(error=>showToast(`No se pudo eliminar: ${error.message}`))}}
  });

  $('#loginForm').addEventListener('submit',async event=>{event.preventDefault();$('#loginError').textContent='';try{state.user=await dataService.signIn($('#loginEmail').value.trim(),$('#loginPassword').value);state.programs=await dataService.listPrograms();$('#authGate').hidden=true;$('#signOutButton').hidden=false;renderPrograms()}catch(error){$('#loginError').textContent=error.message}});
  $('#signOutButton').addEventListener('click',async()=>{await dataService.signOut();window.location.reload()});

  async function boot(){
    try{const result=await dataService.initialize();state.mode=result.mode;state.user=result.user;state.programs=result.programs;if(result.requiresAuth){$('#authGate').hidden=false}else if(result.mode==='supabase'){$('#signOutButton').hidden=false;$('#backendMode').textContent='Base de datos conectada';$('#backendDescription').textContent=`Sesión: ${result.user.email}`;}resetForm();renderPrograms()}catch(error){showToast(`Error de inicio: ${error.message}`)}
  }
  boot();
})();
