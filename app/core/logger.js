import { deepFreeze, isPlainObject } from './helpers.js';

export const LOG_LEVELS = deepFreeze(['debug', 'info', 'warn', 'error', 'fatal']);
const PRIORITY = Object.freeze(Object.fromEntries(LOG_LEVELS.map((level, index) => [level, index])));
const REDACTED = '[REDACTED]';
const CIRCULAR = '[Circular]';
const SENSITIVE_KEY = /(?:password|passwd|pwd|token|authorization|cookie|session|secret|api.?key|private.?key|document|cpf|cnpj|credit.?card|card.?number|cvv|financial|webhook.?payload)/i;
const CONTEXT_KEYS = new Set([
  'requestId', 'correlationId', 'eventId', 'operation', 'module', 'duration', 'status',
]);

function redactText(value) {
  return value
    .replace(/\bBearer\s+[^\s,;]+/gi, `Bearer ${REDACTED}`)
    .replace(/\b(password|token|secret|api.?key|authorization|cookie)=([^\s,;]+)/gi,
      (_, key) => `${key}=${REDACTED}`);
}

function safeValue(value, seen) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') return redactText(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'bigint') return value.toString();
  if (['undefined', 'function', 'symbol'].includes(typeof value)) return String(value);
  if (value instanceof Error) return normalizeError(value, seen);
  if (seen.has(value)) return CIRCULAR;
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => safeValue(item, seen));
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY.test(key) ? REDACTED : safeValue(child, seen);
  }
  return output;
}

function normalizeError(error, seen = new WeakSet()) {
  const output = {
    name: typeof error.name === 'string' ? error.name : 'Error',
    message: typeof error.message === 'string' ? redactText(error.message) : 'Unexpected error',
  };
  if (typeof error.code === 'string' || typeof error.code === 'number') output.code = error.code;
  if ('cause' in error && error.cause !== undefined) output.cause = safeValue(error.cause, seen);
  return output;
}

function normalizeContext(context) {
  if (context === undefined) return {};
  if (!isPlainObject(context)) throw new TypeError('Logger context must be a plain object');
  const sanitized = safeValue(context, new WeakSet());
  const output = {};
  for (const key of CONTEXT_KEYS) {
    if (sanitized[key] !== undefined) output[key] = sanitized[key];
  }
  const details = Object.fromEntries(
    Object.entries(sanitized).filter(([key]) => !CONTEXT_KEYS.has(key)),
  );
  if (Object.keys(details).length > 0) output.context = details;
  return output;
}

function validateOptions(options) {
  if (!isPlainObject(options)) throw new TypeError('Logger options must be a plain object');
  const { config, sink, clock = () => new Date() } = options;
  if (!isPlainObject(config)) throw new TypeError('Logger public configuration is required');
  if (!LOG_LEVELS.includes(config.logLevel)) throw new RangeError('Invalid logger level');
  if (typeof sink !== 'function') throw new TypeError('Logger sink must be a function');
  if (typeof clock !== 'function') throw new TypeError('Logger clock must be a function');
  return { config, sink, clock };
}

/** Create an isolated structured logger with an explicitly injected output. */
export function createLogger(options) {
  const { config, sink, clock } = validateOptions(options);

  function write(level, message, context) {
    if (PRIORITY[level] < PRIORITY[config.logLevel]) return undefined;
    if (typeof message !== 'string' || message.trim() === '') {
      throw new TypeError('Logger message must be a non-empty string');
    }
    const instant = clock();
    if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
      throw new TypeError('Logger clock must return a valid Date');
    }
    const record = deepFreeze({
      timestamp: instant.toISOString(),
      level,
      message: message.trim(),
      environment: config.environment,
      service: config.service,
      version: config.version,
      ...normalizeContext(context),
    });
    sink(record, JSON.stringify(record));
    return record;
  }

  return Object.freeze(Object.fromEntries(LOG_LEVELS.map((level) => [
    level,
    (message, context) => write(level, message, context),
  ])));
}
