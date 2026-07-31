# ACTS Portal — Plano mestre de implantação

**Versão:** 1.1
**Status:** Oficial
**Unidade de avanço:** lote funcional

## 1. Governança

O ROADMAP controla a ordem do projeto por lotes funcionais. Vários arquivos do mesmo lote podem ser implementados, testados, commitados e revisados na mesma PR; cada arquivo conserva sua responsabilidade individual. Um lote só começa depois que o anterior estiver implementado, testado, revisado, aprovado e mesclado na `main`.

Um lote pode ser dividido em A, B ou C quando a revisão deixar de ser segura. Limite inicial recomendado por PR: até 20 arquivos alterados, aproximadamente 2.000 linhas líquidas de implementação, uma fronteira funcional, testes do lote incluídos e nenhuma refatoração alheia. Complexidade pode reduzir esse limite.

São proibidos placeholders, arquivos vazios, TODOs substitutivos, pastas vazias, antecipação de lote futuro, arquivos fora do `TREE.md`, regra de negócio ou SQL de domínio no Core, regra comercial em Pages Functions e consulta pública direta ao D1. Testes acompanham seus lotes; o Lote 18 completa apenas validações transversais.

**Definição de concluído comum (DoD):** todos os arquivos do lote completos; testes próprios aprovados; revisão e critérios específicos satisfeitos; documentação/contratos atualizados; nenhum segredo ou pendência; PR aprovada e mergeada na `main`. Só então o lote indicado como seguinte fica desbloqueado.

## 2. Matriz executiva

| Lote/PR | Fronteira | Arquivos estimados | Depende de | Desbloqueia |
|---|---|---:|---|---|
| 1 | Raiz e Cloudflare | 6 | Lote 0 documental | 2 |
| 2 | Fundação/observabilidade | 4 | 1 | 3 |
| 3 | Eventos/persistência | 5 | 2 | 4 |
| 4 | Segurança/roteamento | 3 | 3 | 5 |
| 5 | Render/publicação/composição | 4 | 4 | 6 |
| 6 | Banco e schemas | 11 | 5 | 7 |
| 7 | Identidade/assinaturas | 6 | 6 | 8 |
| 8 | Catálogo/mídia | 5 | 7 | 9 |
| 9 | Descoberta/navegação | 6 | 8 | 10 |
| 10 | Relacionamento | 5 | 9 | 11 |
| 11 | Pagamentos/integrações | 5 | 10 | 12 |
| 12 | Gestão/inteligência | 5 | 11 | 13 |
| 13 | Publicação/SEO | 3 | 12 | 14A |
| 14A | Componentes básicos | 7 | 13 | 14B |
| 14B | Componentes compostos | 7 | 14A | 15 |
| 15 | Layouts/templates | 11 | 14B | 16A |
| 16A | Middleware e APIs | 9 | 15 | 16B |
| 16B | Painel/jobs/webhook | 7 | 16A | 17 |
| 17 | Frontend público | 10 | 16B | 18 |
| 18 | Aceite transversal | 4 novos + ajustes necessários | 17 | produção aceita |

Contagens incluem testes novos do lote e excluem ajustes documentais ocasionais. O lockfile conta como arquivo do Lote 1. Sublotes 14 e 16 mantêm uma fronteira de revisão segura; o Lote 15 permanece abaixo de 20 arquivos e não precisa divisão inicial.

## 3. Lotes detalhados

### LOTE 1 — Raiz e ambiente Cloudflare

- **Objetivo:** tornar build, teste e desenvolvimento reproduzíveis e declarar bindings/ambientes Cloudflare.
- **Arquivos e responsabilidades:** `.gitignore` (exclusões); `LICENSE` (licença); `README.md` (uso do repositório); `package.json` (ESM, engines, dependências e scripts de dev/build/lint/test/migration/deploy); `package-lock.json` (resolução imutável); `wrangler.toml` (Pages, D1, KV, R2, Queue e ambientes, sem segredos).
- **Dependências:** plano documental aprovado; nomes reais dos recursos Cloudflare confirmados antes do merge.
- **Testes/checks:** instalação limpa; scripts de lint/test/build; `wrangler` valida configuração nos três ambientes.
- **Aceite:** nenhum segredo; lockfile corresponde ao manifesto; execução local documentada; bindings separados por ambiente.
- **Riscos:** bindings incorretos e dependências incompatíveis com Workers.
- **DoD/desbloqueio:** DoD comum e toolchain reproduzível; desbloqueia Lote 2.

