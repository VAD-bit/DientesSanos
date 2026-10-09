import { getAdminClient } from '../../server/passkeys/supabaseAdmin.js';
import { handleError, json, requireMethod } from '../../server/passkeys/http.js';

// Prizes for the birthday PrizeWheel, stored as service_extras rows whose name is
// prefixed 'ROULETTE_PRIZE:' (see dataService.addRoulettePrize). The anon role has
// no SELECT on service_extras, so — same as /api/public/staff and /api/public/cafe —
// this reads them with the service key.
export default async function handler(request, response) {
  try {
    if (!requireMethod(request, response, ['GET'])) return;
    const { data, error } = await getAdminClient()
      
      .from('service_extras')
      .select('id, name');
    if (error) throw error;
    const prizes = (data || []).filter(d => d.name && d.name.startsWith('ROULETTE_PRIZE:'));
    return json(response, 200, { prizes });
  } catch (error) {
    return handleError(response, error, {
      fallbackMessage: 'No se pudieron cargar los premios de la ruleta.',
      logLabel: 'public-roulette-prizes',
    });
  }
}
