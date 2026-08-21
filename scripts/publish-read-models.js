#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const ENVIRONMENTS = new Set(['development', 'staging', 'production']);
export function parseArguments(argv) {
  const options = { execute: false, environment: null, confirmProduction: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--execute') options.execute = true;
    else if (value === '--dry-run') options.execute = false;
    else if (value === '--confirm-production') options.confirmProduction = true;
    else if (value === '--environment' && argv[index + 1]) options.environment = argv[index += 1];
    else throw new Error('Unknown or incomplete option');
  }
  if (!ENVIRONMENTS.has(options.environment)) throw new Error('A valid environment is required');
  if (options.execute && options.environment === 'production' && !options.confirmProduction) throw new Error('Production execution requires --confirm-production');
  return Object.freeze(options);
}

export async function requestInitialPublications(db, queue, { execute = false, now = () => new Date() } = {}) {
  if (!db?.prepare || !queue?.send) throw new Error('ACTS_DB and ACTS_QUEUE bindings are required');
  const cityResult = await db.prepare('SELECT id, slug FROM cities WHERE active = 1 ORDER BY id').all();
  const profileResult = await db.prepare("SELECT id, slug FROM listings WHERE status = 'published' ORDER BY id").all();
  const cities = cityResult.results ?? [], profiles = profileResult.results ?? [];
  if (execute) {
    const requestedAt = now().toISOString();
    for (const city of cities) await queue.send({ type: 'PUBLICATION_REQUESTED', entity: 'city', id: city.id, slug: city.slug, reason: 'initial.rebuild', requestedAt }, { contentType: 'json' });
    for (const profile of profiles) await queue.send({ type: 'PUBLICATION_REQUESTED', entity: 'profile', id: profile.id, slug: profile.slug, reason: 'initial.rebuild', requestedAt }, { contentType: 'json' });
  }
  return Object.freeze({ mode: execute ? 'execute' : 'dry-run', cities: cities.length, profiles: profiles.length, queued: execute ? cities.length + profiles.length : 0, empty: cities.length === 0 && profiles.length === 0 });
}

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  const options = parseArguments(argv); await readFile('wrangler.toml', 'utf8');
  const getPlatformProxy = dependencies.getPlatformProxy ?? (await import('wrangler')).getPlatformProxy;
  const platform = await getPlatformProxy({ configPath: 'wrangler.toml', environment: options.environment, remoteBindings: options.environment !== 'development' });
  try {
    const report = await requestInitialPublications(platform.env.ACTS_DB, platform.env.ACTS_QUEUE, options);
    (dependencies.log ?? console.log)(JSON.stringify(report)); return report;
  } finally { await platform.dispose(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(JSON.stringify({ error: error.message })); process.exitCode = 1; });
