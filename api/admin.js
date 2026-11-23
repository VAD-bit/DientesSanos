import { requireAdmin } from '../server/auth/admin.js';
import { json, parseBody, requireMethod } from '../server/passkeys/http.js';

// Router para endpoints de administraci�n.
// Reduce 1 Serverless Function a 1 (se mantiene, pero unificado).
export default async function handler(request, response) {
  try {
    // request.url puede ser una ruta relativa (/api/admin/auth-users) en localhost
    const url = new URL(request.url, 'http://localhost');
    // Vercel rewrite pasa el path original como query param ?path=:path*
    const pathParam = url.searchParams.get('path') || '';
    const path = pathParam ? `/api/admin/${pathParam}` : '/api/admin';
    const method = request.method;

    // ---------------- POST /api/admin/auth-users ----------------
    if (path === '/api/admin/auth-users' && method === 'POST') {
      if (!requireMethod(request, response, ['POST'])) return;
      const { admin } = await requireAdmin(request);
      const body = parseBody(request);
      const normalizeEmail = value => String(value || '').trim().toLowerCase();
      const action = String(body.action || '');

      if (action === 'find') {
        const email = normalizeEmail(body.email);
        if (!email) return json(response, 200, { user: null });
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (error) throw error;
        return json(response, 200, {
          user: data.users.find(user => normalizeEmail(user.email) === email) || null,
        });
      }

      if (action === 'create') {
        const email = normalizeEmail(body.email);
        if (!email || !body.password) throw Object.assign(new Error('Correo y clave son obligatorios'), { statusCode: 400 });
        const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listError) throw listError;
        const existing = listed.users.find(user => normalizeEmail(user.email) === email);
        if (existing) return json(response, 200, { user: existing });
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: String(body.password),
          email_confirm: true,
        });
        if (error) throw error;
        return json(response, 201, { user: data.user });
      }

      if (action === 'update') {
        if (!body.userId) throw Object.assign(new Error('Usuario requerido'), { statusCode: 400 });
        const updates = {};
        const email = normalizeEmail(body.email);
        if (email) Object.assign(updates, { email, email_confirm: true });
        if (body.password) updates.password = String(body.password);
        if (!Object.keys(updates).length) return json(response, 200, { user: null });
        const { data, error } = await admin.auth.admin.updateUserById(String(body.userId), updates);
        if (error) throw error;
        return json(response, 200, { user: data.user });
      }

      if (action === 'delete') {
        if (!body.userId) throw Object.assign(new Error('Usuario requerido'), { statusCode: 400 });
        const { error } = await admin.auth.admin.deleteUser(String(body.userId));
        if (error) throw error;
        return json(response, 200, { success: true });
      }

      throw Object.assign(new Error('Acci�n no permitida'), { statusCode: 400 });
    }

    return json(response, 404, { error: 'Ruta no encontrada' });
  } catch (error) {
    // Manejo de errores específico para admin (sin mensaje genérico de biometría)
    const status = Number(error?.statusCode) || 500;
    const message = error?.message || 'Error en la operación de administración';
    console.error('[admin-auth-users] ERROR:', { status, message, error: String(error) });
    return json(response, status, { error: message, details: String(error) });
  }
}
