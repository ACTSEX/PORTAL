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
| 6 | Banco e schemas | 10 | 5 | 7 |
| 7 | Identidade/assinaturas | 6 | 6 | 8 |
| 8 | Catálogo/mídia | 5 | 7 | 9 |
| 9 | Descoberta/navegação | 6 | 8 | 9A |
| 9A | Adequação da Arquitetura 2.0 | Ajustes em caminhos existentes | 9 | 10 |
| 10 | Relacionamento | 5 | 9A | 11 |
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
- **Testes:** unitários e integração do fluxo D1 confirmado→Queue→Publisher→R2→Edge Cache.
- **Aceite/riscos:** nenhuma descoberta mágica, publicação após persistência, saída segura; riscos de artefato parcial e cache obsoleto.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 6.

### LOTE 6 — Banco de dados e schemas

- **Objetivo:** estabelecer modelo D1 inicial e contratos JSON versionados.
- **Arquivos:** `database/schema.sql` (snapshot canônico); `database/migrations/0001_initial_schema.sql` (criação inicial imutável); seis schemas `app/schemas/listing.schema.json`, `app/schemas/user.schema.json`, `app/schemas/profile.schema.json`, `app/schemas/plan.schema.json`, `app/schemas/settings.schema.json`, `app/schemas/theme.schema.json`; `tests/database/schema-migrations.test.js` (aplicação limpa, reaplicação controlada e equivalência); `tests/schemas/schemas.test.js` (válidos/inválidos e versão).
- **Dependências:** Lote 5 e modelo de domínio aprovado. Sem seed de produção.
- **Testes:** migration em D1 local vazio, constraints/índices, snapshot e validação de cada schema.
- **Aceite/riscos:** nomes/constraints explícitos, migration revisada e estratégia de restauração; riscos de perda e incompatibilidade futura.
- **DoD/desbloqueio:** possui 10 arquivos contando testes; se passar 2.000 linhas, dividir 6A banco/6B schemas sem alterar ordem. Desbloqueia Lote 7.

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
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 9A.

### LOTE 10 — Relacionamento

- **Objetivo:** contatos, leads, avaliações e notificações.
- **Arquivos:** `app/modules/Contacts.js`, `app/modules/Leads.js`, `app/modules/Reviews.js`, `app/modules/Notifications.js`; `tests/modules/relationship.test.js`.
- **Dependências:** Lote 9A.
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
- **Aceite/riscos:** JSON unificada versionada da cidade e artefatos publicados no R2/Edge; nenhum diretório de asset vazio. Imagem/ícone só entra após nome e necessidade definidos no TREE; riscos de cache, SEO e progressive enhancement.
- **DoD/desbloqueio:** DoD comum; desbloqueia Lote 18.

### LOTE 18 — Testes, segurança, implantação e aceite final

- **Objetivo:** validar transversalmente o portal completo, ensaiar deploy/rollback e obter aceite operacional; não concentrar testes funcionais já entregues.
- **Arquivos novos:** `tests/integration/publication-flow.test.js`, `tests/e2e/critical-flows.test.js`, `tests/security/security.test.js`; atualizações de `tests/contract/public-api.test.js` e dos documentos operacionais apenas se os ensaios revelarem ajustes.
- **Dependências:** Lote 17 e todos os testes anteriores verdes.
- **Testes/checks:** suíte completa unitária/integrada/contrato/Functions/E2E; autenticação/autorização, SQLi, XSS, CSRF, upload e webhook; migrations em banco limpo e cópia restaurável; `wrangler` para development/staging/production; publicação incremental; prova automatizada de zero consulta pública ao D1, zero leitura pública no KV e zero Worker na navegação normal; carga/performance; backup/restore; deploy gradual, smoke, rollback e observabilidade/alertas.
- **Aceite:** CI verde; segurança sem achado crítico/alto; migrations e restauração validadas; staging aprovado; runbooks de deploy, rollback e incidente executáveis; logs correlacionados sem segredos; SLOs/alertas ativos; proprietário registra aceite final antes de produção.
- **Riscos:** diferença entre staging/produção, perda de dados, regressão de cache, alarmes ausentes; mitigar com canário, backup, rollback ensaiado e monitoramento pós-deploy.
- **DoD/desbloqueio:** evidências arquivadas, aceite humano registrado e DoD comum; desbloqueia implantação de produção e operação contínua, não um lote de código posterior.

## 4. Dependências e publicação

A cadeia obrigatória é linear: `1→2→3→4→5→6→7→8→9→9A→10→11→12→13→14A→14B→15→16A→16B→17→18`. Dependências técnicas internas não autorizam antecipação. Cada PR parte da `main` já contendo o lote anterior.

