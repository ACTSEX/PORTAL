import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoosts, BoostsError } from '../../business/boosts.js';

const clock = () => new Date('2026-08-14T12:00:00.000Z');
function setup({ plan = 'premium', account = 'active', gatewayFails = false } = {}) {
  const state = { boosts: new Map(), idempotency: new Map(), payments: new Map(), charges: [], queue: [] };
  const db = {
    async first(sql, params) {
      if (sql.includes('FROM listings l JOIN users')) return { id: 'listing_1', slug: 'ana', city_id: 'city_1', city_slug: 'londrina', subscription_id: 'sub_1', customer_reference: 'cus_1', plan_code: plan, user_status: account };
      if (sql.includes('idempotency_records')) return state.idempotency.get(params[0]) ?? null;
      if (sql.includes('FROM boosts b LEFT JOIN')) { const boost = state.boosts.get(params[0]); return boost && { ...boost, payment_status: state.payments.get(boost.payment_id)?.status }; }
      if (sql.includes('FROM boosts b JOIN listings')) return [...state.boosts.values()].find((item) => item.payment_id === params[0]);
      return null;
    },
    async all() { return { results: [...state.boosts.values()] }; },
    async write(sql, params) {
      if (sql.includes('INSERT OR IGNORE INTO idempotency_records')) { if (state.idempotency.has(params[0])) return { meta: { changes: 0 } }; state.idempotency.set(params[0], { request_hash: params[1], resource_id: params[2] }); return { meta: { changes: 1 } }; }
      if (sql.includes("SET status='active'")) { const item = state.boosts.get(params[3]); item.status = 'active'; item.starts_at = params[0]; item.ends_at = params[1]; return { meta: { changes: 1 } }; }
      return { meta: { changes: 1 } };
    },
    async batch(queries) { for (const query of queries) { if (query.sql.startsWith('INSERT INTO payments')) state.payments.set(query.parameters[0], { status: 'pending' }); if (query.sql.startsWith('INSERT INTO boosts')) state.boosts.set(query.parameters[0], { id: query.parameters[0], listing_id: query.parameters[1], owner_id: query.parameters[2], payment_id: query.parameters[3], status: 'pending_payment', duration: query.parameters[4], price_minor: query.parameters[5], city_id: 'city_1', city_slug: 'londrina', created_at: clock().toISOString() }); } return queries.map(() => ({ meta: { changes: 1 } })); },
  };
  let sequence = 0;
  const boosts = createBoosts({ db, clock, id: () => String(++sequence).padStart(16, '0'), hash: async (value) => Buffer.from(value).toString('hex').padEnd(64, '0').slice(0, 64), logger: { info() {} }, publications: { async send(item) { state.queue.push(item); } }, gateway: { async createPayment(input) { state.charges.push(input); if (gatewayFails) throw new Error('provider'); return { externalReference: 'external_1' }; } } });
  return { boosts, state };
}

test('PREMIUM checkout uses authoritative price, persists pending and is idempotent', async () => {
  const { boosts, state } = setup(); const input = { duration: '7d', billingType: 'PIX', idempotencyKey: 'same-key-123', amount: 1 };
  await assert.rejects(boosts.checkout(input, { userId: 'user_1' }), { code: 'INVALID_INPUT' });
  const valid = { duration: '7d', billingType: 'PIX', idempotencyKey: 'same-key-123' };
  const first = await boosts.checkout(valid, { userId: 'user_1' }); const second = await boosts.checkout(valid, { userId: 'user_1' });
  assert.equal(first.boost.status, 'pending_payment'); assert.equal(first.payment.amountMinor, 3990); assert.equal(state.charges[0].amountMinor, 3990); assert.equal(state.charges.length, 1); assert.equal(second.boost.id, first.boost.id);
});

test('STANDARD and suspended accounts cannot contract and invalid duration is rejected', async () => {
  const input = { duration: '7d', billingType: 'PIX', idempotencyKey: 'valid-key' };
  await assert.rejects(setup({ plan: 'standard' }).boosts.checkout(input, { userId: 'u' }), { code: 'PREMIUM_REQUIRED' });
  await assert.rejects(setup({ account: 'suspended' }).boosts.checkout(input, { userId: 'u' }), { code: 'ACCOUNT_INELIGIBLE' });
  await assert.rejects(setup().boosts.checkout({ ...input, duration: '99d' }, { userId: 'u' }), BoostsError);
});

test('confirmed payment activates once, sets backend period and enqueues city publication', async () => {
  const { boosts, state } = setup(); const result = await boosts.checkout({ duration: '24h', billingType: 'BOLETO', idempotencyKey: 'payment-key' }, { userId: 'user_1' });
  assert.equal(await boosts.applyPayment(result.payment.id, 'paid'), true); assert.equal(state.boosts.get(result.boost.id).ends_at, '2026-08-15T12:00:00.000Z'); assert.equal(state.queue.length, 1); assert.equal(state.queue[0].reason, 'boost.activated');
  await boosts.applyPayment(result.payment.id, 'paid'); assert.equal(state.queue.length, 1);
});

test('provider failure never presents a created boost', async () => {
  const { boosts, state } = setup({ gatewayFails: true });
  await assert.rejects(boosts.checkout({ duration: '24h', billingType: 'PIX', idempotencyKey: 'failure-key' }, { userId: 'user_1' }), { code: 'GATEWAY_ERROR' });
  assert.equal(state.boosts.size, 0); assert.equal(state.payments.size, 0);
});
