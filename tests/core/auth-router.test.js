import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createAuth, createSecureId, timingSafeEqual, AuthError, AuthorizationError,
  extractCredential } from '../../core/auth.js';
import { validateOrigin } from '../../core/auth.js';
import { createRouter, normalizeRequest, json, html, text, redirect, empty, errorResponse,
  ValidationError, NotFoundError, ConflictError } from '../../core/router.js';

const instant = new Date('2026-07-31T12:00:00.000Z');
const secret = 'a-secure-test-secret-with-at-least-32-characters';
function logger() {
  const records = [];
  return { records, debug() {}, info(message, context) { records.push({ message, context }); },
    warn(message, context) { records.push({ message, context }); },
    error(message, context) { records.push({ message, context }); } };
}
function fixture() {
  const log = logger();
  return { log, auth: createAuth({ logger: log, secret, clock: () => instant }) };
}
async function tokenRequest(auth, identity = { id: 'technical-id', permissions: ['core.read'] }, url = 'https://portal.test/') {
  const token = await auth.issue(identity);
  return new Request(url, { headers: { authorization: `Bearer ${token}` } });
}

test('valid credential creates an immutable authenticated context without exposing credential', async () => {
  const { auth } = fixture();
  const request = await tokenRequest(auth);
  const context = await auth.authenticate(request);
  assert.deepEqual(context.identity.permissions, ['core.read']);
  assert.equal(context.authenticated, true);
  assert.equal(Object.isFrozen(context.identity), true);
  assert.equal(JSON.stringify(context).includes('Bearer'), false);
});

test('missing, malformed, invalid and expired credentials fail with stable errors', async () => {
  const { auth } = fixture();
  await assert.rejects(auth.authenticate(new Request('https://portal.test')), { code: 'AUTHENTICATION_REQUIRED', status: 401 });
  assert.throws(() => extractCredential(new Request('https://portal.test', { headers: { authorization: 'Basic abc' } })), AuthError);
  await assert.rejects(auth.authenticate(new Request('https://portal.test', { headers: { authorization: 'Bearer bad.value' } })), { code: 'INVALID_CREDENTIAL' });
  const short = await auth.issue({ id: 'id', permissions: [] }, 1);
  const later = createAuth({ logger: logger(), secret, clock: () => new Date(instant.getTime() + 2000) });
  await assert.rejects(later.authenticate(new Request('https://portal.test', { headers: { authorization: `Bearer ${short}` } })), { code: 'CREDENTIAL_EXPIRED' });
});

test('optional authentication accepts absence but rejects an invalid supplied credential', async () => {
  const { auth } = fixture();
  assert.deepEqual(await auth.optional(new Request('https://portal.test')), { authenticated: false, identity: null });
  await assert.rejects(auth.optional(new Request('https://portal.test', { headers: { authorization: 'Bearer broken.token' } })), AuthError);
});

test('session cookie extraction is exact and protects all other cookies', () => {
  const request = new Request('https://portal.test', { headers: { cookie: 'theme=dark; __Host-acts_session=value.signature; private=secret' } });
  assert.deepEqual(extractCredential(request), { scheme: 'session', value: 'value.signature' });
  assert.equal(JSON.stringify(extractCredential(request)).includes('private'), false);
  assert.throws(() => extractCredential(new Request('https://portal.test', { headers: { cookie: '__Host-acts_session=a; __Host-acts_session=b' } })), AuthError);
});

test('origin validation requires an explicit HTTPS allowlist and handles optional absence', () => {
  const allowed = ['https://portal.test'];
  assert.equal(validateOrigin(new Request('https://api.test', { headers: { origin: allowed[0] } }), allowed), true);
  assert.equal(validateOrigin(new Request('https://api.test'), allowed, { optional: true }), false);
  assert.throws(() => validateOrigin(new Request('https://api.test', { headers: { origin: 'http://portal.test' } }), allowed), { code: 'INVALID_ORIGIN' });
  assert.throws(() => validateOrigin(new Request('https://api.test', { headers: { origin: 'https://evil.test' } }), allowed), { status: 403 });
});

test('authorization denies by default and supports all or any generic permissions', async () => {
  const { auth } = fixture();
  const context = await auth.authenticate(await tokenRequest(auth, { id: 'id', permissions: ['core.read', 'core.write'] }));
  assert.equal(auth.authorize(context, ['core.read']), true);
  assert.equal(auth.authorize(context, ['missing', 'core.write'], { all: false }), true);
  assert.throws(() => auth.authorize(context, ['core.read', 'missing']), AuthorizationError);
  assert.throws(() => auth.authorize(context, []), AuthorizationError);
  assert.throws(() => auth.authorize(null, ['core.read']), AuthorizationError);
  assert.throws(() => auth.authorize(context, ['payments.approve']), AuthorizationError);
});

