import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSearch, SearchError } from '../../business/listings.js';
import { createGeolocation, GeolocationError } from '../../business/locations.js';
import { createMaps, MapsError } from '../../business/locations.js';
import { createFavorites, FavoritesError } from '../../business/listings.js';
import { createCompare, CompareError } from '../../business/listings.js';

const now = '2026-07-31T12:00:00.000Z'; const clock = () => new Date(now); const ids = () => { let value = 0; return () => String(++value).padStart(32, '0'); };
const eventBus = () => { const published = []; return { published, async publish(event) { published.push(event); } }; };
const loggerEntries = []; const logger = { info(message, context) { loggerEntries.push({ message, context }); } };
const listing = (overrides = {}) => ({ id: 'lst_1', ownerId: 'usr_private', categoryId: 'cat_house', slug: 'casa-sol', title: 'Casa com sol', description: 'Casa ampla perto do centro', listingType: 'sale', status: 'published', priceMinor: 30000000, currency: 'BRL',
  location: { countryCode: 'BR', region: 'SP', city: 'Santos', district: 'Centro', addressLine: 'Private', postalCode: '00000', latitude: -23.9608, longitude: -46.3336 }, attributes: { bedrooms: 3, furnished: false }, publishedAt: now, media: [], ...overrides });
function database(rows = []) { const calls = []; return { calls, async first(sql, parameters) { calls.push({ sql, parameters }); return rows.shift() ?? null; }, async write(sql, parameters) { calls.push({ sql, parameters }); return rows.shift() ?? { meta: { changes: 1 } }; }, async all(sql, parameters) { calls.push({ sql, parameters }); return { results: rows.shift() ?? [] }; } }; }

test('Search applies official text, category, type, location, money and structured-attribute filters', async () => {
  const items = [listing(), listing({ id: 'lst_2', title: 'Apartamento', categoryId: 'cat_flat', priceMinor: 20000000 }), listing({ id: 'lst_3', status: 'draft', publishedAt: null })];
  const service = createSearch({ listPublished: async () => items }); const result = await service.search({ text: ' CASA ', categoryId: 'cat_house', listingType: 'sale', countryCode: 'br', region: 'SP', city: 'Santos', currency: 'brl', minPriceMinor: 100, maxPriceMinor: 40000000, attributes: { bedrooms: 3 } });
  assert.deepEqual(result.items.map((item) => item.id), ['lst_1']); assert.equal(result.items[0].ownerId, undefined); assert.equal(result.criteria.countryCode, 'BR');
});

test('Search paginates and sorts deterministically while rejecting nonexistent filters and invalid input', async () => {
  const items = [listing({ id: 'lst_b', priceMinor: 2 }), listing({ id: 'lst_a', priceMinor: 2 }), listing({ id: 'lst_c', priceMinor: 1 })]; const bus = eventBus();
  const service = createSearch({ listPublished: async () => items, events: bus, id: ids(), clock }); const result = await service.search({ sort: 'price-asc', page: 1, pageSize: 2 }, { correlationId: 'corr' });
  assert.deepEqual(result.items.map((item) => item.id), ['lst_c', 'lst_a']); assert.equal(result.total, 3); assert.equal(bus.published[0].name, 'SearchPerformed'); assert.deepEqual(bus.published[0].payload, { resultCount: 2 });
  await assert.rejects(service.search({ bedrooms: 3 }), (error) => error.code === 'UNSUPPORTED_FILTER'); await assert.rejects(service.search({ minPriceMinor: 2, maxPriceMinor: 1 }), SearchError);
});

test('Geolocation normalizes official fields, validates coordinates and calculates distance and radius', () => {
  const geo = createGeolocation(); const location = geo.normalize({ countryCode: ' br ', region: ' São Paulo ', city: ' Santos ', latitude: -23.96, longitude: -46.33 });
  assert.equal(location.countryCode, 'BR'); assert.equal(location.city, 'Santos'); assert.equal(geo.distanceKilometers(location, { latitude: -23.95, longitude: -46.32 }), geo.distanceKilometers(location, { latitude: -23.95, longitude: -46.32 })); assert.equal(geo.isWithinRadius(location, { latitude: -23.95, longitude: -46.32 }, 5), true);
  assert.throws(() => geo.normalize({ countryCode: 'BR', region: 'SP', city: 'Santos', latitude: 91, longitude: 0 }), GeolocationError); assert.throws(() => geo.normalize({ countryCode: 'BR', region: 'SP', city: 'Santos', latitude: 0 }), (error) => error.code === 'INCOMPLETE_COORDINATES');
});

test('Geolocation public and injected Cloudflare views omit address, postal code and IP', () => {
  const geo = createGeolocation(); const publicValue = geo.toPublic(listing().location, { includeCoordinates: true, precision: 2 }); const context = geo.normalizeCloudflareContext({ country: 'BR', region: 'SP', city: 'Santos', latitude: '-23.96', longitude: '-46.33', ip: '192.0.2.1' });
  assert.deepEqual(publicValue, { countryCode: 'BR', region: 'SP', city: 'Santos', district: 'Centro', latitude: -23.96, longitude: -46.33 }); assert.equal(context.ip, undefined); assert.equal(publicValue.addressLine, undefined); assert.equal(publicValue.postalCode, undefined);
});

