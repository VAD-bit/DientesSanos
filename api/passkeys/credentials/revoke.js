import { getPasskeyConfig, assertAllowedOrigin } from '../../../server/passkeys/config.js';
import { handleError, json, parseBody, requireMethod } from '../../../server/passkeys/http.js';
import { getAuthenticatedUser, getActiveStaff } from '../../../server/passkeys/supabaseAdmin.js';
import { revokeCredential } from '../../../server/passkeys/store.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['POST'])) return;
  try {
    const config = getPasskeyConfig(request);
    assertAllowedOrigin(request, config.origin);
    const authUser = await getAuthenticatedUser(request);
    await getActiveStaff(authUser.id);
    const body = parseBody(request);
    if (!body.credentialId) throw Object.assign(new Error('Selecciona un dispositivo'), { statusCode: 400 });
    await revokeCredential(body.credentialId, authUser.id);
    return json(response, 200, { revoked: true });
  } catch (error) {
    return handleError(response, error);
  }
}