test('signed tokens reject tampering, malformed identity, excessive lifetime and weak secrets', async () => {
  const { auth } = fixture();
  const token = await auth.issue({ id: 'id', permissions: [] });
  const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
  await assert.rejects(auth.validate({ value: tampered }), AuthError);
  await assert.rejects(auth.issue({ id: '', permissions: [] }), AuthError);
  await assert.rejects(auth.issue({ id: 'id', permissions: ['BAD permission'] }), TypeError);
  await assert.rejects(auth.issue({ id: 'id', permissions: [] }, 3601), TypeError);
  assert.throws(() => createAuth({ logger: logger(), secret: 'weak' }), TypeError);
});

test('secure identifiers use injected Web Crypto entropy and byte comparison is deterministic', () => {
  const cryptoApi = { getRandomValues(bytes) { bytes.fill(7); return bytes; } };
  const identifier = createSecureId('req', cryptoApi);
  assert.match(identifier, /^req_[A-Za-z0-9_-]{24}$/);
  assert.equal(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2])), true);
  assert.equal(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3])), false);
  assert.equal(timingSafeEqual(new Uint8Array([1]), new Uint8Array([1, 0])), false);
});

test('authentication logs contain outcomes only, never credentials, cookies or identities', async () => {
  const { auth, log } = fixture();
  const request = await tokenRequest(auth, { id: 'private-identity', permissions: ['core.read'] });
  const credential = request.headers.get('authorization');
  await auth.authenticate(request);
  const serialized = JSON.stringify(log.records);
  assert.equal(serialized.includes(credential), false);
  assert.equal(serialized.includes('private-identity'), false);
  assert.equal(serialized.includes('cookie'), false);
});

test('request normalization controls method, URL, query, headers, body, id and auth without mutation', async () => {
  const request = new Request('https://portal.test/items?q=b&q=a', { method: 'POST', headers: {
    'content-type': 'application/json', authorization: 'Bearer secret', cookie: 'private=yes', 'x-request-id': 'request_1234', 'x-private': 'hidden',
  }, body: JSON.stringify({ value: 1 }) });
  const auth = Object.freeze({ authenticated: true, identity: Object.freeze({ id: 'id' }) });
  const normalized = await normalizeRequest(request, { params: { item: 'one' }, auth });
  assert.equal(normalized.method, 'POST'); assert.equal(normalized.pathname, '/items');
  assert.deepEqual(normalized.query.q, ['b', 'a']); assert.equal(normalized.requestId, 'request_1234');
  assert.equal(normalized.headers.authorization, undefined); assert.equal(normalized.headers.cookie, undefined);
  assert.deepEqual(normalized.params, { item: 'one' }); assert.deepEqual(normalized.body, { value: 1 });
  assert.equal(normalized.auth, auth); assert.equal(await request.json().then((body) => body.value), 1);
  assert.equal(Object.isFrozen(normalized), true);
});

