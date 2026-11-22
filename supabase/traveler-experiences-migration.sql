-- Migración local de Experiencias de viajeros.
-- Ejecución única, después de revisar el preflight y los metadatos remotos.
begin;

do $$
declare
  admin_proc regprocedure;
  admin_definer boolean;
  admin_owner name;
  storage_rls boolean;
begin
  if current_user <> 'postgres' then raise exception 'Ejecutar esta migración como postgres desde Supabase SQL Editor.'; end if;
  admin_proc := to_regprocedure('public.is_modo_rumbo_admin(uuid)');
  if admin_proc is null then raise exception 'Falta public.is_modo_rumbo_admin(uuid).'; end if;
  select p.prosecdef, pg_get_userbyid(p.proowner) into admin_definer, admin_owner from pg_proc p where p.oid=admin_proc;
  if admin_definer is distinct from true then raise exception 'La función admin no es SECURITY DEFINER.'; end if;
  if admin_owner is distinct from 'postgres' then raise exception 'La función admin no pertenece a postgres.'; end if;
  if not has_function_privilege('authenticated',admin_proc,'EXECUTE') then raise exception 'authenticated no puede ejecutar el control admin.'; end if;
  if has_function_privilege('anon',admin_proc,'EXECUTE') then raise exception 'anon puede invocar is_modo_rumbo_admin(uuid); corregir y revisar este permiso existente antes de aplicar la migración.'; end if;
  if not has_function_privilege('service_role',admin_proc,'EXECUTE') then raise exception 'service_role no puede ejecutar el control admin.'; end if;
  select c.relrowsecurity into storage_rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='storage' and c.relname='objects';
  if storage_rls is distinct from true then raise exception 'storage.objects no tiene RLS habilitado.'; end if;
  if to_regclass('public.programs') is null then raise exception 'Falta public.programs.'; end if;
  if to_regclass('public.traveler_experience_invites') is not null
    or to_regclass('public.traveler_experience_invite_secrets') is not null
    or to_regclass('public.traveler_experiences') is not null then
    raise exception 'Ya existen objetos de Experiencias; revisar el estado antes de continuar o reintentar.';
  end if;
end;
$$;

-- Bucket privado, solo para WebP ya recodificados. No se suben originales ni videos.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('traveler-experience-photos','traveler-experience-photos',false,512000,array['image/webp']::text[])
on conflict(id) do nothing;
do $$ begin
  if not exists(select 1 from storage.buckets where id='traveler-experience-photos' and name='traveler-experience-photos' and public=false and file_size_limit=512000 and allowed_mime_types=array['image/webp']::text[]) then
    raise exception 'El bucket traveler-experience-photos ya existe con configuración distinta.';
  end if;
end; $$;

