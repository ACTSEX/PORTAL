import { deepFreeze, isPlainObject } from './helpers.js';

const NAME = /^[a-z][a-z0-9.-]{0,63}$/;
const TYPES = new Set(['template', 'layout', 'component']);

function clone(value) {
  if (value === undefined) return {};
  if (!isPlainObject(value)) throw new TypeError('Render data and context must be plain objects');
  return structuredClone(value);
}

function normalize(value, format) {
  if (format === 'html') {
    if (typeof value !== 'string') throw new TypeError('HTML renderer must return a string');
    return value;
  }
  if (format === 'json') {
    if (value === undefined || typeof value === 'function') throw new TypeError('Invalid JSON output');
    return JSON.stringify(value);
  }
  throw new RangeError('Unsupported render format');
}

/** Create an isolated registry for deterministic technical presentation. */
export function createRenderer({ logger, events } = {}) {
  if (!logger || typeof logger.error !== 'function' || typeof logger.info !== 'function') {
    throw new TypeError('Renderer requires a valid logger');
  }
  if (events && typeof events.publish !== 'function') throw new TypeError('Invalid Renderer Event Bus');
  const registries = Object.fromEntries([...TYPES].map((type) => [type, new Map()]));

  function register(type, name, renderer) {
    if (!TYPES.has(type) || !NAME.test(name ?? '') || typeof renderer !== 'function') {
      throw new TypeError('Invalid render registration');
    }
    if (registries[type].has(name)) throw new Error('Duplicate render registration');
    registries[type].set(name, renderer);
    return service;
  }

  function resolve(type, name) {
    if (!TYPES.has(type) || !NAME.test(name ?? '')) throw new TypeError('Invalid render reference');
    const item = registries[type].get(name);
    if (!item) throw new Error('Render item not found');
    return item;
  }

  async function invoke(type, name, data, context) {
    const input = deepFreeze(clone(data));
    const safeContext = deepFreeze({ ...clone(context), component: async (componentName, props = {}) =>
      invoke('component', componentName, props, context) });
    return resolve(type, name)(input, safeContext);
  }

  async function render(options) {
    if (!isPlainObject(options) || !NAME.test(options.template ?? '')) throw new TypeError('Invalid render options');
    const format = options.format ?? 'html';
    try {
      let output = await invoke('template', options.template, options.data, options.context);
      if (options.layout) output = await invoke('layout', options.layout, { content: output, data: clone(options.data) }, options.context);
      const result = normalize(output, format);
      logger.info('Render completed', { operation: 'renderer.render', status: 'success' });
      if (events) await events.publish({ name: 'ArtifactRendered', version: '1.0', source: 'core.render', payload: { format } });
      return result;
    } catch (error) {
      logger.error('Render failed', { operation: 'renderer.render', status: 'failed', error });
      throw new Error('Render failed', { cause: error });
    }
  }

  const service = Object.freeze({ register, resolve, render,
    registerTemplate: (name, item) => register('template', name, item),
    registerLayout: (name, item) => register('layout', name, item),
    registerComponent: (name, item) => register('component', name, item),
    renderComponent: (name, data, context) => invoke('component', name, data, context) });
  return service;
}
