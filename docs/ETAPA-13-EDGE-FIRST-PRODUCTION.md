# Relatório final — ACTS EDGE-FIRST

Data da auditoria: 2026-08-14. Nenhum deploy, alteração DNS, Rule, Custom Domain
ou migration remota foi executado.

## A. Repositório confirmado

O conteúdo, histórico e domínio são do ACTS/ACOMPANHANTESEX.COM. O checkout
fornecido não possuía remote Git configurado; portanto a confirmação remota por
`git remote -v` ficou indisponível antes da mudança. Não foi encontrada referência
ao domínio proibido.

## B. Estado inicial

Branch inicial `work`, commit `9318fee`, árvore limpa. A implementação edge-only
da etapa anterior já existia, porém `ARCHITECTURE.md` e `DEPLOY.md` ainda
descreviam Worker-first e contratos antigos.

## C. Arquitetura encontrada

O Worker tem uma única Worker Route HTTP, `acompanhantesex.com/api/*`, além do
consumer da Queue. Shells/assets ficam em `public/`; o browser lê projeções em
`dados.acompanhantesex.com` e mídia em `media.acompanhantesex.com`.

## D. Worker Requests atuais

Telemetria Cloudflare não estava disponível. Requests/CPU atuais são
**desconhecidos**; a topologia versionada prevê zero invocação Worker pública.

## E. D1 público atual

O poison test prova zero chamadas a `prepare()` quando GETs públicos alcançam por
engano a defesa do Worker. D1 permanece somente no backend operacional/consumer.

## F. Queue público atual

O mesmo teste prova zero `ACTS_QUEUE.send()` em home, cidade, perfil, minisite,
asset, mídia e www. Queue é acionada por mudanças, nunca por audiência.

## G. R2 atual

`ACTS_DATA` recebe projeções `cities/<slug>.json` e
`minisites/<slug>.json`; `ACTS_MEDIA` recebe arquivos públicos. Leitura pública
usa Custom Domains planejados. O GET público não grava nem apaga objetos.

## H. Static Assets

Home, painel, admin, minisite shell, CSS e JS estão materializados em `public/`.
`public/_redirects` faz fallback de SPA na origem estática, não no Worker.

## I. Portal

Shell estático e JavaScript client-side; não há SSR ou consulta D1 no pageview.

## J. Cidade

O browser lê `https://dados.acompanhantesex.com/cities/<slug>.json` e filtra,
ordena e renderiza localmente.

## K. Perfil

O detalhe usa a projeção de cidade já publicada. Nenhuma tabela transacional é
consultada durante a visita.

## L. Minisite

O shell lê o primeiro label do hostname, valida o slug e busca
`https://dados.acompanhantesex.com/minisites/<slug>.json`.

## M. Blogger

O browser busca o feed JSON público diretamente. O renderer usa `textContent`,
aceita somente URLs seguras e nunca usa `innerHTML`; erro de CORS/formato falha
fechado, sem proxy Worker.

## N. Plano A

Código e configuração são compatíveis com zero Worker: wildcard DNS → Rules →
origem estática → shell → browser → R2. A ativação requer validação isolada no
Dashboard.

## O. Conflito Route × Rules

Não existe Worker Route `*.acompanhantesex.com/*`. Antes da ativação, confirmar
com Cloudflare Trace que nenhuma Route remota não versionada intercepta o host de
teste.

## P. Plano B

Não foi implementado: somente será usado se Origin/Rewrite Rules forem
comprovadamente inviáveis. Seu limite é entregar o shell, sem D1, Queue, Blogger,
JSON, SSR, negócio ou escrita R2.

## Q. R2 Custom Domains

Configurar `dados.acompanhantesex.com` → `acts-dados` e
`media.acompanhantesex.com` → `acts-midias`, com GET/HEAD público e sem
credentials. Produção não usa `r2.dev`.

## R. Cache

