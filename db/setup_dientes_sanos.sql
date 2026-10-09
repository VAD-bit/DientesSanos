-- ============================================================================
-- CENTRO ODONTOLÓGICO DIENTES SANOS — Setup completo de base de datos
-- Proyecto Supabase: mtifhqmovcaoslxchvym (esquema: odontosonrisa)
--
-- CÓMO USARLO:
--   1. Copiar TODO este archivo.
--   2. dashboard.supabase.com → New query → pegar → Run.
--   3. Es IDEMPOTENTE: se puede re-ejecutar sin error.
--   4. Exponer el esquema en la API: Project Settings → API →
--      Exposed schemas → añadir `odontosonrisa`. Sin eso PostgREST responde
--      "Could not find the table 'odontosonrisa.staff' in the schema cache".
--      (El script lo intenta también con el bloque DO de abajo.)
--   5. Después de correrlo, avisar al agente para que cree el usuario admin
--      (auth.users) y la fila staff vinculada vía Admin API.
--
-- NOTAS DE DISEÑO:
--   * Todo vive en el esquema `odontosonrisa`, igual que lo consultan el CRM,
--     el portal y los endpoints serverless: src/lib/supabase.js y
--     server/passkeys/supabaseAdmin.js crean sus clientes con
--     db: { schema: 'odontosonrisa' }.
--   * RLS habilitado en TODAS las tablas. Patrón:
--       - anon      → solo lectura/escritura pública mínima del portal.
--       - authenticated + odontosonrisa.is_staff() → CRM completo (personal activo).
--       - service_role → bypass (serverless, edge functions, bot).
--   * Usuarios de auth NO se crean aquí (se crean con la Admin API después).
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ── Esquema propio del proyecto ─────────────────────────────────────────────
create schema if not exists odontosonrisa;

-- ── Grants base (los objetos nuevos los crea el rol `postgres`) ──────────────
grant usage on schema odontosonrisa to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema odontosonrisa to anon, authenticated, service_role;
grant usage, select on all sequences in schema odontosonrisa to anon, authenticated, service_role;
alter default privileges in schema odontosonrisa grant all on tables to anon, authenticated, service_role;
alter default privileges in schema odontosonrisa grant usage, select on sequences to anon, authenticated, service_role;

-- ── Exponer el esquema a PostgREST ──────────────────────────────────────────
-- Si este bloque falla, exponerlo a mano en Dashboard → Project Settings → API
-- → Exposed schemas → añadir `odontosonrisa`.
do $$
begin
  execute 'alter role authenticator set pgrst.db_schemas = ''public,graphql_public,odontosonrisa''';
  execute 'notify pgrst, ''reload config''';
exception when others then
  raise notice 'AVISO: no se pudo exponer el esquema desde SQL (%). Añadirlo en Dashboard → API → Exposed schemas.', sqlerrm;
end $$;

-- ============================================================================
-- 1. TABLAS
-- ============================================================================

create table if not exists odontosonrisa.clients (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  phone            text,
  email            text,
  id_card          text,
  cedula           text,
  birth_date       date,
  hair_type        text,
  scalp_type       text,
  last_product_used text,
  total_visits     int default 0,
  origin           text,
  status           text default 'Activo',
  points           int default 0,
  last_visit       timestamptz,
  work_gallery     jsonb default '[]'::jsonb,
  notes            text,
  active           boolean default true,
  auth_user_id     uuid references auth.users(id) on delete set null,
  created_at       timestamptz default now()
);
create index if not exists clients_auth_user_idx on odontosonrisa.clients (auth_user_id);
create index if not exists clients_email_idx on odontosonrisa.clients (lower(trim(email)));
create index if not exists clients_phone_idx on odontosonrisa.clients (phone);
create index if not exists clients_id_card_idx on odontosonrisa.clients (id_card);

create table if not exists odontosonrisa.staff (
  id                uuid primary key default gen_random_uuid(),
  auth_user_id      uuid references auth.users(id) on delete set null,
  email             text,
  name              text not null,
  role              text not null default 'Barbero',
  commission_pct    numeric default 0,
  active            boolean default true,
  created_at        timestamptz default now(),
  image_url         text,
  phone             text,
  address           text,
  username          text,
  tools             jsonb default '[]'::jsonb,
  washing_rate      numeric default 0,
  birth_date        date,
  skipped_count     int default 0,
  specialty         text,
  badge             text,
  biography         text,
  payroll_frequency text default 'weekly',
  monthly_salary    numeric,
  show_on_landing   boolean default true,
  video_url         text
);
create unique index if not exists staff_email_key on odontosonrisa.staff (email) where email is not null and email <> '';
create index if not exists staff_auth_user_idx on odontosonrisa.staff (auth_user_id);

