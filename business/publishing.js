import { deepFreeze, isPlainObject } from '../core/app.js';
import { cityProjectionKey, profileProjectionKey } from './public-content.js';

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
const CONTRACT_VERSION = 1;
const PUBLICATION_TYPE = 'PUBLICATION_REQUESTED';
const ENTITIES = new Set(['city', 'profile']);
const REASON = /^[a-z][a-z0-9.-]{1,79}$/;

export function validatePublicationRequest(input, { clock = () => new Date() } = {}) {
  if (!isPlainObject(input)) throw new TypeError('Invalid publication request');
  const entity = String(input.entity ?? '').trim().toLowerCase();
  const requestedAt = input.requestedAt ?? clock().toISOString();
  if (input.type !== PUBLICATION_TYPE || !ENTITIES.has(entity) || !ID.test(input.id ?? '')
    || !SLUG.test(input.slug ?? '') || !REASON.test(input.reason ?? '')
    || typeof requestedAt !== 'string' || Number.isNaN(Date.parse(requestedAt))) {
    throw new TypeError('Invalid publication request');
  }
  return deepFreeze({ type: PUBLICATION_TYPE, entity, id: input.id, slug: input.slug, reason: input.reason, requestedAt });
}

/** Domain producer: validates one rebuild request and lets Queue delivery handle retries. */
export function createPublicationQueue({ binding, logger, clock } = {}) {
  if (!binding?.send || !logger?.info || !logger?.error) throw new TypeError('Invalid publication Queue dependencies');
  async function send(input) {
    const message = validatePublicationRequest(input, { clock });
    try {
      await binding.send(message, { contentType: 'json' });
      logger.info('Publication requested', { operation: 'queue.send', status: 'enqueued', entity: message.entity, id: message.id, slug: message.slug });
      return message;
    } catch (error) {
      logger.error('Publication request failed', { operation: 'queue.send', status: 'recoverable-failure', entity: message.entity, id: message.id, slug: message.slug, error });
      throw error;
    }
  }
  return Object.freeze({ send, validate: (input) => validatePublicationRequest(input, { clock }) });
}

export const PUBLICATION_STATES = deepFreeze(['received', 'validating', 'persisting', 'persisted', 'enqueued', 'awaiting-aggregation', 'compiling', 'projection-written', 'completed', 'recoverable-failure', 'definitive-failure']);

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

export function normalizeCityProjection(input, generatedAt) {
  if (!isPlainObject(input) || !SLUG.test(input.slug ?? '') || typeof input.name !== 'string' || !Array.isArray(input.listings ?? [])) throw new TypeError('Invalid city projection');
  const listings = input.listings.map((item) => allowed(item, ['id', 'slug', 'profileSlug', 'name', 'category', 'directory', 'tags', 'coverUrl', 'premium', 'boosted', 'boostEndsAt', 'publicAge', 'shortCall', 'presentation', 'services', 'gallery', 'contacts']))
    .sort((a, b) => Number(Boolean(b.boosted)) - Number(Boolean(a.boosted)) || Number(Boolean(b.premium)) - Number(Boolean(a.premium)) || String(a.id).localeCompare(String(b.id)));
  for (const item of listings) if (!ID.test(item.id ?? '') || !SLUG.test(item.slug ?? '') || (item.profileSlug !== undefined && !SLUG.test(item.profileSlug))) throw new TypeError('Invalid public listing');
  return deepFreeze({ schemaVersion: CONTRACT_VERSION, slug: input.slug, name: input.name, generatedAt, directories: clean(input.directories ?? []), categories: clean(input.categories ?? []), tags: clean(input.tags ?? []), listings });
}

