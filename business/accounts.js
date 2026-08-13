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
