import { caseFold } from 'unicode-case-folding';

const STATES = Object.freeze(['draft', 'pending', 'published', 'archived', 'deleted']);
const TYPES = new Set(['sale', 'rent']); const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; const CURRENCY = /^[A-Z]{3}$/; const COUNTRY = /^[A-Z]{2}$/;
export class ListingsError extends Error { constructor(code, message = 'Listing operation failed') { super(message); this.name = 'ListingsError'; this.code = code; } }
const text = (value) => typeof value === 'string' ? value.trim() : '';
const parse = (value) => { try { const result = JSON.parse(value ?? '{}'); return result && typeof result === 'object' && !Array.isArray(result) ? result : {}; } catch { return {}; } };
export const CITY_CANONICALIZATION_VERSION = 'unicode-17.0.0-v1';
const CITY_COMPONENT = /^[a-z0-9]+(?: [a-z0-9]+)*$/;
export function canonicalizeCityLocation(input, version = CITY_CANONICALIZATION_VERSION) {
  if (version !== CITY_CANONICALIZATION_VERSION) throw new ListingsError('UNKNOWN_CANONICALIZATION_VERSION');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ListingsError('INVALID_CITY');
  const countryCode = input.countryCode;
  if (typeof countryCode !== 'string' || !COUNTRY.test(countryCode)) throw new ListingsError('INVALID_CITY');
  const canonicalize = (value, publicLimit) => {
    if (typeof value !== 'string' || [...value].length < 1 || [...value].length > publicLimit || /[\p{Cc}\p{Cs}\p{Cn}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(value)) throw new ListingsError('INVALID_CITY');
    const publicName = value.normalize('NFC').replace(/\s+/gu, ' ').trim();
    let key = caseFold(publicName.normalize('NFKD').replace(/\p{M}/gu, ''));
    key = key.replace(/[‐‑‒–—―−]/gu, '-').replace(/[’‘‛′`´]/gu, "'");
    key = key.replace(/[\p{P}\p{Z}\s]+/gu, ' ');
    if (/[^a-z0-9 ]/u.test(key)) throw new ListingsError('INVALID_CITY');
    key = key.replace(/ +/g, ' ').trim();
    if (!publicName || [...publicName].length > publicLimit || !key || key.length > 80 || !CITY_COMPONENT.test(key)) throw new ListingsError('INVALID_CITY');
    return { publicName, key };
  };
  const region = canonicalize(input.region, 120); const city = canonicalize(input.city, 120);
  return Object.freeze({ countryCode, regionKey: region.key, cityKey: city.key, publicName: city.publicName,
    canonicalKey: `${countryCode}|${region.key}|${city.key}`, canonicalizationVersion: version });
}
export async function createCitySlug(canonicalKey) {
  if (typeof canonicalKey !== 'string' || canonicalKey.length < 5 || canonicalKey.length > 170) throw new ListingsError('INVALID_CITY');
  const parts = canonicalKey.split('|'); if (parts.length !== 3 || !COUNTRY.test(parts[0]) || !CITY_COMPONENT.test(parts[1]) || !CITY_COMPONENT.test(parts[2])) throw new ListingsError('INVALID_CITY');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalKey));
  const suffix = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 12);
  const stem = parts.join('-').toLowerCase().replace(/ +/g, '-'); return `${stem.slice(0, 87).replace(/-+$/g, '')}-${suffix}`;
}
function view(row) { return row && Object.freeze({ id: row.id, ownerId: row.owner_id, categoryId: row.category_id, cityId: row.city_id, slug: row.slug, title: row.title,
  description: row.description, listingType: row.listing_type, status: row.status, priceMinor: row.price_minor, currency: row.currency,
  location: Object.freeze({ countryCode: row.country_code, region: row.region, city: row.city, district: row.district, addressLine: row.address_line, postalCode: row.postal_code, latitude: row.latitude, longitude: row.longitude }),
  attributes: Object.freeze(parse(row.attributes_json)), publishedAt: row.published_at, createdAt: row.created_at, updatedAt: row.updated_at }); }
function normalized(input) {
  const location = input?.location ?? {}; const attributes = input?.attributes;
  const data = { categoryId: text(input?.categoryId), slug: text(input?.slug).toLowerCase(), title: text(input?.title), description: text(input?.description), listingType: input?.listingType,
    priceMinor: input?.priceMinor, currency: input?.currency ?? 'BRL', countryCode: location.countryCode ?? 'BR', region: text(location.region), city: text(location.city), district: location.district == null ? null : text(location.district), addressLine: location.addressLine == null ? null : text(location.addressLine), postalCode: location.postalCode == null ? null : text(location.postalCode), latitude: location.latitude ?? null, longitude: location.longitude ?? null, attributes };
  if (!data.categoryId || !SLUG.test(data.slug) || data.slug.length > 120 || data.title.length < 5 || data.title.length > 160 || data.description.length < 20 || data.description.length > 10000 || !TYPES.has(data.listingType)
    || !Number.isSafeInteger(data.priceMinor) || data.priceMinor < 0 || !CURRENCY.test(data.currency) || !COUNTRY.test(data.countryCode) || data.region.length < 2 || data.region.length > 120 || data.city.length < 2 || data.city.length > 120
    || data.district?.length > 120 || data.addressLine?.length > 240 || data.postalCode?.length > 20 || (data.latitude !== null && (typeof data.latitude !== 'number' || data.latitude < -90 || data.latitude > 90)) || (data.longitude !== null && (typeof data.longitude !== 'number' || data.longitude < -180 || data.longitude > 180))
    || !attributes || typeof attributes !== 'object' || Array.isArray(attributes) || Object.keys(attributes).length > 100) throw new ListingsError('INVALID_LISTING');
  try { JSON.stringify(attributes); } catch { throw new ListingsError('INVALID_LISTING'); } return data;
}
function validateShape(input, partial = false) {
  const allowed = new Set(['categoryId', 'slug', 'title', 'description', 'listingType', 'priceMinor', 'currency', 'location', 'attributes']);
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((key) => !allowed.has(key))) throw new ListingsError('INVALID_LISTING');
  const locationAllowed = new Set(['countryCode', 'region', 'city', 'district', 'addressLine', 'postalCode', 'latitude', 'longitude']);
  if (input.location !== undefined && (!input.location || typeof input.location !== 'object' || Array.isArray(input.location) || Object.keys(input.location).some((key) => !locationAllowed.has(key)))) throw new ListingsError('INVALID_LISTING');
  if (!partial && [...allowed].some((key) => !['currency'].includes(key) && input[key] === undefined)) throw new ListingsError('INVALID_LISTING');
}
function publicView(item, media = []) { if (!item || item.status !== 'published') return null; return Object.freeze({ id: item.id, categoryId: item.categoryId, slug: item.slug, title: item.title, description: item.description, listingType: item.listingType, priceMinor: item.priceMinor, currency: item.currency, location: item.location, attributes: item.attributes, publishedAt: item.publishedAt, media: Object.freeze(media) }); }
export function createListings(options) {
  if (!options?.db?.first || !options.db.write || !options.db.all || !options?.events?.publish || typeof options.id !== 'function' || typeof options.validateCategory !== 'function' || typeof options.listMedia !== 'function') throw new TypeError('Invalid Listings dependencies');
  const { db, events, logger, id, clock = () => new Date(), validateCategory, listMedia } = options;
  const emit = (name, listingId, context = {}, payload = {}) => events.publish({ name, version: '1.0', source: 'Listings', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { listingId, ...payload }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
  const getById = async (listingId) => view(await db.first('SELECT * FROM listings WHERE id = ?', [listingId]));
  const owner = (item, context) => { if (!item) throw new ListingsError('NOT_FOUND'); if (!context?.userId || item.ownerId !== context.userId) throw new ListingsError('FORBIDDEN'); };
  async function validateData(input, exceptId = '') { const data = normalized(input); if (!await validateCategory(data.categoryId)) throw new ListingsError('INVALID_CATEGORY'); if (await db.first('SELECT id FROM listings WHERE slug = ? AND id <> ?', [data.slug, exceptId])) throw new ListingsError('SLUG_EXISTS'); return data; }
  async function resolveCity(data) {
    const canonical = canonicalizeCityLocation(data); const slug = await createCitySlug(canonical.canonicalKey);
    let city = await db.first('SELECT * FROM cities WHERE canonical_key = ?', [canonical.canonicalKey]);
    if (!city) {
      const cityId = `city_${id()}`; const now = clock().toISOString();
      try { await db.write('INSERT INTO cities (id, country_code, region_key, city_key, canonical_key, public_name, slug, canonicalization_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [cityId, canonical.countryCode, canonical.regionKey, canonical.cityKey, canonical.canonicalKey, canonical.publicName, slug, canonical.canonicalizationVersion, now, now]); }
      catch { city = await db.first('SELECT * FROM cities WHERE canonical_key = ?', [canonical.canonicalKey]); if (!city) throw new ListingsError('CITY_CONFLICT'); }
      city ??= await db.first('SELECT * FROM cities WHERE canonical_key = ?', [canonical.canonicalKey]);
    }
    if (!city || city.slug !== slug || city.canonicalization_version !== canonical.canonicalizationVersion || city.country_code !== canonical.countryCode || city.region_key !== canonical.regionKey || city.city_key !== canonical.cityKey) throw new ListingsError('CITY_CONFLICT');
    if (city.active !== 1) throw new ListingsError('INACTIVE_CITY');
    try { await db.write("INSERT INTO city_publication_state (city_id, status) VALUES (?, 'idle')", [city.id]); } catch { if (!await db.first('SELECT city_id FROM city_publication_state WHERE city_id = ?', [city.id])) throw new ListingsError('CITY_CONFLICT'); }
    return city.id;
  }
  async function create(input, context = {}) {
    if (!context.userId) throw new ListingsError('OWNER_REQUIRED'); validateShape(input); const data = await validateData(input); const cityId = await resolveCity(data); const listingId = `lst_${id()}`; const now = clock().toISOString();
    await db.write('INSERT INTO listings (id, owner_id, category_id, city_id, slug, title, description, listing_type, status, price_minor, currency, country_code, region, city, district, address_line, postal_code, latitude, longitude, attributes_json, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [listingId, context.userId, data.categoryId, cityId, data.slug, data.title, data.description, data.listingType, 'draft', data.priceMinor, data.currency, data.countryCode, data.region, data.city, data.district, data.addressLine, data.postalCode, data.latitude, data.longitude, JSON.stringify(data.attributes), null, now, now]);
    logger.info('Listing created', { operation: 'listings.create', status: 'completed', listingId }); await emit('ListingCreated', listingId, context); return getById(listingId);
  }
  async function update(listingId, input, context = {}) {
    const current = await getById(listingId); owner(current, context); if (current.status !== 'draft') throw new ListingsError('IMMUTABLE_STATE');
    const protectedFields = ['id', 'ownerId', 'status', 'publishedAt', 'createdAt', 'updatedAt']; if (protectedFields.some((key) => key in input)) throw new ListingsError('PROTECTED_FIELD');
    validateShape(input, true);
    const merged = { ...current, ...input, location: { ...current.location, ...(input.location ?? {}) }, attributes: input.attributes ?? current.attributes }; const data = await validateData(merged, listingId); const now = clock().toISOString();
    const locationChanged = input.location !== undefined && (data.countryCode !== current.location.countryCode || data.region !== current.location.region || data.city !== current.location.city);
    const cityId = locationChanged || !current.cityId ? await resolveCity(data) : current.cityId;
    await db.write('UPDATE listings SET category_id = ?, city_id = ?, slug = ?, title = ?, description = ?, listing_type = ?, price_minor = ?, currency = ?, country_code = ?, region = ?, city = ?, district = ?, address_line = ?, postal_code = ?, latitude = ?, longitude = ?, attributes_json = ?, updated_at = ? WHERE id = ?', [data.categoryId, cityId, data.slug, data.title, data.description, data.listingType, data.priceMinor, data.currency, data.countryCode, data.region, data.city, data.district, data.addressLine, data.postalCode, data.latitude, data.longitude, JSON.stringify(data.attributes), now, listingId]);
    await emit('ListingUpdated', listingId, context); return getById(listingId);
  }
  async function transition(listingId, expected, target, eventName, context = {}) {
    const current = await getById(listingId); owner(current, context); if (!expected.includes(current.status)) throw new ListingsError('INVALID_TRANSITION');
    if (target === 'pending') normalized(current); const publishedAt = target === 'published' ? clock().toISOString() : current.publishedAt;
    await db.write('UPDATE listings SET status = ?, published_at = ?, updated_at = ? WHERE id = ?', [target, publishedAt, clock().toISOString(), listingId]); await emit(eventName, listingId, context, { from: current.status, to: target }); return getById(listingId);
  }
  async function list(filters = {}) { const page = Number.isSafeInteger(filters.page) && filters.page > 0 ? filters.page : 1; const pageSize = Number.isSafeInteger(filters.pageSize) && filters.pageSize > 0 && filters.pageSize <= 100 ? filters.pageSize : 20; const clauses = []; const parameters = [];
    for (const [key, column] of Object.entries({ ownerId: 'owner_id', categoryId: 'category_id', status: 'status', listingType: 'listing_type', region: 'region', city: 'city', currency: 'currency' })) if (filters[key] !== undefined) { if (key === 'status' && !STATES.includes(filters[key])) throw new ListingsError('INVALID_FILTER'); clauses.push(`${column} = ?`); parameters.push(filters[key]); }
    parameters.push(pageSize, (page - 1) * pageSize); const result = await db.all(`SELECT * FROM listings${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY created_at DESC, id LIMIT ? OFFSET ?`, parameters); return Object.freeze({ page, pageSize, items: Object.freeze(result.results.map(view)) });
  }
  async function getPrivate(listingId, context) { const item = await getById(listingId); owner(item, context); return Object.freeze({ ...item, media: Object.freeze(await listMedia(listingId, context)) }); }
  async function getPublicBySlug(slug) { const item = view(await db.first('SELECT * FROM listings WHERE slug = ? AND status = ?', [text(slug).toLowerCase(), 'published'])); return publicView(item, item ? await listMedia(item.id, {}) : []); }
  const publish = (value, context = {}) => { if (context.canPublish !== true) throw new ListingsError('FORBIDDEN'); return transition(value, ['pending'], 'published', 'ListingPublished', context); };
  return Object.freeze({ create, update, getById, getPrivate, getPublicBySlug, list, submit: (value, ctx) => transition(value, ['draft'], 'pending', 'ListingUpdated', ctx), publish, archive: (value, ctx) => transition(value, ['draft', 'pending', 'published'], 'archived', 'ListingArchived', ctx), remove: (value, ctx) => transition(value, ['draft', 'pending', 'published', 'archived'], 'deleted', 'ListingDeleted', ctx), validateOwner: async (listingId, ownerId) => (await getById(listingId))?.ownerId === ownerId, toPublic: publicView, states: STATES });
}
