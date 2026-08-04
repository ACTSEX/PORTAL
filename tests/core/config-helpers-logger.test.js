import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createConfig, ENVIRONMENTS } from '../../app/core/config.js';
import { deepFreeze, isPlainObject } from '../../app/core/helpers.js';
import { createLogger, LOG_LEVELS } from '../../app/core/logger.js';

function binding(...methods) {
  return Object.fromEntries(methods.map((method) => [method, () => undefined]));
}

function environment(overrides = {}) {
  return {
    ENVIRONMENT: 'test',
    ACTS_DB: binding('prepare'),
    ACTS_KV: binding('get', 'put'),
    ACTS_FILES: binding('get', 'put'),
    ACTS_QUEUE: binding('send'),
    ...overrides,
  };
}

const NOW = new Date('2026-07-31T12:00:00.000Z');

function logger(overrides = {}) {
  const output = [];
  const config = createConfig(environment(overrides)).public;
  return {
    output,
    instance: createLogger({ config, sink: (record) => output.push(record), clock: () => NOW }),
  };
}

test('config accepts every authorized environment', () => {
  for (const name of ENVIRONMENTS) {
    assert.equal(createConfig(environment({ ENVIRONMENT: name.toUpperCase() })).public.environment, name);
  }
});

test('config rejects unsupported environments with a safe error', () => {
  assert.throws(() => createConfig(environment({ ENVIRONMENT: 'preview' })), {
    name: 'RangeError', message: 'Invalid configuration: unsupported environment',
  });
});

test('config validates all required bindings', () => {
  const config = createConfig(environment());
  assert.deepEqual(Object.keys(config.bindings).sort(), ['ACTS_DB', 'ACTS_FILES', 'ACTS_KV', 'ACTS_QUEUE']);
});

test('config rejects each absent or malformed binding without printing its value', () => {
  for (const name of ['ACTS_DB', 'ACTS_KV', 'ACTS_FILES', 'ACTS_QUEUE']) {
    assert.throws(() => createConfig(environment({ [name]: undefined })), new RegExp(`binding ${name}$`));
    assert.throws(() => createConfig(environment({ [name]: { credential: 'not-for-output' } })),
      (error) => !error.message.includes('not-for-output'));
  }
});

test('config applies documented technical defaults', () => {
  const config = createConfig(environment({ ENVIRONMENT: undefined })).public;
  assert.deepEqual(config, {
    environment: 'development', service: 'acts-portal', version: '0.1.0',
    locale: 'pt-BR', timezone: 'UTC', logLevel: 'info', features: {},
    publication: { aggregationWindowMs: 1000, maximumWaitMs: 10000, submissionDailyLimit: 5,
      maximumBatchOperations: 50, maximumBatchBytes: 262144 },
  });
});

test('config normalizes feature flags deterministically', () => {
  const features = createConfig(environment({
    FEATURE_FLAGS: { zeta: 'OFF', alpha: 'yes', beta: 1, gamma: 0 },
  })).public.features;
  assert.deepEqual(features, { alpha: true, beta: true, gamma: false, zeta: false });
});

test('config rejects invalid feature flags', () => {
  assert.throws(() => createConfig(environment({ FEATURE_FLAGS: { unsafe: 'perhaps' } })),
    /feature flag unsafe/);
  assert.throws(() => createConfig(environment({ FEATURE_FLAGS: [] })), /features/);
});

test('config public view and containers are read-only', () => {
  const config = createConfig(environment({ FEATURE_FLAGS: { search: true } }));
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.public));
  assert.ok(Object.isFrozen(config.public.features));
  assert.throws(() => { config.public.features.search = false; }, TypeError);
});

test('config public view never exposes unrelated environment values or bindings', () => {
  const config = createConfig(environment({ API_SECRET: 'sensitive-example' }));
  const serialized = JSON.stringify(config.public);
  assert.equal(serialized.includes('sensitive-example'), false);
  assert.equal(serialized.includes('ACTS_DB'), false);
});

test('config source is independent from process.env', async () => {
  const source = await readFile(new URL('../../app/core/config.js', import.meta.url), 'utf8');
  assert.equal(source.includes('process.env'), false);
});

test('isPlainObject accepts records and rejects arrays and host values', () => {
  assert.equal(isPlainObject({}), true);
  assert.equal(isPlainObject(Object.create(null)), true);
  for (const value of [null, [], new Date(), 'record']) assert.equal(isPlainObject(value), false);
});

test('deepFreeze recursively freezes records and arrays without cloning', () => {
  const input = { nested: [{ enabled: true }] };
  assert.equal(deepFreeze(input), input);
  assert.ok(Object.isFrozen(input.nested));
  assert.ok(Object.isFrozen(input.nested[0]));
  assert.throws(() => { input.nested[0].enabled = false; }, TypeError);
});

test('deepFreeze is deterministic and handles circular structures', () => {
  const input = {};
  input.self = input;
  assert.equal(deepFreeze(input), input);
  assert.equal(deepFreeze(input), input);
  assert.ok(Object.isFrozen(input));
});

test('deepFreeze leaves non-plain runtime bindings untouched', () => {
  const date = new Date();
  assert.equal(deepFreeze(date), date);
  assert.equal(Object.isFrozen(date), false);
});