### LOTE 2 — Core: fundação e observabilidade

- **Objetivo:** fornecer configuração, utilitários puros e logging seguro.
- **Arquivos:** `app/core/config.js` (config/bindings); `app/core/helpers.js` (utilitários técnicos); `app/core/logger.js` (logs estruturados/redação); `tests/core/config-helpers-logger.test.js` (contratos, defaults, pureza, correlação e sigilo).
- **Dependências:** Lote 1.
- **Testes:** unitários em runtime compatível com Workers, incluindo ausência de segredo nos logs.
- **Aceite/riscos:** configuração falha cedo e helpers não carregam domínio; risco de vazamento e globais ocultas.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 3.

### LOTE 3 — Core: eventos e persistência

- **Objetivo:** padronizar eventos e acesso técnico a D1, KV/cache e R2.
- **Arquivos:** `app/core/events.js` (Event Bus); `app/core/db.js` (primitivas D1 parametrizadas); `app/core/cache.js` (cache/KV); `app/core/storage.js` (R2); `tests/core/events-persistence.test.js` (unidade e integração dos bindings).
- **Dependências:** Lote 2.
- **Testes:** emissão/consumo, falhas, parametrização, TTL/invalidação e objetos R2 com doubles locais.
- **Aceite/riscos:** nenhuma query de domínio; D1 continua fonte; risco de consistência eventual e chave/TTL incorretos.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 4.

### LOTE 4 — Core: segurança e roteamento

- **Objetivo:** autenticar, autorizar tecnicamente e despachar requisições com respostas/erros seguros sem arquivos genéricos adicionais.
- **Arquivos:** `app/core/auth.js` (identidade e políticas comuns); `app/core/router.js` (rota/método/despacho); `tests/core/auth-router.test.js` (tokens, negação padrão, métodos, parâmetros e erros públicos).
- **Dependências:** Lote 3.
- **Testes:** unitários e casos negativos de autenticação, autorização, entrada e exposição de falhas.
- **Aceite/riscos:** deny-by-default, nenhum negócio no Router; riscos de bypass e enumeração.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 5.

### LOTE 5 — Core: renderização, publicação e composição

- **Objetivo:** compor a aplicação e gerar derivados sem violar D1 como fonte.
- **Arquivos:** `app/core/render.js` (composição visual); `app/core/publish.js` (pipeline de artefatos); `app/core/app.js` (bootstrap/registro explícito); `tests/core/render-publish-app.test.js` (ordem, falha, idempotência e composição).
- **Dependências:** Lote 4.
- **Testes:** unitários e integração do fluxo D1→evento→publicação→KV/R2/cache.
- **Aceite/riscos:** nenhuma descoberta mágica, publicação após persistência, saída segura; riscos de artefato parcial e cache obsoleto.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 6.

### LOTE 6 — Banco de dados e schemas

- **Objetivo:** estabelecer modelo D1 inicial e contratos JSON versionados.
- **Arquivos:** `database/schema.sql` (snapshot canônico); `database/migrations/0001_initial_schema.sql` (criação inicial imutável); seis schemas `app/schemas/listing.schema.json`, `app/schemas/user.schema.json`, `app/schemas/profile.schema.json`, `app/schemas/plan.schema.json`, `app/schemas/settings.schema.json`, `app/schemas/theme.schema.json`; `tests/database/schema-migrations.test.js` (aplicação limpa, reaplicação controlada e equivalência); `tests/schemas/schemas.test.js` (válidos/inválidos e versão).
- **Dependências:** Lote 5 e modelo de domínio aprovado. Sem seed de produção.
- **Testes:** migration em D1 local vazio, constraints/índices, snapshot e validação de cada schema.
- **Aceite/riscos:** nomes/constraints explícitos, migration revisada e estratégia de restauração; riscos de perda e incompatibilidade futura.
- **DoD/desbloqueio:** pode exceder 9 arquivos contando testes (11 no total); se passar 2.000 linhas, dividir 6A banco/6B schemas sem alterar ordem. Desbloqueia Lote 7.

