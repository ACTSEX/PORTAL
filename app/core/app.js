import { createConfig } from './config.js';
import { createLogger } from './logger.js';
import { createEventBus } from './events.js';
import { createDatabase } from './db.js';
import { createCache } from './cache.js';
import { createStorage } from './storage.js';
import { createAuth } from './auth.js';
import { createRouter } from './router.js';
import { createRenderer } from './render.js';
import { createPublisher } from './publish.js';

export const COMPOSITION_ORDER = Object.freeze(['config', 'logger', 'events', 'database', 'cache',
  'storage', 'auth', 'router', 'renderer', 'publisher', 'ready']);

/** Explicitly compose one request-safe Core application. */
export function createApp({ environment, sink = () => {}, auth = {}, clock, id, crypto } = {}) {
  let state = 'initializing';
  try {
    const config = createConfig(environment);
    const logger = createLogger({ config: config.public, sink, ...(clock && { clock }) });
    const events = createEventBus({ logger, ...(clock && { clock }), ...(id && { id }) });
    const database = createDatabase({ binding: config.bindings.ACTS_DB, logger });
    const cache = createCache({ binding: config.bindings.ACTS_KV, logger, visibility: 'public' });
    const storage = createStorage({ binding: config.bindings.ACTS_FILES, logger });
    const authenticator = createAuth({ logger, ...auth, ...(clock && { clock }), ...(crypto && { crypto }) });
    const router = createRouter({ logger, auth: authenticator, events, ...(id && { id }) });
    const renderer = createRenderer({ logger, events });
    const publisher = createPublisher({ renderer, cache, storage, logger, events, ...(id && { id }), ...(crypto && { crypto }) });
    const services = Object.freeze({ config: config.public, logger, events, database, cache, storage,
      auth: authenticator, router, renderer, publisher });
    state = 'ready';
    return Object.freeze({ services, get state() { return state; }, ready: true,
      fetch: (request) => router.dispatch(request), close: () => { events.clear(); state = 'closed'; return true; } });
  } catch (error) { state = 'failed'; throw new Error('Application bootstrap failed', { cause: error }); }
}
