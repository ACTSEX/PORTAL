import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRenderer } from '../../business/publishing.js';
import { createPublisher, normalizePublicationKey, normalizeCityProjection, normalizeProfileProjection, submitChangePackage } from '../../business/publishing.js';
import { cityProjectionKey, profileProjectionKey, readPublicProjection } from '../../business/public-content.js';
import worker from '../../worker/index.js';

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

function memoryStorage({ failPut = false, failDelete = false } = {}) {
  const values = new Map(); const writes = [];
  const object = (key, entry) => entry && ({ key, size: new TextEncoder().encode(entry.body).byteLength, body: entry.body, metadata: entry.options.metadata, httpMetadata: { contentType: entry.options.contentType }, httpEtag: `"${entry.options.metadata.digest}"` });
  return { values, writes, async put(key, body, options) { if (failPut) throw new Error('R2 put failed'); values.set(key, { body, options }); writes.push(key); return object(key, values.get(key)); }, async get(key) { return object(key, values.get(key)); }, async head(key) { return object(key, values.get(key)); }, async delete(key) { if (failDelete) throw new Error('R2 delete failed'); values.delete(key); writes.push(`DELETE:${key}`); } };
}
const projection = () => ({ slug: 'londrina', name: 'Londrina', directories: ['dir1'], categories: ['massagem'], tags: ['centro'], email: 'private@example.test', listings: [{ id: 'listing_1', slug: 'ana', profileSlug: 'ana', name: 'Ana', category: 'massagem', directory: 'dir1', tags: ['centro'], coverUrl: 'https://cdn.test/ana.jpg', premium: true, passwordHash: 'secret', priceMinor: 100 }] });
const profileProjection = (overrides = {}) => ({ slug: 'ana', name: 'Ana', premium: true, active: true, city: { slug: 'londrina', name: 'Londrina', internalId: 'private' }, presentation: 'Apresentação', categories: ['massagem'], services: ['Relaxante'], tags: ['centro'], gallery: ['https://cdn.test/ana.jpg'], contacts: { phone: '+5543999999999', website: 'https://example.test', email: 'private@example.test', token: 'secret' }, paymentStatus: 'paid', ...overrides });

test('city publisher writes the canonical allowlisted projection and propagates R2 failure', async () => {
  const storage = memoryStorage(); const publisher = createPublisher({ storage, logger: logger(), clock: () => new Date('2026-08-04T12:00:00Z'), id: () => 'one' });
  const result = await publisher.publishCity({ cityId: 'city_1', citySlug: 'londrina', loadProjection: projection });
  assert.equal(result.ok, true); assert.equal(result.key, cityProjectionKey('londrina')); assert.deepEqual(storage.writes, ['cities/londrina.json']);
  const city = JSON.parse(storage.values.get(result.key).body);
  assert.deepEqual(Object.keys(city), ['schemaVersion', 'slug', 'name', 'generatedAt', 'directories', 'categories', 'tags', 'listings']);
  assert.equal(city.schemaVersion, 1); assert.equal(city.slug, 'londrina'); assert.equal(city.listings[0].name, 'Ana');
  assert.doesNotMatch(JSON.stringify(city), /secret|password|private@example|priceMinor/);
  assert.equal(storage.values.get(result.key).options.contentType, 'application/json; charset=utf-8');
  assert.equal(normalizePublicationKey('/A B/'), 'a-b'); assert.throws(() => normalizeCityProjection({ slug: '../bad' }, 'x'));
  const failing = createPublisher({ storage: memoryStorage({ failPut: true }), logger: logger() });
  await assert.rejects(failing.publishCity({ cityId: 'city_1', citySlug: 'londrina', loadProjection: projection }), /R2 put failed/);
});