A publicação é incremental: ambientes locais no Lote 1; infraestrutura e pipeline técnico nos Lotes 3–5; regras de publicação no 13; endpoints no 16; consumidor público no 17; ensaio integral, staging, rollback e aceite no 18. Nenhum merge ou deploy é autorizado por este documento sem os gates correspondentes.

## 5. Situação do Lote 0

O Lote 0 foi o replanejamento documental histórico. A auditoria atual comprova os Lotes 1 a 9 implementados e mesclados, com 49 caminhos não documentais rastreados. A Arquitetura 2.0 não invalida esse trabalho nem inicia o Lote 10.

---

## Arquitetura 2.0 — decisão vigente (2026-08-04)

Esta seção substitui qualquer descrição anterior incompatível neste documento. A evolução preserva os Lotes 1 a 9 já concluídos; ajustes de implementação dependem de necessidade concreta, autorização e lote futuro. Esta revisão é exclusivamente documental.

- Há **um único D1 operacional por ambiente**, única fonte de verdade relacional para usuários, anúncios, clientes, planos, assinaturas, pagamentos, configurações e demais dados oficiais. Não existe segundo D1 público. Toda mutação é validada e confirmada no D1 antes de publicar; derivados nunca se tornam fonte de verdade.
- O R2 é a origem oficial de JSONs públicos compilados, catálogos de cidades, manifests, mídia, imagens e demais artefatos públicos aprovados. Esses objetos são reconstruíveis do D1.
- O KV fica fora da navegação pública normal: visitantes não fazem `KV.get()` para catálogos e KV não origina os JSONs públicos. Seu uso limita-se a configuração, feature flags, coordenação, cache interno de baixo volume e metadados operacionais quando comprovado.
- Valem simultaneamente: `navegação pública normal = zero consultas ao D1`, `navegação pública normal = zero leituras no KV` e `navegação pública normal = zero Worker/Pages Function`. Pages entrega HTML, CSS e JavaScript; R2 com Cloudflare Edge Cache entrega JSON e mídia. Functions e Workers servem escrita, autenticação, administração, integrações e processamento privado.
- A unidade principal é **uma cidade = uma JSON pública unificada e versionada**. Ela reutiliza anunciantes por identificador e atende cidade, categorias, filtros, busca local, cards, detalhes, dados públicos de anunciantes, minisites e comparação. Não se adota como padrão JSON completa por anúncio, cliente ou minisite. Acesso direto a minisite resolve anunciante, cidade e versão, então reutiliza o catálogo da cidade.
- A JSON permanece unificada enquanto tamanho e carregamento medidos forem aceitáveis. Divisão por categoria, página, chunk, geografia ou outro grupo exige necessidade real, aprovação, poucas requisições e reutilização dos dados carregados.
- O Publisher produz projeções compactas, serializáveis, minificáveis, sem campos internos, dados privados ou duplicação evitável, adequadas a parsing e compressão HTTP no Edge. Otimização estrutural, minificação e compressão HTTP são etapas distintas; não se exige Brotli/Gzip manual sem validação futura.
- Catálogos usam nomes imutáveis versionados, como `cidades/londrina/catalogo-v145.json`. Um manifest estável, como `cidades/londrina/manifest.json`, informa ao menos versão, caminho vigente, atualização e integridade aplicável. O catálogo admite cache longo/imutável e o manifest cache curto. O manifest só muda após confirmação integral do novo objeto.
- R2 é origem e Edge Cache é a camada principal de entrega. JSON exige Cache Rules explícitas e validadas no domínio dos artefatos; hits devem atender o tráfego normal e apenas misses alcançam R2. Não há promessa de latência fixa.
- Cloudflare Queue é o transporte principal da publicação assíncrona, com desacoplamento, recompilação, retries, agrupamento e recuperação. Não substitui D1. O fluxo é `Painel → Function/Worker de escrita → módulo → D1 → evento → Queue → Publisher → JSON otimizada → R2 → Edge Cache → navegador`. Separadamente: escrita `Painel → backend privado → D1`; publicação `D1 confirmado → Queue → Publisher → R2`; leitura `Pages + Edge Cache + R2 → navegador`.
- Alterações marcam cidades afetadas. Uma janela curta, configurável e limitada agrega eventos da mesma cidade, preserva idempotência e trata chegadas durante compilação; não pode adiar indefinidamente. Só cidades afetadas são recompiladas e mudanças convergem quando possível. Cron é complementar para reconciliação, recuperação, manutenção, limpeza, auditoria e tarefas periódicas, nunca caminho obrigatório de cada alteração.
- Falha de publicação não reverte o negócio confirmado: D1 permanece verdadeiro. Publicação é repetível/idempotente, suporta republicação e retenção temporária de versões para rollback; falha em R2 não aponta manifest a arquivo parcial.
- O navegador prioriza cache HTTP, memória, Cache Storage quando necessário, IndexedDB para persistência estruturada e `localStorage` somente para pequenos metadados/preferências. A JSON completa não tem `localStorage` como armazenamento principal.
- Catálogos contêm somente projeções públicas aprovadas: sem e-mail privado, dados administrativos, tokens, pagamentos, endereço privado não autorizado ou coordenada precisa proibida.

