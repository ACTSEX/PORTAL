import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { createCategories, CategoriesError } from '../../app/modules/Categories.js';
import { createCitySlug, createListings, ListingsError } from '../../app/modules/Listings.js';
import { createMedia, MediaError } from '../../app/modules/Media.js';
import { createUpload, UploadError } from '../../app/modules/Upload.js';

const now = '2026-07-31T12:00:00.000Z'; const clock = () => new Date(now); const loggerEntries = [];
const logger = { info(message, context) { loggerEntries.push({ message, context }); }, error(message, context) { loggerEntries.push({ message, context }); }, warn() {}, debug() {} };
const ids = () => { let current = 0; return () => String(++current).padStart(32, '0'); };
const eventBus = () => { const published = []; return { published, async publish(event) { published.push(event); return { event }; } }; };
function database(rows = []) { const calls = []; return { calls, async first(sql, parameters) { calls.push({ sql, parameters }); return rows.shift() ?? null; }, async write(sql, parameters) { calls.push({ sql, parameters }); return { success: true, meta: { changes: 1 } }; }, async all(sql, parameters) { calls.push({ sql, parameters }); return { results: rows.shift() ?? [] }; } }; }
const cat = (overrides = {}) => ({ id: 'cat_1', parent_id: null, slug: 'casas', name: 'Casas', description: null, active: 1, created_at: now, updated_at: now, ...overrides });
const listing = (overrides = {}) => ({ id: 'lst_1', owner_id: 'usr_1', category_id: 'cat_1', city_id: 'city_00000000000000000000000000000000', slug: 'casa-central', title: 'Casa central', description: 'Descrição suficientemente longa.', listing_type: 'sale', status: 'draft', price_minor: 25000000, currency: 'BRL', country_code: 'BR', region: 'SP', city: 'Santos', district: null, address_line: null, postal_code: null, latitude: null, longitude: null, attributes_json: '{"bedrooms":3}', published_at: null, created_at: now, updated_at: now, ...overrides });
const city = (overrides = {}) => ({ id: 'city_00000000000000000000000000000000', country_code: 'BR', region_key: 'sp', city_key: 'santos', canonical_key: 'BR|sp|santos', public_name: 'Santos', slug: 'br-sp-santos-159c40e83898', canonicalization_version: 'unicode-17.0.0-v1', active: 1, ...overrides });
const mediaRow = (overrides = {}) => ({ id: 'med_1', owner_id: 'usr_1', listing_id: null, r2_key: 'uploads/image/a.jpg', media_type: 'image', mime_type: 'image/jpeg', byte_size: 3, checksum_sha256: 'a'.repeat(64), width: 800, height: 600, alt_text: 'Fachada', sort_order: 0, created_at: now, ...overrides });
const listingInput = { categoryId: 'cat_1', slug: 'casa-central', title: 'Casa central', description: 'Descrição suficientemente longa.', listingType: 'sale', priceMinor: 25000000, currency: 'BRL', location: { countryCode: 'BR', region: 'SP', city: 'Santos' }, attributes: { bedrooms: 3 } };

test('Categories creates with normalized unique slug, parent and complete event envelope', async () => {
  const db = database([null, cat({ id: 'parent' }), { parent_id: null }, cat()]); const bus = eventBus(); const service = createCategories({ db, events: bus, logger, id: ids(), clock });
  const result = await service.create({ name: 'Casas', slug: ' CASAS ', parentId: 'parent' }, { correlationId: 'corr-1' });
  assert.equal(result.slug, 'casas'); assert.match(db.calls.find((call) => call.sql.startsWith('INSERT')).sql, /VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)/); assert.deepEqual(bus.published[0].metadata, { correlationId: 'corr-1' });
  await assert.rejects(createCategories({ db: database([{ id: 'other' }]), events: eventBus(), logger, id: ids(), clock }).create({ name: 'Casas', slug: 'casas' }), (error) => error.code === 'SLUG_EXISTS');
});