test('Maps prepares serializable markers, viewport, collections and provider-neutral safe links', () => {
  const geo = createGeolocation(); const maps = createMaps({ normalizeLocation: geo.normalize, publicLocation: geo.toPublic }); const item = listing(); const marker = maps.marker(item, { includeCoordinates: true, precision: 1 });
  assert.equal(marker.location.latitude, -24); assert.equal(marker.location.addressLine, undefined); assert.deepEqual(maps.viewport([item]), { south: -23.96, west: -46.33, north: -23.96, east: -46.33 }); assert.equal(maps.collection([item]).markers.length, 1); assert.match(maps.externalLink(item.location), /^geo:0,0\?q=/); assert.doesNotThrow(() => JSON.stringify(marker));
  assert.throws(() => maps.marker({}), MapsError); assert.throws(() => maps.viewport([]), MapsError);
});

test('Favorites adds idempotently, checks, removes and emits private domain events', async () => {
  const bus = eventBus(); const db = database([null, { listing_id: 'lst_1' }, { meta: { changes: 1 } }]); const service = createFavorites({ db, events: bus, logger, id: ids(), clock, validateListing: async () => true });
  assert.equal((await service.add('lst_1', { userId: 'usr_1' })).added, true); assert.equal(await service.has('lst_1', { userId: 'usr_1' }), true); assert.equal(await service.remove('lst_1', { userId: 'usr_1' }), true); assert.deepEqual(bus.published.map((event) => event.name), ['FavoriteAdded', 'FavoriteRemoved']); assert.equal(db.calls.every((call) => call.parameters?.[0] === 'usr_1'), true);
  const repeated = createFavorites({ db: database([{ listing_id: 'lst_1' }]), events: eventBus(), logger, id: ids(), clock, validateListing: async () => true }); assert.equal((await repeated.add('lst_1', { userId: 'usr_1' })).added, false);
});

test('Favorites validates user/listing and provides deterministic private pagination without duplicates', async () => {
  const db = database([[{ listing_id: 'lst_2', created_at: now }, { listing_id: 'lst_1', created_at: now }]]); const service = createFavorites({ db, events: eventBus(), logger, id: ids(), clock, validateListing: async (value) => value !== 'missing' });
  const result = await service.list({ page: 2, pageSize: 2 }, { userId: 'usr_1' }); assert.deepEqual(result.items.map((item) => item.listingId), ['lst_2', 'lst_1']); assert.deepEqual(db.calls[0].parameters, ['usr_1', 2, 2]); assert.match(db.calls[0].sql, /ORDER BY created_at DESC, listing_id/);
  await assert.rejects(service.add('lst_1'), (error) => error.code === 'USER_REQUIRED'); await assert.rejects(service.add('', { userId: 'usr_1' }), (error) => error.code === 'INVALID_LISTING'); await assert.rejects(service.add('missing', { userId: 'usr_1' }), (error) => error.code === 'LISTING_NOT_ELIGIBLE');
});

test('Compare removes duplicate IDs, preserves order and reports official similarities and differences', async () => {
  const items = { a: listing({ id: 'a' }), b: listing({ id: 'b', priceMinor: 40000000, attributes: { bedrooms: 4 } }) }; const bus = eventBus(); const service = createCompare({ getPublicListing: async (id) => items[id], events: bus, id: ids(), clock });
  const result = await service.compare(['b', 'a', 'b']); assert.deepEqual(result.ids, ['b', 'a']); assert.equal(result.fields.currency.same, true); assert.equal(result.fields.priceMinor.same, false); assert.ok(result.similarities.includes('listingType')); assert.ok(result.differences.includes('attributes')); assert.equal(result.items[0].ownerId, undefined); assert.equal(bus.published[0].name, 'ComparisonCreated');
});

test('Compare enforces limits, existence and public eligibility without persistence', async () => {
  const service = createCompare({ getPublicListing: async (id) => id === 'missing' ? null : listing({ id, status: id === 'draft' ? 'draft' : 'published' }) });
  await assert.rejects(service.compare(['a']), (error) => error.code === 'INVALID_QUANTITY'); await assert.rejects(service.compare(['a', 'b', 'c', 'd', 'e']), CompareError); await assert.rejects(service.compare(['a', 'missing']), (error) => error.code === 'LISTING_NOT_FOUND'); await assert.rejects(service.compare(['a', 'draft']), (error) => error.code === 'LISTING_NOT_ELIGIBLE');
  assert.deepEqual(service.fields, ['categoryId', 'listingType', 'priceMinor', 'currency', 'location.countryCode', 'location.region', 'location.city', 'location.district', 'attributes']);
});

test('Lote 9 keeps injected boundaries, official fields and no direct or external integration', async () => {
  const joined = `${await readFile(new URL('../../business/listings.js', import.meta.url), 'utf8')}\n${await readFile(new URL('../../business/locations.js', import.meta.url), 'utf8')}`;
  assert.doesNotMatch(joined, /process\.env|env\.(?:DB|R2)|\.prepare\s*\(|api[_-]?key|google|mapbox|algolia|elastic|fetch\s*\(/i);
  assert.match(joined, /FROM favorites WHERE user_id = \?/);
  assert.equal(loggerEntries.some((entry) => JSON.stringify(entry).includes('usr_')), false);
});
