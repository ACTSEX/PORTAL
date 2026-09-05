import { readFile } from 'node:fs/promises';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
for(const p of ['config/diretorios.json','config/categorias.json','config/formulario-cadastro-privado.json','config/formulario-publico.json','config/planos.json','config/temas.json','config/mensagens.json'])await load(p);
const examples=['identidade-privada','operacional-privado','avisos','auditoria','perfil-publico','site-publico','midias','manifesto','shard','financeiro'];
for(const name of examples){const data=await load(`examples/${name}.json`);const schema=await load(`schemas/${name}.schema.json`);for(const key of schema.required)if(!(key in data))throw new Error(`${name}: propriedade ausente ${key}`)}
const dirs=await load('config/diretorios.json');if(JSON.stringify(dirs.diretorios.map(x=>x.id))!==JSON.stringify(['mulheres','homens','transex']))throw new Error('Diretórios inválidos');
const finance=await load('examples/financeiro.json');if(finance.habilitado||finance.ambiente!=='desativado'||finance.cobrancaAutomatica)throw new Error('Asaas deve permanecer desativado');
console.log('JSONs válidos; exemplos satisfazem propriedades obrigatórias dos schemas');
