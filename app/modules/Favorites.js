export class FavoritesError extends Error { constructor(code, message = 'Favorite operation failed') { super(message); this.name = 'FavoritesError'; this.code = code; } }
const identifier = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;

export function createFavorites({ db, events, logger, id, clock = () => new Date(), validateListing } = {}) {
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