JSON: browser 60 s, Edge 300 s, ETag/revalidação e stale-while-revalidate quando
disponível. HTML: TTL curto/revalidável. Assets versionados e mídia com keys
imutáveis: TTL longo/immutable. API e privados: bypass/no-store.

## S. WWW

Uma Redirect Rule 308 envia `www.acompanhantesex.com` ao apex preservando path e
query antes de Worker/Origin Rules. Não há rota API para www.

## T. SEO

Canonical versionado é sem www. Sitemap, Open Graph, structured data e HTML de
perfis prioritários devem ser materializados pelo publisher; nunca SSR por visita.

## U. Segurança

CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, validação de Origin e
`no-store` privado foram preservados. A sessão continua `__Host-acts_session`,
Secure, HttpOnly, Path `/` e sem Domain.

## V. Antes × Depois

| Métrica | Atual medido | Plano A | Plano B |
|---|---:|---:|---:|
| Worker público/pageview | desconhecido | 0 | 1 mínimo |
| Worker CPU | desconhecida | 0 | mínima |
| D1 público | desconhecido | 0 | 0 |
| Queue/pageview | desconhecido | 0 | 0 |
| SSR | desconhecido | 0 | 0 |
| R2 origin | desconhecido | cache miss | cache miss |
| Edge delivery | desconhecido | dominante | dominante |
| Browser CPU | desconhecida | principal | principal |

## W. Worker CPU

CPU média atual = **desconhecida**. Plano A elimina CPU Worker pública por
topologia; CPU operacional continua proporcional a alterações.

## X. D1

D1 é fonte transacional. A regra permanente é: pageview público = zero reads e
zero writes D1.

## Y. Queue

Queue materializa mudanças incrementais e nunca é disparada por GET público.

## Z. R2 origin

Cache miss termina na origem estática/R2 já publicada; nunca em D1 ou rebuild.

## AA. Browser processing

Roteamento, fetch/parse de JSON, filtros, DOM do portal/minisite e Blogger são
processados no cliente.

## AB. Escala 10.000 anunciantes

10, 100 e 1.000 visitas/dia por anunciante geram respectivamente 100.000,
1.000.000 e 10.000.000 visitas/dia, todas com zero Worker no Plano A. Uma
alteração/dia gera aproximadamente 10.000 operações backend legítimas.

## AC. Testes

Os gates obrigatórios estão registrados no histórico da tarefa: Node 22,
instalação lockfile, lint, suíte, audit, diff-check, poison bindings, API e host
isolation. Os resultados locais devem ser conferidos no PR.

## AD. Wrangler dry-run

Mesmo sem mudança em `wrangler.toml`, types de produção e deploy `--dry-run`
foram executados com sucesso como gates de validação. Nenhum deploy real foi
executado.

## AE. Arquivos modificados

Documentação arquitetural e operacional, este relatório e os testes/documentos
existentes usados como prova. Não houve binding novo nem mudança de negócio.

## AF. Dashboard Cloudflare

O roteiro exato de Custom Domains R2, wildcard DNS, Origin/Rewrite Rules,
Redirect Rule www, CORS e Cache Rules está em
`docs/cloudflare/ETAPA-12D-FINAL-RULES.md`.

## AG. Migração sem downtime

1. Medir atual; 2. validar Static Assets; 3. validar JSON; 4. criar Custom Domains;
5. configurar cache; 6. testar wildcard em host isolado; 7. validar Plano A;
8. preparar Plano B somente se necessário; 9. configurar www; 10. smoke tests;
11. só então retirar rotas/origens públicas antigas.

## AH. Rollback

Desabilitar Rules novas, restaurar DNS/origem anterior e reverter o artefato
estático/Worker conhecido, preservando buckets e D1. Nunca apagar a origem antiga
antes da aceitação, nem usar GET para republicar.

## AI. Git

Mudança deve ser commitada na branch de trabalho e submetida em PR para
`ACTSEX/PORTAL:main`, sem merge automático.

## AJ. Pendências

Coletar métricas reais; confirmar remote/proveniência no ambiente de revisão;
autenticar Cloudflare; criar/validar recursos remotos; testar CORS Blogger real;
usar Trace para precedência; materializar SEO/sitemap quando priorizado.