test('Categories prevents hierarchy cycles and physical deletion when referenced', async () => {
  const cycle = createCategories({ db: database([cat(), null]), events: eventBus(), logger, id: ids(), clock });
  await assert.rejects(cycle.update('cat_1', { parentId: 'cat_1' }), (error) => error.code === 'HIERARCHY_CYCLE');
  const used = createCategories({ db: database([{ id: 'lst_1' }]), events: eventBus(), logger, id: ids(), clock }); await assert.rejects(used.remove('cat_1'), (error) => error.code === 'CATEGORY_IN_USE');
});

test('Categories updates, activates, deactivates and lists active values in deterministic technical order', async () => {
  const db = database([cat(), null, cat(), cat(), cat({ active: 0 }), cat({ active: 0 }), cat({ active: 1 }), [cat({ name: 'Apartamentos', slug: 'apartamentos' }), cat()]]); const bus = eventBus(); const service = createCategories({ db, events: bus, logger, id: ids(), clock });
  await service.update('cat_1', { description: 'Residencial' }); await service.deactivate('cat_1'); await service.activate('cat_1'); const publicItems = await service.listPublic();
  assert.equal(publicItems.length, 2); assert.match(db.calls.at(-1).sql, /WHERE active = \? ORDER BY name, slug, id/); assert.deepEqual(bus.published.map((event) => event.name), ['CategoryUpdated', 'CategoryDeactivated', 'CategoryActivated']);
});

test('Listings creates a schema-compatible draft with safe integer money and ownership', async () => {
  const db = database([null, null, city(), listing()]); const bus = eventBus(); const service = createListings({ db, events: bus, logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [] });
  const result = await service.create(listingInput, { userId: 'usr_1' }); assert.equal(result.status, 'draft'); assert.equal(result.priceMinor, 25000000); assert.equal(result.ownerId, 'usr_1'); assert.equal(bus.published[0].name, 'ListingCreated');
  await assert.rejects(service.create({ ...listingInput, priceMinor: 1.5 }, { userId: 'usr_1' }), ListingsError);
});

test('Listings validates category, protected fields, owner and parameterized updates', async () => {
  const invalidCategory = createListings({ db: database(), events: eventBus(), logger, id: ids(), clock, validateCategory: async () => false, listMedia: async () => [] }); await assert.rejects(invalidCategory.create(listingInput, { userId: 'usr_1' }), (error) => error.code === 'INVALID_CATEGORY');
  const forbidden = createListings({ db: database([listing()]), events: eventBus(), logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [] }); await assert.rejects(forbidden.update('lst_1', { title: 'Outra casa' }, { userId: 'usr_2' }), (error) => error.code === 'FORBIDDEN');
  const protectedService = createListings({ db: database([listing()]), events: eventBus(), logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [] }); await assert.rejects(protectedService.update('lst_1', { status: 'draft' }, { userId: 'usr_1' }), (error) => error.code === 'PROTECTED_FIELD');
});

test('Listings rejects client cityId and does not resolve a city for unrelated updates', async () => {
  const service = createListings({ db: database(), events: eventBus(), logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [] });
  await assert.rejects(service.create({ ...listingInput, cityId: 'city_client' }, { userId: 'usr_1' }), (error) => error.code === 'INVALID_LISTING');
  const db = database([listing(), null, listing({ title: 'Casa renovada' })]); const updateService = createListings({ db, events: eventBus(), logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [] });
  await updateService.update('lst_1', { title: 'Casa renovada' }, { userId: 'usr_1' }); assert.equal(db.calls.some((call) => /FROM cities/.test(call.sql)), false); assert.equal(db.calls.find((call) => call.sql.startsWith('UPDATE listings')).parameters[1], listing().city_id);
});

