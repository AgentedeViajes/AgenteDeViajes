(function(root){
  'use strict';
  const parser=root.ModoRumboItineraryParser;
  const documentReader=root.ModoRumboDocumentReader;
  let options=null;
  let parsedResult=null;
  let fileWarnings=[];
  let lastFocused=null;

  const $=selector=>document.querySelector(selector);
  const $$=selector=>Array.from(document.querySelectorAll(selector));

  function setMessage(message,type='info'){
    const element=$('#importFileMessage');
    element.textContent=message||'';
    element.className=`inline-message ${type}`;
    element.hidden=!message;
  }

  function resetImporter(){
    parsedResult=null;
    fileWarnings=[];
    $('#itineraryImportText').value='';
    $('#itineraryImportFile').value='';
    $('#importPreviewDays').innerHTML='';
    $('#importedIncludes').value='';
    $('#importedNotes').value='';
    $('#applyImportedIncludes').checked=true;
    $('#applyImportedNotes').checked=true;
    $('[name="itineraryImportMode"][value="replace"]').checked=true;
    $('#importSourceStep').hidden=false;
    $('#importPreviewStep').hidden=true;
    setMessage('');
  }

  function open(){
    resetImporter();
    lastFocused=document.activeElement;
    $('#itineraryImportModal').hidden=false;
    $('.main').inert=true;
    $('.sidebar').inert=true;
    document.body.classList.add('modal-open');
    window.setTimeout(()=>$('#itineraryImportText').focus(),0);
  }

  function close(){
    $('#itineraryImportModal').hidden=true;
    $('.main').inert=false;
    $('.sidebar').inert=false;
    document.body.classList.remove('modal-open');
    lastFocused?.focus?.();
  }

  function createField(labelText,field,value,kind='input'){
    const label=document.createElement('label');
    label.textContent=labelText;
    const control=document.createElement(kind==='textarea'?'textarea':'input');
    control.dataset.previewField=field;
    control.value=value||'';
    if(kind==='textarea')control.rows=7;
    label.append(control);
    return label;
  }

  function createDayCard(day,index){
    const card=document.createElement('article');
    card.className='preview-day-card';
    card.dataset.previewDay=String(index);

    const header=document.createElement('header');
    const title=document.createElement('strong');
    title.textContent=`Día ${index+1}`;
    const source=document.createElement('span');
    source.textContent=day.sourceNumber&&day.sourceNumber!==index+1?`Detectado como Día ${day.sourceNumber}`:'Jornada detectada';
    header.append(title,source);

    const grid=document.createElement('div');
    grid.className='preview-day-grid';
    grid.append(
      createField('Título editable','title',day.title),
      createField('Régimen editable','meals',day.meals),
      createField('Fecha detectada (solo revisión)','date',day.date)
    );
    const description=createField('Descripción completa editable','description',day.description,'textarea');
    description.classList.add('preview-description');
    card.append(header,grid,description);

    if(day.warnings?.length){
      const warnings=document.createElement('div');
      warnings.className='day-warnings';
      const heading=document.createElement('strong');
      heading.textContent='Revisar';
      const list=document.createElement('ul');
      day.warnings.forEach(message=>{const item=document.createElement('li');item.textContent=message;list.append(item)});
      warnings.append(heading,list);
      card.append(warnings);
    }
    return card;
  }

  function updateModeHelp(){
    const existing=options.getExistingDays();
    const mode=$('[name="itineraryImportMode"]:checked').value;
    const help=$('#importModeHelp');
    if(!existing.length){help.textContent='El programa todavía no tiene jornadas cargadas.';return;}
    if(mode==='replace')help.textContent=`Se reemplazarán ${existing.length} jornada${existing.length===1?'':'s'} únicamente después de una confirmación.`;
    else{
      const importedTitles=$$('#importPreviewDays [data-preview-field="title"]').map(input=>input.value.trim().toLowerCase()).filter(Boolean);
      const existingTitles=existing.map(day=>day.title.trim().toLowerCase()).filter(Boolean);
      const duplicates=importedTitles.filter(title=>existingTitles.includes(title)).length;
      help.textContent=`Las nuevas jornadas se agregarán después de las ${existing.length} existentes.${duplicates?` Se detectaron ${duplicates} títulos posiblemente duplicados.`:' Revisá la numeración final antes de guardar.'}`;
    }
  }

  function renderWarnings(){
    const container=$('#importGlobalWarnings');
    const warnings=[...(parsedResult?.warnings||[]),...fileWarnings];
    container.innerHTML='';
    container.hidden=!warnings.length;
    if(!warnings.length)return;
    const heading=document.createElement('strong');
    heading.textContent='Observaciones para revisar';
    const list=document.createElement('ul');
    warnings.forEach(message=>{const item=document.createElement('li');item.textContent=message;list.append(item)});
    container.append(heading,list);
  }

  function renderPreview(result){
    parsedResult=result;
    const preview=$('#importPreviewDays');
    preview.innerHTML='';
    result.days.forEach((day,index)=>preview.append(createDayCard(day,index)));
    $('#importedIncludes').value=result.includes||'';
    $('#importedNotes').value=result.notes||'';
    $('#applyImportedIncludes').checked=Boolean(result.includes);
    $('#applyImportedNotes').checked=Boolean(result.notes);
    const warningCount=result.stats.warnings+fileWarnings.length;
    $('#importSummary').textContent=`Se detectaron ${result.stats.days} día${result.stats.days===1?'':'s'}. Hay ${warningCount} ${warningCount===1?'observación':'observaciones'} para revisar.`;
    renderWarnings();
    updateModeHelp();
    $('#importSourceStep').hidden=true;
    $('#importPreviewStep').hidden=false;
    $('#importPreviewStep').scrollTop=0;
  }

  async function readSelectedFile(){
    const file=$('#itineraryImportFile').files[0];
    if(!file)return;
    const button=$('#processItinerary');
    button.disabled=true;
    setMessage(`Leyendo “${file.name}” localmente...`,'info');
    try{
      const result=await documentReader.readFile(file);
      $('#itineraryImportText').value=result.text;
      fileWarnings=result.warnings||[];
      setMessage(`Texto extraído de “${file.name}”. Revisalo o procesalo.`,'success');
    }catch(error){
      fileWarnings=[];
      setMessage(error.message,'error');
    }finally{button.disabled=false;}
  }

  function process(){
    const text=$('#itineraryImportText').value;
    if(!text.trim()){setMessage('Pegá un itinerario o seleccioná un documento antes de procesar.','error');$('#itineraryImportText').focus();return;}
    const result=parser.parseItinerary(text);
    if(!result.days.length){setMessage(result.warnings[0]||'No se detectaron jornadas. Revisá el formato.','error');return;}
    setMessage('');
    renderPreview(result);
  }

  function collectPreviewDays(){
    return $$('#importPreviewDays [data-preview-day]').map(card=>({
      title:card.querySelector('[data-preview-field="title"]').value.trim(),
      meals:card.querySelector('[data-preview-field="meals"]').value.trim(),
      description:card.querySelector('[data-preview-field="description"]').value.trim()
    })).filter(day=>day.title||day.meals||day.description);
  }

  function mergeText(existing,incoming){
    const current=String(existing||'').trim();
    const addition=String(incoming||'').trim();
    if(!addition||current.includes(addition))return current;
    return[current,addition].filter(Boolean).join('\n\n');
  }

  function apply(){
    const days=collectPreviewDays();
    if(!days.length){options.showToast('No hay jornadas para incorporar.');return;}
    const mode=$('[name="itineraryImportMode"]:checked').value;
    const existing=options.getExistingDays();
    if(mode==='replace'&&existing.length&&!window.confirm(`Se reemplazarán ${existing.length} jornadas existentes por ${days.length} jornadas importadas. ¿Querés continuar?`))return;

    if(mode==='replace'||!existing.length)options.clearDays();
    days.forEach(options.addDay);
    if($('#applyImportedIncludes').checked){
      options.setFieldValue('includes',mergeText(options.getFieldValue('includes'),$('#importedIncludes').value));
    }
    if($('#applyImportedNotes').checked){
      options.setFieldValue('notes',mergeText(options.getFieldValue('notes'),$('#importedNotes').value));
    }
    close();
    options.showToast(`${days.length} jornadas incorporadas. Revisalas y guardá el programa cuando esté listo.`);
  }

  function init(configuration){
    options=configuration;
    if(!parser||!documentReader)throw new Error('No se pudo iniciar el importador de itinerarios.');
    $('#importItinerary').addEventListener('click',open);
    $('#closeItineraryImport').addEventListener('click',close);
    $('#cancelItineraryImport').addEventListener('click',close);
    $('#discardItineraryImport').addEventListener('click',close);
    $('#processItinerary').addEventListener('click',process);
    $('#itineraryImportFile').addEventListener('change',readSelectedFile);
    $('#backToImportSource').addEventListener('click',()=>{$('#importPreviewStep').hidden=true;$('#importSourceStep').hidden=false;});
    $('#applyItineraryImport').addEventListener('click',apply);
    $$('[name="itineraryImportMode"]').forEach(input=>input.addEventListener('change',updateModeHelp));
    $('#itineraryImportModal').addEventListener('click',event=>{if(event.target.id==='itineraryImportModal')close()});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#itineraryImportModal').hidden)close()});
  }

  root.ModoRumboItineraryImporter={init};
})(typeof globalThis!=='undefined'?globalThis:this);
