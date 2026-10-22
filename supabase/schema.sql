-- Modo Rumbo: esquema inicial para Supabase/PostgreSQL.
-- Ejecutar una sola vez en el SQL Editor de un proyecto nuevo.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  operator_code text,
  status text not null default 'draft' check (status in ('draft','published','paused')),
  region text,
  countries text[] not null default '{}',
  destinations text[] not null default '{}',
  duration text,
  featured boolean not null default false,
  travel_types text[] not null default '{}',
  flight_type text not null default 'with-flight' check (flight_type in ('with-flight','without-flight','optional')),
  departure_type text not null default 'scheduled' check (departure_type in ('scheduled','weekly','on-request')),
  currency text not null default 'USD' check (currency in ('USD','ARS','EUR')),
  price numeric(12,2),
  price_prefix text not null default 'from' check (price_prefix in ('from','fixed','consult')),
  price_basis text not null default 'double' check (price_basis in ('double','single','package')),
  includes text[] not null default '{}',
  summary text,
  notes text,
  image_path text,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departures (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  departure_date date,
  price numeric(12,2),
  capacity integer check (capacity is null or capacity >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  position integer not null check (position > 0),
  title text,
  meals text,
  description text not null,
  created_at timestamptz not null default now(),
  unique(program_id,position)
);

create index if not exists programs_status_idx on public.programs(status);
create index if not exists programs_region_idx on public.programs(region);
create index if not exists programs_travel_types_idx on public.programs using gin(travel_types);
create index if not exists departures_program_idx on public.departures(program_id);
create index if not exists departures_date_idx on public.departures(departure_date);
create index if not exists itinerary_program_idx on public.itinerary_days(program_id,position);

create or replace function public.is_modo_rumbo_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admin_users where user_id=check_user); $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path=public
as $$ begin new.updated_at=now(); return new; end; $$;

drop trigger if exists programs_touch_updated_at on public.programs;
create trigger programs_touch_updated_at before update on public.programs for each row execute function public.touch_updated_at();

alter table public.admin_users enable row level security;
alter table public.programs enable row level security;
alter table public.departures enable row level security;
alter table public.itinerary_days enable row level security;

create policy "Admins read their membership" on public.admin_users for select to authenticated using (user_id=auth.uid());
create policy "Public reads published programs" on public.programs for select using (status='published' or public.is_modo_rumbo_admin());
create policy "Admins insert programs" on public.programs for insert to authenticated with check (public.is_modo_rumbo_admin());
create policy "Admins update programs" on public.programs for update to authenticated using (public.is_modo_rumbo_admin()) with check (public.is_modo_rumbo_admin());
create policy "Admins delete programs" on public.programs for delete to authenticated using (public.is_modo_rumbo_admin());

create policy "Public reads departures of published programs" on public.departures for select using (exists(select 1 from public.programs p where p.id=program_id and (p.status='published' or public.is_modo_rumbo_admin())));
create policy "Admins manage departures" on public.departures for all to authenticated using (public.is_modo_rumbo_admin()) with check (public.is_modo_rumbo_admin());
create policy "Public reads itineraries of published programs" on public.itinerary_days for select using (exists(select 1 from public.programs p where p.id=program_id and (p.status='published' or public.is_modo_rumbo_admin())));
create policy "Admins manage itineraries" on public.itinerary_days for all to authenticated using (public.is_modo_rumbo_admin()) with check (public.is_modo_rumbo_admin());

insert into storage.buckets(id,name,public)
values('travel-programs','travel-programs',true)
on conflict(id) do update set public=excluded.public;

create policy "Public reads travel images" on storage.objects for select using (bucket_id='travel-programs');
create policy "Admins upload travel images" on storage.objects for insert to authenticated with check (bucket_id='travel-programs' and public.is_modo_rumbo_admin());
create policy "Admins update travel images" on storage.objects for update to authenticated using (bucket_id='travel-programs' and public.is_modo_rumbo_admin()) with check (bucket_id='travel-programs' and public.is_modo_rumbo_admin());
create policy "Admins delete travel images" on storage.objects for delete to authenticated using (bucket_id='travel-programs' and public.is_modo_rumbo_admin());

-- Después de crear el usuario administrador en Authentication > Users,
-- reemplazar el correo y ejecutar:
-- insert into public.admin_users(user_id)
-- select id from auth.users where email='TU-CORREO-DE-ADMINISTRADOR';
