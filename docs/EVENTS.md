ACTS Portal

EVENTS

Versão: 1.0Status: Oficial

Objetivo

Este documento define os eventos oficiais do Event Bus do Portal ACTS.

Eventos permitem comunicação desacoplada entre módulos.

O módulo que publica um evento não conhece quem irá consumi-lo.

Regras

Eventos representam fatos que já aconteceram.

Utilizar nomes em PascalCase.

Não utilizar eventos para chamadas síncronas.

Eventos devem ser idempotentes quando necessário.

Alterações incompatíveis devem ser documentadas.

Convenção

Os nomes devem seguir o padrão:

UserCreated

ListingPublished

PaymentReceived

SubscriptionActivated

Eventos por Módulo

Users

UserCreated

UserUpdated

UserDeleted

Auth

UserLoggedIn

UserLoggedOut

PasswordResetRequested

PasswordResetCompleted

Listings

ListingCreated

ListingUpdated

ListingDeleted

ListingPublished

ListingArchived

Payments

PaymentCreated

PaymentReceived

PaymentFailed

PaymentRefunded

Plans

PlanCreated

PlanUpdated

Subscriptions

SubscriptionActivated

SubscriptionRenewed

SubscriptionCancelled

SubscriptionExpired

Upload

UploadStarted

UploadCompleted

UploadFailed

Media

MediaCreated

MediaDeleted

Notifications

NotificationQueued

NotificationSent

NotificationFailed

Publish

PublishStarted

PublishCompleted

PublishFailed

Search

SearchIndexed

SearchReindexed

Reviews

ReviewCreated

ReviewApproved

ReviewRejected

Contacts

ContactReceived

Leads

LeadCreated

LeadQualified

Analytics

AnalyticsUpdated

Dashboard

DashboardUpdated

Reports

ReportGenerated

SEO

SitemapGenerated

RobotsUpdated

Fluxo

Evento↓Event Bus↓Consumidores interessados↓Ações independentes

Boas práticas

Publicar apenas eventos relevantes.

Evitar duplicidade.

Não embutir regras de negócio no Event Bus.

Consumidores devem tratar falhas localmente.

Estado

Esta lista representa os eventos oficiais iniciais.

Novos eventos deverão ser documentados antes da implementação.

## Eventos financeiros do Lote 11

Todos usam versão `1.0`, são privados, possuem `source` igual a `Payments` ou
`Integrations` e transportam apenas identificadores e transições controladas.
Nenhum deles é evento de publicação ou consumidor do Publisher.

| Evento | Produtor | Payload mínimo |
|---|---|---|
| `IntegrationConfigured` | Integrations | `integrationId`, `provider` |
| `PaymentCreated` | Payments | `paymentId`, `subscriptionId` |
| `PaymentUpdated` | Payments | `paymentId`, `subscriptionId`, `from`, `to` |
| `PaymentReceived` | Payments | `paymentId`, `subscriptionId`, `from`, `to` |
| `PaymentFailed` | Payments | `paymentId`, `subscriptionId`, `from`, `to` |
| `PaymentCanceled` | Payments | `paymentId`, `subscriptionId`, `from`, `to` |
| `PaymentRefunded` | Payments | `paymentId`, `subscriptionId`, `from`, `to` |

O payload Asaas, token, documento, e-mail, valor, URL de pagamento e resposta
integral do provedor não entram no Event Bus. A entrega externa duplicada é
deduplicada no D1 antes da emissão do fato interno.

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
- Alterações marcam cidades afetadas e somente elas são recompiladas. O Lote 9A agrega mensagens da mesma cidade apenas dentro do batch entregue; `dueAt` calculado não executa espera persistente. A janela entre batches/invocações permanece pendente para o runtime do Lote 16B, enquanto regras de domínio são do Lote 13 e reconciliação operacional pertence aos Lotes 16B e 18. Cron é complementar, nunca o caminho obrigatório de cada alteração.
- Falha de publicação não reverte o negócio confirmado: D1 permanece verdadeiro. Publicação é repetível/idempotente, suporta republicação e retenção temporária de versões para rollback; falha em R2 não aponta manifest a arquivo parcial.
- O navegador prioriza cache HTTP, memória, Cache Storage quando necessário, IndexedDB para persistência estruturada e `localStorage` somente para pequenos metadados/preferências. A JSON completa não tem `localStorage` como armazenamento principal.
- Catálogos contêm somente projeções públicas aprovadas: sem e-mail privado, dados administrativos, tokens, pagamentos, endereço privado não autorizado ou coordenada precisa proibida.

## Lote 9A — publicação assíncrona

`CityPublicationRequested` versão `1.0` é o envelope técnico da Queue: `eventId`, `cityId`, `citySlug`, `reason`, `correlationId`, `source` e `occurredAt`. Não contém catálogo nem dados pessoais. O Publisher emite `CityPublicationCompleted`, `CityPublicationFailed` e `CityPublicationRolledBack`; todos preservam correlação e carregam somente identificadores técnicos.


## Review e pedido técnico de publicação

`Reviews.js` emite hoje um fato de domínio que indica impacto público, mas esse evento não é sozinho o envelope completo do producer. O fluxo futuro é `Review pública alterada → evento de domínio → Publish.js resolve cidade canônica → CityPublicationRequested → Queue → Publisher`. No Lote 13, `Publish.js` deverá fornecer `eventId`, `cityId`, `citySlug`, `reason`, `correlationId`, `source` e `occurredAt`, sem dados privados.

## Transformação e cidades afetadas no Lote 13 (decisão documental)

`Publish.js` recebe fatos de domínio, consulta o D1 após commit e envia por cidade o envelope `eventId`, `type`, `version`, `cityId`, `citySlug`, `reason`, `correlationId`, `source`, `occurredAt`. `version` aqui é versão contratual; catálogo é reservado no processamento. Não há PII.

- anúncio privado criado não publica; entrada em `published`, atualização pública, arquivamento ou remoção recompila sua cidade;
- mudança conserva cidade anterior e resolve a nova: **A → B recompila A e B**; categoria/anunciante alterado recompila quando antes ou depois público;
- inclusão, remoção, reordenação, troca principal e metadado público de mídia recompilam cidade de anúncio publicado;
- categoria pública alterada consulta somente cidades distintas com anúncios publicados daquela categoria;
- dado público de perfil/anunciante recompila todas as cidades distintas onde possui anúncio publicado; dado privado não publica;
- review pendente não publica; aprovação/retirada pública de review de anúncio afeta sua cidade; de perfil/anunciante, todas onde ele aparece.

Remoção/mudança preserva identidade anterior no fato ou histórico transacional para resolver o conjunto, mas o pedido leva só ids técnicos. Duplicatas convergem por idempotência persistente e batch.