## Decisão final

**PLANO A NÃO COMPROVADO.** A implementação e configuração versionada o tornam
viável em princípio, mas DNS/TLS, entitlement de Origin Rules, precedência remota,
CORS e smoke do wildcard não podem ser comprovados sem configurar o Dashboard.

> Nenhuma feature pública nova pode introduzir D1, Queue ou SSR no pageview.

> **Visitante → Edge / Static Assets / JSON publicado → navegador.** Separadamente:
> **anunciante/admin/sistema → Worker → D1 → Queue → publicação → JSON/assets/R2
> → Edge.**

D1 é transacional; R2 é estado público/mídia; Queue processa mudanças; Worker é
backend operacional; Edge atende audiência; Browser renderiza; Blogger é
client-side. A arquitetura não possui binding alternativo de cache.

---

# ETAPA 13B — VALIDAÇÃO CLOUDFLARE REAL

Data da tentativa: 2026-08-17 (UTC). Esta seção registra somente observações
obtidas nesta execução. Ela não converte configuração versionada em evidência de
produção.

## 1. Proveniência GitHub e recuperação da ETAPA 13

O repositório remoto foi identificado objetivamente como
`https://github.com/ACTSEX/PORTAL.git`; `git ls-remote` confirmou `main` em
`70580c0cdfbcdc8ba035434e3c9b4aa0b44fa0cb`. O commit informado da ETAPA 13,
`82467c0f126b20048ba67185bd64fe0ac3109e21`, não existe neste clone: `git
cat-file` não o encontrou, o servidor recusou `git fetch origin <sha>` com `not
our ref`, e a API pública do GitHub respondeu `422 No commit found for SHA`.
Também não havia `docs/ETAPA-13-EDGE-FIRST-PRODUCTION.md` no remoto `main`.

O conteúdo legítimo disponível foi recuperado sem atribuir o SHA ausente: o
relatório versionado `docs/EDGE-FIRST-FINAL.md`, criado pela mudança Edge-First já
incorporada a `main`, foi preservado acima sob o nome solicitado. Não houve
mudança arquitetural ou de negócio.

A branch local foi criada a partir de `origin/main` com o nome
`codex/etapa-13b-cloudflare-edge-first-production`. O checkout inicialmente não
tinha remote; `origin` foi restaurado para o repositório obrigatório. O GitHub é
público, mas o ambiente não possui credencial GitHub (`gh auth status`: não
autenticado; `git push --dry-run`: não conseguiu obter usuário). Portanto,
branch remota, commit remoto e PR permanecem **DESCONHECIDOS/não criados** até
que exista autenticação. Isso é bloqueio operacional, não um PR local fictício.

## 2. Acesso Cloudflare tentado

`wrangler 4.123.0` está instalado e foi executado com Node 22.23.2. `wrangler
whoami` consultou as configurações do usuário e respondeu explicitamente **“You
are not authenticated”**. Não há `CLOUDFLARE_*` ou `CF_*` no ambiente. Foram
tentadas as fontes Wrangler/API configurada, configuração local, DNS público e
HTTP público. Sem credencial de conta não é possível consultar com autoridade
Worker Routes instaladas, associação de Custom Domains, recursos, CORS, Rules,
Trace ou Analytics.

Nenhuma alteração de infraestrutura, deploy, migration, escrita D1, mensagem de
Queue, publicação, remoção ou purge foi executada. Consequentemente não há risco
de fabricar uma mutação “segura” sem conhecer os dados de produção e não há
rollback aplicável. **Migrations D1: nenhuma. KV: nenhum binding versionado e
nenhum recurso criado.**

## 3. DNS público observado

`dig` resolveu todos os cinco nomes abaixo para endereços anycast Cloudflare
`104.21.29.180`, `172.67.149.148`, `2606:4700:3034::ac43:9594` e
`2606:4700:3036::6815:1db4` (a ordem variou):

