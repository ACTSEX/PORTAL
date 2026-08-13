import { deepFreeze, isPlainObject } from '../core/app.js';

const NAME = /^[a-z][a-z0-9.-]{0,63}$/;
const TYPES = new Set(['template', 'layout', 'component']);

function clone(value) {
  if (value === undefined) return {};
  if (!isPlainObject(value)) throw new TypeError('Render data and context must be plain objects');
  return structuredClone(value);
}

function normalize(value, format) {
  if (format === 'html') {
    if (typeof value !== 'string') throw new TypeError('HTML renderer must return a string');
    return value;
  }
  if (format === 'json') {
    if (value === undefined || typeof value === 'function') throw new TypeError('Invalid JSON output');
    return JSON.stringify(value);
  }
  throw new RangeError('Unsupported render format');
}

/** Create an isolated registry for deterministic technical presentation. */
export function createRenderer({ logger, events } = {}) {
  if (!logger || typeof logger.error !== 'function' || typeof logger.info !== 'function') {
    throw new TypeError('Renderer requires a valid logger');
  }
  if (events && typeof events.publish !== 'function') throw new TypeError('Invalid Renderer Event Bus');
  const registries = Object.fromEntries([...TYPES].map((type) => [type, new Map()]));

  function register(type, name, renderer) {
    if (!TYPES.has(type) || !NAME.test(name ?? '') || typeof renderer !== 'function') {
      throw new TypeError('Invalid render registration');
    }
    if (registries[type].has(name)) throw new Error('Duplicate render registration');
    registries[type].set(name, renderer);
    return service;
  }

  function resolve(type, name) {
    if (!TYPES.has(type) || !NAME.test(name ?? '')) throw new TypeError('Invalid render reference');
    const item = registries[type].get(name);
    if (!item) throw new Error('Render item not found');
    return item;
  }

  async function invoke(type, name, data, context) {
    const input = deepFreeze(clone(data));
    const safeContext = deepFreeze({ ...clone(context), component: async (componentName, props = {}) =>
      invoke('component', componentName, props, context) });
    return resolve(type, name)(input, safeContext);
  }

  async function render(options) {
    if (!isPlainObject(options) || !NAME.test(options.template ?? '')) throw new TypeError('Invalid render options');
    const format = options.format ?? 'html';
    try {
      let output = await invoke('template', options.template, options.data, options.context);
      if (options.layout) output = await invoke('layout', options.layout, { content: output, data: clone(options.data) }, options.context);
      const result = normalize(output, format);
      logger.info('Render completed', { operation: 'renderer.render', status: 'success' });
      if (events) await events.publish({ name: 'ArtifactRendered', version: '1.0', source: 'core.render', payload: { format } });
      return result;
    } catch (error) {
      logger.error('Render failed', { operation: 'renderer.render', status: 'failed', error });
      throw new Error('Render failed', { cause: error });
    }
  }

  const service = Object.freeze({ register, resolve, render,
    registerTemplate: (name, item) => register('template', name, item),
    registerLayout: (name, item) => register('layout', name, item),
    registerComponent: (name, item) => register('component', name, item),
    renderComponent: (name, data, context) => invoke('component', name, data, context) });
  return service;
}


const KEY = /^[a-z0-9][a-z0-9._/-]{0,511}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{1,127}$/;
const encoder = new TextEncoder();
const CONTRACT_VERSION = '2.0';

export const PUBLICATION_STATES = deepFreeze(['received', 'validating', 'persisting', 'persisted', 'enqueued', 'awaiting-aggregation', 'compiling', 'catalog-written', 'manifest-activated', 'completed', 'recoverable-failure', 'definitive-failure']);

export function normalizePublicationKey(value) {
  const key = String(value ?? '').trim().toLowerCase().replace(/^\/+|\/+$/g, '').replace(/\s+/g, '-');
  if (!KEY.test(key) || key.includes('..')) throw new TypeError('Invalid publication key');
  return key;
}

