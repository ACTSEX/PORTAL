# ACTS Portal — Árvore oficial

**Versão:** 1.2
**Status:** Oficial
**Auditoria:** 2026-08-04, sobre o merge `9c59ba1` da PR #19 (Lote 11)

## 1. Autoridade

`TREE.md` autoriza caminhos; `ROADMAP.md` determina o lote. **[E]** significa rastreado no Git auditado e **[P]** significa autorizado, mas ausente. Pastas vazias, placeholders e arquivos preventivos são proibidos. Um caminho alterado por lotes posteriores continua [E] e aparece em cada lote que o modificou.

## 2. Contagem real

A árvore possui **100 arquivos rastreados: 40 documentos e 60 não documentais**. Existem 2 migrations e 12 suítes de teste. A contagem deriva de `git ls-files`, não inclui `.git` nem caminhos planejados.

## 3. Caminhos existentes

- `.gitignore` [E]
- `LICENSE` [E]
- `README.md` [E]
- `app/core/app.js` [E]
- `app/core/auth.js` [E]
- `app/core/cache.js` [E]
- `app/core/config.js` [E]
- `app/core/db.js` [E]
- `app/core/events.js` [E]
- `app/core/helpers.js` [E]
- `app/core/logger.js` [E]
- `app/core/publish.js` [E]
- `app/core/render.js` [E]
- `app/core/router.js` [E]
- `app/core/storage.js` [E]
- `app/gateways/Asaas.js` [E]
- `app/modules/Auth.js` [E]
- `app/modules/Categories.js` [E]
- `app/modules/Compare.js` [E]
- `app/modules/Contacts.js` [E]
- `app/modules/Favorites.js` [E]
- `app/modules/Geolocation.js` [E]
- `app/modules/Imobiliaristas.js` [E]
- `app/modules/Integrations.js` [E]
- `app/modules/Leads.js` [E]
- `app/modules/Listings.js` [E]
- `app/modules/Maps.js` [E]
- `app/modules/Media.js` [E]
- `app/modules/Notifications.js` [E]
- `app/modules/Payments.js` [E]
- `app/modules/Plans.js` [E]
- `app/modules/Reviews.js` [E]
- `app/modules/Search.js` [E]
- `app/modules/Subscriptions.js` [E]
- `app/modules/Upload.js` [E]
- `app/modules/Users.js` [E]
- `app/schemas/listing.schema.json` [E]
- `app/schemas/plan.schema.json` [E]
- `app/schemas/profile.schema.json` [E]
- `app/schemas/settings.schema.json` [E]
- `app/schemas/theme.schema.json` [E]
- `app/schemas/user.schema.json` [E]
- `database/migrations/0001_initial_schema.sql` [E]
- `database/migrations/0002_payment_event_ordering.sql` [E]
- `database/schema.sql` [E]
- `docs/ADR_GUIDE.md` [E]
- `docs/API_GUIDELINES.md` [E]
- `docs/ARCHITECTURE.md` [E]
- `docs/AUTH.md` [E]
- `docs/BOOTSTRAP.md` [E]
- `docs/CACHE.md` [E]
- `docs/CHANGELOG.md` [E]
- `docs/CLOUDFLARE.md` [E]
- `docs/CODING_STANDARDS.md` [E]
- `docs/COMPONENTS.md` [E]
- `docs/CONFIG.md` [E]
- `docs/CONSTITUTION.md` [E]
- `docs/CONTRACTS.md` [E]
- `docs/CORE.md` [E]
- `docs/DB.md` [E]
- `docs/DEPLOYMENT.md` [E]
- `docs/ERRORS.md` [E]
- `docs/EVENTS.md` [E]
- `docs/EVENT_BUS.md` [E]
- `docs/INDEX.md` [E]
- `docs/INTERFACES.md` [E]
- `docs/LISTINGS.md` [E]
- `docs/LOGGER.md` [E]
- `docs/MODULES.md` [E]
- `docs/MODULE_SPECIFICATION.md` [E]
- `docs/MODULE_TEMPLATE.md` [E]
- `docs/OPERATIONS.md` [E]
- `docs/PLUGINS.md` [E]
- `docs/PROJECT.md` [E]
- `docs/PUBLISHER.md` [E]
- `docs/README.md` [E]
- `docs/RENDERER.md` [E]
- `docs/RFC_GUIDE.md` [E]
- `docs/ROADMAP.md` [E]
- `docs/ROUTER.md` [E]
- `docs/SCHEMAS.md` [E]
- `docs/SECURITY.md` [E]
- `docs/STORAGE.md` [E]
- `docs/TESTING.md` [E]
- `docs/TREE.md` [E]
- `package-lock.json` [E]
- `package.json` [E]
- `tests/core/auth-router.test.js` [E]
- `tests/core/config-helpers-logger.test.js` [E]
- `tests/core/events-persistence.test.js` [E]
- `tests/core/render-publish-app.test.js` [E]
- `tests/database/schema-migrations.test.js` [E]
- `tests/gateways/asaas.contract.test.js` [E]
- `tests/modules/catalog-media.test.js` [E]
- `tests/modules/discovery.test.js` [E]
- `tests/modules/identity-subscriptions.test.js` [E]
- `tests/modules/payments-integrations.test.js` [E]
- `tests/modules/relationship.test.js` [E]
- `tests/schemas/schemas.test.js` [E]
- `wrangler.toml` [E]

