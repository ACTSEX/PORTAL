import { isPublicSlug, readPublicProjection } from '../business/public-content.js';
import { portalJs } from '../frontend/portal/app.js';
import { portalCss } from '../frontend/portal/styles.js';
import { portalDocument } from '../frontend/portal/template.js';
import { minisiteCss } from '../frontend/minisite/styles.js';
import { minisiteDocument, minisiteNotFound } from '../frontend/minisite/template.js';
import { painelDocument } from '../frontend/painel/template.js';
import { painelCss } from '../frontend/painel/styles.js';
import { painelJs } from '../frontend/painel/app.js';
import { createDatabase } from '../core/db.js';
import { createLogger } from '../core/logger.js';
import { createStorage } from '../core/storage.js';
import { createPublicationConsumer, createPublicationReader, createPublisher } from '../business/publishing.js';
import { createPublicationQueue } from '../business/publishing.js';
import { AuthError, createSessionAuth, sessionCookie, validateOrigin, verifyPassword } from '../core/auth.js';

const APEX = new Set(['acompanhantesex.com', 'www.acompanhantesex.com', 'localhost', '127.0.0.1']);
const JSON_CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400';
const HTML_HEADERS = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=300', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' };
const PROFILE_FIELDS = new Set(['displayName', 'bio', 'phone', 'website', 'instagram', 'whatsapp']);

function runtime(env) {
  const logger = createLogger({ config: { logLevel: 'info', environment: env.ENVIRONMENT ?? 'production', service: 'portal', version: '0.1.0' }, sink: (record, serialized) => (record.level === 'error' ? console.error : console.log)(serialized) });
  const db = createDatabase({ binding: env.ACTS_DB, logger });
  return { logger, db, auth: createSessionAuth({ db, logger }), publications: createPublicationQueue({ binding: env.ACTS_QUEUE, logger }) };
}

const apiJson = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } });
async function body(request) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new TypeError('invalid input');
  const value = await request.json(); if (!value || Array.isArray(value) || typeof value !== 'object') throw new TypeError('invalid input'); return value;
}
async function ownData(db, user) {
  const profile = await db.first('SELECT display_name, bio, phone, website_url, social_links_json FROM profiles WHERE user_id = ?', [user.id]);
  const subscription = await db.first(`SELECT pl.code FROM subscriptions s JOIN plans pl ON pl.id = s.plan_id
    WHERE s.user_id = ? AND s.status = 'active' AND pl.active = 1`, [user.id]);
  let social = {}; try { social = JSON.parse(profile?.social_links_json ?? '{}'); } catch { /* Invalid legacy JSON is not exposed. */ }
  return { user: { id: user.id, email: user.email }, profile: profile ? { displayName: profile.display_name, bio: profile.bio, phone: profile.phone, website: profile.website_url, instagram: social.instagram ?? null, whatsapp: social.whatsapp ?? null } : null, plan: subscription?.code?.toUpperCase() ?? 'STANDARD' };
}

async function apiResponse(request, env, url) {
  const app = runtime(env);
  try {
    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      validateOrigin(request); const input = await body(request);
      if (typeof input.email !== 'string' || typeof input.password !== 'string' || input.email.length > 254) throw new TypeError('invalid input');
      const user = await app.db.first('SELECT id, email, password_hash, role, status FROM users WHERE email = ? COLLATE NOCASE', [input.email.trim()]);
      if (!user || user.status !== 'active' || !await verifyPassword(input.password, user.password_hash)) {
        app.logger.warn('Login denied', { operation: 'auth.login', status: 'denied' });
        return apiJson({ error: 'invalid_credentials' }, 401);
      }
      const session = await app.auth.create(user.id);
      return apiJson({ authenticated: true, user: { id: user.id, email: user.email } }, 200, { 'set-cookie': sessionCookie(session.token, session.maxAge) });
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      validateOrigin(request); await app.auth.revoke(request);
      return apiJson({ authenticated: false }, 200, { 'set-cookie': sessionCookie(null, 0) });
    }
    if (request.method === 'GET' && url.pathname === '/api/me') {
      const identity = await app.auth.authenticate(request); return apiJson(await ownData(app.db, identity.user));
    }
    if (request.method === 'PATCH' && url.pathname === '/api/me/profile') {
      validateOrigin(request); const identity = await app.auth.authenticate(request); const input = await body(request);
      const keys = Object.keys(input); if (!keys.length || keys.some((key) => !PROFILE_FIELDS.has(key))) return apiJson({ error: 'invalid_fields' }, 400);
      for (const value of Object.values(input)) if (value !== null && typeof value !== 'string') return apiJson({ error: 'invalid_input' }, 400);
      const current = await app.db.first('SELECT social_links_json FROM profiles WHERE user_id = ?', [identity.user.id]);
      if (!current) return apiJson({ error: 'not_found' }, 404);
      let social = {}; try { social = JSON.parse(current.social_links_json); } catch { social = {}; }
      if ('instagram' in input) social.instagram = input.instagram; if ('whatsapp' in input) social.whatsapp = input.whatsapp;
      await app.db.write(`UPDATE profiles SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), phone = COALESCE(?, phone),
        website_url = COALESCE(?, website_url), social_links_json = ?, updated_at = ? WHERE user_id = ?`,
      [input.displayName ?? null, input.bio ?? null, input.phone ?? null, input.website ?? null, JSON.stringify(social), new Date().toISOString(), identity.user.id]);
      const listing = await app.db.first("SELECT id, slug FROM listings WHERE owner_id = ? AND status = 'published' ORDER BY id LIMIT 1", [identity.user.id]);
      if (listing) await app.publications.send({ type: 'PUBLICATION_REQUESTED', entity: 'profile', id: listing.id, slug: listing.slug, reason: 'profile.updated', requestedAt: new Date().toISOString() });
      return apiJson({ updated: true, publicationScheduled: Boolean(listing), ...(await ownData(app.db, identity.user)) });
    }
    return apiJson({ error: 'not_found' }, 404);
  } catch (error) {
    if (error instanceof AuthError) return apiJson({ error: error.status === 403 ? 'forbidden' : 'unauthenticated' }, error.status);
    if (error instanceof SyntaxError || error instanceof TypeError) return apiJson({ error: 'invalid_input' }, 400);
    app.logger.error('Private API failed', { operation: 'api.private', status: 'failed', route: url.pathname, error });
    return apiJson({ error: 'internal_error' }, 500);
  }
}