async function sha256(content, cryptoApi) {
  const bytes = await cryptoApi.subtle.digest('SHA-256', encoder.encode(content));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, clean(item)]));
  return value;
}

function allowed(input, fields) {
  if (!isPlainObject(input)) throw new TypeError('Invalid public projection');
  return clean(Object.fromEntries(fields.filter((field) => input[field] !== undefined).map((field) => [field, input[field]])));
}

export function normalizeCityCatalog(input, generatedAt) {
  if (!isPlainObject(input) || !ID.test(input.city?.id ?? '') || !SLUG.test(input.city?.slug ?? '')) throw new TypeError('Invalid city catalog');
  const advertisers = Object.fromEntries((input.advertisers ?? []).map((item) => {
    const publicItem = allowed(item, ['id', 'name', 'slug', 'displayName', 'biography', 'avatarUrl', 'coverUrl', 'publicPhone', 'website']);
    if (!ID.test(publicItem.id ?? '')) throw new TypeError('Invalid public advertiser');
    return [publicItem.id, publicItem];
  }).sort(([a], [b]) => a.localeCompare(b)));
  const categories = (input.categories ?? []).map((item) => allowed(item, ['id', 'slug', 'name', 'description', 'parentId'])).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const listings = (input.listings ?? []).map((item) => allowed(item, ['id', 'slug', 'title', 'description', 'listingType', 'status', 'priceMinor', 'currency', 'categoryId', 'advertiserId', 'district', 'approximateLocation', 'attributes', 'media', 'publishedAt', 'updatedAt'])).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (const item of listings) if (!ID.test(item.id ?? '') || !advertisers[item.advertiserId]) throw new TypeError('Invalid public listing relationship');
  return deepFreeze({ schemaVersion: CONTRACT_VERSION, city: allowed(input.city, ['id', 'slug', 'name', 'region', 'countryCode']), categories, advertisers, listings, filters: clean(input.filters ?? {}), metadata: { generatedAt, listingCount: listings.length } });
}

function cityKeys(slug, version) {
  if (!SLUG.test(slug)) throw new TypeError('Invalid city slug');
  if (!Number.isSafeInteger(version) || version < 1) throw new TypeError('Invalid catalog version');
  return { catalog: `cidades/${slug}/catalogo-v${String(version).padStart(6, '0')}.json`, manifest: `cidades/${slug}/manifest.json` };
}

