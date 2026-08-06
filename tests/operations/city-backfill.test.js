import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { caseFold } from 'unicode-case-folding';
import { canonicalizeCityLocation, createCitySlug, ListingsError } from '../../app/modules/Listings.js';
import { backfillCities, main, parseArguments, validateConfiguration } from '../../scripts/backfill-cities.js';

const python = String.raw`import json,sqlite3,sys
p=json.loads(sys.stdin.read()); c=sqlite3.connect(p['db']); c.row_factory=sqlite3.Row
try:
 q=c.execute(p['sql'],p['params']); rows=[dict(x) for x in q.fetchall()] if p['kind']!='run' else []; c.commit()
 print(json.dumps({'results':rows,'row':rows[0] if rows else None,'success':True,'meta':{'changes':q.rowcount if q.rowcount>=0 else 0}}))
finally:c.close()`;
function sqlite(file, sql) { execFileSync('sqlite3', ['-batch', '-bail', file], { input: sql }); }
function d1(file, hooks = {}) { return { prepare(sql) { hooks.sql?.push(sql); return { bind(...params) { return {
  async first() { if (hooks.first) return hooks.first({ sql, params, call }); return call('first'); }, async all() { return call('all'); }, async run() { if (hooks.run) return hooks.run({ sql, params, call }); return call('run'); }
}; async function call(kind) { const value = execFileSync('python3', ['-c', python], { input: JSON.stringify({ db: file, sql, params, kind }), encoding: 'utf8' }); const result = JSON.parse(value); return kind === 'first' ? result.row : result; } } }; } }; }
function fixture() { const file = join(tmpdir(), `acts-city-${process.pid}-${Date.now()}-${Math.random()}.sqlite`); sqlite(file, readFileSync('database/schema.sql', 'utf8')); sqlite(file, `INSERT INTO users(id,email,password_hash) VALUES('user-000000000001','owner@example.test','12345678901234567890123456789012'); INSERT INTO categories(id,slug,name) VALUES('category-0000001','homes','Homes');`); return { file, db: d1(file), close: () => rmSync(file, { force: true }) }; }
function listing(file, id, region = 'Paraná', city = 'Londrina') { sqlite(file, `INSERT INTO listings(id,owner_id,category_id,slug,title,description,listing_type,price_minor,country_code,region,city) VALUES('${id}','user-000000000001','category-0000001','${id}','Valid listing title','A sufficiently long listing description','sale',1,'BR','${region}','${city}');`); }
function scalar(file, query) { return execFileSync('sqlite3', ['-batch', '-noheader', file], { input: query, encoding: 'utf8' }).trim(); }

