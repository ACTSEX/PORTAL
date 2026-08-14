import { canonicalizeCityLocation, createCitySlug } from './locations.js';

const CategoriesScope = (() => {
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

class CategoriesError extends Error {
  constructor(code, message = 'Category operation failed') { super(message); this.name = 'CategoriesError'; this.code = code; }
}

const clean = (value) => typeof value === 'string' ? value.trim() : '';
function categoryView(row) {
  return row && Object.freeze({ id: row.id, parentId: row.parent_id, slug: row.slug, name: row.name,
    description: row.description, active: Boolean(row.active), createdAt: row.created_at, updatedAt: row.updated_at });
}
function validate(input, partial = false) {
  const output = {};
  if (!partial || input.name !== undefined) { output.name = clean(input.name); if (output.name.length < 2 || output.name.length > 120) throw new CategoriesError('INVALID_CATEGORY'); }
  if (!partial || input.slug !== undefined) { output.slug = clean(input.slug).toLowerCase(); if (output.slug.length > 120 || !SLUG.test(output.slug)) throw new CategoriesError('INVALID_CATEGORY'); }
  if (!partial || input.description !== undefined) { output.description = input.description == null ? null : clean(input.description); if (output.description?.length > 2000) throw new CategoriesError('INVALID_CATEGORY'); }
  if (!partial || input.parentId !== undefined) { output.parentId = input.parentId == null ? null : clean(input.parentId); if (output.parentId !== null && !output.parentId) throw new CategoriesError('INVALID_CATEGORY'); }
  if (!Object.keys(output).length) throw new CategoriesError('NO_CHANGES');
  return output;
}

function createCategories(options) {
  if (!options?.db?.first || !options.db.write || !options.db.all || !options?.events?.publish || typeof options.id !== 'function') throw new TypeError('Invalid Categories dependencies');
  const { db, events, logger, id, clock = () => new Date() } = options;
  const emit = (name, categoryId, context = {}, payload = {}) => events.publish({ name, version: '1.0', source: 'Categories', id: `evt_${id()}`,
    occurredAt: clock().toISOString(), payload: { categoryId, ...payload }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
  const getById = async (categoryId) => categoryView(await db.first('SELECT * FROM categories WHERE id = ?', [categoryId]));
  const getBySlug = async (slug) => categoryView(await db.first('SELECT * FROM categories WHERE slug = ?', [clean(slug).toLowerCase()]));
  async function ensureSlug(slug, exceptId = '') { const found = await db.first('SELECT id FROM categories WHERE slug = ? AND id <> ?', [slug, exceptId]); if (found) throw new CategoriesError('SLUG_EXISTS'); }
  async function ensureParent(categoryId, parentId) {
    if (parentId === null) return;
    if (parentId === categoryId) throw new CategoriesError('HIERARCHY_CYCLE');
    if (!await getById(parentId)) throw new CategoriesError('PARENT_NOT_FOUND');
    let cursor = parentId; const visited = new Set();
    while (cursor) { if (cursor === categoryId || visited.has(cursor)) throw new CategoriesError('HIERARCHY_CYCLE'); visited.add(cursor); const row = await db.first('SELECT parent_id FROM categories WHERE id = ?', [cursor]); cursor = row?.parent_id ?? null; }
  }
  async function create(input, context = {}) {
    const data = validate(input); await ensureSlug(data.slug); await ensureParent('', data.parentId);
    const categoryId = `cat_${id()}`; const now = clock().toISOString();
    await db.write('INSERT INTO categories (id, parent_id, slug, name, description, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [categoryId, data.parentId, data.slug, data.name, data.description, 1, now, now]);
    logger.info('Category created', { operation: 'categories.create', status: 'completed', categoryId }); await emit('CategoryCreated', categoryId, context); return getById(categoryId);
  }
  async function update(categoryId, input, context = {}) {
    const current = await getById(categoryId); if (!current) throw new CategoriesError('NOT_FOUND'); const changes = validate(input, true);
    const data = { name: changes.name ?? current.name, slug: changes.slug ?? current.slug, description: changes.description !== undefined ? changes.description : current.description, parentId: changes.parentId !== undefined ? changes.parentId : current.parentId };
    await ensureSlug(data.slug, categoryId); await ensureParent(categoryId, data.parentId); const now = clock().toISOString();
    await db.write('UPDATE categories SET parent_id = ?, slug = ?, name = ?, description = ?, updated_at = ? WHERE id = ?', [data.parentId, data.slug, data.name, data.description, now, categoryId]);
    await emit('CategoryUpdated', categoryId, context); return getById(categoryId);
  }
  async function setActive(categoryId, active, context = {}) { if (!await getById(categoryId)) throw new CategoriesError('NOT_FOUND'); await db.write('UPDATE categories SET active = ?, updated_at = ? WHERE id = ?', [active ? 1 : 0, clock().toISOString(), categoryId]); await emit(active ? 'CategoryActivated' : 'CategoryDeactivated', categoryId, context); return getById(categoryId); }
  async function remove(categoryId, context = {}) { if (await db.first('SELECT id FROM listings WHERE category_id = ? LIMIT 1', [categoryId])) throw new CategoriesError('CATEGORY_IN_USE'); if (await db.first('SELECT id FROM categories WHERE parent_id = ? LIMIT 1', [categoryId])) throw new CategoriesError('CATEGORY_HAS_CHILDREN'); const result = await db.write('DELETE FROM categories WHERE id = ?', [categoryId]); if (!result.meta?.changes) throw new CategoriesError('NOT_FOUND'); await emit('CategoryDeleted', categoryId, context); return true; }
  async function list({ active } = {}) { const filtered = typeof active === 'boolean'; const result = await db.all(`SELECT * FROM categories${filtered ? ' WHERE active = ?' : ''} ORDER BY name, slug, id`, filtered ? [active ? 1 : 0] : []); return Object.freeze(result.results.map(categoryView)); }
  const listPublic = () => list({ active: true });
  const validatePublic = async (categoryId) => Boolean((await getById(categoryId))?.active);
  return Object.freeze({ create, getById, getBySlug, list, listPublic, update, activate: (value, ctx) => setActive(value, true, ctx), deactivate: (value, ctx) => setActive(value, false, ctx), remove, validatePublic, toPublic: (row) => { const value = categoryView(row); return value?.active ? value : null; } });
}

return { CategoriesError, createCategories };
})();
export const { CategoriesError, createCategories } = CategoriesScope;

const CompareScope = (() => {
const FIELDS = Object.freeze(['categoryId', 'listingType', 'priceMinor', 'currency', 'location.countryCode', 'location.region', 'location.city', 'location.district', 'attributes']);
class CompareError extends Error { constructor(code, message = 'Comparison operation failed') { super(message); this.name = 'CompareError'; this.code = code; } }
const valueAt = (item, field) => field.split('.').reduce((value, key) => value?.[key], item);
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
function safe(item) { const output = { id: item.id, categoryId: item.categoryId, slug: item.slug, title: item.title, listingType: item.listingType, priceMinor: item.priceMinor, currency: item.currency,
  location: item.location && { countryCode: item.location.countryCode, region: item.location.region, city: item.location.city, district: item.location.district }, attributes: item.attributes, publishedAt: item.publishedAt }; return Object.freeze(output); }

function createCompare({ getPublicListing, minItems = 2, maxItems = 4, events = null, id = null, clock = () => new Date() } = {}) {
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

return { CompareError, createCompare };
})();
export const { CompareError, createCompare } = CompareScope;

const FavoritesScope = (() => {
class FavoritesError extends Error { constructor(code, message = 'Favorite operation failed') { super(message); this.name = 'FavoritesError'; this.code = code; } }
const identifier = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;

function createFavorites({ db, events, logger, id, clock = () => new Date(), validateListing } = {}) {
  if (!db?.first || !db?.write || !db?.all || !events?.publish || typeof logger?.info !== 'function' || typeof id !== 'function' || typeof validateListing !== 'function') throw new TypeError('Invalid Favorites dependencies');
  const user = (context) => { const userId = identifier(context?.userId); if (!userId) throw new FavoritesError('USER_REQUIRED'); return userId; };
  const listing = (value) => { const listingId = identifier(value); if (!listingId) throw new FavoritesError('INVALID_LISTING'); return listingId; };
  const emit = (name, listingId, context) => events.publish({ name, version: '1.0', source: 'Favorites', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { listingId }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
  async function has(listingId, context = {}) { const userId = user(context); listingId = listing(listingId); return Boolean(await db.first('SELECT listing_id FROM favorites WHERE user_id = ? AND listing_id = ?', [userId, listingId])); }
  async function add(listingId, context = {}) {
    const userId = user(context); listingId = listing(listingId); if (!await validateListing(listingId)) throw new FavoritesError('LISTING_NOT_ELIGIBLE');
    if (await db.first('SELECT listing_id FROM favorites WHERE user_id = ? AND listing_id = ?', [userId, listingId])) return Object.freeze({ userId, listingId, added: false });
    await db.write('INSERT INTO favorites (user_id, listing_id, created_at) VALUES (?, ?, ?)', [userId, listingId, clock().toISOString()]); logger.info('Favorite added', { operation: 'favorites.add', status: 'completed' }); await emit('FavoriteAdded', listingId, context); return Object.freeze({ userId, listingId, added: true });
  }
  async function remove(listingId, context = {}) {
    const userId = user(context); listingId = listing(listingId); const result = await db.write('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?', [userId, listingId]); const removed = Boolean(result.meta?.changes);
    if (removed) { logger.info('Favorite removed', { operation: 'favorites.remove', status: 'completed' }); await emit('FavoriteRemoved', listingId, context); } return removed;
  }
  async function list(options = {}, context = {}) {
    const userId = user(context); const page = options.page ?? 1; const pageSize = options.pageSize ?? 20;
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new FavoritesError('INVALID_PAGINATION');
    const result = await db.all('SELECT listing_id, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC, listing_id LIMIT ? OFFSET ?', [userId, pageSize, (page - 1) * pageSize]);
    return Object.freeze({ page, pageSize, items: Object.freeze(result.results.map((row) => Object.freeze({ listingId: row.listing_id, createdAt: row.created_at }))) });
  }
  return Object.freeze({ add, remove, has, list });
}

return { FavoritesError, createFavorites };
})();
export const { FavoritesError, createFavorites } = FavoritesScope;

const ListingsScope = (() => {

const STATES = Object.freeze(['draft', 'pending', 'published', 'archived', 'deleted']);
const TYPES = new Set(['sale', 'rent']); const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; const CURRENCY = /^[A-Z]{3}$/; const COUNTRY = /^[A-Z]{2}$/;
class ListingsError extends Error { constructor(code, message = 'Listing operation failed') { super(message); this.name = 'ListingsError'; this.code = code; } }
const text = (value) => typeof value === 'string' ? value.trim() : '';
const parse = (value) => { try { const result = JSON.parse(value ?? '{}'); return result && typeof result === 'object' && !Array.isArray(result) ? result : {}; } catch { return {}; } };
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
function createListings(options) {
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

return { ListingsError, createListings };
})();
export const { ListingsError, createListings } = ListingsScope;

const MediaScope = (() => {
const TYPES = new Set(['image', 'video', 'document']);
const MIME = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;
const KEY = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[^\\\u0000-\u001f]{1,512}$/;
class MediaError extends Error { constructor(code, message = 'Media operation failed') { super(message); this.name = 'MediaError'; this.code = code; } }
const view = (row) => row && Object.freeze({ id: row.id, ownerId: row.owner_id, listingId: row.listing_id, r2Key: row.r2_key,
  mediaType: row.media_type, mimeType: row.mime_type, byteSize: row.byte_size, checksumSha256: row.checksum_sha256,
  width: row.width, height: row.height, altText: row.alt_text, sortOrder: row.sort_order, createdAt: row.created_at });
function technical(input) {
  if (!input || !KEY.test(input.r2Key ?? '') || !TYPES.has(input.mediaType) || !MIME.test(input.mimeType ?? '')
    || !Number.isSafeInteger(input.byteSize) || input.byteSize <= 0 || !/^[a-f0-9]{64}$/i.test(input.checksumSha256 ?? '')
    || (input.width != null && (!Number.isSafeInteger(input.width) || input.width <= 0))
    || (input.height != null && (!Number.isSafeInteger(input.height) || input.height <= 0))) throw new MediaError('INVALID_MEDIA');
}
function mutable(input) {
  const data = {};
  if (input.listingId !== undefined) data.listingId = input.listingId === null ? null : String(input.listingId);
  if (input.altText !== undefined) { data.altText = input.altText === null ? null : String(input.altText).trim(); if (data.altText?.length > 300) throw new MediaError('INVALID_MEDIA'); }
  if (input.sortOrder !== undefined) { if (!Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0) throw new MediaError('INVALID_MEDIA'); data.sortOrder = input.sortOrder; }
  if (!Object.keys(data).length) throw new MediaError('NO_CHANGES'); return data;
}
function createMedia(options) {
  if (!options?.db?.first || !options.db.write || !options.db.all || !options?.events?.publish || typeof options.id !== 'function' || typeof options.validateListingOwner !== 'function') throw new TypeError('Invalid Media dependencies');
  const { db, events, logger, id, clock = () => new Date(), validateListingOwner } = options;
  const emit = (name, mediaId, context = {}, payload = {}) => events.publish({ name, version: '1.0', source: 'Media', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { mediaId, ...payload }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
  const lookup = async (mediaId) => view(await db.first('SELECT * FROM media WHERE id = ?', [mediaId]));
  const assertOwner = (item, ownerId) => { if (!item) throw new MediaError('NOT_FOUND'); if (item.ownerId !== ownerId) throw new MediaError('FORBIDDEN'); };
  async function ensureListing(listingId, ownerId) { if (listingId !== null && !await validateListingOwner(listingId, ownerId)) throw new MediaError('INVALID_LISTING_OWNER'); }
  async function register(input, context = {}) {
    technical(input); const ownerId = input.ownerId ?? context.userId; if (!ownerId) throw new MediaError('OWNER_REQUIRED'); await ensureListing(input.listingId ?? null, ownerId);
    if (await db.first('SELECT id FROM media WHERE r2_key = ?', [input.r2Key])) throw new MediaError('R2_KEY_EXISTS'); const mediaId = `med_${id()}`; const createdAt = clock().toISOString();
    await db.write('INSERT INTO media (id, owner_id, listing_id, r2_key, media_type, mime_type, byte_size, checksum_sha256, width, height, alt_text, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [mediaId, ownerId, input.listingId ?? null, input.r2Key, input.mediaType, input.mimeType.toLowerCase(), input.byteSize, input.checksumSha256.toLowerCase(), input.width ?? null, input.height ?? null, input.altText ?? null, input.sortOrder ?? 0, createdAt]);
    logger.info('Media registered', { operation: 'media.register', status: 'completed', mediaId }); await emit('MediaCreated', mediaId, context, { ownerId }); return lookup(mediaId);
  }
  async function update(mediaId, input, context = {}) {
    const current = await lookup(mediaId); assertOwner(current, context.userId); const changes = mutable(input); const listingId = changes.listingId !== undefined ? changes.listingId : current.listingId; await ensureListing(listingId, current.ownerId);
    await db.write('UPDATE media SET listing_id = ?, alt_text = ?, sort_order = ? WHERE id = ?', [listingId, changes.altText !== undefined ? changes.altText : current.altText, changes.sortOrder ?? current.sortOrder, mediaId]);
    const changedAssociation = listingId !== current.listingId; await emit(changedAssociation ? (listingId ? 'MediaAttached' : 'MediaDetached') : 'MediaUpdated', mediaId, context, { listingId }); return lookup(mediaId);
  }
  async function list(column, value) { const result = await db.all(`SELECT * FROM media WHERE ${column} = ? ORDER BY sort_order, created_at, id`, [value]); return Object.freeze(result.results.map(view)); }
  async function getById(mediaId, context = {}) { const item = await lookup(mediaId); assertOwner(item, context.userId); return item; }
  return Object.freeze({ register, getById, update, attach: (mediaId, listingId, context) => update(mediaId, { listingId }, context), detach: (mediaId, context) => update(mediaId, { listingId: null }, context), listByOwner: (ownerId) => list('owner_id', ownerId), listByListing: (listingId) => list('listing_id', listingId), toReference: (row) => { const item = view(row); return item && Object.freeze({ id: item.id, r2Key: item.r2Key, mediaType: item.mediaType, mimeType: item.mimeType, width: item.width, height: item.height, altText: item.altText, sortOrder: item.sortOrder }); } });
}

return { MediaError, createMedia };
})();
export const { MediaError, createMedia } = MediaScope;

const SearchScope = (() => {
const TYPES = new Set(['sale', 'rent']); const SORTS = new Set(['published-desc', 'price-asc', 'price-desc', 'title-asc']);
const clean = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
class SearchError extends Error { constructor(code, message = 'Search operation failed') { super(message); this.name = 'SearchError'; this.code = code; } }

function normalizeSearchCriteria(input = {}) {
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

function createSearch({ listPublished, events = null, id = null, clock = () => new Date() } = {}) {
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

return { SearchError, normalizeSearchCriteria, createSearch };
})();
export const { SearchError, normalizeSearchCriteria, createSearch } = SearchScope;

const UploadScope = (() => {
const FORMATS = Object.freeze({ 'image/jpeg': { extension: 'jpg', type: 'image', signatures: [[0xff, 0xd8, 0xff]] }, 'image/png': { extension: 'png', type: 'image', signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] }, 'image/webp': { extension: 'webp', type: 'image', signatures: [[0x52, 0x49, 0x46, 0x46]] } });
class UploadError extends Error { constructor(code, message = 'Upload failed') { super(message); this.name = 'UploadError'; this.code = code; } }
const bytesOf = async (file) => file instanceof Uint8Array ? file : file instanceof ArrayBuffer ? new Uint8Array(file) : file?.arrayBuffer ? new Uint8Array(await file.arrayBuffer()) : null;
const matches = (bytes, format, mime) => format.signatures.some((signature) => signature.every((value, index) => bytes[index] === value)) && (mime !== 'image/webp' || String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') && (mime !== 'video/mp4' || String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp');
async function digest(bytes, cryptoApi) { const value = await cryptoApi.subtle.digest('SHA-256', bytes); return [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
function createUpload(options) {
  if (!options?.storage?.put || !options.storage.delete || !options?.events?.publish || typeof options.registerMedia !== 'function' || !options.crypto?.subtle || typeof options.crypto.randomUUID !== 'function') throw new TypeError('Invalid Upload dependencies');
  const { storage, events, logger, registerMedia, crypto: cryptoApi, clock = () => new Date(), id = () => cryptoApi.randomUUID(), maxBytes = 10 * 1024 * 1024 } = options; const completed = new Map();
  const emit = (name, uploadId, context = {}, payload = {}) => events.publish({ name, version: '1.0', source: 'Upload', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { uploadId, ...payload }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
  async function upload(input, context = {}) {
    if (!context.userId) throw new UploadError('UNAUTHENTICATED'); const format = FORMATS[input?.mimeType]; if (!format) throw new UploadError('UNSUPPORTED_TYPE');
    const bytes = await bytesOf(input.file); if (!bytes || !bytes.length || bytes.length > maxBytes) throw new UploadError(bytes?.length ? 'FILE_TOO_LARGE' : 'INVALID_FILE'); if (!matches(bytes, format, input.mimeType)) throw new UploadError('CONTENT_MISMATCH');
    const checksumSha256 = await digest(bytes, cryptoApi); const requestKey = input.idempotencyKey ? `${context.userId}:${input.idempotencyKey}` : null; if (requestKey && completed.has(requestKey)) return completed.get(requestKey);
    const uploadId = `upl_${id()}`; const key = `profiles/${context.userId}/media/${cryptoApi.randomUUID()}.${format.extension}`; await emit('UploadStarted', uploadId, context, { mediaType: format.type });
    try {
      await storage.put(key, bytes, { contentType: input.mimeType, metadata: { ownerId: context.userId, checksumSha256 } });
      let media; try { media = await registerMedia({ ownerId: context.userId, listingId: input.listingId ?? null, r2Key: key, mediaType: format.type, mimeType: input.mimeType, byteSize: bytes.length, checksumSha256, width: input.width, height: input.height, altText: input.altText, sortOrder: input.sortOrder }, context); } catch (error) { await storage.delete(key); throw error; }
      const result = Object.freeze({ uploadId, media, checksumSha256, byteSize: bytes.length, mimeType: input.mimeType }); if (requestKey) completed.set(requestKey, result); logger.info('Upload completed', { operation: 'upload.store', status: 'completed', uploadId, byteSize: bytes.length, mimeType: input.mimeType }); await emit('UploadCompleted', uploadId, context, { mediaId: media.id, byteSize: bytes.length, mimeType: input.mimeType }); return result;
    } catch (error) { logger.error('Upload failed', { operation: 'upload.store', status: 'failed', uploadId }); await emit('UploadFailed', uploadId, context, { reason: 'technical_failure' }); if (error instanceof UploadError) throw error; throw new UploadError('TECHNICAL_FAILURE'); }
  }
  return Object.freeze({ upload, allowedTypes: Object.freeze(Object.keys(FORMATS)), maxBytes });
}

return { UploadError, createUpload };
})();
export const { UploadError, createUpload } = UploadScope;
