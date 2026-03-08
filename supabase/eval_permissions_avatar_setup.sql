-- ============================================================
-- Evaluación 2º trimestre - permisos (RLS) + avatar en Storage
-- Proyecto: Plantas solares (Angular + Supabase)
-- ============================================================
--
-- Ejecutar en Supabase SQL Editor.
-- Este script asume que ya existen las tablas:
--   public.profiles, public.plants, public.records, public.favorites
--
-- Objetivos:
-- 1) Reforzar criterios de "Permisos" con RLS explícito
-- 2) Añadir soporte de avatar de perfil (columna opcional + bucket)
-- 3) Dejar políticas idempotentes para poder re-ejecutar
--
-- NOTA:
-- - El frontend guarda el avatar en user_metadata.auth (clave avatar_url)
-- - Esta columna en profiles es opcional y se usa como compatibilidad / auditoría

begin;

-- ------------------------------------------------------------
-- 0) Columna opcional en profiles para avatar (compatibilidad)
-- ------------------------------------------------------------
alter table if exists public.profiles
  add column if not exists avatar_url text;

-- ------------------------------------------------------------
-- 1) Helper para comprobar si el usuario autenticado es admin
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ------------------------------------------------------------
-- 2) Activar RLS
-- ------------------------------------------------------------
alter table if exists public.profiles enable row level security;
alter table if exists public.plants enable row level security;
alter table if exists public.records enable row level security;
alter table if exists public.favorites enable row level security;

-- ------------------------------------------------------------
-- 3) Policies RLS: profiles
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_select_own_or_admin'
  ) then
    execute $sql$
      create policy profiles_select_own_or_admin
      on public.profiles
      for select
      to authenticated
      using (id = auth.uid() or public.is_admin())
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_update_own_or_admin'
  ) then
    execute $sql$
      create policy profiles_update_own_or_admin
      on public.profiles
      for update
      to authenticated
      using (id = auth.uid() or public.is_admin())
      with check (id = auth.uid() or public.is_admin())
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_insert_self_or_admin'
  ) then
    execute $sql$
      create policy profiles_insert_self_or_admin
      on public.profiles
      for insert
      to authenticated
      with check (id = auth.uid() or public.is_admin())
    $sql$;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 4) Policies RLS: plants
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'plants'
      and policyname = 'plants_select_owner_or_admin'
  ) then
    execute $sql$
      create policy plants_select_owner_or_admin
      on public.plants
      for select
      to authenticated
      using (owner_id = auth.uid() or public.is_admin())
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'plants'
      and policyname = 'plants_insert_owner_or_admin'
  ) then
    execute $sql$
      create policy plants_insert_owner_or_admin
      on public.plants
      for insert
      to authenticated
      with check (owner_id = auth.uid() or public.is_admin())
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'plants'
      and policyname = 'plants_update_owner_or_admin'
  ) then
    execute $sql$
      create policy plants_update_owner_or_admin
      on public.plants
      for update
      to authenticated
      using (owner_id = auth.uid() or public.is_admin())
      with check (owner_id = auth.uid() or public.is_admin())
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'plants'
      and policyname = 'plants_delete_owner_or_admin'
  ) then
    execute $sql$
      create policy plants_delete_owner_or_admin
      on public.plants
      for delete
      to authenticated
      using (owner_id = auth.uid() or public.is_admin())
    $sql$;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 5) Policies RLS: records
--    - lectura: dueño de la planta o admin
--    - escritura: admin (y service_role para cron/realtime backend)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'records'
      and policyname = 'records_select_owner_or_admin'
  ) then
    execute $sql$
      create policy records_select_owner_or_admin
      on public.records
      for select
      to authenticated
      using (
        public.is_admin()
        or exists (
          select 1
          from public.plants p
          where p.id = records.plant_id
            and p.owner_id = auth.uid()
        )
      )
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'records'
      and policyname = 'records_insert_admin'
  ) then
    execute $sql$
      create policy records_insert_admin
      on public.records
      for insert
      to authenticated
      with check (public.is_admin())
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'records'
      and policyname = 'records_update_admin'
  ) then
    execute $sql$
      create policy records_update_admin
      on public.records
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'records'
      and policyname = 'records_delete_admin'
  ) then
    execute $sql$
      create policy records_delete_admin
      on public.records
      for delete
      to authenticated
      using (public.is_admin())
    $sql$;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 6) Policies RLS: favorites
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'favorites'
      and policyname = 'favorites_select_own_or_admin'
  ) then
    execute $sql$
      create policy favorites_select_own_or_admin
      on public.favorites
      for select
      to authenticated
      using (user_id = auth.uid() or public.is_admin())
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'favorites'
      and policyname = 'favorites_insert_own_or_admin'
  ) then
    execute $sql$
      create policy favorites_insert_own_or_admin
      on public.favorites
      for insert
      to authenticated
      with check (user_id = auth.uid() or public.is_admin())
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'favorites'
      and policyname = 'favorites_delete_own_or_admin'
  ) then
    execute $sql$
      create policy favorites_delete_own_or_admin
      on public.favorites
      for delete
      to authenticated
      using (user_id = auth.uid() or public.is_admin())
    $sql$;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 7) Bucket de avatares + políticas de storage
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update
set public = excluded.public;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'profile_avatars_public_read'
  ) then
    execute $sql$
      create policy profile_avatars_public_read
      on storage.objects
      for select
      to public
      using (bucket_id = 'profile-avatars')
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'profile_avatars_insert_own_folder'
  ) then
    execute $sql$
      create policy profile_avatars_insert_own_folder
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'profile-avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'profile_avatars_update_own_folder'
  ) then
    execute $sql$
      create policy profile_avatars_update_own_folder
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'profile-avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'profile-avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'profile_avatars_delete_own_folder'
  ) then
    execute $sql$
      create policy profile_avatars_delete_own_folder
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'profile-avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $sql$;
  end if;
end
$$;

commit;

-- Fin del setup.
