const PRODUCTS = Object.freeze({
  '24h': Object.freeze({ priceMinor: 990, milliseconds: 86_400_000 }),
  '7d': Object.freeze({ priceMinor: 3990, milliseconds: 7 * 86_400_000 }),
  '15d': Object.freeze({ priceMinor: 6990, milliseconds: 15 * 86_400_000 }),
  '30d': Object.freeze({ priceMinor: 11990, milliseconds: 30 * 86_400_000 }),
});
const METHODS = new Set(['PIX', 'BOLETO']);
const changed = (result) => Number(result?.meta?.changes ?? 0) === 1;
const publicView = (row, now = new Date()) => row && Object.freeze({ id: row.id,
  status: row.status === 'active' && Date.parse(row.ends_at) <= now.getTime() ? 'expired' : row.status,
  startsAt: row.starts_at, endsAt: row.ends_at, duration: row.duration });

export class BoostsError extends Error {
  constructor(code) { super('Boost operation failed'); this.name = 'BoostsError'; this.code = code; }
}

export function createBoosts({ db, gateway, logger, publications, hash, id = () => crypto.randomUUID(), clock = () => new Date() } = {}) {
  if (!db?.first || !db?.all || !db?.write || !db?.batch || !gateway?.createPayment || !logger?.info || !publications?.send || !hash) throw new TypeError('Invalid Boosts dependencies');
  async function listingFor(userId) {
    const row = await db.first(`SELECT l.id, l.slug, l.city_id, c.slug AS city_slug, s.id AS subscription_id, s.external_reference AS customer_reference,
      lower(pl.code) AS plan_code, u.status AS user_status FROM listings l JOIN users u ON u.id = l.owner_id
      LEFT JOIN cities c ON c.id = l.city_id LEFT JOIN subscriptions s ON s.user_id = l.owner_id AND s.status = 'active'
      LEFT JOIN plans pl ON pl.id = s.plan_id AND pl.active = 1 WHERE l.owner_id = ? AND l.status = 'published' ORDER BY l.id LIMIT 1`, [userId]);
    if (!row) throw new BoostsError('LISTING_REQUIRED');
    if (row.user_status !== 'active') throw new BoostsError('ACCOUNT_INELIGIBLE');
    if (row.plan_code !== 'premium') throw new BoostsError('PREMIUM_REQUIRED');
    if (!row.subscription_id || !row.customer_reference) throw new BoostsError('BILLING_UNAVAILABLE');
    return row;
  }
  async function list(userId) {
    if (!userId) throw new BoostsError('FORBIDDEN');
    const rows = await db.all('SELECT id, status, starts_at, ends_at, duration FROM boosts WHERE owner_id = ? ORDER BY created_at DESC, id DESC', [userId]);
    return Object.freeze(rows.results.map((row) => publicView(row, clock())));
  }
  async function checkout(input, context = {}) {
    if (!context.userId || !input || Object.keys(input).some((key) => !['duration','billingType','idempotencyKey'].includes(key))
      || !PRODUCTS[input.duration] || !METHODS.has(input.billingType) || typeof input.idempotencyKey !== 'string' || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 128) throw new BoostsError('INVALID_INPUT');
    const listing = await listingFor(context.userId), product = PRODUCTS[input.duration];
    const keyHash = await hash(`${context.userId}:${input.idempotencyKey}`);
    const requestHash = await hash(JSON.stringify([context.userId, listing.id, input.duration, input.billingType]));
    const existing = await db.first("SELECT request_hash, resource_id FROM idempotency_records WHERE scope = 'boosts.checkout' AND idempotency_key_hash = ?", [keyHash]);
    if (existing) {
      if (existing.request_hash !== requestHash) throw new BoostsError('IDEMPOTENCY_CONFLICT');
      const boost = await db.first('SELECT b.*, p.status AS payment_status FROM boosts b LEFT JOIN payments p ON p.id = b.payment_id WHERE b.id = ?', [existing.resource_id]);
      if (!boost) throw new BoostsError('OPERATION_IN_PROGRESS');
      return { boost: publicView(boost, clock()), payment: { id: boost.payment_id, status: boost.payment_status?.toUpperCase() } };
    }
    const boostId = `bst_${id()}`, paymentId = `pay_${id()}`, now = clock().toISOString();
    const reserved = await db.write("INSERT OR IGNORE INTO idempotency_records (scope,idempotency_key_hash,request_hash,response_status,resource_type,resource_id,expires_at,created_at) VALUES ('boosts.checkout',?,?,NULL,'boost',?,?,?)",
      [keyHash, requestHash, boostId, new Date(clock().getTime() + 2_592_000_000).toISOString(), now]);
    if (!changed(reserved)) throw new BoostsError('OPERATION_IN_PROGRESS');
    const dueDate = new Date(clock().getTime() + 3 * 86_400_000).toISOString().slice(0, 10);
    let external;
    try { external = await gateway.createPayment({ customer: listing.customer_reference, billingType: input.billingType, amountMinor: product.priceMinor, currency: 'BRL', dueDate, internalReference: paymentId, idempotencyKey: keyHash }); }
    catch (error) { await db.write("UPDATE idempotency_records SET response_status = 409 WHERE scope = 'boosts.checkout' AND idempotency_key_hash = ?", [keyHash]); throw new BoostsError(error?.retryable ? 'EXTERNAL_RESULT_UNKNOWN' : 'GATEWAY_ERROR'); }
    const results = await db.batch([
      { sql: "INSERT INTO payments (id,subscription_id,amount_minor,currency,status,provider,external_reference,due_at,created_at,updated_at) VALUES (?,?,?,'BRL','pending','asaas',?,?,?,?)", parameters: [paymentId, listing.subscription_id, product.priceMinor, external.externalReference, dueDate, now, now] },
      { sql: "INSERT INTO boosts (id,listing_id,owner_id,payment_id,status,duration,price_minor,currency,created_at,updated_at) VALUES (?,?,?,?,'pending_payment',?,?,'BRL',?,?)", parameters: [boostId, listing.id, context.userId, paymentId, input.duration, product.priceMinor, now, now] },
      { sql: "UPDATE idempotency_records SET response_status = 201 WHERE scope = 'boosts.checkout' AND idempotency_key_hash = ?", parameters: [keyHash] },
    ]);
    if (!results.every(changed)) throw new BoostsError('PERSISTENCE_CONFLICT');
    logger.info('Boost checkout created', { operation: 'boosts.checkout', boostId, userId: context.userId, listingId: listing.id, paymentId, status: 'pending_payment' });
    return { boost: publicView({ id: boostId, status: 'pending_payment', duration: input.duration, starts_at: null, ends_at: null }, clock()), payment: { id: paymentId, status: 'PENDING', billingType: input.billingType, amountMinor: product.priceMinor, currency: 'BRL', dueDate } };
  }
  async function applyPayment(paymentId, paymentStatus) {
    const boost = await db.first(`SELECT b.*, l.city_id, c.slug AS city_slug FROM boosts b JOIN listings l ON l.id = b.listing_id LEFT JOIN cities c ON c.id = l.city_id WHERE b.payment_id = ?`, [paymentId]);
    if (!boost) return false;
    const now = clock(), timestamp = now.toISOString();
    if (paymentStatus === 'paid' && boost.status === 'pending_payment') {
      const endsAt = new Date(now.getTime() + PRODUCTS[boost.duration].milliseconds).toISOString();
      if (changed(await db.write("UPDATE boosts SET status='active', starts_at=?, ends_at=?, updated_at=? WHERE id=? AND status='pending_payment'", [timestamp, endsAt, timestamp, boost.id]))) {
        logger.info('Boost transitioned', { operation: 'boosts.payment', boostId: boost.id, userId: boost.owner_id, listingId: boost.listing_id, paymentId, status: 'active', transition: 'pending_payment->active', reason: 'payment.confirmed' });
        if (boost.city_id && boost.city_slug) await publications.send({ type: 'PUBLICATION_REQUESTED', entity: 'city', id: boost.city_id, slug: boost.city_slug, reason: 'boost.activated', requestedAt: timestamp });
      }
    } else if (['canceled','refunded'].includes(paymentStatus) && boost.status === 'pending_payment') await db.write("UPDATE boosts SET status='cancelled', updated_at=? WHERE id=? AND status='pending_payment'", [timestamp, boost.id]);
    return true;
  }
  return Object.freeze({ list, checkout, applyPayment, products: PRODUCTS });
}
