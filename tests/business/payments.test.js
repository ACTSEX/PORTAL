import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createPayments } from "../../business/payments.js";

const now = "2026-08-04T12:00:00.000Z", clock = () => new Date(now);
const hash = async (value) => createHash("sha256").update(value).digest("hex");
const logger = () => ({ entries: [], info(message, context) { this.entries.push({ message, context }); } });
const bus = () => ({ published: [], async publish(event) { this.published.push(event); } });
const ids = () => { let value = 0; return () => String(++value).padStart(32, "0"); };
const payment = (changes = {}) => ({ id: "pay_existing", subscription_id: "sub_1", user_id: "usr_1",
  amount_minor: 4990, currency: "BRL", status: "pending", provider: "asaas",
  external_reference: "ext_existing", due_at: "2026-08-10", paid_at: null,
  external_updated_at: null, created_at: now, updated_at: now, ...changes });

class FinancialDb {
  constructor({ payments = [], integration = true } = {}) {
    this.records = new Map(); this.payments = new Map(payments.map((row) => [row.id, { ...row }]));
    this.integration = integration; this.calls = []; this.lastChanges = 0;
  }
  recordKey(scope, key) { return `${scope}:${key}`; }
  async first(sql, parameters) {
    this.calls.push({ sql, parameters });
    if (sql.includes("FROM integrations")) return this.integration ? { id: "int_1" } : null;
    if (sql.includes("JOIN plans")) return { id: "sub_1", user_id: "usr_1", status: "active", price_minor: 4990, currency: "BRL" };
    if (sql.includes("FROM idempotency_records")) return this.records.get(this.recordKey(parameters[0], parameters[1])) ?? null;
    if (sql.includes("external_reference = ?")) return [...this.payments.values()].find((row) => row.provider === parameters[0] && row.external_reference === parameters[1]) ?? null;
    if (sql.includes("WHERE p.id = ?")) return this.payments.get(parameters[0]) ?? null;
    return null;
  }
  async write(sql, parameters) {
    this.calls.push({ sql, parameters }); let changes = 0;
    if (sql.startsWith("INSERT OR IGNORE INTO idempotency_records")) {
      const [scope, key, requestHash, resourceType, resourceId, expiresAt, createdAt] = parameters;
      const index = this.recordKey(scope, key);
      if (!this.records.has(index)) { this.records.set(index, { request_hash: requestHash, response_status: null,
        resource_type: resourceType, resource_id: resourceId, expires_at: expiresAt, created_at: createdAt }); changes = 1; }
    } else if (sql.startsWith("UPDATE idempotency_records SET response_status = NULL")) {
      const [scope, key, requestHash] = parameters, row = this.records.get(this.recordKey(scope, key));
      if (row?.request_hash === requestHash && row.response_status === 202) { row.response_status = null; changes = 1; }
    } else if (sql.startsWith("UPDATE idempotency_records SET response_status")) {
      const [status, scope, key, requestHash] = parameters, row = this.records.get(this.recordKey(scope, key));
      if (row?.request_hash === requestHash && row.response_status === null) { row.response_status = status; changes = 1; }
    } else if (sql.startsWith("UPDATE payments SET status")) {
      const [status, updatedAt, id, expected] = parameters, row = this.payments.get(id);
      if (row?.status === expected) { row.status = status; row.updated_at = updatedAt; changes = 1; }
    }
    this.lastChanges = changes; return { meta: { changes } };
  }
  async batch(commands) {
    const results = [];
    for (const command of commands) {
      this.calls.push(command); let changes = 0;
      if (command.sql.startsWith("INSERT INTO payments")) {
        const p = command.parameters; this.payments.set(p[0], payment({ id: p[0], subscription_id: p[1], amount_minor: p[2],
          currency: p[3], status: p[4], provider: p[5], external_reference: p[6], due_at: p[7], created_at: p[8], updated_at: p[9] })); changes = 1;
      } else if (command.sql.startsWith("UPDATE payments")) {
        const p = command.parameters, row = this.payments.get(p[4]);
        if (row?.status === p[5] && (!row.external_updated_at || row.external_updated_at < p[6])) {
          Object.assign(row, { status: p[0], paid_at: p[1], external_updated_at: p[2], updated_at: p[3] }); changes = 1;
        }
      } else if (command.sql.includes("UPDATE idempotency_records")) {
        const p = command.parameters, webhook = command.sql.includes("SET response_status = ?, resource_id = ?"), offset = webhook ? 2 : 1;
        const row = this.records.get(this.recordKey(p[offset], p[offset + 1]));
        if (this.lastChanges === 1 && row?.request_hash === p[offset + 2] && row.response_status === null) {
          row.response_status = p[0]; if (webhook) row.resource_id = p[1]; changes = 1;
        }
      }
      this.lastChanges = changes; results.push({ meta: { changes } });
    }
    return results;
  }
  async all(sql, parameters) { this.calls.push({ sql, parameters }); return { results: [...this.payments.values()] }; }
}

