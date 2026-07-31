const TYPES = new Set(['image', 'video', 'document']);
const MIME = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;
const KEY = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[^\\\u0000-\u001f]{1,512}$/;
export class MediaError extends Error { constructor(code, message = 'Media operation failed') { super(message); this.name = 'MediaError'; this.code = code; } }
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
export function createMedia(options) {
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
