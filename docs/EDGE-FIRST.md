# Relatório final — EDGE-FIRST IMOBILIARISTA.NET

Data: 2026-08-14. Esta implementação é somente local: nenhum deploy, DNS, Rule, Custom Domain ou migration remota foi executado.

## A. Diagnóstico atual
A leitura legada passava pelo Worker. A configuração atual limita o Worker à API e entrega audiência por estático/R2.

## B. Rotas atuais
| Host | Path | Worker hoje? | Banco? | R2? | Queue? | SSR? |
|---|---|---:|---:|---:|---:|---:|
| `imobiliarista.net` | `/`, cidade, imóvel, assets | não | não | JSON em miss | não | não |
| `<tenant>.imobiliarista.net` | `/` | não (Plano A) | não | profile em miss | não | não |
| `dados.imobiliarista.net` | `/cities/*`, `/tenants/*` | não | não | leitura | não | não |
| `media.imobiliarista.net` | `/*` | não | não | leitura | não | não |
| `imobiliarista.net` | `/api/*` | sim, API dinâmica | conforme operação privada | publicação/upload | mutações | não |

## C. Worker atual
`wrangler.toml` declara somente `imobiliarista.net/api/*`; `fetch` rejeita qualquer GET fora da API antes de criar runtime/bindings. O consumer permanece responsável por publicação assíncrona.

## D. Banco atual
D1 é o write model. Não é consultado em pageview; leituras do publisher acontecem após alteração, pelo consumer.

## E. Queue atual
Queue transporta pedidos de publicação após mutações. GET público não envia Queue.

## F. R2 atual
`ACTS_DATA` é read model público reconstruível e `ACTS_MEDIA` guarda mídia pública. Dados privados não pertencem aos Custom Domains.

## G. Read model implementado
O contrato canônico usa `cities/<slug>.json` e `tenants/<tenant>/profile.json`, com allowlist, versão, `generatedAt`, digest e metadata HTTP.

## H. Chunks
A projeção de cidade existente é o chunk agregado compatível com o produto. Não foi criado formato duplicado. Evolução para imóveis deve particionar `tenants/<tenant>/search/<cidade>/<finalidade>/chunk-NNNN.json` quando o volume exigir.

## I. Busca/filtros
Portal busca a projeção R2 e filtra/ordena/pagina no browser. Consultas privadas, checkout, autenticação e admin são **API DINÂMICA**; não são páginas públicas disfarçadas.

## J. Portal
Home, CSS e JS são artefatos estáticos em `public/`. O browser busca somente projeções publicadas.

## K. Tenants
Um shell, um bundle e um CSS atendem todos os tenants. `location.hostname` resolve o primeiro label e carrega `dados.imobiliarista.net/tenants/<tenant>/profile.json`.

## L. Wildcard Plano A
Preparado como wildcard DNS + Origin/Rewrite Rules + origem estática. A validação remota obrigatória inclui Host override, DNS override, SNI/HTTPS, rewrite, cache e 404.

## M. Conflito Worker Route × Origin Rule
O inventário não contém `*.imobiliarista.net/*`. A migração deve testar em host isolado e confirmar por Trace que nenhuma Route externa interfere. Nunca remover rota antiga antes de nova origem, smoke e validação.

## N. Plano B
Somente se a limitação do Plano A for comprovada: Worker mínimo entrega o shell estático. É proibido ler D1/KV/JSON, enviar Queue, gravar R2, filtrar, paginar, fazer proxy ou SSR. O fallback não foi ativado.

## O. Custom Domains
Preparar `dados.imobiliarista.net` para dados e `media.imobiliarista.net` para mídia pública. `r2.dev` é proibido em produção.

## P. Cache
JSON: browser curto/revalidável, Edge TTL medido, ETag respeitado. Assets com key estável têm TTL conservador; somente assets futuramente versionados recebem `immutable`. Mídia usa keys imutáveis e TTL longo. Miss termina em R2/estático.

## Q. WWW
Redirect Rule 308 de `www.imobiliarista.net` ao apex preserva path e query. Não há redirect Worker nem suporte a `www.<tenant>`.

