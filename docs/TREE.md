# ACTS Portal — Árvore oficial

**Versão:** 1.1
**Status:** Oficial
**Auditoria:** 2026-08-04

## 1. Autoridade e regras

`TREE.md` é a fonte de verdade para a localização de arquivos. `ROADMAP.md` controla a ordem por **lote funcional**, não autoriza arquivos individualmente. Arquivos do mesmo lote preservam responsabilidades próprias e podem seguir juntos na implementação, testes, commit, revisão e PR.

Não são permitidos arquivos fora desta árvore, placeholders, arquivos ou pastas vazios, TODOs substituindo implementação, SQL de domínio no Core, regra comercial em Functions ou consulta pública direta ao D1. Novos caminhos exigem necessidade concreta e atualização documental prévia.

Legenda: **[E]** existente na `main` auditada; **[P]** planejado e ainda ausente. Itens futuros hipotéticos não são registrados.

## 2. Estado real e inventário existente

A `main` auditada contém **89 arquivos rastreados**: **40 documentos** e **49 caminhos não documentais** dos Lotes 1 a 9, incluindo raiz do produto, `app/`, `database/` e `tests/`. Diretórios internos do Git não integram o produto.

```text
PORTAL/
└── docs/ [E]
    ├── ADR_GUIDE.md [E]
    ├── API_GUIDELINES.md [E]
    ├── ARCHITECTURE.md [E]
    ├── AUTH.md [E]
    ├── BOOTSTRAP.md [E]
    ├── CACHE.md [E]
    ├── CHANGELOG.md [E]
    ├── CLOUDFLARE.md [E]
    ├── CODING_STANDARDS.md [E]
    ├── COMPONENTS.md [E]
    ├── CONFIG.md [E]
    ├── CONSTITUTION.md [E]
    ├── CONTRACTS.md [E]
    ├── CORE.md [E]
    ├── DB.md [E]
    ├── DEPLOYMENT.md [E]
    ├── ERRORS.md [E]
    ├── EVENTS.md [E]
    ├── EVENT_BUS.md [E]
    ├── INDEX.md [E]
    ├── INTERFACES.md [E]
    ├── LISTINGS.md [E]
    ├── LOGGER.md [E]
    ├── MODULES.md [E]
    ├── MODULE_SPECIFICATION.md [E]
    ├── MODULE_TEMPLATE.md [E]
    ├── OPERATIONS.md [E]
    ├── PLUGINS.md [E]
    ├── PROJECT.md [E]
    ├── PUBLISHER.md [E]
    ├── README.md [E]
    ├── RENDERER.md [E]
    ├── RFC_GUIDE.md [E]
    ├── ROADMAP.md [E]
    ├── ROUTER.md [E]
    ├── SCHEMAS.md [E]
    ├── SECURITY.md [E]
    ├── STORAGE.md [E]
    ├── TESTING.md [E]
    └── TREE.md [E]
```

## 3. Inventário planejado completo

Todos os itens abaixo são **[P]**. Diretórios aparecem apenas para organizar os arquivos reais listados.

