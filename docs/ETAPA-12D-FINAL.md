# Relatório final — ETAPA 12D-FINAL

Data: 2026-08-14. Auditoria e mudanças locais; nenhum deploy, DNS, Rule, Custom Domain ou migração remota foi executado.

## A. Estado inicial

Antes da 12D, o apex e `*.acompanhantesex.com/*` casavam com Worker. HTML/CSS/JS eram `Response` de código, JSON passava pelo Worker/R2, minisite fazia parse/render server-side e cada mídia fazia D1→R2. A primeira consolidação removeu o wildcard, mas deixou indevidamente `www.../api/*`, código público morto no bundle e testes privados esperando painel/mídia pelo Worker. Esta finalização corrige esses pontos.

## B. Causa atual das Worker invocations

A causa histórica era a abrangência das Worker Routes somada ao handler universal. A configuração final tem somente `acompanhantesex.com/api/*`; `workers_dev=false`; o handler aceita apenas host canônico/API e não importa frontend nem handlers públicos. Invocações remanescentes são operações reais, não pageviews.

## C. Rotas públicas atuais

| Recurso | Origem alvo | Worker | D1 | Queue | R2 write |
|---|---|---:|---:|---:|---:|
| home/cidade/anúncio | Pages | 0 | 0 | 0 | 0 |
| CSS/JS/painel/admin shell | Pages | 0 | 0 | 0 | 0 |
| JSON cidade | `dados`/R2/cache | 0 | 0 | 0 | 0 |
| JSON minisite | `dados`/R2/cache | 0 | 0 | 0 | 0 |
| mídia | `media`/R2/cache | 0 | 0 | 0 | 0 |
| `<slug>.acompanhantesex.com` | origem estática do shell | 0 | 0 | 0 | 0 |
| `/api/*` canônico | Worker | 1 | conforme operação | conforme alteração | conforme operação |

Ausência de objeto público resulta em 404/estado seguro; não há fallback D1.

## D. Worker Routes atuais

Somente `acompanhantesex.com/api/*` em root/production. Não existem `acompanhantesex.com/*`, wildcard, Custom Domain, `www.../api/*`, `run_worker_first=true` ou `workers.dev`. O host www é tratado antes por Redirect Rule.

## E. D1 público atual

Anteriormente havia um lookup por mídia pública (`M` imagens → `M` reads). Agora publisher grava URLs de keys R2 no JSON e browser acessa `media` diretamente. GET público tem zero D1 read/write; D1 permanece em autenticação, admin, pagamentos e alterações.

## F. Arquitetura recomendada

**Decisão única: Pages + R2 Custom Domains/Cache + origem estática wildcard + Worker API-only.**

- Portal e assets: Pages, build GitHub de `public/`.
- JSONs: `acts-dados` em `dados.acompanhantesex.com`.
- Mídias: `acts-midias` em `media.acompanhantesex.com`.
- Wildcard: DNS/Origin/Rewrite Rules servem o mesmo shell, sem Worker; browser lê hostname e `/minisites/<slug>.json`.
- WWW: Redirect Rule 308 ao apex, preservando path/query; nunca serve conteúdo.
- Blogger: browser fetch, parse e DOM seguro; falha de CORS omite seção, sem proxy.
- Worker: somente `https://acompanhantesex.com/api/*` e Queue consumer.

## G. Pages

Pages vence para portal, painel/admin shells e assets por Git integration, preview e entrega estática sem runtime. Não resolve wildcard custom domains sozinho, portanto não é usado isoladamente.

## H. Workers Static Assets

Asset-first (`run_worker_first=false`) também zeraria Worker para paths existentes, mas fallback/rotas dinâmicas trazem risco operacional e acoplam frontend/API. É alternativa de rollback, não arquitetura escolhida.

## I. R2 Custom Domains

