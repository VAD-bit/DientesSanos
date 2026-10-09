import { requireAdmin } from '../../server/auth/admin.js';
import { handleError, json, parseBody, requireMethod } from '../../server/passkeys/http.js';

const normalizeEmail = value => String(value || '').trim().toLowerCase();

export default async function handler(request, response) {
  try {
    if (!requireMethod(request, response, ['POST'])) return;
    const { admin } = await requireAdmin(request);
    const body = parseBody(request);
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

    throw Object.assign(new Error('Acción no permitida'), { statusCode: 400 });
  } catch (error) {
    return handleError(response, error);
  }
}