### Painel, lote explícito e progresso

O painel mantém alterações pendentes preferencialmente em IndexedDB. O rascunho sobrevive quando possível a reload/fechamento, mas não é fonte de verdade, autorização nem substituto de validação. O fluxo é `editar localmente → acumular → revisar pacote → Enviar alterações → backend validar e persistir lote`. A interface mostra contagem, resumo, botão explícito, processamento e resultado.

Decisão inicial: **até cinco envios de alterações por usuário por dia**, configurável e contado por ciclo explícito, não por item. Falha técnica após persistência confirmada não consome novo envio. A implementação definirá timezone, administradores, exceções, reset, auditoria e proteção contra repetição. Cada pacote preserva autenticação, autorização, propriedade, plano, domínio, concorrência/versão, transações e idempotência.

Progresso usa fatos do cliente ou estados confirmados pelo backend: preparando, validando, enviando, persistindo, alterações salvas, aguardando agregação, compilando, publicando, concluído, falha recuperável ou falha definitiva. Sem progresso numérico real, exibem-se etapas, nunca percentuais inventados.


## 6. Adequação à Arquitetura 2.0 antes do Lote 10

Os Lotes 1 a 9 permanecem concluídos e válidos. Antes de iniciar o Lote 10 é necessário um **lote futuro de adequação arquitetural**, ainda não implementado, porque o Core existente precede esta decisão. Ele deverá limitar o KV técnico, adaptar Publisher/Storage/Cache a catálogos de cidade versionados no R2, manifest atômico, Queue, otimização, publicação seletiva e janela de agregação. Também deverá introduzir no painel rascunho IndexedDB, pacote explícito, limite configurável e progresso real nos caminhos já autorizados pelo TREE. O escopo final deve ser aprovado antes do código; nenhum arquivo novo é autorizado por esta seção.

Impactos nos lotes futuros:

- **10–12:** eventos de mutação devem identificar cidades afetadas; superfícies privadas respeitam pacote, limite e privacidade.
- **13:** formaliza regras de publicação por cidade, Queue, versionamento, manifest, projeção pública compacta, idempotência e recuperação.
- **14–16:** componentes, layouts, templates e Functions suportam rascunho, revisão, envio explícito e estados reais; Cron permanece reconciliador.
- **17:** consome obrigatoriamente a JSON unificada e versionada da cidade via Pages + Edge Cache + R2, inclusive minisites, sem D1, KV ou Worker na leitura normal.
- **18:** prova ausência de D1/KV/Worker público, entrega Edge, Cache Rules, versão e integridade do manifest, somente cidades afetadas, retry/republicação/rollback e funcionamento do rascunho e envio em lote.

## 7. Fase 2 — Auditoria técnica dos Lotes (2026-08-04)

### 7.1 Decisão e ordem de continuidade

A auditoria determina a criação do **LOTE 9A — Adequação da Arquitetura 2.0**, obrigatório e imediatamente anterior ao Lote 10. A decisão é necessária porque os Lotes 1–9 continuam válidos e concluídos, porém o Core atual ainda publica derivados no KV, não integra o binding de Queue ao fluxo, não compila a projeção unificada por cidade nem ativa catálogo versionado por manifest no R2. Prosseguir diretamente ao relacionamento ampliaria contratos e eventos sobre uma base pública incompatível e transferiria risco aos Lotes 10–18.

A ordem técnica oficial passa a ser:

`1→2→3→4→5→6→7→8→9→9A→10→11→12→13→14A→14B→15→16A→16B→17→18`.

O próximo e único lote de implementação autorizado após o merge desta auditoria é o **Lote 9A**. O Lote 10 fica bloqueado até o 9A ser implementado, testado, revisado, aprovado e mesclado. Esta autorização não inicia implementação, migration, provisionamento ou configuração de produção.

### 7.2 Matriz de resultados

