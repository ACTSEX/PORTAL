import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRenderer } from '../../business/publishing.js';
import { createPublisher, normalizePublicationKey, normalizeCityCatalog, consumePublicationBatch, submitChangePackage } from '../../business/publishing.js';

const logger = () => ({ debug() {}, info() {}, warn() {}, error() {}, fatal() {} });
function memoryCache() {
  const values = new Map();
  return { values, async get(key) { return values.has(key) ? { hit: true, value: values.get(key).value } : { hit: false, value: null }; },
    async set(key, value, options) { values.set(key, { value, options }); return true; }, async invalidate(key) { values.delete(key); return true; } };
}

test('renderer registers, resolves and composes HTML without mutating input', async () => {
  const renderer = createRenderer({ logger: logger() });
  renderer.registerComponent('badge', ({ value }) => `<b>${value}</b>`)
    .registerTemplate('page', async ({ title }, context) => `<h1>${title}</h1>${await context.component('badge', { value: 'ok' })}`)
    .registerLayout('main', ({ content }) => `<main>${content}</main>`);
  const data = { title: 'Portal' };
  assert.equal(await renderer.render({ template: 'page', layout: 'main', data }), '<main><h1>Portal</h1><b>ok</b></main>');
  assert.deepEqual(data, { title: 'Portal' });
  assert.equal(typeof renderer.resolve('component', 'badge'), 'function');
  assert.throws(() => renderer.registerTemplate('page', () => ''), /Duplicate/);
  assert.throws(() => renderer.resolve('template', 'missing'), /not found/);
});

test('renderer supports JSON and converts failures to a safe error', async () => {
  const renderer = createRenderer({ logger: logger() });
  renderer.registerTemplate('data', (data, context) => ({ ...data, locale: context.locale }));
  assert.equal(await renderer.render({ template: 'data', data: { ok: true }, context: { locale: 'pt' }, format: 'json' }), '{"ok":true,"locale":"pt"}');
  renderer.registerTemplate('broken', () => { throw new Error('private detail'); });
  await assert.rejects(renderer.render({ template: 'broken' }), /^Error: Render failed$/);
  assert.throws(() => renderer.registerLayout('../bad', () => ''), /Invalid/);
});

function memoryStorage({ failManifest = false } = {}) {
  const values = new Map(); const writes = [];
  const object = (key, entry) => entry && ({ key, size: new TextEncoder().encode(entry.body).byteLength, body: entry.body, metadata: entry.options.metadata });
  return { values, writes, async put(key, body, options) { if (failManifest && key.endsWith('manifest.json')) throw new Error('fail'); values.set(key, { body, options }); writes.push(key); return object(key, values.get(key)); }, async get(key) { return object(key, values.get(key)); }, async head(key) { return object(key, values.get(key)); } };
}
const projection = () => ({ city: { id: 'city_1', slug: 'londrina', name: 'Londrina', region: 'PR', countryCode: 'BR' }, categories: [{ id: 'cat_1', name: 'Casa', slug: 'casa' }], advertisers: [{ id: 'user_1', name: 'Ana', email: 'private@example.test', token: 'secret' }], listings: [{ id: 'listing_1', advertiserId: 'user_1', categoryId: 'cat_1', title: 'Casa', passwordHash: 'secret' }], filters: { types: ['house'] } });

test('publisher creates deterministic unified city catalog in R2 before manifest and excludes private fields', async () => {
  const storage = memoryStorage(); const publisher = createPublisher({ renderer: { render() {} }, storage, logger: logger(), clock: () => new Date('2026-08-04T12:00:00Z'), id: () => 'one' });
  const result = await publisher.publishCity({ cityId: 'city_1', citySlug: 'londrina', version: 1, loadProjection: projection });
  assert.equal(result.ok, true); assert.deepEqual(storage.writes, ['cidades/londrina/catalogo-v000001.json', 'cidades/londrina/manifest.json']);
  const catalog = JSON.parse(storage.values.get(storage.writes[0]).body); assert.equal(catalog.listings[0].advertiserId, 'user_1'); assert.equal(catalog.advertisers.user_1.email, undefined); assert.doesNotMatch(JSON.stringify(catalog), /secret|password|private@example/);
  assert.equal(result.manifest.digest.length, 64); assert.equal(result.manifest.schemaVersion, '2.0'); assert.equal(storage.values.get(storage.writes[0]).options.cacheControl.includes('immutable'), true);
  assert.equal(normalizePublicationKey('/A B/'), 'a-b'); assert.throws(() => normalizeCityCatalog({ city: { id: 'x', slug: '../bad' } }, 'x'));
});

