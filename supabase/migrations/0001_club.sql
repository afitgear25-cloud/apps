-- Gestión del Club: tablas, permisos por rol (RLS), tiempo real y almacenamiento de fotos.

create schema if not exists privado;
grant usage on schema privado to authenticated;

-- Perfiles: un registro por persona que ingresa (usuario de Supabase Auth).
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  usuario text not null unique,
  rol text not null check (rol in ('coordinacion', 'administracion', 'entrenador')),
  equipos text[] not null default '{}',
  activo boolean not null default true,
  creado timestamptz not null default now()
);
alter table public.perfiles enable row level security;

create function privado.mi_rol() returns text
language sql stable security definer set search_path = ''
as $$ select rol from public.perfiles where id = auth.uid() and activo $$;

create function privado.mis_equipos() returns text[]
language sql stable security definer set search_path = ''
as $$ select coalesce((select equipos from public.perfiles where id = auth.uid() and activo), '{}'::text[]) $$;

revoke all on function privado.mi_rol() from public;
revoke all on function privado.mis_equipos() from public;
grant execute on function privado.mi_rol() to authenticated;
grant execute on function privado.mis_equipos() to authenticated;

create policy "perfil propio o coordinación" on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select privado.mi_rol()) = 'coordinacion');
-- Alta y cambios de perfiles: solo desde la función `usuarios` (clave de servicio).

-- Mantiene equipo_id sincronizado con el dato (no se puede falsear desde el cliente).
create function privado.sellar() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.equipo_id := new.data ->> 'equipoId';
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['config','divisiones','jugadores','asistencias','pagos','prendas','ropa','materiales','prestamos','canchas','asignaciones','eventos'] loop
    execute format('create table public.%I (
      id text primary key,
      data jsonb not null,
      equipo_id text,
      updated_at timestamptz not null default now(),
      updated_by uuid
    )', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create trigger sellar before insert or update on public.%I for each row execute function privado.sellar()', t);
    execute format('create index on public.%I (equipo_id)', t);
  end loop;
end $$;

-- Lectura y escritura por rol.
-- c = coordinación, a = administración, e = entrenador
do $$
declare
  r record;
begin
  for r in
    select * from (values
      -- tabla,         leen,                                         escriben
      ('divisiones',   array['coordinacion','administracion','entrenador'], array['coordinacion']),
      ('jugadores',    array['coordinacion','administracion','entrenador'], array['coordinacion']),
      ('pagos',        array['coordinacion','administracion'],              array['coordinacion','administracion']),
      ('prendas',      array['coordinacion','administracion'],              array['coordinacion','administracion']),
      ('ropa',         array['coordinacion','administracion'],              array['coordinacion','administracion']),
      ('materiales',   array['coordinacion','entrenador'],                  array['coordinacion']),
      ('canchas',      array['coordinacion','entrenador'],                  array['coordinacion']),
      ('eventos',      array['coordinacion','entrenador'],                  array['coordinacion'])
    ) as x(tabla, leen, escriben)
  loop
    execute format('create policy "leer" on public.%I for select to authenticated using ((select privado.mi_rol()) = any(%L::text[]))', r.tabla, r.leen);
    execute format('create policy "crear" on public.%I for insert to authenticated with check ((select privado.mi_rol()) = any(%L::text[]))', r.tabla, r.escriben);
    execute format('create policy "editar" on public.%I for update to authenticated using ((select privado.mi_rol()) = any(%L::text[])) with check ((select privado.mi_rol()) = any(%L::text[]))', r.tabla, r.escriben, r.escriben);
    execute format('create policy "borrar" on public.%I for delete to authenticated using ((select privado.mi_rol()) = any(%L::text[]))', r.tabla, r.escriben);
  end loop;
end $$;

-- Config: el nombre y el escudo se ven en la pantalla de ingreso (antes de entrar).
create policy "leer" on public.config for select to anon, authenticated using (true);
create policy "crear" on public.config for insert to authenticated with check ((select privado.mi_rol()) = 'coordinacion');
create policy "editar" on public.config for update to authenticated using ((select privado.mi_rol()) = 'coordinacion') with check ((select privado.mi_rol()) = 'coordinacion');

-- Tablas por equipo: el entrenador solo escribe en sus equipos.
-- Asistencia: además, el entrenador solo LEE la de sus equipos.
create policy "leer" on public.asistencias for select to authenticated
  using ((select privado.mi_rol()) = 'coordinacion' or ((select privado.mi_rol()) = 'entrenador' and equipo_id = any(privado.mis_equipos())));
-- Préstamos y canchas: el entrenador ve todos (para saber qué hay disponible y qué sector está libre).
create policy "leer" on public.prestamos for select to authenticated using ((select privado.mi_rol()) in ('coordinacion', 'entrenador'));
create policy "leer" on public.asignaciones for select to authenticated using ((select privado.mi_rol()) in ('coordinacion', 'entrenador'));

do $$
declare t text;
begin
  foreach t in array array['asistencias','prestamos','asignaciones'] loop
    execute format('create policy "crear" on public.%I for insert to authenticated with check ((select privado.mi_rol()) = ''coordinacion'' or ((select privado.mi_rol()) = ''entrenador'' and equipo_id = any(privado.mis_equipos())))', t);
    execute format('create policy "editar" on public.%I for update to authenticated using ((select privado.mi_rol()) = ''coordinacion'' or ((select privado.mi_rol()) = ''entrenador'' and equipo_id = any(privado.mis_equipos()))) with check ((select privado.mi_rol()) = ''coordinacion'' or ((select privado.mi_rol()) = ''entrenador'' and equipo_id = any(privado.mis_equipos())))', t);
    execute format('create policy "borrar" on public.%I for delete to authenticated using ((select privado.mi_rol()) = ''coordinacion'' or ((select privado.mi_rol()) = ''entrenador'' and equipo_id = any(privado.mis_equipos())))', t);
  end loop;
end $$;

-- Registro de cambios: todos anotan lo que hacen; solo coordinación lo lee.
create table public.registro (
  id bigint generated always as identity primary key,
  t timestamptz not null default now(),
  user_id uuid not null default auth.uid(),
  usuario text not null,
  accion text not null
);
alter table public.registro enable row level security;
create policy "anotar" on public.registro for insert to authenticated
  with check ((select privado.mi_rol()) is not null and user_id = (select auth.uid()));
create policy "leer" on public.registro for select to authenticated using ((select privado.mi_rol()) = 'coordinacion');
create index on public.registro (t desc);

-- Tiempo real.
alter publication supabase_realtime add table
  public.config, public.divisiones, public.jugadores, public.asistencias, public.pagos, public.prendas, public.ropa,
  public.materiales, public.prestamos, public.canchas, public.asignaciones, public.eventos, public.registro, public.perfiles;

-- Fotos: `fotos` es privado (jugadores, materiales, ropa); `publico` es solo para el escudo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fotos', 'fotos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('publico', 'publico', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

create policy "fotos: ver" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (select privado.mi_rol()) is not null);
create policy "fotos: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (select privado.mi_rol()) is not null);
create policy "fotos: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (select privado.mi_rol()) = 'coordinacion');
create policy "escudo: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'publico' and (select privado.mi_rol()) = 'coordinacion');
create policy "escudo: reemplazar" on storage.objects for update to authenticated
  using (bucket_id = 'publico' and (select privado.mi_rol()) = 'coordinacion');
