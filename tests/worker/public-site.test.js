import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import worker from '../../worker/index.js';
import { portalJs } from '../../frontend/portal/app.js';

const publicGet = (path='/', host='imobiliarista.net', env={}) => worker.fetch(new Request(`https://${host}${path}`), env);
async function files(directory){const output=[];for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())output.push(...await files(path));else output.push(path)}return output}

test('defense in depth rejects every public GET before D1, R2 or Queue', async () => {
  const calls={d1:0,r2Read:0,r2Write:0,queue:0};
  const poisonR2={get(){calls.r2Read++;throw new Error('R2 read reached')},head(){calls.r2Read++;throw new Error('R2 read reached')},put(){calls.r2Write++;throw new Error('R2 write reached')},delete(){calls.r2Write++;throw new Error('R2 write reached')}};
  const env={ACTS_DB:{prepare(){calls.d1++;throw new Error('D1 reached')}},ACTS_DATA:poisonR2,ACTS_MEDIA:poisonR2,ACTS_QUEUE:{send(){calls.queue++;throw new Error('Queue reached')}}};
  for(const [host,path] of [['imobiliarista.net','/'],['imobiliarista.net','/cidade'],['imobiliarista.net','/assets/portal.js'],['imobiliarista.net','/data/cities/londrina'],['imobiliarista.net','/media/id'],['ana.imobiliarista.net','/'],['www.imobiliarista.net','/'],['www.imobiliarista.net','/api/me']]) assert.equal((await publicGet(path,host,env)).status,404,`${host}${path}`);
  assert.deepEqual(calls,{d1:0,r2Read:0,r2Write:0,queue:0});
});

test('production Worker route is canonical API-only with no wildcard, www or worker-first', async()=>{
  const config=await readFile(new URL('../../wrangler.toml',import.meta.url),'utf8');
  assert.equal((config.match(/pattern = "imobiliarista\.net\/api\/\*"/g)||[]).length,2);
  assert.match(config,/workers_dev = false/);
  assert.doesNotMatch(config,/pattern = "(?:\*\.|www\.)?imobiliarista\.net\/\*"|www\.imobiliarista\.net\/api\/\*|custom_domain\s*=\s*true|run_worker_first\s*=\s*true/);
  const source=await readFile(new URL('../../worker/index.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/frontend\/|apexResponse|mediaResponse|minisiteResponse|readPublicProjection/);
});

test('public artifacts are materialized and browser reads R2 custom domains',async()=>{
  for(const path of ['public/index.html','public/assets/portal.css','public/assets/portal.js','public/painel/index.html','public/admin/index.html','public/minisite-shell/index.html','public/assets/minisite.js']) assert.ok((await readFile(new URL(`../../${path}`,import.meta.url),'utf8')).length>50,path);
  assert.match(portalJs,/https:\/\/dados\.imobiliarista\.net\/cities\//);
  const mini=await readFile(new URL('../../public/assets/minisite.js',import.meta.url),'utf8');
  assert.match(mini,/location\.hostname/); assert.match(mini,/dados\.imobiliarista\.net\/tenants\//); assert.match(mini,/profile\.json/);
  assert.doesNotMatch(mini,/innerHTML|\/api\/|ACTS_DB|ACTS_QUEUE/);
});

test('generated public HTML and code never publish a www canonical URL',async()=>{
  const paths=[...await files('public'),...await files('frontend'),'business/publishing.js'];
  for(const path of paths){const source=await readFile(path,'utf8');assert.doesNotMatch(source,/https:\/\/www\.imobiliarista\.net/i,path)}
  const home=await readFile('public/index.html','utf8');assert.match(home,/<link rel="canonical" href="https:\/\/imobiliarista\.net\/">/);
});

test('edge WWW redirect is documented as 308 preserving path/query and never simulated by Worker',async()=>{
  const rules=await readFile(new URL('../../docs/cloudflare/ETAPA-12D-FINAL-RULES.md',import.meta.url),'utf8');
  assert.match(rules,/http\.host eq "www\.imobiliarista\.net"/);assert.match(rules,/status: `308`/);assert.match(rules,/http\.request\.uri\.path/);assert.match(rules,/preserve query string: \*\*enabled\*\*/);
  for(const expected of ['https://imobiliarista.net/','https://imobiliarista.net/cidade/sao-paulo','https://imobiliarista.net/cidade/sao-paulo?x=1','https://imobiliarista.net/api/me'])assert.match(rules,new RegExp(expected.replace(/[.?]/g,'\\$&')));
});