test('publisher preserves previous manifest on failure, is content-idempotent and rolls back safely', async () => {
  const storage = memoryStorage(); let instant = 0; const options = { renderer: { render() {} }, storage, logger: logger(), clock: () => new Date(`2026-08-04T12:00:0${instant++}Z`), id: () => 'two' }; const publisher = createPublisher(options);
  const first = await publisher.publishCity({ cityId: 'city_1', citySlug: 'londrina', version: 1, loadProjection: projection });
  assert.equal((await publisher.publishCity({ cityId: 'city_1', citySlug: 'londrina', version: 2, loadProjection: projection })).changed, false);
  assert.equal(storage.writes.length, 2);
  const changed = () => ({ ...projection(), listings: [{ ...projection().listings[0], title: 'Nova' }] }); await publisher.publishCity({ cityId: 'city_1', citySlug: 'londrina', version: 2, loadProjection: changed });
  const rolled = await publisher.rollback({ cityId: 'city_1', citySlug: 'londrina', target: { version: 1, catalogPath: first.catalogKey, digest: first.manifest.digest, size: first.manifest.size } }); assert.equal(rolled.manifest.version, 1);
  const failing = createPublisher({ ...options, storage: memoryStorage({ failManifest: true }) }); assert.equal((await failing.publishCity({ cityId: 'city_1', citySlug: 'londrina', version: 1, loadProjection: projection })).ok, false);
  await assert.rejects(publisher.rollback({ cityId: 'other', citySlug: 'londrina', target: { version: 1, catalogPath: first.catalogKey, digest: first.manifest.digest, size: first.manifest.size } }));
});

test('Queue batch aggregation coalesces cities, duplicates, acknowledges success and retries failure', async () => {
  const ack = []; const retry = []; const base = { occurredAt: '2026-08-04T00:00:00Z' };
  const messages = [{ body: { ...base, eventId: 'evt_1', cityId: 'city_1', citySlug: 'londrina' }, ack: () => ack.push(1), retry: () => retry.push(1) }, { body: { ...base, eventId: 'evt_1', cityId: 'city_1', citySlug: 'londrina' }, ack: () => ack.push(2) }, { body: { ...base, eventId: 'evt_2', cityId: 'city_2', citySlug: 'curitiba' }, retry: () => retry.push(2) }];
  const seen = []; const result = await consumePublicationBatch(messages, { now: Date.parse('2026-08-04T00:00:20Z'), maximumWaitMs: 10000, compile(group) { seen.push(group); if (group.cityId === 'city_2') throw new Error('retry'); return { ok: true }; } });
  assert.equal(seen.length, 2); assert.equal(seen.find((x) => x.cityId === 'city_1').eventIds.length, 1); assert.deepEqual(ack, [1, 2]); assert.deepEqual(retry, [2]); assert.equal(result.some((x) => x.retry), true);
});

test('explicit package enforces atomic limits, persisted idempotency and safe daily quota', async () => {
  let attempts = 0; let writes = 0; const deps = { authorize: async () => {}, persist: async () => { writes += 1; return { ok: true, operations: [{ status: 'persisted' }] }; }, quota: async () => ({ allowed: ++attempts <= 5, remaining: Math.max(0, 5 - attempts) }) };
  for (let index = 0; index < 5; index += 1) assert.equal((await submitChangePackage({ userId: 'user_1', idempotencyKey: `pkg_${index}abc`, operations: [{ type: 'listing.update', data: {} }] }, deps)).ok, true);
  await assert.rejects(submitChangePackage({ userId: 'user_1', idempotencyKey: 'pkg_six', operations: [{}] }, deps), { code: 'SUBMISSION_LIMIT_EXCEEDED' });
  const duplicate = await submitChangePackage({ userId: 'user_1', idempotencyKey: 'pkg_dup', operations: [{}] }, { ...deps, quota: async () => ({ allowed: true, duplicate: true, remaining: 0, result: { ok: true, operations: [{ status: 'persisted' }] } }) }); assert.equal(duplicate.duplicated, true); assert.equal(writes, 5);
});

test('Lote 5 sources contain no environment, domain, SQL, modules, or rejected imports', async () => {
  for (const path of ['business/publishing.js', 'core/app.js']) {
    const source = await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /process\.env|app\/modules|\b(?:SELECT|INSERT|UPDATE|DELETE)\b/i);
    assert.doesNotMatch(source, /renderer\.js|publisher\.js|bootstrap\.js|container\.js|registry\.js|loader\.js/);
  }
});
