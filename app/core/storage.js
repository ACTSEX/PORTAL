import { isPlainObject } from './helpers.js';

const OBJECT_KEY = /^(?!\/)(?!.*(?:^|\/)\.\.?\/)[^\\\u0000-\u001f]{1,1024}$/;
function normalizeObject(object) {
  if (!object) return null;
  return Object.freeze({ key: object.key, size: Number(object.size ?? 0), etag: object.etag ?? null, uploaded: object.uploaded ?? null, contentType: object.httpMetadata?.contentType ?? null, metadata: Object.freeze({ ...(object.customMetadata ?? {}) }), body: object.body });
}

/** Create generic object-storage operations from an injected R2 binding. */
export function createStorage({ binding, logger }) {
  if (!binding || !['put', 'get', 'head', 'delete'].every((method) => typeof binding[method] === 'function')) throw new TypeError('Invalid R2 binding');
  if (!logger || typeof logger.error !== 'function') throw new TypeError('Storage requires a valid logger');
  const validateKey = (key) => { if (typeof key !== 'string' || !OBJECT_KEY.test(key)) throw new TypeError('Invalid storage key'); return key; };
  async function perform(operation, action) {
    try { return await action(); } catch (error) { logger.error('Storage operation failed', { operation, status: 'failed', error }); throw new Error('Storage operation failed', { cause: error }); }
  }
  async function put(key, value, { contentType, metadata = {}, cacheControl } = {}) {
    validateKey(key);
    if (value === undefined || value === null || !isPlainObject(metadata)) throw new TypeError('Invalid storage object');
    if (contentType !== undefined && (typeof contentType !== 'string' || contentType.trim() === '')) throw new TypeError('Invalid content type');
    if (cacheControl !== undefined && (typeof cacheControl !== 'string' || cacheControl.trim() === '')) throw new TypeError('Invalid cache control');
    return perform('storage.put', async () => normalizeObject(await binding.put(key, value, { httpMetadata: (contentType || cacheControl) ? { ...(contentType && { contentType }), ...(cacheControl && { cacheControl }) } : undefined, customMetadata: metadata })));
  }
  const get = (key) => perform('storage.get', async () => normalizeObject(await binding.get(validateKey(key))));
  const head = (key) => perform('storage.head', async () => normalizeObject(await binding.head(validateKey(key))));
  const exists = async (key) => (await head(key)) !== null;
  const remove = (key) => perform('storage.delete', async () => { await binding.delete(validateKey(key)); return true; });
  return Object.freeze({ put, get, head, exists, delete: remove, validateKey });
}
