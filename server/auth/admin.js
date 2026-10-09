import { getActiveStaff, getAdminClient, getAuthenticatedUser } from '../passkeys/supabaseAdmin.js';

const ADMIN_ROLE = /(^|[,|])\s*(admin|administrador)\s*($|[,|])/i;

export const requireAdmin = async request => {
  const user = await getAuthenticatedUser(request);
  const staff = await getActiveStaff(user.id);
  if (!ADMIN_ROLE.test(String(staff.role || ''))) {
    throw Object.assign(new Error('Se requiere acceso de administrador'), { statusCode: 403 });
  }
  return { user, staff, admin: getAdminClient() };
};

export const requireUser = async request => {
  const user = await getAuthenticatedUser(request);
  return { user, admin: getAdminClient() };
};