| Nome | Tipo observado | Target público observado | Proxy | TTL/configuração autoritativa |
|---|---|---|---|---|
| `@` | A/AAAA | anycast Cloudflare acima | compatível com proxy | DESCONHECIDO |
| `www` | A/AAAA | anycast Cloudflare acima | compatível com proxy | DESCONHECIDO |
| `dados` | A/AAAA | anycast Cloudflare acima | compatível com proxy | DESCONHECIDO |
| `media` | A/AAAA | anycast Cloudflare acima | compatível com proxy | DESCONHECIDO |
| `etapa13b-fixture` (prova do `*`) | A/AAAA | anycast Cloudflare acima | compatível com proxy | DESCONHECIDO |

A resolução de um label aleatório comprova que existe resposta wildcard pública,
mas não comprova target interno, origem, Rule, certificado ou ausência de
Worker.

## 4. Limitação HTTP/TLS externa

Todas as tentativas HTTPS (`apex`, `www`, cidade, API, dados, media e wildcard)
foram recusadas pelo túnel HTTP do ambiente antes de alcançar Cloudflare:
`CONNECT tunnel failed, response 403`, resposta `server: envoy`. Essa resposta
não pertence ao ACTS e não pode ser usada como status de produção. A segunda
fonte HTTP disponível no ambiente também respondeu `401 Unauthorized` antes de
abrir as URLs. Assim, status, redirects, CF-Ray, CF-Cache-Status, Age, ETag,
Content-Type, body, headers de segurança, CORS e certificado são
**DESCONHECIDOS**, apesar das tentativas legítimas.

Como nenhum objeto real pôde ser enumerado via R2 e HTTP foi bloqueado, não foi
inventado slug, imagem, city JSON, minisite JSON ou feed Blogger. Também não foi
executada a bateria de 120 requests: repeti-la contra o proxy Envoy mediria
somente recusas locais, não audiência Cloudflare.

## 5. Tabela HTTP obrigatória

| Recurso | URL tentada | HTTP produção | Cache | Worker | D1 | Queue | Resultado |
|---|---|---:|---|---|---|---|---|
| Home | `https://acompanhantesex.com/` | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | túnel Envoy recusou CONNECT |
| Cidade | `https://acompanhantesex.com/cidade/sao-paulo` | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | túnel Envoy recusou CONNECT |
| Minisite | `https://etapa13b-fixture.acompanhantesex.com/` | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DNS wildcard resolveu; HTTP bloqueado antes da origem |
| City JSON | objeto real não enumerável | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | acesso R2/HTTP indisponível |
| Minisite JSON | objeto real não enumerável | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | acesso R2/HTTP indisponível |
| Mídia | objeto real não enumerável | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | DESCONHECIDO | acesso R2/HTTP indisponível |
| API | `https://acompanhantesex.com/api/me` | DESCONHECIDO | N/A | DESCONHECIDO | conforme ação | conforme ação | túnel Envoy recusou CONNECT |

Nenhuma linha acima recebe “Worker = 0” por inferência. O `wrangler.toml` declara
somente `acompanhantesex.com/api/*`, mas não é evidência das Routes efetivamente
instaladas.

## 6. Tabela Cloudflare obrigatória

| Item | Estado | Evidência |
|---|---|---|
| Worker Route API-only | DESCONHECIDO | config local API-only; conta não autenticada |
| R2 dados Custom Domain | DESCONHECIDO | DNS `dados` resolve para Cloudflare; associação não consultável |
| R2 mídia Custom Domain | DESCONHECIDO | DNS `media` resolve para Cloudflare; associação não consultável |
| WWW redirect | DESCONHECIDO | HTTP bloqueado antes de Cloudflare |
| Wildcard DNS | PARCIALMENTE COMPROVADO | label aleatório resolveu para anycast Cloudflare |
| Wildcard TLS | DESCONHECIDO | handshake bloqueado e conta não autenticada |
| Origin Rule | DESCONHECIDO | conta não autenticada |
| Rewrite Rule | DESCONHECIDO | conta não autenticada |
| Cache Rule JSON | DESCONHECIDO | conta/HTTP indisponíveis |
| Cache mídia | DESCONHECIDO | conta/HTTP indisponíveis |
| R2 CORS | DESCONHECIDO | conta/HTTP indisponíveis |
| Analytics Worker | DESCONHECIDO | conta não autenticada |