/** Technical publisher. Projection loading and business eligibility stay in modules. */
export function createPublisher({ renderer, storage, logger, events, crypto: cryptoApi = globalThis.crypto, clock = () => new Date(), id = () => crypto.randomUUID() } = {}) {
  if (!renderer?.render || !storage?.put || !storage?.head || !storage?.get || !logger?.error || !cryptoApi?.subtle || typeof clock !== 'function' || typeof id !== 'function') throw new TypeError('Invalid Publisher dependencies');
  if (events && typeof events.publish !== 'function') throw new TypeError('Invalid Publisher Event Bus');

  async function publishCity(input) {
    if (!isPlainObject(input) || !ID.test(input.cityId ?? '') || !SLUG.test(input.citySlug ?? '') || typeof input.loadProjection !== 'function' || !Number.isSafeInteger(input.version)) throw new TypeError('Invalid city publication');
    const publicationId = input.publicationId ?? `pub_${id()}`; const correlationId = input.correlationId ?? publicationId;
    try {
      const generatedAt = clock().toISOString();
      const catalog = normalizeCityCatalog(await input.loadProjection({ cityId: input.cityId, citySlug: input.citySlug }), generatedAt);
      if (catalog.city.id !== input.cityId || catalog.city.slug !== input.citySlug) throw new TypeError('City projection mismatch');
      const projectionDigest = await sha256(JSON.stringify({ ...catalog, metadata: { ...catalog.metadata, generatedAt: undefined } }, (_key, value) => value === undefined ? undefined : value), cryptoApi);
      const content = JSON.stringify(catalog); const digest = await sha256(content, cryptoApi); const size = encoder.encode(content).byteLength;
      const keys = cityKeys(input.citySlug, input.version); const previousObject = await storage.get(keys.manifest);
      const previous = previousObject?.body ? JSON.parse(typeof previousObject.body === 'string' ? previousObject.body : await new Response(previousObject.body).text()) : null;
      if (previous?.projectionDigest === projectionDigest) return deepFreeze({ ok: true, changed: false, publicationId, correlationId, manifest: previous });
      await storage.put(keys.catalog, content, { contentType: 'application/json; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable', metadata: { digest, projectionDigest, size: String(size), version: String(input.version), cityId: input.cityId, schemaVersion: CONTRACT_VERSION } });
      const confirmed = await storage.head(keys.catalog);
      if (!confirmed || Number(confirmed.size) !== size || confirmed.metadata?.digest !== digest) throw new Error('Catalog confirmation failed');
      const manifest = deepFreeze({ city: { id: input.cityId, slug: input.citySlug }, version: input.version, catalogPath: keys.catalog, updatedAt: generatedAt, digest, projectionDigest, size, schemaVersion: CONTRACT_VERSION, previous: previous ? { version: previous.version, catalogPath: previous.catalogPath, digest: previous.digest, size: previous.size } : null });
      await storage.put(keys.manifest, JSON.stringify(manifest), { contentType: 'application/json; charset=utf-8', cacheControl: 'public, max-age=60, must-revalidate', metadata: { digest, version: String(input.version), cityId: input.cityId, schemaVersion: CONTRACT_VERSION } });
      await emit('CityPublicationCompleted', { publicationId, cityId: input.cityId, citySlug: input.citySlug, version: input.version }, correlationId);
      return deepFreeze({ ok: true, changed: true, publicationId, correlationId, catalogKey: keys.catalog, manifest });
    } catch (error) {
      logger.error('City publication failed', { operation: 'publisher.city', status: 'recoverable-failure', publicationId, correlationId, cityId: input.cityId, error });
      await emit('CityPublicationFailed', { publicationId, cityId: input.cityId, citySlug: input.citySlug }, correlationId);
      return deepFreeze({ ok: false, changed: false, publicationId, correlationId, failure: 'recoverable' });
    }
  }

  async function rollback({ cityId, citySlug, target, correlationId = `corr_${id()}` }) {
    if (!ID.test(cityId ?? '') || !SLUG.test(citySlug ?? '') || !isPlainObject(target) || !Number.isSafeInteger(target.version)) throw new TypeError('Invalid publication rollback');
    const keys = cityKeys(citySlug, target.version); if (target.catalogPath !== keys.catalog) throw new TypeError('Invalid rollback target');
    const object = await storage.head(keys.catalog); if (!object || object.metadata?.cityId !== cityId || object.metadata?.digest !== target.digest) throw new Error('Rollback target unavailable');
    const currentObject = await storage.get(keys.manifest); const current = currentObject?.body ? JSON.parse(typeof currentObject.body === 'string' ? currentObject.body : await new Response(currentObject.body).text()) : null;
    if (current?.version === target.version) return deepFreeze({ ok: true, changed: false, manifest: current });
    const manifest = deepFreeze({ city: { id: cityId, slug: citySlug }, version: target.version, catalogPath: target.catalogPath, updatedAt: clock().toISOString(), digest: target.digest, size: target.size, schemaVersion: CONTRACT_VERSION, previous: current ? { version: current.version, catalogPath: current.catalogPath, digest: current.digest, size: current.size } : null });
    await storage.put(keys.manifest, JSON.stringify(manifest), { contentType: 'application/json; charset=utf-8', cacheControl: 'public, max-age=60, must-revalidate', metadata: { digest: target.digest, version: String(target.version), cityId, schemaVersion: CONTRACT_VERSION } });
    await emit('CityPublicationRolledBack', { cityId, citySlug, version: target.version }, correlationId);
    return deepFreeze({ ok: true, changed: true, manifest });
  }

  async function emit(name, payload, correlationId) { if (events) await events.publish({ name, version: '1.0', source: 'core.publish', payload }, { correlationId }); }
  return Object.freeze({ publishCity, rollback, normalizeKey: normalizePublicationKey, sourceOfTruth: false });
}

