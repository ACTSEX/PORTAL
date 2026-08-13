const PaymentsScope = (() => {
const PROVIDER = "asaas";
const METHODS = new Set(["BOLETO", "CREDIT_CARD", "PIX"]);
const TRANSITIONS = Object.freeze({
  pending: new Set(["paid", "failed", "canceled"]),
  failed: new Set(["paid", "canceled"]),
  paid: new Set(["refunded"]),
  refunded: new Set(),
  canceled: new Set(),
});
const WEBHOOK_STATUS = Object.freeze({ PAYMENT_CREATED: "pending", PAYMENT_UPDATED: "pending",
  PAYMENT_CONFIRMED: "paid", PAYMENT_RECEIVED: "paid", PAYMENT_OVERDUE: "failed",
  PAYMENT_DELETED: "canceled", PAYMENT_REFUNDED: "refunded" });
const CREATE_SCOPE = "payments.create";
const WEBHOOK_SCOPE = "payments.webhook";

class PaymentsError extends Error {
  constructor(code) { super("Payment operation failed"); this.name = "PaymentsError"; this.code = code; }
}

const changed = (result) => Number(result?.meta?.changes ?? 0) === 1;
const view = (row) => row && Object.freeze({ id: row.id, subscriptionId: row.subscription_id,
  amountMinor: row.amount_minor, currency: row.currency, status: row.status, provider: row.provider,
  externalReference: row.external_reference, dueAt: row.due_at, paidAt: row.paid_at,
  createdAt: row.created_at, updatedAt: row.updated_at });
const own = (row, context) => {
  if (!row) throw new PaymentsError("NOT_FOUND");
  if (context?.isAdmin !== true && (!context?.userId || row.user_id !== context.userId))
    throw new PaymentsError("FORBIDDEN");
};
const validKey = (value) => typeof value === "string" && value.length >= 8 && value.length <= 128;
const validDate = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));
const validDueDate = (value, now) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "")
  && Date.parse(`${value}T23:59:59Z`) >= now.getTime();

