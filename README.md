# Portal ACTS

O Portal ACTS é uma plataforma Edge-first para publicação e consulta de
conteúdo. O projeto usa Cloudflare Pages e Pages Functions, mantendo o D1 como
fonte de verdade, o KV para cache e artefatos derivados e o R2 para arquivos.
Processamento assíncrono é encaminhado por Cloudflare Queues.

## Arquitetura resumida

O núcleo técnico segue uma arquitetura de microkernel: o Core fornece somente
infraestrutura comum, enquanto regras de negócio pertencem aos módulos. A
interface é composta por componentes e templates. No fluxo de publicação,
alterações persistem primeiro no D1 e geram artefatos para KV/R2 e cache; por
isso, a navegação pública não depende de consultas diretas ao banco.

Consulte [`docs/`](docs/) para decisões, contratos e regras especializadas. O
[`docs/INDEX.md`](docs/INDEX.md) é o ponto de entrada da documentação, e
[`docs/CONSTITUTION.md`](docs/CONSTITUTION.md) define as regras de maior
precedência.

## Requisitos

- Node.js 22 ou mais recente;
- npm 10 ou mais recente;
- conta Cloudflare para validações ou deploys remotos;
- recursos D1, KV, R2 e Queue configurados separadamente por ambiente antes de
  qualquer deploy.

Não versione credenciais. Autentique o Wrangler pelo mecanismo oficial da
Cloudflare e mantenha segredos apenas no ambiente Cloudflare ou em arquivos
locais ignorados pelo Git.

## Instalação

```bash
npm ci
```

O lockfile fixa a resolução usada pela instalação reproduzível.

## Comandos

| Comando | Finalidade |
|---|---|
| `npm run dev` | Inicia o ambiente local do Cloudflare Pages. |
| `npm run lint` | Valida arquivos JavaScript quando eles existirem. |
| `npm test` | Executa os testes nativos do Node.js. |
| `npm run build` | Gera os tipos dos bindings e valida a configuração de desenvolvimento. |
| `npm run cf:validate` | Valida a configuração dos três ambientes Cloudflare. |
| `npm run db:migrate:local` | Aplica migrations no D1 local. |
| `npm run db:migrate:staging` | Aplica migrations no D1 de staging. |
| `npm run db:migrate:production` | Aplica migrations no D1 de produção. |
| `npm run deploy:staging` | Publica o diretório de saída no Pages de staging. |
| `npm run deploy:production` | Publica o diretório de saída no Pages de produção. |

Os comandos de migrations passam a encontrar arquivos a partir do lote que
introduz o schema. Deploys exigem a troca dos identificadores documentais do
`wrangler.toml` pelos identificadores dos recursos provisionados fora deste
repositório.

## Estrutura principal

- `docs/`: documentação oficial e fonte das decisões do projeto;
- `app/`: Core, módulos, gateways e apresentação, introduzidos por lotes;
- `functions/`: adaptadores HTTP e tarefas do Pages Functions;
- `database/`: schema e migrations D1;
- `site/`: frontend público e saída do Pages;
- `tests/`: suítes automatizadas por fronteira funcional.

Diretórios de implementação são criados somente no lote que entrega seu
primeiro arquivo real; portanto, podem ainda não existir no estado atual.

## Licença

Software proprietário. Consulte [`LICENSE`](LICENSE).