| Lote | Estado | Compatível | Ajuste necessário | Responsável futuro |
|---|---|---|---|---|
| 1 | concluído com adequação futura | Parcial | Validar bindings reais, consumer da Queue, domínio R2, Cache Rules e produção; manter D1 único. | 9A; 18 para aceite operacional |
| 2 | concluído com adequação futura | Parcial | Estender correlação segura de pacote, evento, Queue, compilação e versão, sem payload privado em logs. | 9A |
| 3 | concluído com adequação futura | Parcial | Integrar Queue, restringir KV ao técnico e orientar Storage ao R2 público versionado. | 9A |
| 4 | concluído com adequação futura | Parcial | Aplicar lote idempotente, concorrência e cota diária nas futuras APIs privadas; nenhuma API pública obrigatória. | 9A e 16A |
| 5 | concluído com adequação futura | Parcial | Substituir publicação pública via KV por pipeline por cidade, R2, manifest, agregação e recuperação. | 9A; regras de domínio no 13 |
| 6 | concluído com adequação futura | Parcial | Formalizar cidade canônica, auditoria/versão de publicação e separação explícita da projeção pública; migration só se comprovada. | 9A |
| 7 | concluído com adequação futura | Parcial | Definir cota de cinco pacotes/dia, timezone, exceções e projeção pública estrita de anunciante. | 9A; 11 para limites por plano |
| 8 | concluído com adequação futura | Parcial | Projetar catálogo unificado, URLs R2, eventos com cidades afetadas e efeitos de arquivo/exclusão. | 9A e 13 |
| 9 | concluído com adequação futura | Parcial | Fazer descoberta pública consumir catálogo local e eliminar dependência de consulta pública ao D1. | 9A e 17 |
| 9A | planejado e compatível | Sim | Executar a adequação transversal definida nesta auditoria, sem ampliar domínios de negócio. | 9A |
| 10 | bloqueado por adequação | Não até 9A | Separar contatos/leads/notificações privados de avaliações públicas e republicar cidades quando necessário. | 10, após 9A |
| 11 | planejado com ajuste | Sim, condicionado | Isolar finanças e webhooks da publicação; mudança de plano recalcula limites sem expor dados. | 11 |
| 12 | planejado com ajuste | Sim, condicionado | Relatórios privados no D1; IA/analytics assíncronos, limitados e sem contaminar catálogo. | 12 |
| 13 | planejado com ajuste | Sim, condicionado | Conservar regras de publicação/SEO; infraestrutura de Queue, R2, versão e manifest é antecipada ao 9A. | 13 |
| 14A | planejado com ajuste | Sim, condicionado | Incluir estados básicos de pendência, cota, envio e publicação em primitives existentes. | 14A |
| 14B | planejado com ajuste | Sim, condicionado | Compor resumo do pacote, progresso real, falha, recuperação e conflito nos componentes existentes. | 14B |
| 15 | planejado com ajuste | Sim, condicionado | Receber dados preparados para portal, cidade, anúncio, perfil, minisite e painel, sem D1 ou negócio. | 15 |
| 16A | planejado com ajuste | Sim, condicionado | APIs somente privadas/escrita; validar pacote, cota, idempotência, concorrência e uploads separados. | 16A |
| 16B | planejado com ajuste | Sim, condicionado | Painel IndexedDB, envio explícito, estados reais; jobs/Queue/retries e Cron reconciliador. | 16B |
| 17 | planejado com ajuste | Sim, condicionado | Ler JSON unificada via Edge/R2, resolver minisites e executar filtros/busca locais, sem backend público. | 17 |
| 18 | planejado com ajuste | Sim, condicionado | Provar todos os invariantes 2.0, segurança, rollback, lote, cota, progresso e desempenho móvel. | 18 |

### 7.3 Auditoria dos lotes concluídos

#### Lote 1 — Raiz e ambiente Cloudflare

1. **Objetivo original:** toolchain reproduzível e declaração de ambientes/bindings Cloudflare.
2. **Arquivos implementados:** `.gitignore`, `LICENSE`, `README.md`, `package.json`, `package-lock.json` e `wrangler.toml`.
3. **Compatibilidade 2.0:** parcial e evolutiva; há um D1 por ambiente e bindings D1, KV, R2 e producer de Queue, sem segundo D1, mas os identificadores são placeholders e não há consumer, domínio público do R2 ou Cache Rules validados.
4. **Responsabilidades válidas:** scripts, lockfile, separação development/staging/production, nomes estáveis de bindings e ausência de segredos.
5. **Adequação futura:** provisionar/validar recursos reais, consumer, domínio de artefatos, CORS/headers quando aplicável, Cache Rules/Edge Cache e configuração de produção.
6. **Risco atual:** configuração documental pode parecer implantável; sem consumer e Edge configurados, a publicação assíncrona e a leitura direta não fecham.
7. **Necessidade:** nenhuma mudança nesta auditoria; implementação obrigatória antes do Lote 10.
8. **Responsável:** Lote 9A; ensaio final no Lote 18.

#### Lote 2 — Fundação e observabilidade