## 4. Caminhos planejados e ainda ausentes

- `app/modules/Analytics.js` [P]
- `app/modules/Dashboard.js` [P]
- `app/modules/Publish.js` [P]
- `app/modules/Reports.js` [P]
- `app/modules/Seo.js` [P]
- `app/components/Alert.js` [P]
- `app/components/Breadcrumb.js` [P]
- `app/components/Button.js` [P]
- `app/components/Card.js` [P]
- `app/components/Form.js` [P]
- `app/components/Gallery.js` [P]
- `app/components/Grid.js` [P]
- `app/components/Menu.js` [P]
- `app/components/Modal.js` [P]
- `app/components/Pagination.js` [P]
- `app/components/Table.js` [P]
- `app/components/Tabs.js` [P]
- `app/layouts/admin.js` [P]
- `app/layouts/panel.js` [P]
- `app/layouts/public.js` [P]
- `app/templates/error.js` [P]
- `app/templates/home.js` [P]
- `app/templates/listing.js` [P]
- `app/templates/listings.js` [P]
- `app/templates/location.js` [P]
- `app/templates/panel.js` [P]
- `app/templates/profile.js` [P]
- `functions/_middleware.js` [P]
- `functions/admin/[[path]].js` [P]
- `functions/api/auth.js` [P]
- `functions/api/listings.js` [P]
- `functions/api/media.js` [P]
- `functions/api/payments.js` [P]
- `functions/api/publish.js` [P]
- `functions/api/users.js` [P]
- `functions/painel/[[path]].js` [P]
- `functions/scheduled.js` [P]
- `functions/webhooks/asaas.js` [P]
- `site/404.html` [P]
- `site/index.html` [P]
- `site/robots.txt` [P]
- `site/css/app.css` [P]
- `site/js/api.js` [P]
- `site/js/app.js` [P]
- `site/js/router.js` [P]
- `site/js/search.js` [P]
- `tests/components/components.test.js` [P]
- `tests/contract/public-api.test.js` [P]
- `tests/e2e/critical-flows.test.js` [P]
- `tests/functions/api.test.js` [P]
- `tests/functions/panel-admin.test.js` [P]
- `tests/functions/webhooks-scheduled.test.js` [P]
- `tests/integration/publication-flow.test.js` [P]
- `tests/modules/management.test.js` [P]
- `tests/modules/publishing-seo.test.js` [P]
- `tests/rendering/layouts-templates.test.js` [P]
- `tests/security/security.test.js` [P]
- `tests/site/public-frontend.test.js` [P]

Não estão autorizados `app/modules/AI.js`, `tests/modules/management-intelligence.test.js`, qualquer provider/Queue/prompt storage de IA, `database/migrations/0003_ai_governance.sql` ou `docs/ADR/`. `database/migrations/0003_city_publication_state.sql` é apenas nome candidato para decisão futura: não existe, não está autorizado e não integra a árvore [P].

## 5. Inventário por lote