create table public.traveler_experience_invites(
  id uuid primary key default gen_random_uuid(),
  program_id uuid null references public.programs(id) on delete set null,
  program_title_snapshot text null,
  destination text not null check(char_length(trim(destination)) between 2 and 160),
  passenger_name text null check(passenger_name is null or char_length(trim(passenger_name))<=120),
  created_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check(status in('pending','used','revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default(now()+interval '30 days'),
  used_at timestamptz null,
  revoked_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint traveler_invite_expiry_check check(expires_at>created_at),
  constraint traveler_invite_used_check check((status='used')=(used_at is not null)),
  constraint traveler_invite_revoked_check check((status='revoked')=(revoked_at is not null))
);

-- Hash separado y no seleccionable por anon/authenticated.
create table public.traveler_experience_invite_secrets(
  invitation_id uuid primary key references public.traveler_experience_invites(id) on delete cascade,
  token_hash bytea not null unique check(octet_length(token_hash)=32),
  created_at timestamptz not null default now()
);

create table public.traveler_experiences(
  id uuid primary key default gen_random_uuid(),
  public_photo_key uuid not null unique default gen_random_uuid(),
  invitation_id uuid not null unique references public.traveler_experience_invites(id) on delete restrict,
  passenger_name text not null check(char_length(trim(passenger_name)) between 2 and 120),
  destination text not null check(char_length(trim(destination)) between 2 and 160),
  travel_month smallint not null check(travel_month between 1 and 12),
  travel_year integer not null check(travel_year between 1900 and 2200),
  rating smallint not null check(rating between 1 and 5),
  comment text not null check(char_length(trim(comment)) between 10 and 4000),
  photo_object_path text null,
  publication_consent boolean not null default false,
  consent_at timestamptz null,
  consent_version text null,
  status text not null default 'pending' check(status in('pending','approved','rejected','hidden')),
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint traveler_experience_consent_check check(
    (publication_consent and consent_at is not null and consent_version is not null)
    or (not publication_consent and consent_at is null and consent_version is null)
  ),
  constraint traveler_experience_approval_check check(
    status<>'approved' or (publication_consent and consent_at is not null and reviewed_at is not null and published_at is not null)
  ),
  constraint traveler_experience_review_check check(status='pending' or reviewed_at is not null),
  constraint traveler_experience_publication_check check(status not in('approved','hidden') or published_at is not null),
  constraint traveler_experience_photo_path_check check(
    photo_object_path is null or photo_object_path ~ '^traveler-experiences/[0-9a-f-]{36}[.]webp$'
  )
);

create index traveler_invites_admin_idx on public.traveler_experience_invites(created_at desc,status,expires_at);
create index traveler_invites_program_idx on public.traveler_experience_invites(program_id) where program_id is not null;
create index traveler_experiences_moderation_idx on public.traveler_experiences(status,created_at desc);
create index traveler_experiences_public_idx on public.traveler_experiences(published_at desc) where status='approved' and publication_consent=true;

create function public.set_traveler_experience_updated_at()
returns trigger language plpgsql set search_path=pg_catalog,public,pg_temp
as $$ begin new.updated_at=now(); return new; end; $$;
create trigger traveler_invites_updated_at before update on public.traveler_experience_invites for each row execute function public.set_traveler_experience_updated_at();
create trigger traveler_experiences_updated_at before update on public.traveler_experiences for each row execute function public.set_traveler_experience_updated_at();

alter table public.traveler_experience_invites enable row level security;
alter table public.traveler_experience_invite_secrets enable row level security;
alter table public.traveler_experiences enable row level security;
revoke all on table public.traveler_experience_invites from public,anon,authenticated;
revoke all on table public.traveler_experience_invite_secrets from public,anon,authenticated;
revoke all on table public.traveler_experiences from public,anon,authenticated;
grant select on table public.traveler_experience_invites to authenticated;
grant select on table public.traveler_experiences to authenticated;
grant all on table public.traveler_experience_invites to service_role;
grant all on table public.traveler_experience_invite_secrets to service_role;
grant all on table public.traveler_experiences to service_role;

create policy traveler_invites_admin_read on public.traveler_experience_invites for select to authenticated using(public.is_modo_rumbo_admin());
create policy traveler_experiences_admin_read on public.traveler_experiences for select to authenticated using(public.is_modo_rumbo_admin());

-- Expiración derivada al consultar; no necesita cron ni actualizaciones de filas.
create view public.admin_traveler_experience_invites with(security_invoker=true) as
select i.id,i.program_id,i.program_title_snapshot,i.destination,i.passenger_name,i.created_by,
  case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end as display_status,
  i.created_at,i.expires_at,i.used_at,i.revoked_at
from public.traveler_experience_invites i;
revoke all on public.admin_traveler_experience_invites from public,anon,authenticated;
grant select on public.admin_traveler_experience_invites to authenticated;

-- Vista propietaria con SECURITY BARRIER. Solo columnas no privadas y filas
-- aprobadas + consentidas; no se concede SELECT sobre la tabla a anon.
create view public.public_traveler_experiences with(security_barrier=true) as
select e.public_photo_key,e.passenger_name,e.destination,e.travel_month,e.travel_year,e.rating,e.comment,
  (e.photo_object_path is not null) as has_photo,e.published_at
from public.traveler_experiences e
where e.status='approved' and e.publication_consent=true;
alter view public.public_traveler_experiences owner to postgres;
revoke all on public.public_traveler_experiences from public,anon,authenticated;
grant select on public.public_traveler_experiences to anon,authenticated;

-- Restrictive guards: bloquean este bucket incluso ante políticas permisivas amplias,
-- sin restringir otros bucket_id. service_role opera desde servidor y bypass RLS.
create policy traveler_photos_deny_select on storage.objects as restrictive for select to anon,authenticated using(bucket_id<>'traveler-experience-photos');
create policy traveler_photos_deny_insert on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'traveler-experience-photos');
create policy traveler_photos_deny_update on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'traveler-experience-photos') with check(bucket_id<>'traveler-experience-photos');
create policy traveler_photos_deny_delete on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'traveler-experience-photos');