### LOTE 7 — Identidade e assinaturas

- **Objetivo:** implementar contas, perfis profissionais, planos e ciclo de assinatura.
- **Arquivos:** `app/modules/Auth.js`, `app/modules/Users.js`, `app/modules/Imobiliaristas.js`, `app/modules/Plans.js`, `app/modules/Subscriptions.js`; `tests/modules/identity-subscriptions.test.js`.
- **Dependências:** Lote 6.
- **Testes:** cadastro/login, permissões de domínio, perfil, limites de plano e transições/idempotência de assinatura.
- **Aceite/riscos:** dados pessoais protegidos e eventos contratuais; riscos de elevação de privilégio e transição inválida.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 8.

### LOTE 8 — Catálogo de anúncios e mídia

- **Objetivo:** gerir categorias, anúncios, biblioteca e upload seguro.
- **Arquivos:** `app/modules/Categories.js`, `app/modules/Listings.js`, `app/modules/Media.js`, `app/modules/Upload.js`; `tests/modules/catalog-media.test.js`.
- **Dependências:** Lote 7.
- **Testes:** CRUD/regra de publicação, ownership, tipo/tamanho de upload, metadados e falhas R2.
- **Aceite/riscos:** SQL no módulo, upload validado e eventos após commit; riscos de arquivo malicioso e registro órfão.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 9.

### LOTE 9 — Descoberta e navegação

- **Objetivo:** busca, geolocalização, mapas, favoritos e comparação.
- **Arquivos:** `app/modules/Search.js`, `app/modules/Geolocation.js`, `app/modules/Maps.js`, `app/modules/Favorites.js`, `app/modules/Compare.js`; `tests/modules/discovery.test.js`.
- **Dependências:** Lote 8.
- **Testes:** filtros/ordenação, coordenadas/consentimento, links de mapa, idempotência de favoritos e limites de comparação.
- **Aceite/riscos:** dados públicos vêm de índices publicados; riscos de privacidade geográfica e resultados obsoletos.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 10.

### LOTE 10 — Relacionamento

- **Objetivo:** contatos, leads, avaliações e notificações.
- **Arquivos:** `app/modules/Contacts.js`, `app/modules/Leads.js`, `app/modules/Reviews.js`, `app/modules/Notifications.js`; `tests/modules/relationship.test.js`.
- **Dependências:** Lote 9.
- **Testes:** anti-spam, consentimento, transições de lead, moderação/rating e preferências/retry de notificação.
- **Aceite/riscos:** PII minimizada e auditoria; riscos de abuso, duplicação e envio indevido.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 11.

### LOTE 11 — Pagamentos e integrações

- **Objetivo:** cobrança e integração externa isolada com Asaas.
- **Arquivos:** `app/modules/Payments.js` (regras financeiras), `app/modules/Integrations.js` (catálogo/configuração de integrações), `app/gateways/Asaas.js` (protocolo Asaas), `tests/modules/payments-integrations.test.js`, `tests/gateways/asaas.contract.test.js`.
- **Dependências:** Lote 10.
- **Testes:** valores/estados/idempotência, timeout/retry, tradução de payload e contrato sandbox/double; nenhum segredo em log.
- **Aceite/riscos:** caminho único do gateway, assinatura e idempotência prontas para webhook; riscos de cobrança dupla e divergência externa.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 12.

### LOTE 12 — Gestão e inteligência

- **Objetivo:** painéis, métricas, relatórios e recursos de IA governados.
- **Arquivos:** `app/modules/Dashboard.js`, `app/modules/Analytics.js`, `app/modules/Reports.js`, `app/modules/AI.js`; `tests/modules/management-intelligence.test.js`.
- **Dependências:** Lote 11.
- **Testes:** autorização, agregações, exportação, limites/timeout e tratamento de conteúdo/PII para IA.
- **Aceite/riscos:** resultados rastreáveis e acesso mínimo; riscos de custo, alucinação, exposição e consultas pesadas.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 13.

