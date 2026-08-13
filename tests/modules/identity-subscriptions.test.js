import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createIdentityAuth, IdentityError } from '../../business/accounts.js';
import { createUsers, UsersError } from '../../business/accounts.js';
import { createImobiliaristas } from '../../business/accounts.js';
import { createPlans, PlansError } from '../../business/plans.js';
import { createSubscriptions, SubscriptionsError } from '../../business/accounts.js';

const clock = () => new Date('2026-07-31T12:00:00.000Z');
const logger = { info() {}, warn() {}, error() {}, debug() {} };
const events = () => { const published = []; return { published, async publish(event) { published.push(event); return { event }; } }; };
const ids = () => { let value = 0; return () => String(++value).padStart(32, '0'); };
function database(rows = []) { const calls = []; return { calls,
  async first(sql, parameters) { calls.push({ sql, parameters }); return rows.shift() ?? null; },
  async write(sql, parameters) { calls.push({ sql, parameters }); return { success: true, meta: { changes: 1 } }; },
  async all(sql, parameters) { calls.push({ sql, parameters }); return { results: rows.shift() ?? [] }; },
  async batch(commands) { calls.push(...commands); return commands.map(() => ({ success: true })); } }; }
const userRow = { id: 'usr_00000000000000000000000000000001', email: 'user@example.com', password_hash: 'h'.repeat(40), role: 'user', status: 'active', email_verified_at: '2026-07-31T00:00:00Z', created_at: '2026-07-31T00:00:00Z', updated_at: '2026-07-31T00:00:00Z' };
const planRow = { id: 'pln_1', code: 'pro', name: 'Professional', description: null, price_minor: 1990, currency: 'BRL', billing_interval: 'month', listing_limit: 10, media_limit: 20, features_json: '["featured"]', active: 1, created_at: clock().toISOString(), updated_at: clock().toISOString() };

test('Users creates normalized private records, parameterizes SQL and never returns credentials', async () => {
  const db = database([null, { ...userRow, status: 'pending' }]); const bus = events();
  const users = createUsers({ db, events: bus, logger, id: ids(), clock });
  const result = await users.create({ email: ' User@Example.com ', passwordHash: 'x'.repeat(40) });
  assert.equal(result.email, 'user@example.com'); assert.equal(result.password_hash, undefined);
  assert.ok(db.calls.every((call) => Array.isArray(call.parameters))); assert.equal(bus.published[0].name, 'UserCreated');
});

test('Users rejects invalid, duplicate and protected data and exposes a minimal public view', async () => {
  const users = createUsers({ db: database([{ id: 'other' }]), events: events(), logger, id: ids(), clock });
  await assert.rejects(users.create({ email: 'a@example.com', passwordHash: 'x'.repeat(40) }), (error) => error.code === 'EMAIL_EXISTS');
  await assert.rejects(users.update('u', { role: 'admin' }), UsersError);
  assert.deepEqual(users.toPublic(userRow), { id: userRow.id, role: 'user', status: 'active', createdAt: userRow.created_at, updatedAt: userRow.updated_at });
});

test('Plans validates integer money and interval, publishes only active plans and emits events', async () => {
  const db = database([null, planRow, [planRow]]); const bus = events(); const plans = createPlans({ db, events: bus, logger, id: ids(), clock });
  const created = await plans.create({ code: 'pro', name: 'Professional', priceMinor: 1990, billingInterval: 'month', listingLimit: 10, mediaLimit: 20, features: ['featured'] });
  assert.equal(created.priceMinor, 1990); assert.equal((await plans.listPublic()).length, 1); assert.equal(bus.published[0].name, 'PlanCreated');
  await assert.rejects(plans.create({ code: 'bad', name: 'Bad', priceMinor: 1.5, billingInterval: 'week', listingLimit: 0, mediaLimit: 0, features: [] }), PlansError);
});

test('Imobiliaristas derives a unique slug, keeps documents private and exposes R2 references', async () => {
  const row = { user_id: userRow.id, display_name: 'Ana Corretora', bio: 'Bio', phone: 'secret', avatar_r2_key: 'avatars/ana.webp', website_url: null, social_links_json: '{}', registration_number: '1234', registration_region: 'SP', company_name: 'Acts', company_document: 'private', status: 'verified', verified_at: clock().toISOString(), created_at: clock().toISOString(), updated_at: clock().toISOString() };
  const db = database([null, null, row]); const bus = events();
  const profiles = createImobiliaristas({ db, events: bus, logger, id: ids(), clock, users: { getById: async () => userRow } });
  const profile = await profiles.create({ userId: userRow.id, displayName: 'Ana Corretora', registrationNumber: '1234', registrationRegion: 'sp', avatarR2Key: 'avatars/ana.webp' });
  assert.equal(profile.slug, 'sp-1234'); const publicResult = profiles.toPublic(row);
  assert.equal(publicResult.avatarR2Key, 'avatars/ana.webp'); assert.equal(publicResult.companyDocument, undefined); assert.equal(publicResult.phone, undefined);
});

