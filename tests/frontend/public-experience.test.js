import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { portalJs } from '../../frontend/portal/app.js';
import { minisiteJs } from '../../frontend/minisite/app.js';

test('portal uses one cached city projection and performs directory, category, tag and sort locally', async () => {
  assert.match(portalJs, /const cityCache=new Map\(\)/);
  assert.match(portalJs, /if\(cityCache\.has\(city\)\)return cityCache\.get\(city\)/);
  assert.equal((portalJs.match(/fetch\(/g) ?? []).length, 1);
  for (const behavior of [/directory\(x\)===route\.dir/, /category\(x\)===cat/, /selectedTags.*every/, /sort\.value==='name'/]) assert.match(portalJs, behavior);
  assert.doesNotMatch(portalJs, /\/api\/|ACTS_DB|localStorage|sessionStorage/);
  const fixture = JSON.parse(await readFile(new URL('../fixtures/city-test.json', import.meta.url)));
  const filtered = fixture.listings.filter((item) => item.directory === 'dir1' && item.category === 'cat1' && ['massagem', 'centro'].every((tag) => item.tags.includes(tag))).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  assert.deepEqual(filtered.map((item) => item.slug), ['anunciante-teste']);
});

test('portal routes cover city directories and public listing detail with professional states', () => {
  for (const route of [/\^dir\[123\]\$/, /p\[1\]==='anuncio'/]) assert.match(portalJs, route);
  for (const state of ['Carregando anúncios', 'Ainda não há anúncios publicados', 'Não foi possível carregar', 'Anúncio não encontrado']) assert.match(portalJs, new RegExp(state));
  for (const category of ['cat1', 'cat2', 'cat3', 'cat4', 'cat5', 'cat6', 'cat7', 'cat8']) assert.match(portalJs, new RegExp(category));
});

test('shared minisite resolves a safe hostname, renders profile first and isolates Blogger failure', () => {
  assert.match(minisiteJs, /location\.hostname/); assert.match(minisiteJs, /minisites\/'/);
  assert.match(minisiteJs, /RESERVED=new Set/); assert.match(minisiteJs, /root\.replaceChildren[\s\S]*queueMicrotask\(\(\)=>loadBlogger/);
  assert.match(minisiteJs, /catch\{\/\* O perfil já está renderizado/);
  assert.doesNotMatch(minisiteJs, /innerHTML|\/api\/|ACTS_DB|ACTS_QUEUE|localStorage/);
});
