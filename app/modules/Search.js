const TYPES = new Set(['sale', 'rent']); const SORTS = new Set(['published-desc', 'price-asc', 'price-desc', 'title-asc']);
const clean = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
export class SearchError extends Error { constructor(code, message = 'Search operation failed') { super(message); this.name = 'SearchError'; this.code = code; } }

export function normalizeSearchCriteria(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new SearchError('INVALID_CRITERIA');
  const allowed = new Set(['text', 'categoryId', 'listingType', 'countryCode', 'region', 'city', 'currency', 'minPriceMinor', 'maxPriceMinor', 'attributes', 'page', 'pageSize', 'sort']);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new SearchError('UNSUPPORTED_FILTER');
  const criteria = { text: clean(input.text).toLocaleLowerCase('pt-BR'), categoryId: clean(input.categoryId) || null, listingType: input.listingType ?? null,
    countryCode: clean(input.countryCode).toUpperCase() || null, region: clean(input.region) || null, city: clean(input.city) || null, currency: clean(input.currency).toUpperCase() || null,
    minPriceMinor: input.minPriceMinor ?? null, maxPriceMinor: input.maxPriceMinor ?? null, attributes: input.attributes ?? {}, page: input.page ?? 1, pageSize: input.pageSize ?? 20, sort: input.sort ?? 'published-desc' };
  if ((criteria.listingType && !TYPES.has(criteria.listingType)) || (criteria.countryCode && !/^[A-Z]{2}$/.test(criteria.countryCode)) || (criteria.currency && !/^[A-Z]{3}$/.test(criteria.currency))
    || !Number.isSafeInteger(criteria.page) || criteria.page < 1 || !Number.isSafeInteger(criteria.pageSize) || criteria.pageSize < 1 || criteria.pageSize > 100 || !SORTS.has(criteria.sort)
    || [criteria.minPriceMinor, criteria.maxPriceMinor].some((value) => value !== null && (!Number.isSafeInteger(value) || value < 0)) || (criteria.minPriceMinor !== null && criteria.maxPriceMinor !== null && criteria.minPriceMinor > criteria.maxPriceMinor)
    || !criteria.attributes || typeof criteria.attributes !== 'object' || Array.isArray(criteria.attributes)) throw new SearchError('INVALID_CRITERIA');
  return Object.freeze({ ...criteria, attributes: Object.freeze({ ...criteria.attributes }) });
}
function eligible(item) { return item && item.status === 'published' && item.publishedAt && typeof item.priceMinor === 'number'; }
function matches(item, criteria) {
  const location = item.location ?? {}; const haystack = `${item.title ?? ''} ${item.description ?? ''}`.toLocaleLowerCase('pt-BR');
  return (!criteria.text || haystack.includes(criteria.text)) && (!criteria.categoryId || item.categoryId === criteria.categoryId) && (!criteria.listingType || item.listingType === criteria.listingType)
    && (!criteria.countryCode || location.countryCode === criteria.countryCode) && (!criteria.region || location.region === criteria.region) && (!criteria.city || location.city === criteria.city)
    && (!criteria.currency || item.currency === criteria.currency) && (criteria.minPriceMinor === null || item.priceMinor >= criteria.minPriceMinor) && (criteria.maxPriceMinor === null || item.priceMinor <= criteria.maxPriceMinor)
    && Object.entries(criteria.attributes).every(([key, value]) => item.attributes?.[key] === value);
}
function compare(sort) { return (left, right) => { if (sort === 'price-asc' || sort === 'price-desc') { const delta = left.priceMinor - right.priceMinor; if (delta) return sort === 'price-asc' ? delta : -delta; }
  if (sort === 'title-asc') { const delta = left.title.localeCompare(right.title, 'pt-BR'); if (delta) return delta; } else { const delta = String(right.publishedAt).localeCompare(String(left.publishedAt)); if (delta) return delta; } return left.id.localeCompare(right.id); }; }
function safe(item) { const { id, categoryId, slug, title, description, listingType, priceMinor, currency, attributes, publishedAt, media } = item; const source = item.location ?? {};
  const location = Object.freeze({ countryCode: source.countryCode, region: source.region, city: source.city, district: source.district ?? null });
  return Object.freeze({ id, categoryId, slug, title, description, listingType, priceMinor, currency, location, attributes, publishedAt, media: Object.freeze(media ?? []) }); }

export function createSearch({ listPublished, events = null, id = null, clock = () => new Date() } = {}) {
  if (typeof listPublished !== 'function') throw new TypeError('Invalid Search dependencies');
  async function search(input = {}, context = {}) {
    const criteria = normalizeSearchCriteria(input); const supplied = await listPublished(criteria); if (!Array.isArray(supplied)) throw new SearchError('INVALID_SOURCE');
    const all = supplied.filter(eligible).filter((item) => matches(item, criteria)).sort(compare(criteria.sort)); const start = (criteria.page - 1) * criteria.pageSize;
    const result = Object.freeze({ criteria, page: criteria.page, pageSize: criteria.pageSize, total: all.length, items: Object.freeze(all.slice(start, start + criteria.pageSize).map(safe)) });
    if (events?.publish && typeof id === 'function') await events.publish({ name: 'SearchPerformed', version: '1.0', source: 'Search', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { resultCount: result.items.length }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
    return result;
  }
  return Object.freeze({ search, normalizeCriteria: normalizeSearchCriteria, sorts: Object.freeze([...SORTS]) });
}
