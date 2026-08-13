# ACTS — deploy e operações

## Estado operacional atual

`wrangler.toml` define o Worker `portal`, entrada `worker/index.js`, domínio principal e wildcard. Os bindings configurados são `ACTS_DB`, `ACTS_MEDIA`, `ACTS_DATA` e `ACTS_QUEUE`. O Worker atual entrega o portal público, projeções em `ACTS_DATA` e o minisite compartilhado; painel, admin e demais jornadas não devem ser presumidos implementados.

Os ambientes nomeados são `development`, `staging` e `production`. Atualmente eles repetem os mesmos nomes e identificador de recursos no arquivo de configuração. **Não presumir isolamento físico:** antes de qualquer escrita remota, confirmar no dashboard/CLI que staging e produção apontam para recursos distintos; se não apontarem, interromper a operação.

## Comandos oficiais

| Ação | Comando |
|---|---|
| instalar exatamente o lockfile | `npm ci` |
| desenvolvimento local | `npm run dev` |
| lint/sintaxe | `npm run lint` |
| testes | `npm test` |
| validar tipos/bindings gerados | `npm run build` |
| validar todos os ambientes Cloudflare | `npm run cf:validate` |
| migration D1 local | `npm run db:migrate:local` |
| migration D1 staging | `npm run db:migrate:staging` |
| migration D1 produção | `npm run db:migrate:production` |
| deploy staging | `npm run deploy:staging` |
| deploy produção | `npm run deploy:production` |

Use a versão de Wrangler fixada no lockfile via scripts/npm; não dependa de instalação global.

## Fluxo de mudança e deploy

1. Criar branch a partir da `main` atual e manter uma mudança coesa.
2. Revisar código, migrations, bindings, segurança e documentação afetada.
3. Executar lint, testes e validação Cloudflare.
4. Abrir PR no GitHub; CI deve reproduzir instalação e checks.
5. Em staging isolado, criar backup, aplicar migrations, implantar o Worker e executar smoke.
6. Validar rotas, autenticação/autorização, D1, uploads R2, publicação, Queue, cache e logs.
7. Promover a mesma revisão para produção, aplicar migrations deliberadamente e observar métricas.
8. Interromper ou reverter aplicação/artefatos ao exceder limiares definidos. Não reverter migration destrutivamente sem plano de dados.

Nenhum deploy de aplicação aplica migration por efeito colateral. Não implantar diretamente de uma estação com alterações não commitadas.

## Migrations, backfills e recuperação

- Nunca editar migration já aplicada; criar migration forward-only revisada.
- Testar instalação limpa e evolução a partir do estado anterior.
- Antes de migration/backfill remoto: confirmar conta, ambiente, database ID sem expô-lo, backup exportável e restauração ensaiada.
- Backfills são dry-run por padrão, paginados, retomáveis, idempotentes, sem PII no relatório e executados primeiro em staging.
- Para falha de aplicação, reimplantar versão conhecida. Para derivados, republicar do D1 ou voltar o manifest para objeto íntegro anterior. Para dados, restaurar somente com procedimento ensaiado e autorização explícita.
- R2 público é derivado; manter retenção suficiente para rollback e remover versões antigas por política, nunca durante a ativação.

## Queue e cache

Consumers devem validar versão e tamanho, deduplicar, limitar tentativas, usar backoff e registrar falhas definitivas. Ack só após efeito confirmado; reentrega não pode duplicar cobrança nem corromper publicação. Uma rotina de reconciliação pode recuperar diferenças D1/publicação quando necessária, sem substituir o fluxo normal.

Conteúdo de `ACTS_DATA` usa cabeçalhos HTTP e Cloudflare Edge Cache. Objetos versionados admitem cache longo/imutável; manifests/pointers usam cache curto. Validar `HIT`/`MISS`, `ETag`, `Cache-Control`, invalidação e ausência de dados privados. **Não provisionar ou documentar KV como dependência.**

## Segurança operacional

- Secrets ficam em Cloudflare Secrets ou mecanismo aprovado; nunca em Git, logs, argumentos ou artefatos públicos.
- Aplicar menor privilégio a usuários, tokens, bindings e buckets; separar acesso de deploy, banco e leitura de logs.
- Validar toda entrada; usar SQL parametrizado; proteger sessão, CSRF quando aplicável, CORS, rate limits e webhooks assinados/idempotentes.
- Uploads exigem limite, MIME/conteúdo permitido, chave gerada pelo servidor e bucket/política corretos.
- Respostas não expõem stack, SQL, caminho interno ou payload de provider. Logs mascaram tokens e PII.
- Conteúdo Blogger futuro é não confiável e processado no navegador com CSP, allowlists, sanitização e sandbox; não habilitar fallback backend silencioso.
- Rotacionar credencial comprometida, revogar acesso, preservar evidência segura e registrar incidente e ações corretivas.

## Testes e gates

A base mínima por PR é lint + testes afetados + suíte completa quando viável + validação de configuração. Mudanças críticas exigem casos negativos e integração realista para autenticação/autorização, migrations, publicação, pagamentos, Queue e cache. Antes de produção, validar em staging:

- instalação/evolução do D1 e restore;
- reentrega/idempotência da Queue e falha parcial de publicação;
- allowlist das projeções e ausência de acesso público ao D1;
- headers, XSS, SQLi, CSRF, uploads, webhooks e rate limits;
- upgrade/downgrade, cobrança e smoke das jornadas implementadas;
- rollback do Worker e de manifests.

## Observabilidade e resposta

Logs estruturados devem incluir ambiente, versão/commit, `requestId`/`correlationId`, operação, duração, resultado e código de erro seguro. Monitorar taxa/latência HTTP, erros, D1, Queue (backlog, retries e falhas definitivas), R2, cache hit ratio, publicação atrasada e webhooks/pagamentos.

Alertas precisam de limiar, responsável e ação. Para incidente: conter, preservar correlação, identificar versão/ambiente, decidir rollback ou correção, reconciliar filas/publicação/pagamentos, validar recuperação e registrar causa e prevenção. Nunca “corrigir” diretamente produção sem trilha auditável.
