const TRANSITIONS = Object.freeze({ pending: new Set(['active', 'canceled', 'expired']), active: new Set(['past_due', 'canceled', 'expired']), past_due: new Set(['active', 'canceled', 'expired']), canceled: new Set(), expired: new Set() });
export class SubscriptionsError extends Error { constructor(code, message = 'Subscription operation failed') { super(message); this.name = 'SubscriptionsError'; this.code = code; } }
const validDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const view = (row) => row && Object.freeze({ id: row.id, userId: row.user_id, planId: row.plan_id, status: row.status,
  startsAt: row.starts_at, currentPeriodEndsAt: row.current_period_ends_at, canceledAt: row.canceled_at,
  externalReference: row.external_reference, createdAt: row.created_at, updatedAt: row.updated_at });
export function createSubscriptions(options) {
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
