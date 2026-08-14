import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../../worker/index.js';
import { createSessionAuth, extractSessionToken, hashPassword, sessionCookie, verifyPassword } from '../../core/auth.js';

const origin = 'https://acompanhantesex.com';
const logger = { debug() {}, info() {}, warn() {}, error() {} };

function environment({ queueFailure = false, writeFailure = false, mediaWriteFailure = false, mediaPutFailure = false } = {}) {
  const state = { sessions: new Map(), sent: [], media: new Map(), objects: new Map(), storageCalls: [], blogger: null, profile: { display_name: 'Ana', bio: 'Original', phone: null, website_url: null, social_links_json: '{}' } };
  const user = { id: 'user-000000000001', email: 'ana@example.test', role: 'professional', status: 'active', password_hash: null };
  function result(sql, args) {
    if (sql.includes('FROM users WHERE email')) return user.email.toLowerCase() === String(args[0]).toLowerCase() ? user : null;
    if (sql.includes('FROM sessions s JOIN users')) { const session = state.sessions.get(args[0]); return session ? { session_id: args[0], user_id: user.id, expires_at: session.expires, revoked_at: session.revoked, email: user.email, role: user.role, status: user.status } : null; }
    if (sql.includes('SELECT user_id FROM profiles')) return { user_id: user.id };
    if (sql.includes('SELECT r2_key, mime_type FROM media')) { const item=state.media.get(args[0]); return item ? { r2_key:item.r2_key, mime_type:item.mime_type } : null; }
    if (sql.includes('SELECT id, r2_key FROM media')) { const item=state.media.get(args[0]); return item?.owner_id===args[1] ? item : null; }
    if (sql.includes('SELECT social_links_json FROM profiles')) return { social_links_json: state.profile.social_links_json };
    if (sql.includes('SELECT display_name')) return state.profile;
    if (sql.includes('SELECT pl.code')) return { code: 'premium' };
    if (sql.includes('FROM blogger_integrations WHERE user_id')) return state.blogger;
    if (sql.includes('SELECT id, slug FROM listings')) return { id: 'listing_0000001', slug: 'ana-londrina' };
    return null;
  }
  function run(sql, args) {
    if (writeFailure && sql.includes('UPDATE profiles')) throw new Error('D1 unavailable');
    if (mediaWriteFailure && sql.includes('INSERT INTO media')) throw new Error('D1 unavailable');
    if (sql.includes('INSERT INTO media')) state.media.set(args[0],{id:args[0],owner_id:args[1],listing_id:args[2],r2_key:args[3],mime_type:args[5],byte_size:args[6],sort_order:args[8]});
    if (sql.includes('DELETE FROM media')) state.media.delete(args[0]);
    if (sql.includes('INSERT INTO blogger_integrations')) state.blogger={url:args[1],status:'pending',last_synced_at:null,last_error_code:null};
    if (sql.includes('DELETE FROM blogger_integrations')) state.blogger=null;
    if (sql.includes('INSERT INTO sessions')) state.sessions.set(args[0], { userId: args[1], expires: args[2], revoked: null });
    if (sql.includes('UPDATE sessions')) { const session = state.sessions.get(args[1]); if (session) session.revoked = args[0]; }
    if (sql.includes('UPDATE profiles')) state.profile = { display_name: args[0] ?? state.profile.display_name, bio: args[1] ?? state.profile.bio, phone: args[2] ?? state.profile.phone, website_url: args[3] ?? state.profile.website_url, social_links_json: args[4] };
    return { success: true, meta: { changes: 1 } };
  }
  const ACTS_DB = { prepare(sql) { return { bind(...args) { return { async first() { return result(sql, args); }, async run() { return run(sql, args); }, async all() { const results=sql.includes('FROM media WHERE owner_id')?[...state.media.values()].filter(item=>item.owner_id===args[0]):[]; return { success: true, results, meta: {} }; } }; } }; }, async batch() { return []; } };
  const ACTS_QUEUE = { async send(message) { if (queueFailure) throw new Error('Queue unavailable'); state.sent.push(message); } };
  const ACTS_MEDIA={async put(key,value,options){state.storageCalls.push({operation:'put',key,value,options});if(mediaPutFailure)throw new Error('R2 unavailable');state.objects.set(key,{key,size:value.byteLength,httpMetadata:options.httpMetadata,customMetadata:options.customMetadata,body:value,etag:'etag'});return state.objects.get(key)},async get(key){return state.objects.get(key)||null},async head(key){return state.objects.get(key)||null},async delete(key){state.storageCalls.push({operation:'delete',key});state.objects.delete(key)}};
  return { env: { ACTS_DB, ACTS_QUEUE, ACTS_MEDIA, ENVIRONMENT: 'test' }, state, user };
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

test('PREMIUM owner configures and removes Blogger through the private allowlisted endpoint',async()=>{const setup=environment();const cookie=(await login(setup)).headers.get('set-cookie');const saved=await request('/api/me/blogger',setup.env,mutation('PATCH',{url:'https://demo.blogspot.com/'},cookie));assert.equal(saved.status,200);assert.equal(setup.state.blogger.url,'https://demo.blogspot.com');assert.equal(setup.state.sent.at(-1).reason,'blogger.updated');assert.deepEqual((await saved.json()).blogger,{url:'https://demo.blogspot.com',status:'pending',lastSyncAt:null,syncError:false});assert.equal((await request('/api/me/blogger',setup.env,mutation('PATCH',{url:null,extra:true},cookie))).status,400);assert.equal((await request('/api/me/blogger',setup.env,mutation('PATCH',{url:null},cookie))).status,200);assert.equal(setup.state.blogger,null)});

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

test('authenticated image upload validates, persists, lists, serves, publishes and deletes owned media', async () => {
  const setup=environment();const cookie=(await login(setup)).headers.get('set-cookie');const data=new FormData();data.append('file',new File([new Uint8Array([0xff,0xd8,0xff,1])],'ignored.jpg',{type:'image/jpeg'}));
  const uploaded=await request('/api/me/media',setup.env,{method:'POST',headers:{origin,cookie},body:data});assert.equal(uploaded.status,201);const saved=(await uploaded.json()).media;
  assert.match(setup.state.storageCalls[0].key,/^profiles\/user-000000000001\/media\/[0-9a-f-]+\.jpg$/);assert.equal(setup.state.storageCalls[0].options.httpMetadata.contentType,'image/jpeg');assert.equal(setup.state.sent.at(-1).reason,'media.updated');
  setup.state.media.set('med_11111111-1111-4111-8111-111111111111',{id:'med_11111111-1111-4111-8111-111111111111',owner_id:'other-user',r2_key:'profiles/other/media/x.jpg',mime_type:'image/jpeg',byte_size:3,sort_order:0});
  const listed=await request('/api/me/media',setup.env,{headers:{cookie}});assert.deepEqual((await listed.json()).media,[saved]);assert.equal((await request('/api/me/media/med_11111111-1111-4111-8111-111111111111',setup.env,{method:'DELETE',headers:{origin,cookie}})).status,404);
  const publicImage=await request(saved.url,setup.env);assert.equal(publicImage.status,200);assert.equal(publicImage.headers.get('x-content-type-options'),'nosniff');assert.match(publicImage.headers.get('cache-control'),/immutable/);
  const removed=await request('/api/me/media/'+saved.id,setup.env,{method:'DELETE',headers:{origin,cookie}});assert.equal(removed.status,200);assert.equal(setup.state.media.has(saved.id),false);assert.equal(setup.state.media.size,1);assert.equal(setup.state.sent.at(-1).reason,'media.updated');
});

test('media upload rejects invalid bytes and compensates D1 failure without Queue publication', async()=>{
  const invalid=environment();const invalidCookie=(await login(invalid)).headers.get('set-cookie');const fake=new FormData();fake.append('file',new File([new Uint8Array([1,2,3])],'fake.jpg',{type:'image/jpeg'}));assert.equal((await request('/api/me/media',invalid.env,{method:'POST',headers:{origin,cookie:invalidCookie},body:fake})).status,400);assert.equal(invalid.state.storageCalls.length,0);
  const failed=environment({mediaWriteFailure:true});const cookie=(await login(failed)).headers.get('set-cookie');const valid=new FormData();valid.append('file',new File([new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])],'x.png',{type:'image/png'}));assert.equal((await request('/api/me/media',failed.env,{method:'POST',headers:{origin,cookie},body:valid})).status,500);assert.deepEqual(failed.state.storageCalls.map(x=>x.operation),['put','delete']);assert.equal(failed.state.sent.length,0);
});

