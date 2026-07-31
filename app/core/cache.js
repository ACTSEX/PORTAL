import { isPlainObject } from './helpers.js';

const KEY = /^[a-z0-9][a-z0-9._:/-]{0,511}$/;
function keyPart(value) { return String(value).trim().toLowerCase().replace(/\s+/g, '-'); }

/** Build a deterministic, scoped cache key. */
export function createCacheKey(namespace, visibility, key) {
  const output = [namespace, visibility, key].map(keyPart).join(':');
  if (!KEY.test(output) || !['public', 'private'].includes(keyPart(visibility))) throw new TypeError('Invalid cache key');
  return output;
}

/** Create a fail-open technical cache backed by an injected KV binding. */
export function createCache({ binding, logger, namespace = 'acts', visibility = 'private', defaultTtl = 300 }) {
  if (!binding || !['get', 'put', 'delete'].every((method) => typeof binding[method] === 'function')) throw new TypeError('Invalid KV binding');
  if (!logger || typeof logger.warn !== 'function') throw new TypeError('Cache requires a valid logger');
  if (!Number.isInteger(defaultTtl) || defaultTtl <= 0) throw new TypeError('Invalid cache TTL');
  const normalize = (key) => createCacheKey(namespace, visibility, key);
  async function safe(operation, fallback, action) {
    try { return await action(); } catch (error) {
      logger.warn('Cache operation failed', { operation, status: 'failed', error });
      return fallback;
    }
  }
  async function get(key) {
    return safe('cache.get', Object.freeze({ hit: false, value: null, metadata: null }), async () => {
      const stored = await binding.get(normalize(key), { type: 'text' });
      if (stored === null || stored === undefined) return Object.freeze({ hit: false, value: null, metadata: null });
      try {
        const envelope = JSON.parse(stored);
        if (!isPlainObject(envelope) || !('value' in envelope)) throw new Error('corrupt');
        return Object.freeze({ hit: true, value: envelope.value, metadata: Object.freeze(envelope.metadata ?? {}) });
      } catch { logger.warn('Cache value is invalid', { operation: 'cache.get', status: 'invalid' }); return Object.freeze({ hit: false, value: null, metadata: null }); }
    });
  }
  async function set(key, value, { ttl = defaultTtl, metadata = {} } = {}) {
    if (!Number.isInteger(ttl) || ttl <= 0 || !isPlainObject(metadata)) throw new TypeError('Invalid cache entry');
    return safe('cache.set', false, async () => { await binding.put(normalize(key), JSON.stringify({ value, metadata }), { expirationTtl: ttl }); return true; });
  }
  const remove = (key) => safe('cache.delete', false, async () => { await binding.delete(normalize(key)); return true; });
  return Object.freeze({ get, set, delete: remove, invalidate: remove, key: normalize, sourceOfTruth: false });
}