## R. SEO
Canonical, links e mídia usam hosts sem www. HTML materializado, sitemap, Open Graph e structured data devem ser publicados incrementalmente para imóveis/cidades prioritários antes da migração SEO completa; nunca por request.

## S. SSR
SSR público por visita é zero. Objeto não publicado produz 404/estado seguro, nunca build-on-read.

## T. Antes × Depois
| Métrica | Atual medido | Plano A | Plano B |
|---|---:|---:|---:|
| Worker/pageview | métrica remota indisponível | 0 | 1 mínimo |
| CPU pública | métrica remota indisponível | 0 | mínima |
| Banco/pageview | testes: 0 | 0 | 0 |
| Queue/pageview | testes: 0 | 0 | 0 |
| SSR | testes: 0 | 0 | 0 |
| R2 origin | não medido remotamente | cache miss | cache miss |
| Edge delivery | não medido remotamente | dominante | dominante |
| Browser CPU | não medido | maior | maior |

## U. Worker Requests
No Plano A, pageviews públicos geram zero invocações. Requests de API e consumers são medidos separadamente.

## V. CPU
CPU remota não está disponível e não foi inventada. Fórmula operacional: `CPU total = invocações × CPU média`.

## W. Banco/pageview
Poison mock prova zero `prepare`; write model cresce com alterações, não audiência.

## X. R2 origin
`origin reads = requests cacheáveis × (1 - cache hit ratio)`. Medir Class B, bytes e `CF-Cache-Status` após ativação.

## Y. Browser processing
Hostname, fetch, filtro, ordenação e DOM são processados no cliente, deslocando CPU pública para o browser.

## Z. Escala 1.000 tenants
Compartilham aplicação/buckets. De 100 mil a 10 milhões de pageviews/dia crescem Edge delivery e misses, não Worker/D1/Queue/SSR.

## AA. Escala 10.000 tenants
Não há Worker, banco, bucket ou aplicação por tenant. Artefatos são incrementais por tenant/cidade; não há rebuild global.

## AB. Testes
A suíte inclui poison mocks de D1, Queue, R2 put/delete e até leitura R2 no Worker para qualquer GET público, além de contratos, canonical e rotas.

## AC. Dry-run
Wrangler types e deploy dry-run validam os ambientes sem publicação real.

## AD. Arquivos modificados
Contrato/key pública, URLs/domínios, shell gerado, testes, arquitetura, deploy e roteiro Dashboard foram consolidados nesta mudança.

## AE. Cloudflare Dashboard
O roteiro em `docs/cloudflare/ETAPA-12D-FINAL-RULES.md` cobre Wildcard DNS, R2 Custom Domains/CORS, Origin, Rewrite, Redirect, Cache, Trace e aceite.

## AF. Migração
1. Inventário e métricas; 2. read model; 3. shell; 4. Custom Domains; 5. cache; 6. host isolado; 7. Route × Rules; 8. Plano A; 9. smoke; 10. Plano B somente se comprovado; 11. www; 12. SEO; 13. retirar rotas antigas; 14. monitorar.

## AG. Rollback
DNS, Rules, Worker Routes, R2 Custom Domains e frontend têm rollback independente. Routing nunca é corrigido por alteração de banco; buckets/objetos são preservados.

## AH. Git
A mudança deve ser commitada e submetida à branch principal por PR; deploy real permanece fora do escopo.

## AI. Pendências
Métricas remotas, entitlement das Origin Rules, TLS/SNI, CORS, Trace, cache/404 e smoke dependem do Dashboard/staging. Também permanecem materialização SEO completa e chunks por finalidade quando o domínio de imóveis for ativado.

## Decisão obrigatória

**PLANO A NÃO COMPROVADO.** O repositório está preparado para Worker zero, mas a tarefa proíbe alterações remotas e não há evidência local capaz de comprovar Host/DNS override, TLS, precedência, cache e 404 na conta. Manter o caminho antigo até validação isolada; Plano B só pode ser ativado após limitação comprovada.

> O banco guarda o estado do negócio. R2 guarda o estado público materializado. A Edge entrega audiência. O navegador renderiza. Queue publica mudanças. Pageview não consulta banco, não publica e não faz SSR.