function asset(path, minisite = false) {
  if (path === '/assets/portal.css') return new Response(portalCss, { headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
  if (path === '/assets/portal.js') return new Response(portalJs, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
  if (path === '/assets/painel.css' && !minisite) return new Response(painelCss, { headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
  if (path === '/assets/painel.js' && !minisite) return new Response(painelJs, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
  if (path === '/assets/minisite.css' && minisite) return new Response(minisiteCss, { headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
  return null;
}

async function dataResponse(request, env, kind, slug) {
  if (!isPublicSlug(slug)) return new Response('Invalid public projection path', { status: 400 });
  const cache = globalThis.caches?.default;
  const cacheKey = new Request(request.url, { method: 'GET' });
  let hit = null;
  if (cache) { try { hit = await cache.match(cacheKey); } catch { /* Cache is an optional optimization. */ } }
  if (hit) {
    const etag = hit.headers.get('etag');
    if (etag && request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag, 'cache-control': hit.headers.get('cache-control') ?? JSON_CACHE } });
    return hit;
  }
  const object = await readPublicProjection(env.ACTS_DATA, kind, slug);
  if (!object) return Response.json({ error: 'not_found' }, { status: 404, headers: { 'cache-control': 'public, max-age=30', 'x-content-type-options': 'nosniff' } });
  if (object.etag && request.headers.get('if-none-match') === object.etag) return new Response(null, { status: 304, headers: { etag: object.etag, 'cache-control': JSON_CACHE } });
  const headers = { 'content-type': object.contentType, 'cache-control': JSON_CACHE, 'x-content-type-options': 'nosniff' };
  if (object.etag) headers.etag = object.etag;
  const response = new Response(object.body, { headers });
  if (cache) { try { await cache.put(cacheKey, response.clone()); } catch { /* Keep serving the R2 response. */ } }
  return response;
}

async function apexResponse(request, env, url) {
  const foundAsset = asset(url.pathname);
  if (foundAsset) return foundAsset;
  if (url.pathname === '/painel' || url.pathname === '/painel/') return new Response(painelDocument(), { headers: { ...HTML_HEADERS, 'cache-control': 'no-store' } });
  const dataMatch = url.pathname.match(/^\/data\/(cities|profiles)\/([a-z0-9-]+)$/);
  if (dataMatch) return dataResponse(request, env, dataMatch[1], dataMatch[2]);
  if (url.pathname.startsWith('/data/')) return new Response('Invalid public projection path', { status: 400 });
  const parts = url.pathname.split('/').filter(Boolean);
  const validPortal = parts.length === 0 || (isPublicSlug(parts[0]) && (parts.length === 1 || (parts.length === 2 && /^dir[123]$/.test(parts[1])) || (parts.length === 3 && parts[1] === 'anuncio' && isPublicSlug(parts[2]))));
  if (!validPortal) return new Response('Not found', { status: 404 });
  return new Response(portalDocument(), { headers: HTML_HEADERS });
}

async function minisiteResponse(request, env, url, slug) {
  const foundAsset = asset(url.pathname, true);
  if (foundAsset) return foundAsset;
  if (url.pathname !== '/') return new Response('Not found', { status: 404 });
  const object = await readPublicProjection(env.ACTS_DATA, 'profiles', slug);
  if (!object) return new Response(minisiteNotFound(), { status: 404, headers: { ...HTML_HEADERS, 'cache-control': 'public, max-age=30' } });
  try {
    const profile = JSON.parse(await new Response(object.body).text());
    return new Response(minisiteDocument(profile, slug), { headers: HTML_HEADERS });
  } catch {
    return new Response(minisiteNotFound(), { status: 404, headers: HTML_HEADERS });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (APEX.has(hostname) && url.pathname.startsWith('/api/')) return apiResponse(request, env, url);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    if (APEX.has(hostname)) return apexResponse(request, env, url);
    const suffix = '.acompanhantesex.com';
    if (!hostname.endsWith(suffix)) return new Response('Unknown host', { status: 400 });
    const slug = hostname.slice(0, -suffix.length);
    if (!isPublicSlug(slug) || slug.includes('.')) return new Response('Invalid minisite hostname', { status: 400 });
    return minisiteResponse(request, env, url, slug);
  },
  async queue(batch, env) {
    const logger = createLogger({ config: { logLevel: 'info', environment: env.ENVIRONMENT ?? 'production', service: 'portal', version: '0.1.0' }, sink: (record, serialized) => (record.level === 'error' ? console.error : console.log)(serialized) });
    const db = createDatabase({ binding: env.ACTS_DB, logger });
    const storage = createStorage({ binding: env.ACTS_DATA, logger });
    const publisher = createPublisher({ storage, logger });
    const reader = createPublicationReader({ db });
    return createPublicationConsumer({ publisher, reader, logger })(batch.messages);
  },
};
