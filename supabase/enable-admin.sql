-- Ejecutar después de crear y confirmar este usuario en Authentication > Users.
insert into public.admin_users(user_id)
select id
from auth.users
where lower(email)=lower('javier@tresortravel.com.ar')
on conflict(user_id) do nothing;

-- Verificación: debe devolver una fila con el correo administrador.
select u.id,u.email,a.created_at
from public.admin_users a
join auth.users u on u.id=a.user_id
where lower(u.email)=lower('javier@tresortravel.com.ar');
