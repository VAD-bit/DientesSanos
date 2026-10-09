export const json = (response, status, payload) => {
  response.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  return response.json(payload);
};

export const requireMethod = (request, response, allowed) => {
  if (allowed.includes(request.method)) return true;
  response.setHeader('Allow', allowed.join(', '));
  json(response, 405, { error: 'Método no permitido' });
  return false;
};

export const parseBody = (request) => {
  if (!request.body) return {};
  if (typeof request.body === 'string') {
    if (request.body.length > 100_000) throw Object.assign(new Error('Solicitud demasiado grande'), { statusCode: 413 });
    return JSON.parse(request.body);
  }
  return request.body;
};

export const handleError = (response, error, options = {}) => {
  const status = Number(error?.statusCode) || 500;
  const fallbackMessage = options.fallbackMessage || 'No se pudo completar la operación biométrica';
  const logLabel = options.logLabel || 'passkeys';
  const publicMessage = status >= 500 ? fallbackMessage : error.message;
  if (status >= 500) console.error(`[${logLabel}]`, error?.message || error);
  return json(response, status, { error: publicMessage });
};