export function normalizeProfileProjection(input, generatedAt) {
  if (!isPlainObject(input) || !SLUG.test(input.slug ?? '') || typeof input.name !== 'string') throw new TypeError('Invalid profile projection');
  const projection = { schemaVersion: CONTRACT_VERSION, slug: input.slug, name: input.name, generatedAt, city: allowed(input.city ?? {}, ['slug', 'name']), premium: true, presentation: String(input.presentation ?? ''), categories: clean(input.categories ?? []), services: clean(input.services ?? []), tags: clean(input.tags ?? []), gallery: clean(input.gallery ?? []), contacts: allowed(input.contacts ?? {}, ['phone', 'whatsapp', 'website', 'instagram']) };
  if (typeof input.bloggerFeedUrl === 'string' && input.bloggerFeedUrl.startsWith('https://')) projection.bloggerFeedUrl = input.bloggerFeedUrl;
  return deepFreeze(projection);
}

/** Technical publisher. Projection loading and business eligibility stay in modules. */
export function createPublisher({ storage, logger, events, crypto: cryptoApi = globalThis.crypto, clock = () => new Date(), id = () => crypto.randomUUID() } = {}) {
  if (!storage?.put || !storage?.delete || !logger?.error || !cryptoApi?.subtle || typeof clock !== 'function' || typeof id !== 'function') throw new TypeError('Invalid Publisher dependencies');
  if (events && typeof events.publish !== 'function') throw new TypeError('Invalid Publisher Event Bus');

  async function publishCity(input) {
    if (!isPlainObject(input) || !ID.test(input.cityId ?? '') || !SLUG.test(input.citySlug ?? '') || typeof input.loadProjection !== 'function') throw new TypeError('Invalid city publication');
    const publicationId = input.publicationId ?? `pub_${id()}`; const correlationId = input.correlationId ?? publicationId;
    try {
      const generatedAt = clock().toISOString();
      const projection = normalizeCityProjection(await input.loadProjection({ cityId: input.cityId, citySlug: input.citySlug }), generatedAt);
      if (projection.slug !== input.citySlug) throw new TypeError('City projection mismatch');
      const content = JSON.stringify(projection); const digest = await sha256(content, cryptoApi); const key = cityProjectionKey(input.citySlug);
      await storage.put(key, content, { contentType: 'application/json; charset=utf-8', cacheControl: 'public, max-age=60, must-revalidate', metadata: { digest, cityId: input.cityId, schemaVersion: String(CONTRACT_VERSION) } });
      await emit('CityPublicationCompleted', { publicationId, cityId: input.cityId, citySlug: input.citySlug }, correlationId);
      return deepFreeze({ ok: true, changed: true, publicationId, correlationId, key, projection, digest });
    } catch (error) {
      logger.error('City publication failed', { operation: 'publisher.city', status: 'recoverable-failure', publicationId, correlationId, cityId: input.cityId, error });
      await emit('CityPublicationFailed', { publicationId, cityId: input.cityId, citySlug: input.citySlug }, correlationId);
      throw error;
    }
  }

  async function publishProfile(input) {
    if (!isPlainObject(input) || !SLUG.test(input.profileSlug ?? '') || typeof input.loadProjection !== 'function') throw new TypeError('Invalid profile publication');
    const key = profileProjectionKey(input.profileSlug); const source = await input.loadProjection({ profileSlug: input.profileSlug });
    if (!source) { await storage.delete(key); return deepFreeze({ ok: true, changed: true, published: false, key }); }
    const eligible = source.premium === true && source.active !== false && source.suspended !== true;
    if (!eligible) { await storage.delete(key); return deepFreeze({ ok: true, changed: true, published: false, key }); }
    const projection = normalizeProfileProjection(source, clock().toISOString());
    if (projection.slug !== input.profileSlug) throw new TypeError('Profile projection mismatch');
    try {
      const content = JSON.stringify(projection); const digest = await sha256(content, cryptoApi);
      await storage.put(key, content, { contentType: 'application/json; charset=utf-8', cacheControl: 'public, max-age=60, must-revalidate', metadata: { digest, schemaVersion: String(CONTRACT_VERSION) } });
      return deepFreeze({ ok: true, changed: true, published: true, key, projection, digest });
    } catch (error) { logger.error('Profile publication failed', { operation: 'publisher.profile', status: 'recoverable-failure', profileSlug: input.profileSlug, error }); throw error; }
  }

  async function emit(name, payload, correlationId) { if (events) await events.publish({ name, version: '1.0', source: 'core.publish', payload }, { correlationId }); }
  return Object.freeze({ publishCity, publishProfile, normalizeKey: normalizePublicationKey, sourceOfTruth: false });
}

