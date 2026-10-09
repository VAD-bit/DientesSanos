import { createClient } from '@supabase/supabase-js';

let adminClient;

export const getAdminClient = () => {
  if (adminClient) return adminClient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan las variables privadas de Supabase para Passkeys');
  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'odontosonrisa' },
  });
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
