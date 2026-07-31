ACTS Portal
ROADMAP
Versão: 1.0
Status: Oficial
---
Objetivo
Este documento define a ordem oficial de implementação do Portal ACTS.
A existência de um arquivo no TREE.md não significa que ele deva ser implementado imediatamente.
O ROADMAP determina a sequência oficial.
---
Princípios
Implementar um arquivo por vez.
Cada arquivo deve ficar completo antes do próximo.
Não criar placeholders.
Não pular etapas.
Sempre atualizar a documentação antes da implementação.
---
Fase 0 — Documentação
[x] README.md
[x] PROJECT.md
[x] INDEX.md
[x] CONSTITUTION.md
[x] ARCHITECTURE.md
[x] TREE.md
[x] ROADMAP.md
[x] CORE.md
[x] MODULES.md
[x] COMPONENTS.md
[x] EVENTS.md
[x] SCHEMAS.md
[x] CLOUDFLARE.md
[x] CHANGELOG.md
Objetivo:
Concluir toda a documentação estrutural antes da criação da camada de código.

Estado:
Fase 0 concluída após auditoria dos documentos existentes e sincronização da nomenclatura do Core.
A Fase 1 — Infraestrutura está formalmente liberada.
O primeiro e único arquivo autorizado para início da implementação é `app/core/config.js`.
---
Fase 1 — Infraestrutura
Ordem prevista:
app/core/config.js
app/core/logger.js
app/core/helpers.js
app/core/events.js
app/core/cache.js
app/core/storage.js
app/core/db.js
app/core/auth.js
app/core/render.js
app/core/publish.js
app/core/router.js
app/core/app.js
Critério de conclusão:
Core funcional e independente de regras de negócio.
---
Fase 2 — Cloudflare
wrangler.toml
package.json
functions/_middleware.js
functions/api/auth.js
functions/webhooks/asaas.js
functions/scheduled.js
---
Fase 3 — Domínio
Implementar um módulo por vez:
Users
Auth
Plans
Payments
Listings
Upload
Media
Search
Publish
Notifications
Reviews
Favorites
Compare
Contacts
Leads
Analytics
Dashboard
Reports
Seo
Categories
Maps
Geolocation
Imobiliaristas
Integrations
AI
Subscriptions
Cada módulo só inicia após o anterior estar aprovado.
---
Fase 4 — Interface
Layouts
Componentes reutilizáveis
Templates
Assets
---
Fase 5 — Banco
schema.sql
migrations
validação
seeds (quando necessários)
---
Fase 6 — Publicação
Publisher
JSON públicos
Cache
KV
R2
Sitemap
Publicação incremental
---
Fase 7 — Testes
Core
Módulos
Functions
Fluxos críticos
Publicação
Pagamentos
---
Critério de Aceite
Cada item somente é considerado concluído quando:
implementado;
revisado;
testado;
documentado;
commitado.
Nenhuma fase deve avançar deixando pendências na anterior.
---
Regra Final
O ROADMAP é a ordem oficial de construção do Portal ACTS.
Toda alteração na sequência deve ser registrada antes da implementação.
