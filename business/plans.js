const INTERVALS = new Set(['month', 'year']);
export class PlansError extends Error { constructor(code, message = 'Plan operation failed') { super(message); this.name = 'PlansError'; this.code = code; } }
const parse = (value, fallback) => { try { return JSON.parse(value ?? fallback); } catch { return JSON.parse(fallback); } };
function view(row) { return row && Object.freeze({ id: row.id, code: row.code, name: row.name, description: row.description,
  priceMinor: row.price_minor, currency: row.currency, billingInterval: row.billing_interval,
  listingLimit: row.listing_limit, mediaLimit: row.media_limit, features: Object.freeze(parse(row.features_json, '[]')),
  active: Boolean(row.active), createdAt: row.created_at, updatedAt: row.updated_at }); }
function normalize(input) {
  const code = typeof input?.code === 'string' ? input.code.trim().toLowerCase() : '';
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(code) || name.length < 2 || name.length > 120
    || !Number.isSafeInteger(input.priceMinor) || input.priceMinor < 0 || !/^[A-Z]{3}$/.test(input.currency ?? 'BRL')
    || !INTERVALS.has(input.billingInterval) || !Number.isSafeInteger(input.listingLimit) || input.listingLimit < 0
    || !Number.isSafeInteger(input.mediaLimit) || input.mediaLimit < 0 || !Array.isArray(input.features)
    || input.features.some((item) => typeof item !== 'string' || !item.trim())) throw new PlansError('INVALID_PLAN');
  return { code, name, description: input.description ?? null, priceMinor: input.priceMinor, currency: input.currency ?? 'BRL',
    billingInterval: input.billingInterval, listingLimit: input.listingLimit, mediaLimit: input.mediaLimit,
    features: [...new Set(input.features.map((item) => item.trim()))] };
}
export function createPlans(options) {
  if (!options?.db?.first || !options.db.write || !options.db.all || !options?.events?.publish || typeof options.id !== 'function') throw new TypeError('Invalid Plans dependencies');
  const { db, events, logger, id, clock = () => new Date() } = options;
  const emit = (name, planId, correlationId, payload = {}) => events.publish({ name, version: '1.0', source: 'Plans', id: `evt_${id()}`,
    occurredAt: clock().toISOString(), payload: { planId, ...payload }, metadata: correlationId ? { correlationId } : {} });
  const getById = async (planId) => view(await db.first('SELECT * FROM plans WHERE id = ?', [planId]));
  async function create(input, context = {}) {
    const data = normalize(input); if (await db.first('SELECT id FROM plans WHERE code = ?', [data.code])) throw new PlansError('CODE_EXISTS');
    const planId = `pln_${id()}`; const now = clock().toISOString();
    await db.write('INSERT INTO plans (id, code, name, description, price_minor, currency, billing_interval, listing_limit, media_limit, features_json, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [planId, data.code, data.name, data.description, data.priceMinor, data.currency, data.billingInterval, data.listingLimit, data.mediaLimit, JSON.stringify(data.features), 1, now, now]);
    logger.info('Plan created', { operation: 'plans.create', status: 'completed', planId }); await emit('PlanCreated', planId, context.correlationId); return getById(planId);
  }
  async function update(planId, input, context = {}) {
    const current = await getById(planId); if (!current) throw new PlansError('NOT_FOUND');
    const data = normalize({ ...current, ...input, features: input.features ?? current.features }); const now = clock().toISOString();
    const contractualChange = data.priceMinor !== current.priceMinor || data.currency !== current.currency
      || data.billingInterval !== current.billingInterval || data.listingLimit !== current.listingLimit
      || data.mediaLimit !== current.mediaLimit || JSON.stringify(data.features) !== JSON.stringify(current.features);
    if (contractualChange && await db.first('SELECT id FROM subscriptions WHERE plan_id = ? LIMIT 1', [planId])) {
      throw new PlansError('CONTRACTED_PLAN_IMMUTABLE', 'Contracted plan conditions are immutable');
    }
    await db.write('UPDATE plans SET code = ?, name = ?, description = ?, price_minor = ?, currency = ?, billing_interval = ?, listing_limit = ?, media_limit = ?, features_json = ?, updated_at = ? WHERE id = ?',
      [data.code, data.name, data.description, data.priceMinor, data.currency, data.billingInterval, data.listingLimit, data.mediaLimit, JSON.stringify(data.features), now, planId]);
    await emit('PlanUpdated', planId, context.correlationId, { contractualConditionsChanged: contractualChange }); return getById(planId);
  }
  async function setActive(planId, active, context = {}) { await db.write('UPDATE plans SET active = ?, updated_at = ? WHERE id = ?', [active ? 1 : 0, clock().toISOString(), planId]); await emit('PlanStateChanged', planId, context.correlationId, { active }); return getById(planId); }
  async function listPublic() { const result = await db.all('SELECT * FROM plans WHERE active = ? ORDER BY price_minor, code', [1]); return Object.freeze(result.results.map(view)); }
  return Object.freeze({ create, getById, update, activate: (idValue, ctx) => setActive(idValue, true, ctx), deactivate: (idValue, ctx) => setActive(idValue, false, ctx), listPublic, toPublic: view });
}

/** One authoritative decision for paid and time-bound commercial PREMIUM access. */
export async function resolvePremiumEligibility(db, userId, { clock = () => new Date() } = {}) {
  if (!db?.first || typeof userId !== 'string' || !userId) throw new TypeError('Invalid eligibility input');
  const now = clock().toISOString();
  const row = await db.first(`SELECT u.status,
    EXISTS(SELECT 1 FROM subscriptions s JOIN plans p ON p.id = s.plan_id
      WHERE s.user_id = u.id AND s.status = 'active' AND p.active = 1 AND lower(p.code) = 'premium') AS paid_premium,
    EXISTS(SELECT 1 FROM commercial_conditions cc WHERE cc.user_id = u.id
      AND cc.status IN ('active','scheduled') AND cc.type IN ('trial','courtesy','promotion','temporary_free')
      AND cc.starts_at <= ? AND (cc.ends_at IS NULL OR cc.ends_at > ?)) AS commercial_premium
    FROM users u WHERE u.id = ?`, [now, now, userId]);
  return Object.freeze({ premium: row?.status === 'active' && (Boolean(row.paid_premium) || Boolean(row.commercial_premium)),
    paid: Boolean(row?.paid_premium), commercial: Boolean(row?.commercial_premium), accountStatus: row?.status ?? null });
}
