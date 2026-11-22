-- Separa lecturas públicas de lecturas administrativas en el catálogo.
-- Debe ejecutarse después de schema.sql. No modifica filas ni permisos de escritura.
begin;

do $$
declare
  admin_proc regprocedure;
  anon_role oid;
begin
  if to_regclass('public.programs') is null
    or to_regclass('public.departures') is null
    or to_regclass('public.itinerary_days') is null then
    raise exception 'Faltan programs, departures o itinerary_days.';
  end if;

  admin_proc := to_regprocedure('public.is_modo_rumbo_admin(uuid)');
  if admin_proc is null then
    raise exception 'Falta public.is_modo_rumbo_admin(uuid).';
  end if;
  if not has_function_privilege('authenticated', admin_proc, 'EXECUTE') then
    raise exception 'authenticated debe conservar EXECUTE sobre is_modo_rumbo_admin para la lectura administrativa.';
  end if;

  select oid into anon_role from pg_roles where rolname = 'anon';
  if anon_role is null then raise exception 'Falta el rol anon.'; end if;

  -- No borrar políticas adicionales desconocidas: fallar antes de cambiar
  -- nada si hay otra política permisiva que también conceda lectura pública.
  if exists (
    select 1
    from pg_policy p
    where p.polrelid in (
      'public.programs'::regclass,
      'public.departures'::regclass,
      'public.itinerary_days'::regclass
    )
      and p.polcmd in ('r', '*')
      and p.polpermissive
      and (0::oid = any(p.polroles) or anon_role = any(p.polroles))
      and p.polname not in (
        'Public reads published programs',
        'Public reads departures of published programs',
        'Public reads itineraries of published programs'
      )
  ) then
    raise exception 'Hay una política permisiva de lectura pública adicional; revisar antes de reemplazar las políticas.';
  end if;
end;
$$;

alter table public.programs enable row level security;
alter table public.departures enable row level security;
alter table public.itinerary_days enable row level security;

-- Elimina y vuelve a crear solo las tres políticas públicas conocidas y la
-- política explícita de lectura administrativa de programs. Repetible.
drop policy if exists "Public reads published programs" on public.programs;
drop policy if exists "Admins read all programs" on public.programs;
drop policy if exists "Public reads departures of published programs" on public.departures;
drop policy if exists "Public reads itineraries of published programs" on public.itinerary_days;

create policy "Public reads published programs"
  on public.programs for select to anon, authenticated
  using (status = 'published');

create policy "Admins read all programs"
  on public.programs for select to authenticated
  using (public.is_modo_rumbo_admin());

create policy "Public reads departures of published programs"
  on public.departures for select to anon, authenticated
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_id and p.status = 'published'
    )
  );

create policy "Public reads itineraries of published programs"
  on public.itinerary_days for select to anon, authenticated
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_id and p.status = 'published'
    )
  );

-- Admins manage departures/itineraries (FOR ALL) y las políticas de
-- INSERT/UPDATE/DELETE de programs se conservan sin cambios.

do $$
declare
  anon_role oid;
begin
  select oid into anon_role from pg_roles where rolname = 'anon';

  if exists (
    select 1
    from pg_policy p
    where p.polrelid in (
      'public.programs'::regclass,
      'public.departures'::regclass,
      'public.itinerary_days'::regclass
    )
      and p.polcmd in ('r', '*')
      and p.polpermissive
      and (0::oid = any(p.polroles) or anon_role = any(p.polroles))
      and p.polname in (
        'Public reads published programs',
        'Public reads departures of published programs',
        'Public reads itineraries of published programs'
      )
      and coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~* 'is_modo_rumbo_admin'
  ) then
    raise exception 'Una política pública de lectura todavía invoca is_modo_rumbo_admin().';
  end if;

  if not exists (
    select 1 from pg_policy p
    where p.polrelid = 'public.programs'::regclass
      and p.polname = 'Public reads published programs'
      and p.polcmd = 'r'
      and (0::oid = any(p.polroles) or anon_role = any(p.polroles))
      and coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~* 'published'
  ) or not exists (
    select 1 from pg_policy p
    where p.polrelid = 'public.departures'::regclass
      and p.polname = 'Public reads departures of published programs'
      and p.polcmd = 'r'
      and (0::oid = any(p.polroles) or anon_role = any(p.polroles))
      and coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~* 'published'
  ) or not exists (
    select 1 from pg_policy p
    where p.polrelid = 'public.itinerary_days'::regclass
      and p.polname = 'Public reads itineraries of published programs'
      and p.polcmd = 'r'
      and (0::oid = any(p.polroles) or anon_role = any(p.polroles))
      and coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~* 'published'
  ) then
    raise exception 'Falta una política de lectura pública limitada a registros publicados.';
  end if;

  if not exists (
    select 1 from pg_policy p
    where p.polrelid = 'public.programs'::regclass
      and p.polname = 'Admins read all programs'
      and p.polcmd = 'r'
      and 'authenticated'::regrole::oid = any(p.polroles)
      and coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~* 'is_modo_rumbo_admin'
  ) then
    raise exception 'No quedó configurada la lectura administrativa de programs.';
  end if;
end;
$$;

commit;