create table if not exists odontosonrisa.services (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  price           numeric not null default 0,
  duration        int not null default 30,
  active          boolean default true,
  category        text default 'Barbería',
  included_items  jsonb default '[]'::jsonb,
  strategy_type   text,
  insumo_cost     numeric,
  variable_cost   numeric default 0.50,
  description     text,
  is_tattoo       boolean default false,
  created_at      timestamptz default now()
);
create index if not exists services_active_idx on odontosonrisa.services (active);

create table if not exists odontosonrisa.service_extras (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       numeric default 0,
  cost        numeric default 0,
  created_at  timestamptz default now()
);
create index if not exists service_extras_name_idx on odontosonrisa.service_extras (name);

create table if not exists odontosonrisa.service_checklist_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  base_cost   numeric default 0,
  created_at  timestamptz default now()
);

create table if not exists odontosonrisa.inventory (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  price           numeric default 0,
  cost_price      numeric default 0,
  purchase_price  numeric,
  sale_price      numeric,
  stock           numeric default 0,
  min_stock       numeric,
  commission_pct  numeric,
  category        text,
  code            text,
  unit            text,
  is_for_sale     boolean default true,
  item_type       text,
  image_url       text,
  inventory_type  text not null default 'barbershop',
  owner_staff_id  uuid references odontosonrisa.staff(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists inventory_type_idx on odontosonrisa.inventory (inventory_type);
create index if not exists inventory_owner_idx on odontosonrisa.inventory (owner_staff_id);

create table if not exists odontosonrisa.inventory_movements (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references odontosonrisa.inventory(id) on delete cascade,
  type        text not null check (type in ('entry','exit')),
  amount      numeric not null,
  reason      text,
  created_at  timestamptz default now()
);
create index if not exists inventory_movements_product_idx on odontosonrisa.inventory_movements (product_id, created_at desc);
create index if not exists inventory_movements_created_idx on odontosonrisa.inventory_movements (created_at desc);

create table if not exists odontosonrisa.appointments (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid references odontosonrisa.clients(id) on delete cascade,
  staff_id           uuid references odontosonrisa.staff(id) on delete cascade,
  service_id         uuid references odontosonrisa.services(id) on delete set null,
  status             text not null default 'Agendado'
                     check (status in ('Agendado','Confirmado','En Espera','En espera','En Silla','En Lavado',
                                       'Por Pagar','Completado','Cancelada','Cancelado','No Asistió','No asistió',
                                       'Pagado','COMPLETED')),
  total_price        numeric default 0,
  scheduled_at       timestamptz,
  created_at         timestamptz default now(),
  started_at         timestamptz,
  completed_at       timestamptz,
  beverage_selection text,
  notes              text,
  tattoo_data        jsonb
);
create index if not exists appointments_staff_sched_idx on odontosonrisa.appointments (staff_id, scheduled_at);
create index if not exists appointments_client_idx on odontosonrisa.appointments (client_id, created_at desc);
create index if not exists appointments_status_idx on odontosonrisa.appointments (status);
create index if not exists appointments_created_idx on odontosonrisa.appointments (created_at desc);

create table if not exists odontosonrisa.appointment_staff (
  id                  uuid primary key default gen_random_uuid(),
  appointment_id      uuid not null references odontosonrisa.appointments(id) on delete cascade,
  staff_id            uuid references odontosonrisa.staff(id) on delete cascade,
  commission_earned   numeric default 0,
  product_commission  numeric default 0,
  tip_amount          numeric default 0,
  created_at          timestamptz default now()
);
create index if not exists appointment_staff_appt_idx on odontosonrisa.appointment_staff (appointment_id);
create index if not exists appointment_staff_staff_idx on odontosonrisa.appointment_staff (staff_id);

create table if not exists odontosonrisa.appointment_extras (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references odontosonrisa.appointments(id) on delete cascade,
  extra_id        uuid references odontosonrisa.service_extras(id) on delete cascade,
  price           numeric default 0,
  created_at      timestamptz default now()
);
create index if not exists appointment_extras_appt_idx on odontosonrisa.appointment_extras (appointment_id);

create table if not exists odontosonrisa.appointment_products (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references odontosonrisa.appointments(id) on delete cascade,
  product_id      uuid references odontosonrisa.inventory(id) on delete cascade,
  quantity        int default 1,
  price           numeric default 0,
  created_at      timestamptz default now()
);
create index if not exists appointment_products_appt_idx on odontosonrisa.appointment_products (appointment_id);

create table if not exists odontosonrisa.transactions (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references odontosonrisa.clients(id) on delete set null,
  description   text,
  amount        numeric default 0,
  type          text not null check (type in ('income','expense')),
  category      text,
  currency      text default 'USD',
  exchange_rate numeric,
  status        text default 'PAID',
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now()
);
create index if not exists transactions_created_idx on odontosonrisa.transactions (created_at desc);
create index if not exists transactions_type_idx on odontosonrisa.transactions (type);
create index if not exists transactions_status_idx on odontosonrisa.transactions (status);
create index if not exists transactions_client_idx on odontosonrisa.transactions (client_id);

create table if not exists odontosonrisa.turn_queue (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references odontosonrisa.staff(id) on delete cascade,
  position    int not null,
  status      text not null default 'AVAILABLE' check (status in ('AVAILABLE','BUSY','ABSENT')),
  created_at  timestamptz default now()
);
create index if not exists turn_queue_staff_idx on odontosonrisa.turn_queue (staff_id);
create index if not exists turn_queue_position_idx on odontosonrisa.turn_queue (position);

create table if not exists odontosonrisa.attendance_log (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references odontosonrisa.staff(id) on delete cascade,
  check_in    timestamptz not null default now(),
  check_out   timestamptz,
  created_at  timestamptz default now()
);
create index if not exists attendance_staff_checkin_idx on odontosonrisa.attendance_log (staff_id, check_in desc);

create table if not exists odontosonrisa.coupons (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references odontosonrisa.clients(id) on delete cascade,
  prize_name    text not null,
  status        text not null default 'UNUSED' check (status in ('UNUSED','USED')),
  generated_at  timestamptz default now(),
  redeemed_at   timestamptz,
  created_at    timestamptz default now()
);
create index if not exists coupons_client_idx on odontosonrisa.coupons (client_id, generated_at desc);

create table if not exists odontosonrisa.staff_reviews (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid not null references odontosonrisa.staff(id) on delete cascade,
  client_id       uuid references odontosonrisa.clients(id) on delete set null,
  appointment_id  uuid references odontosonrisa.appointments(id) on delete set null,
  rating          int not null check (rating between 1 and 5),
  comment         text,
  rapidez         int check (rapidez between 1 and 5),
  limpieza        int check (limpieza between 1 and 5),
  habilidad       int check (habilidad between 1 and 5),
  created_at      timestamptz default now()
);
create unique index if not exists staff_reviews_appointment_key on odontosonrisa.staff_reviews (appointment_id);
create index if not exists staff_reviews_staff_idx on odontosonrisa.staff_reviews (staff_id, created_at desc);

create table if not exists odontosonrisa.staff_portfolio (
  id            uuid primary key default gen_random_uuid(),
  staff_id      uuid not null references odontosonrisa.staff(id) on delete cascade,
  image_url     text not null,
  storage_path  text not null,
  created_at    timestamptz default now()
);
create index if not exists staff_portfolio_staff_idx on odontosonrisa.staff_portfolio (staff_id, created_at desc);

create table if not exists odontosonrisa.system_settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz default now()
);

create table if not exists odontosonrisa.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid references odontosonrisa.staff(id) on delete cascade,
  role        text not null,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now()
);
create index if not exists push_subs_staff_idx on odontosonrisa.push_subscriptions (staff_id);
create index if not exists push_subs_role_idx on odontosonrisa.push_subscriptions (role);

