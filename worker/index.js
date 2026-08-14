import { isPublicSlug, readPublicProjection } from '../business/public-content.js';
import { portalJs } from '../frontend/portal/app.js';
import { portalCss } from '../frontend/portal/styles.js';
import { portalDocument } from '../frontend/portal/template.js';
import { minisiteCss } from '../frontend/minisite/styles.js';
import { minisiteDocument, minisiteNotFound } from '../frontend/minisite/template.js';
import { createDatabase } from '../core/db.js';
import { createLogger } from '../core/logger.js';
import { createStorage } from '../core/storage.js';
import { createPublicationConsumer, createPublicationReader, createPublisher } from '../business/publishing.js';

const APEX = new Set(['acompanhantesex.com', 'www.acompanhantesex.com', 'localhost', '127.0.0.1']);
const JSON_CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400';
const HTML_HEADERS = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=300', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' };

function asset(path, minisite = false) {
  if (path === '/assets/portal.css') return new Response(portalCss, { headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
  if (path === '/assets/portal.js') return new Response(portalJs, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
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
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
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
