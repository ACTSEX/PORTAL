/** Return true only for records whose prototype is Object or null. */
export function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Recursively freeze arrays and plain records without mutating host objects. */
export function deepFreeze(value, seen = new WeakSet()) {
  if ((!Array.isArray(value) && !isPlainObject(value)) || seen.has(value)) {
    return value;
  }

  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}


export const ENVIRONMENTS = deepFreeze([
  'development',
  'staging',
  'production',
  'test',
]);

const REQUIRED_BINDINGS = deepFreeze({
  ACTS_DB: ['prepare'],
  ACTS_DATA: ['get', 'put'],
  ACTS_MEDIA: ['get', 'put'],
  ACTS_QUEUE: ['send'],
});

const DEFAULTS = deepFreeze({
  environment: 'development',
  service: 'acts-portal',
  version: '0.1.0',
  locale: 'pt-BR',
  timezone: 'UTC',
  logLevel: 'info',
  features: {},
  publication: { aggregationWindowMs: 1_000, maximumWaitMs: 10_000, submissionDailyLimit: 5, maximumBatchOperations: 50, maximumBatchBytes: 262_144 },
});

const LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal']);

function text(value, fallback, name) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') throw new TypeError(`Invalid configuration: ${name}`);
  return value.trim();
}

function normalizeEnvironment(value) {
  const environment = text(value, DEFAULTS.environment, 'environment').toLowerCase();
  if (!ENVIRONMENTS.includes(environment)) {
    throw new RangeError('Invalid configuration: unsupported environment');
  }
  return environment;
}

function normalizeBoolean(value, name) {
  if (value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && (value === 0 || value === 1)) return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
  }
  throw new TypeError(`Invalid configuration: feature flag ${name}`);
}

function normalizeFeatures(value) {
  if (value === undefined) return {};
  if (!isPlainObject(value)) throw new TypeError('Invalid configuration: features');
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([name, enabled]) => [name, normalizeBoolean(enabled, name)]),
  );
}

function validateBindings(environment) {
  const bindings = {};
  for (const [name, methods] of Object.entries(REQUIRED_BINDINGS)) {
    const binding = environment[name];
    if (!binding || methods.some((method) => typeof binding[method] !== 'function')) {
      throw new TypeError(`Invalid configuration: binding ${name}`);
    }
    bindings[name] = binding;
  }
  return Object.freeze(bindings);
}

/**
 * Build an immutable technical configuration from a Cloudflare environment.
 * Raw bindings remain isolated from the safe, serializable public view.
 */
export function createConfig(environment) {
  if (!isPlainObject(environment)) {
    throw new TypeError('Invalid configuration: environment object required');
  }

  const runtime = normalizeEnvironment(environment.ENVIRONMENT);
  const logLevel = text(environment.LOG_LEVEL, DEFAULTS.logLevel, 'log level').toLowerCase();
  if (!LOG_LEVELS.has(logLevel)) throw new RangeError('Invalid configuration: log level');

  const publicConfig = deepFreeze({
    environment: runtime,
    service: text(environment.SERVICE_NAME, DEFAULTS.service, 'service'),
    version: text(environment.APP_VERSION, DEFAULTS.version, 'version'),
    locale: text(environment.LOCALE, DEFAULTS.locale, 'locale'),
    timezone: text(environment.TIMEZONE, DEFAULTS.timezone, 'timezone'),
    logLevel,
    features: normalizeFeatures(environment.FEATURE_FLAGS),
    publication: {
      aggregationWindowMs: positiveInteger(environment.PUBLICATION_AGGREGATION_MS, DEFAULTS.publication.aggregationWindowMs, 'publication aggregation'),
      maximumWaitMs: positiveInteger(environment.PUBLICATION_MAX_WAIT_MS, DEFAULTS.publication.maximumWaitMs, 'publication maximum wait'),
      submissionDailyLimit: positiveInteger(environment.SUBMISSION_DAILY_LIMIT, DEFAULTS.publication.submissionDailyLimit, 'submission daily limit'),
      maximumBatchOperations: positiveInteger(environment.SUBMISSION_MAX_OPERATIONS, DEFAULTS.publication.maximumBatchOperations, 'submission operations'),
      maximumBatchBytes: positiveInteger(environment.SUBMISSION_MAX_BYTES, DEFAULTS.publication.maximumBatchBytes, 'submission bytes'),
    },
  });

  return Object.freeze({ public: publicConfig, bindings: validateBindings(environment) });
}

function positiveInteger(value, fallback, name) {
  const output = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(output) || output <= 0) throw new TypeError(`Invalid configuration: ${name}`);
  return output;
}