function gateway(overrides = {}) {
  return { creates: [], cancels: 0, async createPayment(request) { this.creates.push(structuredClone(request));
    return { externalReference: `ext_${request.internalReference}`, status: "PENDING" }; },
  async getPayment(reference) { return { externalReference: reference, status: "PENDING" }; },
  async cancelPayment() { this.cancels += 1; return { status: "DELETED" }; }, ...overrides };
}
const service = (db, remote = gateway(), extra = {}) => createPayments({ db, events: extra.events ?? bus(),
  logger: extra.logger ?? logger(), gateway: remote, id: ids(), hash, clock,
  wait: extra.wait ?? (() => new Promise((resolve) => setTimeout(resolve, 1))) });
const input = (changes = {}) => ({ subscriptionId: "sub_1", billingType: "PIX", dueDate: "2026-08-10",
  customerReference: "cus_123", idempotencyKey: "payment-key-1", ...changes });

test("plan value and currency are sent to the gateway while client financial fields are rejected", async () => {
  const db = new FinancialDb(), remote = gateway(), payments = service(db, remote);
  await assert.rejects(payments.create(input({ amountMinor: 1 }), { userId: "usr_1" }), (error) => error.code === "INVALID_INPUT");
  await assert.rejects(payments.create(input({ currency: "USD" }), { userId: "usr_1" }), (error) => error.code === "INVALID_INPUT");
  const result = await payments.create(input(), { userId: "usr_1" });
  assert.equal(result.amountMinor, 4990); assert.equal(result.currency, "BRL");
  assert.equal(remote.creates[0].amountMinor, 4990); assert.equal(remote.creates[0].currency, "BRL");
});

test("sequential replay returns the persisted payment without a second external call", async () => {
  const db = new FinancialDb(), remote = gateway(), payments = service(db, remote);
  const first = await payments.create(input(), { userId: "usr_1" });
  const second = await payments.create(input(), { userId: "usr_1" });
  assert.equal(second.id, first.id); assert.equal(remote.creates.length, 1);
});

test("same owner key with different payload conflicts and the same raw key is scoped by owner", async () => {
  const db = new FinancialDb(), payments = service(db);
  await payments.create(input(), { userId: "usr_1" });
  await assert.rejects(payments.create(input({ dueDate: "2026-08-11" }), { userId: "usr_1" }), (error) => error.code === "IDEMPOTENCY_CONFLICT");
  await assert.rejects(payments.create(input(), { userId: "usr_2" }), (error) => error.code === "FORBIDDEN");
  const hashes = [...db.records.keys()].map((key) => key.split(":").at(-1));
  assert.ok(hashes.every((value) => value !== "payment-key-1"));
});

