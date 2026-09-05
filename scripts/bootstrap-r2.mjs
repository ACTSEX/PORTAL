import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPORT_PATH = 'reports/bootstrap-report.json';
export const CONFIRMATION = 'PUBLICAR-V2-NO-R2';
const MODES = new Set(['check', 'plan', 'apply']);

export async function localInventory(root = resolve('bootstrap')) {
  const files = [];
  await walk(root, files);
  const objects = [];
  for (const file of files.sort()) {
    const raw = await readFile(file);
    const value = JSON.parse(raw);
    for (const field of ['$schema', 'schemaVersion', 'versao', 'ambiente', 'criadoEm', 'finalidade', 'estado', 'objetos']) {
      if (!(field in value)) throw new Error(`${relative(root, file)} sem ${field}`);
    }
    if (value.estado !== 'bootstrap' || value.ambiente !== 'nao-configurado' || value.objetos.length !== 0) {
      throw new Error(`${relative(root, file)} inseguro`);
    }
    const path = relative(root, file).replaceAll('\\', '/');
    const [scope, ...keyParts] = path.split('/');
    objects.push({
      bucket: scope === 'private' ? 'acts-private' : scope === 'public' ? 'acts-public' : invalidScope(scope),
      key: keyParts.join('/'),
      file,
      bytes: raw.length,
      sha256: createHash('sha256').update(raw).digest('hex'),
      checksumSHA256: createHash('sha256').update(raw).digest('base64'),
      etagMd5: createHash('md5').update(raw).digest('hex')
    });
  }
  if (objects.length !== 8 || objects.some(({ key }) => !key.endsWith('/manifesto.json'))) {
    throw new Error('Esperados exatamente 8 manifestos');
  }
  return objects;
}

export class AwsR2 {
  constructor({ endpoint, run = spawnSync } = {}) {
    if (!endpoint) throw new Error('CLOUDFLARE_ACCOUNT_ID ausente');
    this.endpoint = endpoint;
    this.run = run;
  }

  head(bucket, key) {
    const result = this.command(['s3api', 'head-object', '--endpoint-url', this.endpoint, '--bucket', bucket, '--key', key, '--checksum-mode', 'ENABLED', '--output', 'json'], true);
    if (result.status === 0) return JSON.parse(result.stdout || '{}');
    if (/\b(404|NoSuchKey|Not Found)\b/i.test(result.stderr || '')) return null;
    throw new Error(`Falha na leitura de metadados de ${bucket}/${key}`);
  }

  putCreateOnly(object) {
    const result = this.command([
      's3api', 'put-object', '--endpoint-url', this.endpoint, '--bucket', object.bucket, '--key', object.key,
      '--body', object.file, '--checksum-algorithm', 'SHA256', '--if-none-match', '*', '--output', 'json'
    ], true);
    if (result.status === 0) return JSON.parse(result.stdout || '{}');
    if (/\b(412|PreconditionFailed|Precondition Failed)\b/i.test(result.stderr || '')) {
      throw Object.assign(new Error(`PRECONDITION_FAILED: ${object.bucket}/${object.key}`), { code: 'PRECONDITION_FAILED' });
    }
    throw new Error(`Falha na criação de ${object.bucket}/${object.key}`);
  }

  command(args, allowFailure = false) {
    const result = this.run('aws', args, { encoding: 'utf8', env: process.env });
    if (result.error) throw new Error(`AWS CLI indisponível: ${result.error.message}`);
    if (!allowFailure && result.status !== 0) throw new Error('Falha no AWS CLI');
    return result;
  }
}