create table if not exists odontosonrisa.push_config (
  id            int primary key default 1,
  vapid_public  text,
  vapid_private text,
  subject       text default 'mailto:admin@dientessanos.com',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists odontosonrisa.scheduled_reminders (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid references odontosonrisa.clients(id) on delete cascade,
  appointment_id  uuid references odontosonrisa.appointments(id) on delete cascade,
  type            text,          -- 'follow_up' | 'thank_you' (formato WhatsApp)
  kind            text,          -- 'birthday'   (formato bot)
  scheduled_for   timestamptz,
  remind_at       timestamptz,
  status          text,          -- 'pending' | 'sent'
  sent            boolean,
  sent_at         timestamptz,
  attempts        int default 0,
  created_at      timestamptz default now()
);
create index if not exists scheduled_reminders_due_idx on odontosonrisa.scheduled_reminders (status, scheduled_for);
create index if not exists scheduled_reminders_birthday_idx on odontosonrisa.scheduled_reminders (kind, remind_at);

create table if not exists odontosonrisa.passkey_credentials (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid not null references auth.users(id) on delete cascade,
  audience        text not null default 'crm',
  name            text not null,
  credential_id   text not null unique,
  public_key      text not null,
  device_type     text,
  backed_up       boolean default false,
  transports      jsonb,
  counter         bigint default 0,
  last_used_at    timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz default now()
);
create index if not exists passkey_creds_user_idx on odontosonrisa.passkey_credentials (auth_user_id, audience);

create table if not exists odontosonrisa.passkey_challenges (
  id                  uuid primary key default gen_random_uuid(),
  challenge           text not null,
  purpose             text not null check (purpose in ('registration','authentication')),
  auth_user_id        uuid,
  request_fingerprint text not null,
  expires_at          timestamptz not null,
  created_at          timestamptz default now()
);
create index if not exists passkey_challenges_expires_idx on odontosonrisa.passkey_challenges (expires_at);

create table if not exists odontosonrisa.google_reviews (
  id           uuid primary key default gen_random_uuid(),
  author_name  text not null,
  rating       int not null check (rating between 1 and 5),
  review_text  text,
  review_time  text,                      -- texto crudo de Google Places
  reviewed_at  date,                      -- fecha normalizada (el portal ordena por aquí)
  source       text not null default 'google',
  created_at   timestamptz not null default now()
);
create index if not exists google_reviews_reviewed_idx on odontosonrisa.google_reviews (reviewed_at desc nulls last, created_at desc);

-- ============================================================================
-- 2. FUNCIONES AUXILIARES
-- ============================================================================

create or replace function odontosonrisa.is_staff()
returns boolean
language sql
security definer
set search_path = odontosonrisa, public
stable
as $$
  select exists (
    select 1
    from odontosonrisa.staff s
    where s.auth_user_id = auth.uid()
      and s.active is not false
      and coalesce(s.role, '') not like 'ARCHIVED|%'
  );
$$;
revoke all on function odontosonrisa.is_staff() from public;
grant execute on function odontosonrisa.is_staff() to anon, authenticated, service_role;

create or replace function odontosonrisa.is_admin()
returns boolean
language sql
security definer
set search_path = odontosonrisa, public
stable
as $$
  select exists (
    select 1
    from odontosonrisa.staff s
    where s.auth_user_id = auth.uid()
      and s.active is not false
      and coalesce(s.role, '') not like 'ARCHIVED|%'
      and s.role ilike '%admin%'
  );
$$;
revoke all on function odontosonrisa.is_admin() from public;
grant execute on function odontosonrisa.is_admin() to anon, authenticated, service_role;

-- ── RPC: encontrar cliente existente por cédula / email / teléfono ──────────
-- Lo llama el portal (publicService.findExistingClientRecord) para decidir
-- vincular-vs-crear durante el registro. Devuelve 0 o 1 fila.
create or replace function odontosonrisa.find_existing_client(
  p_id_card text,
  p_email   text,
  p_phone   text
)
returns setof odontosonrisa.clients
language sql
stable
security definer
set search_path = odontosonrisa, public
as $$
  with input as (
    select
      regexp_replace(coalesce(p_id_card, ''), '\D', '', 'g') as id_card_norm,
      lower(trim(coalesce(p_email, '')))                      as email_norm,
      regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')    as phone_norm
  )
  select c.*
  from odontosonrisa.clients c, input i
  where (i.id_card_norm <> '' and regexp_replace(coalesce(c.id_card, ''), '\D', '', 'g') = i.id_card_norm)
     or (i.email_norm <> ''   and lower(trim(coalesce(c.email, ''))) = i.email_norm)
     or (i.phone_norm <> ''   and regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = i.phone_norm)
  order by
    case
      when i.id_card_norm <> '' and regexp_replace(coalesce(c.id_card, ''), '\D', '', 'g') = i.id_card_norm then 0
      when i.email_norm <> ''   and lower(trim(coalesce(c.email, ''))) = i.email_norm then 1
      else 2
    end,
    c.created_at desc
  limit 1;
$$;
revoke all on function odontosonrisa.find_existing_client(text, text, text) from public;
grant execute on function odontosonrisa.find_existing_client(text, text, text) to anon, authenticated, service_role;

-- ── RPC: registros relacionados del mismo cliente (dedupe por cédula/tel/email)
create or replace function odontosonrisa.find_related_clients(p_client_id uuid)
returns setof odontosonrisa.clients
language sql
stable
security definer
set search_path = odontosonrisa, public
as $$
  with base as (
    select * from odontosonrisa.clients where id = p_client_id
  )
  select distinct c.*
  from odontosonrisa.clients c
  cross join base b
  where c.id = b.id
     or (nullif(regexp_replace(coalesce(b.id_card, ''), '\D', '', 'g'), '') is not null
         and regexp_replace(coalesce(c.id_card, ''), '\D', '', 'g') = regexp_replace(b.id_card, '\D', '', 'g'))
     or (nullif(regexp_replace(coalesce(b.phone, ''), '\D', '', 'g'), '') is not null
         and regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = regexp_replace(b.phone, '\D', '', 'g'))
     or (nullif(lower(trim(coalesce(b.email, ''))), '') is not null
         and lower(trim(coalesce(c.email, ''))) = lower(trim(b.email)))
  order by c.created_at;
$$;
revoke all on function odontosonrisa.find_related_clients(uuid) from public;
grant execute on function odontosonrisa.find_related_clients(uuid) to anon, authenticated, service_role;

-- ── RPC: borrado atómico de transacción (versión pública) ───────────────────
-- Restaura stock + movimiento de reverso, borra citas asociadas en orden FK y
-- borra la transacción. Si algo falla, revierte todo.
-- (Equivalente a db/functions/delete_transaction_cascade.sql, schema odontosonrisa.)
create or replace function odontosonrisa.delete_transaction_cascade(
  p_transaction_id  uuid,
  p_appointment_ids uuid[] default '{}',
  p_products        jsonb  default '[]'
)
returns void
language plpgsql
security definer
set search_path = odontosonrisa, public
as $$
declare
  item jsonb;
  pid  uuid;
  qty  numeric;
begin
  if p_products is not null then
    for item in select * from jsonb_array_elements(p_products) loop
      begin
        pid := nullif(item->>'id', '')::uuid;
      exception when others then
        pid := null;
      end;
      qty := coalesce((item->>'quantity')::numeric, 0);
      if pid is not null and qty <> 0 then
        update odontosonrisa.inventory set stock = coalesce(stock, 0) + qty where id = pid;
        if found then
          insert into odontosonrisa.inventory_movements (product_id, type, amount, reason)
            values (pid, 'entry', qty, 'Reverso por eliminación de venta');
        end if;
      end if;
    end loop;
  end if;

  if p_appointment_ids is not null and array_length(p_appointment_ids, 1) > 0 then
    delete from odontosonrisa.appointment_staff    where appointment_id = any(p_appointment_ids);
    delete from odontosonrisa.appointment_products where appointment_id = any(p_appointment_ids);
    delete from odontosonrisa.appointment_extras   where appointment_id = any(p_appointment_ids);
    delete from odontosonrisa.appointments         where id = any(p_appointment_ids);
  end if;

  delete from odontosonrisa.transactions where id = p_transaction_id;
end;
$$;
revoke all on function odontosonrisa.delete_transaction_cascade(uuid, uuid[], jsonb) from public;
grant execute on function odontosonrisa.delete_transaction_cascade(uuid, uuid[], jsonb) to anon, authenticated, service_role;

-- ── RPC: consumo personal del staff ─────────────────────────────────────────
-- Por cada ítem: descuenta stock, registra movimiento 'exit' y crea un egreso
-- 'Consumo Personal'. Devuelve { amountUsd, amountBs } (FinanceModule lee amountBs).
create or replace function odontosonrisa.register_staff_consumption(
  p_staff_id      uuid,
  p_items         jsonb,
  p_exchange_rate numeric
)
returns jsonb
language plpgsql
security definer
set search_path = odontosonrisa, public
as $$
declare
  item        jsonb;
  pid         uuid;
  qty         numeric;
  unit_price  numeric;
  total_usd   numeric := 0;
  amount_bs   numeric;
  staff_name  text;
begin
  select name into staff_name from odontosonrisa.staff where id = p_staff_id;

  for item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    begin
      pid := nullif(item->>'id', '')::uuid;
    exception when others then
      pid := null;
    end;
    qty := coalesce((item->>'quantity')::numeric, 0);

    if pid is not null and qty > 0 then
      select coalesce(price, cost_price, 0) into unit_price
      from odontosonrisa.inventory where id = pid;
      if found then
        update odontosonrisa.inventory
           set stock = coalesce(stock, 0) - qty,
               updated_at = now()
         where id = pid;
        insert into odontosonrisa.inventory_movements (product_id, type, amount, reason)
          values (pid, 'exit', qty, 'Consumo personal');
        total_usd := total_usd + (unit_price * qty);
      end if;
    end if;
  end loop;

  amount_bs := round(total_usd * coalesce(nullif(p_exchange_rate, 0), 0), 2);

  insert into odontosonrisa.transactions (description, amount, type, category, currency, exchange_rate, metadata)
  values (
    'CONSUMO PERSONAL - ' || coalesce(staff_name, 'Personal'),
    total_usd,
    'expense',
    'Consumo Personal',
    'USD',
    coalesce(p_exchange_rate, 0),
    jsonb_build_object(
      'staffId', p_staff_id,
      'amountBs', amount_bs,
      'items', coalesce(p_items, '[]'::jsonb),
      'type', 'consumption'
    )
  );

  return jsonb_build_object('amountUsd', total_usd, 'amountBs', amount_bs);
end;
$$;
revoke all on function odontosonrisa.register_staff_consumption(uuid, jsonb, numeric) from public;
grant execute on function odontosonrisa.register_staff_consumption(uuid, jsonb, numeric) to authenticated, service_role;

-- ── Trigger: evitar doble cita para el mismo odontólogo ─────────────────────
-- El portal espera un error cuyo mensaje contenga APPOINTMENT_TIME_CONFLICT
-- (publicService.createAppointment lo mapea). Solo valida al INSERTAR o al
-- mover scheduled_at/staff_id: los cambios de estado (En Silla, Completado…)
-- no re-validan, para no romper el checkout.
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
    and coalesce(a.status, '') not in ('Cancelada', 'Cancelado')
    and a.scheduled_at < v_new_end
    and (a.scheduled_at + make_interval(mins => coalesce(s.duration, 30))) > new.scheduled_at;

  if v_overlap > 0 then
    raise exception 'APPOINTMENT_TIME_CONFLICT: ya hay una cita en ese horario para este odontólogo';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_appointment_conflict on odontosonrisa.appointments;
create trigger trg_appointment_conflict
before insert or update on odontosonrisa.appointments
for each row execute function odontosonrisa.check_appointment_conflict();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

alter table odontosonrisa.clients               enable row level security;
alter table odontosonrisa.staff                 enable row level security;
alter table odontosonrisa.services              enable row level security;
alter table odontosonrisa.service_extras        enable row level security;
alter table odontosonrisa.service_checklist_items enable row level security;
alter table odontosonrisa.inventory             enable row level security;
alter table odontosonrisa.inventory_movements   enable row level security;
alter table odontosonrisa.appointments          enable row level security;
alter table odontosonrisa.appointment_staff     enable row level security;
alter table odontosonrisa.appointment_extras    enable row level security;
alter table odontosonrisa.appointment_products  enable row level security;
alter table odontosonrisa.transactions          enable row level security;
alter table odontosonrisa.turn_queue            enable row level security;
alter table odontosonrisa.attendance_log        enable row level security;
alter table odontosonrisa.coupons               enable row level security;
alter table odontosonrisa.staff_reviews         enable row level security;
alter table odontosonrisa.staff_portfolio       enable row level security;
alter table odontosonrisa.system_settings       enable row level security;
alter table odontosonrisa.push_subscriptions    enable row level security;
alter table odontosonrisa.push_config           enable row level security;
alter table odontosonrisa.scheduled_reminders   enable row level security;
alter table odontosonrisa.passkey_credentials   enable row level security;
alter table odontosonrisa.passkey_challenges    enable row level security;
alter table odontosonrisa.google_reviews        enable row level security;

-- ── clients ────────────────────────────────────────────────────────────────
-- anon: lookup de reserva (getClientByEmail/Phone) + registro.
-- authenticated: filas propias / sin vincular / is_staff (CRM).
-- TODO(seguridad): el SELECT anónimo por email/teléfono es fuga de PII;
-- sustituir por un RPC que solo confirme existencia cuando se refactorice.
drop policy if exists clients_select_public on odontosonrisa.clients;
create policy clients_select_public on odontosonrisa.clients
  for select to anon using (true);

drop policy if exists clients_select_auth on odontosonrisa.clients;
create policy clients_select_auth on odontosonrisa.clients
  for select to authenticated
  using (auth_user_id = auth.uid() or auth_user_id is null or odontosonrisa.is_staff());

drop policy if exists clients_insert_public on odontosonrisa.clients;
create policy clients_insert_public on odontosonrisa.clients
  for insert to anon with check (true);

drop policy if exists clients_insert_auth on odontosonrisa.clients;
create policy clients_insert_auth on odontosonrisa.clients
  for insert to authenticated with check (auth_user_id = auth.uid() or odontosonrisa.is_staff());

drop policy if exists clients_update_auth on odontosonrisa.clients;
create policy clients_update_auth on odontosonrisa.clients
  for update to authenticated
  using (auth_user_id = auth.uid() or auth_user_id is null or odontosonrisa.is_staff())
  with check (auth_user_id = auth.uid() or auth_user_id is null or odontosonrisa.is_staff());

drop policy if exists clients_delete_staff on odontosonrisa.clients;
create policy clients_delete_staff on odontosonrisa.clients
  for delete to authenticated using (odontosonrisa.is_staff());

-- ── staff ──────────────────────────────────────────────────────────────────
-- anon: SIN acceso (el portal pasa por /api/public/staff con service key;
-- los embeds `staff(...)` del portal quedan en null con fallback en la UI).
-- authenticated: solo personal activo (is_staff) ve/edita el directorio,
-- incluidas columnas sensibles (monthly_salary, etc.).
drop policy if exists staff_all_staff on odontosonrisa.staff;
create policy staff_all_staff on odontosonrisa.staff
  for all to authenticated
  using (odontosonrisa.is_staff())
  with check (odontosonrisa.is_staff());

-- ── services ───────────────────────────────────────────────────────────────
drop policy if exists services_select_public on odontosonrisa.services;
create policy services_select_public on odontosonrisa.services
  for select to anon, authenticated using (true);

drop policy if exists services_write_staff on odontosonrisa.services;
create policy services_write_staff on odontosonrisa.services
  for all to authenticated
  using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

-- ── service_extras / service_checklist_items (solo CRM) ────────────────────
drop policy if exists service_extras_staff on odontosonrisa.service_extras;
create policy service_extras_staff on odontosonrisa.service_extras
  for all to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

drop policy if exists service_checklist_staff on odontosonrisa.service_checklist_items;
create policy service_checklist_staff on odontosonrisa.service_checklist_items
  for all to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

-- ── inventory / movimientos (solo CRM; el menú de café va por serverless) ──
drop policy if exists inventory_staff on odontosonrisa.inventory;
create policy inventory_staff on odontosonrisa.inventory
  for all to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

drop policy if exists inventory_movements_staff on odontosonrisa.inventory_movements;
create policy inventory_movements_staff on odontosonrisa.inventory_movements
  for all to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

-- ── appointments ───────────────────────────────────────────────────────────
-- Lectura abierta: el portal calcula disponibilidad (también con sesión) y
-- muestra el historial propio con embeds. Escritura:
--   anon     → crear cita + consentimiento tattoo (UPDATE limitado por columna).
--   auth     → is_staff (CRM) o filas del propio cliente.
-- TODO(seguridad): restringir el SELECT anónimo a columnas de disponibilidad.
drop policy if exists appointments_select_open on odontosonrisa.appointments;
create policy appointments_select_open on odontosonrisa.appointments
  for select to anon, authenticated using (true);

drop policy if exists appointments_insert_public on odontosonrisa.appointments;
create policy appointments_insert_public on odontosonrisa.appointments
  for insert to anon, authenticated with check (true);

drop policy if exists appointments_update_anon on odontosonrisa.appointments;
create policy appointments_update_anon on odontosonrisa.appointments
  for update to anon using (true) with check (true);

drop policy if exists appointments_update_auth on odontosonrisa.appointments;
create policy appointments_update_auth on odontosonrisa.appointments
  for update to authenticated
  using (odontosonrisa.is_staff() or client_id in (select c.id from odontosonrisa.clients c where c.auth_user_id = auth.uid()))
  with check (odontosonrisa.is_staff() or client_id in (select c.id from odontosonrisa.clients c where c.auth_user_id = auth.uid()));

drop policy if exists appointments_delete_staff on odontosonrisa.appointments;
create policy appointments_delete_staff on odontosonrisa.appointments
  for delete to authenticated using (odontosonrisa.is_staff());

-- anon solo puede tocar tattoo_data (consentimiento); el UPDATE de tablas
-- restringido por privilegio a nivel de columna (no por fila).
revoke update on odontosonrisa.appointments from anon;
grant update (tattoo_data) on odontosonrisa.appointments to anon;

-- ── appointment_children (solo CRM) ────────────────────────────────────────
drop policy if exists appointment_staff_staff on odontosonrisa.appointment_staff;
create policy appointment_staff_staff on odontosonrisa.appointment_staff
  for all to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

drop policy if exists appointment_extras_staff on odontosonrisa.appointment_extras;
create policy appointment_extras_staff on odontosonrisa.appointment_extras
  for all to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

drop policy if exists appointment_products_staff on odontosonrisa.appointment_products;
create policy appointment_products_staff on odontosonrisa.appointment_products
  for all to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

-- ── transactions / turn_queue / attendance_log (solo CRM) ──────────────────
drop policy if exists transactions_staff on odontosonrisa.transactions;
create policy transactions_staff on odontosonrisa.transactions
  for all to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

drop policy if exists turn_queue_staff on odontosonrisa.turn_queue;
create policy turn_queue_staff on odontosonrisa.turn_queue
  for all to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

drop policy if exists attendance_staff on odontosonrisa.attendance_log;
create policy attendance_staff on odontosonrisa.attendance_log
  for all to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

-- ── coupons (ruleta / premios del portal) ──────────────────────────────────
drop policy if exists coupons_select on odontosonrisa.coupons;
create policy coupons_select on odontosonrisa.coupons
  for select to anon, authenticated using (true);

drop policy if exists coupons_insert on odontosonrisa.coupons;
create policy coupons_insert on odontosonrisa.coupons
  for insert to anon, authenticated with check (true);

drop policy if exists coupons_update on odontosonrisa.coupons;
create policy coupons_update on odontosonrisa.coupons
  for update to anon, authenticated using (true) with check (true);

drop policy if exists coupons_delete_staff on odontosonrisa.coupons;
create policy coupons_delete_staff on odontosonrisa.coupons
  for delete to authenticated using (odontosonrisa.is_staff());

-- ── staff_reviews (reseñas anónimas del portal) ────────────────────────────
drop policy if exists staff_reviews_select on odontosonrisa.staff_reviews;
create policy staff_reviews_select on odontosonrisa.staff_reviews
  for select to anon, authenticated using (true);

drop policy if exists staff_reviews_insert on odontosonrisa.staff_reviews;
create policy staff_reviews_insert on odontosonrisa.staff_reviews
  for insert to anon, authenticated with check (true);

drop policy if exists staff_reviews_upsert on odontosonrisa.staff_reviews;
create policy staff_reviews_upsert on odontosonrisa.staff_reviews
  for update to anon, authenticated using (true) with check (true);

drop policy if exists staff_reviews_delete_staff on odontosonrisa.staff_reviews;
create policy staff_reviews_delete_staff on odontosonrisa.staff_reviews
  for delete to authenticated using (odontosonrisa.is_staff());

-- ── staff_portfolio (fotos públicas; subidas desde el CRM) ─────────────────
drop policy if exists staff_portfolio_select on odontosonrisa.staff_portfolio;
create policy staff_portfolio_select on odontosonrisa.staff_portfolio
  for select to anon, authenticated using (true);

drop policy if exists staff_portfolio_write on odontosonrisa.staff_portfolio;
create policy staff_portfolio_write on odontosonrisa.staff_portfolio
  for all to authenticated
  using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

-- ── system_settings (toggle abierto/cerrado, contador, plantillas) ─────────
-- El portal lo lee vía /api/public/store-status (service key); anon sin acceso.
drop policy if exists system_settings_staff on odontosonrisa.system_settings;
create policy system_settings_staff on odontosonrisa.system_settings
  for all to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

-- ── push (suscripciones desde el CRM; config solo service_role) ────────────
drop policy if exists push_subscriptions_auth on odontosonrisa.push_subscriptions;
create policy push_subscriptions_auth on odontosonrisa.push_subscriptions
  for all to authenticated using (true) with check (true);

-- push_config y passkeys: sin políticas → solo service_role (bypass).

-- ── scheduled_reminders (scheduler del CRM + bot con service key) ──────────
drop policy if exists scheduled_reminders_staff on odontosonrisa.scheduled_reminders;
create policy scheduled_reminders_staff on odontosonrisa.scheduled_reminders
  for all to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

-- ── google_reviews (reseñas reales del consultorio) ────────────────────────
-- Lectura pública para el portal; escritura solo staff o sync con service key.
drop policy if exists google_reviews_public_read on odontosonrisa.google_reviews;
create policy google_reviews_public_read on odontosonrisa.google_reviews
  for select using (true);

drop policy if exists google_reviews_staff_write on odontosonrisa.google_reviews;
create policy google_reviews_staff_write on odontosonrisa.google_reviews
  for insert to authenticated with check (odontosonrisa.is_staff());

drop policy if exists google_reviews_staff_update on odontosonrisa.google_reviews;
create policy google_reviews_staff_update on odontosonrisa.google_reviews
  for update to authenticated using (odontosonrisa.is_staff()) with check (odontosonrisa.is_staff());

drop policy if exists google_reviews_staff_delete on odontosonrisa.google_reviews;
create policy google_reviews_staff_delete on odontosonrisa.google_reviews
  for delete to authenticated using (odontosonrisa.is_staff());

-- ============================================================================
-- 4. STORAGE (buckets de portafolio y videos)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true),
       ('barber-videos', 'barber-videos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists storage_portfolio_read on storage.objects;
create policy storage_portfolio_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('portfolio', 'barber-videos'));

