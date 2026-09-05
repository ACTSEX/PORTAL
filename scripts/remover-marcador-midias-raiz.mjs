import { createHash } from 'node:crypto';
import { AwsR2 } from './bootstrap-r2.mjs';

export const BUCKET = 'acts-public';
export const PREFIX = 'midias/';
export const MARKER_KEY = 'midias/clientes/manifesto.json';
export const CONFIRMATION = 'REMOVER-MARCADOR-MIDIAS-RAIZ';

export async function migrate(mode='check',{env=process.env,remote}={}) {
  if (!['check','plan','apply'].includes(mode)) throw new Error('Modo inválido');
  if (mode==='check') return {mode,key:MARKER_KEY,writes:0,deletes:0,status:'validado_localmente'};
  if (!env.R2_ACCESS_KEY_ID||!env.R2_SECRET_ACCESS_KEY||!env.CLOUDFLARE_ACCOUNT_ID) throw new Error('Credenciais R2 ausentes');
  const adapter=remote||new MigrationR2({endpoint:`https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`});
  const keys=adapter.list(BUCKET,PREFIX);
  if (keys.length!==1||keys[0]!==MARKER_KEY) throw new Error(`PREFIX_NOT_EMPTY: encontrados ${keys.length} objeto(s)`);
  const body=adapter.get(BUCKET,MARKER_KEY);
  const marker=JSON.parse(body);
  if (marker.estado!=='bootstrap'||marker.ambiente!=='nao-configurado'||!Array.isArray(marker.objetos)||marker.objetos.length!==0) throw new Error('MARKER_NOT_EMPTY_OR_UNKNOWN');
  const report={mode,key:MARKER_KEY,bytes:Buffer.byteLength(body),sha256:createHash('sha256').update(body).digest('hex'),objectsUnderPrefix:keys,writes:0,deletes:0,status:'marcador_vazio_confirmado'};
  if(mode==='plan')return report;
  if(env.GITHUB_REF!=='refs/heads/main'||env.CONFIRMATION!==CONFIRMATION)throw new Error('APPLY_GUARD_FAILED');
  adapter.deleteExact(BUCKET,MARKER_KEY);report.deletes=1;report.status='marcador_removido';return report;
}

export class MigrationR2 extends AwsR2 {
  list(bucket,prefix){const r=this.command(['s3api','list-objects-v2','--endpoint-url',this.endpoint,'--bucket',bucket,'--prefix',prefix,'--output','json']);return JSON.parse(r.stdout||'{}').Contents?.map(x=>x.Key)||[];}
  get(bucket,key){const r=this.command(['s3api','get-object','--endpoint-url',this.endpoint,'--bucket',bucket,'--key',key,'--output','json','/dev/stdout']);return r.stdout;}
  deleteExact(bucket,key){this.command(['s3api','delete-object','--endpoint-url',this.endpoint,'--bucket',bucket,'--key',key]);}
}

if(process.argv[1]?.endsWith('remover-marcador-midias-raiz.mjs'))migrate(process.argv[2]||'check').then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(e.message);process.exitCode=1});