test('profile publisher publishes PREMIUM and removes missing, STANDARD or suspended minisites', async () => {
  const storage = memoryStorage(); const publisher = createPublisher({ storage, logger: logger(), clock: () => new Date('2026-08-04T12:00:00Z') });
  const result = await publisher.publishProfile({ profileSlug: 'ana', loadProjection: () => profileProjection() });
  assert.equal(result.key, profileProjectionKey('ana')); assert.equal(result.published, true); assert.equal(result.projection.schemaVersion, 1); assert.equal(result.projection.premium, true);
  assert.deepEqual(Object.keys(result.projection), ['schemaVersion', 'slug', 'name', 'generatedAt', 'city', 'premium', 'presentation', 'categories', 'services', 'tags', 'gallery', 'contacts']);
  assert.doesNotMatch(JSON.stringify(result.projection), /private|paymentStatus|token|email/);
  for (const source of [profileProjection({ premium: false }), profileProjection({ suspended: true }), null]) {
    await publisher.publishProfile({ profileSlug: 'ana', loadProjection: () => source });
    assert.equal(storage.values.has('profiles/ana.json'), false);
  }
  await assert.rejects(createPublisher({ storage: memoryStorage({ failDelete: true }), logger: logger() }).publishProfile({ profileSlug: 'ana', loadProjection: () => null }), /R2 delete failed/);
  await assert.rejects(createPublisher({ storage: memoryStorage({ failPut: true }), logger: logger() }).publishProfile({ profileSlug: 'ana', loadProjection: () => profileProjection() }), /R2 put failed/);
  assert.throws(() => normalizeProfileProjection({ slug: 'bad', name: 2 }, 'x'));
});

test('published city and profile objects are exactly consumed by reader and Worker', async () => {
  const storage = memoryStorage(); const publisher = createPublisher({ storage, logger: logger(), clock: () => new Date('2026-08-04T12:00:00Z') });
  const cityResult = await publisher.publishCity({ cityId: 'city_1', citySlug: 'londrina', loadProjection: projection });
  const profileResult = await publisher.publishProfile({ profileSlug: 'ana', loadProjection: () => profileProjection() });
  const cityRead = await readPublicProjection(storage, 'cities', 'londrina');
  assert.deepEqual(JSON.parse(cityRead.body), cityResult.projection);
  const env = { ACTS_DATA: storage, ACTS_DB: { prepare() { throw new Error('D1 must not be used'); } } };
  const cityResponse = await worker.fetch(new Request('https://acompanhantesex.com/data/cities/londrina'), env);
  assert.deepEqual(await cityResponse.json(), cityResult.projection);
  const miniResponse = await worker.fetch(new Request('https://ana.acompanhantesex.com/'), env);
  assert.equal(miniResponse.status, 200); assert.match(await miniResponse.text(), /Ana|Apresentação/);
  assert.deepEqual(JSON.parse(storage.values.get(profileResult.key).body), profileResult.projection);
});

test('explicit package enforces atomic limits, persisted idempotency and safe daily quota', async () => {
  let attempts = 0; let writes = 0; const deps = { authorize: async () => {}, persist: async () => { writes += 1; return { ok: true, operations: [{ status: 'persisted' }] }; }, quota: async () => ({ allowed: ++attempts <= 5, remaining: Math.max(0, 5 - attempts) }) };
  for (let index = 0; index < 5; index += 1) assert.equal((await submitChangePackage({ userId: 'user_1', idempotencyKey: `pkg_${index}abc`, operations: [{ type: 'listing.update', data: {} }] }, deps)).ok, true);
  await assert.rejects(submitChangePackage({ userId: 'user_1', idempotencyKey: 'pkg_six', operations: [{}] }, deps), { code: 'SUBMISSION_LIMIT_EXCEEDED' });
  const duplicate = await submitChangePackage({ userId: 'user_1', idempotencyKey: 'pkg_dup', operations: [{}] }, { ...deps, quota: async () => ({ allowed: true, duplicate: true, remaining: 0, result: { ok: true, operations: [{ status: 'persisted' }] } }) }); assert.equal(duplicate.duplicated, true); assert.equal(writes, 5);
});

test('publishing sources contain no environment, modules, or rejected imports', async () => {
  for (const path of ['business/publishing.js', 'core/app.js']) {
    const source = await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /process\.env|app\/modules/i);
    assert.doesNotMatch(source, /renderer\.js|publisher\.js|bootstrap\.js|container\.js|registry\.js|loader\.js/);
  }
});