create function public.create_traveler_experience_invite(
  p_admin_user_id uuid,p_token_hash bytea,p_program_id uuid,p_destination text,
  p_program_title text,p_passenger_name text,p_valid_days integer default 30
) returns table(invite_id uuid,expires_at timestamptz)
language plpgsql security definer set search_path=pg_catalog,public,pg_temp
as $$
declare v_id uuid; v_exp timestamptz;
begin
  if not public.is_modo_rumbo_admin(p_admin_user_id) then raise exception 'not authorized' using errcode='42501'; end if;
  if p_token_hash is null or octet_length(p_token_hash)<>32 or p_valid_days<1 or p_valid_days>30
    or p_destination is null or char_length(trim(p_destination)) not between 2 and 160
    or (p_passenger_name is not null and char_length(trim(p_passenger_name))>120) then
    raise exception 'invalid invitation' using errcode='22023';
  end if;
  v_exp:=clock_timestamp()+make_interval(days=>p_valid_days);
  insert into public.traveler_experience_invites(program_id,program_title_snapshot,destination,passenger_name,created_by,expires_at)
  values(p_program_id,nullif(trim(p_program_title),''),trim(p_destination),nullif(trim(p_passenger_name),''),p_admin_user_id,v_exp)
  returning id into v_id;
  insert into public.traveler_experience_invite_secrets(invitation_id,token_hash) values(v_id,p_token_hash);
  return query select v_id,v_exp;
end; $$;

create function public.lookup_traveler_experience_invite(p_token_hash bytea)
returns table(invitation_id uuid,destination text,program_title_snapshot text,passenger_name text,expires_at timestamptz)
language sql stable security definer set search_path=pg_catalog,public,pg_temp
as $$ select i.id,i.destination,i.program_title_snapshot,i.passenger_name,i.expires_at
from public.traveler_experience_invites i join public.traveler_experience_invite_secrets s on s.invitation_id=i.id
where s.token_hash=p_token_hash and i.status='pending' and i.expires_at>statement_timestamp() $$;

create function public.consume_traveler_experience_invite(
  p_token_hash bytea,p_passenger_name text,p_travel_month smallint,p_travel_year integer,
  p_rating smallint,p_comment text,p_publication_consent boolean,p_photo_object_path text default null
) returns uuid language plpgsql security definer set search_path=pg_catalog,public,pg_temp
as $$
declare v_invite public.traveler_experience_invites%rowtype; v_id uuid;
begin
  if p_token_hash is null or octet_length(p_token_hash)<>32 then raise exception 'invitation unavailable' using errcode='22023'; end if;
  select i.* into v_invite from public.traveler_experience_invites i
  join public.traveler_experience_invite_secrets s on s.invitation_id=i.id
  where s.token_hash=p_token_hash and i.status='pending' and i.expires_at>clock_timestamp()
  for update of i,s;
  if not found then raise exception 'invitation unavailable' using errcode='P0001'; end if;
  if p_publication_consent is distinct from true
    or (p_photo_object_path is not null and p_photo_object_path !~ '^traveler-experiences/[0-9a-f-]{36}[.]webp$') then
    raise exception 'invalid submission' using errcode='22023';
  end if;
  insert into public.traveler_experiences(invitation_id,passenger_name,destination,travel_month,travel_year,rating,comment,photo_object_path,publication_consent,consent_at,consent_version)
  values(v_invite.id,coalesce(nullif(trim(p_passenger_name),''),v_invite.passenger_name),v_invite.destination,p_travel_month,p_travel_year,p_rating,trim(p_comment),p_photo_object_path,true,clock_timestamp(),'v1')
  returning id into v_id;
  update public.traveler_experience_invites set status='used',used_at=clock_timestamp() where id=v_invite.id;
  delete from public.traveler_experience_invite_secrets where invitation_id=v_invite.id;
  return v_id;
