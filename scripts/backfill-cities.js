#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { canonicalizeCityLocation, createCitySlug } from '../business/listings.js';

const CONFIG_PATH = 'wrangler.toml';
const BINDING = 'ACTS_DB';
const ALLOWED = new Map([['development', 'local'], ['staging', 'remote']]);
const SELECT_PAGE = 'SELECT id FROM listings WHERE city_id IS NULL AND id > ? ORDER BY id LIMIT ?';

export function parseArguments(argv) {
  const options = { execute: false }; const valued = new Set(['--environment', '--mode', '--batch-size', '--max-passes']);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run') { if (options.execute) throw new Error('Choose dry-run or execute'); options.dryRun = true; continue; }
    if (argument === '--execute') { if (options.dryRun) throw new Error('Choose dry-run or execute'); options.execute = true; continue; }
    if (!valued.has(argument) || argv[index + 1] === undefined) throw new Error('Unknown or incomplete option');
    const key = argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    options[key] = argv[index += 1];
  }
  if (!ALLOWED.has(options.environment) || ALLOWED.get(options.environment) !== options.mode) throw new Error('Unauthorized environment/mode combination');
  if (options.environment === 'production') throw new Error('Production is forbidden');
  for (const key of ['batchSize', 'maxPasses']) if (options[key] !== undefined && (!/^\d+$/.test(options[key]) || Number(options[key]) < 1 || Number(options[key]) > 1000)) throw new Error('Invalid numeric option');
  return Object.freeze({ environment: options.environment, mode: options.mode, execute: options.execute, batchSize: Number(options.batchSize ?? 50), maxPasses: Number(options.maxPasses ?? 5) });
}

export function validateConfiguration(source, environment, mode) {
  const section = (name) => source.match(new RegExp(`\\[\\[env\\.${name}\\.d1_databases\\]\\]([\\s\\S]*?)(?=\\n\\[|$)`))?.[1] ?? '';
  const development = section('development'); const staging = section('staging'); const production = section('production');
  const value = (body, name) => body.match(new RegExp(`^\\s*${name}\\s*=\\s*"([^"]+)"`, 'm'))?.[1];
  if (value(development, 'binding') !== BINDING || value(staging, 'binding') !== BINDING || value(production, 'binding') !== BINDING) throw new Error('ACTS_DB configuration is missing');
  if ([development, staging, production].some((body) => value(body, 'migrations_dir') !== 'database/migrations')) throw new Error('Migration directory configuration is invalid');
  if (/^\s*remote\s*=\s*true/m.test(development) || !/^\s*remote\s*=\s*true/m.test(staging)) throw new Error('Remote binding configuration is invalid');
  if (value(staging, 'database_id') === value(production, 'database_id')) throw new Error('Staging and production databases must differ');
  if (ALLOWED.get(environment) !== mode) throw new Error('Unauthorized environment/mode combination');
}