### LOTE 13 — Publicação e SEO

- **Objetivo:** aplicar regras de domínio para publicar conteúdo e metadados SEO.
- **Arquivos:** `app/modules/Publish.js`, `app/modules/Seo.js`; `tests/modules/publishing-seo.test.js`.
- **Dependências:** Lote 12.
- **Testes:** publicação incremental/idempotente, sitemap/canonical/metadados e invalidação.
- **Aceite/riscos:** módulo decide o quê; Core executa como; risco de conteúdo obsoleto ou indexação indevida.
- **DoD/desbloqueio:** DoD comum; desbloqueia 14A.

### LOTE 14A — Componentes visuais básicos

- **Objetivo:** primitives acessíveis e reutilizáveis.
- **Arquivos:** `app/components/Alert.js`, `app/components/Breadcrumb.js`, `app/components/Button.js`, `app/components/Card.js`, `app/components/Grid.js`, `app/components/Menu.js`; `tests/components/components.test.js` (arquivo compartilhado iniciado aqui).
- **Dependências:** Lote 13.
- **Testes:** render, escaping, estados, teclado, ARIA e contratos de propriedades dos componentes 14A.
- **Aceite/riscos:** nenhum domínio/D1; risco de inconsistência e acessibilidade.
- **DoD/desbloqueio:** DoD comum; desbloqueia 14B.

### LOTE 14B — Componentes visuais compostos

- **Objetivo:** completar componentes interativos/estruturados.
- **Arquivos:** `app/components/Form.js`, `app/components/Gallery.js`, `app/components/Modal.js`, `app/components/Pagination.js`, `app/components/Table.js`, `app/components/Tabs.js`; atualização de `tests/components/components.test.js` para cobrir 14B.
- **Dependências:** 14A.
- **Testes:** foco/teclado, validação visual, paginação, tabelas e mídia responsiva.
- **Aceite/riscos:** composição independente de layout; risco de foco preso e XSS em conteúdo.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 15.

### LOTE 15 — Layouts e templates

- **Objetivo:** compor todas as superfícies visuais autorizadas.
- **Arquivos:** layouts `app/layouts/public.js`, `app/layouts/panel.js`, `app/layouts/admin.js`; templates `app/templates/home.js`, `app/templates/listing.js`, `app/templates/listings.js`, `app/templates/profile.js`, `app/templates/location.js`, `app/templates/panel.js`, `app/templates/error.js`; `tests/rendering/layouts-templates.test.js`.
- **Dependências:** 14B.
- **Testes:** snapshot estrutural seletivo, escaping, estados vazios/erro, acessibilidade e zero acesso a D1.
- **Aceite/riscos:** dados chegam prontos; risco de acoplamento entre template e domínio.
- **DoD/desbloqueio:** 11 arquivos, sem divisão inicial; dividir 15A layouts/15B templates somente se complexidade superar limite. Desbloqueia 16A.

### LOTE 16A — Pages Functions: middleware e APIs

- **Objetivo:** expor adaptadores HTTP finos para domínios principais.
- **Arquivos:** `functions/_middleware.js`; `functions/api/auth.js`, `functions/api/listings.js`, `functions/api/users.js`, `functions/api/media.js`, `functions/api/payments.js`, `functions/api/publish.js`; `tests/functions/api.test.js`; `tests/contract/public-api.test.js` (contratos HTTP iniciado aqui).
- **Dependências:** Lote 15.
- **Testes:** método, parsing, auth, status/headers, contratos, rate limits aplicáveis e delegation spy.
- **Aceite/riscos:** nenhuma regra comercial; riscos de CORS, bypass e contrato inconsistente.
- **DoD/desbloqueio:** DoD comum; desbloqueia 16B.

### LOTE 16B — Pages Functions: painel, administração, webhook e jobs

