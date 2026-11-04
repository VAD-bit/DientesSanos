-- Migracion idempotente para habilitar el CRM odontologico.
-- Ejecutar en Supabase SQL Editor sobre el esquema odontosonrisa.
-- Conserva los campos capilares existentes sin usarlos ni borrar sus datos.
-- Solo elimina productos de cafeteria del inventario y preserva su historial
-- de ventas/movimientos desvinculandolo antes de borrar los productos.

begin;

alter table odontosonrisa.clients
  add column if not exists smile_type text,
  add column if not exists gum_type text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'odontosonrisa.clients'::regclass
      and conname = 'clients_smile_type_check'
  ) then
    alter table odontosonrisa.clients
      add constraint clients_smile_type_check
      check (smile_type is null or smile_type = '' or smile_type in ('Alta', 'Media', 'Baja', 'Invertida'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'odontosonrisa.clients'::regclass
      and conname = 'clients_gum_type_check'
  ) then
    alter table odontosonrisa.clients
      add constraint clients_gum_type_check
      check (gum_type is null or gum_type = '' or gum_type in ('Sana', 'Inflamada', 'Sangrante', 'Retracción'));
  end if;
end $$;

create index if not exists clients_name_search_idx
  on odontosonrisa.clients (lower(name));
create index if not exists clients_phone_idx
  on odontosonrisa.clients (phone);
create index if not exists clients_id_card_idx
  on odontosonrisa.clients (id_card);

alter table odontosonrisa.services
  alter column category set default 'Prevención';

alter table odontosonrisa.inventory
  alter column inventory_type set default 'dental';

-- Detecta y elimina solo registros marcados o descritos como productos de cafe.
create temporary table cafe_inventory_to_remove on commit drop as
select id
from odontosonrisa.inventory
where lower(coalesce(inventory_type, '')) = 'cafe'
   or lower(coalesce(category, '')) ~ '(caf[eé]|bebid|alimento|snack|comida|insumos de caf)'
   or lower(coalesce(name, '')) ~
      '(caf[eé]|coffee|espresso|expreso|capuccino|cappuccino|latte|frapp|guayoyo|americano|refresco|gaseosa|jugo|agua mineral|agua saborizada|infusi[oó]n|malta|sandwich|s[aá]ndwich|croissant|galleta|snack|alimento)';

update odontosonrisa.appointment_products
set product_id = null
where product_id in (select id from cafe_inventory_to_remove);

update odontosonrisa.inventory_movements
set product_id = null
where product_id in (select id from cafe_inventory_to_remove);

delete from odontosonrisa.inventory
where id in (select id from cafe_inventory_to_remove);

-- Conserva los productos y herramientas existentes; solo los reclasifica
-- fuera del antiguo tipo de barberia para que el nuevo inventario los consulte.
update odontosonrisa.inventory
set category = 'Uso Clínico'
where lower(coalesce(category, '')) = 'uso interno'
  and lower(coalesce(inventory_type, '')) <> 'personal';

update odontosonrisa.inventory
set inventory_type = case
      when lower(coalesce(category, '')) in ('herramienta', 'accesorios', 'uso interno', 'uso clínico') then 'tools'
      else 'dental'
    end
where lower(coalesce(inventory_type, '')) not in ('cafe', 'tools', 'personal')
   or lower(coalesce(inventory_type, '')) = 'barbershop';

commit;