```text
PORTAL/
├── .gitignore
├── LICENSE
├── README.md
├── package.json
├── package-lock.json
├── wrangler.toml
├── app/
│   ├── core/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── cache.js
│   │   ├── config.js
│   │   ├── db.js
│   │   ├── events.js
│   │   ├── helpers.js
│   │   ├── logger.js
│   │   ├── publish.js
│   │   ├── render.js
│   │   ├── router.js
│   │   └── storage.js
│   ├── modules/
│   │   ├── AI.js
│   │   ├── Analytics.js
│   │   ├── Auth.js
│   │   ├── Categories.js
│   │   ├── Compare.js
│   │   ├── Contacts.js
│   │   ├── Dashboard.js
│   │   ├── Favorites.js
│   │   ├── Geolocation.js
│   │   ├── Imobiliaristas.js
│   │   ├── Integrations.js
│   │   ├── Leads.js
│   │   ├── Listings.js
│   │   ├── Maps.js
│   │   ├── Media.js
│   │   ├── Notifications.js
│   │   ├── Payments.js
│   │   ├── Plans.js
│   │   ├── Publish.js
│   │   ├── Reports.js
│   │   ├── Reviews.js
│   │   ├── Search.js
│   │   ├── Seo.js
│   │   ├── Subscriptions.js
│   │   ├── Upload.js
│   │   └── Users.js
│   ├── gateways/Asaas.js
│   ├── components/
│   │   ├── Alert.js
│   │   ├── Breadcrumb.js
│   │   ├── Button.js
│   │   ├── Card.js
│   │   ├── Form.js
│   │   ├── Gallery.js
│   │   ├── Grid.js
│   │   ├── Menu.js
│   │   ├── Modal.js
│   │   ├── Pagination.js
│   │   ├── Table.js
│   │   └── Tabs.js
│   ├── layouts/
│   │   ├── admin.js
│   │   ├── panel.js
│   │   └── public.js
│   ├── templates/
│   │   ├── error.js
│   │   ├── home.js
│   │   ├── listing.js
│   │   ├── listings.js
│   │   ├── location.js
│   │   ├── panel.js
│   │   └── profile.js
│   └── schemas/
│       ├── listing.schema.json
│       ├── plan.schema.json
│       ├── profile.schema.json
│       ├── settings.schema.json
│       ├── theme.schema.json
│       └── user.schema.json
├── database/
│   ├── schema.sql
│   └── migrations/
│       ├── 0001_initial_schema.sql
│       └── 0002_payment_event_ordering.sql
├── functions/
│   ├── _middleware.js
│   ├── scheduled.js
│   ├── admin/[[path]].js
│   ├── painel/[[path]].js
│   ├── api/
│   │   ├── auth.js
│   │   ├── listings.js
│   │   ├── media.js
│   │   ├── payments.js
│   │   ├── publish.js
│   │   └── users.js
│   └── webhooks/asaas.js
├── site/
│   ├── 404.html
│   ├── index.html
│   ├── robots.txt
│   ├── css/app.css
│   └── js/
│       ├── api.js
│       ├── app.js
│       ├── router.js
│       └── search.js
└── tests/
    ├── core/
    │   ├── auth-router.test.js
    │   ├── config-helpers-logger.test.js
    │   ├── events-persistence.test.js
    │   └── render-publish-app.test.js
    ├── database/schema-migrations.test.js
    ├── schemas/schemas.test.js
    ├── modules/
    │   ├── catalog-media.test.js
    │   ├── discovery.test.js
    │   ├── identity-subscriptions.test.js
    │   ├── management-intelligence.test.js
    │   ├── payments-integrations.test.js
    │   ├── publishing-seo.test.js
    │   └── relationship.test.js
    ├── gateways/asaas.contract.test.js
    ├── components/components.test.js
    ├── rendering/layouts-templates.test.js
    ├── functions/
    │   ├── api.test.js
    │   ├── panel-admin.test.js
    │   └── webhooks-scheduled.test.js
    ├── site/public-frontend.test.js
    ├── integration/publication-flow.test.js
    ├── contract/public-api.test.js
    ├── e2e/critical-flows.test.js
    └── security/security.test.js
```

## 4. Responsabilidades por família

