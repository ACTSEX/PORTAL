# ACTS Portal — árvore oficial de source e publicação

**Versão:** 2.0
**Status:** Oficial — inventário documental da Etapa 4/7
**Base auditada:** `5287c5b`, após as Etapas 2/7 e 3/7, em 2026-08-10

## 1. Autoridade, escopo e legenda

Este documento define **onde** cada responsabilidade pode existir. O
`ROADMAP.md` define **quando** ela pode ser implementada. Uma entrada futura
abaixo não libera lote, implementação, migration, schema ou deploy.

O inventário separa deliberadamente:

- **A. árvore source:** arquivos rastreados no Git e o conjunto mínimo de
  caminhos futuros autorizados;
- **B. artefatos de runtime/publicação:** objetos conceituais gerados fora do
  Git, em R2/Edge, e superfícies virtuais.

Legenda:

- **[E] EXISTENTE:** arquivo rastreado no snapshot auditado;
- **[P] PREVISTO:** caminho mínimo autorizado, ainda inexistente e bloqueado
  pelo lote correspondente;
- **[L] LEGADO/REAVALIAR:** arquivo existente preservado, mas com conceitos do
  domínio imobiliário cuja adequação pertence ao 13E;
- **[R] RUNTIME:** artefato gerado; nunca deve ser criado como source por
  anunciante ou cidade.

Pastas vazias, placeholders e arquivos preventivos continuam proibidos. Cada
módulo de negócio começa em **um único arquivo principal**, organizado por
seções. Não se criam automaticamente entity, repository, service, validator,
controller, DTO, use-case, event ou interface. Um auxiliar só se justifica por
responsabilidade de fato distinta, como gateway externo, adaptador de runtime,
migration, template ou asset compartilhado.

## 2. Pré-condições e ordem de execução

O snapshot auditado contém a decisão arquitetural da Etapa 2/7 e o ROADMAP 2.0
da Etapa 3/7. A ordem obrigatória confirmada é:

```text
13B gate → 13C → 13E → 13F → 13G → 13D → 14 → 15 → 16 → 17 → 18
```

O 13B continua tecnicamente implementado, mas depende do gate remoto. Este TREE
não inicia 13C, 13E, 13F, 13G, 13D nem qualquer lote posterior.

## 3. Regras físicas permanentes

1. `app/core/` contém somente infraestrutura reutilizável. Regras de Blogger,
   planos, impulsionamento ou minisite não entram no Core.
2. Módulos concentram domínio em um arquivo cada. O gateway Asaas permanece
   separado porque é uma integração externa real; sua lógica não é duplicada.
3. D1 é privado e a fonte de verdade. A leitura pública normal usa Pages e
   artefatos R2/Edge, sem D1, KV, Worker ou Pages Function.
4. Publisher publica apenas estado ACTS: JSON individual, índice municipal,
   manifests, mídia/artefatos autorizados, versões e invalidações. Publisher
   nunca consulta, importa ou publica Blogger.
5. Blogger existe somente no navegador do minisite PREMIUM. Não há módulo,
   endpoint, proxy, Worker, Queue, Cron, script, tabela ou cache Blogger.
6. Um único template e assets compartilhados atendem todos os minisites. Não
   existe pasta, aplicação, template, CSS ou bundle por anunciante.
7. JSONs individuais, catálogos municipais e manifests são runtime. Não há
   `londrina.json`, `curitiba.json`, `saopaulo.json` nem JSON por anunciante no
   Git.
8. Migrations aplicadas são imutáveis. A migration forward-only do 13C só pode
   nascer depois do gate e dos contratos aplicáveis.

## A. ÁRVORE SOURCE

Somente esta seção autoriza caminhos versionados. Agrupamentos com `*.js` ou
nomes entre chaves descrevem arquivos individualmente enumerados, não novos
diretórios implícitos.

