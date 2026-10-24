(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ModoRumboItineraryParser=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MONTHS='enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';
  const WEEKDAYS='lun(?:es)?|mar(?:tes)?|mi(?:é|e)(?:r(?:coles)?)?|jue(?:ves)?|vie(?:rnes)?|s(?:á|a)b(?:ado)?|dom(?:ingo)?';
  const DATE_SOURCE=`(?:\\d{1,2}[\\/.\\-]\\d{1,2}(?:[\\/.\\-]\\d{2,4})?|\\d{1,2}\\s+de\\s+(?:${MONTHS})(?:\\s+de\\s+\\d{4})?)`;
  const DATE_RE=new RegExp(`\\b(${DATE_SOURCE})\\b`,'i');
  const DATE_WITH_WEEKDAY_RE=new RegExp(`(?:\\b(?:${WEEKDAYS})\\.?\\s+)?${DATE_SOURCE}`,'i');
  const MEAL_RE=/\b(box\s*breakfast|desayuno|almuerzo|cena|pensi[oó]n\s+completa|media\s+pensi[oó]n)\b/i;
  const SECTION_RULES=[
    {kind:'included',re:/^(?:servicios\s+incluidos|el\s+precio\s+incluye|incluye)\s*:?[ \t]*$/i},
    {kind:'excluded',re:/^(?:servicios\s+no\s+incluidos|el\s+precio\s+no\s+incluye|no\s+incluye)\s*:?[ \t]*$/i},
    {kind:'notes',re:/^(?:observaciones|notas\s+importantes|condiciones\s+generales|recomendaciones)\s*:?[ \t]*$/i}
  ];

  function normalizeText(value){
    return String(value||'').replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ').replace(/[ \t]+$/gm,'');
  }

  function stripBoundaryBlankLines(value){
    return String(value||'').replace(/^\s*\n+/,'').replace(/\n+\s*$/,'');
  }

  function uppercaseRatio(value){
    const letters=String(value||'').match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g)||[];
    if(!letters.length)return 0;
    return letters.filter(letter=>letter===letter.toUpperCase()).length/letters.length;
  }

  function looksLikeCompactTitle(value){
    const text=String(value||'').trim();
    if(!text||text.length>130||/^[\d$€]/.test(text)||/[.!?]$/.test(text))return false;
    if(/^(?:USD|EUR|ARS|HS|HRS|KM|NOCHES?|D[IÍ]AS?|PERSONAS?|PASAJEROS?|VUELOS?)\b/i.test(text))return false;
    return uppercaseRatio(text)>=0.72;
  }

  function detectHeading(line){
    const raw=String(line||'');
    let match=raw.match(/^\s*d[ií]a\s*(\d{1,3})(?:\s*[º°.]\s*)?\s*(?:[›>:|\-–—]\s*)?(.*?)\s*$/i);
    if(match)return{number:Number(match[1]),content:match[2]||'',confidence:'high',style:'day'};

    match=raw.match(/^\s*(\d{1,3})\s*[.›>:|\-–—]\s*(.+?)\s*$/);
    if(match&&!/^\d/.test(match[2])&&looksLikeCompactTitle(match[2]))return{number:Number(match[1]),content:match[2],confidence:'medium',style:'numbered'};

    match=raw.match(/^\s*(\d{1,2})([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ0-9\s/→\-–—&().,'’]{2,130})\s*$/);
    if(match&&looksLikeCompactTitle(match[2]))return{number:Number(match[1]),content:match[2].trim(),confidence:'medium',style:'attached'};

    match=raw.match(/^\s*(\d{1,2})\s+([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ0-9\s/→\-–—&().,'’]{2,130})\s*$/);
    if(match&&looksLikeCompactTitle(match[2]))return{number:Number(match[1]),content:match[2].trim(),confidence:'medium',style:'spaced'};
    return null;
  }

  function detectSection(line){
    const text=String(line||'').trim();
    return SECTION_RULES.find(rule=>rule.re.test(text))?.kind||null;
  }

  function extractMeals(header){
    const text=String(header||'');
    const matches=text.match(new RegExp(MEAL_RE.source,'gi'))||[];
    if(!matches.length)return{value:'',cleaned:text};
    const normalized=matches.map(item=>item.toLowerCase().replace(/\s+/g,' '));
    let value='';
    if(normalized.some(item=>item.includes('pensión completa')||item.includes('pension completa')))value='Pensión completa';
    else if(normalized.some(item=>item.includes('media pensión')||item.includes('media pension')))value='Media pensión';
    else if(normalized.some(item=>item.includes('box breakfast')))value='Box breakfast';
    else{
      const codes=[];
      if(normalized.some(item=>item.includes('desayuno')))codes.push('D');
      if(normalized.some(item=>item.includes('almuerzo')))codes.push('A');
      if(normalized.some(item=>item.includes('cena')))codes.push('C');
      value=codes.join('/');
    }
    let cleaned=text.replace(/\(([^)]*(?:box\s*breakfast|desayuno|almuerzo|cena|pensi[oó]n)[^)]*)\)/ig,' ');
    cleaned=cleaned.replace(/(?:\s*[-–—|,]\s*)?(?:box\s*breakfast|desayuno)(?:\s*(?:,|y|\/|\+)\s*(?:almuerzo|cena))*(?:\s*(?:,|y|\/|\+)\s*cena)?\s*$/i,' ');
    cleaned=cleaned.replace(/(?:\s*[-–—|,]\s*)?(?:pensi[oó]n\s+completa|media\s+pensi[oó]n)\s*$/i,' ');
    return{value,cleaned};
  }

  function parseHeader(heading,continuation=''){
    const original=[heading.content,continuation].filter(Boolean).join(' ').trim();
    const date=original.match(DATE_RE)?.[1]||'';
    const meals=extractMeals(original);
    let title=meals.cleaned.replace(DATE_WITH_WEEKDAY_RE,' ');
    title=title.replace(/^\s*(?:[›>:|\-–—,]\s*)+/,'').replace(/(?:\s*[›>:|\-–—,])+\s*$/,'').replace(/\s{2,}/g,' ').trim();
    return{title,date,meals:meals.value,original};
  }

  function appendBlock(target,line){
    target.push(line);
  }

  function uniqueWarnings(warnings){
    return Array.from(new Set(warnings.filter(Boolean)));
  }

  function parseItinerary(input){
    const text=normalizeText(input);
    const lines=text.split('\n');
    const headingEntries=[];
    for(let index=0;index<lines.length;index+=1){
      const heading=detectHeading(lines[index]);
      if(heading)headingEntries.push({index,heading});
    }
    const firstHeading=headingEntries[0]?.index??Infinity;
    const lastHeading=headingEntries[headingEntries.length-1]?.index??-1;
    const days=[];
    const general={included:[],excluded:[],notes:[],preamble:[]};
    const globalWarnings=[];
    let currentDay=null;
    let activeGeneral=null;

    function finishDay(){
      if(!currentDay)return;
      currentDay.description=stripBoundaryBlankLines(currentDay.body.join('\n'));
      delete currentDay.body;
      if(!currentDay.title)currentDay.warnings.push('No se pudo identificar con seguridad el título de esta jornada.');
      if(!currentDay.description)currentDay.warnings.push('La jornada no contiene una descripción después del encabezado.');
      currentDay.warnings=uniqueWarnings(currentDay.warnings);
      days.push(currentDay);
      currentDay=null;
    }

    for(let index=0;index<lines.length;index+=1){
      const line=lines[index];
      const heading=detectHeading(line);
      const section=detectSection(line);
      const outsideDayRange=index<firstHeading||index>lastHeading;

      if(section&&outsideDayRange){
        finishDay();
        activeGeneral=section;
        continue;
      }

      if(heading){
        finishDay();
        activeGeneral=null;
        let continuation='';
        if(!heading.content.trim()){
          let next=index+1;
          while(next<lines.length&&!lines[next].trim())next+=1;
          if(next<lines.length&&!detectHeading(lines[next])&&!detectSection(lines[next])){
            continuation=lines[next].trim();
            index=next;
          }
        }else{
          const headerWithoutDate=heading.content.replace(DATE_WITH_WEEKDAY_RE,'').replace(/[›>:|\-–—,\s]/g,'');
          if(!headerWithoutDate){
            let next=index+1;
            while(next<lines.length&&!lines[next].trim())next+=1;
            if(next<lines.length&&!detectHeading(lines[next])&&!detectSection(lines[next])){
              continuation=lines[next].trim();
              index=next;
            }
          }
        }
        const parsed=parseHeader(heading,continuation);
        const warnings=[];
        if(heading.confidence==='medium')warnings.push('Encabezado reconocido por su formato compacto; conviene revisar el título.');
        if(continuation)warnings.push('El encabezado estaba dividido en varias líneas y fue unido automáticamente.');
        currentDay={sourceNumber:heading.number,title:parsed.title,meals:parsed.meals,date:parsed.date,description:'',body:[],warnings};
        continue;
      }

      if(section&&currentDay){
        currentDay.warnings.push(`“${line.trim()}” se mantuvo dentro de la jornada porque aparece entre encabezados de días.`);
      }

      if(activeGeneral){appendBlock(general[activeGeneral],line);continue;}
      if(currentDay){appendBlock(currentDay.body,line);continue;}
      if(line.trim())general.preamble.push(line);
    }
    finishDay();

    for(let index=1;index<days.length;index+=1){
      const previous=days[index-1].sourceNumber;
      const current=days[index].sourceNumber;
      if(current!==previous+1){
        days[index].warnings.push(`La numeración salta de Día ${previous} a Día ${current}.`);
        globalWarnings.push('Se detectaron saltos o repeticiones en la numeración de las jornadas.');
      }
    }
    if(general.preamble.length){
      globalWarnings.push('Hay texto previo al primer día. Se propone incorporarlo en Notas y condiciones.');
      general.notes.unshift('Texto previo al itinerario:','',...general.preamble,'');
    }
    if(!days.length&&text.trim())globalWarnings.push('No se reconocieron encabezados de jornadas con suficiente seguridad. Revisá el formato y volvé a procesar.');
    if(days.some(day=>day.date))globalWarnings.push('Las fechas internas se muestran para revisión, pero no se guardarán porque el programa actual no dispone de un campo compatible.');
    if(general.excluded.length)globalWarnings.push('Los servicios no incluidos se proponen dentro de Notas y condiciones.');
    if(general.notes.length)globalWarnings.push('Las observaciones generales fueron separadas para revisión.');

    const cleanBlock=items=>stripBoundaryBlankLines(items.join('\n'));
    const excluded=cleanBlock(general.excluded);
    const notes=[cleanBlock(general.notes),excluded?`Servicios no incluidos:\n${excluded}`:''].filter(Boolean).join('\n\n');
    return{
      days,
      includes:cleanBlock(general.included),
      notes,
      warnings:uniqueWarnings(globalWarnings),
      stats:{days:days.length,warnings:globalWarnings.length+days.reduce((sum,day)=>sum+day.warnings.length,0)}
    };
  }

  return{parseItinerary,detectHeading,extractMeals,normalizeText};
});