test("persistent reservation elects one concurrent winner and produces one deterministic request", async () => {
  const db = new FinancialDb(); let release; const barrier = new Promise((resolve) => { release = resolve; });
  const remote = gateway({ async createPayment(request) { this.creates.push(structuredClone(request)); await barrier;
    return { externalReference: `ext_${request.internalReference}`, status: "PENDING" }; } });
  const payments = service(db, remote, { wait: () => new Promise((resolve) => setTimeout(resolve, 5)) });
  const first = payments.create(input(), { userId: "usr_1" }), second = payments.create(input(), { userId: "usr_1" });
  await new Promise((resolve) => setTimeout(resolve, 10)); assert.equal(remote.creates.length, 1); release();
  const results = await Promise.all([first, second]);
  assert.equal(results[0].id, results[1].id); assert.equal(remote.creates.length, 1);
  assert.equal(results[0].id, remote.creates[0].internalReference);
});

test("ambiguous timeout preserves reservation and repeats the identical semantic POST without another charge", async () => {
  const db = new FinancialDb(), external = new Map(); let calls = 0;
  const remote = gateway({ async createPayment(request) { this.creates.push(structuredClone(request)); calls += 1;
    if (!external.has(request.idempotencyKey)) external.set(request.idempotencyKey, { externalReference: `ext_${request.internalReference}`, status: "PENDING" });
    if (calls === 1) throw Object.assign(new Error("timeout"), { retryable: true }); return external.get(request.idempotencyKey); } });
  const payments = service(db, remote);
  await assert.rejects(payments.create(input(), { userId: "usr_1" }), (error) => error.code === "EXTERNAL_RESULT_UNKNOWN");
  const reservation = [...db.records.values()][0]; assert.equal(reservation.response_status, 202);
  const recovered = await payments.create(input(), { userId: "usr_1" });
  assert.equal(external.size, 1); assert.equal(db.payments.size, 1); assert.equal(reservation.response_status, 201);
  assert.deepEqual(remote.creates[0], remote.creates[1]); assert.equal(recovered.id, remote.creates[0].internalReference);
});

test("webhook duplicate and divergent reuse are deduplicated before financial effects", async () => {
  const db = new FinancialDb({ payments: [payment()] }), events = bus(), payments = service(db, gateway(), { events });
  const event = { eventId: "evt_external_1", type: "PAYMENT_RECEIVED", externalReference: "ext_existing", amountMinor: 4990, occurredAt: "2026-08-04T12:01:00Z" };
  assert.equal((await payments.processWebhook(event, { internal: true })).status, "paid");
  assert.equal((await payments.processWebhook(event, { internal: true })).duplicate, true);
  await assert.rejects(payments.processWebhook({ ...event, amountMinor: 5000 }, { internal: true }), (error) => error.code === "IDEMPOTENCY_CONFLICT");
  assert.equal(events.published.length, 1);
});

test("webhook rejects stale, mismatched, missing and invalid references without events", async () => {
  const row = payment({ status: "paid", external_updated_at: "2026-08-04T12:05:00Z" });
  for (const [event, code] of [
    [{ eventId: "evt_stale_1", type: "PAYMENT_OVERDUE", externalReference: "ext_existing", amountMinor: 4990, occurredAt: "2026-08-04T12:04:00Z" }, "STALE_EVENT"],
    [{ eventId: "evt_amount_1", type: "PAYMENT_REFUNDED", externalReference: "ext_existing", amountMinor: 5000, occurredAt: "2026-08-04T12:06:00Z" }, "AMOUNT_MISMATCH"],
    [{ eventId: "evt_missing_1", type: "PAYMENT_RECEIVED", externalReference: "ext_missing", amountMinor: 4990, occurredAt: "2026-08-04T12:06:00Z" }, "NOT_FOUND"],
    [{ eventId: "evt_invalid_1", type: "PAYMENT_RECEIVED", externalReference: "x", amountMinor: 4990, occurredAt: "2026-08-04T12:06:00Z" }, "FORBIDDEN"],
  ]) { const events = bus(); await assert.rejects(service(new FinancialDb({ payments: [row] }), gateway(), { events }).processWebhook(event, { internal: true }), (error) => error.code === code); assert.equal(events.published.length, 0); }
});