- **Raiz:** manifesto, lockfile, exclusões, licença, apresentação e configuração Cloudflare. Scripts técnicos de build, desenvolvimento, lint, teste, migrations e deploy ficam em `package.json`; nenhum arquivo genérico em `scripts/` foi justificado.
- **Core:** as responsabilidades individuais estão definidas em `CORE.md`; somente os 12 caminhos listados são oficiais.
- **Módulos:** um arquivo por domínio enumerado em `MODULES.md`; regras e SQL do domínio permanecem nele.
- **Gateway:** `app/gateways/Asaas.js` é o único caminho e somente traduz o protocolo externo. O caminho `app/modules/payments/gateways/Asaas.js` foi removido do plano.
- **Componentes/layouts/templates:** apresentação com dados prontos, sem banco ou negócio.
- **Schemas:** os seis contratos JSON versionados definidos em `SCHEMAS.md`.
- **Database:** `schema.sql` é o retrato canônico; `0001_initial_schema.sql` é a migration inicial imutável. Seed de produção foi excluído por ausência de necessidade aprovada.
- **Functions:** adaptadores finos para middleware, APIs, painel, administração, webhook e agendamento.
- **Site:** frontend público estático em HTML/CSS/ES Modules, consumindo somente APIs e artefatos publicados.
- **Testes:** nomes exatos acompanham os lotes; testes transversais ficam no Lote 18.

## 5. Auditoria de consistência

| Achado anterior | Resolução oficial |
|---|---|
| 89 caminhos existentes (40 documentos e 49 não documentais) | Estado real dos Lotes 1 a 9 explicitado no inventário. |
| Vários itens do TREE ausentes do ROADMAP | Todos os arquivos planejados agora pertencem a um lote/sub-lote. |
| Testes e migrations eram apenas diretórios sem nomes | Foram definidos 24 testes e `0001_initial_schema.sql`. |
| `images/` e `icons/` eram diretórios vazios planejados | Removidos; assets só serão nomeados após necessidade conhecida e atualização prévia. |
| Bootstrap, container, registry, loader e outros candidatos do Core apareciam apenas em `CORE.md` | Não aprovados como arquivos; responsabilidades consolidadas sem abstrações preventivas. |
| `request.js`, `response.js`, `errors.js`, `security.js`, `permissions.js`, `validator.js` tinham especificações, mas não caminho autorizado | Avaliados e rejeitados como arquivos independentes nesta implantação; requisitos permanecem distribuídos pelos limites responsáveis conforme `CORE.md`. |
| `renderer.js`/`publisher.js` versus `render.js`/`publish.js` | Caminhos oficiais continuam `app/core/render.js` e `app/core/publish.js`. |
| Dois caminhos para Asaas | Somente `app/gateways/Asaas.js`. |
| `seed.sql` sem necessidade | Removido do plano; não haverá seed de produção. |
| Bootstrap/Tailwind locais sem origem ou necessidade definida | Removidos; `site/css/app.css` é o único CSS planejado. |
| ROADMAP começava pelo Core antes da raiz e deixava entrega incompleta | Ordem refeita em 18 lotes cobrindo raiz, produto, testes e operação. |

Não foram encontrados arquivos duplicados no estado real. Nomes repetidos como `app/core/auth.js`, `app/modules/Auth.js` e `functions/api/auth.js` não são duplicação: respectivamente fornecem infraestrutura técnica, regra de domínio e adaptação HTTP.

## 6. Mudança da árvore

**Adicionados ao plano:** migration e todos os testes nomeados acima.
**Removidos do plano:** `database/seed.sql`, `site/css/bootstrap.min.css`, `site/css/tailwind.css`, diretórios vazios `site/images/` e `site/icons/`, além do caminho contraditório `app/modules/payments/gateways/Asaas.js`.
**Não adicionados após auditoria:** candidatos genéricos do Core relacionados em `CORE.md` e qualquer asset ainda sem necessidade conhecida.

## 7. Relação entre árvore e lotes

A árvore define **onde** cada arquivo pode existir; o ROADMAP define **em qual lote** será entregue. Uma pasta só nasce no commit que inclua seu primeiro arquivo real.

## 8. Responsabilidades dos diretórios

### 8.1 `docs/`

Contém visão, arquitetura, governança, contratos, especificações, implantação, operação e histórico. Documentação estrutural é atualizada antes da mudança correspondente; exemplos em documentos especializados não autorizam caminhos fora desta árvore.

### 8.2 `app/core/`