const first = async (db, sql, values) => db.prepare(sql).bind(...values).first();
const all = async (db, sql, values) => db.prepare(sql).bind(...values).all();
const run = async (db, sql, values) => db.prepare(sql).bind(...values).run();
const changes = (result) => result?.meta?.changes ?? result?.changes;
function assertCity(city, canonical, slug) {
  if (!city || city.country_code !== canonical.countryCode || city.region_key !== canonical.regionKey || city.city_key !== canonical.cityKey || city.canonical_key !== canonical.canonicalKey || city.slug !== slug || city.canonicalization_version !== canonical.canonicalizationVersion) throw new Error('Existing city conflicts with canonical identity');
}
async function processListing(db, listingId, metrics) {
  const listing = await first(db, 'SELECT id, country_code, region, city, city_id FROM listings WHERE id = ?', [listingId]);
  if (!listing || listing.city_id !== null) { metrics.skipped += 1; return; }
  const canonical = canonicalizeCityLocation({ countryCode: listing.country_code, region: listing.region, city: listing.city });
  const slug = await createCitySlug(canonical.canonicalKey);
  let city = await first(db, 'SELECT * FROM cities WHERE canonical_key = ?', [canonical.canonicalKey]);
  if (!city) {
    const cityId = `city_${crypto.randomUUID()}`;
    try {
      const inserted = await run(db, 'INSERT INTO cities (id, country_code, region_key, city_key, canonical_key, public_name, slug, canonicalization_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [cityId, canonical.countryCode, canonical.regionKey, canonical.cityKey, canonical.canonicalKey, canonical.publicName, slug, canonical.canonicalizationVersion]);
      if (changes(inserted) !== 1 || inserted?.success === false) throw new Error('City insert was not confirmed'); metrics.citiesCreated += 1;
    } catch (error) {
      city = await first(db, 'SELECT * FROM cities WHERE canonical_key = ?', [canonical.canonicalKey]);
      if (!city) throw error; metrics.concurrentConvergences += 1;
    }
    city ??= await first(db, 'SELECT * FROM cities WHERE canonical_key = ?', [canonical.canonicalKey]);
  } else metrics.citiesReused += 1;
  assertCity(city, canonical, slug);
  try {
    const state = await run(db, "INSERT OR IGNORE INTO city_publication_state (city_id, status) VALUES (?, 'idle')", [city.id]);
    if (![0, 1].includes(changes(state)) || state?.success === false) throw new Error('Publication state insert was not confirmed');
  } catch (error) { if (!await first(db, 'SELECT city_id FROM city_publication_state WHERE city_id = ?', [city.id])) throw error; }
  const updated = await run(db, 'UPDATE listings SET city_id = ? WHERE id = ? AND city_id IS NULL', [city.id, listing.id]);
  if (updated?.success === false || ![0, 1].includes(changes(updated))) throw new Error('Listing update was not confirmed');
  if (changes(updated) === 1) { metrics.linked += 1; return; }
  const reread = await first(db, 'SELECT city_id FROM listings WHERE id = ?', [listing.id]);
  if (reread?.city_id !== city.id) throw new Error('Listing was linked to a divergent city');
  metrics.concurrentConvergences += 1;
}

export async function backfillCities(db, options = {}) {
  const execute = options.execute === true; const batchSize = options.batchSize ?? 50; const maxPasses = options.maxPasses ?? 5;
  const metrics = { mode: execute ? 'execute' : 'dry-run', passes: 0, scanned: 0, linked: 0, citiesCreated: 0, citiesReused: 0, skipped: 0, concurrentConvergences: 0, remaining: 0, complete: false };
  for (let pass = 1; pass <= maxPasses; pass += 1) {
    metrics.passes = pass; let cursor = '';
    while (true) {
      const page = await all(db, SELECT_PAGE, [cursor, batchSize]); const rows = page?.results ?? [];
      if (!rows.length) break;
      for (const row of rows) { metrics.scanned += 1; if (execute) await processListing(db, row.id, metrics); }
      cursor = rows.at(-1).id;
    }
    const pending = await first(db, 'SELECT COUNT(*) AS count FROM listings WHERE city_id IS NULL', []); metrics.remaining = Number(pending?.count ?? 0);
    if (!execute || metrics.remaining === 0) { metrics.complete = metrics.remaining === 0; break; }
  }
  return Object.freeze(metrics);
}

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  const options = parseArguments(argv); const source = await readFile(CONFIG_PATH, 'utf8'); validateConfiguration(source, options.environment, options.mode);
  const getProxy = dependencies.getPlatformProxy ?? (await import('wrangler')).getPlatformProxy;
  const platform = await getProxy({ configPath: CONFIG_PATH, environment: options.environment, remoteBindings: options.mode === 'remote' });
  try {
    const db = platform.env[BINDING]; if (!db?.prepare) throw new Error('ACTS_DB binding is unavailable');
    const report = await backfillCities(db, options); if (dependencies.log) dependencies.log(report); else console.log(JSON.stringify(report));
    if (options.execute && !report.complete) throw new Error('Backfill incomplete after maximum passes'); return report;
  } finally { await platform.dispose(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(JSON.stringify({ error: error.message })); process.exitCode = 1; });
