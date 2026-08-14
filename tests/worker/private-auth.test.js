import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../../worker/index.js';
import { createSessionAuth, extractSessionToken, hashPassword, sessionCookie, verifyPassword } from '../../core/auth.js';

const origin = 'https://acompanhantesex.com';
const logger = { debug() {}, info() {}, warn() {}, error() {} };

function environment({ queueFailure = false, writeFailure = false } = {}) {
  const state = { sessions: new Map(), sent: [], profile: { display_name: 'Ana', bio: 'Original', phone: null, website_url: null, social_links_json: '{}' } };
  const user = { id: 'user-000000000001', email: 'ana@example.test', role: 'professional', status: 'active', password_hash: null };
  function result(sql, args) {
    if (sql.includes('FROM users WHERE email')) return user.email.toLowerCase() === String(args[0]).toLowerCase() ? user : null;
    if (sql.includes('FROM sessions s JOIN users')) { const session = state.sessions.get(args[0]); return session ? { session_id: args[0], user_id: user.id, expires_at: session.expires, revoked_at: session.revoked, email: user.email, role: user.role, status: user.status } : null; }
    if (sql.includes('SELECT social_links_json FROM profiles')) return { social_links_json: state.profile.social_links_json };
    if (sql.includes('SELECT display_name')) return state.profile;
    if (sql.includes('SELECT pl.code')) return { code: 'premium' };
    if (sql.includes('SELECT id, slug FROM listings')) return { id: 'listing_0000001', slug: 'ana-londrina' };
    return null;
  }
  function run(sql, args) {
    if (writeFailure && sql.includes('UPDATE profiles')) throw new Error('D1 unavailable');
    if (sql.includes('INSERT INTO sessions')) state.sessions.set(args[0], { userId: args[1], expires: args[2], revoked: null });
    if (sql.includes('UPDATE sessions')) { const session = state.sessions.get(args[1]); if (session) session.revoked = args[0]; }
    if (sql.includes('UPDATE profiles')) state.profile = { display_name: args[0] ?? state.profile.display_name, bio: args[1] ?? state.profile.bio, phone: args[2] ?? state.profile.phone, website_url: args[3] ?? state.profile.website_url, social_links_json: args[4] };
    return { success: true, meta: { changes: 1 } };
  }
  const ACTS_DB = { prepare(sql) { return { bind(...args) { return { async first() { return result(sql, args); }, async run() { return run(sql, args); }, async all() { return { success: true, results: [], meta: {} }; } }; } }; }, async batch() { return []; } };
  const ACTS_QUEUE = { async send(message) { if (queueFailure) throw new Error('Queue unavailable'); state.sent.push(message); } };
  return { env: { ACTS_DB, ACTS_QUEUE, ENVIRONMENT: 'test' }, state, user };
}

const request = (path, env, options = {}) => worker.fetch(new Request(`${origin}${path}`, options), env);
const mutation = (method, value, cookie) => ({ method, headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(value) });

async function login(setup, password = 'correct horse battery staple', email = setup.user.email) {
  setup.user.password_hash = await hashPassword('correct horse battery staple');
  return request('/api/auth/login', setup.env, mutation('POST', { email, password }));
}

test('password hashing uses salted standard PBKDF2 and verifies without plaintext persistence', async () => {
  const encoded = await hashPassword('correct horse battery staple');
  assert.match(encoded, /^pbkdf2-sha256\$210000\$/); assert.equal(encoded.includes('correct horse'), false);
  assert.equal(await verifyPassword('correct horse battery staple', encoded), true); assert.equal(await verifyPassword('wrong password', encoded), false);
});

test('valid login stores only token hash and emits the secure host cookie', async () => {
  const setup = environment(); const response = await login(setup); const cookie = response.headers.get('set-cookie');
  assert.equal(response.status, 200); assert.match(cookie, /__Host-acts_session=.*; Path=\/; Secure; HttpOnly; SameSite=Lax/);
  const token = extractSessionToken(new Request(origin, { headers: { cookie } })); const [stored] = setup.state.sessions.keys();
  assert.equal(stored.length, 64); assert.equal(stored.includes(token), false); assert.equal(setup.state.sessions.size, 1);
});

test('invalid password, nonexistent user and suspended account share the same denial', async () => {
  const wrong = environment(); const missing = environment(); const suspended = environment(); suspended.user.status = 'suspended';
  const responses = [await login(wrong, 'not the right password'), await login(missing, 'irrelevant password', 'missing@example.test'), await login(suspended)];
  assert.deepEqual(responses.map((item) => item.status), [401, 401, 401]);
  assert.equal(new Set(await Promise.all(responses.map((item) => item.text()))).size, 1);
});

test('session authentication rejects absent, invalid, missing, expired and revoked cookies', async () => {
  const setup = environment(); const db = { first: async (sql, args) => setup.env.ACTS_DB.prepare(sql).bind(...args).first(), write: async (sql, args) => setup.env.ACTS_DB.prepare(sql).bind(...args).run() };
  let now = new Date('2026-08-14T00:00:00Z'); const auth = createSessionAuth({ db, logger, clock: () => now, lifetimeSeconds: 60 }); const made = await auth.create(setup.user.id);
  const valid = new Request(origin, { headers: { cookie: sessionCookie(made.token, 60) } }); assert.equal((await auth.authenticate(valid)).user.id, setup.user.id);
  for (const candidate of [new Request(origin), new Request(origin, { headers: { cookie: sessionCookie('x'.repeat(43), 60) } })]) await assert.rejects(auth.authenticate(candidate), { status: 401 });
  now = new Date('2026-08-14T00:02:00Z'); await assert.rejects(auth.authenticate(valid), { status: 401 });
  now = new Date('2026-08-14T00:00:30Z'); await auth.revoke(valid); await assert.rejects(auth.authenticate(valid), { status: 401 });
});

