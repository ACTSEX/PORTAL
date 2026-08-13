const AuthScope = (() => {
class IdentityError extends Error { constructor(code, message = 'Identity operation failed') { super(message); this.name = 'IdentityError'; this.code = code; } }
const PURPOSES = new Set(['session', 'verify', 'recovery']);
function validate(options) {
  if (!options?.db?.first || !options.db.write || !options?.events?.publish || !options?.users?.create
    || !options?.technicalAuth?.issue || !options.technicalAuth.validate || !options?.passwords?.hash
    || !options.passwords.verify || !options?.logger?.info || typeof options.id !== 'function') throw new TypeError('Invalid Auth domain dependencies');
}
const permissions = (role) => role === 'admin' ? ['admin'] : role === 'professional' ? ['professional'] : ['user'];
const parseSubject = (subject) => { const [purpose, recordId, userId, ...extra] = String(subject).split(':'); if (extra.length || !PURPOSES.has(purpose) || !recordId || !userId) throw new IdentityError('INVALID_TOKEN', 'Invalid or expired token'); return { purpose, recordId, userId }; };
function createIdentityAuth(options) {
  validate(options);
  const { db, events, users, technicalAuth, passwords, logger, id, delivery,
    clock = () => new Date(), sessionLifetime = 3600, actionLifetime = 900 } = options;
  const now = () => clock().toISOString();
  const emit = (name, userId, correlationId, payload = {}) => events.publish({ name, version: '1.0', source: 'Auth', id: `evt_${id()}`,
    occurredAt: now(), payload: { userId, ...payload }, metadata: correlationId ? { correlationId } : {} });
  async function issueRecord(userId, purpose, lifetime, metadata = {}) {
    const recordId = `ses_${id()}`; const expiresAt = new Date(clock().getTime() + lifetime * 1000).toISOString();
    await db.write('INSERT INTO sessions (id, user_id, expires_at, last_seen_at, ip_hash, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [recordId, userId, expiresAt, now(), metadata.ipHash ?? null, metadata.userAgent ?? null, now()]);
    const token = await technicalAuth.issue({ id: `${purpose}:${recordId}:${userId}`, permissions: purpose === 'session' ? metadata.permissions : [] }, lifetime);
    return Object.freeze({ token, expiresAt });
  }
  async function consume(token, expectedPurpose, revoke = true) {
    let identity; try { identity = await technicalAuth.validate({ scheme: 'bearer', value: token }); } catch { throw new IdentityError('INVALID_TOKEN', 'Invalid or expired token'); }
    const subject = parseSubject(identity.id); if (subject.purpose !== expectedPurpose) throw new IdentityError('INVALID_TOKEN', 'Invalid or expired token');
    const record = await db.first('SELECT id, user_id, expires_at, revoked_at FROM sessions WHERE id = ? AND user_id = ?', [subject.recordId, subject.userId]);
    if (!record || record.revoked_at || Date.parse(record.expires_at) <= clock().getTime()) throw new IdentityError('INVALID_TOKEN', 'Invalid or expired token');
    if (revoke) await db.write('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL', [now(), record.id]);
    return Object.freeze({ ...subject, identity });
  }
  async function register(input, context = {}) {
    if (typeof input?.password !== 'string' || input.password.length < 10 || input.password.length > 256) throw new IdentityError('INVALID_REGISTRATION');
    const passwordHash = await passwords.hash(input.password); let user;
    try { user = await users.create({ email: input.email, passwordHash, role: input.role ?? 'user' }, context); }
    catch (error) { if (error.code === 'EMAIL_EXISTS') throw new IdentityError('REGISTRATION_REJECTED', 'Registration rejected'); throw error; }
    const verification = await issueRecord(user.id, 'verify', actionLifetime); await emit('IdentityRegistered', user.id, context.correlationId);
    if (delivery?.deliverVerification) await delivery.deliverVerification({ userId: user.id, token: verification.token, expiresAt: verification.expiresAt });
    return Object.freeze({ user, verificationRequired: true });
  }
  async function login(input, context = {}) {
    let user = null; try { user = await users.findForAuthentication(input?.email); } catch { /* normalized denial */ }
    const validPassword = user ? await passwords.verify(input?.password ?? '', user.password_hash) : false;
    if (!user || !validPassword) { logger.info('Domain login denied', { operation: 'identity.login', status: 'denied' }); throw new IdentityError('INVALID_CREDENTIALS', 'Invalid credentials'); }
    if (user.status !== 'active') throw new IdentityError('ACCOUNT_UNAVAILABLE', 'Account unavailable');
    const session = await issueRecord(user.id, 'session', sessionLifetime, { permissions: permissions(user.role), ipHash: context.ipHash, userAgent: context.userAgent });
    logger.info('Domain login succeeded', { operation: 'identity.login', status: 'completed', userId: user.id }); await emit('IdentityLoggedIn', user.id, context.correlationId);
    return Object.freeze({ user: users.toPrivate(user), credential: session.token, expiresAt: session.expiresAt });
  }
  async function validateSession(token) {
    const subject = await consume(token, 'session', false); const user = await users.getById(subject.userId);
    if (!user || user.status !== 'active') throw new IdentityError('ACCOUNT_UNAVAILABLE', 'Account unavailable');
    await db.write('UPDATE sessions SET last_seen_at = ? WHERE id = ?', [now(), subject.recordId]);
    return Object.freeze({ authenticated: true, user, permissions: subject.identity.permissions, sessionId: subject.recordId });
  }
  async function logout(token, context = {}) { const subject = await consume(token, 'session'); await emit('IdentityLoggedOut', subject.userId, context.correlationId); return true; }
  async function verifyAccount(token, context = {}) { const subject = await consume(token, 'verify'); const user = await users.markEmailVerified(subject.userId, context); await emit('IdentityVerified', subject.userId, context.correlationId); return user; }
  async function requestRecovery(email, context = {}) {
    let user = null; try { user = await users.findForAuthentication(email); } catch { /* prevent enumeration */ }
    if (user && user.status !== 'deleted') { const recovery = await issueRecord(user.id, 'recovery', actionLifetime); await emit('IdentityRecoveryRequested', user.id, context.correlationId); if (delivery?.deliverRecovery) await delivery.deliverRecovery({ userId: user.id, token: recovery.token, expiresAt: recovery.expiresAt }); }
    return Object.freeze({ accepted: true });
  }
  async function resetPassword(token, password, context = {}) { if (typeof password !== 'string' || password.length < 10 || password.length > 256) throw new IdentityError('INVALID_PASSWORD'); const subject = await consume(token, 'recovery'); await users.replacePasswordHash(subject.userId, await passwords.hash(password)); await revokeAll(subject.userId); await emit('IdentityPasswordReset', subject.userId, context.correlationId); return true; }
  async function changePassword(userId, currentPassword, password, context = {}) { const user = await users.findForAuthentication((await users.getById(userId))?.email); if (!user || !await passwords.verify(currentPassword, user.password_hash) || typeof password !== 'string' || password.length < 10) throw new IdentityError('INVALID_PASSWORD'); await users.replacePasswordHash(userId, await passwords.hash(password)); await revokeAll(userId); await emit('IdentityPasswordChanged', userId, context.correlationId); return true; }
  async function revokeAll(userId, context = {}) { await db.write('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', [now(), userId]); await emit('IdentitySessionsRevoked', userId, context.correlationId); return true; }
  return Object.freeze({ register, login, logout, validateSession, verifyAccount, requestRecovery, resetPassword, changePassword, revokeAll });
}

return { IdentityError, createIdentityAuth };
})();
export const { IdentityError, createIdentityAuth } = AuthScope;

const UsersScope = (() => {
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATES = new Set(['pending', 'active', 'suspended', 'deleted']);
const ROLES = new Set(['user', 'professional', 'admin']);

class UsersError extends Error {
  constructor(code, message = 'User operation failed') {
    super(message); this.name = 'UsersError'; this.code = code;
  }
}

function dependencies(options) {
  if (!options?.db?.first || !options.db.write || !options?.events?.publish
    || !options?.logger?.info || typeof options.id !== 'function') throw new TypeError('Invalid Users dependencies');
}
function email(value) {
  const result = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (result.length > 254 || !EMAIL.test(result)) throw new UsersError('INVALID_EMAIL', 'Invalid email');
  return result;
}
function privateView(row) {
  if (!row) return null;
  const { password_hash: ignored, ...safe } = row; void ignored;
  return Object.freeze(safe);
}
function publicView(row) {
  if (!row) return null;
  return Object.freeze({ id: row.id, role: row.role, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at });
}

function createUsers(options) {
  dependencies(options);
  const { db, events, logger, id, clock = () => new Date() } = options;
  const emit = (name, userId, correlationId, payload = {}) => events.publish({ name, version: '1.0',
    source: 'Users', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { userId, ...payload },
    metadata: correlationId ? { correlationId } : {} });

  async function getById(userId) {
    if (typeof userId !== 'string' || !userId) throw new UsersError('INVALID_USER');
    return privateView(await db.first('SELECT id, email, role, status, email_verified_at, created_at, updated_at FROM users WHERE id = ?', [userId]));
  }
  async function findForAuthentication(value) {
    const row = await db.first('SELECT id, email, password_hash, role, status, email_verified_at, created_at, updated_at FROM users WHERE email = ?', [email(value)]);
    return row ? Object.freeze({ ...row }) : null;
  }
  async function create(input, context = {}) {
    if (!input || typeof input.passwordHash !== 'string' || input.passwordHash.length < 32) throw new UsersError('INVALID_USER');
    const normalizedEmail = email(input.email); const role = input.role ?? 'user';
    if (!ROLES.has(role)) throw new UsersError('INVALID_ROLE');
    if (await db.first('SELECT id FROM users WHERE email = ?', [normalizedEmail])) throw new UsersError('EMAIL_EXISTS', 'Email already registered');
    const userId = `usr_${id()}`; const now = clock().toISOString();
    await db.write('INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, normalizedEmail, input.passwordHash, role, 'pending', now, now]);
    logger.info('User created', { operation: 'users.create', status: 'completed', userId });
    await emit('UserCreated', userId, context.correlationId, { role });
    return getById(userId);
  }
  async function update(userId, input, context = {}) {
    if (!input || Object.keys(input).some((key) => !['email'].includes(key))) throw new UsersError('PROTECTED_FIELD', 'Protected user field');
    const normalizedEmail = email(input.email); const duplicate = await db.first('SELECT id FROM users WHERE email = ? AND id <> ?', [normalizedEmail, userId]);
    if (duplicate) throw new UsersError('EMAIL_EXISTS', 'Email already registered');
    await db.write('UPDATE users SET email = ?, updated_at = ? WHERE id = ? AND status <> ?', [normalizedEmail, clock().toISOString(), userId, 'deleted']);
    await emit('UserUpdated', userId, context.correlationId, { fields: ['email'] });
    return getById(userId);
  }
  async function setState(userId, state, context = {}) {
    if (!STATES.has(state) || state === 'pending') throw new UsersError('INVALID_STATE');
    const current = await getById(userId); if (!current) throw new UsersError('NOT_FOUND', 'User not found');
    if (current.status === 'deleted' && state !== 'deleted') throw new UsersError('INVALID_TRANSITION');
    await db.write('UPDATE users SET status = ?, updated_at = ? WHERE id = ?', [state, clock().toISOString(), userId]);
    await emit('UserStateChanged', userId, context.correlationId, { from: current.status, to: state });
    return getById(userId);
  }
  async function markEmailVerified(userId, context = {}) {
    const now = clock().toISOString();
    await db.write('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?), status = CASE WHEN status = ? THEN ? ELSE status END, updated_at = ? WHERE id = ?',
      [now, 'pending', 'active', now, userId]);
    await emit('UserEmailVerified', userId, context.correlationId);
    return getById(userId);
  }
  async function replacePasswordHash(userId, passwordHash) {
    if (typeof passwordHash !== 'string' || passwordHash.length < 32) throw new UsersError('INVALID_PASSWORD_HASH');
    await db.write('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ? AND status <> ?', [passwordHash, clock().toISOString(), userId, 'deleted']);
    return true;
  }
  return Object.freeze({ create, getById, findForAuthentication, update, activate: (userId, ctx) => setState(userId, 'active', ctx),
    suspend: (userId, ctx) => setState(userId, 'suspended', ctx), close: (userId, ctx) => setState(userId, 'deleted', ctx),
    markEmailVerified, replacePasswordHash, toPrivate: privateView, toPublic: publicView });
}

return { UsersError, createUsers };
})();
export const { UsersError, createUsers } = UsersScope;

const ImobiliaristasScope = (() => {
class ImobiliaristasError extends Error { constructor(code, message = 'Professional profile operation failed') { super(message); this.name = 'ImobiliaristasError'; this.code = code; } }
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
function createImobiliaristas(options) {
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

return { ImobiliaristasError, createImobiliaristas };
})();
export const { ImobiliaristasError, createImobiliaristas } = ImobiliaristasScope;

const SubscriptionsScope = (() => {
const TRANSITIONS = Object.freeze({ pending: new Set(['active', 'canceled', 'expired']), active: new Set(['past_due', 'canceled', 'expired']), past_due: new Set(['active', 'canceled', 'expired']), canceled: new Set(), expired: new Set() });
class SubscriptionsError extends Error { constructor(code, message = 'Subscription operation failed') { super(message); this.name = 'SubscriptionsError'; this.code = code; } }
const validDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const view = (row) => row && Object.freeze({ id: row.id, userId: row.user_id, planId: row.plan_id, status: row.status,
  startsAt: row.starts_at, currentPeriodEndsAt: row.current_period_ends_at, canceledAt: row.canceled_at,
  externalReference: row.external_reference, createdAt: row.created_at, updatedAt: row.updated_at });
function createSubscriptions(options) {
  if (!options?.db?.first || !options.db.write || !options.db.all || !options?.events?.publish || !options?.users?.getById || !options?.plans?.getById) throw new TypeError('Invalid Subscriptions dependencies');
  const { db, events, logger, users, plans, id, clock = () => new Date() } = options;
  const emit = (name, subscriptionId, correlationId, payload = {}) => events.publish({ name, version: '1.0', source: 'Subscriptions', id: `evt_${id()}`,
    occurredAt: clock().toISOString(), payload: { subscriptionId, ...payload }, metadata: correlationId ? { correlationId } : {} });
  const getById = async (subscriptionId) => view(await db.first('SELECT * FROM subscriptions WHERE id = ?', [subscriptionId]));
  async function create(input, context = {}) {
    if (!validDate(input?.startsAt) || !validDate(input?.currentPeriodEndsAt) || Date.parse(input.currentPeriodEndsAt) <= Date.parse(input.startsAt)) throw new SubscriptionsError('INVALID_PERIOD');
    const user = await users.getById(input.userId); const plan = await plans.getById(input.planId);
    if (!user || user.status !== 'active') throw new SubscriptionsError('INVALID_USER'); if (!plan || !plan.active) throw new SubscriptionsError('INVALID_PLAN');
    if (input.externalReference) { const existing = await db.first('SELECT * FROM subscriptions WHERE external_reference = ?', [input.externalReference]); if (existing) return view(existing); }
    const subscriptionId = `sub_${id()}`; const now = clock().toISOString();
    await db.write('INSERT INTO subscriptions (id, user_id, plan_id, status, starts_at, current_period_ends_at, external_reference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [subscriptionId, input.userId, input.planId, 'pending', input.startsAt, input.currentPeriodEndsAt, input.externalReference ?? null, now, now]);
    logger.info('Subscription created', { operation: 'subscriptions.create', status: 'completed', subscriptionId });
    await emit('SubscriptionCreated', subscriptionId, context.correlationId, { userId: input.userId, planId: input.planId,
      contractedTerms: { priceMinor: plan.priceMinor, currency: plan.currency, billingInterval: plan.billingInterval, listingLimit: plan.listingLimit, mediaLimit: plan.mediaLimit, features: plan.features } }); return getById(subscriptionId);
  }
  async function transition(subscriptionId, next, context = {}) {
    const current = await getById(subscriptionId); if (!current) throw new SubscriptionsError('NOT_FOUND');
    if (!TRANSITIONS[current.status]?.has(next)) throw new SubscriptionsError('INVALID_TRANSITION');
    if (next === 'active') { const active = await db.first('SELECT id FROM subscriptions WHERE user_id = ? AND status = ? AND id <> ?', [current.userId, 'active', subscriptionId]); if (active) throw new SubscriptionsError('ACTIVE_EXISTS'); }
    const now = clock().toISOString(); await db.write('UPDATE subscriptions SET status = ?, canceled_at = CASE WHEN ? = ? THEN ? ELSE canceled_at END, updated_at = ? WHERE id = ?', [next, next, 'canceled', now, now, subscriptionId]);
    await emit('SubscriptionStateChanged', subscriptionId, context.correlationId, { from: current.status, to: next, userId: current.userId }); return getById(subscriptionId);
  }
  async function renew(subscriptionId, endsAt, context = {}) { const current = await getById(subscriptionId); if (!current || current.status !== 'active' || !validDate(endsAt) || Date.parse(endsAt) <= Date.parse(current.currentPeriodEndsAt)) throw new SubscriptionsError('INVALID_RENEWAL'); await db.write('UPDATE subscriptions SET current_period_ends_at = ?, updated_at = ? WHERE id = ?', [endsAt, clock().toISOString(), subscriptionId]); await emit('SubscriptionRenewed', subscriptionId, context.correlationId, { currentPeriodEndsAt: endsAt }); return getById(subscriptionId); }
  async function changePlan(subscriptionId, planId, context = {}) { const current = await getById(subscriptionId); const plan = await plans.getById(planId); if (!current || !['pending', 'active'].includes(current.status) || !plan?.active) throw new SubscriptionsError('INVALID_PLAN_CHANGE'); await db.write('UPDATE subscriptions SET plan_id = ?, updated_at = ? WHERE id = ?', [planId, clock().toISOString(), subscriptionId]); await emit('SubscriptionPlanChanged', subscriptionId, context.correlationId, { fromPlanId: current.planId, toPlanId: planId }); return getById(subscriptionId); }
  async function activeForUser(userId) { return view(await db.first('SELECT * FROM subscriptions WHERE user_id = ? AND status = ?', [userId, 'active'])); }
  async function history(userId) { const result = await db.all('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC', [userId]); return Object.freeze(result.results.map(view)); }
  return Object.freeze({ create, getById, activate: (value, ctx) => transition(value, 'active', ctx), suspend: (value, ctx) => transition(value, 'past_due', ctx), cancel: (value, ctx) => transition(value, 'canceled', ctx), expire: (value, ctx) => transition(value, 'expired', ctx), renew, changePlan, activeForUser, history, transitions: TRANSITIONS });
}

return { SubscriptionsError, createSubscriptions };
})();
export const { SubscriptionsError, createSubscriptions } = SubscriptionsScope;
