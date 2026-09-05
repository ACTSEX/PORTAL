import test from 'node:test';import assert from 'node:assert/strict';import {readFile,access} from 'node:fs/promises';
test('documentos e shells existem',async()=>{for(const p of ['ARQUITETURA.md','docs/TESTES-E-ACEITE.md','frontend/painel/index.html','frontend/publico/index.html'])await access(p)});test('hierarquia e isolamento são normativos',async()=>{const s=await readFile('ARQUITETURA.md','utf8');assert.match(s,/CIDADE → DIRETÓRIO → CATEGORIA → ANÚNCIO/);assert.match(s,/não existe feed global/)});

import { assertClientMediaKey, privatePaths, publicPaths } from '../src/paths.js';
import { localInventory } from '../scripts/bootstrap-r2.mjs';

test('toda mídia pública e privada pertence ao prefixo da cliente',()=>{
  for(const key of [privatePaths.midia('cli_1','fotos','001.webp'),privatePaths.upload('cli_1','upload','001.webp'),publicPaths.midia('cli_1','videos','001.mp4')]) assert.equal(assertClientMediaKey(key,'cli_1'),key);
  for(const bad of ['midias/clientes/cli_1/fotos/001.webp','fotos/001.webp','clientes/outra/midias/fotos/001.webp']) assert.throws(()=>assertClientMediaKey(bad,'cli_1'),/MEDIA_KEY_OUTSIDE_CLIENT/);
});

test('bootstrap nunca materializa midias na raiz pública',async()=>{
  const objects=await localInventory();
  assert.equal(objects.length,7);
  assert.ok(objects.every(x=>x.bucket!=='acts-public'||!x.key.startsWith('midias/')));
});
