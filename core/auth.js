import { deepFreeze, isPlainObject } from './app.js';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const PERMISSION_PATTERN = /^[a-z][a-z0-9]*(?:[.:_-][a-z0-9]+)*$/;
const encoder = new TextEncoder();

export class AuthError extends Error {
  constructor(code = 'AUTHENTICATION_REQUIRED', message = 'Authentication required', status = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

export class AuthorizationError extends AuthError {
  constructor() {
    super('FORBIDDEN', 'Access denied', 403);
    this.name = 'AuthorizationError';
  }
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new AuthError('INVALID_CREDENTIAL', 'Invalid credential');
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new AuthError('INVALID_CREDENTIAL', 'Invalid credential');
  }
}

function validateLogger(logger) {
  if (!logger || typeof logger.info !== 'function' || typeof logger.warn !== 'function') {
    throw new TypeError('Auth requires a valid logger');
  }
}

function normalizeSecret(secret) {
  if (typeof secret === 'string') {
    if (secret.length < 32) throw new TypeError('Auth secret must contain at least 32 characters');
    return encoder.encode(secret);
  }
  if (!(secret instanceof Uint8Array) || secret.byteLength < 32) {
    throw new TypeError('Auth secret must contain at least 32 bytes');
  }
  return secret.slice();
}

function normalizePermissions(permissions = []) {
  if (!Array.isArray(permissions) || permissions.some((item) => !PERMISSION_PATTERN.test(item))) {
    throw new TypeError('Invalid permissions');
  }
  return Object.freeze([...new Set(permissions)].sort());
}

function normalizeIdentity(value) {
  if (!isPlainObject(value) || typeof value.id !== 'string' || value.id.trim() === '') {
    throw new AuthError('INVALID_CREDENTIAL', 'Invalid credential');
  }
  return deepFreeze({ id: value.id.trim(), permissions: normalizePermissions(value.permissions),
    issuedAt: value.issuedAt, expiresAt: value.expiresAt });
}

/** Read only explicitly supported credentials, without returning cookies or headers. */
export function extractCredential(request) {
  if (!(request instanceof Request)) throw new TypeError('A native Request is required');
  const authorization = request.headers.get('authorization');
  if (authorization !== null) {
    const match = authorization.match(/^Bearer ([^\s]+)$/);
    if (!match) throw new AuthError('INVALID_CREDENTIAL', 'Invalid credential');
    return Object.freeze({ scheme: 'bearer', value: match[1] });
  }
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  const matches = cookie.split(';').map((part) => part.trim().split('='))
    .filter(([name]) => name === '__Host-acts_session');
  if (matches.length !== 1 || matches[0].length !== 2 || !matches[0][1]) {
    if (matches.length) throw new AuthError('INVALID_CREDENTIAL', 'Invalid credential');
    return null;
  }
  return Object.freeze({ scheme: 'session', value: matches[0][1] });
}

/** Validate an HTTP Origin against an explicit HTTPS allowlist. */
export function validateOrigin(request, allowedOrigins, { optional = false } = {}) {
  if (!(request instanceof Request) || !Array.isArray(allowedOrigins)
    || allowedOrigins.length === 0 || allowedOrigins.some((value) => typeof value !== 'string')) {
    throw new TypeError('Invalid origin validation options');
  }
  const origin = request.headers.get('origin');
  if (!origin && optional) return false;
  let normalized;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password) throw new Error();
    normalized = url.origin;
  } catch { throw new AuthError('INVALID_ORIGIN', 'Request origin rejected', 403); }
  if (!allowedOrigins.includes(normalized)) throw new AuthError('INVALID_ORIGIN', 'Request origin rejected', 403);
  return true;
}

/** Constant-time comparison for equal-length byte sequences. */
export function timingSafeEqual(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array)) {
    throw new TypeError('Byte arrays are required');
  }
  let difference = left.byteLength ^ right.byteLength;
  const length = Math.max(left.byteLength, right.byteLength);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index % (left.byteLength || 1)] ?? 0)
      ^ (right[index % (right.byteLength || 1)] ?? 0);
  }
  return difference === 0;
}

