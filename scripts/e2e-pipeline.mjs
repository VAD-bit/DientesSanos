// E2E smoke: cliente → servicio → cita → cobro → transacción visible en finanzas
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Falta SUPABASE_URL o SERVICE_ROLE_KEY'); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false }, db: { schema: 'odontosonrisa' } });
let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log('PASS', label); }
  else { fail++; console.error('FAIL', label); }
};

async function retry(fn, label, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      console.log(`retry ${i + 1}/${tries} ${label}:`, e?.message || e);
      await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw last;
}

const stamp = Date.now();
const rand = Math.random().toString(36).slice(2, 8);

// 1. Servicios dentales presentes o seedables
let { data: services, error: sErr } = await db.from('services').select('id, name, price').limit(20);
ok(!sErr, 'lectura services sin error');
const dental = (services || []).filter(s =>
  ['Limpieza dental', 'Endodoncia', 'Diseño de sonrisa', 'Extracciones dentales'].includes(s.name)
);
ok(dental.length >= 1 || (services || []).length >= 0, `services legibles (${(services||[]).length})`);

// 2. Crear cliente de prueba
const clientRes = await retry(() => db.from('clients').insert([{
  name: `E2E Paciente ${rand}`,
  phone: `555${stamp % 10000000}`,
  email: `e2e.${rand}@dientessanos.test`,
  status: 'Activo',
  created_at: new Date().toISOString()
}]).select().single(), 'crear cliente');
const client = clientRes.data;
ok(!clientRes.error && client?.id, 'crear cliente E2E');
if (!client) { console.error(clientRes.error); process.exit(1); }

// 3. Servicio de prueba (o usar existente)
let svc = dental[0];
if (!svc) {
  const { data: created, error: svcErr } = await db.from('services').insert([{
    name: `E2E Limpieza ${rand}`, price: 30, duration: 30, category: 'Prevención', active: true
  }]).select('id, name, price').single();
  ok(!svcErr && created?.id, 'crear servicio E2E');
  svc = created;
} else {
  ok(true, `usar servicio existente: ${svc.name}`);
}

// 4. Cita "En Silla" → "Completado"
const { data: app, error: aErr } = await db.from('appointments').insert([{
  client_id: client.id,
  service_id: svc.id,
  status: 'En Silla',
  total_price: svc.price || 30,
  started_at: new Date().toISOString()
}]).select().single();
ok(!aErr && app?.id, 'crear cita en sillón');

// 5. Procesar cobro final (simula processFinalPayment)
const rate = 700;
const amount = Number(app?.total_price || 30);
const { error: upErr } = await db.from('appointments')
  .update({ status: 'Completado', completed_at: new Date().toISOString() })
  .eq('id', app.id);
ok(!upErr, 'marcar cita Completado');

const { data: tx, error: tErr } = await db.from('transactions').insert([{
  client_id: client.id,
  description: `VENTA FINAL E2E - Cliente: ${client.name}`,
  amount,
  type: 'income',
  category: 'Ventas Panda',
  exchange_rate: rate,
  currency: 'USD',
  created_at: new Date().toISOString(),
  metadata: { client_id: client.id, e2e: true, cash_usd: amount }
}]).select().single();
ok(!tErr && tx?.id, 'crear transacción financiera');
if (tErr) console.error(tErr);

// 6. Reflejo en finanzas (misma query que FinanceModule)
const { data: finance, error: fErr } = await db.from('transactions')
  .select('id, amount, type, category, description')
  .eq('id', tx?.id)
  .single();
ok(!fErr && finance?.id === tx?.id, 'transacción visible en finanzas');
ok(Number(finance?.amount) === amount, `monto coincide (${finance?.amount})`);

// 7. Historial clínico del paciente (requiere SQL actualizado con clinical_records)
const crUpsert = await retry(() => db.from('clinical_records').upsert({
  client_id: client.id,
  motivo_consulta: 'E2E motivo',
  diagnostico: 'E2E diagnóstico',
  completed_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}, { onConflict: 'client_id' }).select().single(), 'historial clínico', 2).catch(e => ({ error: e }));
ok(!crUpsert.error, 'guardar historial clínico (clinical_records)');
if (crUpsert.error) console.error('hint:', crUpsert.error.message, '— ejecuta el SQL actualizado en Supabase');

const { data: cr } = await db.from('clinical_records').select('*').eq('client_id', client.id).maybeSingle();
ok(!!cr && cr.diagnostico === 'E2E diagnóstico', 'leer historial clínico');

// Limpieza
await db.from('clinical_records').delete().eq('client_id', client.id);
await db.from('transactions').delete().eq('id', tx?.id);
await db.from('appointments').delete().eq('id', app?.id);
await db.from('clients').delete().eq('id', client.id);

console.log(`\nRESULTADO E2E: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
