import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BUCKET, CONFIRMATION, MARKER_KEY, migrate } from '../scripts/remover-marcador-midias-raiz.mjs';

const marker = JSON.stringify({
  $schema: 'https://acompanhantesex.com/schemas/bootstrap-manifesto.schema.json', schemaVersion: 2, versao: '2.0.0',
  ambiente: 'nao-configurado', criadoEm: '2026-09-05T00:00:00.000Z',
  finalidade: 'Materializar prefixo public/midias/clientes sem dados de clientes', estado: 'bootstrap', objetos: []
});
const credentials = { R2_ACCESS_KEY_ID: 'id-not-real', R2_SECRET_ACCESS_KEY: 'secret-not-real', CLOUDFLARE_ACCOUNT_ID: 'account-not-real' };
const applyEnv = { ...credentials, GITHUB_REF: 'refs/heads/main', GITHUB_REF_NAME: 'main', CONFIRMATION };

test('check é local, não exige secrets e não acessa o adaptador', async () => withReport(async (reportPath) => {
  const forbidden = new Proxy({}, { get() { assert.fail('check tentou acessar rede'); } });
  const report = await migrate('check', { env: {}, remote: forbidden, reportPath });
  assert.deepEqual([report.remoteReads, report.writes, report.deletes, report.overwrites], [0, 0, 0, 0]);
  assert.equal(report.resultado, 'validado_localmente');
}));

test('plan confirma o marcador conhecido sem escrita ou exclusão', async () => withReport(async (reportPath) => {
  const r2 = remote();
  const report = await migrate('plan', { env: credentials, remote: r2, reportPath });
  assert.equal(report.resultado, 'marcador_confirmado');
  assert.equal(report.quantidadeObjetos, 1);
  assert.deepEqual([report.remoteReads, report.writes, report.deletes, report.overwrites], [2, 0, 0, 0]);
  assert.deepEqual(r2.deleted, []);
}));

test('conteúdo desconhecido e qualquer objeto inesperado bloqueiam sem mutação', async () => withReport(async (reportPath) => {
  for (const r2 of [remote([MARKER_KEY], '{}'), remote([MARKER_KEY, 'midias/clientes/cliente/foto.webp'])]) {
    await assert.rejects(migrate('apply', { env: applyEnv, remote: r2, reportPath }), /bloqueado_/);
    assert.deepEqual(r2.deleted, []);
  }
}));

test('protege clientes/{clienteId}/midias/ mesmo fora do prefixo examinado', async () => withReport(async (reportPath) => {
  const r2 = remote([MARKER_KEY]);
  await migrate('apply', { env: applyEnv, remote: r2, reportPath });
  assert.deepEqual(r2.deleted, [[BUCKET, MARKER_KEY]]);
  assert.notEqual(r2.deleted[0][1], 'clientes/cliente-1/midias/');
}));

test('apply exige main e a única confirmação literal', async () => withReport(async (reportPath) => {
  for (const env of [{ ...applyEnv, GITHUB_REF: 'refs/heads/feature' }, { ...applyEnv, CONFIRMATION: 'outra-frase' }]) {
    const r2 = remote();
    await assert.rejects(migrate('apply', { env, remote: r2, reportPath }), /branch main|Confirmação inválida/);
    assert.equal(r2.lists, 0);
  }
}));

test('primeiro apply exclui a chave exata e o segundo é idempotente', async () => withReport(async (reportPath) => {
  const state = [MARKER_KEY];
  const r2 = remote(state);
  const first = await migrate('apply', { env: applyEnv, remote: r2, reportPath });
  assert.equal(first.deletes, 1);
  assert.deepEqual(r2.deleted, [[BUCKET, MARKER_KEY]]);
  state.splice(0);
  const second = await migrate('apply', { env: applyEnv, remote: r2, reportPath });
  assert.equal(second.resultado, 'ja_ausente');
  assert.equal(second.deletes, 0);
  assert.equal(r2.deleted.length, 1);
}));

test('plan aceita prefixo vazio e relatório não contém secrets', async () => withReport(async (reportPath) => {
  const report = await migrate('plan', { env: credentials, remote: remote([]), reportPath });
  assert.equal(report.resultado, 'ja_ausente');
  const raw = await readFile(reportPath, 'utf8');
  assert.doesNotMatch(raw, /id-not-real|secret-not-real|account-not-real|Authorization|access.key/i);
}));

function remote(keys = [MARKER_KEY], body = marker) {
  return {
    deleted: [], lists: 0,
    listAll(bucket, prefix) { this.lists++; assert.equal(bucket, BUCKET); assert.equal(prefix, 'midias/'); return keys; },
    get(bucket, key) { assert.deepEqual([bucket, key], [BUCKET, MARKER_KEY]); return body; },
    deleteExact(bucket, key) { this.deleted.push([bucket, key]); }
  };
}

async function withReport(callback) {
  const directory = await mkdtemp(join(tmpdir(), 'portal-marker-test-'));
  try { return await callback(join(directory, 'reports/report.json')); }
  finally { await rm(directory, { recursive: true, force: true }); }
}
