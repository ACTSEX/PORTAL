import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const BUCKET = 'acts-public';
export const PREFIX = 'midias/';
export const MARKER_KEY = 'midias/clientes/manifesto.json';
export const CONFIRMATION = 'REMOVER-MARCADOR-MIDIAS-RAIZ';
export const REPORT_PATH = 'reports/media-marker-migration-report.json';

const MODES = new Set(['check', 'plan', 'apply']);
const KNOWN_MARKER = {
  $schema: 'https://acompanhantesex.com/schemas/bootstrap-manifesto.schema.json',
  schemaVersion: 2,
  versao: '2.0.0',
  ambiente: 'nao-configurado',
  criadoEm: '2026-09-05T00:00:00.000Z',
  finalidade: 'Materializar prefixo public/midias/clientes sem dados de clientes',
  estado: 'bootstrap',
  objetos: []
};

export async function migrate(mode = 'check', { env = process.env, remote, reportPath = REPORT_PATH } = {}) {
  if (!MODES.has(mode)) throw new Error('Modo deve ser check, plan ou apply');
  const report = baseReport(mode, env);

  try {
    validateApply(mode, env);
    if (mode === 'check') {
      report.resultado = 'validado_localmente';
      await saveReport(reportPath, report);
      return report;
    }

    validateCredentials(env);
    const adapter = remote || new MigrationR2({ endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com` });
    const keys = adapter.listAll(BUCKET, PREFIX);
    report.remoteReads++;
    report.quantidadeObjetos = keys.length;
    report.objetosEncontrados = keys;

    if (keys.length === 0) {
      report.resultado = 'ja_ausente';
      await saveReport(reportPath, report);
      return report;
    }
    if (keys.length !== 1 || keys[0] !== MARKER_KEY) {
      return await block(reportPath, report, 'bloqueado_objeto_inesperado', mode);
    }

    const body = adapter.get(BUCKET, MARKER_KEY);
    report.remoteReads++;
    if (!isKnownMarker(body)) return await block(reportPath, report, 'bloqueado_marcador_desconhecido', mode);

    report.resultado = 'marcador_confirmado';
    if (mode === 'apply') {
      adapter.deleteExact(BUCKET, MARKER_KEY);
      report.deletes = 1;
      report.resultado = 'marcador_removido';
    }
    await saveReport(reportPath, report);
    return report;
  } catch (error) {
    if (report.resultado === 'iniciado') report.resultado = 'bloqueado_validacao';
    await saveReport(reportPath, report);
    throw Object.assign(error, { report });
  }
}

export class MigrationR2 {
  constructor({ endpoint, run = spawnSync } = {}) {
    if (!endpoint) throw new Error('CLOUDFLARE_ACCOUNT_ID ausente');
    this.endpoint = endpoint;
    this.run = run;
  }

  listAll(bucket, prefix) {
    const keys = [];
    let token;
    do {
      const args = ['s3api', 'list-objects-v2', '--endpoint-url', this.endpoint, '--bucket', bucket, '--prefix', prefix, '--output', 'json'];
      if (token) args.push('--continuation-token', token);
      const page = JSON.parse(this.command(args).stdout || '{}');
      keys.push(...(page.Contents || []).map(({ Key }) => Key));
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && !token) throw new Error('Listagem R2 truncada sem token de continuação');
    } while (token);
    return keys.sort();
  }

  get(bucket, key) {
    const directory = mkdtempSync(join(tmpdir(), 'portal-r2-marker-'));
    const path = join(directory, 'marker.json');
    try {
      this.command(['s3api', 'get-object', '--endpoint-url', this.endpoint, '--bucket', bucket, '--key', key, '--output', 'json', path]);
      return readFileSync(path, 'utf8');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }

  deleteExact(bucket, key) {
    if (bucket !== BUCKET || key !== MARKER_KEY) throw new Error('Exclusão fora da allowlist');
    this.command(['s3api', 'delete-object', '--endpoint-url', this.endpoint, '--bucket', BUCKET, '--key', MARKER_KEY]);
  }

  command(args) {
    const result = this.run('aws', args, { encoding: 'utf8', env: process.env });
    if (result.error) throw new Error(`AWS CLI indisponível: ${result.error.message}`);
    if (result.status !== 0) throw new Error('Falha no AWS CLI');
    return result;
  }
}

function validateApply(mode, env) {
  if (mode !== 'apply') return;
  if (env.GITHUB_REF !== 'refs/heads/main') throw new Error('Apply exige branch main');
  if (env.CONFIRMATION !== CONFIRMATION) throw new Error('Confirmação inválida');
}

function validateCredentials(env) {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.CLOUDFLARE_ACCOUNT_ID) throw new Error('Credenciais R2 ausentes');
}

function isKnownMarker(body) {
  try { return JSON.stringify(JSON.parse(body)) === JSON.stringify(KNOWN_MARKER); }
  catch { return false; }
}

function baseReport(mode, env) {
  return {
    schemaVersion: 1,
    modo: mode,
    branch: env.GITHUB_REF_NAME || env.GITHUB_REF?.replace('refs/heads/', '') || null,
    bucket: BUCKET,
    prefixoExaminado: PREFIX,
    chaveAutorizada: MARKER_KEY,
    quantidadeObjetos: 0,
    resultado: 'iniciado',
    remoteReads: 0,
    writes: 0,
    deletes: 0,
    overwrites: 0,
    objetosEncontrados: []
  };
}

async function block(reportPath, report, result, mode) {
  report.resultado = result;
  await saveReport(reportPath, report);
  if (mode === 'apply') throw Object.assign(new Error(result), { report });
  return report;
}

async function saveReport(path, report) {
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try { console.log(JSON.stringify(await migrate(process.argv[2] || 'check'), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