/** Generate an unpredictable, URL-safe technical identifier. */
export function createSecureId(prefix = 'id', cryptoApi = globalThis.crypto) {
  if (!/^[a-z][a-z0-9_]{0,15}$/.test(prefix) || !cryptoApi?.getRandomValues) {
    throw new TypeError('Invalid secure identifier options');
  }
  return `${prefix}_${bytesToBase64Url(cryptoApi.getRandomValues(new Uint8Array(18)))}`;
}

async function hmac(secret, value, cryptoApi) {
  const key = await cryptoApi.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await cryptoApi.subtle.sign('HMAC', key, encoder.encode(value)));
}

function validateTimes(payload, now, maxLifetime) {
  if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) || payload.exp <= payload.iat
    || payload.iat > now + 30 || payload.exp <= now || payload.exp - payload.iat > maxLifetime) {
    const expired = Number.isInteger(payload.exp) && payload.exp <= now;
    throw new AuthError(expired ? 'CREDENTIAL_EXPIRED' : 'INVALID_CREDENTIAL',
      expired ? 'Credential expired' : 'Invalid credential');
  }
}

/** Create an isolated signed-token authenticator and generic permission guard. */
export function createAuth(options) {
  if (!isPlainObject(options)) throw new TypeError('Auth options must be a plain object');
  const { logger, crypto: cryptoApi = globalThis.crypto, clock = () => new Date(),
    maxLifetime = 3600, issuer = 'acts-portal' } = options;
  validateLogger(logger);
  const secret = normalizeSecret(options.secret);
  if (!cryptoApi?.subtle || typeof clock !== 'function' || !Number.isInteger(maxLifetime)
    || maxLifetime < 1 || typeof issuer !== 'string' || issuer === '') throw new TypeError('Invalid Auth options');

  async function issue(identity, lifetime = maxLifetime) {
    const normalized = normalizeIdentity(identity);
    if (!Number.isInteger(lifetime) || lifetime < 1 || lifetime > maxLifetime) throw new TypeError('Invalid token lifetime');
    const now = Math.floor(clock().getTime() / 1000);
    const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ sub: normalized.id,
      permissions: normalized.permissions, iat: now, exp: now + lifetime, iss: issuer })));
    return `${payload}.${bytesToBase64Url(await hmac(secret, payload, cryptoApi))}`;
  }

  async function validate(credential) {
    if (!credential || !TOKEN_PATTERN.test(credential.value ?? '')) throw new AuthError('INVALID_CREDENTIAL', 'Invalid credential');
    const [encoded, signature] = credential.value.split('.');
    const expected = await hmac(secret, encoded, cryptoApi);
    if (!timingSafeEqual(expected, base64UrlToBytes(signature))) throw new AuthError('INVALID_CREDENTIAL', 'Invalid credential');
    let payload;
    try { payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))); } catch { throw new AuthError('INVALID_CREDENTIAL', 'Invalid credential'); }
    if (!isPlainObject(payload) || payload.iss !== issuer) throw new AuthError('INVALID_CREDENTIAL', 'Invalid credential');
    validateTimes(payload, Math.floor(clock().getTime() / 1000), maxLifetime);
    return normalizeIdentity({ id: payload.sub, permissions: payload.permissions,
      issuedAt: new Date(payload.iat * 1000).toISOString(), expiresAt: new Date(payload.exp * 1000).toISOString() });
  }

  async function authenticate(request, { required = true } = {}) {
    const credential = extractCredential(request);
    if (!credential && !required) return deepFreeze({ authenticated: false, identity: null });
    if (!credential) throw new AuthError();
    try {
      const identity = await validate(credential);
      logger.info('Authentication succeeded', { operation: 'auth.authenticate', status: 'success' });
      return deepFreeze({ authenticated: true, identity });
    } catch (error) {
      logger.warn('Authentication failed', { operation: 'auth.authenticate', status: 'denied', code: error.code });
      throw error instanceof AuthError ? error : new AuthError('INVALID_CREDENTIAL', 'Invalid credential');
    }
  }

  function authorize(context, permissions, { all = true } = {}) {
    const required = normalizePermissions(permissions);
    if (!context?.authenticated || !context.identity || required.length === 0) throw new AuthorizationError();
    const available = new Set(context.identity.permissions ?? []);
    const allowed = all ? required.every((item) => available.has(item)) : required.some((item) => available.has(item));
    if (!allowed) throw new AuthorizationError();
    return true;
  }

  return Object.freeze({ issue, validate, authenticate, optional: (request) => authenticate(request, { required: false }), authorize });
}
