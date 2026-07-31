import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRenderer } from '../../app/core/render.js';
import { createPublisher, normalizePublicationKey } from '../../app/core/publish.js';
import { COMPOSITION_ORDER, createApp } from '../../app/core/app.js';

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

test('publisher writes incrementally to KV, manifests and invalidates', async () => {
  const cache = memoryCache(); let renders = 0;
  const publisher = createPublisher({ renderer: { async render() { renders += 1; return '<p>ok</p>'; } }, cache,
    storage: { async put() { throw new Error('unused'); } }, logger: logger(), id: () => 'one' });
  const input = { destination: 'kv', format: 'html', key: '/Pages/Home', template: 'page', publicationId: 'pub_one' };
  const first = await publisher.publish(input);
  assert.equal(first.ok, true); assert.equal(first.key, 'pages/home'); assert.equal(first.changed, true);
  const second = await publisher.publish(input);
  assert.equal(second.changed, false); assert.equal(renders, 2);
  assert.equal(normalizePublicationKey('/A B/'), 'a-b');
});

test('publisher supports R2 and reports partial technical failures', async () => {
  const cache = memoryCache(); const objects = new Map(); const published = [];
  const publisher = createPublisher({ renderer: { async render() { return '{"ok":true}'; } }, cache,
    storage: { async put(key, value, options) { objects.set(key, { value, options }); } }, logger: logger(),
    events: { async publish(event) { published.push(event); } }, id: () => 'two' });
  const result = await publisher.publish({ destination: 'r2', format: 'json', key: 'exports/data.json', template: 'data', metadata: { origin: 'prepared' } });
  assert.equal(result.ok, true); assert.equal(objects.get('exports/data.json').options.contentType, 'application/json');
  assert.equal(published[0].name, 'ArtifactPublished');
  const failed = createPublisher({ renderer: { async render() { throw new Error('no'); } }, cache,
    storage: { async put() {} }, logger: logger() });
  assert.deepEqual((await failed.publish({ destination: 'kv', format: 'html', key: 'x', template: 'x' })).failures, ['render']);
});

function environment() {
  const kv = new Map();
  return { ENVIRONMENT: 'test', LOG_LEVEL: 'debug', ACTS_DB: { prepare() {}, async batch() { return []; } },
    ACTS_KV: { async get(key) { return kv.get(key) ?? null; }, async put(key, value) { kv.set(key, value); }, async delete(key) { kv.delete(key); } },
    ACTS_FILES: { async get() { return null; }, async head() { return null; }, async put(key) { return { key }; }, async delete() {} },
    ACTS_QUEUE: { async send() {} } };
}

test('app explicitly composes the complete Core and has a deterministic lifecycle', async () => {
  const app = createApp({ environment: environment(), auth: { secret: new Uint8Array(32).fill(7) }, sink: () => {} });
  assert.deepEqual(COMPOSITION_ORDER, ['config', 'logger', 'events', 'database', 'cache', 'storage', 'auth', 'router', 'renderer', 'publisher', 'ready']);
  assert.equal(app.state, 'ready'); assert.equal(app.ready, true); assert.equal('bindings' in app.services.config, false);
  app.services.router.get('/health', (context) => Response.json({ authenticated: context.auth === null,
    publisher: Boolean(app.services.publisher) }));
  assert.deepEqual(await (await app.fetch(new Request('https://example.test/health'))).json(), { authenticated: true, publisher: true });
  assert.equal(app.close(), true); assert.equal(app.state, 'closed');
});

test('app prevents partial initialization and duplicate routes', () => {
  assert.throws(() => createApp({ environment: {}, auth: { secret: new Uint8Array(32) } }), /bootstrap failed/);
  const app = createApp({ environment: environment(), auth: { secret: new Uint8Array(32).fill(1) } });
  app.services.router.get('/one', () => new Response());
  assert.throws(() => app.services.router.get('/one', () => new Response()), /Duplicate route/);
});

test('Lote 5 sources contain no environment, domain, SQL, modules, or rejected imports', async () => {
  for (const path of ['app/core/render.js', 'app/core/publish.js', 'app/core/app.js']) {
    const source = await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /process\.env|app\/modules|\b(?:SELECT|INSERT|UPDATE|DELETE)\b/i);
    assert.doesNotMatch(source, /renderer\.js|publisher\.js|bootstrap\.js|container\.js|registry\.js|loader\.js/);
  }
});
