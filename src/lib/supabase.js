import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validación de variables de entorno requeridas. Si faltan, la app no puede
// conectar a Supabase; se lanza un error claro en lugar de dejar que
// createClient() tire 'supabaseUrl is required' y tumbe toda la app.
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  throw new Error(
    `[Dientes Sanos] Falta(n) variable(s) de entorno: ${missing.join(', ')}. ` +
    'Agrégalas en Vercel → Settings → Environment Variables (Production, Preview, Development) ' +
    'o en .env.local para desarrollo local.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sb-panda-crm-auth-token',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  db: { schema: 'odontosonrisa' }
});

export const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sb-panda-public-auth-token',
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: { schema: 'odontosonrisa' }
});

// Compatibilidad temporal mientras dataService/publicService terminan de migrar
// sus llamadas a RLS/RPC. Nunca se crea un cliente administrativo en el browser.
// En CRM conserva la sesión del empleado; el portal público usa su propia sesión.
