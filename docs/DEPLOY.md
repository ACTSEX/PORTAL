# ACTS — deploy e operações

## Deploy manual de produção pelo GitHub

O workflow **Deploy Production** é o único fluxo automatizado de produção e só responde a disparo manual (`workflow_dispatch`). Ele não roda em push, pull request ou merge. A execução aceita exclusivamente a branch `main`, exige que o operador digite exatamente `DEPLOY`, usa Node 22 e é serializada pelo grupo `production-deploy`. O job usa o GitHub Environment `production`, que pode receber regras de aprovação posteriormente em **Settings → Environments → production**, sem exigir reviewers na configuração inicial.

### Configuração pelo navegador

No repositório GitHub, abra **Settings → Secrets and variables → Actions → New repository secret** e cadastre, sem registrar os valores nesta documentação:

- `CLOUDFLARE_API_TOKEN`: API Token de menor privilégio criado na Cloudflare; não use Global API Key.
- `CLOUDFLARE_ACCOUNT_ID`: identificador da conta Cloudflare que contém os recursos oficiais.

O workflow passa esses valores somente como variáveis protegidas ao Wrangler. Não os grava em arquivo, não os imprime e não concede permissão de escrita no repositório.

### Permissões mínimas do token Cloudflare

Crie um API Token limitado à conta do ACTS e, quando aplicável, à zone `acompanhantesex.com`. Para as operações presentes no workflow e os bindings declarados pelo deploy, habilite:

- **Account → Workers Scripts → Edit**, para publicar o Worker `portal`;
- **Account → D1 → Edit**, necessário para listar/aplicar migrations e exportar `portal-db`;
- **Account → Workers R2 Storage → Edit**, porque o deploy valida/configura os bindings R2 `acts-dados` e `acts-midias` do script;
- **Account → Workers Queues → Edit**, porque o deploy valida/configura producer e consumer da Queue `acts-queues`;
- **Zone → Workers Routes → Edit**, restrito à zone `acompanhantesex.com`, porque o `wrangler deploy` reconcilia as rotas de produção declaradas no projeto;
- **Zone → Zone → Read**, restrito à mesma zone, para que o Wrangler localize a zone usada pela rota wildcard.

Não conceda permissões globais de administração, KV, Pages, DNS ou acesso a outras contas/zones. Se a interface da Cloudflare apresentar nomenclatura diferente, confira a documentação vigente de permissões de API Tokens antes de criar o token; não substitua o token por uma Global API Key.

### Executar sem terminal

1. Abra o GitHub e acesse **ACTSEX/PORTAL**.
2. Clique em **Actions**.
3. Selecione **Deploy Production**.
4. Clique em **Run workflow**.
5. Escolha a branch **main**.
6. No campo de confirmação, digite exatamente **DEPLOY**.
7. Opcionalmente, informe o slug de um minisite real e seguro, sem o domínio.
8. Clique em **Run workflow**.
9. Acompanhe todos os gates até o resumo da execução. Um gate vermelho significa que o deploy não foi concluído e exige investigação; não tente contorná-lo.

O fluxo instala o lockfile, executa lint, testes, audit e `git diff --check`, confirma a identidade Cloudflare, lista migrations pendentes e então exporta o D1 para `/tmp`. O export precisa existir e ser não vazio. Ele é enviado como artifact privado da execução, com nome contendo o run ID e retenção de **14 dias**, sem imprimir o SQL. Somente depois desse backup o workflow aplica migrations pelo mecanismo oficial, confirma que nenhuma permanece pendente, gera types, executa dry-run e publica o Worker.

Depois do deploy, o workflow testa HTTPS e resposta não vazia no domínio principal, exige os headers centrais de segurança e confirma `Cache-Control: no-store` em `/admin` e `/painel`. Se um slug for informado, também testa o minisite e exige HTTP 404 para `/admin`, `/painel` e `/api/admin/` naquele hostname. Sem slug, essa parte é explicitamente marcada como `SKIP MINISITE SMOKE`; nenhuma conta ou dado artificial é criado.

O backup artifact contém dados de produção: mantenha o acesso ao repositório e às Actions restrito, baixe-o apenas para recuperação autorizada e remova-o antecipadamente se a política operacional exigir. A retenção no GitHub não substitui um processo de restauração ensaiado. O workflow não cria recursos Cloudflare, usuários, pagamentos, boosts, objetos R2 ou mensagens de Queue; valida os bindings existentes durante dry-run/deploy.

## Bootstrap manual do primeiro administrador

Não há e-mail, senha ou conta administrativa no código. Depois de validar por canal seguro uma conta ativa existente, um operador autorizado pode executar manualmente, no ambiente correto e sob change management, `UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'`. Deve haver dupla conferência do ambiente e do ID; a aplicação nunca aceita `role` do frontend. A ETAPA 11 não executa essa alteração nem migrations remotas.