test('login to own profile update persists first and enqueues canonical profile publication', async () => {
  const setup = environment(); const logged = await login(setup); const cookie = logged.headers.get('set-cookie');
  const me = await request('/api/me', setup.env, { headers: { cookie } }); assert.equal(me.status, 200); assert.equal((await me.json()).plan, 'PREMIUM');
  const response = await request('/api/me/profile', setup.env, mutation('PATCH', { displayName: 'Ana Nova', bio: 'Apresentação pública', instagram: '@ana' }, cookie));
  assert.equal(response.status, 200); assert.equal(setup.state.profile.display_name, 'Ana Nova'); assert.equal(setup.state.sent.length, 1);
  assert.deepEqual(setup.state.sent[0], { type: 'PUBLICATION_REQUESTED', entity: 'profile', id: 'listing_0000001', slug: 'ana-londrina', reason: 'profile.updated', requestedAt: setup.state.sent[0].requestedAt });
});

test('integrated painel route, login, me and allowlisted full profile update succeed', async () => {
  const setup = environment();
  const shell = await request('/painel', setup.env);
  assert.equal(shell.status, 200); assert.match(await shell.text(), /id="login-form"/);
  const logged = await login(setup); const cookie = logged.headers.get('set-cookie');
  assert.equal((await request('/api/me', setup.env, { headers: { cookie } })).status, 200);
  const payload = { displayName: 'Ana Atualizada', bio: 'Nova apresentação', phone: '+554300000000', website: 'https://ana.example', instagram: '@ana', whatsapp: '+5543999999999' };
  assert.deepEqual(Object.keys(payload).sort(), ['bio', 'displayName', 'instagram', 'phone', 'website', 'whatsapp'].sort());
  const updated = await request('/api/me/profile', setup.env, mutation('PATCH', payload, cookie));
  assert.equal(updated.status, 200); assert.equal((await updated.json()).profile.displayName, 'Ana Atualizada');
});

test('expired painel session receives 401 so the browser can return to login', async () => {
  const setup = environment(); const cookie = (await login(setup)).headers.get('set-cookie');
  const stored = [...setup.state.sessions.values()][0]; stored.expires = '2000-01-01T00:00:00.000Z';
  assert.equal((await request('/api/me', setup.env, { headers: { cookie } })).status, 401);
});

test('private reads require auth and profile ownership never comes from client input', async () => {
  const setup = environment(); assert.equal((await request('/api/me', setup.env)).status, 401);
  const cookie = (await login(setup)).headers.get('set-cookie');
  for (const forbidden of [{ userId: 'another-user' }, { profileId: 'other' }, { plan: 'PREMIUM' }, { premium: true }, { role: 'admin' }, { isAdmin: true }, { status: 'active' }]) {
    assert.equal((await request('/api/me/profile', setup.env, mutation('PATCH', forbidden, cookie))).status, 400);
  }
  assert.equal(setup.state.profile.display_name, 'Ana'); assert.equal(setup.state.sent.length, 0);
});

test('logout is idempotent, revokes an existing session and always expires the cookie', async () => {
  const setup = environment(); const cookie = (await login(setup)).headers.get('set-cookie');
  const first = await request('/api/auth/logout', setup.env, { method: 'POST', headers: { origin, cookie } });
  const second = await request('/api/auth/logout', setup.env, { method: 'POST', headers: { origin } });
  assert.equal(first.status, 200); assert.equal(second.status, 200); assert.match(first.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal([...setup.state.sessions.values()][0].revoked !== null, true); assert.equal((await request('/api/me', setup.env, { headers: { cookie } })).status, 401);
});

test('D1 update failure sends nothing; post-commit Queue failure is reported as incomplete', async () => {
  const failedDb = environment({ writeFailure: true }); const dbCookie = (await login(failedDb)).headers.get('set-cookie');
  assert.equal((await request('/api/me/profile', failedDb.env, mutation('PATCH', { bio: 'Novo' }, dbCookie))).status, 500); assert.equal(failedDb.state.sent.length, 0);
  const failedQueue = environment({ queueFailure: true }); const queueCookie = (await login(failedQueue)).headers.get('set-cookie');
  assert.equal((await request('/api/me/profile', failedQueue.env, mutation('PATCH', { bio: 'Salvo' }, queueCookie))).status, 500); assert.equal(failedQueue.state.profile.bio, 'Salvo');
});

test('state-changing private endpoints reject missing and cross-site Origin without CORS', async () => {
  const setup = environment(); setup.user.password_hash = await hashPassword('correct horse battery staple');
  const noOrigin = await request('/api/auth/login', setup.env, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: setup.user.email, password: 'correct horse battery staple' }) });
  const evil = await request('/api/auth/login', setup.env, { ...mutation('POST', { email: setup.user.email, password: 'correct horse battery staple' }), headers: { origin: 'https://evil.test', 'content-type': 'application/json' } });
  assert.equal(noOrigin.status, 403); assert.equal(evil.status, 403); assert.equal(evil.headers.has('access-control-allow-origin'), false);
});