test('Listings resolves location changes atomically in the listing update and fails closed on city version', async () => {
  const canonical = city({ id: 'city_00000000000000000000000000000002', city_key: 'campinas', canonical_key: 'BR|sp|campinas', public_name: 'Campinas', slug: await createCitySlug('BR|sp|campinas') });
  const changed = listing({ city_id: canonical.id, city: 'Campinas' }); const db = database([listing(), null, null, canonical, changed]); const bus = eventBus(); const service = createListings({ db, events: bus, logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [] });
  const result = await service.update('lst_1', { location: { city: 'Campinas' } }, { userId: 'usr_1' }); const update = db.calls.find((call) => call.sql.startsWith('UPDATE listings')); assert.equal(result.cityId, canonical.id); assert.equal(result.location.city, 'Campinas'); assert.equal(update.parameters[1], canonical.id); assert.equal(update.parameters[10], 'Campinas'); assert.deepEqual(bus.published.map((event) => event.name), ['ListingUpdated']); assert.equal(db.calls.some((call) => /publish|artifact|manifest/i.test(call.sql)), false);
  const conflict = database([null, { ...canonical, canonical_key: 'BR|sp|santos', city_key: 'santos', canonicalization_version: 'unicode-16.0.0-v1' }]); const conflictingService = createListings({ db: conflict, events: eventBus(), logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [] }); await assert.rejects(conflictingService.create(listingInput, { userId: 'usr_1' }), (error) => error.code === 'CITY_CONFLICT');
});

test('Listings rejects inactive cities for creation and location updates', async () => {
  const createService = createListings({ db: database([null, city({ active: 0 })]), events: eventBus(), logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [] });
  await assert.rejects(createService.create(listingInput, { userId: 'usr_1' }), (error) => error.code === 'INACTIVE_CITY');

  const inactive = city({ active: 0, city_key: 'campinas', canonical_key: 'BR|sp|campinas', public_name: 'Campinas', slug: await createCitySlug('BR|sp|campinas') });
  const updateService = createListings({ db: database([listing(), null, inactive]), events: eventBus(), logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [] });
  await assert.rejects(updateService.update('lst_1', { location: { city: 'Campinas' } }, { userId: 'usr_1' }), (error) => error.code === 'INACTIVE_CITY');
});

test('Listings recovers idempotently when listing creation fails after city initialization', async () => {
  const cities = new Map(); const states = new Set(); let failListing = true; const calls = [];
  const db = { calls, async all() { return { results: [] }; }, async first(sql, parameters) { calls.push({ sql, parameters }); if (/FROM cities/.test(sql)) return cities.get(parameters[0]) ?? null; if (/FROM city_publication_state/.test(sql)) return states.has(parameters[0]) ? { city_id: parameters[0] } : null; if (/FROM listings WHERE slug/.test(sql)) return null; if (/FROM listings WHERE id/.test(sql)) return listing({ city_id: [...cities.values()][0]?.id }); return null; }, async write(sql, parameters) { calls.push({ sql, parameters }); if (sql.startsWith('INSERT INTO cities')) { const row = { id: parameters[0], country_code: parameters[1], region_key: parameters[2], city_key: parameters[3], canonical_key: parameters[4], public_name: parameters[5], slug: parameters[6], canonicalization_version: parameters[7], active: 1 }; if (cities.has(row.canonical_key)) throw new Error('unique'); cities.set(row.canonical_key, row); return { success: true }; } if (sql.startsWith('INSERT INTO city_publication_state')) { if (states.has(parameters[0])) throw new Error('unique'); states.add(parameters[0]); return { success: true }; } if (sql.startsWith('INSERT INTO listings') && failListing) { failListing = false; throw new Error('listing failed'); } return { success: true }; } };
  const service = createListings({ db, events: eventBus(), logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [] }); await assert.rejects(service.create(listingInput, { userId: 'usr_1' }), /listing failed/); assert.equal(cities.size, 1); assert.equal(states.size, 1); await service.create(listingInput, { userId: 'usr_1' }); assert.equal(cities.size, 1); assert.equal(states.size, 1); assert.equal(calls.filter((call) => call.sql.startsWith('INSERT INTO listings')).length, 2);
});

