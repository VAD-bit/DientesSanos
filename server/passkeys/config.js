const DEFAULT_LOCAL_ORIGIN = 'http://localhost:5174';

export const getPasskeyConfig = (request) => {
  const forwardedHost = request?.headers?.['x-forwarded-host'];
  const host = forwardedHost || request?.headers?.host || 'localhost:5174';
  const protocol = request?.headers?.['x-forwarded-proto'] || (host.startsWith('localhost') ? 'http' : 'https');
  const requestOrigin = `${protocol}://${host}`;
  const origin = process.env.PASSKEY_ORIGIN || (host.startsWith('localhost') ? requestOrigin : null);
  const rpID = process.env.PASSKEY_RP_ID || (host.startsWith('localhost') ? 'localhost' : null);

  if (!origin || !rpID) {
    throw new Error('PASSKEY_ORIGIN y PASSKEY_RP_ID deben estar configurados');
  }

  return {
    rpName: process.env.PASSKEY_RP_NAME || 'Panda Barber',
    rpID,
    origin: origin || DEFAULT_LOCAL_ORIGIN,
  };
};

export const assertAllowedOrigin = (request, expectedOrigin) => {
  const origin = request?.headers?.origin;
  const method = String(request?.method || 'GET').toUpperCase();
  const requiresOrigin = method !== 'GET' && method !== 'HEAD';
  if ((requiresOrigin && !origin) || (origin && origin !== expectedOrigin)) {
    const error = new Error('Origen no autorizado');
    error.statusCode = 403;
    throw error;
  }
};
