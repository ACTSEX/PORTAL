export class ImobiliaristasError extends Error { constructor(code, message = 'Professional profile operation failed') { super(message); this.name = 'ImobiliaristasError'; this.code = code; } }
const text = (value, min, max, required = false) => { const output = typeof value === 'string' ? value.trim() : ''; if ((required && output.length < min) || output.length > max) throw new ImobiliaristasError('INVALID_PROFILE'); return output || null; };
const slugFor = (row) => `${row.registration_region}-${row.registration_number}`.toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const social = (value) => { if (value === undefined) return {}; if (!value || Array.isArray(value) || typeof value !== 'object') throw new ImobiliaristasError('INVALID_PROFILE'); return value; };
function privateView(row) { if (!row) return null; return Object.freeze({ userId: row.user_id, displayName: row.display_name, bio: row.bio,
  phone: row.phone, avatarR2Key: row.avatar_r2_key, websiteUrl: row.website_url, socialLinks: Object.freeze(JSON.parse(row.social_links_json ?? '{}')),
  registrationNumber: row.registration_number, registrationRegion: row.registration_region, companyName: row.company_name,
  companyDocument: row.company_document, status: row.status, verifiedAt: row.verified_at, slug: slugFor(row), createdAt: row.created_at, updatedAt: row.updated_at }); }
function publicView(row) { const profile = privateView(row); if (!profile || profile.status !== 'verified') return null; return Object.freeze({
  userId: profile.userId, slug: profile.slug, displayName: profile.displayName, bio: profile.bio, avatarR2Key: profile.avatarR2Key,
  websiteUrl: profile.websiteUrl, socialLinks: profile.socialLinks, registrationNumber: profile.registrationNumber,
  registrationRegion: profile.registrationRegion, companyName: profile.companyName }); }
export function createImobiliaristas(options) {
  if (!options?.db?.first || !options.db.write || !options.db.batch || !options?.events?.publish || !options?.users?.getById) throw new TypeError('Invalid Imobiliaristas dependencies');
  const { db, events, users, logger, id, clock = () => new Date() } = options;
  const emit = (name, userId, correlationId, payload = {}) => events.publish({ name, version: '1.0', source: 'Imobiliaristas', id: `evt_${id()}`,
    occurredAt: clock().toISOString(), payload: { userId, ...payload }, metadata: correlationId ? { correlationId } : {} });
  const select = 'SELECT p.*, r.registration_number, r.registration_region, r.company_name, r.company_document, r.status, r.verified_at FROM profiles p JOIN real_estate_professionals r ON r.user_id = p.user_id';
  const getPrivate = async (userId) => privateView(await db.first(`${select} WHERE p.user_id = ?`, [userId]));
  async function getPublicBySlug(slug) { const rows = await db.all(`${select} WHERE r.status = ?`, ['verified']); return rows.results.map((row) => ({ row, slug: slugFor(row) })).find((item) => item.slug === slug)?.row ? publicView(rows.results.find((row) => slugFor(row) === slug)) : null; }
  async function create(input, context = {}) {
    const user = await users.getById(input?.userId); if (!user || user.status === 'deleted') throw new ImobiliaristasError('INVALID_USER');
    if (await getPrivate(input.userId)) throw new ImobiliaristasError('PROFILE_EXISTS');
    const registrationNumber = text(input.registrationNumber, 2, 40, true); const registrationRegion = text(input.registrationRegion, 2, 20, true).toUpperCase();
    if (await db.first('SELECT user_id FROM real_estate_professionals WHERE registration_region = ? AND registration_number = ?', [registrationRegion, registrationNumber])) throw new ImobiliaristasError('REGISTRATION_EXISTS');
    const now = clock().toISOString();
    await db.batch([{ sql: 'INSERT INTO profiles (user_id, display_name, bio, phone, avatar_r2_key, website_url, social_links_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', parameters: [input.userId, text(input.displayName, 2, 120, true), text(input.bio, 0, 2000), text(input.phone, 0, 32), text(input.avatarR2Key, 0, 512), text(input.websiteUrl, 0, 2048), JSON.stringify(social(input.socialLinks)), now, now] },
      { sql: 'INSERT INTO real_estate_professionals (user_id, registration_number, registration_region, company_name, company_document, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', parameters: [input.userId, registrationNumber, registrationRegion, text(input.companyName, 0, 160), text(input.companyDocument, 0, 32), 'pending', now, now] }]);
    logger.info('Professional profile created', { operation: 'imobiliaristas.create', status: 'completed', userId: input.userId }); await emit('ProfessionalProfileCreated', input.userId, context.correlationId); return getPrivate(input.userId);
  }
  async function update(userId, input, context = {}) {
    const allowed = ['displayName', 'bio', 'phone', 'avatarR2Key', 'websiteUrl', 'socialLinks', 'companyName'];
    if (!input || Object.keys(input).some((key) => !allowed.includes(key))) throw new ImobiliaristasError('PROTECTED_FIELD');
    const current = await getPrivate(userId); if (!current) throw new ImobiliaristasError('NOT_FOUND'); const merged = { ...current, ...input };
    await db.batch([{ sql: 'UPDATE profiles SET display_name = ?, bio = ?, phone = ?, avatar_r2_key = ?, website_url = ?, social_links_json = ?, updated_at = ? WHERE user_id = ?', parameters: [text(merged.displayName, 2, 120, true), text(merged.bio, 0, 2000), text(merged.phone, 0, 32), text(merged.avatarR2Key, 0, 512), text(merged.websiteUrl, 0, 2048), JSON.stringify(social(merged.socialLinks)), clock().toISOString(), userId] },
      { sql: 'UPDATE real_estate_professionals SET company_name = ?, updated_at = ? WHERE user_id = ?', parameters: [text(merged.companyName, 0, 160), clock().toISOString(), userId] }]);
    await emit('ProfessionalProfileUpdated', userId, context.correlationId, { fields: Object.keys(input) }); return getPrivate(userId);
  }
  async function state(userId, status, context = {}) { if (!['verified', 'suspended'].includes(status)) throw new ImobiliaristasError('INVALID_STATE'); const now = clock().toISOString(); await db.write('UPDATE real_estate_professionals SET status = ?, verified_at = CASE WHEN ? = ? THEN COALESCE(verified_at, ?) ELSE verified_at END, updated_at = ? WHERE user_id = ?', [status, status, 'verified', now, now, userId]); await emit('ProfessionalProfileStateChanged', userId, context.correlationId, { status }); return getPrivate(userId); }
  return Object.freeze({ create, getPrivate, getPublicBySlug, update, verify: (userId, ctx) => state(userId, 'verified', ctx), suspend: (userId, ctx) => state(userId, 'suspended', ctx), toPublic: publicView });
}
