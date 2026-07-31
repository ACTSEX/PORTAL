# ACTS Portal — Árvore oficial

**Versão:** 1.1
**Status:** Oficial
**Auditoria:** 2026-07-31

## 1. Autoridade e regras

`TREE.md` é a fonte de verdade para a localização de arquivos. `ROADMAP.md` controla a ordem por **lote funcional**, não autoriza arquivos individualmente. Arquivos do mesmo lote preservam responsabilidades próprias e podem seguir juntos na implementação, testes, commit, revisão e PR.

Não são permitidos arquivos fora desta árvore, placeholders, arquivos ou pastas vazios, TODOs substituindo implementação, SQL de domínio no Core, regra comercial em Functions ou consulta pública direta ao D1. Novos caminhos exigem necessidade concreta e atualização documental prévia.

Legenda: **[E]** existente na `main` auditada; **[P]** planejado e ainda ausente. Itens futuros hipotéticos não são registrados.

## 2. Estado real e inventário existente

A `main` auditada contém exatamente **40 arquivos rastreados**, todos documentais, sob `docs/`. Não há arquivo de implementação, raiz de produto, `app/`, `functions/`, `site/`, `database/` ou `tests/`. `app/core/config.js` **não existe**. Diretórios internos do Git não integram o produto.

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
│   └── migrations/0001_initial_schema.sql
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
| 40 arquivos existentes e só documentação | Estado real explicitado; todos constam no inventário. |
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

## 7. Regra final

A árvore define **onde** cada arquivo pode existir; o ROADMAP define **em qual lote** será entregue. Uma pasta só nasce no commit que inclua seu primeiro arquivo real.
