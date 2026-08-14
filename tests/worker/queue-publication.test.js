import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicationConsumer, createPublicationQueue, createPublisher } from '../../business/publishing.js';
import worker from '../../worker/index.js';

const logger = { debug() {}, info() {}, error() {} };
const request = (entity, id, slug) => ({ type: 'PUBLICATION_REQUESTED', entity, id, slug, reason: 'listing.updated', requestedAt: '2026-08-14T00:00:00Z' });
const city = { slug: 'londrina', name: 'Londrina', listings: [{ id: 'listing_1', slug: 'ana', name: 'Ana' }] };
const profile = (changes = {}) => ({ slug: 'ana', name: 'Ana', premium: true, active: true, cityId: 'city_1', city: { slug: 'londrina', name: 'Londrina' }, ...changes });
function storage(options = {}) {
  const values = new Map(); const writes = [];
  return { values, writes, async put(key, body) { if (options.fail) throw new Error('R2 unavailable'); values.set(key, body); writes.push(key); }, async delete(key) { if (options.fail) throw new Error('R2 unavailable'); values.delete(key); writes.push(`DELETE:${key}`); } };
}
function message(body) { const state = { ack: 0, retry: 0 }; return { body, state, ack() { state.ack += 1; }, retry() { state.retry += 1; } }; }
function setup({ source = profile(), bucket = storage(), failDb = false } = {}) {
  const calls = { city: 0, profile: 0 };
  const reader = { async loadCity() { calls.city += 1; if (failDb) throw new Error('D1 unavailable'); return city; }, async loadProfile() { calls.profile += 1; if (failDb) throw new Error('D1 unavailable'); return source; } };
  const publisher = createPublisher({ storage: bucket, logger, clock: () => new Date('2026-08-14T00:00:00Z'), id: () => 'test' });
  return { bucket, calls, consume: createPublicationConsumer({ publisher, reader, logger }) };
}

test('producer accepts normalized city/profile, rejects invalid data, and propagates send failure', async () => {
  const sent = []; const queue = createPublicationQueue({ binding: { async send(body) { sent.push(body); } }, logger });
  await queue.send(request('CITY', 'city_1', 'londrina')); await queue.send(request('profile', 'profile_1', 'ana'));
  assert.deepEqual(sent.map((item) => item.entity), ['city', 'profile']);
  assert.throws(() => queue.validate(request('billing', 'bill_1', 'x')), /Invalid/);
  await assert.rejects(createPublicationQueue({ binding: { async send() { throw new Error('Queue down'); } }, logger }).send(request('city', 'city_1', 'londrina')), /Queue down/);
});

test('consumer handles city, profile, mixed batches and coalesces each aggregate', async () => {
  const app = setup(); const messages = [message(request('city', 'city_1', 'londrina')), message(request('city', 'city_1', 'londrina')), message(request('city', 'city_1', 'londrina')), message(request('profile', 'listing_1', 'ana')), message(request('profile', 'listing_1', 'ana'))];
  await app.consume(messages);
  assert.equal(app.calls.profile, 1); assert.equal(app.calls.city, 2); // explicit city plus profile's affected city
  assert.equal(app.bucket.writes.filter((key) => key === 'cities/londrina.json').length, 2);
  assert.equal(app.bucket.writes.filter((key) => key === 'profiles/ana.json').length, 1);
  assert.equal(messages.every((item) => item.state.ack === 1 && item.state.retry === 0), true);
});

test('invalid messages are acknowledged while D1 and R2 transient failures retry', async () => {
  const invalid = message({ private: 'payload' }); await setup().consume([invalid]); assert.deepEqual(invalid.state, { ack: 1, retry: 0 });
  for (const app of [setup({ failDb: true }), setup({ bucket: storage({ fail: true }) })]) {
    const item = message(request('city', 'city_1', 'londrina')); const result = await app.consume([item]);
    assert.deepEqual(item.state, { ack: 0, retry: 1 }); assert.equal(result[0].retry, true);
  }
});

test('PREMIUM publishes while STANDARD, suspended and missing profiles remove the canonical key', async () => {
  for (const [source, expected] of [[profile(), 'profiles/ana.json'], [profile({ premium: false }), 'DELETE:profiles/ana.json'], [profile({ suspended: true }), 'DELETE:profiles/ana.json'], [null, 'DELETE:profiles/ana.json']]) {
    const app = setup({ source }); await app.consume([message(request('profile', 'listing_1', 'ana'))]); assert.equal(app.bucket.writes.includes(expected), true);
  }
});

test('redelivery overwrites the same canonical resources without structural duplication', async () => {
  const app = setup();
  await app.consume([message(request('city', 'city_1', 'londrina')), message(request('profile', 'listing_1', 'ana'))]);
  await app.consume([message(request('city', 'city_1', 'londrina')), message(request('profile', 'listing_1', 'ana'))]);
  assert.deepEqual([...app.bucket.values.keys()].sort(), ['cities/londrina.json', 'profiles/ana.json']);
  assert.equal(JSON.parse(app.bucket.values.get('cities/londrina.json')).slug, 'londrina');
  assert.equal(JSON.parse(app.bucket.values.get('profiles/ana.json')).slug, 'ana');
});

test('Worker Queue integration reads a D1 fake and writes city/profile through the canonical publisher', async () => {
  const objects = new Map();
  const rows = (sql) => {
    if (sql.includes('FROM cities WHERE')) return { id: 'city_1', slug: 'londrina', public_name: 'Londrina' };
    if (sql.includes('FROM listings l JOIN categories') && sql.includes('WHERE l.city_id')) return [{ id: 'listing_1', slug: 'ana', title: 'Ana', description: 'Apresentação pública longa', attributes_json: '{"tags":["centro"]}', category_slug: 'massagem', display_name: 'Ana', premium: 1 }];
    if (sql.includes('WHERE l.id = ?')) return { id: 'listing_1', slug: 'ana', title: 'Ana', description: 'Apresentação pública longa', attributes_json: '{}', city_id: 'city_1', display_name: 'Ana', bio: 'Perfil público', social_links_json: '{}', user_status: 'active', city_slug: 'londrina', city_name: 'Londrina', category_slug: 'massagem', premium: 1 };
    if (sql.includes('SELECT id FROM media')) return [{ id: 'med_123' }];
    throw new Error(`Unexpected SQL: ${sql}`);
  };
  const ACTS_DB = { batch: async () => [], prepare(sql) { return { bind() { return { async first() { const value = rows(sql); return Array.isArray(value) ? value[0] : value; }, async all() { const value = rows(sql); return { success: true, results: Array.isArray(value) ? value : value ? [value] : [] }; } }; } }; } };
  const ACTS_DATA = { async put(key, body) { objects.set(key, body); return { key }; }, async delete(key) { objects.delete(key); }, async get() { return null; }, async head() { return null; } };
  const messages = [message(request('city', 'city_1', 'londrina')), message(request('profile', 'listing_1', 'ana'))];
  await worker.queue({ messages }, { ACTS_DB, ACTS_DATA, ENVIRONMENT: 'test' });
  assert.deepEqual([...objects.keys()].sort(), ['cities/londrina.json', 'profiles/ana.json']);
  assert.equal(JSON.parse(objects.get('cities/londrina.json')).slug, 'londrina');
  assert.equal(JSON.parse(objects.get('profiles/ana.json')).premium, true);
  assert.deepEqual(JSON.parse(objects.get('profiles/ana.json')).gallery, [{ id: 'med_123', url: '/media/med_123' }]);
  assert.equal(messages.every((item) => item.state.ack === 1), true);
});