1. **Objetivo original:** configuração, helpers puros e logging seguro.
2. **Arquivos implementados:** `app/core/config.js`, `helpers.js`, `logger.js` e `tests/core/config-helpers-logger.test.js`.
3. **Compatibilidade 2.0:** compatível como fundação; reconhece todos os bindings e protege segredos, mas não modela o ciclo completo de publicação.
4. **Responsabilidades válidas:** validação central, imutabilidade, correlação, redação profunda e logs estruturados.
5. **Adequação futura:** campos técnicos para `batchId`, idempotência, cidade afetada, mensagem Queue, tentativa, job, versão e artefato, sempre por identificadores e nunca por conteúdo privado.
6. **Risco atual:** correlação interrompida entre envio, persistência, Queue e Publisher dificulta auditoria/recuperação; metadados livres podem vazar dados.
7. **Necessidade:** evolução, sem invalidar contratos atuais.
8. **Responsável:** Lote 9A.

#### Lote 3 — Eventos e persistência

1. **Objetivo original:** Event Bus e adaptadores técnicos para D1, KV e R2.
2. **Arquivos implementados:** `app/core/events.js`, `db.js`, `cache.js`, `storage.js` e `tests/core/events-persistence.test.js`.
3. **Compatibilidade 2.0:** D1 e R2 são aproveitáveis; Event Bus é apenas interno/síncrono, Queue não está integrada e KV ainda admite visibilidade pública.
4. **Responsabilidades válidas:** eventos desacoplados, SQL parametrizado, cache não autoritativo, chaves R2 seguras e falhas sem segredo.
5. **Adequação futura:** evento pós-commit deve carregar envelope mínimo/cidade; Queue transporta publicação; KV fica técnico; Storage grava objetos imutáveis e manifest no R2.
6. **Risco atual:** listener em processo não oferece durabilidade/retry; `KV.get()` público e derivados em KV violariam o fluxo 2.0; Storage genérico não garante ativação atômica.
7. **Necessidade:** alteração obrigatória, preservando APIs úteis quando compatíveis.
8. **Responsável:** Lote 9A.

#### Lote 4 — Segurança e roteamento

1. **Objetivo original:** autenticação/autorização técnica e roteamento seguro.
2. **Arquivos implementados:** `app/core/auth.js`, `router.js` e `tests/core/auth-router.test.js`.
3. **Compatibilidade 2.0:** compatível para superfícies privadas; não implementa pacote, cota diária ou concorrência editorial, que são regras posteriores.
4. **Responsabilidades válidas:** deny-by-default, identidade/políticas técnicas, validação de origem, despacho e erros públicos redigidos.
5. **Adequação futura:** autenticar pacote explícito, aplicar idempotência e concorrência, contar no timezone definido, auditar exceções e manter leitura de catálogo fora do Router.
6. **Risco atual:** iniciar APIs de escrita sem esses gates permitiria duplicação, perda de atualização e evasão da cota.
7. **Necessidade:** Core continua válido; capacidades novas devem anteceder consumo pelos lotes futuros.
8. **Responsável:** Lote 9A para contrato/base; Lote 16A para adaptação HTTP.

#### Lote 5 — Renderização, publicação e composição

1. **Objetivo original:** renderizar, publicar derivados e compor o Core.
2. **Arquivos implementados:** `app/core/render.js`, `publish.js`, `app.js` e `tests/core/render-publish-app.test.js`.
3. **Compatibilidade 2.0:** Renderer/composição são reaproveitáveis; Publisher atual suporta KV/R2 genéricos, usa KV na publicação e o app não injeta Queue no Publisher.
4. **Responsabilidades válidas:** Renderer sem negócio, composição explícita, checksum/idempotência básica, persistência pós-render e relato de falha parcial.
5. **Adequação futura:** Queue, unidade cidade, projeção JSON unificada/compacta, chave imutável versionada, integridade, manifest estável ativado só após R2, cache headers, agregação limitada, recompilação seletiva, retry, republicação e rollback.
6. **Risco atual:** manifesto/cache no KV, ausência de atomicidade cidade-versão e falhas parciais podem expor artefato obsoleto/incompleto; publicação síncrona não é recuperável.
7. **Necessidade:** adequação obrigatória sem apagar a implementação existente; compactação é HTTP no Edge, não arquivo manual por antecipação.
8. **Responsável:** Lote 9A para mecanismo; Lote 13 para regras de domínio e SEO.

#### Lote 6 — Banco e schemas

1. **Objetivo original:** snapshot/migration D1 e seis contratos JSON versionados.
2. **Arquivos implementados:** `database/schema.sql`, migration `0001_initial_schema.sql`, seis schemas em `app/schemas/` e duas suítes correspondentes.
3. **Compatibilidade 2.0:** existe um único modelo D1; anúncios possuem cidade e há `publication_jobs`/idempotência, mas cidade é texto livre e o catálogo unificado/auditoria de versões não têm contrato dedicado.
4. **Responsabilidades válidas:** D1 canônico, constraints, índices, migration imutável, cidade derivável dos anúncios e separações públicas já oferecidas por projeções de módulos.
5. **Adequação futura:** normalização inequívoca de cidade, cidades afetadas, versão/manifest/checksum/tentativas e classificação de campos públicos/privados; avaliar se tabelas atuais bastam.
6. **Risco atual:** variações de cidade geram recompilações/chaves divergentes; `publication_jobs` pode não registrar todo o ciclo e schemas de entidade não impedem vazamento na projeção agregada.
7. **Necessidade:** análise no 9A; migration nova somente se a implementação demonstrar lacuna, nunca alteração da migration inicial.
8. **Responsável:** Lote 9A.