Planejar `dados`→`acts-dados` e `media`→`acts-midias`; nunca `r2.dev`. GET/HEAD públicos, ETag, cache e CORS sem credentials. Writes ocorrem somente no fluxo backend→Queue→publisher.

## J. Wildcard

`*.acompanhantesex.com` cobre exatamente um label. Não cobre automaticamente `www.<slug>`, que exigiria `*.*`, certificado/origem adicionais e não faz parte do produto. Hosts oficiais são somente `<slug>.acompanhantesex.com`.

## K. Shell minisite

Um HTML, um JS e um CSS atendem todos os clientes. JS valida o primeiro label e busca `https://dados.acompanhantesex.com/minisites/<slug>.json`. Rules só escolhem shell constante; não derivam key por hostname.

## L. Blogger client-side

Publisher expõe apenas `bloggerFeedUrl`; não faz fetch externo. Browser tenta feed JSON, usa `textContent` e URLs HTTPS permitidas, sem inserir HTML externo. Limitação CORS é fail-closed e não autoriza proxy Worker.

## M. Regra WWW

`www.acompanhantesex.com` é entrada de Redirect Rule, nunca host canônico/origem/API. Regra 308 e testes operacionais exatos estão no roteiro Dashboard. `www/api/me` redireciona primeiro e só a nova requisição ao apex pode casar Worker.

## N. Canonical SEO

Home usa canonical apex sem www; minisite materializado usa `<slug>.acompanhantesex.com`. Código, HTML e projeções geradas são testados contra `https://www.acompanhantesex.com`. Estratégia: home estática; cidade/perfil e minisites SEO prioritários recebem HTML materializado incremental pelo publisher. Shell+JSON permanece fallback. Nunca SSR por request.

## O. Antes × Depois

| Métrica | Hoje (arquitetura anterior auditada) | Novo |
|---|---:|---:|
| Worker público/visita | home 3; cidade/perfil `4+M`; minisite `2+M` | 0 |
| CPU Worker pública | `N × C` desconhecida | 0 |
| D1 público/visita | `M` para mídia | 0 |
| Queue pública | 0 | 0 |
| render server-side público | minisite: 1 | 0 |
| browser CPU | parse/render portal | maior: shell/JSON/Blogger |
| R2 origin reads | via Worker | somente cache miss |
| Edge delivery | parcial | dominante |

## P. Worker invocations

`execuções atuais = visitas × N`; novo público = `visitas × 0`.

| Visitas | Home anterior N=3 | Cidade/perfil `N=4+M` | Minisite `N=2+M` | Novo |
|---:|---:|---:|---:|---:|
| 1 | 3 | 4+M | 2+M | 0 |
| 1.000 | 3.000 | `1.000×(4+M)` | `1.000×(2+M)` | 0 |
| 100.000 | 300.000 | `100.000×(4+M)` | `100.000×(2+M)` | 0 |
| 1.000.000 | 3.000.000 | `1.000.000×(4+M)` | `1.000.000×(2+M)` | 0 |
| 10.000.000 | 30.000.000 | `10.000.000×(4+M)` | `10.000.000×(2+M)` | 0 |

## Q. CPU

CPU medida por isolate: indisponível; não há microbenchmark local equivalente. Atual=`N×CPU média desconhecida`. Novo público=`0×CPU=0`. CPU privada continua legítima.

## R. D1

Zero em pageview. Poison mock cobre prepare; R2/Queue poison mocks cobrem get/put/delete/send. Aproximadamente 10.000 alterações/dia de 10.000 anunciantes continuam operações backend legítimas, separadas da audiência.

## S. R2/cache

Hit edge não alcança R2; miss alcança somente R2/estático. Estimar reads por `requests cacheáveis×(1-hit ratio)`. Monitorar `CF-Cache-Status`, Cache Analytics, R2 Class B/bytes, ETag e chaves quentes; separar de Worker requests/D1 rows/CPU.

## T. Browser processing

