import { XMLParser, XMLValidator } from 'fast-xml-parser';
import sanitizeHtmlLibrary from 'sanitize-html';

export const BLOGGER_LIMITS = Object.freeze({ posts: 10, bytes: 512 * 1024, timeoutMs: 8000, redirects: 4 });

export class BloggerError extends Error {
  constructor(code) { super('Blogger synchronization failed'); this.name = 'BloggerError'; this.code = code; }
}

function forbiddenHostname(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host === 'metadata.google.internal') return true;
  if (host === '::1' || host === '0:0:0:0:0:0:0:1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return true;
  const parts = host.split('.');
  if (parts.length === 4 && parts.every((part) => /^\d+$/.test(part) && Number(part) <= 255)) {
    const [a, b] = parts.map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  return false;
}

export function validateBloggerUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new BloggerError('INVALID_URL');
  let url; try { url = new URL(value.trim()); } catch { throw new BloggerError('INVALID_URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || forbiddenHostname(url.hostname)) throw new BloggerError('INVALID_URL');
  url.hash = ''; url.search = ''; url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.toString().replace(/\/$/, '');
}

export function sanitizePostHtml(input) {
  return sanitizeHtmlLibrary(String(input ?? ''), {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'h2', 'h3', 'a', 'img'],
    allowedAttributes: { a: ['href', 'title', 'rel'], img: ['src', 'alt', 'title'] },
    allowedSchemes: ['https'], allowedSchemesByTag: { a: ['https'], img: ['https'] }, allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attributes) => ({ tagName, attribs: { ...(safeHttps(attributes.href) ? { ...attributes, href: safeHttps(attributes.href) } : {}), rel: 'noopener noreferrer' } }),
      img: (tagName, attributes) => ({ tagName, attribs: safeHttps(attributes.src) ? { src: safeHttps(attributes.src), ...(attributes.alt ? { alt: attributes.alt } : {}), ...(attributes.title ? { title: attributes.title } : {}) } : {} }),
    },
    disallowedTagsMode: 'discard', enforceHtmlBoundary: true,
  }).trim();
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', processEntities: true, trimValues: false });
const list = (value) => value === undefined ? [] : Array.isArray(value) ? value : [value];
const text = (value) => typeof value === 'string' ? value : value?.['#text'] ?? '';
const safeHttps = (value) => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null; } catch { return null; } };
const date = (value) => { const parsed = Date.parse(value); return Number.isNaN(parsed) ? null : new Date(parsed).toISOString(); };

export function parseBloggerFeed(xml, configuredUrl) {
  if (XMLValidator.validate(xml) !== true) throw new BloggerError('INVALID_FEED');
  let document; try { document = parser.parse(xml); } catch { throw new BloggerError('INVALID_FEED'); }
  const feed = document?.feed;
  const generator = text(feed?.generator).toLowerCase();
  if (!feed || (!generator.includes('blogger') && !String(feed?.['@_xmlns:blogger'] ?? '').toLowerCase().includes('blogger'))) throw new BloggerError('NOT_BLOGGER');
  const seen = new Set(); const posts = [];
  for (const entry of list(feed.entry)) {
    const original = list(entry.link).find((link) => link?.['@_rel'] === 'alternate');
    const url = safeHttps(original?.['@_href']); const id = text(entry.id).trim();
    if (!id || !url || seen.has(id)) continue;
    seen.add(id); const content = sanitizePostHtml(text(entry.content)); const summary = sanitizePostHtml(text(entry.summary));
    const image = list(entry?.['media:thumbnail'])[0]?.['@_url'] ?? list(entry?.['media:content'])[0]?.['@_url'];
    posts.push({ id: id.slice(0, 300), title: sanitizeHtmlLibrary(text(entry.title), { allowedTags: [] }).trim().slice(0, 200), url, publishedAt: date(text(entry.published)), updatedAt: date(text(entry.updated)), excerpt: summary.slice(0, 1000), content: content.slice(0, 20_000), imageUrl: safeHttps(image) });
    if (posts.length === BLOGGER_LIMITS.posts) break;
  }
  return { source: 'blogger', url: configuredUrl, posts };
}

async function limitedText(response, maxBytes) {
  const declared = Number(response.headers.get('content-length')); if (declared > maxBytes) throw new BloggerError('FEED_TOO_LARGE');
  if (!response.body?.getReader) { const value = await response.text(); if (new TextEncoder().encode(value).byteLength > maxBytes) throw new BloggerError('FEED_TOO_LARGE'); return value; }
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > maxBytes) { await reader.cancel(); throw new BloggerError('FEED_TOO_LARGE'); } chunks.push(value); }
  const merged = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; } return new TextDecoder().decode(merged);
}

export async function syncBlogger({ url, fetcher = fetch, timeoutMs = BLOGGER_LIMITS.timeoutMs } = {}) {
  const configuredUrl = validateBloggerUrl(url); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let target = new URL('/feeds/posts/default?alt=atom&max-results=10', `${configuredUrl}/`);
    let response;
    for (let redirects = 0; redirects <= BLOGGER_LIMITS.redirects; redirects += 1) {
      validateBloggerUrl(target.toString());
      try { response = await fetcher(target, { redirect: 'manual', signal: controller.signal, headers: { accept: 'application/atom+xml, application/xml;q=0.9' } }); } catch (error) { throw new BloggerError(error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR'); }
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location'); if (!location || redirects === BLOGGER_LIMITS.redirects) throw new BloggerError('INVALID_REDIRECT');
      target = new URL(location, target); validateBloggerUrl(target.toString());
    }
    if (!response?.ok) throw new BloggerError(`HTTP_${response?.status ?? 0}`);
    return parseBloggerFeed(await limitedText(response, BLOGGER_LIMITS.bytes), configuredUrl);
  } finally { clearTimeout(timer); }
}
