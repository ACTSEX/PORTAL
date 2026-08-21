import assert from 'node:assert/strict';
import test from 'node:test';
import { parseArguments, requestInitialPublications } from '../../scripts/publish-read-models.js';

test('initial publication is dry-run by default and production execution needs explicit confirmation', () => {
  assert.deepEqual(parseArguments(['--environment', 'production', '--dry-run']).execute, false);
  assert.throws(() => parseArguments(['--environment', 'production', '--execute']), /confirm-production/);
  assert.equal(parseArguments(['--environment', 'production', '--execute', '--confirm-production']).execute, true);
});

test('initial publication reports an empty D1 and queues only identifiers when explicitly executed', async () => {
  const database = (cities, profiles) => ({ prepare(sql) { return { async all() { return { results: sql.includes('FROM cities') ? cities : profiles }; } }; } });
  const sent = [], queue = { async send(body) { sent.push(body); } };
  assert.deepEqual(await requestInitialPublications(database([], []), queue), { mode: 'dry-run', cities: 0, profiles: 0, queued: 0, empty: true });
  const report = await requestInitialPublications(database([{ id: 'city_1', slug: 'londrina' }], [{ id: 'listing_1', slug: 'ana' }]), queue, { execute: true, now: () => new Date('2026-08-21T00:00:00Z') });
  assert.deepEqual(report, { mode: 'execute', cities: 1, profiles: 1, queued: 2, empty: false });
  assert.deepEqual(sent.map(({ entity, id, slug }) => ({ entity, id, slug })), [{ entity: 'city', id: 'city_1', slug: 'londrina' }, { entity: 'profile', id: 'listing_1', slug: 'ana' }]);
  assert.doesNotMatch(JSON.stringify(sent), /email|payment|token|secret/);
});
