const PAYMENT_METHODS = new Set(["BOLETO", "CREDIT_CARD", "PIX"]);
const EVENTS = new Set([
  "PAYMENT_CREATED",
  "PAYMENT_UPDATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
]);

export class AsaasError extends Error {
  constructor(code, retryable = false) {
    super("Asaas operation failed");
    this.name = "AsaasError";
    this.code = code;
    this.retryable = retryable;
  }
}

function configuration(options) {
  const url = new URL(options?.baseUrl ?? "");
  if (url.protocol !== "https:" || !options?.apiKey || typeof options.fetch !== "function")
    throw new TypeError("Invalid Asaas configuration");
  return { url: url.toString().replace(/\/$/, ""), apiKey: options.apiKey, fetch: options.fetch,
    timeoutMs: Math.min(Math.max(options.timeoutMs ?? 5000, 100), 15000), retries: Math.min(Math.max(options.retries ?? 1, 0), 2) };
}

const identifier = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{3,100}$/.test(value);
const money = (minor) => {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new AsaasError("INVALID_AMOUNT");
  return `${Math.trunc(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
};
const minorUnits = (value) => {
  const match = String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new AsaasError("INVALID_WEBHOOK");
  const amount = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(amount)) throw new AsaasError("INVALID_WEBHOOK");
  return amount;
};
const paymentView = (value) => {
  if (!identifier(value?.id) || typeof value.status !== "string") throw new AsaasError("INVALID_RESPONSE");
  return Object.freeze({ externalReference: value.id, status: value.status, dueDate: value.dueDate ?? null });
};

export function createAsaas(options = {}) {
  const config = configuration(options);
  async function request(path, { method = "GET", body, idempotencyKey } = {}) {
    let attempt = 0;
    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const response = await config.fetch(`${config.url}${path}`, { method, signal: controller.signal,
          headers: { accept: "application/json", "content-type": "application/json", access_token: config.apiKey,
            ...(idempotencyKey ? { "asaas-idempotency-key": idempotencyKey } : {}) }, body: body ? JSON.stringify(body) : undefined });
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          if (retryable && attempt++ < config.retries) continue;
          throw new AsaasError(`HTTP_${response.status}`, retryable);
        }
        return await response.json();
      } catch (error) {
        const retryable = error?.name === "AbortError" || error instanceof TypeError;
        if (retryable && attempt++ < config.retries) continue;
        if (error instanceof AsaasError) throw error;
        throw new AsaasError(error?.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR", retryable);
      } finally { clearTimeout(timer); }
    }
  }
  async function createCustomer(input) {
    if (!input?.name || !input?.externalReference) throw new AsaasError("INVALID_CUSTOMER");
    const value = await request("/v3/customers", { method: "POST", idempotencyKey: input.idempotencyKey,
      body: { name: input.name, cpfCnpj: input.document, externalReference: input.externalReference } });
    if (!identifier(value?.id)) throw new AsaasError("INVALID_RESPONSE");
    return Object.freeze({ externalReference: value.id });
  }
  async function createPayment(input) {
    if (!identifier(input?.customer) || !PAYMENT_METHODS.has(input.billingType) || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate))
      throw new AsaasError("INVALID_PAYMENT");
    return paymentView(await request("/v3/payments", { method: "POST", idempotencyKey: input.idempotencyKey,
      body: { customer: input.customer, billingType: input.billingType, value: money(input.amountMinor),
        dueDate: input.dueDate, externalReference: input.internalReference } }));
  }
  const getPayment = async (externalReference) => {
    if (!identifier(externalReference)) throw new AsaasError("INVALID_IDENTIFIER");
    return paymentView(await request(`/v3/payments/${encodeURIComponent(externalReference)}`));
  };
  const cancelPayment = async (externalReference) => {
    if (!identifier(externalReference)) throw new AsaasError("INVALID_IDENTIFIER");
    return paymentView(await request(`/v3/payments/${encodeURIComponent(externalReference)}`, { method: "DELETE" }));
  };
  function normalizeWebhook(payload) {
    if (!payload || Object.keys(payload).some((key) => !["id", "event", "dateCreated", "payment"].includes(key))
      || !identifier(payload.id) || !EVENTS.has(payload.event) || !identifier(payload.payment?.id)) throw new AsaasError("INVALID_WEBHOOK");
    return Object.freeze({ eventId: payload.id, type: payload.event, externalReference: payload.payment.id,
      amountMinor: minorUnits(payload.payment.value), occurredAt: payload.dateCreated ?? null });
  }
  return Object.freeze({ createCustomer, createPayment, getPayment, cancelPayment, normalizeWebhook,
    paymentMethods: PAYMENT_METHODS, webhookEvents: EVENTS });
}
