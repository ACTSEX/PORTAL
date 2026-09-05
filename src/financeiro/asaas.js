import { httpError } from '../auth/session.js';

export const ASAAS_DEFAULT_STATE = Object.freeze({ provedor: 'asaas', habilitado: false, ambiente: 'desativado', cobrancaAutomatica: false });
const BASE_URLS = Object.freeze({ sandbox: 'https://api-sandbox.asaas.com/v3', production: 'https://api.asaas.com/v3' });
const KNOWN_EVENTS = new Set(['PAYMENT_CREATED','PAYMENT_UPDATED','PAYMENT_CONFIRMED','PAYMENT_RECEIVED','PAYMENT_OVERDUE','PAYMENT_DELETED','PAYMENT_REFUNDED','PAYMENT_REFUND_IN_PROGRESS','PAYMENT_CHARGEBACK_REQUESTED','PAYMENT_CHARGEBACK_DISPUTE','PAYMENT_AWAITING_CHARGEBACK_REVERSAL']);

export function obterEstadoAsaas(env = {}) {
  const enabled = env.ASAAS_ENABLED === 'true';
  const ambiente = enabled && ['sandbox', 'production'].includes(env.ASAAS_ENV) ? env.ASAAS_ENV : 'desativado';
  return Object.freeze({ provedor: 'asaas', habilitado: enabled && ambiente !== 'desativado', ambiente, cobrancaAutomatica: enabled && env.ASAAS_AUTOMATIC_CHARGES === 'true' });
}

export class AsaasClient {
  constructor(env = {}, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
    this.state = obterEstadoAsaas(env); this.apiKey = env.ASAAS_API_KEY; this.fetchImpl = fetchImpl; this.timeoutMs = timeoutMs;
    if (this.state.habilitado && !this.apiKey) throw httpError(503, 'PAYMENTS_NOT_CONFIGURED');
  }
  async request(method, path, body, idempotencyKey) {
    if (!this.state.habilitado) throw httpError(503, 'PAYMENTS_DISABLED');
    if (!/^\/[A-Za-z0-9?&=._\/-]+$/.test(path)) throw httpError(400, 'PAYMENTS_PATH_INVALID');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${BASE_URLS[this.state.ambiente]}${path}`, { method, signal: controller.signal, headers: { access_token: this.apiKey, accept: 'application/json', 'content-type': 'application/json', ...(idempotencyKey ? { 'asaas-idempotency-key': idempotencyKey } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (!response.ok) throw httpError(502, 'PAYMENTS_PROVIDER_ERROR');
      return await response.json();
    } catch (error) { if (error.status) throw error; throw httpError(504, 'PAYMENTS_PROVIDER_UNAVAILABLE'); }
    finally { clearTimeout(timer); }
  }
  localizarCliente(cpfCnpj) { return this.request('GET', `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`); }
  criarCliente(data, key) { return this.request('POST', '/customers', data, key); }
  criarCobranca(data, key) { return this.request('POST', '/payments', data, key); }
  criarAssinatura(data, key) { return this.request('POST', '/subscriptions', data, key); }
  criarLink(data, key) { return this.request('POST', '/paymentLinks', data, key); }
  consultarCobranca(id) { return this.request('GET', `/payments/${safeId(id)}`); }
  pix(id) { return this.request('GET', `/payments/${safeId(id)}/pixQrCode`); }
  boleto(id) { return this.request('GET', `/payments/${safeId(id)}/identificationField`); }
  cancelar(id) { return this.request('DELETE', `/payments/${safeId(id)}`); }
  estornar(id, data, key, { allowRefund = false } = {}) { if (!allowRefund) throw httpError(403, 'REFUND_NOT_AUTHORIZED'); return this.request('POST', `/payments/${safeId(id)}/refund`, data, key); }
}

export async function processarWebhookAsaas(request, env, storage) {
  const state = obterEstadoAsaas(env); if (!state.habilitado) throw httpError(404, 'NOT_FOUND');
  const expected = env.ASAAS_WEBHOOK_TOKEN; const received = request.headers.get('asaas-access-token');
  if (!expected || !received || !constantTimeEqual(received, expected)) throw httpError(401, 'WEBHOOK_UNAUTHORIZED');
  const payload = await limitedJson(request, 128 * 1024);
  if (!payload || typeof payload.id !== 'string' || typeof payload.event !== 'string' || !payload.payment || typeof payload.payment.id !== 'string') throw httpError(400, 'WEBHOOK_INVALID');
  const key = `sistema/asaas/eventos/${safeId(payload.id)}.json`; const previous = await storage.get(key); if (previous) return { recebido: true, duplicado: true };
  const record = { schemaVersion: 2, eventId: payload.id, event: payload.event, paymentId: payload.payment.id, status: KNOWN_EVENTS.has(payload.event) ? 'pendente_conciliacao' : 'ignorado_desconhecido', recebidoEm: new Date().toISOString(), tentativas: 0 };
  try { await storage.put(key, record, { createOnly: true }); } catch (error) { if (error.code === 'REVISION_CONFLICT') return { recebido: true, duplicado: true }; throw error; }
  return { recebido: true, duplicado: false, reconhecido: KNOWN_EVENTS.has(payload.event) };
}

export async function reprocessarWebhook(storage, eventId, session) {
  if (session?.role !== 'SUPERADMIN') throw httpError(403, 'FORBIDDEN'); const key = `sistema/asaas/eventos/${safeId(eventId)}.json`; const event = await storage.get(key); if (!event) throw httpError(404, 'WEBHOOK_NOT_FOUND');
  const updated = { ...event, status: 'pendente_conciliacao', tentativas: (event.tentativas || 0) + 1, reprocessadoEm: new Date().toISOString() }; await storage.put(key, updated); return updated;
}
export function executarOperacaoAsaas(env, operation, options) { return operation(new AsaasClient(env, options)); }
function safeId(value) { if (!/^[A-Za-z0-9_-]{1,100}$/.test(String(value))) throw httpError(400, 'PAYMENTS_ID_INVALID'); return value; }
async function limitedJson(request, limit) { const declared = Number(request.headers.get('content-length') || 0); if (declared > limit) throw httpError(413, 'BODY_TOO_LARGE'); const text = await request.text(); if (new TextEncoder().encode(text).byteLength > limit) throw httpError(413, 'BODY_TOO_LARGE'); try { return JSON.parse(text); } catch { throw httpError(400, 'WEBHOOK_INVALID'); } }
function constantTimeEqual(a, b) { const aa = new TextEncoder().encode(a), bb = new TextEncoder().encode(b); let difference = aa.length ^ bb.length; for (let i = 0; i < Math.max(aa.length, bb.length); i++) difference |= (aa[i] || 0) ^ (bb[i] || 0); return difference === 0; }
