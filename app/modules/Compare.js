const FIELDS = Object.freeze(['categoryId', 'listingType', 'priceMinor', 'currency', 'location.countryCode', 'location.region', 'location.city', 'location.district', 'attributes']);
export class CompareError extends Error { constructor(code, message = 'Comparison operation failed') { super(message); this.name = 'CompareError'; this.code = code; } }
const valueAt = (item, field) => field.split('.').reduce((value, key) => value?.[key], item);
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
function safe(item) { const output = { id: item.id, categoryId: item.categoryId, slug: item.slug, title: item.title, listingType: item.listingType, priceMinor: item.priceMinor, currency: item.currency,
  location: item.location && { countryCode: item.location.countryCode, region: item.location.region, city: item.location.city, district: item.location.district }, attributes: item.attributes, publishedAt: item.publishedAt }; return Object.freeze(output); }

export function createCompare({ getPublicListing, minItems = 2, maxItems = 4, events = null, id = null, clock = () => new Date() } = {}) {
  if (typeof getPublicListing !== 'function' || !Number.isInteger(minItems) || !Number.isInteger(maxItems) || minItems < 2 || maxItems < minItems) throw new TypeError('Invalid Compare dependencies');
  async function compare(ids, context = {}) {
    if (!Array.isArray(ids) || ids.some((value) => typeof value !== 'string' || !value.trim())) throw new CompareError('INVALID_IDS');
    const unique = [...new Set(ids.map((value) => value.trim()))]; if (unique.length < minItems || unique.length > maxItems) throw new CompareError('INVALID_QUANTITY');
    const loaded = await Promise.all(unique.map((listingId) => getPublicListing(listingId)));
    if (loaded.some((item) => !item)) throw new CompareError('LISTING_NOT_FOUND'); if (loaded.some((item) => item.status !== 'published' || !item.publishedAt)) throw new CompareError('LISTING_NOT_ELIGIBLE');
    const items = loaded.map(safe); const fields = Object.fromEntries(FIELDS.map((field) => { const values = items.map((item) => valueAt(item, field)); return [field, Object.freeze({ values: Object.freeze(values), same: values.every((value) => equal(value, values[0])) })]; }));
    const result = Object.freeze({ ids: Object.freeze(unique), items: Object.freeze(items), fields: Object.freeze(fields), similarities: Object.freeze(FIELDS.filter((field) => fields[field].same)), differences: Object.freeze(FIELDS.filter((field) => !fields[field].same)) });
    if (events?.publish && typeof id === 'function') await events.publish({ name: 'ComparisonCreated', version: '1.0', source: 'Compare', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { listingIds: unique }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
    return result;
  }
  return Object.freeze({ compare, fields: FIELDS, minItems, maxItems });
}