```text
PORTAL/
├── .gitignore                                                   [E]
├── AUDITORIA_ARQUITETURA.md                                     [E]
├── LICENSE                                                      [E]
├── README.md                                                    [E]
├── package.json                                                 [E]
├── package-lock.json                                            [E]
├── wrangler.toml                                                [E]
│
├── app/
│   ├── core/                         # infraestrutura genérica somente
│   │   ├── app.js                                               [E]
│   │   ├── auth.js                                              [E]
│   │   ├── cache.js                                             [E]
│   │   ├── config.js                                            [E]
│   │   ├── db.js                                                [E]
│   │   ├── events.js                                            [E]
│   │   ├── helpers.js                                           [E]
│   │   ├── logger.js                                            [E]
│   │   ├── publish.js       # primitivas técnicas de publicação [E]
│   │   ├── render.js                                            [E]
│   │   ├── router.js                                            [E]
│   │   └── storage.js                                           [E]
│   ├── gateways/
│   │   └── Asaas.js          # único adapter do gateway externo [E]
│   ├── modules/
│   │   ├── Analytics.js                                         [E]
│   │   ├── Auth.js                                              [E]
│   │   ├── Categories.js                                        [E]
│   │   ├── Compare.js                                           [E]
│   │   ├── Contacts.js                                          [E]
│   │   ├── Dashboard.js                                         [E]
│   │   ├── Favorites.js                                         [E]
│   │   ├── Geolocation.js                                       [E]
│   │   ├── Imobiliaristas.js # domínio anterior                [L]
│   │   ├── Integrations.js                                      [E]
│   │   ├── Leads.js                                             [E]
│   │   ├── Listings.js       # coeso; conteúdo a adequar        [L]
│   │   ├── Maps.js                                              [E]
│   │   ├── Media.js                                             [E]
│   │   ├── Notifications.js                                     [E]
│   │   ├── Payments.js       # finanças, inclusive boost futuro [E]
│   │   ├── Plans.js          # STANDARD/PREMIUM + entitlements  [E]
│   │   ├── Reports.js                                           [E]
│   │   ├── Reviews.js                                           [E]
│   │   ├── Search.js                                            [E]
│   │   ├── Subscriptions.js  # vínculo/ciclo/condição comercial [E]
│   │   ├── Upload.js        # upload; não duplicar como Uploads [E]
│   │   ├── Users.js                                             [E]
│   │   ├── Cities.js        # identidade e regras municipais   [P: 13E]
│   │   ├── Profiles.js      # perfil comercial ACTS final      [P: 13E]
│   │   ├── Boosts.js        # domínio único de impulsionamento [P: 13G]
│   │   ├── Publish.js       # decide projeções/publicação ACTS [P: 13F/13D]
│   │   └── Seo.js           # SEO coeso, sem submódulos         [P: 13D]
│   ├── schemas/
│   │   ├── listing.schema.json  # contrato imobiliário parcial [L]
│   │   ├── plan.schema.json                                     [E]
│   │   ├── profile.schema.json  # contrato a reavaliar          [L]
│   │   ├── settings.schema.json                                 [E]
│   │   ├── theme.schema.json                                    [E]
│   │   └── user.schema.json                                     [E]
│   ├── components/                  # compartilhados, não por fragmento
│   │   ├── Button.js                                            [P: 14]
│   │   ├── Card.js                                              [P: 14]
│   │   ├── Form.js       # inclui input/select e validação visual [P: 14]
│   │   ├── Gallery.js                                           [P: 14]
│   │   ├── Grid.js                                              [P: 14]
│   │   ├── Modal.js                                             [P: 14]
│   │   └── Table.js                                             [P: 14]
│   └── templates/                   # estrutura compartilhada, dados prontos
│       ├── portal.js                                            [P: 15]
│       ├── minisite.js       # exatamente um para todos         [P: 15]
│       ├── admin.js                                             [P: 15]
│       ├── panel.js                                             [P: 15]
│       └── email.js                                             [P: 15]
│
├── database/
│   ├── schema.sql                         # snapshot atual       [L]
│   └── migrations/
│       ├── 0001_initial_schema.sql        # histórico imutável   [L]
│       ├── 0002_payment_event_ordering.sql                       [E]
│       ├── 0003_city_publication_state.sql                       [E]
│       └── 0004_<contrato-forward-only>.sql # nome só no lote   [P: 13C]
│
├── functions/                       # adaptadores HTTP finos, estado ACTS
│   ├── _middleware.js                                         [P: 16]
│   ├── api/[[path]].js  # auth/painel/perfil/anúncio/plano/
│   │                    # pagamentos/uploads/admin; nunca feed [P: 16]
│   ├── webhooks/asaas.js                                    [P: 16]
│   └── scheduled.js       # reconciliação/expiração ACTS      [P: 16]
│
├── worker.js     # um runtime privado: Queue/publicação ACTS; não por feature
│                                                               [P: 16]
│
├── scripts/
│   └── backfill-cities.js      # operação real do 13B           [E]
│
├── site/                            # Pages e assets compartilhados
│   ├── index.html                                              [P: 17]
│   ├── 404.html                                                [P: 17]
│   └── assets/
│       ├── css/app.css       # portal, painel e base compartilhada [P: 17]
│       └── js/
│           ├── app.js        # portal/painel + consumo R2      [P: 17]
│           └── minisite.js   # JSON individual + Blogger no browser;
│                            # fetch, parse, sanitize, normalize,
│                            # render e loading/error coesos     [P: 17]
│
├── tests/                           # cobertura por fronteira, não espelho
│   ├── core/
│   │   ├── auth-router.test.js                               [E]
│   │   ├── config-helpers-logger.test.js                     [E]
│   │   ├── events-persistence.test.js                        [E]
│   │   └── render-publish-app.test.js                        [E]
│   ├── database/schema-migrations.test.js                    [E]
│   ├── gateways/asaas.contract.test.js                       [E]
│   ├── modules/
│   │   ├── catalog-media.test.js                             [E]
│   │   ├── discovery.test.js                                 [E]
│   │   ├── identity-subscriptions.test.js                    [E]
│   │   ├── management.test.js                                [E]
│   │   ├── payments-integrations.test.js                     [E]
│   │   ├── relationship.test.js                              [E]
│   │   └── product-publication.test.js
│   │       # plans/subscriptions/listings/boosts/downgrade   [P: 13E–13D]
│   ├── operations/city-backfill.test.js                      [E]
│   ├── schemas/schemas.test.js                               [E]
│   ├── components/ui.test.js                                 [P: 14]
│   ├── rendering/templates.test.js                           [P: 15]
│   ├── functions/functions.test.js                           [P: 16]
│   ├── contract/public-artifacts.test.js
│   │   # JSON individual, índice municipal e manifests       [P: 13F/18]
│   ├── site/frontend.test.js
│   │   # portal, minisite e Blogger client-side              [P: 17]
│   ├── integration/publication.test.js                       [P: 18]
│   ├── e2e/critical-flows.test.js                            [P: 18]
│   └── security/security.test.js                             [P: 18]
│
└── docs/                              # 45 documentos [E], governança
    ├── ADR_GUIDE.md, API_GUIDELINES.md, ARCHITECTURE.md
    ├── AUTH.md, BLOGGER_FEED_ARCHITECTURE.md
    ├── BLOGGER_FEED_UI_RULES.md, BOOTSTRAP.md, CACHE.md
    ├── CHANGELOG.md, CLOUDFLARE.md, CODING_STANDARDS.md
    ├── COMPONENTS.md, CONFIG.md, CONSTITUTION.md, CONTRACTS.md
    ├── CORE.md, DB.md, DEPLOYMENT.md, ERRORS.md, EVENTS.md
    ├── EVENT_BUS.md, INDEX.md, INTERFACES.md, LISTINGS.md
    ├── LOGGER.md, MODULES.md, MODULE_SPECIFICATION.md
    ├── MODULE_TEMPLATE.md, OPERATIONS.md, PLUGINS.md
    ├── PORTAL_AD_MINISITE_PRODUCT_MODEL.md, PROJECT.md
    ├── PUBLISHER.md, README.md, RENDERER.md, RFC_GUIDE.md
    ├── ROADMAP.md, ROUTER.md, SCHEMAS.md, SECURITY.md
    ├── STORAGE.md, TESTING.md e TREE.md
```