test('Listings enforces draft, pending, published, archived and deleted transitions only', async () => {
  const bus = eventBus(); const db = database([listing(), listing({ status: 'pending' }), listing({ status: 'pending' }), listing({ status: 'published', published_at: now }), listing({ status: 'published', published_at: now }), listing({ status: 'archived', published_at: now }), listing({ status: 'archived' }), listing({ status: 'deleted' })]);
  const service = createListings({ db, events: bus, logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [] });
  assert.equal((await service.submit('lst_1', { userId: 'usr_1' })).status, 'pending'); assert.equal((await service.publish('lst_1', { userId: 'usr_1', canPublish: true })).status, 'published'); assert.equal((await service.archive('lst_1', { userId: 'usr_1' })).status, 'archived'); assert.equal((await service.remove('lst_1', { userId: 'usr_1' })).status, 'deleted'); assert.deepEqual(service.states, ['draft', 'pending', 'published', 'archived', 'deleted']);
  const invalid = createListings({ db: database([listing({ status: 'archived' })]), events: eventBus(), logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [] }); await assert.rejects(invalid.publish('lst_1', { userId: 'usr_1', canPublish: true }), (error) => error.code === 'INVALID_TRANSITION');
});

test('Listings returns private media, public published data without owner and paginated filters', async () => {
  const reference = { id: 'med_1', r2Key: 'uploads/image/a.jpg' }; const db = database([listing(), listing({ status: 'published', published_at: now }), [listing({ status: 'published' })]]); const service = createListings({ db, events: eventBus(), logger, id: ids(), clock, validateCategory: async () => true, listMedia: async () => [reference] });
  assert.equal((await service.getPrivate('lst_1', { userId: 'usr_1' })).media.length, 1); const publicItem = await service.getPublicBySlug('casa-central'); assert.equal(publicItem.ownerId, undefined); assert.equal(publicItem.media.length, 1); const page = await service.list({ status: 'published', categoryId: 'cat_1', page: 1, pageSize: 10 }); assert.equal(page.items.length, 1); assert.deepEqual(db.calls.at(-1).parameters, ['cat_1', 'published', 10, 0]);
  assert.equal(service.toPublic({ ...publicItem, status: 'draft' }), null);
});

test('Media registers only D1 metadata and supports optional owned listing association', async () => {
  const db = database([null, mediaRow()]); const bus = eventBus(); const service = createMedia({ db, events: bus, logger, id: ids(), clock, validateListingOwner: async () => true });
  const result = await service.register({ ownerId: 'usr_1', r2Key: 'uploads/image/a.jpg', mediaType: 'image', mimeType: 'image/jpeg', byteSize: 3, checksumSha256: 'a'.repeat(64), width: 800, height: 600, altText: 'Fachada', sortOrder: 2 });
  assert.equal(result.r2Key, 'uploads/image/a.jpg'); assert.equal(result.body, undefined); assert.equal(db.calls.find((call) => call.sql.startsWith('INSERT')).parameters.includes(undefined), false); assert.equal(bus.published[0].name, 'MediaCreated');
});

test('Media validates ownership, technical metadata, ordering and listing ownership', async () => {
  const wrongOwner = createMedia({ db: database([mediaRow()]), events: eventBus(), logger, id: ids(), clock, validateListingOwner: async () => true }); await assert.rejects(wrongOwner.update('med_1', { sortOrder: 3 }, { userId: 'usr_2' }), (error) => error.code === 'FORBIDDEN');
  const wrongListing = createMedia({ db: database([mediaRow()]), events: eventBus(), logger, id: ids(), clock, validateListingOwner: async () => false }); await assert.rejects(wrongListing.attach('med_1', 'lst_2', { userId: 'usr_1' }), (error) => error.code === 'INVALID_LISTING_OWNER');
  await assert.rejects(createMedia({ db: database(), events: eventBus(), logger, id: ids(), clock, validateListingOwner: async () => true }).register({ ownerId: 'usr_1', r2Key: '../bad', mediaType: 'image', mimeType: 'text/plain', byteSize: 0, checksumSha256: 'bad' }), MediaError);
  const db = database([[mediaRow({ sort_order: 1 }), mediaRow({ id: 'med_2', sort_order: 2 })]]); const service = createMedia({ db, events: eventBus(), logger, id: ids(), clock, validateListingOwner: async () => true }); assert.equal((await service.listByListing('lst_1')).length, 2); assert.match(db.calls[0].sql, /ORDER BY sort_order, created_at, id/);
});

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x01, 0x02]);
function uploadFixture({ failPut = false, failRegister = false } = {}) { const calls = []; const bus = eventBus(); const storage = { async put(key, value, options) { calls.push({ operation: 'put', key, value, options }); if (failPut) throw new Error('storage secret'); return { key }; }, async delete(key) { calls.push({ operation: 'delete', key }); } }; const service = createUpload({ storage, events: bus, logger, registerMedia: async (input) => { calls.push({ operation: 'register', input }); if (failRegister) throw new Error('database secret'); return { id: 'med_1', ...input }; }, crypto: webcrypto, clock, id: ids(), maxBytes: 10 }); return { service, calls, bus }; }

