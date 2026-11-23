-- Agrega un segundo sillón de atención y protege la capacidad de reservas.
-- Ejecutar en Supabase SQL Editor sobre el esquema odontosonrisa.
create or replace function odontosonrisa.check_appointment_conflict()
returns trigger
language plpgsql
set search_path = odontosonrisa, public
as $$
declare
  v_dur      int;
  v_new_end  timestamptz;
  v_overlap  int;
begin
  if tg_op = 'UPDATE'
     and new.scheduled_at is not distinct from old.scheduled_at
     and new.staff_id    is not distinct from old.staff_id then
    return new;
  end if;

  if new.scheduled_at is null then
    return new;
  end if;
  if new.status in ('Cancelada', 'Cancelado') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('odontosonrisa.appointment_chair_capacity'));

  select coalesce(s.duration, 30) into v_dur
  from services s where s.id = new.service_id;
  if v_dur is null then v_dur := 30; end if;

  v_new_end := new.scheduled_at + make_interval(mins => v_dur);

  select count(*) into v_overlap
  from appointments a
  left join services s on s.id = a.service_id
  where a.staff_id = new.staff_id
    and a.id is distinct from new.id
    and a.scheduled_at is not null
    and a.status in ('Agendado', 'Confirmado', 'En Espera', 'En espera', 'En Silla', 'En Lavado', 'Por Pagar')
    and a.scheduled_at < v_new_end
    and (a.scheduled_at + make_interval(mins => coalesce(s.duration, 30))) > new.scheduled_at;

  if v_overlap > 0 then
    raise exception 'APPOINTMENT_TIME_CONFLICT: ya hay una cita en ese horario para este odontólogo';
  end if;

  select count(*) into v_overlap
  from appointments a
  left join services s on s.id = a.service_id
  where a.id is distinct from new.id
    and a.scheduled_at is not null
    and a.status in ('Agendado', 'Confirmado', 'En Espera', 'En espera', 'En Silla', 'En Lavado', 'Por Pagar')
    and a.scheduled_at < v_new_end
    and (a.scheduled_at + make_interval(mins => coalesce(s.duration, 30))) > new.scheduled_at;

  if v_overlap >= 2 then
    raise exception 'APPOINTMENT_CAPACITY_CONFLICT: no hay sillones libres en ese horario';
  end if;

  return new;
end;
$$;
