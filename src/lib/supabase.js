import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