end; $$;

create function public.revoke_traveler_experience_invite(p_admin_user_id uuid,p_invitation_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,pg_temp
as $$ declare v_count integer; begin
  if not public.is_modo_rumbo_admin(p_admin_user_id) then raise exception 'not authorized' using errcode='42501'; end if;
  update public.traveler_experience_invites set status='revoked',revoked_at=clock_timestamp() where id=p_invitation_id and status='pending';
  get diagnostics v_count=row_count;
  if v_count=0 then return false; end if;
  delete from public.traveler_experience_invite_secrets where invitation_id=p_invitation_id;
  return true;
end; $$;

create function public.moderate_traveler_experience(p_admin_user_id uuid,p_experience_id uuid,p_action text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,pg_temp
as $$ declare v_count integer; begin
  if not public.is_modo_rumbo_admin(p_admin_user_id) then raise exception 'not authorized' using errcode='42501'; end if;
  if p_action='approve' then
    update public.traveler_experiences set status='approved',reviewed_by=p_admin_user_id,reviewed_at=clock_timestamp(),published_at=clock_timestamp()
    where id=p_experience_id and status='pending' and publication_consent=true;
  elsif p_action='reject' then
    update public.traveler_experiences set status='rejected',reviewed_by=p_admin_user_id,reviewed_at=clock_timestamp()
    where id=p_experience_id and status='pending';
  elsif p_action='hide' then
    update public.traveler_experiences set status='hidden',reviewed_by=p_admin_user_id,reviewed_at=clock_timestamp()
    where id=p_experience_id and status='approved';
  else raise exception 'invalid action' using errcode='22023';
  end if;
  get diagnostics v_count=row_count;
  return v_count=1;
end; $$;

-- Consulta interna para que el endpoint no borre un objeto si un RPC de consumo
-- confirmó la transacción pero su respuesta se perdió en la red.
create function public.traveler_experience_photo_is_referenced(p_photo_object_path text)
returns boolean language sql stable security definer set search_path=pg_catalog,public,pg_temp
as $$
  select exists(
    select 1 from public.traveler_experiences
    where photo_object_path=p_photo_object_path
  );
$$;

-- Los RPC administrativos reciben el UUID que la API obtiene de Supabase Auth;
-- la API nunca acepta identidad administrativa desde el cuerpo del navegador.
-- Revocar también la función de trigger: no es SECURITY DEFINER y solo la usa
-- el servidor/propietario al actualizar las tablas nuevas.
revoke all on function public.set_traveler_experience_updated_at() from public,anon,authenticated;
revoke all on function public.create_traveler_experience_invite(uuid,bytea,uuid,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.lookup_traveler_experience_invite(bytea) from public,anon,authenticated;
revoke all on function public.consume_traveler_experience_invite(bytea,text,smallint,integer,smallint,text,boolean,text) from public,anon,authenticated;
revoke all on function public.revoke_traveler_experience_invite(uuid,uuid) from public,anon,authenticated;
revoke all on function public.moderate_traveler_experience(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.traveler_experience_photo_is_referenced(text) from public,anon,authenticated;
grant execute on function public.set_traveler_experience_updated_at() to service_role;
grant execute on function public.create_traveler_experience_invite(uuid,bytea,uuid,text,text,text,integer) to service_role;
grant execute on function public.lookup_traveler_experience_invite(bytea) to service_role;
grant execute on function public.consume_traveler_experience_invite(bytea,text,smallint,integer,smallint,text,boolean,text) to service_role;
grant execute on function public.revoke_traveler_experience_invite(uuid,uuid) to service_role;
grant execute on function public.moderate_traveler_experience(uuid,uuid,text) to service_role;
grant execute on function public.traveler_experience_photo_is_referenced(text) to service_role;

commit;