function createPayments({ db, events, logger, gateway, id, hash, clock = () => new Date(), wait = () => Promise.resolve() } = {}) {
  if (!db?.first || !db?.write || !db?.all || !db?.batch || !events?.publish || !logger?.info
    || !gateway?.createPayment || !gateway?.getPayment || !gateway?.cancelPayment || !id || !hash)
    throw new TypeError("Invalid Payments dependencies");
  const emit = (name, paymentId, context, payload = {}) => events.publish({ name, version: "1.0",
    source: "Payments", id: `evt_${id()}`, occurredAt: clock().toISOString(),
    payload: { paymentId, ...payload }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
  const find = (paymentId) => db.first("SELECT p.*, s.user_id FROM payments p JOIN subscriptions s ON s.id = p.subscription_id WHERE p.id = ?", [paymentId]);
  async function get(paymentId, context = {}) { const row = await find(paymentId); own(row, context); return view(row); }
  async function terms(subscriptionId, context) {
    const row = await db.first("SELECT s.id, s.user_id, s.status, p.price_minor, p.currency FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.id = ?", [subscriptionId]);
    own(row, context);
    if (!["pending", "active", "past_due"].includes(row.status)) throw new PaymentsError("INVALID_SUBSCRIPTION");
    return row;
  }
  async function record(scope, keyHash) {
    return db.first("SELECT request_hash, response_status, resource_id FROM idempotency_records WHERE scope = ? AND idempotency_key_hash = ?", [scope, keyHash]);
  }
  async function awaitResult(keyHash, requestHash, context) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const current = await record(CREATE_SCOPE, keyHash);
      if (current?.request_hash !== requestHash) throw new PaymentsError("IDEMPOTENCY_CONFLICT");
      if (current?.response_status === 201) return get(current.resource_id, context);
      if (current?.response_status === 202) return null;
      await wait(10);
    }
    throw new PaymentsError("OPERATION_IN_PROGRESS");
  }
  async function reserve(keyHash, requestHash, paymentId, now) {
    const result = await db.write("INSERT OR IGNORE INTO idempotency_records (scope, idempotency_key_hash, request_hash, response_status, resource_type, resource_id, expires_at, created_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?)",
      [CREATE_SCOPE, keyHash, requestHash, "payment", paymentId, new Date(clock().getTime() + 2592000000).toISOString(), now]);
    if (changed(result)) return true;
    const current = await record(CREATE_SCOPE, keyHash);
    if (!current || current.request_hash !== requestHash || current.resource_id !== paymentId)
      throw new PaymentsError("IDEMPOTENCY_CONFLICT");
    if (current.response_status !== 202) return false;
    return changed(await db.write("UPDATE idempotency_records SET response_status = NULL WHERE scope = ? AND idempotency_key_hash = ? AND request_hash = ? AND response_status = ?",
      [CREATE_SCOPE, keyHash, requestHash, 202]));
  }
  async function complete(paymentId, data, keyHash, requestHash, external, now) {
    const results = await db.batch([{ sql: "INSERT INTO payments (id, subscription_id, amount_minor, currency, status, provider, external_reference, due_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      parameters: [paymentId, data.id, data.price_minor, data.currency, "pending", PROVIDER, external.externalReference, data.dueDate, now, now] },
    { sql: "UPDATE idempotency_records SET response_status = ? WHERE scope = ? AND idempotency_key_hash = ? AND request_hash = ? AND resource_id = ? AND response_status IS NULL AND changes() = 1",
      parameters: [201, CREATE_SCOPE, keyHash, requestHash, paymentId] }]);
    if (!changed(results[0]) || !changed(results[1])) throw new PaymentsError("PERSISTENCE_CONFLICT");
  }
  async function create(input, context = {}) {
    if (!input || Object.keys(input).some((key) => !["subscriptionId", "billingType", "dueDate", "customerReference", "idempotencyKey"].includes(key))
      || !METHODS.has(input.billingType) || !validDueDate(input.dueDate, clock()) || !validKey(input.idempotencyKey))
      throw new PaymentsError("INVALID_INPUT");
    if (!await db.first("SELECT id FROM integrations WHERE provider = ? AND status = ?", [PROVIDER, "active"]))
      throw new PaymentsError("INTEGRATION_UNAVAILABLE");
    const data = await terms(input.subscriptionId, context);
    const keyHash = await hash(`${context.userId}:${input.idempotencyKey}`);
    const requestHash = await hash(JSON.stringify([context.userId, data.id, data.price_minor, data.currency,
      input.billingType, input.dueDate, input.customerReference]));
    const paymentId = `pay_${(await hash(`${CREATE_SCOPE}:${context.userId}:${keyHash}`)).slice(0, 32)}`;
    const now = clock().toISOString(), winner = await reserve(keyHash, requestHash, paymentId, now);
    if (!winner) { const existing = await awaitResult(keyHash, requestHash, context); if (existing) return existing;
      if (!await reserve(keyHash, requestHash, paymentId, now)) throw new PaymentsError("OPERATION_IN_PROGRESS"); }
    const request = { customer: input.customerReference, billingType: input.billingType,
      amountMinor: data.price_minor, currency: data.currency, dueDate: input.dueDate,
      internalReference: paymentId, idempotencyKey: keyHash };
    let external;
    try { external = await gateway.createPayment(request); }
    catch (error) {
      await db.write("UPDATE idempotency_records SET response_status = ? WHERE scope = ? AND idempotency_key_hash = ? AND request_hash = ? AND resource_id = ? AND response_status IS NULL",
        [error?.retryable ? 202 : 409, CREATE_SCOPE, keyHash, requestHash, paymentId]);
      throw new PaymentsError(error?.retryable ? "EXTERNAL_RESULT_UNKNOWN" : "GATEWAY_ERROR");
    }
    await complete(paymentId, { ...data, dueDate: input.dueDate }, keyHash, requestHash, external, now);
    logger.info("Payment created", { operation: "payments.create", entityId: paymentId, status: "pending", correlationId: context.correlationId });
    await emit("PaymentCreated", paymentId, context, { subscriptionId: data.id });
    return get(paymentId, context);
  }
  async function cancel(paymentId, context = {}) {
    const row = await find(paymentId); own(row, context);
    if (row.status === "canceled") return view(row);
    if (!TRANSITIONS[row.status]?.has("canceled")) throw new PaymentsError("INVALID_TRANSITION");
    await gateway.cancelPayment(row.external_reference);
    const result = await db.write("UPDATE payments SET status = ?, updated_at = ? WHERE id = ? AND status = ?",
      ["canceled", clock().toISOString(), row.id, row.status]);
    if (!changed(result)) throw new PaymentsError("CONCURRENT_TRANSITION");
    await emit("PaymentCanceled", row.id, context, { from: row.status, to: "canceled", subscriptionId: row.subscription_id });
    return view({ ...row, status: "canceled" });
  }
  async function reconcile(paymentId, context = {}) {
    const row = await find(paymentId); own(row, context);
    return Object.freeze({ payment: view(row), externalStatus: (await gateway.getPayment(row.external_reference)).status });
  }
  async function rejectWebhook(keyHash, requestHash, code) {
    await db.write("UPDATE idempotency_records SET response_status = ? WHERE scope = ? AND idempotency_key_hash = ? AND request_hash = ? AND response_status IS NULL", [409, WEBHOOK_SCOPE, keyHash, requestHash]);
    throw new PaymentsError(code);
  }
  async function processWebhook(event, context = {}) {
    if (context.internal !== true || !event || !WEBHOOK_STATUS[event.type] || !validKey(event.eventId)
      || !validKey(event.externalReference) || !Number.isSafeInteger(event.amountMinor) || !validDate(event.occurredAt))
      throw new PaymentsError("FORBIDDEN");
    const keyHash = await hash(event.eventId), requestHash = await hash(JSON.stringify(event)), now = clock().toISOString();
    const reservation = await db.write("INSERT OR IGNORE INTO idempotency_records (scope, idempotency_key_hash, request_hash, response_status, resource_type, resource_id, expires_at, created_at) VALUES (?, ?, ?, NULL, ?, NULL, ?, ?)",
      [WEBHOOK_SCOPE, keyHash, requestHash, "payment", new Date(clock().getTime() + 7776000000).toISOString(), now]);
    if (!changed(reservation)) {
      const seen = await record(WEBHOOK_SCOPE, keyHash);
      if (!seen || seen.request_hash !== requestHash) throw new PaymentsError("IDEMPOTENCY_CONFLICT");
      return Object.freeze({ duplicate: true, applied: seen.response_status === 200, paymentId: seen.resource_id });
    }
    const row = await db.first("SELECT p.*, s.user_id FROM payments p JOIN subscriptions s ON s.id = p.subscription_id WHERE p.provider = ? AND p.external_reference = ?", [PROVIDER, event.externalReference]);
    if (!row) return rejectWebhook(keyHash, requestHash, "NOT_FOUND");
    if (row.amount_minor !== event.amountMinor) return rejectWebhook(keyHash, requestHash, "AMOUNT_MISMATCH");
    const target = WEBHOOK_STATUS[event.type];
    if (row.external_updated_at && Date.parse(event.occurredAt) <= Date.parse(row.external_updated_at))
      return rejectWebhook(keyHash, requestHash, "STALE_EVENT");
    if (row.status !== target && !TRANSITIONS[row.status]?.has(target)) return rejectWebhook(keyHash, requestHash, "STALE_EVENT");
    const paidAt = target === "paid" ? now : row.paid_at;
    const results = await db.batch([{ sql: "UPDATE payments SET status = ?, paid_at = ?, external_updated_at = ?, updated_at = ? WHERE id = ? AND status = ? AND (external_updated_at IS NULL OR external_updated_at < ?)",
      parameters: [target, paidAt, event.occurredAt, now, row.id, row.status, event.occurredAt] },
    { sql: "UPDATE idempotency_records SET response_status = ?, resource_id = ? WHERE scope = ? AND idempotency_key_hash = ? AND request_hash = ? AND response_status IS NULL AND changes() = 1",
      parameters: [200, row.id, WEBHOOK_SCOPE, keyHash, requestHash] }]);
    if (!changed(results[0]) || !changed(results[1])) return rejectWebhook(keyHash, requestHash, "CONCURRENT_TRANSITION");
    const names = { paid: "PaymentReceived", failed: "PaymentFailed", canceled: "PaymentCanceled", refunded: "PaymentRefunded", pending: "PaymentUpdated" };
    await emit(names[target], row.id, context, { from: row.status, to: target, subscriptionId: row.subscription_id });
    return Object.freeze({ duplicate: false, applied: true, paymentId: row.id, status: target });
  }
  async function list(input = {}, context = {}) {
    if (!context.userId) throw new PaymentsError("FORBIDDEN");
    const page = Math.max(1, Number(input.page) || 1), pageSize = Math.min(50, Math.max(1, Number(input.pageSize) || 20));
    if (input.status && !Object.hasOwn(TRANSITIONS, input.status)) throw new PaymentsError("INVALID_FILTER");
    const status = input.status ?? null;
    const result = await db.all("SELECT p.* FROM payments p JOIN subscriptions s ON s.id = p.subscription_id WHERE s.user_id = ? AND (? IS NULL OR p.status = ?) ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?",
      [context.userId, status, status, pageSize, (page - 1) * pageSize]);
    return Object.freeze({ items: Object.freeze(result.results.map(view)), page, pageSize });
  }
  return Object.freeze({ create, get, list, cancel, reconcile, processWebhook, transitions: TRANSITIONS, methods: METHODS });
}

return { PaymentsError, createPayments };
})();
export const { PaymentsError, createPayments } = PaymentsScope;