drop policy if exists storage_portfolio_write on storage.objects;
create policy storage_portfolio_write on storage.objects
  for insert to authenticated
  with check (bucket_id in ('portfolio', 'barber-videos') and odontosonrisa.is_staff());

drop policy if exists storage_portfolio_modify on storage.objects;
create policy storage_portfolio_modify on storage.objects
  for update to authenticated
  using (bucket_id in ('portfolio', 'barber-videos') and odontosonrisa.is_staff())
  with check (bucket_id in ('portfolio', 'barber-videos') and odontosonrisa.is_staff());

drop policy if exists storage_portfolio_delete on storage.objects;
create policy storage_portfolio_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('portfolio', 'barber-videos') and odontosonrisa.is_staff());

-- ============================================================================
-- 5. REALTIME (para canales de notificaciones del CRM)
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'appointments', 'turn_queue', 'transactions', 'inventory', 'clients',
    'staff', 'staff_reviews', 'service_extras', 'services', 'system_settings',
    'google_reviews', 'attendance_log'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'odontosonrisa' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table odontosonrisa.%I', t);
    end if;
  end loop;
exception
  when undefined_object then
    raise notice 'publicación supabase_realtime no existe; omisión';
end $$;

-- ============================================================================
-- 6. SEEDS
-- ============================================================================

