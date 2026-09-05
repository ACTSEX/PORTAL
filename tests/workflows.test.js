import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execute } from '../scripts/bootstrap-r2.mjs';

const credentials = { R2_ACCESS_KEY_ID: 'id-not-real', R2_SECRET_ACCESS_KEY: 'secret-not-real', CLOUDFLARE_ACCOUNT_ID: 'account-not-real' };
const applyEnv = { ...credentials, GITHUB_REF: 'refs/heads/main', CONFIRMATION: 'PUBLICAR-V2-NO-R2' };

test('workflows manuais protegem apply, environments e não excluem', async () => {
  for (const file of ['deploy-worker.yml', 'publicar-r2.yml', 'reconciliar-rotas.yml']) {
    assert.match(await readFile(`.github/workflows/${file}`, 'utf8'), /workflow_dispatch/);
  }
  const workflow = await readFile('.github/workflows/publicar-r2.yml', 'utf8');
  assert.match(workflow, /environment: production-r2/);
  assert.match(workflow, /PUBLICAR-V2-NO-R2/);
  assert.match(workflow, /path: 'reports\/bootstrap-report\.json'/);
  assert.doesNotMatch(workflow, /delete-object|\bs3\s+rm\b/);
});

test('check é local, não usa rede, não escreve e gera o relatório correto', async () => withReport(async (reportPath) => {
  const forbidden = new Proxy({}, { get() { assert.fail('check tentou usar adaptador remoto'); } });
  const report = await execute('check', { env: {}, remote: forbidden, reportPath });
  assert.equal(report.remoteReads, 0);
  assert.equal(report.writes, 0);
  assert.equal(report.deletes, 0);
  assert.equal(report.total, 8);
  assert.deepEqual(JSON.parse(await readFile(reportPath, 'utf8')), report);
}));

test('plan só lê e classifica ausente, igual e diferente', async () => withReport(async (reportPath) => {
  let reads = 0; let writes = 0;
  const remote = {
    head(_bucket, _key, object) {
      reads++;
      if (reads === 1) return null;
      if (reads === 2) return { ContentLength: object.bytes, ETag: 'falso', ChecksumSHA256: object.checksumSHA256 };
      return { ContentLength: 1, ETag: 'diferente' };
    },
    putCreateOnly() { writes++; }
  };
  const report = await execute('plan', { env: credentials, remote, reportPath });
  assert.equal(reads, 8);
  assert.equal(writes, 0);
  assert.equal(report.remoteReads, 8);
  assert.equal(report.counts.ausente, 1);
  assert.ok(report.counts.existente_igual >= 1);
  assert.ok(report.counts.existente_diferente >= 1);
}));

test('apply recusa branch, confirmação e entrada de cliente', async () => withReport(async (reportPath) => {
  const remote = noExistingRemote();
  await assert.rejects(execute('apply', { env: { ...applyEnv, GITHUB_REF: 'refs/heads/feature' }, remote, reportPath }), /branch main/);
  await assert.rejects(execute('apply', { env: { ...applyEnv, CONFIRMATION: 'errada' }, remote, reportPath }), /Confirmação inválida/);
  await assert.rejects(execute('apply', { env: { ...applyEnv, ENTRADA_CLIENTE: 'cliente.json' }, remote, reportPath }), /recusa entrada/);
  assert.equal(remote.writes, 0);
}));

test('apply aborta antes da primeira escrita se qualquer chave existe', async () => withReport(async (reportPath) => {
  const remote = noExistingRemote();
  remote.head = () => ({ ContentLength: 1, ETag: 'existente' });
  await assert.rejects(execute('apply', { env: applyEnv, remote, reportPath }), /bloqueado por 8 objeto/);
  assert.equal(remote.writes, 0);
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  assert.equal(report.resultado, 'bloqueado_objetos_existentes');
}));

test('apply usa condição create-only e 412 nunca causa sobrescrita ou retry', async () => withReport(async (reportPath) => {
  const calls = [];
  const run = (_command, args) => {
    calls.push(args);
    if (args.includes('head-object')) return { status: 1, stdout: '', stderr: '404 Not Found' };
    return { status: 1, stdout: '', stderr: '412 PreconditionFailed' };
  };
  const { AwsR2 } = await import('../scripts/bootstrap-r2.mjs');
  const remote = new AwsR2({ endpoint: 'https://example.invalid', run });
  await assert.rejects(execute('apply', { env: applyEnv, remote, reportPath }), /PRECONDITION_FAILED/);
  const puts = calls.filter((args) => args.includes('put-object'));
  assert.equal(puts.length, 1);
  assert.ok(puts[0].includes('--if-none-match'));
  assert.equal(puts[0][puts[0].indexOf('--if-none-match') + 1], '*');
  assert.ok(!calls.some((args) => args.some((arg) => /delete/i.test(arg))));
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  assert.equal(report.writes, 0);
  assert.equal(report.overwrites, 0);
  assert.equal(report.resultado, 'bloqueado_precondicao_create_only');
}));

test('relatório não contém credenciais', async () => withReport(async (reportPath) => {
  await execute('plan', { env: credentials, remote: noExistingRemote(), reportPath });
  const raw = await readFile(reportPath, 'utf8');
  assert.doesNotMatch(raw, /id-not-real|secret-not-real|account-not-real|Authorization|access.key/i);
}));

test('Wrangler é integralmente travado no lock ou usa npm exec com versão exata', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  const deploy = await readFile('.github/workflows/deploy-worker.yml', 'utf8');
  const localDependency = pkg.devDependencies.wrangler === '4.35.0'
    && lock.packages['']?.devDependencies?.wrangler === '4.35.0'
    && lock.packages['node_modules/wrangler']?.version === '4.35.0';
  const pinnedExec = pkg.devDependencies.wrangler === undefined
    && lock.packages['']?.devDependencies?.wrangler === undefined
    && !lock.packages['node_modules/wrangler']
    && /^npm exec --yes --package=wrangler@4\.35\.0 -- wrangler deploy --dry-run\b/.test(pkg.scripts['dry-run']);
  assert.ok(localDependency || pinnedExec, 'Wrangler deve estar completo no lock ou ausente e fixado no npm exec');
  assert.doesNotMatch(pkg.scripts['dry-run'], /latest|&&|;|\bnpx\s+wrangler|\bwrangler deploy\s*$/);
  assert.match(deploy, /npm exec --yes --package=wrangler@4\.35\.0 -- wrangler deploy/);
  assert.doesNotMatch(deploy, /npx wrangler deploy|package=wrangler@(?!4\.35\.0)/);
});

function noExistingRemote() {
  return { writes: 0, head() { return null; }, putCreateOnly() { this.writes++; return {}; } };
}

async function withReport(callback) {
  const directory = await mkdtemp(join(tmpdir(), 'portal-r2-test-'));
  try { return await callback(join(directory, 'reports/bootstrap-report.json')); }
  finally { await rm(directory, { recursive: true, force: true }); }
}