### 3.1 Responsabilidades dos cinco módulos previstos

- `Cities.js`: concentra domínio canônico de cidade. Não cria módulo por
  catálogo; a projeção do índice é coordenada por `Publish.js`.
- `Profiles.js`: substituto conceitual final do domínio de profissional
  imobiliário, sem apagar antecipadamente `Imobiliaristas.js`.
- `Boosts.js`: concentra elegibilidade PREMIUM, produto, campanha, período,
  alvo, estado, expiração e ranking/posição. Cobrança e gateway permanecem em
  `Payments.js`/`Asaas.js`.
- `Publish.js`: decide o que publicar a partir de estado ACTS confirmado;
  delega escrita técnica ao Core e nunca trata Blogger.
- `Seo.js`: mantém canonical, indexação, sitemap, robots e dados estruturados em
  um domínio coeso, sujeito às decisões do 13D.

`Plans.js` continua dono somente de STANDARD/PREMIUM, entitlements e regras de
plano. `Subscriptions.js` continua dono do vínculo comercial, ciclo, estado,
condição, upgrade e downgrade. Não existem `FreePlan.js`, `StandardPlan.js` ou
`PremiumPlan.js`.

## B. ARTEFATOS DE RUNTIME/PUBLICAÇÃO

Esta visão é conceitual e **não autoriza nenhum dos caminhos como arquivo no
Git**. A nomenclatura e os contratos exatos ficam para a Etapa 5/7.