#### Lote 7 — Identidade e assinaturas

1. **Objetivo original:** contas, perfis profissionais, planos e assinaturas.
2. **Arquivos implementados:** `app/modules/Auth.js`, `Users.js`, `Imobiliaristas.js`, `Plans.js`, `Subscriptions.js` e teste do lote.
3. **Compatibilidade 2.0:** autenticação, permissões, auditoria por eventos e projeção pública de perfil são aproveitáveis; falta governança de cinco envios/dia.
4. **Responsabilidades válidas:** dados pessoais privados, documentos fora da projeção pública, termos de assinatura, transições e referências de mídia R2.
5. **Adequação futura:** limite inicial configurável por pacote/usuário/dia, timezone, reset, planos, administradores/exceções, auditoria e lista explícita dos campos públicos do anunciante.
6. **Risco atual:** sem cota/idempotência do pacote há abuso; projeção futura mal montada pode incluir e-mail, telefone privado, documentos, tokens ou dados administrativos.
7. **Necessidade:** evolução transversal; módulos concluídos permanecem válidos.
8. **Responsável:** Lote 9A; mudança de plano no Lote 11 respeita o contrato.

#### Lote 8 — Catálogo e mídia

1. **Objetivo original:** categorias, anúncios, mídia e upload seguro.
2. **Arquivos implementados:** `app/modules/Categories.js`, `Listings.js`, `Media.js`, `Upload.js` e teste do lote.
3. **Compatibilidade 2.0:** domínio e R2 de mídia são válidos; ainda não existe projeção pública unificada/versionada por cidade nem URL pública final.
4. **Responsabilidades válidas:** associação anúncio–proprietário–categoria–cidade, estados, ordenação, ownership, validação de upload e eventos pós-persistência.
5. **Adequação futura:** projetar somente campos públicos, referências reutilizadas de anunciante, URLs R2/Edge, imagens/minisites, cidade afetada em criar/editar/publicar/arquivar/excluir e tombstone/recompilação quando conteúdo sai.
6. **Risco atual:** eventos sem unidade canônica podem não recompilar todas as cidades; chave interna de mídia não é automaticamente URL pública; exclusões podem deixar catálogo obsoleto.
7. **Necessidade:** mecanismo no 9A e regras finais no 13.
8. **Responsável:** Lotes 9A e 13.

#### Lote 9 — Descoberta e navegação

1. **Objetivo original:** busca, geolocalização, mapas, favoritos e comparação.
2. **Arquivos implementados:** `app/modules/Search.js`, `Geolocation.js`, `Maps.js`, `Favorites.js`, `Compare.js` e teste do lote.
3. **Compatibilidade 2.0:** filtros, comparação, consentimento e projeções são reutilizáveis; Search/Favorites usam D1 em contexto de módulo e a superfície pública estática ainda não consome catálogo.
4. **Responsabilidades válidas:** busca determinística, geolocalização com consentimento/precisão reduzida, links de mapa sem SDK, favoritos privados por usuário e comparação sem campos internos.
5. **Adequação futura:** Search/Compare públicos operam sobre JSON em memória; favoritos autenticados permanecem privados e fora da navegação anônima; catálogo inclui campos de filtro/ordenação/mapa sem coordenada proibida.
6. **Risco atual:** reutilizar consulta D1 no frontend público violaria zero D1/Worker; precisão geográfica excessiva ameaça privacidade; catálogo insuficiente induziria APIs públicas obrigatórias.
7. **Necessidade:** nenhuma invalidação do lote; adaptar fronteira de consumo.
8. **Responsável:** 9A define contrato do catálogo; Lote 17 implementa consumidor local.

### 7.4 LOTE 9A — Adequação da Arquitetura 2.0

