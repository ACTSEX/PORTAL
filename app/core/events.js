import { deepFreeze, isPlainObject } from './helpers.js';

const EVENT_NAME = /^[A-Z][A-Za-z0-9]*$/;
const CONSUMER_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION = /^\d+\.\d+$/;

function validateLogger(logger) {
  if (!logger || typeof logger.info !== 'function' || typeof logger.error !== 'function') {
    throw new TypeError('Event Bus requires a valid logger');
  }
}

function validateConsumer(consumer) {
  if (!isPlainObject(consumer) || !CONSUMER_ID.test(consumer.id ?? '')
    || typeof consumer.handler !== 'function') {
    throw new TypeError('Invalid event consumer');
  }
  const version = consumer.version ?? '1.0';
  const priority = consumer.priority ?? 500;
  if (!VERSION.test(version) || !Number.isInteger(priority)) {
    throw new TypeError('Invalid event consumer');
  }
  if (consumer.filter !== undefined && typeof consumer.filter !== 'function') {
    throw new TypeError('Invalid event consumer filter');
  }
  return Object.freeze({ ...consumer, version, priority });
}

function validateEvent(event) {
  if (!isPlainObject(event) || !EVENT_NAME.test(event.name ?? '')
    || !VERSION.test(event.version ?? '') || typeof event.source !== 'string'
    || event.source.trim() === '' || !isPlainObject(event.payload ?? {})) {
    throw new TypeError('Invalid event');
  }
  if (event.metadata !== undefined && !isPlainObject(event.metadata)) {
    throw new TypeError('Invalid event metadata');
  }
}

/** Create an isolated, deterministic in-process event bus. */
export function createEventBus({ logger, clock = () => new Date(), id = () => crypto.randomUUID() }) {
  validateLogger(logger);
  if (typeof clock !== 'function' || typeof id !== 'function') throw new TypeError('Invalid Event Bus options');
  const registry = new Map();

  function subscribe(eventName, consumer) {
    if (!EVENT_NAME.test(eventName ?? '')) throw new TypeError('Invalid event name');
    const normalized = validateConsumer(consumer);
    const listeners = registry.get(eventName) ?? [];
    if (listeners.some((item) => item.id === normalized.id && item.version === normalized.version)) {
      throw new Error('Duplicate event consumer');
    }
    listeners.push(normalized);
    listeners.sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
    registry.set(eventName, listeners);
    return () => unsubscribe(eventName, normalized.id);
  }

  function unsubscribe(eventName, consumerId) {
    const listeners = registry.get(eventName) ?? [];
    const remaining = listeners.filter((item) => item.id !== consumerId);
    if (remaining.length === listeners.length) return false;
    if (remaining.length) registry.set(eventName, remaining); else registry.delete(eventName);
    return true;
  }

  async function publish(input, technicalContext = {}) {
    validateEvent(input);
    if (!isPlainObject(technicalContext)) throw new TypeError('Invalid event context');
    const instant = clock();
    if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) throw new TypeError('Invalid Event Bus clock');
    const event = deepFreeze({ ...input, id: input.id ?? `evt_${id()}`, occurredAt: input.occurredAt ?? instant.toISOString(), payload: input.payload ?? {}, metadata: input.metadata ?? {} });
    const listeners = [...(registry.get(event.name) ?? [])].filter((item) => item.version === event.version);
    const results = [];
    for (const listener of listeners) {
      try {
        if (listener.filter && !await listener.filter(event)) {
          results.push(Object.freeze({ consumerId: listener.id, status: 'skipped' }));
          continue;
        }
        const value = await listener.handler(event, Object.freeze({ ...technicalContext, eventId: event.id }));
        results.push(Object.freeze({ consumerId: listener.id, status: 'fulfilled', value }));
      } catch (error) {
        logger.error('Event consumer failed', { eventId: event.id, operation: 'event.publish', status: 'failed', consumerId: listener.id, error });
        results.push(Object.freeze({ consumerId: listener.id, status: 'rejected', error: 'Event consumer failed' }));
      }
    }
    logger.info('Event published', { eventId: event.id, operation: 'event.publish', status: results.some((item) => item.status === 'rejected') ? 'partial' : 'completed', eventName: event.name, listeners: results.length });
    return deepFreeze({ event, delivered: results.length, succeeded: results.filter((item) => item.status === 'fulfilled').length, failed: results.filter((item) => item.status === 'rejected').length, results });
  }

  return Object.freeze({ subscribe, unsubscribe, publish, publishAsync: publish, hasSubscribers: (name) => (registry.get(name)?.length ?? 0) > 0, listSubscribers: (name) => Object.freeze((registry.get(name) ?? []).map(({ id: consumerId, version, priority }) => Object.freeze({ consumerId, version, priority }))), clear: () => registry.clear(), validate: validateEvent });
}
