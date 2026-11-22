(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const service = window.ModoRumboData;
  const nav = $('[data-view="experiences"]');
  const view = $('#travelerExperiencesView');
  if (!service || !nav || !view) return;
  const host=window.location.hostname;
  const apiUrl=host==='agentedeviajes.github.io'?'https://modorumbo.vercel.app/api/traveler-experiences':`${window.location.origin}/api/traveler-experiences`;

  const state = { invitations: [], experiences: [], programs: [], busy: false, photoUrls: new Map() };
  const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateLabel = value => { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-AR'); };
  const statusLabels = { pending: 'Pendiente', used: 'Utilizada', expired: 'Vencida', revoked: 'Revocada', approved: 'Aprobada', rejected: 'Rechazada', hidden: 'Oculta' };
  function notice(message, kind = '') { const node=$('#travelerExperiencesNotice');node.textContent=message;node.className=`traveler-experiences-notice${kind?` ${kind}`:''}`;node.hidden=!message; }
  function revokePhotoUrls() { for (const url of state.photoUrls.values()) URL.revokeObjectURL(url);state.photoUrls.clear(); }
  function fillPrograms() {
    const select=$('#travelerInviteProgram');
    const current=select.value;
    state.programs=state.programs.filter(program=>program.status==='published');
    select.innerHTML='<option value="">Sin asociar a un programa</option>'+state.programs.map(program=>`<option value="${escapeHtml(program.id)}">${escapeHtml(program.title)}</option>`).join('');
    if (state.programs.some(program=>program.id===current)) select.value=current;
  }
  function renderInvitations() {
    const node=$('#travelerInvitesList');
    $('#travelerInvitesCount').textContent=`${state.invitations.length} invitación${state.invitations.length===1?'':'es'}`;
    if (!state.invitations.length) { node.innerHTML='<p class="traveler-list-empty">Todavía no hay invitaciones.</p>';return; }
    node.innerHTML=state.invitations.map(item=>{
      const status=item.status||'pending';
      return `<article class="traveler-invite-row"><div class="traveler-record-main"><strong>${escapeHtml(item.destination)}</strong><span>${escapeHtml(item.programTitle||'Sin programa asociado')}${item.passengerName?` · ${escapeHtml(item.passengerName)}`:''}</span><small>Creada ${escapeHtml(dateLabel(item.createdAt))} · vence ${escapeHtml(dateLabel(item.expiresAt))}</small></div><span class="traveler-status ${escapeHtml(status)}">${escapeHtml(statusLabels[status]||status)}</span>${status==='pending'?`<button class="text-button traveler-revoke" type="button" data-traveler-action="revoke" data-id="${escapeHtml(item.id)}">Revocar</button>`:''}</article>`;
    }).join('');
  }
  function renderExperiences() {
    const node=$('#travelerExperiencesList');
    $('#travelerSubmissionsCount').textContent=`${state.experiences.length} experiencia${state.experiences.length===1?'':'s'}`;
    if (!state.experiences.length) { node.innerHTML='<p class="traveler-list-empty">Todavía no se recibieron experiencias.</p>';return; }
    node.innerHTML=state.experiences.map(item=>{
      const status=item.status||'pending';
      const when=`${monthNames[Math.max(0,Math.min(11,Number(item.travelMonth)-1))]} ${escapeHtml(item.travelYear)}`;
      const rating=Math.max(0,Math.min(5,Number(item.rating)||0));
      const stars='★'.repeat(rating)+'☆'.repeat(5-rating);
      const photoUrl=state.photoUrls.get(item.id);
      const photo=item.hasPhoto?`<div class="traveler-photo-area">${photoUrl?`<img src="${escapeHtml(photoUrl)}" alt="Fotografía enviada por ${escapeHtml(item.passengerName)}">`:`<button class="secondary-button" type="button" data-traveler-action="photo" data-id="${escapeHtml(item.id)}">Ver fotografía privada</button>`}</div>`:'';
      const actions=status==='pending'?`<button class="primary-button" type="button" data-traveler-action="approve" data-id="${escapeHtml(item.id)}">Aprobar</button><button class="secondary-button" type="button" data-traveler-action="reject" data-id="${escapeHtml(item.id)}">Rechazar</button>`:status==='approved'?`<button class="secondary-button" type="button" data-traveler-action="hide" data-id="${escapeHtml(item.id)}">Ocultar publicación</button>`:'';
      return `<article class="traveler-experience-card"><header><div><h4>${escapeHtml(item.passengerName)}</h4><p>${escapeHtml(item.destination)} · ${when}</p></div><span class="traveler-status ${escapeHtml(status)}">${escapeHtml(statusLabels[status]||status)}</span></header><div class="traveler-stars" aria-label="${rating} de 5 estrellas">${stars}</div><blockquote>${escapeHtml(item.comment)}</blockquote>${photo}<footer><small>Recibida ${escapeHtml(dateLabel(item.createdAt))} · consentimiento registrado</small><div class="traveler-review-actions">${actions}</div></footer></article>`;
    }).join('');
  }
  function clearGeneratedLink() { $('#travelerCreatedInvite').hidden=true;$('#travelerCreatedInviteLink').value=''; }
  async function api(action, payload = {}) {
    const token=await service.getAccessToken();
    const response=await fetch(apiUrl,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action,...payload})});
    let data={};try{data=await response.json();}catch(_){throw new Error('El servidor devolvió una respuesta inesperada.');}
    if(!response.ok||data.ok===false){const messages={unauthorized:'La sesión venció. Iniciá sesión nuevamente.',forbidden:'La cuenta no tiene permisos para administrar Experiencias.',service_unavailable:'El servicio de Experiencias no está disponible ahora.',database_unavailable:'No se pudieron consultar los datos. Intentá de nuevo.',storage_unavailable:'No se pudo abrir la fotografía privada.',invitation_unavailable:'La invitación ya no está pendiente o no se encuentra disponible.',experience_unavailable:'La experiencia ya cambió de estado. Actualizá el listado.',invalid_program:'El programa seleccionado no está publicado.'};throw new Error(messages[data.error]||'No se pudo completar la acción. Intentá nuevamente.');}
    return data;
  }
  async function load(successMessage = '') {
    if (!service.configured) { notice('Conectá el administrador a Supabase para gestionar Experiencias de viajeros.','error');return; }
    if (!$('#authGate').hidden) { notice('Iniciá sesión con una cuenta administradora para continuar.','error');return; }
    if(state.busy)return;state.busy=true;notice('Cargando invitaciones y experiencias…');$('#travelerInvitesList').setAttribute('aria-busy','true');$('#travelerExperiencesList').setAttribute('aria-busy','true');
    try {
      const [invites,experiences,programs]=await Promise.all([api('list-invitations'),api('list-experiences'),service.listPrograms()]);
      state.invitations=invites.invitations||[];state.experiences=experiences.experiences||[];state.programs=programs||[];fillPrograms();renderInvitations();renderExperiences();notice(successMessage,successMessage?'success':'');
    } catch(error) { notice(error.message||'No se pudieron cargar los datos.','error'); }
    finally { state.busy=false;$('#travelerInvitesList').removeAttribute('aria-busy');$('#travelerExperiencesList').removeAttribute('aria-busy'); }
  }
  function switchToExperiences() {
    if (!$('#authGate').hidden) { notice('Iniciá sesión como administrador para gestionar Experiencias.','error');return; }
    $$('.view').forEach(item=>item.classList.toggle('active',item===view));
    $$('.nav-button').forEach(item=>item.classList.toggle('active',item===nav));
    $('#pageTitle').textContent='Experiencias de viajeros';$('#newProgramButton').hidden=true;
    load();
  }
  nav.addEventListener('click',switchToExperiences);
  $('#travelerExperiencesRefresh').addEventListener('click',load);
  $('#travelerInviteForm').addEventListener('submit',async event=>{
    event.preventDefault();if(state.busy)return;
    const submit=$('#travelerInviteSubmit');submit.disabled=true;submit.textContent='Generando…';clearGeneratedLink();
    try {
      const program=state.programs.find(item=>item.id===$('#travelerInviteProgram').value);
      const result=await api('create-invitation',{destination:$('#travelerInviteDestination').value.trim(),programId:program?.id||null,passengerName:$('#travelerInvitePassenger').value.trim()||null});
      $('#travelerCreatedInviteLink').value=result.link;$('#travelerCreatedInvite').hidden=false;notice('Invitación generada. Copiá el enlace ahora; no se podrá recuperar después.','success');
      $('#travelerInviteForm').reset();fillPrograms();await load('Invitación generada. Copiá el enlace ahora; no se podrá recuperar después.');$('#travelerCreatedInviteLink').value=result.link;$('#travelerCreatedInvite').hidden=false;
    } catch(error) { notice(error.message||'No se pudo generar la invitación.','error'); }
    finally { submit.disabled=false;submit.textContent='Generar enlace'; }
  });
  $('#travelerCopyInvite').addEventListener('click',async()=>{
    const input=$('#travelerCreatedInviteLink');if(!input.value)return;
    try{await navigator.clipboard.writeText(input.value);notice('Enlace copiado. Ya podés enviarlo al pasajero por WhatsApp.','success');}
    catch(_){input.focus();input.select();try{document.execCommand('copy');notice('Enlace copiado.','success');}catch(__){notice('Seleccioná y copiá el enlace manualmente.','error');}}
  });
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-traveler-action]');if(!button||!view.contains(button)||button.disabled)return;
    const {travelerAction:action,id}=button.dataset;
    if(action==='revoke'&&!window.confirm('¿Revocar esta invitación pendiente?'))return;
    button.disabled=true;
    try {
      if(action==='revoke'){await api('revoke-invitation',{invitationId:id});await load('Invitación revocada.');return;}
      if(action==='approve'||action==='reject'||action==='hide') { await api('moderate-experience',{experienceId:id,moderationAction:action});await load(action==='approve'?'Experiencia aprobada y publicada.':action==='hide'?'Experiencia ocultada.':'Experiencia rechazada.');return; }
      if(action==='photo') {
        const result=await api('get-experience-photo',{experienceId:id});
        const bytes=Uint8Array.from(atob(result.imageData),char=>char.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
        const old=state.photoUrls.get(id);if(old)URL.revokeObjectURL(old);state.photoUrls.set(id,url);renderExperiences();notice('Fotografía cargada de forma privada para esta sesión.','success');
      }
    } catch(error) { notice(error.message||'No se pudo completar la acción.','error'); }
    finally { if(button.isConnected)button.disabled=false; }
  });
  window.addEventListener('beforeunload',revokePhotoUrls);
})();
