(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ModoRumboProgramBooking = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const PROGRAM_PREFIX = 'supabase:';

  function isProgramId(value) {
    return typeof value === 'string'
      && value.startsWith(PROGRAM_PREFIX)
      && /^[0-9a-f-]{36}$/i.test(value.slice(PROGRAM_PREFIX.length));
  }

  function isIsoDate(value) {
    return typeof value === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
      && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  }

  function formatDate(value) {
    if (!isIsoDate(value)) return '';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  function isDateRange(program) {
    return (program?.date_mode || program?.dateMode) === 'date_range';
  }

  function departureOptions(program) {
    return [...(Array.isArray(program?.departures) ? program.departures : [])]
      .filter(item => isIsoDate(item.departure_date))
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date));
  }

  function fareFor(program, departureDate = null) {
    const options = departureOptions(program);
    let departure = null;
    if (departureDate) {
      departure = options.find(item => item.departure_date === departureDate);
      if (!departure) return { valid: false, amount: null, error: 'departure_not_found' };
    } else if (options.length) {
      return { valid: false, amount: null, error: 'departure_required' };
    }
    const departurePrice = departure && departure.price !== null && departure.price !== undefined && departure.price !== ''
      ? Number(departure.price) : null;
    const basePrice = program?.price_prefix === 'consult' ? null : Number(program?.price);
    const amount = Number.isFinite(departurePrice) && departurePrice >= 0
      ? departurePrice
      : Number.isFinite(basePrice) && basePrice >= 0 ? basePrice : null;
    return { valid: true, amount, departurePrice: departurePrice !== null && Number.isFinite(departurePrice) };
  }

  function departureSelection(program, requestedDate = null) {
    const departures = departureOptions(program);
    const selectedDate = departures.some(item => item.departure_date === requestedDate)
      ? requestedDate : departures.length === 1 ? departures[0].departure_date : null;
    return {
      departures,
      selectedDate,
      selectorVisible: departures.length > 1,
      dateRequired: departures.length > 1,
      availability: !selectedDate && departures.length > 1
        ? 'Seleccioná tu fecha de salida' : availabilityLabel(program, selectedDate),
      fare: fareFor(program, selectedDate)
    };
  }

  function formatFare(program, fare) {
    if (!fare || fare.amount === null) return 'A consultar';
    const currency = String(program?.currency || 'USD');
    const formatted = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(fare.amount);
    const basis = ({
      double: 'por persona en doble',
      single: 'por persona en single',
      package: 'por paquete'
    }[program?.price_basis] || '');
    const prefix = !fare.departurePrice && program?.price_prefix === 'from' ? 'Desde ' : '';
    return `${prefix}${currency} ${formatted}${basis ? ` ${basis}` : ''}`;
  }

  function availabilityLabel(program, departureDate = null) {
    if (departureDate) return formatDate(departureDate);
    if (isDateRange(program)) {
      const start = formatDate(program.travel_start_date);
      const end = formatDate(program.travel_end_date);
      return start && end ? `Período de viaje: ${start} al ${end}` : 'Período de viaje a confirmar';
    }
    if (program?.departure_type === 'weekly') return 'Salidas semanales';
    if (program?.departure_type === 'on-request') return 'A solicitud';
    return 'Fecha a coordinar';
  }

  function buildBookingUrl(programId, departureDate = null) {
    if (!isProgramId(programId)) throw new TypeError('El programa no tiene un identificador publicado compatible.');
    const url = new URL('contratar.html', root.location?.href || 'https://modorumbo.vercel.app/');
    url.searchParams.set('programa', programId);
    if (departureDate) {
      if (!isIsoDate(departureDate)) throw new TypeError('La salida no tiene una fecha válida.');
      url.searchParams.set('salida', departureDate);
    }
    return url.href;
  }

  return { PROGRAM_PREFIX, isProgramId, isIsoDate, formatDate, isDateRange, departureOptions, fareFor, departureSelection, formatFare, availabilityLabel, buildBookingUrl };
});