test('Upload validates content, creates an unpredictable safe key, checksum and idempotent media registration', async () => {
  const { service, calls, bus } = uploadFixture(); const input = { name: 'house.jpg', mimeType: 'image/jpeg', file: jpeg, idempotencyKey: 'request-1' }; const first = await service.upload(input, { userId: 'usr_1' }); const second = await service.upload(input, { userId: 'usr_1' });
  assert.equal(first, second); assert.match(calls[0].key, /^uploads\/image\/[0-9a-f-]+\.jpg$/); assert.equal(first.checksumSha256.length, 64); assert.equal(calls.filter((call) => call.operation === 'put').length, 1); assert.deepEqual(bus.published.map((event) => event.name), ['UploadStarted', 'UploadCompleted']);
});

test('Upload rejects traversal, unsupported or mismatched files and excessive size', async () => {
  const { service } = uploadFixture(); await assert.rejects(service.upload({ name: '../x.jpg', mimeType: 'image/jpeg', file: jpeg }, { userId: 'usr_1' }), (error) => error.code === 'INVALID_NAME'); await assert.rejects(service.upload({ name: 'x.exe', mimeType: 'application/x-msdownload', file: jpeg }, { userId: 'usr_1' }), (error) => error.code === 'UNSUPPORTED_TYPE'); await assert.rejects(service.upload({ name: 'x.png', mimeType: 'image/png', file: jpeg }, { userId: 'usr_1' }), (error) => error.code === 'CONTENT_MISMATCH'); await assert.rejects(service.upload({ name: 'x.jpg', mimeType: 'image/jpeg', file: new Uint8Array(11) }, { userId: 'usr_1' }), (error) => error.code === 'FILE_TOO_LARGE');
});

test('Upload compensates registration failure, reports technical failure and logs no content or secrets', async () => {
  loggerEntries.length = 0; const { service, calls, bus } = uploadFixture({ failRegister: true }); await assert.rejects(service.upload({ name: 'x.jpg', mimeType: 'image/jpeg', file: jpeg }, { userId: 'usr_1' }), UploadError); assert.equal(calls.some((call) => call.operation === 'delete'), true); assert.equal(bus.published.at(-1).name, 'UploadFailed'); const logs = JSON.stringify(loggerEntries); assert.doesNotMatch(logs, /database secret|ffd8ff|house\.jpg/);
});

test('Lote 8 uses injected boundaries, parameterized SQL and exactly the official persistence contracts', async () => {
  const files = ['Categories.js', 'Listings.js', 'Media.js', 'Upload.js']; const sources = await Promise.all(files.map((file) => readFile(new URL(`../../app/modules/${file}`, import.meta.url), 'utf8'))); const joined = sources.join('\n');
  assert.doesNotMatch(joined, /process\.env|env\.(?:DB|KV|R2)|from ['"]\.\/|\.prepare\s*\(|\.binding\b/); assert.doesNotMatch(sources[2], /profile_id|is_cover|processing_status|updated_at/); assert.doesNotMatch(sources[0], /sort_order/); for (const source of sources.slice(0, 3)) assert.match(source, /\?[^'`]*['`], \[/);
  assert.deepEqual(Object.keys(mediaRow()).sort(), ['alt_text', 'byte_size', 'checksum_sha256', 'created_at', 'height', 'id', 'listing_id', 'media_type', 'mime_type', 'owner_id', 'r2_key', 'sort_order', 'width'].sort());
});
