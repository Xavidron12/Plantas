-- ============================================================
-- Verificaciones para enviar al profesor / revisión rápida
-- ============================================================

-- 1) RLS activo en tablas del proyecto
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('profiles', 'plants', 'records', 'favorites')
order by c.relname;

-- 2) Policies creadas en tablas public
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'plants', 'records', 'favorites')
order by tablename, cmd, policyname;

-- 3) Bucket de avatar
select id, name, public
from storage.buckets
where id in ('profile-avatars', 'plant-photos')
order by id;

-- 4) Policies de storage para avatares
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'profile_avatars_%'
order by policyname;

-- 5) Comprobar columna avatar_url en profiles
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'avatar_url';