test('state-changing private endpoints reject missing and cross-site Origin without CORS', async () => {
  const setup = environment(); setup.user.password_hash = await hashPassword('correct horse battery staple');
  const noOrigin = await request('/api/auth/login', setup.env, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: setup.user.email, password: 'correct horse battery staple' }) });
  const evil = await request('/api/auth/login', setup.env, { ...mutation('POST', { email: setup.user.email, password: 'correct horse battery staple' }), headers: { origin: 'https://evil.test', 'content-type': 'application/json' } });
  assert.equal(noOrigin.status, 403); assert.equal(evil.status, 403); assert.equal(evil.headers.has('access-control-allow-origin'), false);
});

test('private APIs are no-store and login rejects authority fields from the browser', async () => {
  const setup = environment();
  const rejected = await request('/api/auth/login', setup.env, mutation('POST', { email: setup.user.email, password: 'correct horse battery staple', role: 'admin' }));
  assert.equal(rejected.status, 400); assert.equal(rejected.headers.get('cache-control'), 'no-store');
  assert.equal(rejected.headers.has('access-control-allow-origin'), false);
  const logged = await login(setup); const cookie = logged.headers.get('set-cookie');
  for (const path of ['/api/me', '/api/me/billing']) {
    const response = await request(path, setup.env, { headers: { cookie } });
    assert.equal(response.headers.get('cache-control'), 'no-store', path);
  }
});

test('Asaas webhook is public but fails closed on authentication and malformed payloads', async () => {
  const setup = environment(); setup.env.ASAAS_WEBHOOK_TOKEN = 'webhook-runtime-secret'; setup.env.ASAAS_API_KEY = 'api-runtime-secret'; setup.env.ASAAS_BASE_URL = 'https://sandbox.asaas.com';
  const missing = await request('/api/webhooks/asaas', setup.env, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  const invalid = await request('/api/webhooks/asaas', setup.env, { method: 'POST', headers: { 'content-type': 'application/json', 'asaas-access-token': 'wrong-secret' }, body: '{}' });
  const malformed = await request('/api/webhooks/asaas', setup.env, { method: 'POST', headers: { 'content-type': 'application/json', 'asaas-access-token': 'webhook-runtime-secret' }, body: '{' });
  assert.deepEqual([missing.status, invalid.status, malformed.status], [401, 401, 400]);
  assert.equal(missing.headers.has('access-control-allow-origin'), false);
});
