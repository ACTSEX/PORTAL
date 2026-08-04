import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createConfig } from '../../app/core/config.js';
import { createLogger } from '../../app/core/logger.js';
import { createCache, createCacheKey } from '../../app/core/cache.js';
import { createDatabase } from '../../app/core/db.js';
import { createEventBus } from '../../app/core/events.js';
import { createStorage } from '../../app/core/storage.js';

function logger() {
  const records = [];
  const log = Object.fromEntries(['debug', 'info', 'warn', 'error', 'fatal'].map((level) => [level, (message, context) => records.push({ level, message, context })]));
  return { log, records };
}

function d1({ fail = false } = {}) {
  const calls = [];
  const make = (sql) => ({ bind(...parameters) { calls.push({ sql, parameters }); return { async first() { if (fail) throw new Error('token=secret SQL'); return sql.includes('empty') ? null : { id: 1 }; }, async all() { if (fail) throw new Error('token=secret SQL'); return { success: true, results: sql.includes('empty') ? [] : [{ id: 1 }], meta: { rows_read: 1 } }; }, async run() { if (fail) throw new Error('token=secret SQL'); return { success: true, meta: { changes: 1, rows_written: 1 } }; } }; } });
  return { calls, prepare: make, async batch(statements) { return Promise.all(statements.map((item) => item.run())); } };
}

function kv({ fail = false } = {}) {
  const values = new Map(); const options = [];
  return { values, options, async get(key) { if (fail) throw new Error('password=secret'); return values.get(key) ?? null; }, async put(key, value, config) { if (fail) throw new Error('password=secret'); values.set(key, value); options.push(config); }, async delete(key) { if (fail) throw new Error('password=secret'); values.delete(key); } };
}

function r2({ fail = false } = {}) {
  const values = new Map(); const options = [];
  const object = (key, entry, body = undefined) => entry && ({ key, size: 3, etag: 'etag', body, httpMetadata: entry.options.httpMetadata, customMetadata: entry.options.customMetadata });
  return { values, options, async put(key, body, config) { if (fail) throw new Error('token=secret'); const entry = { body, options: config }; values.set(key, entry); options.push(config); return object(key, entry); }, async get(key) { if (fail) throw new Error('token=secret'); return object(key, values.get(key), values.get(key)?.body); }, async head(key) { if (fail) throw new Error('token=secret'); return object(key, values.get(key)); }, async delete(key) { if (fail) throw new Error('token=secret'); values.delete(key); } };
}

function eventBus() { const capture = logger(); return { capture, bus: createEventBus({ logger: capture.log, clock: () => new Date('2026-07-31T00:00:00Z'), id: () => 'fixed' }) }; }

test('event listeners register, run synchronously and unsubscribe', async () => { const { bus } = eventBus(); let count = 0; const off = bus.subscribe('TechnicalCompleted', { id: 'first-listener', handler: () => { count += 1; } }); const result = await bus.publish({ name: 'TechnicalCompleted', version: '1.0', source: 'test', payload: {} }); assert.equal(count, 1); assert.equal(result.event.id, 'evt_fixed'); assert.equal(off(), true); assert.equal(bus.hasSubscribers('TechnicalCompleted'), false); });
test('event listeners await asynchronous work in priority order', async () => { const { bus } = eventBus(); const order = []; bus.subscribe('TechnicalCompleted', { id: 'later-listener', priority: 900, handler: () => order.push('later') }); bus.subscribe('TechnicalCompleted', { id: 'early-listener', priority: 100, async handler() { await Promise.resolve(); order.push('early'); } }); const result = await bus.publish({ name: 'TechnicalCompleted', version: '1.0', source: 'test', payload: {} }); assert.deepEqual(order, ['early', 'later']); assert.equal(result.succeeded, 2); });
test('event consumer failures are isolated and safely reported', async () => { const { bus, capture } = eventBus(); let ran = false; bus.subscribe('TechnicalCompleted', { id: 'bad-listener', handler: () => { throw new Error('password=secret'); } }); bus.subscribe('TechnicalCompleted', { id: 'good-listener', handler: () => { ran = true; } }); const result = await bus.publish({ name: 'TechnicalCompleted', version: '1.0', source: 'test', payload: {} }); assert.equal(ran, true); assert.equal(result.failed, 1); assert.equal(capture.records.some(({ level }) => level === 'error'), true); assert.doesNotMatch(JSON.stringify(capture.records), /payload/); });
test('event validation rejects invalid inputs, listeners and duplicates', () => { const { bus } = eventBus(); assert.throws(() => bus.validate({ name: 'invalid' }), TypeError); assert.throws(() => bus.subscribe('TechnicalCompleted', {}), TypeError); bus.subscribe('TechnicalCompleted', { id: 'one-listener', handler() {} }); assert.throws(() => bus.subscribe('TechnicalCompleted', { id: 'one-listener', handler() {} }), /Duplicate/); });
test('event filtering, listing and clear are deterministic', async () => { const { bus } = eventBus(); bus.subscribe('TechnicalCompleted', { id: 'one-listener', filter: () => false, handler() { throw new Error('not called'); } }); assert.equal(bus.listSubscribers('TechnicalCompleted')[0].consumerId, 'one-listener'); assert.equal((await bus.publishAsync({ name: 'TechnicalCompleted', version: '1.0', source: 'test', payload: {} })).results[0].status, 'skipped'); bus.clear(); assert.equal(bus.hasSubscribers('TechnicalCompleted'), false); });

