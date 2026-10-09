import { getAdminClient } from '../../server/passkeys/supabaseAdmin.js';
import { handleError, json, requireMethod } from '../../server/passkeys/http.js';

// Exposes the manual "Abierta/Cerrada" toggle (system_settings.store_is_open) to the
// public site. The anon role has no SELECT on system_settings, so — same as
// /api/public/staff and /api/public/cafe — this reads it with the service key and
// fails OPEN on any error so a transient hiccup never blocks all bookings.
export default async function handler(request, response) {
  try {
    if (!requireMethod(request, response, ['GET'])) return;
    const { data, error } = await getAdminClient()
      
      .from('system_settings')
      .select('value')
      .eq('key', 'store_is_open')
      .maybeSingle();
    if (error) throw error;
    const isOpen = !data || String(data.value) !== 'false';
    return json(response, 200, { isOpen });
  } catch (error) {
    return handleError(response, error, {
      fallbackMessage: 'No se pudo consultar el estado de la barbería.',
      logLabel: 'public-store-status',
    });
  }
}