Browser resolve hostname/rota, busca e parseia JSON, filtra/monta DOM e tenta Blogger. CPU cliente aumenta levemente de propósito; CPU central não cresce com pageviews.

## U. Escala 10 mil clientes

10 visitas/dia=100.000; 100=1.000.000; 1.000=10.000.000 visitas/dia. Não há 10.000 apps/domínios manuais: há shell único e artefatos por anunciante.

## V. 100 mil visitas

Anterior=`100.000×N`; novo=0 Worker/D1 público. Crescem edge requests e cache misses.

## W. 1 milhão

Anterior=`1.000.000×N`; novo=0 Worker/D1 público.

## X. 10 milhões

Anterior=`10.000.000×N`; novo=0 Worker/D1 público. Operações backend dependem de alterações, não audiência.

## Y. Node 22

Validação usa Node 22.x explicitamente. A suíte completa leva vários minutos por testes reais de SQLite/Wrangler/backfill, mas deve terminar naturalmente; os antigos “handles abertos” eram conclusão prematura durante testes longos, não vazamento. Após corrigir duas expectativas legadas (painel e mídia públicos), a execução final deve retornar 0 sem timeout/force-exit.

## Z. Testes

Cobertura: Worker Routes; workers_dev; zero bindings em GET público; URL R2; shell/minisites; canonical sem www; ausência de URLs publicadas www; regra Dashboard documentada; backend autenticado; Queue/publisher; suíte completa Node 22.

## AA. Dry-run

Executar types e deploy `--dry-run` com Node 22 após alteração Wrangler. Dry-run apenas valida/empacota; não publica.

## AB. Arquivos modificados

Config Wrangler; entrada Worker; contratos/publicação; shell/build público; testes arquiteturais/privados; relatório e roteiro Dashboard.

## AC. Plano Cloudflare Dashboard

Roteiro exato de DNS, Redirect, Origin, Rewrite, R2/CORS e Cache Rules: `docs/cloudflare/ETAPA-12D-FINAL-RULES.md`. Validar com Trace em staging; capacidade de Origin override depende do plano e não é presumida.

## AD. Migração sem downtime

1. Preparar/testar Pages e frontend estático.
2. Criar/testar R2 Custom Domains em paralelo.
3. Aplicar CORS/cache/Tiered Cache e validar ETag/hit/miss.
4. Criar wildcard DNS/Origin/Rewrite para shell, ainda sem remover origem antiga.
5. Testar minisites, 404, TLS, CORS, Blogger e SEO.
6. Criar Redirect Rule www→apex 308.
7. Validar home/cidades/perfis/minisites/painel/admin/API e métricas.
8. Só então aplicar Worker Routes API-only e observar canário.

## AE. Rollback

1. Pages: reverter DNS ao frontend anterior.
2. R2 domains: frontend volta às URLs versionadas anteriores; preservar buckets.
3. Cache: desabilitar Rules sem apagar objetos.
4. Wildcard: restaurar Origin/Rewrite/DNS anterior.
5. Shell: reverter artefato/versionamento.
6. WWW: desabilitar Redirect Rule.
7. Validação: interromper promoção sem afetar produção.
8. Worker Routes: restaurar configuração anterior temporariamente; nunca usar GET para publicar.

## AF. Git

Mudanças commitadas na branch de trabalho e PR destinado a `main`; nenhum estado Cloudflare remoto faz parte do commit.

## AG. Pendências

Autenticar Cloudflare/GitHub; criar recursos remotos; confirmar entitlement/Trace das Origin Rules; executar aceitação www; medir hit ratio/CPU; implementar HTML materializado/sitemaps por publicação.

> **O backend existe para alterações. A borda existe para audiência. O navegador processa a interface pública. Worker e D1 não recebem pageview. KV não existe. R2 contém conteúdo publicado. Blogger é processado no navegador. WWW somente redireciona na Edge ao host sem www. 10.000 anunciantes não criam 10.000 aplicações; milhões de visitantes não criam milhões de execuções Worker.**
