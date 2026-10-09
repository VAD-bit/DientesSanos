-- Borrado atómico de una transacción (schema odontosonrisa).
-- En UNA sola transacción de Postgres: restaura el stock de inventario de los
-- productos vendidos (+ movimiento de reverso), borra las citas asociadas en orden
-- FK, y borra la transacción. Si algo falla, revierte todo.
-- Desplegado en el VPS con: docker exec -i supabase-db psql -U supabase_admin -d postgres
-- Llamado desde dataService.deleteTransaction vía supabase.rpc('delete_transaction_cascade').

create or replace function odontosonrisa.delete_transaction_cascade(
  p_transaction_id uuid,
  p_appointment_ids uuid[] default '{}',
  p_products jsonb default '[]'
) returns void
language plpgsql security definer
set search_path = odontosonrisa, public
as $$
declare
  item jsonb;
  pid uuid;
  qty numeric;
begin
  -- 1) Restaurar stock + registrar movimiento de reverso (solo productos de inventario)
  if p_products is not null then
    for item in select * from jsonb_array_elements(p_products) loop
      begin
        pid := nullif(item->>'id','')::uuid;
      exception when others then
        pid := null;
      end;
      qty := coalesce((item->>'quantity')::numeric, 0);
      if pid is not null and qty <> 0 then
        update odontosonrisa.inventory set stock = coalesce(stock,0) + qty where id = pid;
        if found then
          insert into odontosonrisa.inventory_movements (product_id, type, amount, reason)
            values (pid, 'entry', qty, 'Reverso por eliminación de venta');
        end if;
      end if;
    end loop;
  end if;

  -- 2) Borrar citas asociadas (hijos primero por FK)
  if p_appointment_ids is not null and array_length(p_appointment_ids,1) > 0 then
    delete from odontosonrisa.appointment_staff   where appointment_id = any(p_appointment_ids);
    delete from odontosonrisa.appointment_products where appointment_id = any(p_appointment_ids);
    delete from odontosonrisa.appointment_extras   where appointment_id = any(p_appointment_ids);
    delete from odontosonrisa.appointments         where id = any(p_appointment_ids);
  end if;

  -- 3) Borrar la transacción
  delete from odontosonrisa.transactions where id = p_transaction_id;
end;
$$;

grant execute on function odontosonrisa.delete_transaction_cascade(uuid, uuid[], jsonb) to anon, authenticated, service_role;