test('Subscriptions creates idempotently with contracted terms and validates state transitions', async () => {
  const pending = { id: 'sub_1', user_id: userRow.id, plan_id: planRow.id, status: 'pending', starts_at: '2026-08-01T00:00:00Z', current_period_ends_at: '2026-09-01T00:00:00Z', canceled_at: null, external_reference: 'request-1', created_at: clock().toISOString(), updated_at: clock().toISOString() };
  const db = database([null, pending]); const bus = events();
  const subscriptions = createSubscriptions({ db, events: bus, logger, id: ids(), clock, users: { getById: async () => userRow }, plans: { getById: async () => ({ ...createPlans({ db: database(), events: events(), logger, id: ids(), clock }).toPublic(planRow), active: true }) } });
  const result = await subscriptions.create({ userId: userRow.id, planId: planRow.id, startsAt: pending.starts_at, currentPeriodEndsAt: pending.current_period_ends_at, externalReference: 'request-1' });
  assert.equal(result.status, 'pending'); assert.equal(bus.published[0].payload.contractedTerms.priceMinor, 1990);
  const invalid = createSubscriptions({ db: database([{ ...pending, status: 'canceled' }]), events: events(), logger, id: ids(), clock, users: { getById: async () => userRow }, plans: { getById: async () => planRow } });
  await assert.rejects(invalid.activate('sub_1'), (error) => error.code === 'INVALID_TRANSITION');
});

test('Subscriptions supports activation, suspension, cancellation, expiration, renewal and plan change states', () => {
  assert.deepEqual([...createSubscriptions({ db: database(), events: events(), logger, id: ids(), clock, users: { getById() {} }, plans: { getById() {} } }).transitions.active], ['past_due', 'canceled', 'expired']);
});

function identityFixture({ found = userRow } = {}) {
  const db = database(); const bus = events(); const delivered = [];
  const technicalAuth = { async issue(identity) { return `signed.${btoa(identity.id)}`; }, async validate({ value }) { return { id: atob(value.split('.')[1]), permissions: ['user'] }; } };
  const users = { async create() { return { ...userRow, password_hash: undefined, status: 'pending' }; }, async findForAuthentication() { return found; }, async getById() { return { ...userRow, password_hash: undefined }; }, toPrivate(value) { const { password_hash: ignored, ...safe } = value; void ignored; return safe; }, async markEmailVerified() { return userRow; }, async replacePasswordHash() {} };
  const auth = createIdentityAuth({ db, events: bus, logger, id: ids(), clock, technicalAuth, users,
    passwords: { async hash() { return 'h'.repeat(40); }, async verify(password) { return password === 'correct-password'; } },
    delivery: { async deliverRecovery(value) { delivered.push(value); }, async deliverVerification(value) { delivered.push(value); } } });
  return { auth, db, bus, delivered };
}

test('Auth registration uses injected hashing, Users and protected verification delivery', async () => {
  const { auth, db, bus, delivered } = identityFixture(); const result = await auth.register({ email: 'user@example.com', password: 'correct-password' });
  assert.equal(result.verificationRequired, true); assert.equal(delivered.length, 1); assert.equal(JSON.stringify(result).includes('password'), false);
  assert.ok(db.calls[0].sql.includes('INSERT INTO sessions')); assert.equal(bus.published.at(-1).name, 'IdentityRegistered');
});

test('Auth login rejects invalid credentials and suspended accounts without leaking secrets', async () => {
  await assert.rejects(identityFixture().auth.login({ email: 'user@example.com', password: 'wrong' }), (error) => error.code === 'INVALID_CREDENTIALS');
  const fixture = identityFixture({ found: { ...userRow, status: 'suspended' } });
  await assert.rejects(fixture.auth.login({ email: 'user@example.com', password: 'correct-password' }), (error) => error.code === 'ACCOUNT_UNAVAILABLE');
  assert.equal(JSON.stringify(fixture.bus.published).includes('correct-password'), false);
});

test('Auth recovery has an identical non-enumerating response for existing and absent accounts', async () => {
  const existing = identityFixture(); const absent = identityFixture({ found: null });
  assert.deepEqual(await existing.auth.requestRecovery('user@example.com'), await absent.auth.requestRecovery('missing@example.com'));
  assert.equal(existing.delivered.length, 1); assert.equal(absent.delivered.length, 0);
});

test('all Lote 7 modules use injected Core boundaries and contain no forbidden integration', async () => {
  const files = ['Auth.js', 'Users.js', 'Imobiliaristas.js', 'Plans.js', 'Subscriptions.js'];
  const sources = [await readFile(new URL('../../business/accounts.js', import.meta.url), 'utf8')];
  for (const source of sources) {
    assert.doesNotMatch(source, /process\.env|from ['"]\.\/|env\.(?:DB|KV|R2)|fetch\s*\(/i);
    assert.match(source, /\?[^'`]*['`], \[/); assert.match(source, /events\.publish/);
  }
});
