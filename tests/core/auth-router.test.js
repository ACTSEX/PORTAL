import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthError } from '../../core/auth.js';
import { createRouter, normalizeRequest, json, html, text, redirect, empty, errorResponse,
  ValidationError, NotFoundError, ConflictError } from '../../core/router.js';


function logger() { const records = []; return { records, debug() {}, info(...args) { records.push(args); }, warn(...args) { records.push(args); }, error(...args) { records.push(args); } }; }

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
  const cases = [new ValidationError(), new AuthError(), new NotFoundError(), new ConflictError(),
    Object.assign(new Error('SQL token=secret /workspace/private'), { stack: 'private stack' })];
  const statuses = [400, 401, 404, 409, 500];
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