test('canonicalization fixes version, NFC/NFD, marks, Portuguese accents and whitespace', () => {
  const a = canonicalizeCityLocation({ countryCode: 'BR', region: ' Paraná ', city: ' São   José ' });
  const b = canonicalizeCityLocation({ countryCode: 'BR', region: 'Paraná', city: 'São José' });
  assert.deepEqual(a, b); assert.equal(a.publicName, 'São José'); assert.equal(a.canonicalKey, 'BR|parana|sao jose'); assert.equal(a.canonicalizationVersion, 'unicode-17.0.0-v1');
});
test('canonicalization implements Unicode 17 full/common folds instead of lower-case', () => {
  const key = (city) => canonicalizeCityLocation({ countryCode: 'DE', region: 'Test', city }).cityKey;
  assert.equal(key('Straße'), 'strasse'); assert.equal(key('İ'), 'i'); assert.equal(caseFold('Σ σ ς'), 'σ σ σ'); assert.equal(key('ﬀ'), 'ff');
});
test('canonicalization normalizes hyphens, apostrophes, punctuation and separators', () => {
  const key = (city) => canonicalizeCityLocation({ countryCode: 'BR', region: 'SP', city }).cityKey;
  assert.equal(key('D’Abadia—Nova'), 'd abadia nova'); assert.equal(key('A/B.C'), 'a b c'); assert.equal(key('A\u00a0 B'), 'a b');
});
test('canonicalization rejects controls, limits, empty result and unknown version', () => {
  for (const city of ['A\u0000B', 'x'.repeat(121), '---']) assert.throws(() => canonicalizeCityLocation({ countryCode: 'BR', region: 'SP', city }), ListingsError);
  assert.throws(() => canonicalizeCityLocation({ countryCode: 'BR', region: 'SP', city: 'Santos' }, 'unicode-16.0.0-v1'), (error) => error.code === 'UNKNOWN_CANONICALIZATION_VERSION');
});
test('city-slug-v1 uses canonical geography and first 12 SHA-256 hex digits', async () => {
  assert.equal(await createCitySlug('BR|parana|londrina'), 'br-parana-londrina-5d5b845b907c');
  assert.notEqual(await createCitySlug('BR|parana|santa maria'), await createCitySlug('BR|rio grande do sul|santa maria'));
  assert.equal(await createCitySlug('BR|parana|londrina'), await createCitySlug('BR|parana|londrina'));
});
test('dry-run scans real SQLite without any write or timestamp change and exposes only allowlisted metrics', async () => {
  const f = fixture(); try { listing(f.file, 'listing-00000001'); const before = scalar(f.file, "SELECT total_changes()||'|'||updated_at FROM listings;"); const report = await backfillCities(f.db); assert.equal(report.mode, 'dry-run'); assert.equal(report.remaining, 1); assert.equal(scalar(f.file, 'SELECT count(*) FROM cities;'), '0'); assert.equal(scalar(f.file, 'SELECT count(*) FROM city_publication_state;'), '0'); assert.equal(scalar(f.file, "SELECT total_changes()||'|'||updated_at FROM listings;"), before); assert.doesNotMatch(JSON.stringify(report), /Londrina|Paraná|listing-/); } finally { f.close(); }
});
test('execute creates one opaque city/state and reuses it for listings over several batches', async () => {
  const f = fixture(); try { for (let n = 1; n <= 5; n++) listing(f.file, `listing-0000000${n}`); const report = await backfillCities(f.db, { execute: true, batchSize: 2 }); assert.equal(report.complete, true); assert.equal(report.linked, 5); assert.equal(scalar(f.file, 'SELECT count(*) FROM cities;'), '1'); assert.equal(scalar(f.file, 'SELECT count(*) FROM city_publication_state WHERE status="idle";'), '1'); assert.match(scalar(f.file, 'SELECT id FROM cities;'), /^city_[0-9a-f-]{36}$/); } finally { f.close(); }
});
test('retry and restart resume from the smallest remaining id with no checkpoint', async () => {
  const f = fixture(); try { listing(f.file, 'listing-00000001'); listing(f.file, 'listing-00000002'); await backfillCities(f.db, { execute: true, batchSize: 1 }); const retry = await backfillCities(f.db, { execute: true }); assert.equal(retry.scanned, 0); assert.equal(retry.complete, true); assert.equal(scalar(f.file, "SELECT count(*) FROM sqlite_master WHERE name LIKE '%checkpoint%';"), '0'); } finally { f.close(); }
});
test('zero changes accepts only expected concurrent link and rejects divergent link', async () => {
  const good = fixture(); try { listing(good.file, 'listing-00000001'); let intercepted = false; const db = d1(good.file, { async run({ sql, params, call }) { if (!intercepted && sql.startsWith('UPDATE listings SET city_id')) { intercepted = true; sqlite(good.file, `UPDATE listings SET city_id='${params[0]}' WHERE id='listing-00000001';`); return { success: true, meta: { changes: 0 } }; } return call('run'); } }); assert.equal((await backfillCities(db, { execute: true })).complete, true); } finally { good.close(); }
  const bad = fixture(); try { listing(bad.file, 'listing-00000001'); let intercepted = false; const db = d1(bad.file, { async run({ sql, call }) { if (!intercepted && sql.startsWith('UPDATE listings SET city_id')) { intercepted = true; sqlite(bad.file, "INSERT INTO cities(id,country_code,region_key,city_key,canonical_key,public_name,slug,canonicalization_version) VALUES('city_divergent_0001','BR','sp','santos','BR|sp|santos','Santos','br-sp-santos-deadbeef0000','unicode-17.0.0-v1'); UPDATE listings SET city_id='city_divergent_0001' WHERE id='listing-00000001';"); return { success: true, meta: { changes: 0 } }; } return call('run'); } }); await assert.rejects(backfillCities(db, { execute: true }), /divergent/); } finally { bad.close(); }
});
test('existing city identity or slug/version conflict fails closed', async () => {
  const f = fixture(); try { listing(f.file, 'listing-00000001'); sqlite(f.file, "INSERT INTO cities(id,country_code,region_key,city_key,canonical_key,public_name,slug,canonicalization_version) VALUES('city_existing_0001','BR','parana','londrina','BR|parana|londrina','Londrina','wrong-slug','unicode-17.0.0-v1');"); await assert.rejects(backfillCities(f.db, { execute: true }), /conflicts/); } finally { f.close(); }
});
test('lost city-insert response converges by unique key and reread', async () => {
  const f = fixture(); try { listing(f.file, 'listing-00000001'); let lost = false; const db = d1(f.file, { async run({ sql, call }) { if (!lost && sql.startsWith('INSERT INTO cities')) { lost = true; await call('run'); throw new Error('response lost'); } return call('run'); } }); const report = await backfillCities(db, { execute: true }); assert.equal(report.complete, true); assert.equal(scalar(f.file, 'SELECT count(*) FROM cities;'), '1'); } finally { f.close(); }
});
test('listing changed after pagination is reread and skipped safely', async () => {
  const f = fixture(); try { listing(f.file, 'listing-00000001'); let changed = false; const db = d1(f.file, { async first({ sql, call }) { if (!changed && sql.startsWith('SELECT id, country_code')) { changed = true; sqlite(f.file, "DELETE FROM listings WHERE id='listing-00000001';"); } return call('first'); } }); const report = await backfillCities(db, { execute: true }); assert.equal(report.skipped, 1); assert.equal(report.complete, true); assert.equal(scalar(f.file, 'SELECT count(*) FROM cities;'), '0'); } finally { f.close(); }
});
test('commands default to dry-run and reject unknown, forbidden and mismatched options', () => {
  assert.equal(parseArguments(['--environment','development','--mode','local']).execute, false); assert.equal(parseArguments(['--environment','staging','--mode','remote','--execute']).execute, true);
  for (const args of [['--wat'], ['--environment','production','--mode','remote'], ['--environment','development','--mode','remote'], ['--environment','staging','--mode','local'], ['--environment','development','--mode','local','--dry-run','--execute']]) assert.throws(() => parseArguments(args));
});
test('configuration requires staging remote, local development and distinct staging/production IDs', () => {
  const source = readFileSync('wrangler.toml', 'utf8'); assert.doesNotThrow(() => validateConfiguration(source, 'staging', 'remote')); assert.throws(() => validateConfiguration(source.replace('remote = true',''), 'staging', 'remote')); assert.throws(() => validateConfiguration(source.replace('database_id = "00000000-0000-0000-0000-000000000003"','database_id = "00000000-0000-0000-0000-000000000002"'), 'staging', 'remote')); assert.throws(() => validateConfiguration(source.replace('[[env.development.kv_namespaces]]','remote = true\n\n[[env.development.kv_namespaces]]'), 'development', 'local'));
});
test('main fixes config/binding, selects remoteBindings and always disposes platform', async () => {
  let disposed = 0; let received; const platform = { env: { ACTS_DB: { prepare() { throw new Error('boundary failure'); } } }, async dispose() { disposed++; } };
  await assert.rejects(main(['--environment','staging','--mode','remote'], { getPlatformProxy: async (options) => { received = options; return platform; }, log() {} }), /boundary failure/); assert.deepEqual(received, { configPath: 'wrangler.toml', environment: 'staging', remoteBindings: true }); assert.equal(disposed, 1);
});
test('main disposes on success and logs technical metrics without identifiers or locations', async () => {
  const f = fixture(); let disposed = 0; const logs = []; try { await main(['--environment','development','--mode','local'], { getPlatformProxy: async () => ({ env: { ACTS_DB: f.db }, async dispose() { disposed++; } }), log(value) { logs.push(value); } }); assert.equal(disposed, 1); const output = JSON.stringify(logs); assert.doesNotMatch(output, /ACTS_DB|00000000|Londrina|Paraná|BR\|/); assert.deepEqual(Object.keys(logs[0]).sort(), ['citiesCreated','citiesReused','complete','concurrentConvergences','linked','mode','passes','remaining','scanned','skipped'].sort()); } finally { f.close(); }
});
test('Unicode dependency is pinned, integrity-locked, MIT, dependency-free and offline at runtime', () => {
  const manifest = JSON.parse(readFileSync('package.json')); const lock = JSON.parse(readFileSync('package-lock.json')); const installed = JSON.parse(readFileSync('node_modules/unicode-case-folding/package.json')); const runtime = readFileSync('node_modules/unicode-case-folding/index.js', 'utf8');
  const executable = runtime.replace(/\/\*[\s\S]*?\*\//g, ''); assert.equal(manifest.dependencies['unicode-case-folding'], '1.1.1'); assert.equal(lock.packages['node_modules/unicode-case-folding'].version, '1.1.1'); assert.match(lock.packages['node_modules/unicode-case-folding'].integrity, /^sha512-/); assert.equal(installed.license, 'MIT'); assert.deepEqual(installed.dependencies ?? {}, {}); assert.equal(Object.keys(installed.scripts ?? {}).some((name) => /^(pre|post)?install$/.test(name)), false); assert.doesNotMatch(executable, /fetch\(|https?:\/\/|node:https|node:net/);
});
test('executor source is keyset/parameterized, has no OFFSET, secrets, publication or future lots', () => {
  const source = readFileSync('scripts/backfill-cities.js', 'utf8'); assert.match(source, /city_id IS NULL AND id > \? ORDER BY id LIMIT \?/); assert.doesNotMatch(source, /OFFSET|process\.env|account.?id|token|Publish|Seo|emit|event/i); assert.match(source, /\.prepare\(sql\)\.bind\(\.\.\.values\)/); assert.match(source, /finally \{ await platform\.dispose\(\); \}/);
  for (const path of ['database/migrations/0004_city_publication_contract.sql','app/modules/Publish.js','app/modules/Seo.js']) assert.throws(() => readFileSync(path));
});