/** Deterministically coalesce a Cloudflare Queue delivery batch by affected city. */
export async function consumePublicationBatch(messages, { compile, now = Date.now(), aggregationWindowMs = 1_000, maximumWaitMs = 10_000 } = {}) {
  if (!Array.isArray(messages) || typeof compile !== 'function' || !Number.isFinite(now) || !Number.isSafeInteger(aggregationWindowMs) || !Number.isSafeInteger(maximumWaitMs) || aggregationWindowMs < 0 || maximumWaitMs < aggregationWindowMs) throw new TypeError('Invalid publication aggregation');
  const groups = new Map();
  for (const message of messages) {
    const body = message?.body ?? message; if (!isPlainObject(body) || !ID.test(body.cityId ?? '') || !SLUG.test(body.citySlug ?? '') || typeof body.eventId !== 'string') throw new TypeError('Invalid publication message');
    const key = `${body.cityId}:${body.citySlug}`; const group = groups.get(key) ?? { cityId: body.cityId, citySlug: body.citySlug, eventIds: new Set(), messages: [], firstAt: Date.parse(body.occurredAt) || now };
    group.eventIds.add(body.eventId); group.messages.push(message); groups.set(key, group);
  }
  const results = [];
  for (const group of [...groups.values()].sort((a, b) => a.citySlug.localeCompare(b.citySlug))) {
    const waitedMs = Math.max(0, now - group.firstAt); const dueAt = now + Math.min(aggregationWindowMs, Math.max(0, maximumWaitMs - waitedMs));
    try { results.push(await compile({ cityId: group.cityId, citySlug: group.citySlug, eventIds: Object.freeze([...group.eventIds].sort()), dueAt })); for (const item of group.messages) item.ack?.(); }
    catch (error) { for (const item of group.messages) item.retry?.(); results.push({ ok: false, cityId: group.cityId, retry: true }); }
  }
  return deepFreeze(results);
}

/** Validate one explicit, atomic panel submission and its persisted quota decision. */
export async function submitChangePackage(input, { authorize, persist, quota, limit = 5, maxOperations = 50, maxBytes = 262_144, timezone = 'UTC' } = {}) {
  if (!isPlainObject(input) || !ID.test(input.userId ?? '') || !/^pkg_[A-Za-z0-9_-]{3,}$/.test(input.idempotencyKey ?? '') || !Array.isArray(input.operations) || input.operations.length < 1 || input.operations.length > maxOperations) throw new TypeError('Invalid change package');
  if (encoder.encode(JSON.stringify(input)).byteLength > maxBytes || typeof authorize !== 'function' || typeof persist !== 'function' || typeof quota !== 'function' || !Number.isSafeInteger(limit) || limit < 1) throw new TypeError('Invalid change package');
  await authorize(input.userId, input.operations);
  const decision = await quota({ userId: input.userId, idempotencyKey: input.idempotencyKey, limit, timezone, exempt: input.exempt === true });
  if (!decision.allowed) { const error = new Error('Daily submission limit exceeded'); error.code = 'SUBMISSION_LIMIT_EXCEEDED'; throw error; }
  if (decision.duplicate === true) return deepFreeze({ ...(isPlainObject(decision.result) ? decision.result : { ok: true }), duplicated: true, quota: { limit, remaining: decision.remaining } });
  const result = await persist(input); return deepFreeze({ ...result, duplicated: false, quota: { limit, remaining: decision.remaining } });
}
