# Portal ACTS

O Portal ACTS é a aplicação Worker-first de `acompanhantesex.com`. O Worker
`portal` é a entrada HTTP; D1 mantém o estado autoritativo, R2 armazena mídia e
projeções reconstruíveis, Cloudflare Queues transporta publicação assíncrona e
o HTTP/Cloudflare Edge Cache distribui conteúdo público.

## Documentação normativa

Leia primeiro [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). A documentação
consolidada em [`docs/`](docs/) cobre arquitetura, banco, deploy e produto.
Consulte a seção **Estado atual** da arquitetura como fonte oficial para distinguir
capacidades operacionais, módulos isolados e itens planejados.

## Requisitos e instalação

- Node.js 22 ou mais recente;
- npm 10 ou mais recente;
- conta Cloudflare somente para operações remotas.

```bash
npm ci
```

## Comandos

| Comando | Finalidade |
|---|---|
| `npm run dev` | Inicia o Worker local com Wrangler. |
| `npm run lint` | Valida os arquivos JavaScript. |
| `npm test` | Executa os testes nativos do Node.js. |
| `npm run build` | Gera os tipos dos bindings de desenvolvimento. |
| `npm run cf:validate` | Valida os três ambientes Cloudflare. |
| `npm run db:migrate:local` | Aplica migrations no D1 local. |
| `npm run db:migrate:staging` | Aplica migrations no D1 de staging. |
| `npm run db:migrate:production` | Aplica migrations no D1 de produção. |
| `npm run deploy:staging` | Implanta o Worker de staging. |
| `npm run deploy:production` | Implanta o Worker de produção. |

## Estrutura principal

- `core/`: infraestrutura técnica independente do produto;
- `business/`: sete domínios consolidados e adapters externos estritamente necessários;
- `worker/`: entrada HTTP única (o consumer Cloudflare ainda não está conectado);
- `frontend/`: interfaces compartilhadas atualmente implementadas (portal e minisite);
- `database/`: schema e migrations D1;
- `tests/`: testes organizados por responsabilidade;
- `scripts/`: operações controladas;
- `docs/`: documentação normativa consolidada.

## Licença

Software proprietário. Consulte [`LICENSE`](LICENSE).