test('request normalization rejects invalid JSON, unsupported bodies and oversized input', async () => {
  await assert.rejects(normalizeRequest(new Request('https://portal.test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })), ValidationError);
  await assert.rejects(normalizeRequest(new Request('https://portal.test', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' })), ValidationError);
  await assert.rejects(normalizeRequest(new Request('https://portal.test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"long":true}' }), { bodyLimit: 2 }), ValidationError);
});

test('response builders produce native, secured JSON, HTML, text, redirect and empty responses', async () => {
  const responses = [json({ ok: true }), html('<h1>safe</h1>'), text('safe'), redirect('/next', 303), empty()];
  assert.equal(responses.every((response) => response instanceof Response), true);
  assert.deepEqual(await responses[0].json(), { success: true, data: { ok: true }, meta: {}, errors: [] });
  assert.match(responses[1].headers.get('content-type'), /text\/html/);
  assert.match(responses[2].headers.get('content-type'), /text\/plain/);
  assert.equal(responses[3].headers.get('location'), '/next'); assert.equal(responses[3].status, 303);
  assert.equal(responses[4].status, 204); assert.equal(await responses[4].text(), '');
  for (const response of responses) assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.throws(() => redirect('/bad', 200), RangeError);
});

test('error responses cover public classes and erase stacks, SQL, secrets and internal paths', async () => {
  const cases = [new ValidationError(), new AuthError(), new AuthorizationError(), new NotFoundError(), new ConflictError(),
    Object.assign(new Error('SQL token=secret /workspace/private'), { stack: 'private stack' })];
  const statuses = [400, 401, 403, 404, 409, 500];
  for (let index = 0; index < cases.length; index += 1) {
    const response = errorResponse(cases[index], 'request_safe'); const body = await response.json();
    assert.equal(response.status, statuses[index]); assert.equal(body.success, false);
    assert.equal(body.errors[0].requestId, 'request_safe');
    assert.doesNotMatch(JSON.stringify(body), /SQL|secret|workspace|stack|binding/i);
  }
});

test('router registration, deterministic resolution, dynamic parameters and methods work', () => {
  const router = createRouter({ logger: logger() }); const handler = () => text('ok');
  assert.equal(router.get('/items/:itemId', handler), router);
  router.post('/items', handler);
  const resolved = router.resolve('GET', '/items/a%20b');
  assert.equal(resolved.route.path, '/items/:itemId'); assert.deepEqual(resolved.params, { itemId: 'a b' });
  assert.throws(() => router.resolve('DELETE', '/items'), (error) => error.status === 405);
  assert.throws(() => router.resolve('GET', '/missing'), NotFoundError);
  assert.throws(() => router.get('/items/:itemId', handler), ConflictError);
  assert.throws(() => router.get('/invalid/', handler), TypeError);
  assert.throws(() => router.get('/invalid', null), TypeError);
  assert.throws(() => createRouter({ logger: logger() }).get('/protected', handler, { auth: true }), TypeError);
});

test('middleware executes in order and the handler receives normalized route context', async () => {
  const order = []; const router = createRouter({ logger: logger(), id: () => 'generated_request' });
  router.post('/items/:id', (context) => { order.push(`handler:${context.params.id}:${context.body.name}`); return json(context.params); }, {
    middleware: [async (context, next) => { order.push(`before:${context.requestId}`); const response = await next(); order.push('after'); return response; }],
  });
  const response = await router.dispatch(new Request('https://portal.test/items/42', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"name":"test"}' }));
  assert.equal(response.status, 200); assert.deepEqual(order, ['before:generated_request', 'handler:42:test', 'after']);
});

test('router integrates Auth before handler and passes authenticated context', async () => {
  const { auth } = fixture(); let received; let calls = 0;
  const router = createRouter({ logger: logger(), auth, id: () => 'authenticated_request' });
  router.get('/protected', (context) => { calls += 1; received = context.auth; return text('allowed'); }, { auth: true, permissions: ['core.read'] });
  const allowed = await router.dispatch(await tokenRequest(auth, { id: 'id', permissions: ['core.read'] }, 'https://portal.test/protected'));
  assert.equal(allowed.status, 200); assert.equal(received.identity.id, 'id');
  const denied = await router.dispatch(await tokenRequest(auth, { id: 'id', permissions: [] }, 'https://portal.test/protected'));
  assert.equal(denied.status, 403); assert.equal(calls, 1);
  assert.equal((await denied.json()).errors[0].code, 'FORBIDDEN');
});

test('router returns safe routing and handler failures and logs only technical context', async () => {
  const log = logger(); const router = createRouter({ logger: log, id: () => 'failure_request' });
  router.get('/failure', () => { throw new Error('token=private SQL SELECT stack /workspace/path'); });
  assert.equal((await router.dispatch(new Request('https://portal.test/missing'))).status, 404);
  const failed = await router.dispatch(new Request('https://portal.test/failure'));
  assert.equal(failed.status, 500); assert.doesNotMatch(await failed.text(), /private|SQL|SELECT|stack|workspace/);
  assert.doesNotMatch(JSON.stringify(log.records), /private|SELECT|workspace/);
});

test('router rejects non-Response handlers and publishes safe completion events', async () => {
  const published = []; const events = { async publish(event, context) { published.push({ event, context }); } };
  const router = createRouter({ logger: logger(), events, id: () => 'event_request' });
  router.get('/bad', () => ({ nope: true })); router.get('/good', () => text('ok'));
  assert.equal((await router.dispatch(new Request('https://portal.test/bad'))).status, 500);
  assert.equal((await router.dispatch(new Request('https://portal.test/good'))).status, 200);
  assert.equal(published.length, 1); assert.equal(published[0].event.name, 'RequestCompleted');
  assert.equal(published[0].context.requestId, 'event_request');
});

test('Lote 4 source has no environment, persistence, domain imports or sensitive logging', async () => {
  const [authSource, routerSource] = await Promise.all([
    readFile(new URL('../../core/auth.js', import.meta.url), 'utf8'),
    readFile(new URL('../../core/router.js', import.meta.url), 'utf8'),
  ]);
  const source = `${authSource}\n${routerSource}`;
  assert.doesNotMatch(source, /process\.env|from ['"].*(?:modules|gateways)|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE FROM\b/i);
  assert.doesNotMatch(source, /logger\.(?:info|warn|error)\([^\n]*(?:credential|authorization|cookie|secret)/i);
});
