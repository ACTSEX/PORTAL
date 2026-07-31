import { deepFreeze, isPlainObject } from './helpers.js';

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
const SAFE_REQUEST_HEADERS = new Set(['accept', 'accept-language', 'content-type', 'origin', 'user-agent']);
const SENSITIVE = /token|secret|password|authorization|cookie|sql|binding|stack|\/workspace|api.?key/i;

export class HttpError extends Error {
  constructor(code, message, status = 500, category = 'internal') {
    super(message);
    this.name = 'HttpError'; this.code = code; this.status = status; this.category = category;
  }
}
export class ValidationError extends HttpError { constructor(message = 'Invalid request') { super('VALIDATION_ERROR', message, 400, 'validation'); } }
export class NotFoundError extends HttpError { constructor() { super('NOT_FOUND', 'Resource not found', 404, 'routing'); } }
export class ConflictError extends HttpError { constructor(message = 'Resource conflict') { super('CONFLICT', message, 409, 'conflict'); } }

function safeHeaders(input) {
  const output = {};
  for (const [name, value] of input) if (SAFE_REQUEST_HEADERS.has(name.toLowerCase())) output[name.toLowerCase()] = value;
  return Object.freeze(output);
}

function requestIdFrom(request, id) {
  const supplied = request.headers.get('x-request-id');
  if (supplied && /^[A-Za-z0-9_-]{8,128}$/.test(supplied)) return supplied;
  const generated = id();
  if (typeof generated !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(generated)) throw new TypeError('Invalid request identifier');
  return generated;
}

async function readBody(request, limit) {
  if (['GET', 'HEAD'].includes(request.method)) return null;
  const contentType = request.headers.get('content-type')?.split(';')[0].trim();
  if (!contentType) return null;
  if (contentType !== 'application/json') throw new ValidationError('Unsupported request body');
  const text = await request.text();
  if (encoderLength(text) > limit) throw new ValidationError('Request body is too large');
  if (!text) return null;
  try {
    const value = JSON.parse(text);
    if (!isPlainObject(value) && !Array.isArray(value)) throw new Error();
    return deepFreeze(value);
  } catch { throw new ValidationError('Invalid JSON body'); }
}

function encoderLength(value) { return new TextEncoder().encode(value).byteLength; }

/** Convert a native request into immutable, controlled technical data. */
export async function normalizeRequest(request, options = {}) {
  if (!(request instanceof Request)) throw new TypeError('A native Request is required');
  const { params = {}, auth = null, id = () => crypto.randomUUID().replaceAll('-', ''), bodyLimit = 1_000_000 } = options;
  if (!isPlainObject(params) || typeof id !== 'function' || !Number.isInteger(bodyLimit) || bodyLimit < 1) throw new TypeError('Invalid request options');
  const url = new URL(request.url);
  const query = {};
  for (const key of [...new Set(url.searchParams.keys())].sort()) query[key] = Object.freeze(url.searchParams.getAll(key));
  return deepFreeze({ request, method: request.method.toUpperCase(), url: url.href,
    pathname: url.pathname, query, headers: safeHeaders(request.headers), params: { ...params },
    body: await readBody(request.clone(), bodyLimit), requestId: requestIdFrom(request, id), auth });
}

function responseHeaders(headers, contentType) {
  const output = new Headers(headers);
  if (contentType && !output.has('content-type')) output.set('content-type', contentType);
  output.set('x-content-type-options', 'nosniff');
  output.set('referrer-policy', 'no-referrer');
  output.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  if (!output.has('cache-control')) output.set('cache-control', 'no-store');
  return output;
}

export function json(data, { status = 200, headers, meta = {} } = {}) {
  const body = data?.success === false ? data : { success: true, data, meta, errors: [] };
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(headers, 'application/json; charset=utf-8') });
}
export function html(value, { status = 200, headers } = {}) {
  return new Response(String(value), { status, headers: responseHeaders(headers, 'text/html; charset=utf-8') });
}
export function text(value, { status = 200, headers } = {}) {
  return new Response(String(value), { status, headers: responseHeaders(headers, 'text/plain; charset=utf-8') });
}
export function redirect(location, status = 302) {
  if (![301, 302, 303, 307, 308].includes(status)) throw new RangeError('Invalid redirect status');
  return new Response(null, { status, headers: responseHeaders({ location }, null) });
}
export function empty({ status = 204, headers } = {}) { return new Response(null, { status, headers: responseHeaders(headers, null) }); }

function publicError(error, requestId) {
  const known = error && typeof error.code === 'string' && Number.isInteger(error.status)
    && error.status >= 400 && error.status <= 599;
  const status = known ? error.status : 500;
  const code = known ? error.code : 'INTERNAL_ERROR';
  let message = known && typeof error.message === 'string' ? error.message : 'Internal server error';
  if (SENSITIVE.test(message) || status >= 500) message = status >= 500 ? 'Internal server error' : 'Request rejected';
  return { status, body: { success: false, data: null, meta: {}, errors: [{ code, message, status, requestId }] } };
}