test('D1 statements bind every parameter and return first/all/write results', async () => { const binding = d1(); const capture = logger(); const db = createDatabase({ binding, logger: capture.log }); assert.deepEqual(await db.first('SELECT ?', ['safe']), { id: 1 }); assert.deepEqual((await db.all('SELECT ?', [2])).results, [{ id: 1 }]); assert.equal((await db.write('UPDATE x SET y = ?', [3])).meta.changes, 1); assert.deepEqual(binding.calls.map((call) => call.parameters), [['safe'], [2], [3]]); });
test('D1 empty and batch results are normalized', async () => { const db = createDatabase({ binding: d1(), logger: logger().log }); assert.equal(await db.first('empty', []), null); assert.deepEqual((await db.all('empty', [])).results, []); const result = await db.batch([{ sql: 'UPDATE x SET y = ?', parameters: [1] }, { sql: 'UPDATE x SET y = ?', parameters: [2] }]); assert.equal(result.length, 2); assert.equal(result[0].success, true); });
test('D1 rejects invalid bindings, SQL, parameters and interpolation markers', () => { assert.throws(() => createDatabase({ binding: {}, logger: logger().log }), /binding/); const db = createDatabase({ binding: d1(), logger: logger().log }); assert.throws(() => db.prepare('', []), /SQL/); assert.throws(() => db.prepare('SELECT ${value}', []), /SQL/); assert.throws(() => db.prepare('SELECT ?', 'unsafe'), /parameters/); });
test('D1 failures expose a stable error and protected logs', async () => { const capture = logger(); const db = createDatabase({ binding: d1({ fail: true }), logger: capture.log }); await assert.rejects(db.first('SELECT ?', ['secret']), { message: 'Database operation failed' }); assert.doesNotMatch(JSON.stringify(capture.records), /SELECT|\["secret"\]/); });

test('cache normalizes scoped public and private keys', () => { assert.equal(createCacheKey('ACTS', 'public', 'Hello World'), 'acts:public:hello-world'); assert.throws(() => createCacheKey('acts', 'shared', 'x')); });
test('KV cache serializes reads, writes, expiration and deletion', async () => { const binding = kv(); const cache = createCache({ binding, logger: logger().log, namespace: 'test', visibility: 'private', defaultTtl: 60 }); assert.deepEqual(await cache.get('item'), { hit: false, value: null, metadata: null }); assert.equal(await cache.set('item', { ok: true }, { ttl: 10, metadata: { version: 1 } }), true); assert.deepEqual((await cache.get('item')).value, { ok: true }); assert.equal(binding.options[0].expirationTtl, 10); assert.equal(await cache.invalidate('item'), true); assert.equal((await cache.get('item')).hit, false); assert.equal(cache.sourceOfTruth, false); });
test('KV corrupt values are misses and failures are tolerated safely', async () => { const capture = logger(); const binding = kv(); const cache = createCache({ binding, logger: capture.log }); binding.values.set(cache.key('bad'), '{bad'); assert.equal((await cache.get('bad')).hit, false); const failed = createCache({ binding: kv({ fail: true }), logger: capture.log }); assert.equal(await failed.set('x', 'token=secret'), false); assert.equal((await failed.get('x')).hit, false); assert.doesNotMatch(JSON.stringify(capture.records), /token=secret/); });
test('cache requires an expiration strategy', () => { assert.throws(() => createCache({ binding: kv(), logger: logger().log, defaultTtl: 0 }), /TTL/); });

