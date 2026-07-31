const safeText = (value) => typeof value === 'string' ? value.trim() : '';
export class MapsError extends Error { constructor(code, message = 'Map operation failed') { super(message); this.name = 'MapsError'; this.code = code; } }

export function createMaps({ normalizeLocation, publicLocation } = {}) {
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