/** Deterministically coalesce a Cloudflare Queue delivery batch by affected city. */
export async function consumePublicationBatch(messages, { publish, logger } = {}) {
  if (!Array.isArray(messages) || typeof publish !== 'function' || !logger?.info || !logger?.error) throw new TypeError('Invalid publication consumer');
  const groups = new Map();
  for (const message of messages) {
    let body;
    try { body = validatePublicationRequest(message?.body ?? message); }
    catch (error) { logger.error('Invalid publication message discarded', { operation: 'queue.consume', status: 'definitive-failure', error }); message?.ack?.(); continue; }
    const key = `${body.entity}:${body.id}:${body.slug}`;
    const group = groups.get(key) ?? { request: body, messages: [] };
    group.messages.push(message); groups.set(key, group);
  }
  const results = [];
  for (const group of groups.values()) {
    try {
      results.push(await publish(group.request));
      for (const item of group.messages) item.ack?.();
      logger.info('Publication message completed', { operation: 'queue.consume', status: 'completed', entity: group.request.entity, id: group.request.id, slug: group.request.slug });
    } catch (error) {
      for (const item of group.messages) item.retry?.();
      logger.error('Publication message retrying', { operation: 'queue.consume', status: 'recoverable-failure', entity: group.request.entity, id: group.request.id, slug: group.request.slug, error });
      results.push({ ok: false, entity: group.request.entity, id: group.request.id, retry: true });
    }
  }
  return deepFreeze(results);
}

const parse = (value, fallback) => { try { return JSON.parse(value ?? fallback); } catch { return JSON.parse(fallback); } };

