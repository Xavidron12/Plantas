-- Mantener máximo 20 registros por planta.
-- Cuando entra el registro 21, se elimina el más antiguo de esa planta.
-- Ejecutar en Supabase SQL Editor.

begin;

create index if not exists idx_records_plant_created_at
  on public.records (plant_id, created_at desc, id desc);

-- Limpieza inicial: deja solo los 20 más recientes por planta.
with ranked as (
  select
    id,
    row_number() over (
      partition by plant_id
      order by created_at desc, id desc
    ) as rn
  from public.records
)
delete from public.records r
using ranked x
where r.id = x.id
  and x.rn > 20;

create or replace function public.enforce_records_retention_20()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.records r
  where r.id in (
    select id
    from public.records
    where plant_id = new.plant_id
    order by created_at desc, id desc
    offset 20
  );

  return new;
end;
$$;

drop trigger if exists trg_records_retention_20 on public.records;

create trigger trg_records_retention_20
after insert on public.records
for each row
execute function public.enforce_records_retention_20();

commit;

-- Verificación:
-- select plant_id, count(*) as total
-- from public.records
-- group by plant_id
-- order by total desc;
