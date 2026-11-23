import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

let adminClient;

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    const env = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
    return env;
  } catch (e) {
    console.warn('[supabaseAdmin] No se pudo leer .env.local:', e.message);
    return {};
  }
}

export const getAdminClient = () => {
  if (adminClient) return adminClient;
  
  // Leer variables de entorno (process.env primero, .env.local como fallback para localhost)
  const envFile = loadEnvFile();
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || envFile.SUPABASE_URL || envFile.VITE_SUPABASE_URL;
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envFile.SUPABASE_SERVICE_ROLE_KEY;
  
  // Limpiar comillas y espacios
  const url = rawUrl ? String(rawUrl).replace(/^["']|["']$/g, '').trim() : '';
  const key = rawKey ? String(rawKey).replace(/^["']|["']$/g, '').trim() : '';
  
  // Debug logging (se ve en la terminal de vite)
  console.log('[getAdminClient] SUPABASE_URL:', url ? 'PRESENTE (' + url.substring(0, 40) + '...)' : 'FALTA');
  console.log('[getAdminClient] SERVICE_ROLE_KEY:', key ? 'PRESENTE (' + key.substring(0, 20) + '...)' : 'FALTA');
  
  if (!url) throw new Error('Falta SUPABASE_URL / VITE_SUPABASE_URL en variables de entorno. Revisa .env.local.');
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en variables de entorno. Este endpoint requiere service role key.');
  
  // Validar formato de URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('SUPABASE_URL debe usar https://');
    }
  } catch (e) {
    throw new Error(`SUPABASE_URL inválida: "${url}". Debe ser formato https://xxx.supabase.co (sin barra final)`);
  }
  
  try {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'odontosonrisa' },
    });
  } catch (e) {
    throw new Error(`Error creando cliente Supabase Admin: ${e.message}. Verifica que SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY sean correctos.`);
  }
  return adminClient;
};

export const getAuthenticatedUser = async (request) => {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw Object.assign(new Error('Sesión requerida'), { statusCode: 401 });
  const { data, error } = await getAdminClient().auth.getUser(token);
  if (error || !data?.user) throw Object.assign(new Error('Sesión inválida'), { statusCode: 401 });
  return data.user;
};

export const getActiveStaff = async (authUserId) => {
  const { data, error } = await getAdminClient()
    
    .from('staff')
    .select('id, name, email, role, active, auth_user_id')
    .eq('auth_user_id', authUserId)
    .eq('active', true)
    .not('role', 'like', 'ARCHIVED|%')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error('El miembro del equipo no está activo'), { statusCode: 403 });
  return data;
};

export const issueSupabaseLoginToken = async (authUserId) => {
  const admin = getAdminClient();
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(authUserId);
  if (userError || !userData?.user?.email) throw new Error('No se pudo resolver la cuenta de acceso');
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
  });
  if (error) throw error;
  const tokenHash = data?.properties?.hashed_token;
  if (!tokenHash) throw new Error('Supabase no devolvió un token de acceso utilizable');
  return tokenHash;
};