| Lote | Arquivos entregues ou planejados |
|---|---|
| 1 | [E] `.gitignore`, `LICENSE`, `README.md`, `package.json`, `package-lock.json`, `wrangler.toml`. |
| 2 | [E] `app/core/config.js`, `helpers.js`, `logger.js`; `tests/core/config-helpers-logger.test.js`. |
| 3 | [E] `app/core/cache.js`, `db.js`, `events.js`, `storage.js`; `tests/core/events-persistence.test.js`. |
| 4 | [E] `app/core/auth.js`, `router.js`; `tests/core/auth-router.test.js`. |
| 5 | [E] `app/core/app.js`, `publish.js`, `render.js`; `tests/core/render-publish-app.test.js`. |
| 6 | [E] `database/schema.sql`, `database/migrations/0001_initial_schema.sql`, seis `app/schemas/*.json`, `tests/database/schema-migrations.test.js`, `tests/schemas/schemas.test.js`. |
| 7 | [E] `Auth.js`, `Users.js`, `Imobiliaristas.js`, `Plans.js`, `Subscriptions.js`; `tests/modules/identity-subscriptions.test.js`. |
| 8 | [E] `Categories.js`, `Listings.js`, `Media.js`, `Upload.js`; `tests/modules/catalog-media.test.js`. |
| 9 | [E] `Search.js`, `Geolocation.js`, `Maps.js`, `Favorites.js`, `Compare.js`; `tests/modules/discovery.test.js`. |
| 9A | [E, alterados] `wrangler.toml`, `app/core/app.js`, `config.js`, `events.js`, `publish.js`, `storage.js`, `tests/core/config-helpers-logger.test.js`, `events-persistence.test.js`, `render-publish-app.test.js`. Nenhum arquivo novo. |
| 10 | [E] `app/modules/Contacts.js`, `Leads.js`, `Reviews.js`, `Notifications.js`; `tests/modules/relationship.test.js`. |
| 11 | [E] `app/modules/Payments.js`, `Integrations.js`, `app/gateways/Asaas.js`, `database/migrations/0002_payment_event_ordering.sql`, atualização [E] de `database/schema.sql` e `tests/database/schema-migrations.test.js`; [E] `tests/modules/payments-integrations.test.js`, `tests/gateways/asaas.contract.test.js`. |
| 12 | [P] `app/modules/Dashboard.js`, `Analytics.js`, `Reports.js`; `tests/modules/management.test.js`. |
| 13 | [P] `app/modules/Publish.js`, `Seo.js`; `tests/modules/publishing-seo.test.js`. |
| 14A/14B | [P] 12 componentes e `tests/components/components.test.js`, compartilhado e atualizado no 14B. |
| 15 | [P] 3 layouts, 7 templates e `tests/rendering/layouts-templates.test.js`. |
| 16A | [P] middleware, 6 APIs, `tests/functions/api.test.js` e início de `tests/contract/public-api.test.js`. |
| 16B | [P] painel, admin, webhook, scheduled e duas suítes Functions; atualiza o teste de contrato. |
| 17 | [P] 8 arquivos estáticos do site e `tests/site/public-frontend.test.js`; atualiza o teste de contrato. |
| 18 | [P] testes de integração, E2E e segurança; atualiza o teste de contrato e documentação operacional quando evidência concreta exigir. |

## 6. Regras estruturais

- Um D1 por ambiente é a única fonte de verdade. Core fornece apenas primitivas técnicas; SQL e regras de domínio permanecem no arquivo principal de cada módulo.
- Um módulo começa em um arquivo. Auxiliar só é permitido para responsabilidade externa realmente distinta e autorizada, como `app/gateways/Asaas.js`; não se criam repositories ou arquivos preventivos.
- R2 origina catálogo e manifest públicos; Edge Cache entrega; KV é técnico e privado. Navegação pública normal não acessa D1, KV, Worker nem Pages Function.
- Componentes, layouts e templates recebem dados prontos e não acessam D1. Functions são adaptadores finos. O frontend do Lote 17 consome somente artefatos R2/Edge.
- Migration aplicada é imutável. Nova migration exige modelo completo, necessidade concreta e autorização documental anterior.
