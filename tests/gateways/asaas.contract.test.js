import test from "node:test";
import assert from "node:assert/strict";
import { createAsaas, AsaasError } from "../../app/gateways/Asaas.js";

const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, async json() { return body; } });
const payment = { id: "pay_ext_123", status: "PENDING", dueDate: "2026-08-10", secret: "discarded" };

test("Asaas creates customers and exposes only the controlled identifier", async () => {
  const calls = [], gateway = createAsaas({ baseUrl: "https://sandbox.asaas.com", apiKey: "runtime-secret",
    fetch: async (url, init) => { calls.push({ url, init }); return response({ id: "cus_ext_123", privateData: "discarded" }); } });
  assert.deepEqual(await gateway.createCustomer({ name: "Cliente", document: "00000000000",
    externalReference: "usr_123", idempotencyKey: "idem_123" }), { externalReference: "cus_ext_123" });
  assert.equal(calls[0].url, "https://sandbox.asaas.com/v3/customers");
  assert.equal(JSON.parse(calls[0].init.body).externalReference, "usr_123");
});

test("Asaas creates a charge with deterministic money and strips sensitive response fields", async () => {
  const calls = [], gateway = createAsaas({ baseUrl: "https://sandbox.asaas.com", apiKey: "runtime-secret", retries: 0,
    fetch: async (url, init) => { calls.push({ url, init }); return response(payment); } });
  const result = await gateway.createPayment({ customer: "cus_123", billingType: "PIX", amountMinor: 12345,
    currency: "BRL", dueDate: "2026-08-10", internalReference: "pay_internal", idempotencyKey: "hash-key" });
  assert.deepEqual(result, { externalReference: "pay_ext_123", status: "PENDING", dueDate: "2026-08-10" });
  assert.equal(JSON.parse(calls[0].init.body).value, "123.45");
  assert.equal(calls[0].init.headers["asaas-idempotency-key"], "hash-key");
});

test("CREDIT_CARD is only a billing type and sends no card, CVV, token or bank data", async () => {
  let body; const gateway = createAsaas({ baseUrl: "https://sandbox.asaas.com", apiKey: "runtime-secret",
    fetch: async (_url, init) => { body = JSON.parse(init.body); return response(payment); } });
  await gateway.createPayment({ customer: "cus_123", billingType: "CREDIT_CARD", amountMinor: 4990,
    currency: "BRL", dueDate: "2026-08-10", internalReference: "pay_internal", idempotencyKey: "hash-key" });
  assert.deepEqual(Object.keys(body).sort(), ["billingType", "customer", "dueDate", "externalReference", "value"]);
  assert.equal(body.billingType, "CREDIT_CARD");
  const { billingType, ...financialBody } = body;
  assert.equal(billingType, "CREDIT_CARD");
  assert.doesNotMatch(JSON.stringify(financialBody), /card|cvv|securityCode|holderInfo|token|bank/i);
});

test("createPayment retries with exactly the same key and body after timeout", async () => {
  const calls = []; let attempt = 0;
  const gateway = createAsaas({ baseUrl: "https://sandbox.asaas.com", apiKey: "runtime-secret", retries: 1,
    fetch: async (_url, init) => { calls.push(init); attempt += 1;
      if (attempt === 1) throw Object.assign(new Error("timeout"), { name: "AbortError" }); return response(payment); } });
  await gateway.createPayment({ customer: "cus_123", billingType: "PIX", amountMinor: 4990,
    dueDate: "2026-08-10", internalReference: "pay_internal", idempotencyKey: "hash-key" });
  assert.equal(calls.length, 2); assert.equal(calls[0].body, calls[1].body);
  assert.equal(calls[0].headers["asaas-idempotency-key"], calls[1].headers["asaas-idempotency-key"]);
});

test("Asaas retries HTTP 429 and 503 and normalizes the final failure", async () => {
  for (const status of [429, 503]) {
    let attempts = 0; const gateway = createAsaas({ baseUrl: "https://sandbox.asaas.com", apiKey: "runtime-secret", retries: 1,
      fetch: async () => { attempts += 1; return response({}, status); } });
    await assert.rejects(gateway.getPayment("pay_123"), (error) => error instanceof AsaasError && error.code === `HTTP_${status}` && error.retryable);
    assert.equal(attempts, 2);
  }
});

test("Asaas limits configured retries to two for network and timeout failures", async () => {
  let networkAttempts = 0; const network = createAsaas({ baseUrl: "https://sandbox.asaas.com", apiKey: "runtime-secret", retries: 99,
    fetch: async () => { networkAttempts += 1; throw new TypeError("network detail"); } });
  await assert.rejects(network.getPayment("pay_123"), (error) => error.code === "NETWORK_ERROR" && error.retryable);
  assert.equal(networkAttempts, 3);
  let timeoutAttempts = 0; const timeout = createAsaas({ baseUrl: "https://sandbox.asaas.com", apiKey: "runtime-secret", timeoutMs: 100, retries: 2,
    fetch: async (_url, init) => { timeoutAttempts += 1; return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error(), { name: "AbortError" })))); } });
  await assert.rejects(timeout.getPayment("pay_123"), (error) => error.code === "TIMEOUT"); assert.equal(timeoutAttempts, 3);
});

test("Asaas queries and cancels by validated identifier", async () => {
  const calls = [], gateway = createAsaas({ baseUrl: "https://sandbox.asaas.com", apiKey: "runtime-secret",
    fetch: async (url, init) => { calls.push({ url, init }); return response(payment); } });
  await gateway.getPayment("pay_ext_123"); await gateway.cancelPayment("pay_ext_123");
  assert.equal(calls[0].url.endsWith("/v3/payments/pay_ext_123"), true); assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[1].init.method, "DELETE");
  await assert.rejects(gateway.getPayment("../unsafe"), (error) => error.code === "INVALID_IDENTIFIER");
});

test("Asaas validates HTTPS configuration and closes normalized webhook payloads", () => {
  const gateway = createAsaas({ baseUrl: "https://sandbox.asaas.com", apiKey: "runtime-secret", fetch: async () => response({}) });
  assert.deepEqual(gateway.normalizeWebhook({ id: "evt_123", event: "PAYMENT_RECEIVED", dateCreated: "2026-08-04T12:00:00Z",
    payment: { id: "pay_123", value: 49.9 } }), { eventId: "evt_123", type: "PAYMENT_RECEIVED", externalReference: "pay_123", amountMinor: 4990, occurredAt: "2026-08-04T12:00:00Z" });
  assert.throws(() => gateway.normalizeWebhook({ id: "evt_123", event: "UNKNOWN", payment: { id: "pay_123", value: 1 } }), /Asaas operation failed/);
  assert.throws(() => gateway.normalizeWebhook({ id: "evt_123", event: "PAYMENT_RECEIVED", payment: { id: "pay_123", value: 1 }, extra: true }), /Asaas operation failed/);
  assert.throws(() => createAsaas({ baseUrl: "http://unsafe.test", apiKey: "x", fetch() {} }), TypeError);
});