Contém somente infraestrutura técnica compartilhada. Seus 12 arquivos e responsabilidades estão definidos em `CORE.md`. Não contém domínio, SQL comercial nem integração específica. A divisão de responsabilidades técnicas rejeitadas como arquivos independentes permanece consolidada nos caminhos oficiais.

### 8.3 `app/modules/`

Contém regras, validações e SQL de cada domínio. Cada módulo começa coeso em um arquivo e só pode ser dividido após necessidade real registrada. Um módulo não acessa internos de outro; integração ocorre por eventos, contratos e APIs públicas.

### 8.4 `app/gateways/`

Isola protocolo externo sem regra comercial. `app/gateways/Asaas.js` é o único gateway aprovado e traduz autenticação, requests, responses e erros do Asaas. `Payments.js` conserva decisões financeiras. Não haverá interface genérica para provedores inexistentes.

### 8.5 `app/components/`

Contém elementos visuais reutilizáveis que recebem dados prontos. Componentes não consultam D1, não conhecem módulos, não decidem negócio e permanecem independentes de layout. Elemento sem reutilização fica no template correspondente.

### 8.6 `app/layouts/` e `app/templates/`

Layouts definem estruturas base pública, painel e administração. Templates compõem páginas específicas com layouts e componentes. Ambos recebem dados prontos, escapam apresentação e nunca acessam D1 diretamente.

### 8.7 `app/schemas/`

Contém os seis schemas JSON versionados para validação e contratos. Schemas não acessam banco nem substituem regra de domínio. Mudança incompatível requer versão/migration e atualização documental.

### 8.8 `database/`

`schema.sql` é o retrato canônico do D1, `migrations/0001_initial_schema.sql` é a migration inicial imutável e `0002_payment_event_ordering.sql` acrescenta o checkpoint externo estritamente necessário ao Lote 11. Toda mudança posterior exigirá novo nome sequencial previamente registrado. Migration aplicada não é editada. Seed de produção não está autorizado.

### 8.9 `functions/`

Contém Pages Functions finas: middleware, APIs, painel, administração, webhook e agendamento. Elas interpretam o protocolo, validam formato básico, autenticam/autorizam, delegam ao Core/módulo e normalizam resposta. Não contêm regra comercial nem SQL.

### 8.10 `site/`

Contém HTML, CSS e JavaScript ES Modules públicos. Consome a JSON unificada versionada por cidade e mídia via R2/Edge Cache; nunca D1, KV, Worker ou Pages Function na navegação pública normal. Imagens, ícones, fontes e outros assets somente entram com nome e necessidade concretos; diretório vazio é proibido.

### 8.11 `tests/`

Contém as 24 suítes nomeadas em `TESTING.md`, criadas junto ao primeiro teste real de cada fronteira. A organização por Core, database, schemas, modules, gateway, rendering, Functions, site, integração, contrato, E2E e segurança não autoriza pasta vazia.

### 8.12 Arquivos da raiz

| Arquivo | Responsabilidade |
|---|---|
| `.gitignore` | Excluir somente artefatos locais, segredos e saídas geradas. |
| `LICENSE` | Declarar termos de licença. |
| `README.md` | Apresentar instalação, desenvolvimento, testes e publicação. |
| `package.json` | Declarar ESM, runtime, dependências e scripts técnicos. |
| `package-lock.json` | Fixar resolução exata das dependências. |
| `wrangler.toml` | Declarar Pages e bindings por ambiente, sem segredo. |

Scripts técnicos conhecidos pertencem ao manifesto. Um diretório `scripts/` somente será autorizado se uma rotina concreta não puder permanecer legível no `package.json`.

## 9. Inventário exato por lote

Esta indexação complementa a árvore completa da seção 3. Um arquivo listado em mais de um sublote é atualizado, não duplicado.

