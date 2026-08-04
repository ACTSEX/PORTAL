import { createConfig } from './config.js';
import { createLogger } from './logger.js';
import { createEventBus, createPublicationQueue } from './events.js';
import { createDatabase } from './db.js';
import { createCache } from './cache.js';
import { createStorage } from './storage.js';
import { createAuth } from './auth.js';
import { createRouter } from './router.js';
import { createRenderer } from './render.js';
import { createPublisher } from './publish.js';
import { consumePublicationBatch } from './publish.js';

export const COMPOSITION_ORDER = Object.freeze(['config', 'logger', 'events', 'database', 'cache',
  'queue', 'storage', 'auth', 'router', 'renderer', 'publisher', 'ready']);

/** Explicitly compose one request-safe Core application. */
export function createApp({ environment, sink = () => {}, auth = {}, clock, id, crypto, publicationCompile } = {}) {
  let state = 'initializing';
  try {
    const config = createConfig(environment);
    const logger = createLogger({ config: config.public, sink, ...(clock && { clock }) });
    const events = createEventBus({ logger, ...(clock && { clock }), ...(id && { id }) });
    const queue = createPublicationQueue({ binding: config.bindings.ACTS_QUEUE, logger });
    const database = createDatabase({ binding: config.bindings.ACTS_DB, logger });
    const cache = createCache({ binding: config.bindings.ACTS_KV, logger, visibility: 'private' });
    const storage = createStorage({ binding: config.bindings.ACTS_FILES, logger });
    const authenticator = createAuth({ logger, ...auth, ...(clock && { clock }), ...(crypto && { crypto }) });
    const router = createRouter({ logger, auth: authenticator, events, ...(id && { id }) });
    const renderer = createRenderer({ logger, events });
    const publisher = createPublisher({ renderer, cache, storage, logger, events, ...(id && { id }), ...(crypto && { crypto }) });
    const services = Object.freeze({ config: config.public, logger, events, queue, database, cache, storage,
      auth: authenticator, router, renderer, publisher });
    state = 'ready';
    const consume = publicationCompile ? (batch) => consumePublicationBatch(batch.messages ?? batch, { compile: publicationCompile,
      aggregationWindowMs: config.public.publication.aggregationWindowMs, maximumWaitMs: config.public.publication.maximumWaitMs }) : undefined;
    return Object.freeze({ services, get state() { return state; }, ready: true, ...(consume && { queue: consume }),
      fetch: (request) => router.dispatch(request), close: () => { events.clear(); state = 'closed'; return true; } });
  } catch (error) { state = 'failed'; throw new Error('Application bootstrap failed', { cause: error }); }
}
