import { getAdminClient } from '../server/passkeys/supabaseAdmin.js';
import { handleError, json, parseBody, requireMethod } from '../server/passkeys/http.js';
import { requireUser } from '../server/auth/admin.js';
import { isBookableStaff } from '../src/utils/staffRoles.js';

// Router único para todos los endpoints públicos.
// Reduce 6 Serverless Functions a 1 (límite del plan Hobby de Vercel: 12).
export default async function handler(request, response) {
  try {
    const url = new URL(request.url);
    const pathParam = url.searchParams.get('path') || '';
    const path = pathParam ? `/api/public/${pathParam}` : '/api/public';
    const method = request.method;

    // ---------------- GET /api/public/store-status ----------------
    if (path === '/api/public/store-status' && method === 'GET') {
      if (!requireMethod(request, response, ['GET'])) return;
      const { data, error } = await getAdminClient()
        .from('system_settings')
        .select('value')
        .eq('key', 'store_is_open')
        .maybeSingle();
      if (error) throw error;
      const isOpen = !data || String(data.value) !== 'false';
      return json(response, 200, { isOpen });
    }

    // ---------------- GET /api/public/staff ----------------
    if (path === '/api/public/staff' && method === 'GET') {
      if (!requireMethod(request, response, ['GET'])) return;
      const { data, error } = await getAdminClient()
        .from('staff')
        .select('id, name, role, image_url, active, specialty, badge, biography, phone, video_url')
        .eq('active', true)
        .not('role', 'like', 'ARCHIVED|%')
        .order('name');
      if (error) throw error;
      return json(response, 200, { staff: (data || []).filter(isBookableStaff) });
    }

    // ---------------- GET /api/public/roulette-prizes ----------------
    if (path === '/api/public/roulette-prizes' && method === 'GET') {
      if (!requireMethod(request, response, ['GET'])) return;
      const { data, error } = await getAdminClient()
        .from('service_extras')
        .select('id, name');
      if (error) throw error;
      const prizes = (data || []).filter(d => d.name && d.name.startsWith('ROULETTE_PRIZE:'));
      return json(response, 200, { prizes });
    }

    // ---------------- GET /api/public/cafe ----------------
    if (path === '/api/public/cafe' && method === 'GET') {
      if (!requireMethod(request, response, ['GET'])) return;
      const { data, error } = await getAdminClient()
        .from('inventory')
        .select('id, name, price')
        .eq('inventory_type', 'agua')
        .order('name');
      if (error) throw error;
      return json(response, 200, { items: data || [] });
    }

    // ---------------- POST /api/public/signup ----------------
    if (path === '/api/public/signup' && method === 'POST') {
      if (!requireMethod(request, response, ['POST'])) return;
      const body = parseBody(request);
      const normalizeEmail = value => String(value || '').trim().toLowerCase();
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const email = normalizeEmail(body.email);
      const password = String(body.password || '');

      if (!EMAIL_RE.test(email)) {
        throw Object.assign(new Error('Correo electr�nico inv�lido.'), { statusCode: 400 });
      }
      if (password.length < 6) {
        throw Object.assign(new Error('La contraseña debe tener al menos 6 caracteres.'), { statusCode: 400 });
      }

      const admin = getAdminClient();
      const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw listError;
      const existing = listed.users.find(user => normalizeEmail(user.email) === email);

      if (existing) {
        const { data, error } = await admin.auth.admin.updateUserById(String(existing.id), { email_confirm: true });
        if (error) throw error;
        return json(response, 200, { userId: data.user.id, existed: true });
      }

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: String(body.name || ''),
          id_card: String(body.idCard || '')
        }
      });
      if (error) throw error;
      return json(response, 201, { userId: data.user.id, existed: false });
    }

    // ---------------- POST /api/public/client-profile ----------------
    if (path === '/api/public/client-profile' && method === 'POST') {
      if (!requireMethod(request, response, ['POST'])) return;
      const { user, admin } = await requireUser(request);
      const body = parseBody(request);
      const allowed = ['name', 'email', 'phone', 'id_card', 'birth_date'];
      const pick = source => Object.fromEntries(allowed.filter(key => source[key] !== undefined).map(key => [key, source[key] || null]));
      const normalizeDate = value => {
        const raw = String(value ?? '').trim();
        if (!raw) return { ok: true, value: null };
        const valid = (y, m, d) => (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31)
          ? { ok: true, value: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` }
          : { ok: false };
        const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (iso) return valid(iso[1], iso[2], iso[3]);
        const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (dmy) return valid(dmy[3], dmy[2], dmy[1]);
        return { ok: false };
      };
      if (body.userId && String(body.userId) !== String(user.id)) {
        throw Object.assign(new Error('No puedes modificar otro perfil'), { statusCode: 403 });
      }
      const db = admin;
      const { data: linked, error: linkedError } = await db.from('clients').select('*').eq('auth_user_id', user.id).maybeSingle();
      if (linkedError) throw linkedError;
      const updates = { ...pick(body), auth_user_id: user.id, status: 'Activo' };
      if (updates.birth_date !== undefined && updates.birth_date !== null) {
        const normalized = normalizeDate(updates.birth_date);
        if (!normalized.ok) throw Object.assign(new Error('Fecha de nacimiento inv�lida. Usa el formato DD/MM/AAAA.'), { statusCode: 400 });
        updates.birth_date = normalized.value;
      }
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
        throw Object.assign(new Error('Estos datos ya est�n vinculados a otra cuenta'), { statusCode: 409 });
      }
      if (existing) {
        const { data, error } = await db.from('clients').update(updates).eq('id', existing.id).select().single();
        if (error) throw error;
        return json(response, 200, { client: data });
      }
      const { data, error } = await db.from('clients').insert({ ...updates, points: 0 }).select().single();
      if (error) throw error;
      return json(response, 201, { client: data });
    }

    return json(response, 404, { error: 'Ruta no encontrada' });
  } catch (error) {
    if (!error?.statusCode && Number(error?.status)) error.statusCode = Number(error.status);
    return handleError(response, error, {
      fallbackMessage: 'Error en el servidor.',
      logLabel: 'api-public-router',
    });
  }
}
