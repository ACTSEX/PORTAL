import { isPlainObject } from './app.js';

const KEY = /^[a-z0-9][a-z0-9._:/-]{0,511}$/;
const ORIGIN = 'https://cache.acts.internal';
function keyPart(value) { return String(value).trim().toLowerCase().replace(/\s+/g, '-'); }

/** Build a deterministic, scoped HTTP cache key. */
export function createCacheKey(namespace, visibility, key) {
  const output = [namespace, visibility, key].map(keyPart).join(':');
  if (!KEY.test(output) || !['public', 'private'].includes(keyPart(visibility))) throw new TypeError('Invalid cache key');
  return output;
}

/** Create a fail-open adapter for the Cloudflare Cache API. */
export function createCache({ binding = globalThis.caches?.default, logger, namespace = 'acts', visibility = 'private', defaultTtl = 300 } = {}) {
  if (!binding || !['match', 'put', 'delete'].every((method) => typeof binding[method] === 'function')) throw new TypeError('Invalid HTTP cache binding');
  if (!logger || typeof logger.warn !== 'function') throw new TypeError('Cache requires a valid logger');
  if (!Number.isInteger(defaultTtl) || defaultTtl <= 0) throw new TypeError('Invalid cache TTL');
  const key = (value) => createCacheKey(namespace, visibility, value);
  const request = (value) => new Request(`${ORIGIN}/${encodeURIComponent(key(value))}`);
  async function safe(operation, fallback, action) {
    try { return await action(); } catch (error) {
      logger.warn('Cache operation failed', { operation, status: 'failed', error });
      return fallback;
    }
  }
  async function get(value) {
    return safe('cache.get', Object.freeze({ hit: false, value: null, metadata: null }), async () => {
      const response = await binding.match(request(value));
      if (!response) return Object.freeze({ hit: false, value: null, metadata: null });
      try {
        const envelope = await response.json();
        if (!isPlainObject(envelope) || !('value' in envelope)) throw new Error('corrupt');
        return Object.freeze({ hit: true, value: envelope.value, metadata: Object.freeze(envelope.metadata ?? {}) });
      } catch {
        logger.warn('Cache value is invalid', { operation: 'cache.get', status: 'invalid' });
        return Object.freeze({ hit: false, value: null, metadata: null });
      }
    });
  }
  async function set(value, data, { ttl = defaultTtl, metadata = {} } = {}) {
    if (!Number.isInteger(ttl) || ttl <= 0 || !isPlainObject(metadata)) throw new TypeError('Invalid cache entry');
    return safe('cache.set', false, async () => {
      const response = Response.json({ value: data, metadata }, { headers: { 'cache-control': `${visibility}, max-age=${ttl}` } });
      await binding.put(request(value), response);
      return true;
    });
  }
  const invalidate = (value) => safe('cache.invalidate', false, () => binding.delete(request(value)));
  return Object.freeze({ get, set, invalidate, key, sourceOfTruth: false });
}
