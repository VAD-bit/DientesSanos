import { getPasskeyConfig, assertAllowedOrigin } from '../../../server/passkeys/config.js';
import { handleError, json, requireMethod } from '../../../server/passkeys/http.js';
import { getAuthenticatedUser, getActiveStaff } from '../../../server/passkeys/supabaseAdmin.js';
import { listCredentials } from '../../../server/passkeys/store.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET'])) return;
  try {
    const config = getPasskeyConfig(request);
    assertAllowedOrigin(request, config.origin);
    const authUser = await getAuthenticatedUser(request);
    await getActiveStaff(authUser.id);
    const credentials = await listCredentials(authUser.id);
    return json(response, 200, {
      credentials: credentials.map((credential) => ({
        id: credential.id,
        name: credential.name,
        device_type: credential.device_type,
        backed_up: credential.backed_up,
        transports: credential.transports,
        created_at: credential.created_at,
        last_used_at: credential.last_used_at,
        revoked_at: credential.revoked_at,
      })),
    });
  } catch (error) {
    return handleError(response, error);
  }
}
