import { resolvePremiumEligibility } from './plans.js';

const TYPES = new Set(['trial', 'courtesy', 'promotion', 'temporary_free']);
const ID = /^[A-Za-z0-9_-]{3,128}$/;
const date = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const json = (value) => JSON.stringify(value ?? null);

export class AdminError extends Error {
  constructor(code, status, message = 'Admin operation rejected') { super(message); this.name = 'AdminError'; this.code = code; this.status = status; }
}

export function requireAdmin(identity) {
  if (!identity) throw new AdminError('UNAUTHENTICATED', 401);
  if (identity.user?.role !== 'admin' || identity.user.status !== 'active') throw new AdminError('FORBIDDEN', 403);
  return identity.user;
}

export function createAdminOperations({ db, publications, logger, clock = () => new Date(), id = () => crypto.randomUUID() } = {}) {
  if (!db?.first || !db?.all || !db?.write || !db?.batch || !publications?.send || !logger?.info) throw new TypeError('Invalid admin dependencies');
  async function search(query) {
    const q = typeof query === 'string' ? query.trim() : '';
    if (q.length < 2 || q.length > 120) throw new AdminError('INVALID_QUERY', 400, 'Search query must have 2 to 120 characters');
    const like = `%${q.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
    const result = await db.all(`SELECT u.id, u.email, u.role, u.status, u.created_at, p.display_name,
      (SELECT l.slug FROM listings l WHERE l.owner_id = u.id ORDER BY l.updated_at DESC LIMIT 1) AS slug
      FROM users u LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id = ? OR u.email LIKE ? ESCAPE '\\' OR p.display_name LIKE ? ESCAPE '\\'
        OR EXISTS(SELECT 1 FROM listings l WHERE l.owner_id = u.id AND l.slug LIKE ? ESCAPE '\\')
      ORDER BY u.created_at DESC LIMIT 20`, [q, like, like, like]);
    return result.results.map((row) => ({ id: row.id, email: row.email, role: row.role, status: row.status,
      createdAt: row.created_at, displayName: row.display_name, slug: row.slug }));
  }
  async function detail(userId) {
    if (!ID.test(userId)) throw new AdminError('NOT_FOUND', 404);
    const user = await db.first('SELECT id, email, role, status, email_verified_at, created_at, updated_at FROM users WHERE id = ?', [userId]);
    if (!user) throw new AdminError('NOT_FOUND', 404);
    const [profile, subscription, condition, payments, boosts, listing, eligibility] = await Promise.all([
      db.first('SELECT display_name, bio, phone, website_url, created_at, updated_at FROM profiles WHERE user_id = ?', [userId]),
      db.first(`SELECT s.id, s.status, s.starts_at, s.current_period_ends_at, s.canceled_at, s.created_at, p.code AS plan_code
        FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.user_id=? ORDER BY CASE WHEN s.status='active' THEN 0 ELSE 1 END,s.created_at DESC LIMIT 1`, [userId]),
      db.first('SELECT id,type,status,starts_at,ends_at,reason,actor,created_at,updated_at FROM commercial_conditions WHERE user_id=? ORDER BY created_at DESC LIMIT 1', [userId]),
      db.all(`SELECT py.id,py.amount_minor,py.currency,py.status,py.due_at,py.paid_at,py.created_at FROM payments py
        JOIN subscriptions s ON s.id=py.subscription_id WHERE s.user_id=? ORDER BY py.created_at DESC LIMIT 20`, [userId]),
      db.all('SELECT id,listing_id,status,duration,starts_at,ends_at,price_minor,currency,created_at FROM boosts WHERE owner_id=? ORDER BY created_at DESC LIMIT 20', [userId]),
      db.first(`SELECT l.id,l.slug,l.status,l.updated_at,c.slug AS city_slug FROM listings l LEFT JOIN cities c ON c.id=l.city_id
        WHERE l.owner_id=? ORDER BY l.updated_at DESC LIMIT 1`, [userId]), resolvePremiumEligibility(db, userId)
    ]);
    return { user: { id:user.id,email:user.email,role:user.role,status:user.status,emailVerifiedAt:user.email_verified_at,createdAt:user.created_at,updatedAt:user.updated_at }, profile,
      plan: eligibility.premium ? 'PREMIUM' : (subscription?.plan_code?.toUpperCase() ?? 'STANDARD'), subscription, commercialCondition: condition,
      payments: payments.results, boosts: boosts.results, publication: listing ? { profileId:listing.id,profileSlug:listing.slug,citySlug:listing.city_slug,publishable:eligibility.premium && listing.status==='published',lastUpdatedAt:listing.updated_at } : null };
  }
  async function target(userId) { const user = await db.first('SELECT id,status FROM users WHERE id=?', [userId]); if (!user) throw new AdminError('NOT_FOUND',404); return { user, listing: await db.first("SELECT id,slug FROM listings WHERE owner_id=? AND status='published' ORDER BY id LIMIT 1",[userId]) }; }
  async function enqueue(listing, reason, now) { if (listing) await publications.send({ type:'PUBLICATION_REQUESTED',entity:'profile',id:listing.id,slug:listing.slug,reason,requestedAt:now }); }
  async function condition(userId, input, actor) {
    if (!input || Object.keys(input).some((key) => !['type','startsAt','endsAt','reason'].includes(key)) || !TYPES.has(input.type)
      || !date(input.startsAt) || (input.endsAt !== null && input.endsAt !== undefined && !date(input.endsAt))
      || (input.type === 'trial' && !input.endsAt) || (input.endsAt && Date.parse(input.endsAt) <= Date.parse(input.startsAt))
      || typeof input.reason !== 'string' || input.reason.trim().length < 3 || input.reason.trim().length > 500) throw new AdminError('INVALID_INPUT',400);
    const { listing } = await target(userId); const previous = await db.first('SELECT id,type,status,starts_at,ends_at,reason FROM commercial_conditions WHERE user_id=? ORDER BY created_at DESC LIMIT 1',[userId]);
    const now=clock().toISOString(); const status=Date.parse(input.startsAt)>Date.parse(now)?'scheduled':(input.endsAt&&Date.parse(input.endsAt)<=Date.parse(now)?'expired':'active'); const conditionId=`cc_${id()}`;
    const next={id:conditionId,type:input.type,status,startsAt:input.startsAt,endsAt:input.endsAt??null,reason:input.reason.trim()};
    await db.batch([{sql:"UPDATE commercial_conditions SET status='cancelled',updated_at=? WHERE user_id=? AND status IN ('active','scheduled')",parameters:[now,userId]},
      {sql:'INSERT INTO commercial_conditions(id,user_id,type,status,starts_at,ends_at,reason,actor,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',parameters:[conditionId,userId,input.type,status,input.startsAt,input.endsAt??null,input.reason.trim(),actor.id,now,now]},
      {sql:'INSERT INTO admin_audit(id,actor_user_id,target_user_id,action,reason,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?,?)',parameters:[`audit_${id()}`,actor.id,userId,'commercial_condition.apply',input.reason.trim(),json(previous),json(next),now]}]);
    await enqueue(listing,'commercial-condition.updated',now); logger.info('Admin action',{operation:'admin.commercial-condition',status:'completed',adminUserId:actor.id,targetUserId:userId,action:'commercial_condition.apply',reason:input.reason.trim(),timestamp:now}); return next;
  }
  async function state(userId, nextState, reason, actor) {
    if (!['active','suspended'].includes(nextState) || typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 500) throw new AdminError('INVALID_INPUT',400);
    const current=await target(userId); const now=clock().toISOString();
    await db.batch([{sql:'UPDATE users SET status=?,updated_at=? WHERE id=?',parameters:[nextState,now,userId]}, {sql:'INSERT INTO admin_audit(id,actor_user_id,target_user_id,action,reason,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?,?)',parameters:[`audit_${id()}`,actor.id,userId,`account.${nextState}`,reason.trim(),json({status:current.user.status}),json({status:nextState}),now]}]);
    await enqueue(current.listing,`account.${nextState}`,now); logger.info('Admin action',{operation:'admin.account-state',status:'completed',adminUserId:actor.id,targetUserId:userId,action:`account.${nextState}`,reason:reason.trim(),timestamp:now}); return {status:nextState,publicationScheduled:Boolean(current.listing)};
  }
  async function republish(userId, reason, actor) { const current=await target(userId); if (!current.listing) throw new AdminError('PUBLICATION_TARGET_NOT_FOUND',422); const now=clock().toISOString(); const why=typeof reason==='string'&&reason.trim()?reason.trim():'Suporte operacional'; if(why.length>500)throw new AdminError('INVALID_INPUT',400);
    await db.write('INSERT INTO admin_audit(id,actor_user_id,target_user_id,action,reason,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?,?)',[`audit_${id()}`,actor.id,userId,'publication.republish',why,null,json({listingId:current.listing.id}),now]); await enqueue(current.listing,'admin.republish',now); logger.info('Admin action',{operation:'admin.republish',status:'completed',adminUserId:actor.id,targetUserId:userId,action:'publication.republish',reason:why,timestamp:now}); return {publicationScheduled:true}; }
  return Object.freeze({search,detail,condition,state,republish});
}