| Lote | Arquivos oficiais |
|---|---|
| 1 | `.gitignore`; `LICENSE`; `README.md`; `package.json`; `package-lock.json`; `wrangler.toml`. |
| 2 | `app/core/config.js`; `app/core/helpers.js`; `app/core/logger.js`; `tests/core/config-helpers-logger.test.js`. |
| 3 | `app/core/events.js`; `app/core/db.js`; `app/core/cache.js`; `app/core/storage.js`; `tests/core/events-persistence.test.js`. |
| 4 | `app/core/auth.js`; `app/core/router.js`; `tests/core/auth-router.test.js`. |
| 5 | `app/core/render.js`; `app/core/publish.js`; `app/core/app.js`; `tests/core/render-publish-app.test.js`. |
| 6 | `database/schema.sql`; `database/migrations/0001_initial_schema.sql`; `app/schemas/listing.schema.json`; `app/schemas/user.schema.json`; `app/schemas/profile.schema.json`; `app/schemas/plan.schema.json`; `app/schemas/settings.schema.json`; `app/schemas/theme.schema.json`; `tests/database/schema-migrations.test.js`; `tests/schemas/schemas.test.js`. |
| 7 | `app/modules/Auth.js`; `app/modules/Users.js`; `app/modules/Imobiliaristas.js`; `app/modules/Plans.js`; `app/modules/Subscriptions.js`; `tests/modules/identity-subscriptions.test.js`. |
| 8 | `app/modules/Categories.js`; `app/modules/Listings.js`; `app/modules/Media.js`; `app/modules/Upload.js`; `tests/modules/catalog-media.test.js`. |
| 9 | `app/modules/Search.js`; `app/modules/Geolocation.js`; `app/modules/Maps.js`; `app/modules/Favorites.js`; `app/modules/Compare.js`; `tests/modules/discovery.test.js`. |
| 10 | `app/modules/Contacts.js`; `app/modules/Leads.js`; `app/modules/Reviews.js`; `app/modules/Notifications.js`; `tests/modules/relationship.test.js`. |
| 11 | `app/modules/Payments.js`; `app/modules/Integrations.js`; `app/gateways/Asaas.js`; `database/migrations/0002_payment_event_ordering.sql`; atualização de `database/schema.sql` e `tests/database/schema-migrations.test.js`; `tests/modules/payments-integrations.test.js`; `tests/gateways/asaas.contract.test.js`. |
| 12 | `app/modules/Dashboard.js`; `app/modules/Analytics.js`; `app/modules/Reports.js`; `app/modules/AI.js`; `tests/modules/management-intelligence.test.js`. |
| 13 | `app/modules/Publish.js`; `app/modules/Seo.js`; `tests/modules/publishing-seo.test.js`. |
| 14A | `app/components/Alert.js`; `app/components/Breadcrumb.js`; `app/components/Button.js`; `app/components/Card.js`; `app/components/Grid.js`; `app/components/Menu.js`; `tests/components/components.test.js`. |
| 14B | `app/components/Form.js`; `app/components/Gallery.js`; `app/components/Modal.js`; `app/components/Pagination.js`; `app/components/Table.js`; `app/components/Tabs.js`; atualização de `tests/components/components.test.js`. |
| 15 | `app/layouts/public.js`; `app/layouts/panel.js`; `app/layouts/admin.js`; `app/templates/home.js`; `app/templates/listing.js`; `app/templates/listings.js`; `app/templates/profile.js`; `app/templates/location.js`; `app/templates/panel.js`; `app/templates/error.js`; `tests/rendering/layouts-templates.test.js`. |
| 16A | `functions/_middleware.js`; `functions/api/auth.js`; `functions/api/listings.js`; `functions/api/users.js`; `functions/api/media.js`; `functions/api/payments.js`; `functions/api/publish.js`; `tests/functions/api.test.js`; `tests/contract/public-api.test.js`. |
| 16B | `functions/painel/[[path]].js`; `functions/admin/[[path]].js`; `functions/webhooks/asaas.js`; `functions/scheduled.js`; `tests/functions/panel-admin.test.js`; `tests/functions/webhooks-scheduled.test.js`; atualização de `tests/contract/public-api.test.js`. |
| 17 | `site/index.html`; `site/404.html`; `site/robots.txt`; `site/css/app.css`; `site/js/app.js`; `site/js/router.js`; `site/js/api.js`; `site/js/search.js`; `tests/site/public-frontend.test.js`; atualização de `tests/contract/public-api.test.js`. |
| 18 | `tests/integration/publication-flow.test.js`; `tests/e2e/critical-flows.test.js`; `tests/security/security.test.js`; atualização de `tests/contract/public-api.test.js`. |