- **Objetivo:** orquestrar superfícies protegidas e entradas assíncronas.
- **Arquivos:** `functions/painel/[[path]].js`, `functions/admin/[[path]].js`, `functions/webhooks/asaas.js`, `functions/scheduled.js`; `tests/functions/panel-admin.test.js`, `tests/functions/webhooks-scheduled.test.js`; atualização de `tests/contract/public-api.test.js`.
- **Dependências:** 16A.
- **Testes:** RBAC, assinatura/replay/idempotência do webhook, cron idempotente, retries e respostas seguras.
- **Aceite/riscos:** Functions somente orquestram; riscos de webhook forjado, replay e job duplicado.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 17.

### LOTE 17 — Frontend público estático

- **Objetivo:** entregar navegação pública estática, responsiva e sem consulta direta ao D1.
- **Arquivos:** `site/index.html`, `site/404.html`, `site/robots.txt`, `site/css/app.css`, `site/js/app.js`, `site/js/router.js`, `site/js/api.js`, `site/js/search.js`; `tests/site/public-frontend.test.js`; atualização de `tests/contract/public-api.test.js` para o consumidor público.
- **Dependências:** 16B.
- **Testes:** HTML/links, módulos ES, busca, navegação/404, robots, acessibilidade, performance budget e inspeção que proíbe binding/query D1.
- **Aceite/riscos:** somente APIs/artefatos publicados; nenhum diretório de asset vazio. Imagem/ícone só entra após nome e necessidade definidos no TREE; riscos de cache, SEO e progressive enhancement.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 18.

### LOTE 18 — Testes, segurança, implantação e aceite final

- **Objetivo:** validar transversalmente o portal completo, ensaiar deploy/rollback e obter aceite operacional; não concentrar testes funcionais já entregues.
- **Arquivos novos:** `tests/integration/publication-flow.test.js`, `tests/e2e/critical-flows.test.js`, `tests/security/security.test.js`; atualizações de `tests/contract/public-api.test.js` e dos documentos operacionais apenas se os ensaios revelarem ajustes.
- **Dependências:** Lote 17 e todos os testes anteriores verdes.
- **Testes/checks:** suíte completa unitária/integrada/contrato/Functions/E2E; autenticação/autorização, SQLi, XSS, CSRF, upload e webhook; migrations em banco limpo e cópia restaurável; `wrangler` para development/staging/production; publicação incremental; prova automatizada de zero consulta pública direta ao D1; carga/performance; backup/restore; deploy gradual, smoke, rollback e observabilidade/alertas.
- **Aceite:** CI verde; segurança sem achado crítico/alto; migrations e restauração validadas; staging aprovado; runbooks de deploy, rollback e incidente executáveis; logs correlacionados sem segredos; SLOs/alertas ativos; proprietário registra aceite final antes de produção.
- **Riscos:** diferença entre staging/produção, perda de dados, regressão de cache, alarmes ausentes; mitigar com canário, backup, rollback ensaiado e monitoramento pós-deploy.
- **DoD/desbloqueio:** evidências arquivadas, aceite humano registrado e DoD comum; desbloqueia implantação de produção e operação contínua, não um lote de código posterior.

## 4. Dependências e publicação

A cadeia obrigatória é linear: `1→2→3→4→5→6→7→8→9→10→11→12→13→14A→14B→15→16A→16B→17→18`. Dependências técnicas internas não autorizam antecipação. Cada PR parte da `main` já contendo o lote anterior.

A publicação é incremental: ambientes locais no Lote 1; infraestrutura e pipeline técnico nos Lotes 3–5; regras de publicação no 13; endpoints no 16; consumidor público no 17; ensaio integral, staging, rollback e aceite no 18. Nenhum merge ou deploy é autorizado por este documento sem os gates correspondentes.

## 5. Situação do Lote 0

Este replanejamento é exclusivamente documental. Na `main` auditada, os 40 arquivos rastreados são documentos e `app/core/config.js` não existe. Nenhum código, diretório de implementação, migration, teste ou asset foi criado pelo Lote 0. Após revisão, aprovação e merge desta documentação, o Lote 1 — e não um arquivo isolado — será o primeiro lote desbloqueado.