- **Objetivo:** adequar a infraestrutura já implementada ao fluxo oficial antes que novos domínios dependam dela, preservando o comportamento válido dos Lotes 1–9.
- **Escopo autorizado em caminhos existentes:** `app/core/config.js`, `logger.js`, `events.js`, `cache.js`, `storage.js`, `auth.js`, `publish.js` e `app.js`; módulos existentes somente onde seja indispensável emitir cidade/projeção; schemas/database apenas se lacuna comprovada exigir nova migration sequencial; testes existentes dos Lotes 2–9 e testes de integração já autorizados somente conforme a governança permitir no planejamento de implementação.
- **Responsabilidades:** integrar producer/consumer Queue ao Core; envelope correlacionado e idempotente; cidade afetada; agregação curta/configurável/limitada; compilação seletiva; JSON pública unificada, compacta e versionada; checksum/integridade; objeto imutável e manifest estável no R2 com ativação atômica; KV somente técnico; cache headers/Cache Rules e domínio R2/Edge; retries, concorrência, retenção/rollback, reconciliação; base segura de pacote explícito e cota de cinco envios/dia.
- **Dependências:** Lotes 1–9 e esta auditoria mesclada. Não depende do domínio de Relacionamento.
- **Testes:** fluxo `D1 confirmado→evento→Queue→agregação→Publisher→R2→manifest`; duplicação/reordenação/retry; evento durante compilação; somente cidades afetadas; falhas antes/depois do objeto; manifest nunca parcial; rollback/republicação; nenhuma leitura pública D1/KV/Worker; projeção sem PII; correlação sem payload; cota/timezone/exceções; contratos atuais preservados quando compatíveis.
- **Aceite:** R2 é a única origem dos catálogos/manifests; Queue é o transporte normal; manifest aponta somente objeto íntegro; KV não serve catálogo; publicação converge e é observável; Cache Rules são verificáveis; não há segundo D1; nenhuma regra comercial migra para o Core.
- **Riscos e mitigação:** duplicação/perda de mensagem (idempotência e reconciliação), corrida de versão (controle por cidade), avalanche (janela limitada), catálogo grande (medição antes de chunk), PII (allowlist/testes), cache obsoleto (manifest curto e objetos imutáveis), falha operacional (retenção e rollback).
- **DoD/desbloqueio:** plano de implementação detalha arquivos/migration sem criar caminhos preventivos; testes verdes; configuração staging validada; documentação atualizada; PR própria aprovada e mesclada. Desbloqueia o Lote 10.

Não são autorizados `queue.js`, `manifest.js`, `batch.js`, `draft.js`, `progress.js`, `compression.js` ou `edge-cache.js`. Queue/Event Bus cabem em `events.js`/`app.js`; compilação, versionamento, manifest, integridade e headers em `publish.js`; primitivas R2 em `storage.js`; KV técnico em `cache.js`; configuração/correlação nos arquivos já existentes. Rascunho e progresso pertencem aos caminhos planejados do painel/frontend. Nenhum caminho novo foi autorizado por esta auditoria.

### 7.5 Ajustes dos lotes futuros

#### Lote 10 — Relacionamento

- **Objetivo validado:** contatos, leads e notificações são privados; somente avaliação moderada e agregados expressamente públicos entram no catálogo.
- **Dependência/desbloqueio:** depende do 9A; desbloqueia 11. Alteração de avaliação pública emite cidade afetada e republica; contato, lead ou entrega de notificação não publica catálogo.
- **Testes/aceite:** anti-spam, consentimento, PII, ownership, moderação, idempotência e evento de cidade somente na transição pública correta.
- **Risco:** vazamento de contato/lead e republicação excessiva; mitigado por allowlist e eventos sem payload privado.

#### Lote 11 — Pagamentos e integrações

- **Objetivo validado:** finanças e Asaas permanecem privados e isolados do catálogo.
- **Dependência/desbloqueio:** depende de 10; desbloqueia 12. Webhook não integra leitura pública; mudança de plano pode recalcular cota futura por contrato, sem publicar evento financeiro.
- **Testes/aceite:** assinatura, replay, idempotência, cobrança duplicada, segredo/log, transição de plano/cota e prova de ausência no JSON.
- **Risco:** acoplamento financeiro–publicação; mitigado por eventos contratuais mínimos e consumidores separados.

#### Lote 12 — Gestão e inteligência

- **Objetivo validado:** dashboard, analytics e relatórios privados consultam D1; IA opera com dados minimizados, limite, custo e processamento assíncrono.
- **Dependência/desbloqueio:** depende de 11; desbloqueia 13. Nenhuma resposta analítica/IA entra na JSON sem regra pública futura aprovada.
- **Testes/aceite:** RBAC, consultas limitadas, exportação, timeout/cota/custo, anonimização e ausência de PII no prompt/log/catalogo.
- **Risco:** consulta cara e exfiltração; mitigado por agregação, filas próprias quando necessárias, budgets e allowlist.

#### Lote 13 — Publicação e SEO

- **Objetivo ajustado:** `Publish.js` decide quais cidades/artefatos publicar e `Seo.js` produz sitemap, canonical e metadados a partir da projeção pública; o Core 9A executa Queue, Publisher, JSON unificada, versão, manifest, R2, integridade, invalidação, rollback e seleção.
- **Dependência/desbloqueio:** depende de 12 e do 9A já concluído; desbloqueia 14A.
- **Testes/aceite:** cidade afetada, sitemap/canonical, noindex, metadados, idempotência, objeto/manifest íntegros, cache correto, exclusão/rollback e nenhuma PII.
- **Risco:** duplicar infraestrutura no módulo ou indexar versão indevida; mitigado por contrato “módulo decide o quê, Core executa como”.

