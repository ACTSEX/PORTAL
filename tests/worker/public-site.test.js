import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import worker from '../../worker/index.js';
import { portalJs } from '../../frontend/portal/app.js';

const city = await readFile(new URL('../fixtures/city-test.json', import.meta.url), 'utf8');
const profile = await readFile(new URL('../fixtures/profile-test.json', import.meta.url), 'utf8');

function environment(objects = {}) {
  let d1Reads = 0;
  return {
    env: {
      ACTS_DB: { prepare() { d1Reads += 1; throw new Error('D1 must not be used'); } },
      ACTS_DATA: { async get(key) { const value = objects[key]; return value == null ? null : { body: value, etag: `etag-${key}`, httpEtag: `"etag-${key}"`, httpMetadata: { contentType: 'application/json; charset=utf-8' } }; } },
    },
    reads: () => d1Reads,
  };
}

async function request(path = '/', options = {}) {
  const host = options.host ?? 'acompanhantesex.com';
  return worker.fetch(new Request(`https://${host}${path}`), options.env);
}

test('home and supported portal routes return the real HTML shell', async () => {
  const setup = environment();
  for (const path of ['/', '/cidade-teste', '/cidade-teste/dir1', '/cidade-teste/dir2', '/cidade-teste/dir3', '/cidade-teste/anuncio/anunciante-teste']) {
    const response = await request(path, setup);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.match(await response.text(), /Portal ACTS|Seu momento começa/);
  }
  assert.equal(setup.reads(), 0);
});

test('city endpoint reads the single R2 city projection and is publicly cacheable', async () => {
  const setup = environment({ 'cities/cidade-teste.json': city });
  const response = await request('/data/cities/cidade-teste', setup);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).listings.length, 3);
  assert.match(response.headers.get('cache-control'), /s-maxage=300/);
  assert.match(response.headers.get('etag'), /etag-cities/);
  assert.equal(setup.reads(), 0);
});

test('missing R2 city is a cacheable empty-state signal without D1 fallback', async () => {
  const setup = environment();
  const response = await request('/data/cities/sem-dados', setup);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'not_found' });
  assert.equal(setup.reads(), 0);
});

test('browser bundle keeps one city promise and filters DIR, category and tag locally', () => {
  assert.match(portalJs, /cityCache\.has\(city\)/);
  assert.match(portalJs, /directory\(x\)===route\.dir/);
  assert.match(portalJs, /category\(x\)===cat/);
  assert.match(portalJs, /tags\(x\)\.includes\(tag\)/);
  assert.match(portalJs, /sort\.onchange=draw/);
});

test('wildcard hostname renders a profile minisite and missing profile is visual 404', async () => {
  const setup = environment({ 'profiles/anunciante-teste.json': profile });
  const found = await request('/', { ...setup, host: 'anunciante-teste.acompanhantesex.com' });
  assert.equal(found.status, 200);
  assert.match(await found.text(), /Perfil de teste/);
  const missing = await request('/', { ...setup, host: 'inexistente.acompanhantesex.com' });
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Minisite não encontrado/);
  assert.equal(setup.reads(), 0);
});

test('invalid projection paths and wildcard hostnames are rejected', async () => {
  const setup = environment();
  assert.equal((await request('/data/cities/../secret', setup)).status, 400);
  assert.equal((await request('/', { ...setup, host: 'bad.name.acompanhantesex.com' })).status, 400);
  assert.equal((await request('/cidade-teste/dir4', setup)).status, 404);
});
