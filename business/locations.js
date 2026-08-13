import { caseFold } from 'unicode-case-folding';

const COUNTRY = /^[A-Z]{2}$/;

export class LocationsError extends Error {
  constructor(code, message = 'Location operation failed') { super(message); this.name = 'LocationsError'; this.code = code; }
}

const CITY_CANONICALIZATION_VERSION = 'unicode-17.0.0-v1';
const CITY_COMPONENT = /^[a-z0-9]+(?: [a-z0-9]+)*$/;
function canonicalizeCityLocation(input, version = CITY_CANONICALIZATION_VERSION) {
  if (version !== CITY_CANONICALIZATION_VERSION) throw new LocationsError('UNKNOWN_CANONICALIZATION_VERSION');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new LocationsError('INVALID_CITY');
  const countryCode = input.countryCode;
  if (typeof countryCode !== 'string' || !COUNTRY.test(countryCode)) throw new LocationsError('INVALID_CITY');
  const canonicalize = (value, publicLimit) => {
    if (typeof value !== 'string' || [...value].length < 1 || [...value].length > publicLimit || /[\p{Cc}\p{Cs}\p{Cn}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(value)) throw new LocationsError('INVALID_CITY');
    const publicName = value.normalize('NFC').replace(/\s+/gu, ' ').trim();
    let key = caseFold(publicName.normalize('NFKD').replace(/\p{M}/gu, ''));
    key = key.replace(/[‐‑‒–—―−]/gu, '-').replace(/[’‘‛′`´]/gu, "'");
    key = key.replace(/[\p{P}\p{Z}\s]+/gu, ' ');
    if (/[^a-z0-9 ]/u.test(key)) throw new LocationsError('INVALID_CITY');
    key = key.replace(/ +/g, ' ').trim();
    if (!publicName || [...publicName].length > publicLimit || !key || key.length > 80 || !CITY_COMPONENT.test(key)) throw new LocationsError('INVALID_CITY');
    return { publicName, key };
  };
  const region = canonicalize(input.region, 120); const city = canonicalize(input.city, 120);
  return Object.freeze({ countryCode, regionKey: region.key, cityKey: city.key, publicName: city.publicName,
    canonicalKey: `${countryCode}|${region.key}|${city.key}`, canonicalizationVersion: version });
}
async function createCitySlug(canonicalKey) {
  if (typeof canonicalKey !== 'string' || canonicalKey.length < 5 || canonicalKey.length > 170) throw new LocationsError('INVALID_CITY');
  const parts = canonicalKey.split('|'); if (parts.length !== 3 || !COUNTRY.test(parts[0]) || !CITY_COMPONENT.test(parts[1]) || !CITY_COMPONENT.test(parts[2])) throw new LocationsError('INVALID_CITY');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalKey));
  const suffix = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 12);
  const stem = parts.join('-').toLowerCase().replace(/ +/g, '-'); return `${stem.slice(0, 87).replace(/-+$/g, '')}-${suffix}`;
}

const GeolocationScope = (() => {
const COUNTRY = /^[A-Z]{2}$/;
const clean = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

class GeolocationError extends Error {
  constructor(code, message = 'Geolocation operation failed') { super(message); this.name = 'GeolocationError'; this.code = code; }
}

function coordinate(value, minimum, maximum) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) throw new GeolocationError('INVALID_COORDINATES');
  return value;
}

function normalizeLocation(input, { requireBase = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new GeolocationError('INVALID_LOCATION');
  const countryCode = clean(input.countryCode).toUpperCase(); const region = clean(input.region); const city = clean(input.city);
  const optional = (value, maximum) => { if (value == null || value === '') return null; const result = clean(value); if (result.length > maximum) throw new GeolocationError('INVALID_LOCATION'); return result; };
  if ((requireBase && (!COUNTRY.test(countryCode) || region.length < 2 || city.length < 2)) || (countryCode && !COUNTRY.test(countryCode)) || region.length > 120 || city.length > 120) throw new GeolocationError('INVALID_LOCATION');
  const latitude = coordinate(input.latitude, -90, 90); const longitude = coordinate(input.longitude, -180, 180);
  if ((latitude === null) !== (longitude === null)) throw new GeolocationError('INCOMPLETE_COORDINATES');
  return Object.freeze({ countryCode: countryCode || null, region: region || null, city: city || null, district: optional(input.district, 120),
    addressLine: optional(input.addressLine, 240), postalCode: optional(input.postalCode, 20), latitude, longitude });
}

function distanceKilometers(origin, destination) {
  const a = normalizeLocation(origin, { requireBase: false }); const b = normalizeLocation(destination, { requireBase: false });
  if (a.latitude === null || b.latitude === null) throw new GeolocationError('COORDINATES_REQUIRED');
  const radians = (degrees) => degrees * Math.PI / 180; const deltaLat = radians(b.latitude - a.latitude); const deltaLon = radians(b.longitude - a.longitude);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function isWithinRadius(origin, destination, radiusKm) {
  if (typeof radiusKm !== 'number' || !Number.isFinite(radiusKm) || radiusKm <= 0) throw new GeolocationError('INVALID_RADIUS');
  return distanceKilometers(origin, destination) <= radiusKm;
}

function toPublicLocation(input, { includeCoordinates = false, precision = 2 } = {}) {
  const value = normalizeLocation(input); const output = { countryCode: value.countryCode, region: value.region, city: value.city, district: value.district };
  if (includeCoordinates && value.latitude !== null) { if (!Number.isInteger(precision) || precision < 0 || precision > 4) throw new GeolocationError('INVALID_PRECISION'); output.latitude = Number(value.latitude.toFixed(precision)); output.longitude = Number(value.longitude.toFixed(precision)); }
  return Object.freeze(output);
}

function normalizeCloudflareContext(context = {}) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) throw new GeolocationError('INVALID_CONTEXT');
  const result = { countryCode: clean(context.country).toUpperCase() || null, region: clean(context.region) || null, city: clean(context.city) || null,
    latitude: context.latitude == null ? null : coordinate(Number(context.latitude), -90, 90), longitude: context.longitude == null ? null : coordinate(Number(context.longitude), -180, 180) };
  if (result.countryCode && !COUNTRY.test(result.countryCode)) throw new GeolocationError('INVALID_CONTEXT');
  if ((result.latitude === null) !== (result.longitude === null)) { result.latitude = null; result.longitude = null; }
  return Object.freeze(result);
}

function createGeolocation() {
  return Object.freeze({ normalize: normalizeLocation, validate: (value) => { normalizeLocation(value); return true; }, distanceKilometers, isWithinRadius, toPublic: toPublicLocation, normalizeCloudflareContext });
}

return { GeolocationError, normalizeLocation, distanceKilometers, isWithinRadius, toPublicLocation, normalizeCloudflareContext, createGeolocation };
})();
export const { GeolocationError, normalizeLocation, distanceKilometers, isWithinRadius, toPublicLocation, normalizeCloudflareContext, createGeolocation } = GeolocationScope;

const MapsScope = (() => {
const safeText = (value) => typeof value === 'string' ? value.trim() : '';
class MapsError extends Error { constructor(code, message = 'Map operation failed') { super(message); this.name = 'MapsError'; this.code = code; } }

function createMaps({ normalizeLocation, publicLocation } = {}) {
  if (typeof normalizeLocation !== 'function' || typeof publicLocation !== 'function') throw new TypeError('Invalid Maps dependencies');
  function marker(item, options = {}) {
    if (!item || typeof item !== 'object' || !safeText(item.id) || !item.location) throw new MapsError('INVALID_MARKER');
    const normalized = normalizeLocation(item.location); const location = publicLocation(normalized, { includeCoordinates: options.includeCoordinates === true, precision: options.precision ?? 2 });
    return Object.freeze({ id: item.id, title: safeText(item.title) || null, slug: safeText(item.slug) || null, location });
  }
  function viewport(items, options = {}) {
    if (!Array.isArray(items) || items.length === 0) throw new MapsError('INVALID_LOCATIONS');
    const markers = items.map((item) => marker(item, { ...options, includeCoordinates: true })).filter((item) => item.location.latitude !== undefined);
    if (!markers.length) return null; const latitudes = markers.map((item) => item.location.latitude); const longitudes = markers.map((item) => item.location.longitude);
    return Object.freeze({ south: Math.min(...latitudes), west: Math.min(...longitudes), north: Math.max(...latitudes), east: Math.max(...longitudes) });
  }
  function collection(items, options = {}) {
    if (!Array.isArray(items)) throw new MapsError('INVALID_LOCATIONS');
    const markers = items.map((item) => marker(item, options)); return Object.freeze({ markers: Object.freeze(markers), viewport: viewport(items, options) });
  }
  function externalLink(location) {
    const value = publicLocation(normalizeLocation(location)); const query = [value.district, value.city, value.region, value.countryCode].filter(Boolean).join(', ');
    if (!query) throw new MapsError('INVALID_LOCATION'); return `geo:0,0?q=${encodeURIComponent(query)}`;
  }
  return Object.freeze({ marker, viewport, collection, externalLink });
}

return { MapsError, createMaps };
})();
export const { MapsError, createMaps } = MapsScope;

export { CITY_CANONICALIZATION_VERSION, canonicalizeCityLocation, createCitySlug };