#### Lotes 14A e 14B — Componentes

- **Objetivo ajustado:** 14A fornece primitives para pendência, cota, envio e estados; 14B compõe resumo do pacote, conflitos, progresso factual, falha e recuperação nos arquivos já planejados.
- **Dependência/desbloqueio:** 14A depende de 13 e desbloqueia 14B; 14B desbloqueia 15.
- **Testes/aceite:** acessibilidade, estado desabilitado pela cota, confirmação explícita, etapas reais sem percentual inventado, retry e preservação de conflito; componentes não persistem nem decidem regra.
- **Risco:** UI afirmar sucesso antes do backend; mitigado por estados confirmados e contratos de propriedades.

#### Lote 15 — Layouts e templates

- **Objetivo ajustado:** portal, cidade, anúncio, perfil, minisite e painel compõem dados preparados; `location.js` cobre cidade e `profile.js` cobre perfil/minisite sem novo caminho antecipado.
- **Dependência/desbloqueio:** depende de 14B; desbloqueia 16A.
- **Testes/aceite:** fixtures de projeção, acesso direto ao minisite, estados de painel, escaping e inspeção de zero D1/negócio.
- **Risco:** lógica de domínio/apresentação acoplada; mitigado por view-models e componentes puros.

#### Lote 16A — Middleware e APIs privadas

- **Objetivo ajustado:** APIs atendem autenticação, painel e escrita; navegação normal não exige API pública de catálogo.
- **Dependência/desbloqueio:** depende de 15; desbloqueia 16B.
- **Testes/aceite:** pacote validado no servidor, autenticação/ownership/plano, idempotência, concorrência, limite diário, transação, resposta correlacionada e upload separado quando necessário.
- **Risco:** bypass da cota ou pacote parcial; mitigado por gate central e persistência atômica conforme domínio.

#### Lote 16B — Painel, jobs, scheduled e webhook

- **Objetivo ajustado:** painel mantém rascunho preferencialmente em IndexedDB, revisa e envia lote explícito; exibe estados reais. Jobs consomem Queue/retries e publicam cidades; Cron apenas reconcilia, mantém e recupera.
- **Dependência/desbloqueio:** depende de 16A; desbloqueia 17.
- **Testes/aceite:** reload/offline do rascunho, conflito, pacote/cota, progresso por estados, retry/dead-letter/reconciliação, idempotência e webhook isolado.
- **Risco:** perda local, progresso fictício ou Cron virar caminho primário; mitigado por IndexedDB, protocolo de status e testes de fluxo.

#### Lote 17 — Frontend público

- **Objetivo ajustado:** Pages serve shell estático; navegador resolve cidade/manifest e consome diretamente a JSON unificada versionada e mídia pelo R2/Edge, reutilizando-a no portal e minisites.
- **Dependência/desbloqueio:** depende de 16B; desbloqueia 18.
- **Testes/aceite:** cache HTTP/memória; Cache Storage ou IndexedDB somente se medição justificar; deep link de minisite; filtros/busca/comparação locais; zero D1, KV, Worker/Function e API de catálogo no fluxo normal.
- **Risco:** payload excessivo, cache quebrado e fallback dinâmico; mitigado por budget móvel, manifest curto, catálogo imutável e teste de rede.

#### Lote 18 — Aceite transversal

- **Objetivo ajustado:** provar a Arquitetura 2.0 completa e operação recuperável.
- **Dependência/desbloqueio:** depende de 17 e de todos os gates anteriores; desbloqueia produção aceita.
- **Testes/aceite obrigatório:** zero D1/KV/Worker público; R2/Edge/Cache Rules; JSON/manifest/versionamento/integridade; segurança de dados; cidades afetadas/agregação/idempotência; falha/retry/reconciliação/rollback; lote/cota/progresso; acesso direto a minisites; compressão HTTP e budgets em dispositivo/rede móvel.
- **Risco:** diferença staging/produção ou evidência incompleta; mitigado por smoke/canário, headers/traces de cache, restore/rollback ensaiado e aceite humano.

### 7.6 Resultado estrutural

A auditoria atribui todas as responsabilidades a caminhos existentes ou já planejados e, portanto, **não altera o `TREE.md` nem autoriza novos caminhos**. Os inventários dos Lotes 1–9 e seus arquivos permanecem intactos; o Lote 10 não foi iniciado. Qualquer migration ou arquivo adicional que se revele indispensável no planejamento do 9A exige justificativa, atualização documental prévia e respeito à regra de um arquivo coeso por módulo.
