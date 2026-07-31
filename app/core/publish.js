import { isPlainObject } from './helpers.js';

const KEY = /^[a-z0-9][a-z0-9._/-]{0,511}$/;
const encoder = new TextEncoder();
const METADATA_KEY = /^[a-z][a-zA-Z0-9]{0,31}$/;

export function normalizePublicationKey(value) {
  const key = String(value ?? '').trim().toLowerCase().replace(/^\/+|\/+$/g, '').replace(/\s+/g, '-');
  if (!KEY.test(key) || key.includes('..')) throw new TypeError('Invalid publication key');
  return key;
}

async function digest(content, cryptoApi) {
  const bytes = await cryptoApi.subtle.digest('SHA-256', encoder.encode(content));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeMetadata(value = {}) {
  if (!isPlainObject(value)) throw new TypeError('Invalid publication metadata');
  const entries = Object.entries(value);
  if (entries.some(([key, item]) => !METADATA_KEY.test(key)
    || !['string', 'number', 'boolean'].includes(typeof item))) {
    throw new TypeError('Invalid publication metadata');
  }
  return Object.freeze(Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right))));
}

function normalizeInvalidations(value = []) {
  if (!Array.isArray(value)) throw new TypeError('Invalid cache invalidations');
  return Object.freeze([...new Set(value.map(normalizePublicationKey))].sort());
}

/** Create the technical, derived-artifact publisher. */
export function createPublisher({ renderer, cache, storage, logger, events, crypto: cryptoApi = globalThis.crypto,
  id = () => crypto.randomUUID() } = {}) {
  if (!renderer || typeof renderer.render !== 'function' || !cache || typeof cache.get !== 'function'
    || typeof cache.set !== 'function' || typeof cache.invalidate !== 'function'
    || !storage || typeof storage.put !== 'function' || !logger || typeof logger.error !== 'function'
    || !cryptoApi?.subtle || typeof id !== 'function') throw new TypeError('Invalid Publisher dependencies');
  if (events && typeof events.publish !== 'function') throw new TypeError('Invalid Publisher Event Bus');

  async function publish(input) {
    if (!isPlainObject(input) || !['kv', 'r2'].includes(input.destination)
      || !['html', 'json'].includes(input.format)) throw new TypeError('Invalid publication');
    const key = normalizePublicationKey(input.key); const invalidations = normalizeInvalidations(input.invalidateKeys);
    const controlled = normalizeMetadata(input.metadata); const publicationId = input.publicationId ?? `pub_${id()}`;
    const correlationId = input.correlationId ?? publicationId; const failures = [];
    try {
      const content = await renderer.render({ template: input.template, layout: input.layout,
        data: input.data, context: input.context, format: input.format });
      const version = await digest(content, cryptoApi); const manifestKey = `publications/${key}.manifest`;
      const previous = await cache.get(manifestKey);
      if (previous.hit && previous.value?.version === version) return Object.freeze({ ok: true, changed: false, publicationId, correlationId, key, version, failures: Object.freeze([]) });
      const metadata = Object.freeze({ publicationId, correlationId, version, format: input.format, ...controlled });
      try {
        if (input.destination === 'kv') {
          if (!await cache.set(key, content, { metadata })) throw new Error('KV write failed');
        } else await storage.put(key, content, { contentType: input.format === 'html' ? 'text/html; charset=utf-8' : 'application/json', metadata });
      } catch (error) { failures.push('artifact'); logger.error('Publication artifact failed', { operation: 'publisher.write', correlationId, error }); }
      if (!failures.length) {
        for (const invalidation of invalidations) {
          if (!await cache.invalidate(invalidation)) failures.push('invalidation');
        }
        if (!failures.length && !await cache.set(manifestKey,
          { key, version, destination: input.destination, format: input.format }, { metadata })) failures.push('manifest');
      }
      if (events) try {
        const delivery = await events.publish({ name: failures.length ? 'PublicationFailed' : 'ArtifactPublished',
          version: '1.0', source: 'core.publish', payload: { publicationId, key, version } }, { correlationId });
        if (delivery?.failed > 0) failures.push('event');
      } catch (error) { failures.push('event'); logger.error('Publication event failed', { operation: 'publisher.event', correlationId, error }); }
      return Object.freeze({ ok: failures.length === 0, changed: true, partial: failures.length > 0,
        publicationId, correlationId, key, version, failures: Object.freeze(failures) });
    } catch (error) {
      logger.error('Publication failed', { operation: 'publisher.publish', correlationId, error });
      return Object.freeze({ ok: false, changed: false, partial: false, publicationId, correlationId, key, version: null, failures: Object.freeze(['render']) });
    }
  }
  return Object.freeze({ publish, normalizeKey: normalizePublicationKey, sourceOfTruth: false });
}
