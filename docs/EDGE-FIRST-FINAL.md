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