export async function execute(mode, { env = process.env, remote, reportPath = REPORT_PATH } = {}) {
  if (!MODES.has(mode)) throw new Error('Modo deve ser check, plan ou apply');
  const local = await localInventory();
  const report = baseReport(mode, env, local);

  try { validateApply(mode, env); }
  catch (error) {
    report.resultado = 'bloqueado_barreira_apply';
    report.errorCode = 'APPLY_GUARD_FAILED';
    await saveReport(reportPath, report);
    throw Object.assign(error, { report });
  }

  if (mode === 'check') {
    report.resultado = 'validado_localmente';
    await saveReport(reportPath, report);
    return report;
  }

  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    report.resultado = 'bloqueado_credenciais_ausentes';
    await saveReport(reportPath, report);
    throw Object.assign(new Error('Credenciais R2 ausentes'), { report });
  }
  const adapter = remote || new AwsR2({ endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com` });
  for (const object of local) {
    const metadata = await adapter.head(object.bucket, object.key, object);
    report.remoteReads++;
    const status = classify(object, metadata);
    report.objects.push(publicObject(object, status, metadata));
    report.counts[status]++;
  }

  if (mode === 'plan') {
    report.resultado = 'planejado_sem_escrita';
    await saveReport(reportPath, report);
    return report;
  }

  const blockers = report.objects.filter(({ status }) => status !== 'ausente');
  if (blockers.length) {
    report.resultado = 'bloqueado_objetos_existentes';
    report.blockers = blockers.map(({ bucket, key, status }) => ({ bucket, key, status }));
    await saveReport(reportPath, report);
    throw Object.assign(new Error(`Apply bloqueado por ${blockers.length} objeto(s) existente(s)`), { report });
  }

  try {
    for (const object of local) {
      adapter.putCreateOnly(object);
      report.writes++;
    }
    report.resultado = 'criado_sem_sobrescrita';
  } catch (error) {
    report.resultado = error.code === 'PRECONDITION_FAILED' ? 'bloqueado_precondicao_create_only' : 'falha_na_criacao';
    report.errorCode = error.code || 'CREATE_FAILED';
    await saveReport(reportPath, report);
    throw Object.assign(error, { report });
  }
  await saveReport(reportPath, report);
  return report;
}

function validateApply(mode, env) {
  if (mode !== 'apply') return;
  if (env.GITHUB_REF !== 'refs/heads/main') throw new Error('Apply exige branch main');
  if (env.CONFIRMATION !== CONFIRMATION) throw new Error('Confirmação inválida');
  if (env.ENTRADA_CLIENTE) throw new Error('Bootstrap recusa entrada de cliente');
}

function classify(local, metadata) {
  if (!metadata) return 'ausente';
  const size = Number(metadata.ContentLength ?? metadata.contentLength);
  const checksum = metadata.ChecksumSHA256 ?? metadata.checksumSHA256;
  const etag = String(metadata.ETag ?? metadata.etag ?? '').replaceAll('"', '').toLowerCase();
  const sameHash = checksum === local.checksumSHA256 || etag === local.etagMd5;
  return size === local.bytes && sameHash ? 'existente_igual' : 'existente_diferente';
}

function baseReport(mode, env, local) {
  return {
    schemaVersion: 1,
    mode,
    branch: env.GITHUB_REF_NAME || null,
    commit: env.GITHUB_SHA || null,
    total: local.length,
    counts: { ausente: 0, existente_igual: 0, existente_diferente: 0 },
    remoteReads: 0,
    writes: 0,
    deletes: 0,
    overwrites: 0,
    resultado: 'iniciado',
    objects: mode === 'check' ? local.map((object) => publicObject(object, 'validado_localmente')) : []
  };
}

function publicObject(object, status, metadata) {
  const output = { bucket: object.bucket, key: object.key, status, bytes: object.bytes, sha256: object.sha256 };
  if (metadata) {
    output.remote = {
      bytes: Number(metadata.ContentLength ?? metadata.contentLength),
      etag: String(metadata.ETag ?? metadata.etag ?? '').replaceAll('"', '') || null,
      checksumSHA256: metadata.ChecksumSHA256 ?? metadata.checksumSHA256 ?? null
    };
  }
  return output;
}

async function saveReport(path, report) {
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
}

async function walk(directory, files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path, files); else files.push(path);
  }
}

function invalidScope(scope) { throw new Error(`Escopo bootstrap inválido: ${scope}`); }

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const mode = process.argv[2] || 'check';
  try {
    const report = await execute(mode);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
