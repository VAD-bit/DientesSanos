import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getPasskeyConfig, assertAllowedOrigin } from '../../../server/passkeys/config.js';
import { handleError, json, requireMethod } from '../../../server/passkeys/http.js';
import { saveChallenge } from '../../../server/passkeys/store.js';
import { assertPasskeyRateLimit } from '../../../server/passkeys/rateLimit.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['POST'])) return;
  try {
    const config = getPasskeyConfig(request);
    assertAllowedOrigin(request, config.origin);
    const fingerprint = await assertPasskeyRateLimit(request, 'authentication');
    const options = await generateAuthenticationOptions({
      rpID: config.rpID,
      userVerification: 'required',
      allowCredentials: [],
    });
    const challengeId = await saveChallenge({ challenge: options.challenge, purpose: 'authentication', requestFingerprint: fingerprint });
    return json(response, 200, { options, challengeId });
  } catch (error) {
    return handleError(response, error);
  }
}
