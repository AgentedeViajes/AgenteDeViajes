-- Modo Rumbo: modalidad de rango de fechas para programas flexibles.
-- Ejecutar una sola vez en Supabase SQL Editor antes de publicar el código.

alter table public.programs
  add column if not exists date_mode text not null default 'specific_dates',
  add column if not exists travel_start_date date,
  add column if not exists travel_end_date date;

alter table public.programs
  drop constraint if exists programs_date_mode_check,
  drop constraint if exists programs_date_range_valid;

alter table public.programs
  add constraint programs_date_mode_check
    check (date_mode in ('specific_dates','date_range')),
  add constraint programs_date_range_valid check (
    (date_mode='specific_dates' and travel_start_date is null and travel_end_date is null)
    or
    (date_mode='date_range'
      and (travel_start_date is null or travel_end_date is null or travel_end_date>=travel_start_date)
      and (status<>'published' or (travel_start_date is not null and travel_end_date is not null))
    )
  );

comment on column public.programs.date_mode is 'specific_dates para salidas individuales; date_range para paquetes flexibles.';
comment on column public.programs.travel_start_date is 'Primer día permitido para iniciar el viaje.';
comment on column public.programs.travel_end_date is 'Último día permitido para iniciar el viaje; no representa la fecha de regreso.';
