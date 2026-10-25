(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ModoRumboDateMode = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SPECIFIC_DATES = 'specific_dates';
  const DATE_RANGE = 'date_range';
  const RANGE_NOTICE = 'Tarifa sujeta a disponibilidad aérea y hotelera. Precio a reconfirmar al momento de cotizar o reservar.';

  function normalizeMode(value) {
    return value === DATE_RANGE ? DATE_RANGE : SPECIFIC_DATES;
  }

  function isIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  }

  function validateAvailability(input) {
    const mode = normalizeMode(input && input.mode);
    const start = String(input && input.start || '');
    const end = String(input && input.end || '');
    const status = String(input && input.status || 'draft');
    const errors = [];

    if (mode === DATE_RANGE) {
      if (status !== 'draft' && !start) errors.push('Ingresá la fecha inicial del período de viaje.');
      if (status !== 'draft' && !end) errors.push('Ingresá la fecha final del período de viaje.');
      if (start && !isIsoDate(start)) errors.push('La fecha inicial no tiene un formato válido.');
      if (end && !isIsoDate(end)) errors.push('La fecha final no tiene un formato válido.');
      if (isIsoDate(start) && isIsoDate(end) && end < start) errors.push('La fecha final no puede ser anterior a la fecha inicial.');
    }
    return {valid: errors.length === 0, errors};
  }

  function activeAvailability(input) {
    const mode = normalizeMode(input && input.mode);
    if (mode === DATE_RANGE) {
      return {
        dateMode: DATE_RANGE,
        rangeStartDate: String(input && input.rangeStartDate || ''),
        rangeEndDate: String(input && input.rangeEndDate || ''),
        departures: []
      };
    }
    return {
      dateMode: SPECIFIC_DATES,
      rangeStartDate: '',
      rangeEndDate: '',
      departures: Array.isArray(input && input.departures) ? input.departures : []
    };
  }

  function formatNumericDate(value) {
    if (!isIsoDate(value)) return '';
    const parts = value.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function rangeLabel(start, end) {
    const formattedStart = formatNumericDate(start);
    const formattedEnd = formatNumericDate(end);
    return formattedStart && formattedEnd ? `Para viajar del ${formattedStart} al ${formattedEnd}` : '';
  }

  function rangeMonths(start, end) {
    if (!isIsoDate(start) || !isIsoDate(end) || end < start) return [];
    const names = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    let year = Number(start.slice(0, 4));
    let month = Number(start.slice(5, 7)) - 1;
    const endYear = Number(end.slice(0, 4));
    const endMonth = Number(end.slice(5, 7)) - 1;
    const result = [];
    let guard = 0;
    while ((year < endYear || (year === endYear && month <= endMonth)) && guard < 240) {
      if (!result.includes(names[month])) result.push(names[month]);
      month += 1;
      if (month === 12) { month = 0; year += 1; }
      guard += 1;
    }
    return result;
  }

  return {
    SPECIFIC_DATES,
    DATE_RANGE,
    RANGE_NOTICE,
    normalizeMode,
    validateAvailability,
    activeAvailability,
    formatNumericDate,
    rangeLabel,
    rangeMonths
  };
});
