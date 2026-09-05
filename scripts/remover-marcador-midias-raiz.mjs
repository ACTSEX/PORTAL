import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { AwsR2 } from './bootstrap-r2.mjs';

export const BUCKET = 'acts-public';
export const PREFIX = 'midias/';
export const MARKER_KEY = 'midias/clientes/manifesto.json';
export const CONFIRMATION = 'REMOVER-MARCADOR-MIDIAS-RAIZ';
export const REPORT_PATH = 'reports/media-marker-migration.json';

export async function migrate(mode = 'check', { env = process.env, remote, reportPath = env.REPORT_PATH || REPORT_PATH } = {}) {
  const report = { schemaVersion: 1, mode, bucket: BUCKET, prefix: PREFIX, key: MARKER_KEY, branch: env.GITHUB_REF_NAME || null, objectsUnderPrefix: [], writes: 0, deletes: 0, status: 'iniciado' };
  try {
    if (!['check', 'plan', 'apply'].includes(mode)) throw coded('MODE_INVALID');
    if (mode === 'check') { report.status = 'validado_localmente'; return save(reportPath, report); }
    if (mode === 'apply' && (env.GITHUB_REF !== 'refs/heads/main' || env.CONFIRMATION !== CONFIRMATION)) throw coded('APPLY_GUARD_FAILED');
    requireCredentials(env);
    const adapter = remote || new MigrationR2({ endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com` });
    const keys = adapter.list(BUCKET, PREFIX).sort();
    report.objectsUnderPrefix = keys;
    if (keys.length === 0) { report.status = 'ja_removido'; return save(reportPath, report); }
    if (keys.length !== 1 || keys[0] !== MARKER_KEY) throw coded('PREFIX_NOT_EMPTY', `PREFIX_NOT_EMPTY: encontrados ${keys.length} objeto(s)`);
    const body = adapter.get(BUCKET, MARKER_KEY);
    const marker = JSON.parse(body);
    if (!isEmptyBootstrapMarker(marker)) throw coded('MARKER_NOT_EMPTY_OR_UNKNOWN');
    report.bytes = Buffer.byteLength(body);
    report.sha256 = createHash('sha256').update(body).digest('hex');
    report.status = 'marcador_vazio_confirmado';
    if (mode === 'plan') return save(reportPath, report);
    adapter.deleteExact(BUCKET, MARKER_KEY);
    report.deletes = 1;
    report.status = 'marcador_removido';
    return save(reportPath, report);
  } catch (error) {
    report.status = 'bloqueado';
    report.errorCode = error.code || 'MIGRATION_FAILED';
    await save(reportPath, report);
    throw Object.assign(error, { report });
  }
}

function requireCredentials(env) { if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.CLOUDFLARE_ACCOUNT_ID) throw coded('CREDENTIALS_MISSING', 'Credenciais R2 ausentes'); }
function isEmptyBootstrapMarker(marker) { return marker && marker.estado === 'bootstrap' && marker.ambiente === 'nao-configurado' && Array.isArray(marker.objetos) && marker.objetos.length === 0; }
function coded(code, message = code) { return Object.assign(new Error(message), { code }); }
async function save(path, report) { await mkdir(dirname(resolve(path)), { recursive: true }); await writeFile(path, `${JSON.stringify(report, null, 2)}\n`); return report; }

export class MigrationR2 extends AwsR2 {
  list(bucket, prefix) { const r = this.command(['s3api', 'list-objects-v2', '--endpoint-url', this.endpoint, '--bucket', bucket, '--prefix', prefix, '--output', 'json']); return JSON.parse(r.stdout || '{}').Contents?.map((x) => x.Key) || []; }
  get(bucket, key) { const r = this.command(['s3api', 'get-object', '--endpoint-url', this.endpoint, '--bucket', bucket, '--key', key, '/dev/stdout']); return r.stdout; }
  deleteExact(bucket, key) { this.command(['s3api', 'delete-object', '--endpoint-url', this.endpoint, '--bucket', bucket, '--key', key]); }
}

if (process.argv[1]?.endsWith('remover-marcador-midias-raiz.mjs')) migrate(process.argv[2] || 'check').then((x) => console.log(JSON.stringify(x, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