## Estado operacional atual

`wrangler.toml` define o Worker `portal`, entrada `worker/index.js` e somente a rota
`acompanhantesex.com/api/*`. Os bindings configurados são `ACTS_DB`,
`ACTS_MEDIA`, `ACTS_DATA` e `ACTS_QUEUE`. Portal, painel/admin shells, assets e
minisite compartilhado são estáticos; o Worker atende dados operacionais privados
e o consumer publica projeções. O wildcard público é configurado fora do Worker,
pelas Rules descritas em `docs/cloudflare/ETAPA-12D-FINAL-RULES.md`.

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
- Para falha de aplicação, reimplantar versão conhecida. Para derivados, republicar do D1. Para dados, restaurar somente com procedimento ensaiado e autorização explícita.
- R2 público é derivado e cada publicação substitui a projeção canônica correspondente.

### Backup e rollback de produção

Antes de consultar ou aplicar migrations, autentique o Wrangler por um token de menor privilégio e registre a lista pendente com `wrangler d1 migrations list ACTS_DB --remote --env production`. Exporte o banco para um caminho seguro, fora do Git, com `wrangler d1 export ACTS_DB --remote --env production --output <caminho-seguro.sql>` e valide que o arquivo existe, não está vazio e tem acesso restrito. Só então use `npm run db:migrate:production`; consulte novamente a lista e faça apenas queries estruturais/read-only de validação.

Migration D1 é forward-only e não oferece rollback automático. Em falha de aplicação, reverta o Worker para a versão previamente registrada, sem desfazer o schema. Recuperação de dados/schema exige autorização, janela de manutenção e restauração ensaiada do export; não improvise `DROP`, reset ou SQL inverso. Projeções públicas em `ACTS_DATA` podem ser reconstruídas pelo publisher canônico a partir do D1.

### Smoke e diagnóstico pós-deploy

Após o deploy, registre status, headers e comportamento sem gravar dados reais: `GET /`, uma cidade pública conhecida, `/painel`, `/admin`, `/api/me`, assets e um minisite autorizado. Repita `/admin`, `/painel`, `/api/me` e `/api/admin/...` no hostname do minisite e confirme bloqueio. Verifique `no-store` nas áreas privadas, CSP/headers centrais e ausência de CORS aberto. D1/R2/Queue devem ser verificados por bindings, logs e fluxos normais; não envie publicação artificial nem crie objetos de teste em conta de cliente.

Use `wrangler tail portal --env production` para logs HTTP e do consumer. No dashboard, acompanhe falhas/exceções do Worker, backlog/retries da Queue, erros `publisher.*`/`queue.consume` para publicação e operações de webhook/pagamento. Logs devem permanecer estruturados e sanitizados; nunca copie cookies, tokens, payload financeiro ou dados de clientes para o registro do incidente.

## Queue e cache

Consumers devem validar versão e tamanho, deduplicar, limitar tentativas, usar backoff e registrar falhas definitivas. Ack só após efeito confirmado; reentrega não pode duplicar cobrança nem corromper publicação. Uma rotina de reconciliação pode recuperar diferenças D1/publicação quando necessária, sem substituir o fluxo normal.

Conteúdo de `ACTS_DATA` usa cabeçalhos HTTP e Cloudflare Edge Cache. As projeções em keys estáveis usam cache curto e revalidação. Validar `HIT`/`MISS`, `ETag`, `Cache-Control` e ausência de dados privados. **Não provisionar ou documentar KV como dependência.**

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
- rollback do Worker e republicação das projeções.

## Observabilidade e resposta

Logs estruturados devem incluir ambiente, versão/commit, `requestId`/`correlationId`, operação, duração, resultado e código de erro seguro. Monitorar taxa/latência HTTP, erros, D1, Queue (backlog, retries e falhas definitivas), R2, cache hit ratio, publicação atrasada e webhooks/pagamentos.

Alertas precisam de limiar, responsável e ação. Para incidente: conter, preservar correlação, identificar versão/ambiente, decidir rollback ou correção, reconciliar filas/publicação/pagamentos, validar recuperação e registrar causa e prevenção. Nunca “corrigir” diretamente produção sem trilha auditável.

## Configuração de pagamentos (Etapa 9)

Configure por ambiente, usando secrets do Worker para `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN`, e uma variável segura `ASAAS_BASE_URL` com URL HTTPS do ambiente Asaas escolhido. Não armazene valores desses secrets no repositório e não execute configuração remota como parte de validações locais. Cadastre o webhook Asaas para `POST /api/webhooks/asaas` com o mesmo token de autenticação.