/** Turn an exception into a stable response without internal diagnostic data. */
export function errorResponse(error, requestId = 'unknown') {
  const normalized = publicError(error, requestId);
  return json(normalized.body, { status: normalized.status });
}

function compilePath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || (path.length > 1 && path.endsWith('/'))) throw new TypeError('Invalid route path');
  const names = [];
  const parts = path.split('/').slice(1).map((part) => {
    if (part.startsWith(':')) {
      const name = part.slice(1);
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name) || names.includes(name)) throw new TypeError('Invalid route parameter');
      names.push(name); return '([^/]+)';
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return { names, regex: new RegExp(`^/${parts.join('/')}${path === '/' ? '?' : ''}$`) };
}

function validateDependencies(options) {
  if (!isPlainObject(options) || !options.logger || typeof options.logger.info !== 'function'
    || typeof options.logger.error !== 'function') throw new TypeError('Router requires a valid logger');
  if (options.auth && typeof options.auth.authenticate !== 'function') throw new TypeError('Invalid Router auth');
  if (options.events && typeof options.events.publish !== 'function') throw new TypeError('Invalid Router Event Bus');
}

/** Create an isolated deterministic HTTP router. */
export function createRouter(options) {
  validateDependencies(options);
  const { logger, auth, events, id, bodyLimit } = options;
  const routes = [];

  function register(method, path, handler, routeOptions = {}) {
    const normalizedMethod = String(method).toUpperCase();
    if (!METHODS.has(normalizedMethod)) throw new TypeError('Invalid HTTP method');
    if (typeof handler !== 'function') throw new TypeError('Invalid route handler');
    if (!isPlainObject(routeOptions)) throw new TypeError('Invalid route options');
    if ((routeOptions.auth || routeOptions.permissions) && !auth) throw new TypeError('Protected routes require Auth');
    const compiled = compilePath(path);
    if (routes.some((route) => route.method === normalizedMethod && route.path === path)) throw new ConflictError('Duplicate route');
    const middleware = routeOptions.middleware ?? [];
    if (!Array.isArray(middleware) || middleware.some((item) => typeof item !== 'function')) throw new TypeError('Invalid middleware');
    routes.push(Object.freeze({ method: normalizedMethod, path, handler, middleware: Object.freeze([...middleware]),
      auth: routeOptions.auth ?? false, permissions: routeOptions.permissions, compiled }));
    return router;
  }

  function resolve(method, pathname) {
    const pathMatches = [];
    for (const route of routes) {
      const match = route.compiled.regex.exec(pathname);
      if (match) pathMatches.push({ route, match });
    }
    const selected = pathMatches.find(({ route }) => route.method === method || (method === 'HEAD' && route.method === 'GET'));
    if (!selected) {
      if (pathMatches.length) throw new HttpError('METHOD_NOT_ALLOWED', 'Method not allowed', 405, 'routing');
      throw new NotFoundError();
    }
    const params = Object.fromEntries(selected.route.compiled.names.map((name, index) => {
      try { return [name, decodeURIComponent(selected.match[index + 1])]; } catch { throw new ValidationError('Invalid route parameter'); }
    }));
    return { route: selected.route, params };
  }

  async function dispatch(request) {
    const started = Date.now(); let context;
    try {
      const url = new URL(request.url); const matched = resolve(request.method.toUpperCase(), url.pathname);
      let authContext = null;
      if (matched.route.auth || matched.route.permissions) authContext = await auth.authenticate(request, { required: matched.route.auth !== 'optional' });
      if (matched.route.permissions) auth.authorize(authContext, matched.route.permissions);
      context = await normalizeRequest(request, { params: matched.params, auth: authContext, id, bodyLimit });
      const chain = [...matched.route.middleware, matched.route.handler];
      const invoke = async (index) => chain[index](context, index + 1 < chain.length ? () => invoke(index + 1) : undefined);
      const response = await invoke(0);
      if (!(response instanceof Response)) throw new TypeError('Handler must return a native Response');
      logger.info('Request completed', { requestId: context.requestId, operation: 'router.dispatch', status: response.status, duration: Date.now() - started });
      if (events) await events.publish({ name: 'RequestCompleted', version: '1.0', source: 'core.router', payload: { method: context.method, route: matched.route.path, status: response.status } }, { requestId: context.requestId });
      return response;
    } catch (error) {
      const requestId = context?.requestId ?? 'unknown';
      const normalized = publicError(error, requestId);
      logger.error('Request failed', { requestId, operation: 'router.dispatch', status: normalized.status, code: normalized.body.errors[0].code });
      return errorResponse(error, requestId);
    }
  }

  const router = Object.freeze({ register, resolve, dispatch,
    get: (path, handler, settings) => register('GET', path, handler, settings),
    post: (path, handler, settings) => register('POST', path, handler, settings),
    put: (path, handler, settings) => register('PUT', path, handler, settings),
    patch: (path, handler, settings) => register('PATCH', path, handler, settings),
    delete: (path, handler, settings) => register('DELETE', path, handler, settings),
    options: (path, handler, settings) => register('OPTIONS', path, handler, settings) });
  return router;
}