-- 6.1 Categorías dentales (formato SYSTEM_CATEGORY:<Nombre>|<Icono lucide>)
insert into odontosonrisa.service_extras (name, price, cost)
select v.name, 0, 0
from (values
  ('SYSTEM_CATEGORY:Estética|Sparkles'),
  ('SYSTEM_CATEGORY:Ortodoncia|Activity'),
  ('SYSTEM_CATEGORY:Endodoncia|HeartPulse'),
  ('SYSTEM_CATEGORY:Odontopediatría|Baby')
) as v(name)
where not exists (select 1 from odontosonrisa.service_extras e where e.name = v.name);

-- 6.2 Ajustes del sistema
insert into odontosonrisa.system_settings (key, value, updated_at)
values ('store_is_open', 'true', now()),
       ('order_counter', '0', now())
on conflict (key) do nothing;

-- 6.3 google_reviews queda vacía a propósito: se llena con las reseñas reales
--     del consultorio (Google Places API o carga manual desde el panel).

-- 6.4 No se crean usuarios aquí a propósito: el usuario admin se crea con la
--     Admin API de Supabase y su fila staff se vincula después (lo hace el agente).

-- ============================================================================
-- FIN — verificar con:
--   select count(*) from information_schema.tables
--    where table_schema = 'odontosonrisa' and table_type = 'BASE TABLE';
--   (debe ser 24)
-- ============================================================================