## 7. Analytics e bateria controlada

| Medição | Valor |
|---|---|
| Worker Requests antes | DESCONHECIDO |
| Worker CPU antes | DESCONHECIDO |
| Requisições públicas executadas contra produção | 0 |
| Worker Requests depois | DESCONHECIDO |
| Worker CPU depois | DESCONHECIDO |
| Incremento atribuível | DESCONHECIDO |

O acesso a Analytics, Logs, Tail e Trace exige autenticação Cloudflare ausente.
Sem prova de que o request público não invoca Worker, tampouco existe prova
operacional granular de D1 = 0 ou Queue = 0 por pageview. Os poison tests locais
continuam sendo evidência de código, não substituto da telemetria pedida.

## 8. Publicação, remoção, Blogger e autoridade

Os testes destrutivos de publicação/despublicação não foram realizados sem conta,
sessão e fixture de produção expressamente identificada. O código mantém o
contrato `D1 → Queue → publisher → R2`; R2 é read model, não autoridade de auth,
pagamento, assinatura, boost ou admin. O frontend usa `cities/` e `minisites/`
(não `profiles/`) diretamente e não possui fallback público para API/D1. Blogger
permanece browser → Blogger e falha fechado, sem proxy Worker. Esses fatos são
validados localmente pela suíte, mas o comportamento externo permanece
DESCONHECIDO.

## 9. Alterações Cloudflare, segurança e rollback

Alterações Cloudflare: **nenhuma**. Recursos excluídos/criados: **nenhum**.
Bindings KV: **nenhum**. Rollback de infraestrutura: **não aplicável**. Headers,
MIME types, R2 CORS, TLS e cobertura do certificado wildcard não foram presumidos
a partir da configuração versionada.

## 10. Gates e versões desta execução

Versões usadas para os gates: Node `v22.23.2`, npm `10.9.8`, Wrangler `4.123.0`.
Resultados: `npm ci` passou (67 pacotes auditados, zero vulnerabilidades); `npm run
lint` passou; `npm test` passou (229/229); `npm audit
--audit-level=moderate` passou (zero vulnerabilidades); `npm run cf:validate`
passou nos três ambientes; `npx wrangler deploy --dry-run --env production`
passou e enumerou os quatro bindings esperados; `git diff --check` passou. A falta
de credencial afeta consultas remotas, mas não autoriza um deploy real.

## 11. Pendências objetivas para fechar a validação

1. Fornecer autenticação de escrita em `ACTSEX/PORTAL` e abrir os PRs remotos sem
   merge automático.
2. Fornecer token Cloudflare de leitura para Zone, Workers, R2, D1, Queues,
   Rulesets, DNS e Analytics (e credencial separada somente se for aprovada uma
   alteração).
3. Permitir CONNECT HTTPS aos hosts de produção ou executar os probes fora deste
   proxy.
4. Auditar Routes/Rules/DNS/Custom Domains/CORS reais; obter snapshots Analytics;
   executar a bateria controlada e os testes HTTP/cache/TLS.
5. Somente com fixture aprovada, validar publicação e remoção, sem tocar dados
   alheios.

## 12. Classificação e decisão

**PLANO A NÃO VALIDADO — ACESSO EXTERNO AINDA INSUFICIENTE**

**DECISÃO: FAIL**

Os critérios de PASS não foram demonstrados: em particular não existem prova de
zero Worker/D1/Queue público, API no Worker, `www` na borda, R2 Custom Domains,
TLS wildcard, minisite funcional ou Analytics antes/depois. Declarar PASS com os
dados disponíveis seria inventar evidência de produção.
