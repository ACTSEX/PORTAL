const encoder = new TextEncoder();

export class R2PrivateStorage {
  constructor(bucket) { if (!bucket) throw new Error('STORAGE_PRIVATE_UNAVAILABLE'); this.bucket = bucket; }
  async get(key) { validateKey(key); const object = await this.bucket.get(key); return object ? JSON.parse(await object.text()) : null; }
  async put(key, value, options = {}) { validateKey(key); const body = JSON.stringify(value); const onlyIf = options.createOnly ? { etagDoesNotMatch: '*' } : undefined; const result = await this.bucket.put(key, body, { httpMetadata: { contentType: 'application/json' }, onlyIf }); if (options.createOnly && !result) throw conflict(); return value; }
  async putBytes(key, bytes, contentType) { validateKey(key); return this.bucket.put(key, bytes, { httpMetadata: { contentType } }); }
  async getBytes(key) { validateKey(key); const object = await this.bucket.get(key); return object ? new Uint8Array(await object.arrayBuffer()) : null; }
  async delete(key) { validateKey(key); await this.bucket.delete(key); }
  async list(prefix) { validateKey(prefix); const result = await this.bucket.list({ prefix }); return result.objects.map(({ key }) => key); }
}

export class MemoryPrivateStorage {
  constructor() { this.data = new Map(); this.byteWrites = []; }
  async get(key) { validateKey(key); const value = this.data.get(key); return value === undefined ? null : structuredClone(value); }
  async put(key, value, options = {}) { validateKey(key); if (options.createOnly && this.data.has(key)) throw conflict(); this.data.set(key, structuredClone(value)); return value; }
  async putBytes(key, bytes, contentType) { validateKey(key); const copy = new Uint8Array(bytes); this.byteWrites.push({ key, bytes: copy, contentType }); this.data.set(key, { binary: true, contentType, bytes: copy }); }
  async getBytes(key) { validateKey(key); const value = this.data.get(key); return value?.binary ? new Uint8Array(value.bytes) : null; }
  async delete(key) { validateKey(key); this.data.delete(key); }
  async list(prefix) { validateKey(prefix); return [...this.data.keys()].filter((key) => key.startsWith(prefix)); }
}

export function privateStorage(env) { return env?.__storage || new R2PrivateStorage(env?.acts_private); }
export function bindingsDisponiveis(env) { return Boolean(env?.acts_private && env?.acts_public); }
export function validateKey(key) { if (typeof key !== 'string' || !key || key.startsWith('/') || key.includes('..') || key.includes('\\') || /[\0-\x1f]/.test(key)) throw new TypeError('STORAGE_KEY_INVALID'); return key; }
export function conflict() { return Object.assign(new Error('REVISION_CONFLICT'), { status: 409, code: 'REVISION_CONFLICT' }); }
export async function sha256(value) { return hex(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? encoder.encode(value) : value)); }
export async function hmac(value, secret) { if (!secret) throw new Error('CPF_INDEX_SECRET_MISSING'); const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value))); }
function hex(buffer) { return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
