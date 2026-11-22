(function () {
  'use strict';

  const helper = window.ModoRumboProgramBooking;
  const reservationClient = window.ModoRumboReservationClient;
  const status = document.querySelector('[data-booking-load-status]');
  const content = document.querySelector('[data-booking-content]');
  const form = document.querySelector('[data-booking-form]');
  if (!helper || !status || !content || !form) return;

  const params = new URLSearchParams(window.location.search);
  const programId = params.get('programa') || '';
  const requestedDeparture = params.get('salida') || '';
  const dateSelectRow = document.querySelector('[data-date-select-row]');
  const dateSelect = document.querySelector('[data-departure-select]');
  const dateSelectLabel = document.querySelector('[data-departure-label]');
  const submitStatus = document.querySelector('[data-submit-status]');
  const submitButton = form.querySelector('[type="submit"]');
  const confirmation = document.querySelector('[data-booking-confirmation]');
  const minorCount = form.elements.minors;
  const ageGroup = document.querySelector('[data-minor-ages]');
  const ageInputs = document.querySelector('[data-minor-age-inputs]');
  let program;
  const formStartedAt = Date.now();
  const requestClient = reservationClient?.createReservationClient();
  const submitButtonLabel = submitButton ? submitButton.innerHTML : '';

  function safeImageUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value, window.location.href);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }

  function selectedDeparture() {
    return dateSelect && dateSelect.value ? dateSelect.value : null;
  }

  function refreshProgramSummary() {
    const selection = helper.departureSelection(program, selectedDeparture());
    document.querySelector('[data-program-availability]').textContent = selection.availability;
    document.querySelector('[data-program-fare]').textContent = selection.fare.error === 'departure_required'
      ? 'Seleccioná la fecha para ver la tarifa' : helper.formatFare(program, selection.fare);
  }

  function renderDepartureControl() {
    const departures = helper.departureOptions(program);
    if (!departures.length) {
      dateSelectRow.hidden = true;
      return;
    }
    const selection = helper.departureSelection(program, requestedDeparture);
    dateSelectRow.hidden = !selection.selectorVisible;
    const selected = selection.selectedDate || '';
    dateSelectLabel.textContent = selected ? 'Podés cambiar la fecha de salida' : 'Fecha de salida';
    dateSelect.replaceChildren();
    const prompt = document.createElement('option');
    prompt.value = '';
    prompt.textContent = 'Seleccioná tu fecha de salida';
    dateSelect.append(prompt);
    departures.forEach(item => {
      const option = document.createElement('option');
      option.value = item.departure_date;
      option.textContent = helper.formatDate(item.departure_date);
      dateSelect.append(option);
    });
    dateSelect.value = selected;
    dateSelect.required = selection.dateRequired;
  }

  function renderMinorAges() {
    const count = Math.max(0, Math.min(19, Number(minorCount.value) || 0));
    ageGroup.hidden = count === 0;
    ageInputs.replaceChildren();
    for (let index = 0; index < count; index += 1) {
      const label = document.createElement('label');
      label.className = 'booking-field';
      label.textContent = `Edad menor ${index + 1}`;
      const input = document.createElement('input');
      input.type = 'number';
      input.name = 'minorAge';
      input.min = '0';
      input.max = '17';
      input.required = true;
      input.setAttribute('aria-label', `Edad del menor ${index + 1}`);
      label.append(input);
      ageInputs.append(label);
    }
  }

  async function loadProgram() {
    if (!helper.isProgramId(programId)) throw new Error('invalid_link');
    if (typeof window.loadModoRumboPrograms !== 'function') throw new Error('catalog_unavailable');
    const programs = await window.loadModoRumboPrograms();
    program = (Array.isArray(programs) ? programs : []).find(item => `supabase:${item.id}` === programId && item.status === 'published');
    if (!program) throw new Error('program_unavailable');

    document.title = `${program.title} | Solicitud de contratación | Modo Rumbo`;
    document.querySelector('[data-program-title]').textContent = program.title || 'Programa de viaje';
    document.querySelector('[data-program-duration]').textContent = program.duration || 'A confirmar';
    const code = String(program.operator_code || '').trim();
    document.querySelector('[data-operator-row]').hidden = !code;
    document.querySelector('[data-program-code]').textContent = code;
    const image = document.querySelector('[data-program-image]');
    const imageUrl = safeImageUrl(program.image_path);
    if (imageUrl) {
      image.src = imageUrl;
      image.alt = program.title ? `Imagen de ${program.title}` : 'Imagen del programa';
      image.hidden = false;
    }

    renderDepartureControl();
    renderMinorAges();
    refreshProgramSummary();
    dateSelect.addEventListener('change', refreshProgramSummary);
    minorCount.addEventListener('input', renderMinorAges);
    content.hidden = false;
    status.hidden = true;
  }

  function errorMessage(code) {
    const messages = {
      departure_required: 'Seleccioná una fecha de salida para continuar.',
      departure_not_published: 'La fecha elegida ya no está publicada. Actualizá la página y seleccioná otra salida.',
      fare_changed: 'La tarifa publicada cambió. Actualizá la página para revisar el valor vigente.',
      program_not_published: 'Este programa ya no está disponible para contratación.',
      catalog_unavailable: 'No pudimos verificar los datos del programa. Conservamos tu información; intentá nuevamente.',
      too_many_requests: 'Se realizaron varios intentos recientes. Esperá unos minutos antes de volver a enviar.',
      service_unavailable: 'El servicio de envío no está disponible ahora. Conservamos tus datos para que puedas reintentar.',
      request_rejected: 'No pudimos validar el envío. Revisá los datos y volvé a intentarlo.',
      email_delivery_failed: 'No pudimos enviar la solicitud. Tus datos siguen en el formulario; podés reintentar.',
      invalid_request: 'Revisá los campos obligatorios y la fecha de salida antes de reintentar.',
      network_error: 'No pudimos conectar con el servicio de envío. Tus datos siguen en el formulario; podés reintentar.'
    };
    return messages[code] || messages.email_delivery_failed;
  }

  function buildPayload() {
    const values = new FormData(form);
    const adults = Number(values.get('adults'));
    const minors = Number(values.get('minors'));
    const minorAges = values.getAll('minorAge').map(value => Number(value));
    const selection = helper.departureSelection(program, selectedDeparture());
    return {
      passenger: {
        fullName: String(values.get('fullName') || ''),
        email: String(values.get('email') || ''),
        phone: String(values.get('phone') || ''),
        locality: String(values.get('locality') || ''),
        adults,
        minors,
        minorAges,
        comments: String(values.get('comments') || ''),
        contactConsent: values.get('contactConsent') === 'on'
      },
      program: {
        id: programId,
        departureDate: selection.selectedDate,
        fareAmount: selection.fare.error ? null : selection.fare.amount
      },
      formStartedAt,
      website: String(values.get('website') || '')
    };
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const departures = helper.departureOptions(program);
    if (departures.length && !selectedDeparture()) {
      dateSelect.focus();
      return;
    }
    const values = new FormData(form);
    const adults = Number(values.get('adults'));
    const minors = Number(values.get('minors'));
    if (adults + minors > 20) {
      form.elements.minors.setCustomValidity('La cantidad total de pasajeros no puede superar 20.');
      form.elements.minors.reportValidity();
      form.elements.minors.addEventListener('input', () => form.elements.minors.setCustomValidity(''), { once: true });
      return;
    }
    if (!requestClient || requestClient.pending) return;

    submitButton.disabled = true;
    form.setAttribute('aria-busy', 'true');
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Enviando solicitud…';
    submitStatus.textContent = 'Estamos enviando tu solicitud de forma segura…';
    const result = await requestClient.submit(buildPayload());
    form.removeAttribute('aria-busy');

    if (result.ok === true) {
      content.hidden = true;
      confirmation.hidden = false;
      confirmation.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    submitButton.disabled = false;
    submitButton.innerHTML = submitButtonLabel;
    submitStatus.textContent = errorMessage(result.error);
  });

  loadProgram().catch(error => {
    status.classList.add('booking-error');
    status.textContent = error.message === 'invalid_link'
      ? 'El enlace de contratación no es válido.'
      : error.message === 'program_unavailable'
        ? 'Este programa no está disponible o ya no se encuentra publicado.'
        : 'No se pudieron cargar los datos publicados del programa. Actualizá la página para volver a intentarlo.';
  });
})();
