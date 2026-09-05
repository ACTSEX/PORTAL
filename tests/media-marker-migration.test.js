import test from 'node:test';import assert from 'node:assert/strict';
import {migrate,MARKER_KEY,CONFIRMATION}from'../scripts/remover-marcador-midias-raiz.mjs';
const marker=JSON.stringify({estado:'bootstrap',ambiente:'nao-configurado',objetos:[]});
const env={R2_ACCESS_KEY_ID:'x',R2_SECRET_ACCESS_KEY:'y',CLOUDFLARE_ACCOUNT_ID:'z',GITHUB_REF:'refs/heads/main',CONFIRMATION};
function remote(keys=[MARKER_KEY],body=marker){return{deleted:[],list(){return keys},get(){return body},deleteExact(bucket,key){this.deleted.push([bucket,key])}}}
test('migração é inerte por padrão e plan confirma marcador vazio sem excluir',async()=>{assert.equal((await migrate()).deletes,0);const r=remote();assert.equal((await migrate('plan',{env,remote:r})).status,'marcador_vazio_confirmado');assert.equal(r.deleted.length,0)});
test('migração falha se existir qualquer outro objeto sob midias/',async()=>{for(const keys of [[],[MARKER_KEY,'midias/clientes/x/foto.webp']])await assert.rejects(migrate('apply',{env,remote:remote(keys)}),/PREFIX_NOT_EMPTY/)});
test('migração recusa conteúdo desconhecido e apply sem confirmação',async()=>{await assert.rejects(migrate('apply',{env,remote:remote([MARKER_KEY],'{}')}),/MARKER_NOT_EMPTY/);await assert.rejects(migrate('apply',{env:{...env,CONFIRMATION:'errada'},remote:remote()}),/APPLY_GUARD/)});
test('apply protegido exclui exclusivamente a chave exata',async()=>{const r=remote();const result=await migrate('apply',{env,remote:r});assert.deepEqual(r.deleted,[['acts-public',MARKER_KEY]]);assert.equal(result.deletes,1)});
