import { readdir } from 'node:fs/promises'; import { spawnSync } from 'node:child_process';
async function walk(d){const out=[];for(const e of await readdir(d,{withFileTypes:true})){const p=`${d}/${e.name}`;if(e.isDirectory())out.push(...await walk(p));else if(p.endsWith('.js')||p.endsWith('.mjs'))out.push(p)}return out}
const files=(await Promise.all(['src','scripts','tests','frontend'].map(walk))).flat();for(const f of files){const r=spawnSync(process.execPath,['--check',f],{stdio:'inherit'});if(r.status)process.exit(r.status)}console.log(`Lint sintático: ${files.length} arquivos`);