test('logger implements all authorized levels', () => {
  const { instance, output } = logger({ LOG_LEVEL: 'debug' });
  for (const level of LOG_LEVELS) instance[level](`${level} message`);
  assert.deepEqual(output.map((entry) => entry.level), LOG_LEVELS);
});

test('logger emits the stable base structure and serialized values', () => {
  const lines = [];
  const config = createConfig(environment()).public;
  const instance = createLogger({ config, sink: (record, line) => lines.push([record, line]), clock: () => NOW });
  const record = instance.info(' ready ');
  assert.deepEqual(record, {
    timestamp: NOW.toISOString(), level: 'info', message: 'ready', environment: 'test',
    service: 'acts-portal', version: '0.1.0',
  });
  assert.deepEqual(JSON.parse(lines[0][1]), record);
  assert.ok(Object.isFrozen(record));
});

test('logger preserves controlled technical context', () => {
  const { instance } = logger();
  const record = instance.info('operation', {
    requestId: 'req-1', correlationId: 'cor-1', eventId: 'evt-1', operation: 'read',
    module: 'core', duration: 12, status: 200, attempt: 2,
  });
  assert.deepEqual(record.context, { attempt: 2 });
  assert.equal(record.requestId, 'req-1');
  assert.equal(record.operation, 'read');
});

test('logger normalizes errors without exposing stack traces', () => {
  const { instance } = logger();
  const error = new TypeError('invalid input', { cause: new Error('upstream') });
  error.code = 'INVALID';
  const record = instance.error('failed', { error });
  assert.deepEqual(record.context.error, {
    name: 'TypeError', message: 'invalid input', code: 'INVALID',
    cause: { name: 'Error', message: 'upstream' },
  });
  assert.equal(JSON.stringify(record).includes('stack'), false);
});

test('logger redacts credentials embedded in error and context text', () => {
  const { instance } = logger();
  const record = instance.error('remote failure', {
    error: new Error('request Authorization=Bearer-example token=value'),
    note: 'received Bearer header-example',
  });
  const serialized = JSON.stringify(record);
  assert.equal(serialized.includes('Bearer-example'), false);
  assert.equal(serialized.includes('header-example'), false);
  assert.equal(serialized.includes('token=value'), false);
});

test('logger deeply redacts sensitive fields in objects and arrays', () => {
  const { instance } = logger();
  const record = instance.warn('redact', {
    authorization: 'Bearer example', nested: { password: 'value', safe: 'visible' },
    list: [{ apiKey: 'value' }, { cookie: 'value' }], webhookPayload: { safe: false },
  });
  assert.equal(record.context.authorization, '[REDACTED]');
  assert.deepEqual(record.context.nested, { password: '[REDACTED]', safe: 'visible' });
  assert.deepEqual(record.context.list, [{ apiKey: '[REDACTED]' }, { cookie: '[REDACTED]' }]);
  assert.equal(record.context.webhookPayload, '[REDACTED]');
});

test('logger replaces circular references safely', () => {
  const circular = { name: 'safe' };
  circular.self = circular;
  const { instance } = logger();
  assert.deepEqual(instance.info('cycle', { circular }).context.circular,
    { name: 'safe', self: '[Circular]' });
});

test('logger does not mutate supplied objects', () => {
  const context = { nested: { token: 'example' } };
  const snapshot = structuredClone(context);
  logger().instance.info('immutable input', context);
  assert.deepEqual(context, snapshot);
  assert.equal(Object.isFrozen(context), false);
});

test('logger filters entries below the configured level', () => {
  const { instance, output } = logger({ LOG_LEVEL: 'warn' });
  assert.equal(instance.debug('hidden'), undefined);
  assert.equal(instance.info('hidden'), undefined);
  instance.warn('visible');
  instance.error('visible');
  assert.deepEqual(output.map(({ level }) => level), ['warn', 'error']);
});

test('logger validates messages, context, clock, sink and public config', () => {
  const config = createConfig(environment()).public;
  assert.throws(() => createLogger({ config, sink: null }), /sink/);
  assert.throws(() => createLogger({ config: {}, sink: () => {} }), /level/);
  assert.throws(() => createLogger({ config, sink: () => {}, clock: () => 'now' }).info('x'), /Date/);
  const instance = createLogger({ config, sink: () => {}, clock: () => NOW });
  assert.throws(() => instance.info(''), /message/);
  assert.throws(() => instance.info('x', []), /context/);
});

test('config public view integrates directly with logger without exposing environment', () => {
  const raw = environment({ PRIVATE_TOKEN: 'never-output', LOG_LEVEL: 'error' });
  const config = createConfig(raw);
  const output = [];
  const instance = createLogger({ config: config.public, sink: (record) => output.push(record), clock: () => NOW });
  instance.warn('ignored');
  instance.error('accepted');
  assert.equal(output.length, 1);
  assert.equal(JSON.stringify(output).includes('never-output'), false);
});

test('logger source does not access an environment object or process globals', async () => {
  const source = await readFile(new URL('../../app/core/logger.js', import.meta.url), 'utf8');
  assert.equal(source.includes('process.env'), false);
  assert.equal(source.includes('globalThis'), false);
});
