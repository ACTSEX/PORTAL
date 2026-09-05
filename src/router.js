import { ASAAS_STATE, SERVICE } from './config.js';
import { json } from './response.js';
export function route(request) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/api/health') return json({ ok: true, service: SERVICE.name, version: SERVICE.version, asaasEnabled: ASAAS_STATE.habilitado });
  return json({ ok: false, code: 'NOT_IMPLEMENTED' }, 404);
}
