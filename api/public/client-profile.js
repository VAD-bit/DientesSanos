import { requireUser } from '../../server/auth/admin.js';
import { handleError, json, parseBody, requireMethod } from '../../server/passkeys/http.js';

const allowed = ['name', 'email', 'phone', 'id_card', 'birth_date'];
const pick = source => Object.fromEntries(allowed.filter(key => source[key] !== undefined).map(key => [key, source[key] || null]));

export default async function handler(request, response) {
  try {
    if (!requireMethod(request, response, ['POST'])) return;
    const { user, admin } = await requireUser(request);
    const body = parseBody(request);
    if (body.userId && String(body.userId) !== String(user.id)) {
      throw Object.assign(new Error('No puedes modificar otro perfil'), { statusCode: 403 });
    }

    const db = admin;
    const { data: linked, error: linkedError } = await db.from('clients').select('*').eq('auth_user_id', user.id).maybeSingle();
    if (linkedError) throw linkedError;
    const updates = { ...pick(body), auth_user_id: user.id, status: 'Activo' };

    if (linked) {
      const { data, error } = await db.from('clients').update(updates).eq('id', linked.id).select().single();
      if (error) throw error;
      return json(response, 200, { client: data });
    }

    const checks = [body.id_card && `id_card.eq.${body.id_card}`, body.email && `email.eq.${body.email}`, body.phone && `phone.eq.${body.phone}`].filter(Boolean);
    let existing = null;
    if (checks.length) {
      const { data, error } = await db.from('clients').select('*').or(checks.join(',')).limit(1).maybeSingle();
      if (error) throw error;
      existing = data;
    }
    if (existing?.auth_user_id && String(existing.auth_user_id) !== String(user.id)) {
      throw Object.assign(new Error('Estos datos ya están vinculados a otra cuenta'), { statusCode: 409 });
    }
    if (existing) {
      const { data, error } = await db.from('clients').update(updates).eq('id', existing.id).select().single();
      if (error) throw error;
      return json(response, 200, { client: data });
    }
    const { data, error } = await db.from('clients').insert({ ...updates, points: 0 }).select().single();
    if (error) throw error;
    return json(response, 201, { client: data });
  } catch (error) {
    return handleError(response, error, {
      fallbackMessage: 'No se pudo guardar el perfil. Inténtalo nuevamente.',
      logLabel: 'client-profile',
    });
  }
}
