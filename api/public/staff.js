import { getAdminClient } from '../../server/passkeys/supabaseAdmin.js';
import { handleError, json, requireMethod } from '../../server/passkeys/http.js';
import { isBookableStaff } from '../../src/utils/staffRoles.js';

export default async function handler(request, response) {
  try {
    if (!requireMethod(request, response, ['GET'])) return;
    const { data, error } = await getAdminClient()
      
      .from('staff')
      .select('id, name, role, image_url, active, specialty, badge, biography, phone, video_url, show_on_landing')
      .eq('active', true)
      .eq('show_on_landing', true)
      .not('role', 'like', 'ARCHIVED|%')
      .order('name');
    if (error) throw error;
    return json(response, 200, { staff: (data || []).filter(isBookableStaff) });
  } catch (error) {
    return handleError(response, error, {
      fallbackMessage: 'No se pudo cargar el equipo.',
      logLabel: 'public-staff',
    });
  }
}