```text
D1 privado (fonte de verdade)
└── evento ACTS confirmado
    └── Queue → Publisher ACTS
        └── R2 [R]
            ├── perfis/{id-ou-slug}/{versão}.json     [R, conceitual]
            │   └── pequena JSON pública individual ACTS
            ├── cidades/{cidade}/{versão}.json        [R, conceitual]
            │   └── índice municipal leve para cards/descoberta
            ├── manifests/{escopo}.json               [R, conceitual]
            ├── media/{objetos-oficiais-versionados}  [R, conceitual]
            └── assets/{build-compartilhado}          [R, conceitual]
                ↓
          Cloudflare Edge Cache [R]
                ├── acompanhantesex.com
                │   └── portal → índice leve → JSON individual
                └── {slug}.acompanhantesex.com
                    └── minisite virtual PREMIUM compartilhado
```

O caminho `perfis/{id-ou-slug}/{versão}.json` é apenas exemplo explicativo. A
Etapa 5/7 decidirá identificador, slug, versão, manifest, URLs e contratos; este
TREE não os congela. A mesma reserva vale para o índice municipal.

### 4.1 Equação física do minisite

```text
1 template compartilhado
+ 1 conjunto compartilhado de assets
+ 1 JSON individual ACTS publicada por anunciante
+ feed Blogger externo consultado pelo navegador
= milhares de minisites virtuais
```

É expressamente inválido `1 anunciante = 1 pasta + 1 aplicação + 1 conjunto de
assets`. O wildcard `{slug}.acompanhantesex.com` resolve a superfície virtual;
não gera cópias no Git.

### 4.2 Fronteira Blogger

```text
Blogger → feed público → navegador → site/assets/js/minisite.js
        → parse seguro → sanitização → normalização → DOM seguro
```

O conjunto mínimo escolhe um único `minisite.js`, pois fetch, parsing,
sanitização, normalização, renderização, mídia, contatos e estados
loading/error pertencem ao mesmo comportamento coeso. Se limites medidos no
Lote 17 provarem necessária a separação, o TREE deverá ser revisto antes; não
se autoriza agora `blogger-parser.js`, `blogger-sanitizer.js`,
`blogger-normalizer.js`, `blogger-fetch.js` ou `blogger-renderer.js`.

Não existem nem estão previstos `app/modules/Blogger.js`, proxy/Function
Blogger, Worker Blogger, scripts `sync-blogger`/`import-blogger`, banco, cache,
Queue ou artefato editorial Blogger. Alterar um post causa zero write D1, zero
Queue e zero publicação ACTS.

## 5. Existentes preservados

- Os 12 arquivos do Core permanecem genéricos, inclusive a primitiva técnica
  `app/core/publish.js`; nenhum Core de produto foi acrescentado.
- O gateway único `app/gateways/Asaas.js`, os módulos financeiros e os módulos
  de relacionamento/gestão são preservados.
- `Plans.js`, `Subscriptions.js`, `Listings.js`, `Media.js`, `Upload.js`,
  descoberta, categorias e usuários serão adequados internamente quando seus
  lotes forem liberados, em vez de fragmentados.
- `database/schema.sql`, três migrations históricas, o backfill operacional e
  as 14 suítes atuais permanecem intactos.
- Todos os 45 documentos existentes continuam fonte de governança. Divergências
  documentais não foram corrigidas fora deste TREE e do CHANGELOG.

## 6. Legado — adequação prevista no 13E

Os seguintes **6 arquivos** são marcados estruturalmente como legado ou
reavaliação principal, sem remoção nesta etapa:

1. `app/modules/Imobiliaristas.js` — profissional imobiliário;
2. `app/modules/Listings.js` — contém parte do modelo de anúncio imobiliário;
3. `app/schemas/listing.schema.json` — contrato parcial anterior;
4. `app/schemas/profile.schema.json` — perfil ainda ligado ao modelo anterior;
5. `database/schema.sql` — snapshot ainda contém estruturas imobiliárias;
6. `database/migrations/0001_initial_schema.sql` — histórico imutável do
   modelo inicial.

Outros módulos e testes fazem referências transitórias a preço, tipo de imóvel
ou imobiliarista, mas são coberturas/fundações preservadas, não candidatos
automáticos a remoção. O 13E deve adequá-los somente após decidir taxonomia,
cardinalidade e destino dos dados antigos.