test("webhook supports paid to refunded and protects paid, refunded and canceled from invalid transitions", async () => {
  const paidDb = new FinancialDb({ payments: [payment({ status: "paid", external_updated_at: "2026-08-04T12:01:00Z" })] });
  const payments = service(paidDb);
  const refund = { eventId: "evt_refund_1", type: "PAYMENT_REFUNDED", externalReference: "ext_existing", amountMinor: 4990, occurredAt: "2026-08-04T12:02:00Z" };
  assert.equal((await payments.processWebhook(refund, { internal: true })).status, "refunded");
  for (const status of ["refunded", "canceled"]) {
    const event = { eventId: `evt_terminal_${status}`, type: "PAYMENT_RECEIVED", externalReference: "ext_existing", amountMinor: 4990, occurredAt: "2026-08-04T12:03:00Z" };
    await assert.rejects(service(new FinancialDb({ payments: [payment({ status })] })).processWebhook(event, { internal: true }), (error) => error.code === "STALE_EVENT");
  }
});

test("zero-row and concurrent webhook updates do not emit or mark the event applied", async () => {
  const db = new FinancialDb({ payments: [payment()] }), events = bus();
  const original = db.batch.bind(db); db.batch = async (commands) => { db.payments.get("pay_existing").status = "paid"; return original(commands); };
  const event = { eventId: "evt_race_1", type: "PAYMENT_RECEIVED", externalReference: "ext_existing", amountMinor: 4990, occurredAt: "2026-08-04T12:02:00Z" };
  await assert.rejects(service(db, gateway(), { events }).processWebhook(event, { internal: true }), (error) => error.code === "CONCURRENT_TRANSITION");
  assert.equal(events.published.length, 0); assert.equal([...db.records.values()][0].response_status, 409);
});

test("cancel is idempotent, owner protected, and rejects incompatible state", async () => {
  const remote = gateway(), db = new FinancialDb({ payments: [payment()] }), payments = service(db, remote);
  assert.equal((await payments.cancel("pay_existing", { userId: "usr_1" })).status, "canceled");
  assert.equal((await payments.cancel("pay_existing", { userId: "usr_1" })).status, "canceled"); assert.equal(remote.cancels, 1);
  await assert.rejects(service(new FinancialDb({ payments: [payment()] })).cancel("pay_existing", { userId: "usr_2" }), (error) => error.code === "FORBIDDEN");
  await assert.rejects(service(new FinancialDb({ payments: [payment({ status: "paid" })] })).cancel("pay_existing", { userId: "usr_1" }), (error) => error.code === "INVALID_TRANSITION");
});

test("private pagination is owner protected and bounded", async () => {
  const db = new FinancialDb({ payments: [payment()] });
  assert.equal((await service(db).list({ pageSize: 100 }, { userId: "usr_1" })).pageSize, 50);
  await assert.rejects(service(db).list(), (error) => error.code === "FORBIDDEN");
});

test("captured financial logs and events contain no secrets, raw keys, PII or provider payload", async () => {
  const db = new FinancialDb(), remote = gateway(), events = bus(), logs = logger();
  await service(db, remote, { events, logger: logs }).create(input(), { userId: "usr_1", correlationId: "cor_1" });
  const output = JSON.stringify({ logs: logs.entries, events: events.published });
  for (const sensitive of ["payment-key-1", "api-key", "cpfCnpj", "email", "phone", "cardNumber", "cvv", "access_token", "https://"])
    assert.doesNotMatch(output, new RegExp(sensitive, "i"));
  assert.doesNotMatch(output, /4990|BRL|cus_123|ext_pay/);
});

test("financial production boundary uses D1 only and does not start later lots", async () => {
  const files = ["business/payments.js"];
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(source, /process\.env|Publisher|publication_jobs|CityPublication|\bKV\b|\bR2\b|Stripe|Mercado Pago|PagSeguro/);
  assert.match(source, /idempotency_records/);
});
