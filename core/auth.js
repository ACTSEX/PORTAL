import { deepFreeze } from './app.js';

const encoder = new TextEncoder();
const COOKIE = '__Host-acts_session';
const PASSWORD_PATTERN = /^pbkdf2-sha256\$(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/;
const DEFAULT_ITERATIONS = 210_000;

export class AuthError extends Error {
  constructor(code = 'AUTHENTICATION_REQUIRED', message = 'Authentication required', status = 401) {
    super(message); this.name = 'AuthError'; this.code = code; this.status = status;
  }
}

const base64url = (bytes) => {
  let value = ''; for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};
const decode = (value) => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try { return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=')), (item) => item.charCodeAt(0)); } catch { return null; }
};
const hex = (bytes) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

export function timingSafeEqual(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array)) throw new TypeError('Byte arrays are required');
  let difference = left.byteLength ^ right.byteLength; const length = Math.max(left.byteLength, right.byteLength);
  for (let index = 0; index < length; index += 1) difference |= (left[index % (left.byteLength || 1)] ?? 0) ^ (right[index % (right.byteLength || 1)] ?? 0);
  return difference === 0;
}

async function derive(password, salt, iterations, cryptoApi) {
  const key = await cryptoApi.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await cryptoApi.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

/** Password hashes use Web Crypto PBKDF2-SHA-256, with a per-password random salt. */
export async function hashPassword(password, { crypto: cryptoApi = globalThis.crypto, iterations = DEFAULT_ITERATIONS } = {}) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 1024 || !cryptoApi?.subtle || !cryptoApi.getRandomValues || !Number.isInteger(iterations) || iterations < 100_000) throw new TypeError('Invalid password hashing options');
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${iterations}$${base64url(salt)}$${base64url(await derive(password, salt, iterations, cryptoApi))}`;
}

export async function verifyPassword(password, encoded, { crypto: cryptoApi = globalThis.crypto } = {}) {
  if (typeof password !== 'string' || password.length > 1024 || typeof encoded !== 'string' || !cryptoApi?.subtle) return false;
  const match = encoded.match(PASSWORD_PATTERN); if (!match) return false;
  const iterations = Number(match[1]); const salt = decode(match[2]); const expected = decode(match[3]);
  if (!Number.isInteger(iterations) || iterations < 100_000 || iterations > 2_000_000 || !salt || !expected) return false;
  return timingSafeEqual(await derive(password, salt, iterations, cryptoApi), expected);
}

export function extractSessionToken(request) {
  const cookie = request.headers.get('cookie'); if (!cookie) return null;
  const matches = cookie.split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${COOKIE}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(COOKIE.length + 1); return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export function sessionCookie(token, maxAge) {
  const value = token ?? ''; const age = Number.isInteger(maxAge) ? `; Max-Age=${maxAge}` : '';
  return `${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax${age}`;
}

export function validateOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin || !origin.startsWith('https://')) throw new AuthError('INVALID_ORIGIN', 'Request origin rejected', 403);
  return true;
}

/** Revocable D1-backed sessions. Only SHA-256(token) is persisted. */
export function createSessionAuth({ db, logger, crypto: cryptoApi = globalThis.crypto, clock = () => new Date(), lifetimeSeconds = 604_800 } = {}) {
  if (!db?.first || !db?.write || !logger?.info || !logger?.warn || !cryptoApi?.subtle || !cryptoApi.getRandomValues) throw new TypeError('Invalid session authentication dependencies');
  const digest = async (token) => hex(await cryptoApi.subtle.digest('SHA-256', encoder.encode(token)));
  async function create(userId) {
    const token = base64url(cryptoApi.getRandomValues(new Uint8Array(32))); const id = await digest(token);
    const now = clock(); const expires = new Date(now.getTime() + lifetimeSeconds * 1000);
    await db.write('INSERT INTO sessions (id, user_id, expires_at, last_seen_at, created_at) VALUES (?, ?, ?, ?, ?)', [id, userId, expires.toISOString(), now.toISOString(), now.toISOString()]);
    logger.info('Session created', { operation: 'auth.session.create', status: 'completed', userId });
    return Object.freeze({ token, expiresAt: expires.toISOString(), maxAge: lifetimeSeconds });
  }
  async function authenticate(request, { required = true } = {}) {
    const token = extractSessionToken(request);
    if (!token) { if (!required) return null; throw new AuthError(); }
    const row = await db.first(`SELECT s.id AS session_id, s.user_id, s.expires_at, s.revoked_at, u.email, u.role, u.status
      FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`, [await digest(token)]);
    if (!row || row.revoked_at || Date.parse(row.expires_at) <= clock().getTime() || row.status !== 'active') {
      logger.warn('Authentication failed', { operation: 'auth.authenticate', status: 'denied' });
      if (!required) return null; throw new AuthError();
    }
    return deepFreeze({ sessionId: row.session_id, user: { id: row.user_id, email: row.email, role: row.role, status: row.status } });
  }
  async function revoke(request) {
    const token = extractSessionToken(request); if (!token) return false;
    await db.write('UPDATE sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?', [clock().toISOString(), await digest(token)]);
    logger.info('Session revoked', { operation: 'auth.session.revoke', status: 'completed' }); return true;
  }
  return Object.freeze({ create, authenticate, optional: (request) => authenticate(request, { required: false }), revoke, hashToken: digest });
}