## 7. Caminhos anteriormente cogitados que deixam de ser necessários

O inventário 1.2 fragmentava antecipadamente componentes, layouts, templates,
Functions e frontend. Não permanecem autorizados, sem nova necessidade e
revisão do TREE:

- componentes isolados `Alert.js`, `Breadcrumb.js`, `Menu.js`,
  `Pagination.js` e `Tabs.js`; composição deve reutilizar os sete componentes
  mínimos;
- `app/layouts/*`; os cinco templates estruturais absorvem essa camada até que
  tamanho ou reutilização provem o contrário;
- templates por página (`home.js`, `listing.js`, `listings.js`, `location.js`,
  `profile.js`, `error.js`) e template por anunciante;
- uma Function por CRUD (`auth.js`, `listings.js`, `media.js`, `payments.js`,
  `publish.js`, `users.js`) ou rotas SSR públicas; o adaptador API único deve
  permanecer fino;
- `site/js/api.js`, `router.js`, `search.js`, CSS/JS/bundle por anunciante e
  JSON versionada no Git;
- Worker por minisite, boost ou funcionalidade;
- qualquer arquivo backend, job ou persistência Blogger.

Esses caminhos não são arquivos existentes e nada é apagado nesta etapa.

## 8. Testes futuros sem duplicação da árvore

As oito suítes previstas agrupam cobertura por fronteira. Em conjunto deverão
cobrir plans, subscriptions, listings, downgrade, boosts, pagamentos, JSON
individual, índice municipal, manifests/publicação, templates, minisite,
Blogger client-side e fluxos transversais. Testes específicos só serão
separados se volume ou ambiente realmente impedir uma suíte coesa.

## 9. Contagem auditada e projetada

| Medida | Quantidade aproximada |
|---|---:|
| Source files existentes rastreados e relevantes | **111** |
| Arquivos futuros realmente previstos | **36** |
| Arquivos existentes marcados legado/reavaliar | **6** |
| Total físico aproximado após a arquitetura prevista | **147** |

Os 36 previstos são: 5 módulos, 7 componentes, 5 templates, 1 migration
forward-only, 4 Functions, 1 Worker, 5 arquivos de site/assets e 8 suítes ou
agregadores de teste futuros. A contagem é uma
estimativa de governança, não uma meta artificial nem autorização para criar
placeholders.

## 10. Conflitos encontrados e encaminhamento

1. Documentação especializada antiga ainda descreve cidade como JSON completa,
   nomes de Publisher divergentes e caminhos fragmentados. A decisão mais
   recente e o ROADMAP 2.0 prevalecem: JSON individual + índice municipal leve.
2. `MODULES.md` ainda lista AI e apresenta módulos em estado histórico;
   `PUBLISHER.md`, `DB.md`, `STORAGE.md`, `CACHE.md`, `CLOUDFLARE.md`,
   `TESTING.md`, `OPERATIONS.md`, `COMPONENTS.md`, `LISTINGS.md`, contratos,
   schemas e guias de frontend precisam de revisão de consistência na Etapa
   6/7. Nenhum foi alterado aqui.
3. A decisão vigente da Etapa 2/7 aparece nos documentos como “Arquitetura
   3.0”, enquanto o pedido/ROADMAP também usa “arquitetura oficial” e ROADMAP
   2.0. Este TREE segue o conteúdo vigente, sem renomear documentação fora do
   escopo.
4. A árvore física não possui hoje `functions/`, `site/`, componentes,
   templates ou Worker. Todos continuam futuros e bloqueados.

## 11. Fronteira com os contratos da Etapa 5/7

A Etapa 5/7 fechou a cardinalidade `1 conta anunciante → 1 perfil → 1 anúncio
principal → 0 ou 1 minisite` e os limites lógicos D1/publicação em
`CONTRACTS.md`, `DB.md`, `SCHEMAS.md` e `PUBLISHER.md`. Este TREE apenas
inventaria seus caminhos. As decisões ainda abertas — schema/URL da JSON,
campos/URL do índice, manifest, taxonomia/legado, preços/inadimplência, boost
ativo no downgrade, ranking, wildcard, mídia, Blogger/CORS/providers/
privacidade e SEO — estão consolidadas em `CONTRACTS.md` § 11.8.

Qualquer decisão que exija novo caminho além deste inventário deve primeiro
revisar este TREE. Este documento não inicia lote de implementação.
