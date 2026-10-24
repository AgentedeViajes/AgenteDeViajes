(function(root,factory){
  'use strict';
  root.ModoRumboDocumentReader=factory(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const MAX_SIZE=20*1024*1024;

  function extensionOf(file){return String(file?.name||'').split('.').pop().toLowerCase()}
  function assertFile(file){
    if(!file)throw new Error('Seleccioná un archivo Word o PDF.');
    if(file.size>MAX_SIZE)throw new Error('El archivo supera el límite de 20 MB.');
    const extension=extensionOf(file);
    if(!['doc','docx','pdf'].includes(extension))throw new Error('El formato no es compatible. Seleccioná un archivo .docx, .doc o .pdf.');
    return extension;
  }

  async function readDocx(file){
    if(!root.mammoth?.extractRawText)throw new Error('El lector de Word no pudo cargarse. Actualizá la página e intentá nuevamente.');
    const result=await root.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
    const text=String(result.value||'').trim();
    if(!text)throw new Error('El documento Word no contiene texto legible.');
    return{text,warnings:(result.messages||[]).map(item=>item.message).filter(Boolean)};
  }

  async function readPdf(file){
    if(!root.pdfjsLib?.getDocument)throw new Error('El lector de PDF no pudo cargarse. Actualizá la página e intentá nuevamente.');
    if(root.pdfjsLib.GlobalWorkerOptions)root.pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
    const document=await root.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    const pages=[];
    for(let pageNumber=1;pageNumber<=document.numPages;pageNumber+=1){
      const page=await document.getPage(pageNumber);
      const content=await page.getTextContent();
      let pageText='';
      for(const item of content.items){
        const value=String(item.str||'');
        if(!value)continue;
        pageText+=value;
        pageText+=item.hasEOL?'\n':' ';
      }
      pages.push(pageText.replace(/[ \t]+\n/g,'\n').trim());
    }
    const text=pages.filter(Boolean).join('\n\n').trim();
    if(!text)throw new Error('El PDF no contiene texto seleccionable. Si es un escaneo, pegá el texto manualmente.');
    return{text,warnings:[]};
  }

  function decodeLegacyDoc(buffer){
    const bytes=new Uint8Array(buffer);
    const isOle=bytes.length>8&&bytes[0]===0xd0&&bytes[1]===0xcf&&bytes[2]===0x11&&bytes[3]===0xe0;
    if(isOle)throw new Error('Este .doc usa el formato binario antiguo. Por seguridad y para mantener el procesamiento local, guardalo como .docx o PDF y volvé a seleccionarlo.');
    let text=new TextDecoder('utf-8',{fatal:false}).decode(bytes);
    if(/^\s*{\\rtf/i.test(text)){
      text=text.replace(/\\par[d]?\b/g,'\n').replace(/\\'[0-9a-f]{2}/gi,' ').replace(/\\[a-z]+-?\d* ?/gi,'').replace(/[{}]/g,'');
    }else if(/<html[\s>]/i.test(text)){
      const parsed=new DOMParser().parseFromString(text,'text/html');
      text=parsed.body?.innerText||parsed.body?.textContent||'';
    }
    text=text.replace(/\0/g,'').trim();
    const controls=(text.match(/[\u0000-\u0008\u000e-\u001f]/g)||[]).length;
    if(!text||controls>Math.max(5,text.length*.01))throw new Error('No se pudo extraer texto de este .doc. Guardalo como .docx o PDF para importarlo localmente.');
    return{text,warnings:['El archivo .doc fue interpretado como texto. Revisá cuidadosamente la vista previa antes de confirmar.']};
  }

  async function readFile(file){
    const extension=assertFile(file);
    if(extension==='docx')return readDocx(file);
    if(extension==='pdf')return readPdf(file);
    return decodeLegacyDoc(await file.arrayBuffer());
  }

  return{readFile};
});