## 10. Criação, alteração e remoção

### 10.1 Inclusão de arquivo

Antes de incluir um caminho é obrigatório:

1. demonstrar necessidade concreta e responsabilidade principal;
2. verificar se arquivo oficial existente comporta a responsabilidade;
3. definir contratos, dependências, riscos e testes;
4. registrar caminho no TREE e lote no ROADMAP;
5. evitar abstração para possibilidade futura;
6. implementar e testar dentro do lote autorizado;
7. atualizar CHANGELOG quando a estrutura mudar.

O registro prévio do caminho não permite antecipar o lote. A pasta nasce somente no commit que contém seu primeiro arquivo real.

### 10.2 Alteração estrutural

Renomear ou mover exige atualizar referências, contratos, testes, TREE, ROADMAP e CHANGELOG na mesma fronteira documental anterior à implementação. Caminhos antigos não permanecem simultaneamente como alternativa.

### 10.3 Remoção

Um arquivo pode ser removido quando a responsabilidade deixa de existir, é incorporada legitimamente a outro arquivo, a abstração não possui necessidade concreta ou a remoção reduz complexidade sem quebrar contratos. A decisão deve identificar destino da responsabilidade, consumidores, dados/migrations e estratégia de compatibilidade. Pastas vazias resultantes são removidas.

### 10.4 Diretórios planejados

Diretórios são apenas representação organizacional. Nenhum diretório da seção 3 deve ser criado antes de conter arquivo real do lote corrente. `images/`, `icons/`, `scripts/` e qualquer outro diretório sem arquivo exato não pertencem ao plano.

## 11. Estados e manutenção do inventário

- **[E]** descreve arquivo rastreado na `main` auditada.
- **[P]** descreve arquivo aprovado, ainda ausente.
- Itens hipotéticos não recebem marcador nem diretório.
- Após o merge de cada lote, os arquivos correspondentes passam de [P] para [E] em atualização documental do próprio lote.
- Arquivo presente no repositório e ausente do TREE é violação; arquivo no lote e ausente da árvore também é violação.

A auditoria deve comparar `git ls-files`, árvore planejada e inventário por lote, procurando ausências, duplicações, caminhos contraditórios, pastas vazias e arquivos sem testes definidos.

### Estado do Lote 10 (2026-08-04)

Os caminhos `app/modules/Contacts.js`, `app/modules/Leads.js`, `app/modules/Reviews.js`, `app/modules/Notifications.js` e `tests/modules/relationship.test.js` passam a existir nesta implementação. Nenhum caminho auxiliar ou migration foi acrescentado; o inventário planejado dos Lotes 11 a 18 permanece inalterado.

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


## 8. Estado após os Lotes 1 a 9 e responsabilidades 2.0

A auditoria de 2026-08-04 comprova 89 caminhos rastreados: 40 documentos e 49 arquivos de raiz, Core, banco, schemas, módulos e testes implementados nos Lotes 1 a 9. Na árvore acima, caminhos rastreados são `[E]`; somente caminhos ainda ausentes permanecem `[P]`. O histórico dos lotes concluídos é preservado.

Nenhum caminho novo é criado ou autorizado para Queue, compactação, manifests, batching, IndexedDB ou Cache Rules. As responsabilidades cabem, respectivamente, nos caminhos existentes/planejados de eventos e publicação, `app/core/publish.js`, `app/core/storage.js`, painel/Functions, frontend do painel e configuração/deploy já autorizados. Uma necessidade futura diferente exige revisão prévia deste TREE.
