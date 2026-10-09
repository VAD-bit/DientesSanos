import { getAdminClient } from '../../server/passkeys/supabaseAdmin.js';
import { handleError, json, requireMethod } from '../../server/passkeys/http.js';

// Menú de Panda Café para el portal público de reservas (bebida de cortesía).
// El rol anónimo no tiene SELECT sobre `inventory`, así que se expone por aquí con la
// llave de servicio, igual que /api/public/staff.
export default async function handler(request, response) {
  try {
    if (!requireMethod(request, response, ['GET'])) return;
    const { data, error } = await getAdminClient()
      
      .from('inventory')
      .select('id, name, price')
      .eq('inventory_type', 'cafe')
      .order('name');
    if (error) throw error;
    return json(response, 200, { items: data || [] });
  } catch (error) {
    return handleError(response, error, {
      fallbackMessage: 'No se pudo cargar el menú de Panda Café.',
      logLabel: 'public-cafe',
    });
  }
}
