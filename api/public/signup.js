import { getAdminClient } from '../../server/passkeys/supabaseAdmin.js';
import { handleError, json, parseBody, requireMethod } from '../../server/passkeys/http.js';

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Registro de cuentas del portal (público) con service role.
//
// Por qué existe: el signUp directo desde el navegador tenía tres bloqueos
// reales — (1) rate limit de correo de Supabase (429 tras un puñado de
// registros por hora por IP), (2) con "confirmar correo" activo en el
// proyecto, la respuesta no trae sesión, así que el flujo de registro
// chocaba después con los endpoints autenticados y dejaba usuarios huérfanos
// sin perfil, y (3) las cuentas que quedaban sin confirmar eran inutilizables:
// ni el registro ni el inicio de sesión podían con ellas. Con service role
// creamos (o reparamos) la cuenta ya confirmada, sin rate limit y sin
// depender de que el correo de confirmación llegue — necesario además
// porque los teléfonos generan direcciones sintéticas (@odontosonrisa.app)
// que nunca reciben correo.
export default async function handler(request, response) {
  try {
    if (!requireMethod(request, response, ['POST'])) return;
    const body = parseBody(request);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');

    if (!EMAIL_RE.test(email)) {
      throw Object.assign(new Error('Correo electrónico inválido.'), { statusCode: 400 });
    }
    if (password.length < 6) {
      throw Object.assign(new Error('La contraseña debe tener al menos 6 caracteres.'), { statusCode: 400 });
    }

    const admin = getAdminClient();
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    const existing = listed.users.find(user => normalizeEmail(user.email) === email);

    if (existing) {
      // La cuenta ya existe: solo garantizamos que el correo quede confirmado
      // para que el signIn con contraseña que viene después pueda funcionar.
      // (No tocamos la contraseña: si no coincide, el signIn dirá "contraseña
      // incorrecta" y el usuario usará el modo de ingreso existente.)
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
  } catch (error) {
    // Errores de la API de Auth (p. ej. contraseña débil) llegan con `status`
    // pero sin `statusCode`: los reenviamos para que handleError publique su
    // mensaje real en vez del fallback genérico.
    if (!error?.statusCode && Number(error?.status)) error.statusCode = Number(error.status);
    return handleError(response, error, {
      fallbackMessage: 'No se pudo crear la cuenta. Intenta de nuevo.',
      logLabel: 'public-signup',
    });
  }
}
