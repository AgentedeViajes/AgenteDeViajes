-- Migración aditiva para eliminaciones administrativas de Experiencias.
-- No elimina ni modifica tablas, políticas, buckets o datos existentes.
begin;

do $$
begin
  if to_regclass('public.traveler_experiences') is null
    or to_regclass('public.traveler_experience_invites') is null then
    raise exception 'Faltan las tablas de Experiencias de viajeros.';
  end if;
  if to_regprocedure('public.is_modo_rumbo_admin(uuid)') is null then
    raise exception 'Falta public.is_modo_rumbo_admin(uuid).';
  end if;
  if to_regprocedure('public.traveler_experience_photo_is_referenced(text)') is null then
    raise exception 'Falta public.traveler_experience_photo_is_referenced(text).';
  end if;
  if to_regclass('public.traveler_experience_photo_cleanups') is not null then
    raise exception 'Ya existe traveler_experience_photo_cleanups; revisar antes de ejecutar.';
  end if;
end;
$$;

-- Cola privada y durable: si Storage no está disponible al borrar la reseña,
-- el endpoint conserva la tarea y vuelve a intentarlo en la próxima actualización.
create table public.traveler_experience_photo_cleanups (
  id uuid primary key default gen_random_uuid(),
  photo_object_path text not null unique
    check(photo_object_path ~ '^traveler-experiences/[0-9a-f-]{36}[.]webp$'),
  invitation_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.traveler_experience_photo_cleanups enable row level security;
revoke all on table public.traveler_experience_photo_cleanups from public,anon,authenticated;
grant all on table public.traveler_experience_photo_cleanups to service_role;

-- Bloquea experiencias vinculadas mientras elimina la reseña y registra su
-- imagen en una sola transacción. La FK invitation_id de la reseña existente
-- es ON DELETE RESTRICT; esta función no borra invitaciones.
create function public.delete_traveler_experience(
  p_admin_user_id uuid,
  p_experience_id uuid
) returns table(experience_id uuid,photo_cleanup_id uuid,photo_object_path text,invitation_id uuid)
language plpgsql security definer set search_path=pg_catalog,public,pg_temp
as $$
declare
  v_invitation_id uuid;
  v_photo_path text;
  v_cleanup_id uuid;
begin
  if not public.is_modo_rumbo_admin(p_admin_user_id) then
    raise exception 'not authorized' using errcode='42501';
  end if;

  select e.invitation_id,e.photo_object_path
    into v_invitation_id,v_photo_path
    from public.traveler_experiences e
    where e.id=p_experience_id
    for update;
  if not found then return; end if;

  if v_photo_path is not null and not exists (
    select 1 from public.traveler_experiences other
    where other.photo_object_path=v_photo_path and other.id<>p_experience_id
  ) then
    insert into public.traveler_experience_photo_cleanups(photo_object_path,invitation_id)
    values(v_photo_path,v_invitation_id)
    on conflict(photo_object_path) do update set invitation_id=excluded.invitation_id
    returning id into v_cleanup_id;
  end if;

  delete from public.traveler_experiences where id=p_experience_id;
  return query select p_experience_id,v_cleanup_id,v_photo_path,v_invitation_id;
end;
$$;
alter function public.delete_traveler_experience(uuid,uuid) owner to postgres;
revoke all on function public.delete_traveler_experience(uuid,uuid) from public,anon,authenticated;
grant execute on function public.delete_traveler_experience(uuid,uuid) to service_role;

commit;