test('R2 put/get/head/exists/delete preserve controlled metadata', async () => { const binding = r2(); const storage = createStorage({ binding, logger: logger().log }); const saved = await storage.put('files/object.txt', 'abc', { contentType: 'text/plain', metadata: { checksum: 'x' } }); assert.equal(saved.contentType, 'text/plain'); assert.equal((await storage.get('files/object.txt')).body, 'abc'); assert.equal((await storage.head('files/object.txt')).metadata.checksum, 'x'); assert.equal(await storage.exists('files/object.txt'), true); assert.equal(await storage.delete('files/object.txt'), true); assert.equal(await storage.get('files/object.txt'), null); });
test('R2 validates keys, objects, binding and content type', async () => { assert.throws(() => createStorage({ binding: {}, logger: logger().log }), /binding/); const storage = createStorage({ binding: r2(), logger: logger().log }); assert.throws(() => storage.validateKey('../secret'), /key/); await assert.rejects(storage.put('safe', null), /object/); await assert.rejects(storage.put('safe', 'x', { contentType: '' }), /content type/); });
test('R2 errors are stable and logs exclude keys, metadata and secrets', async () => { const capture = logger(); const storage = createStorage({ binding: r2({ fail: true }), logger: capture.log }); await assert.rejects(storage.get('private/token.txt'), { message: 'Storage operation failed' }); assert.doesNotMatch(JSON.stringify(capture.records), /private\/token|token=secret/); });

test('Lote 3 services use explicit bindings and have no environment or domain imports', async () => { for (const file of ['events.js', 'db.js', 'cache.js', 'storage.js']) { const source = await readFile(new URL(`../../app/core/${file}`, import.meta.url), 'utf8'); assert.doesNotMatch(source, /process\.env|from ['"].*modules|anúncio|pagamento|usuário/i); } });


test('Lote 2 Config and Logger compose all explicitly injected services', async () => {
  const databaseBinding = d1(); const cacheBinding = kv(); const filesBinding = r2(); const output = [];
  const config = createConfig({ ENVIRONMENT: 'test', LOG_LEVEL: 'debug', ACTS_DB: databaseBinding, ACTS_KV: cacheBinding, ACTS_FILES: filesBinding, ACTS_QUEUE: { send() {} } });
  const technicalLogger = createLogger({ config: config.public, sink: (record) => output.push(record), clock: () => new Date('2026-07-31T00:00:00Z') });
  const bus = createEventBus({ logger: technicalLogger, clock: () => new Date('2026-07-31T00:00:00Z'), id: () => 'integration' });
  const database = createDatabase({ binding: config.bindings.ACTS_DB, logger: technicalLogger });
  const cache = createCache({ binding: config.bindings.ACTS_KV, logger: technicalLogger });
  const storage = createStorage({ binding: config.bindings.ACTS_FILES, logger: technicalLogger });
  await bus.publish({ name: 'TechnicalCompleted', version: '1.0', source: 'core', payload: {} });
  await database.write('UPDATE x SET y = ?', [1]); await cache.set('integration', true); await storage.put('files/integration.txt', 'ok');
  assert.equal(output.some(({ message }) => message === 'Event published'), true);
  assert.equal(config.public.environment, 'test');
});

test('publication Queue validates, correlates and sends individual and batch messages safely', async () => {
  const { createPublicationQueue } = await import('../../app/core/events.js'); const sent = []; const capture = logger();
  const queue = createPublicationQueue({ binding: { async send(body) { sent.push(body); }, async sendBatch(entries) { sent.push(...entries.map(({ body }) => body)); } }, logger: capture.log });
  const message = { eventId: 'evt_123', type: 'CityPublicationRequested', version: '1.0', cityId: 'city_1', citySlug: 'londrina', reason: 'listing.updated', correlationId: 'corr_123', source: 'Listings', occurredAt: '2026-08-04T00:00:00Z' };
  await queue.send(message); await queue.sendBatch([message, { ...message, eventId: 'evt_456' }]); assert.equal(sent.length, 3); assert.equal(sent[0].correlationId, 'corr_123'); assert.throws(() => queue.validate({ ...message, citySlug: '../secret' }));
  await assert.rejects(createPublicationQueue({ binding: { async send() { throw new Error('token=secret'); } }, logger: capture.log }).send(message), /enqueue failed/); assert.doesNotMatch(JSON.stringify(capture.records), /token=secret/);
  assert.throws(() => createPublicationQueue({ binding: {}, logger: capture.log }), /binding/);
});