/** Minimal authoritative reads needed by the canonical publisher. */
export function createPublicationReader({ db, clock = () => new Date() } = {}) {
  if (!db?.first || !db?.all) throw new TypeError('Invalid publication reader database');
  async function loadCity({ cityId, citySlug }) {
    const city = await db.first('SELECT id, slug, public_name FROM cities WHERE id = ? AND slug = ? AND active = 1', [cityId, citySlug]);
    if (!city) throw new Error('Authoritative city not found');
    const rows = (await db.all(`SELECT l.id, l.slug, l.title, l.description, l.attributes_json, c.slug AS category_slug,
      p.user_id AS profile_id, p.display_name, p.bio, m.id AS cover_media_id, m.r2_key AS cover_media_key,
      CASE WHEN u.status = 'active' AND ((s.id IS NOT NULL AND lower(pl.code) = 'premium') OR EXISTS(SELECT 1 FROM commercial_conditions cc WHERE cc.user_id=u.id AND cc.status IN ('active','scheduled') AND cc.type IN ('trial','courtesy','promotion','temporary_free') AND cc.starts_at<=? AND (cc.ends_at IS NULL OR cc.ends_at>?))) THEN 1 ELSE 0 END AS premium,
      (SELECT MAX(b.ends_at) FROM boosts b WHERE b.listing_id = l.id AND b.status = 'active' AND b.starts_at <= ? AND b.ends_at > ?) AS boost_ends_at
      FROM listings l JOIN categories c ON c.id = l.category_id JOIN users u ON u.id = l.owner_id
      LEFT JOIN profiles p ON p.user_id = l.owner_id
      LEFT JOIN subscriptions s ON s.user_id = l.owner_id AND s.status = 'active'
      LEFT JOIN plans pl ON pl.id = s.plan_id AND pl.active = 1
      LEFT JOIN media m ON m.id = (SELECT id FROM media WHERE listing_id = l.id AND media_type = 'image' ORDER BY sort_order, id LIMIT 1)
      WHERE l.city_id = ? AND l.status = 'published' ORDER BY boost_ends_at IS NULL, premium DESC, l.id`, [clock().toISOString(), clock().toISOString(), clock().toISOString(), clock().toISOString(), cityId])).results;
    const listings = rows.map((row) => ({ id: row.id, slug: row.slug, profileSlug: row.slug, name: row.display_name || row.title, category: row.category_slug, tags: parse(row.attributes_json, '{}').tags ?? [], coverUrl: row.cover_media_key ? `https://media.imobiliarista.net/${row.cover_media_key}` : undefined, premium: Boolean(row.premium), boosted: Boolean(row.boost_ends_at), boostEndsAt: row.boost_ends_at ?? undefined, presentation: row.bio || row.description }));
    return { slug: city.slug, name: city.public_name, categories: [...new Set(listings.map((item) => item.category))], tags: [...new Set(listings.flatMap((item) => item.tags))], listings };
  }
  async function loadProfile({ profileId, profileSlug }) {
    const row = await db.first(`SELECT l.id, l.slug, l.title, l.description, l.attributes_json, l.city_id,
      p.display_name, p.bio, p.phone, p.website_url, p.social_links_json, u.status AS user_status, bi.url AS blogger_url,
      c.slug AS city_slug, c.public_name AS city_name, cat.slug AS category_slug,
      CASE WHEN (s.id IS NOT NULL AND pl.code = 'premium' AND pl.active = 1) OR EXISTS(SELECT 1 FROM commercial_conditions cc WHERE cc.user_id=u.id AND cc.status IN ('active','scheduled') AND cc.type IN ('trial','courtesy','promotion','temporary_free') AND cc.starts_at<=? AND (cc.ends_at IS NULL OR cc.ends_at>?)) THEN 1 ELSE 0 END AS premium
      FROM listings l JOIN users u ON u.id = l.owner_id LEFT JOIN profiles p ON p.user_id = l.owner_id
      LEFT JOIN cities c ON c.id = l.city_id JOIN categories cat ON cat.id = l.category_id
      LEFT JOIN subscriptions s ON s.user_id = l.owner_id AND s.status = 'active'
      LEFT JOIN plans pl ON pl.id = s.plan_id
      LEFT JOIN blogger_integrations bi ON bi.user_id = l.owner_id AND bi.status <> 'disabled'
      WHERE l.id = ? AND l.slug = ?`, [clock().toISOString(), clock().toISOString(), profileId, profileSlug]);
    if (!row) return null;
    const media = (await db.all("SELECT id, r2_key FROM media WHERE listing_id = ? AND media_type = 'image' ORDER BY sort_order, id", [profileId])).results.map((item) => ({ id: item.id, url: `https://media.imobiliarista.net/${item.r2_key}` }));
    const attributes = parse(row.attributes_json, '{}'); const social = parse(row.social_links_json, '{}');
    const source = { slug: row.slug, name: row.display_name || row.title, premium: Boolean(row.premium), active: row.user_status === 'active', suspended: row.user_status === 'suspended', cityId: row.city_id, city: { slug: row.city_slug, name: row.city_name }, presentation: row.bio || row.description, categories: [row.category_slug], services: attributes.services ?? [], tags: attributes.tags ?? [], gallery: media, contacts: { phone: row.phone, website: row.website_url, instagram: social.instagram, whatsapp: social.whatsapp } };
    if (source.premium && row.blogger_url) source.bloggerFeedUrl = row.blogger_url;
    return source;
  }
  return Object.freeze({ loadCity, loadProfile });
}

export function createPublicationConsumer({ publisher, reader, logger } = {}) {
  if (!publisher?.publishCity || !publisher?.publishProfile || !reader?.loadCity || !reader?.loadProfile) throw new TypeError('Invalid publication consumer dependencies');
  return (messages) => consumePublicationBatch(messages, { logger, async publish(request) {
    if (request.entity === 'city') return publisher.publishCity({ cityId: request.id, citySlug: request.slug, loadProjection: reader.loadCity });
    const source = await reader.loadProfile({ profileId: request.id, profileSlug: request.slug });
    const profile = await publisher.publishProfile({ profileSlug: request.slug, loadProjection: () => source });
    if (source?.cityId && source.city?.slug) await publisher.publishCity({ cityId: source.cityId, citySlug: source.city.slug, loadProjection: reader.loadCity });
    return profile;
  } });
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
