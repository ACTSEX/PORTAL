# Relatório final — ETAPA 12D

Data da auditoria: 2026-08-14. Escopo: estado versionado; nenhum deploy, alteração DNS, regra remota ou migração foi executado. “Request HTTP” não é sinônimo de invocação Worker: o primeiro chega à Cloudflare; a segunda só ocorre quando uma rota despacha o script. R2 Class B mede acesso à origem R2, D1 reads mede linhas/operações do banco, CPU time mede execução do isolate e `HIT`/`MISS` mede cache da borda.

## A. Diagnóstico

**ERRO ARQUITETURAL encontrado.** As duas rotas de produção cobriam o apex e todo `*.imobiliarista.net/*`. Assim, HTML, CSS, JS, JSON e mídia públicos entravam em `worker/index.js`. O próprio script construía os assets com `Response`, buscava projeções em R2 e, para mídia, consultava D1 antes de R2. Não há binding KV.

A correção local separa código e audiência: Pages recebe `public/`; `dados.imobiliarista.net` e `media.imobiliarista.net` devem ser Custom Domains de R2; o Worker fica roteado somente em `imobiliarista.net/api/*` e `www.../api/*`. O wildcard deixa de corresponder ao Worker. A ativação remota está deliberadamente pendente do plano de migração.

## B. Requests atuais

Inventário factual **antes desta mudança**, obtido de `wrangler.toml`, `worker/index.js` e bundles reais:

| Host | Path | Hoje caía no Worker? | D1? | R2? | Queue? | CPU server? |
|---|---|---:|---:|---:|---:|---:|
| apex/www | `/`, `/<cidade>`, diretório, anúncio | sim | não | não no HTML | não | baixo: roteia e monta HTML |
| apex/www | `/assets/portal.{css,js}` | sim | não | não | não | baixo: cria `Response` |
| apex/www | `/data/cities/<slug>` e profiles | sim | não | ACTS_DATA em cache miss | não | médio: cache, R2, headers/stream |
| apex/wildcard | `/media/<id>` | sim | **1 lookup** | ACTS_MEDIA | não | médio: D1 + R2 |
| wildcard | `/` | sim | não | ACTS_DATA (profile) | não | alto: R2, parse JSON e HTML SSR |
| wildcard | `/assets/minisite.css` | sim | não | não | não | baixo |
| apex | `/painel`, seus CSS/JS | sim | não | não | não | baixo |
| apex | `/admin`, seus CSS/JS | sim | não | não | não | baixo |
| apex | `/api/auth/*`, `/api/me*`, `/api/admin/*` | sim, permitido | sim conforme operação | upload/delete | em alterações publicáveis | médio/alto |
| apex | webhook/checkout/pagamentos/upload | sim, permitido | sim | upload/delete | quando publica | alto/fetch externo |
| Queue consumer | lote de publicação | não é pageview | sim | ACTS_DATA write/delete | consumidor | alto |

Por pageview, contando apenas requests presentes no frontend:

| Tela | Base Worker anterior | Acréscimo |
|---|---:|---|
| home | **3**: HTML + CSS + JS | nenhuma chamada JSON/imagem na home atual |
| cidade | **4**: HTML + CSS + JS + 1 JSON | `+ M` por M imagens `/media` carregadas |
| perfil/anúncio | **4 + M** | usa o mesmo JSON da cidade, mais M imagens |
| minisite | **2 + M** | HTML SSR (1 leitura R2), CSS, M mídias (cada uma D1+R2) |
| painel, abertura típica | **4** | HTML+CSS+JS e `/api/me`; outras APIs só por interação |
| admin, abertura | **3** | HTML+CSS+JS; busca administrativa só quando submetida |

Logo, para audiência pública anterior, `N` não é único: home `N=3`; cidade `N=4+M`; perfil `N=4+M`; minisite `N=2+M`.

## C. Worker atual

Por que a visita pública chegava ao Worker: (1) Custom Domain exato no apex; (2) Worker Route wildcard; (3) `fetch()` sempre chamava `routeRequest`; (4) `asset()` devolvia JS/CSS gerados por módulos; (5) `apexResponse()` criava HTML; (6) `dataResponse()` intermediava R2; (7) `minisiteResponse()` lia, parseava e renderizava; (8) `mediaResponse()` intermediava D1 e R2.

O módulo de entrada tem 20 imports estáticos diretos (publicação, frontend, banco, auth, pagamentos, admin etc.); carregamento efetivo/custo por isolate depende da plataforma. A correção adiciona fail-closed antes de criar runtime/bindings e reduz as rotas remotas a `/api/*`. Código público legado ainda presente fica inalcançável pela configuração e pode ser removido depois da observação de produção.

## D. D1 atual

HTML/JSON público não lia D1, mas **cada mídia pública** fazia `SELECT r2_key, mime_type FROM media`. APIs autenticadas e publisher continuam legitimamente em D1. Meta nova: pageview não alcança Worker nem D1; publicação continua D1 → Queue → R2.

## E. R2 atual

ACTS_DATA era lido via Worker para projeções; ACTS_MEDIA via Worker após D1. `caches.default` reduzia algumas leituras de dados, mas nunca removia a invocação. No alvo, cache miss vai diretamente ao Custom Domain R2; hit fica na edge. Usar Custom Domain, nunca `r2.dev`, ETag, Cache Rules, Tiered Cache e TTL; JSON curto/revalidável e mídia versionada longa/immutable.

## F. Blogger atual

Antes da correção, o Blogger era buscado no **Queue consumer**, não por pageview, com Atom XML, `fast-xml-parser` e `sanitize-html`, e os posts eram gravados na projeção. A correção publica apenas `bloggerFeedUrl`; o publisher não faz fetch externo nem grava status de sync. Isso evita fetch por visita, mas diverge da regra browser-first e produz D1 writes de status durante publicação.

A PoC do shell usa o feed JSON (`alt=json`) diretamente no browser e renderiza somente título/link por DOM seguro (`textContent`), nunca HTML externo. CORS real varia por endpoint/configuração do blog; se `fetch` for bloqueado, o shell omite a seção. Não se adicionará proxy Worker. Alternativas browser-side a validar são a Blogger API v3 com credencial pública restrita ou o feed JSON-in-script/JSONP; JSONP executa script de terceiro e não deve ser habilitado sem avaliação CSP/risco. Referência oficial: [Blogger API: Working with Blogs](https://developers.google.com/blogger/docs/3.0/using#WorkingWithBlogs).

## G. Static Assets

Workers Static Assets é ótimo para arquivos conhecidos: `[assets]`, asset-first e `run_worker_first=false` fazem hits de assets não executarem script. Porém paths arbitrários de cidade/anúncio e wildcard exigem que o asset exista exatamente ou um fallback; fallback dinâmico no script voltaria a invocar Worker. Seria simples e integrado ao Wrangler, mas acopla frontend e API e não resolve sozinho o wildcard/SSG variável. Nunca usar `run_worker_first=true` global. Referência: [Static Assets routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).

## H. Pages

Pages é adequado ao apex: static assets, SPA/CSR, apex custom domain e GitHub build/deploy. A limitação decisiva é não aceitar wildcard custom domains; portanto não hospeda sozinho 10.000 minisites. `public/`, `_headers`, `_redirects` e `npm run build:public` preparam o frontend sem criar projeto/deploy. Referências: [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) e [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/).

## I. R2 Custom Domain

Associar `dados.imobiliarista.net` a `acts-dados` e `media.imobiliarista.net` a `acts-midias`. Apenas artefatos intencionalmente públicos podem estar nesses buckets/domínios. Custom Domain permite cache; `r2.dev` não é produção. Cache Rules: cachear GET/HEAD; respeitar ETag; dados `Edge TTL` moderado e browser revalidável; mídia com nome imutável e TTL longo; habilitar Tiered Cache. Referência: [R2 custom domains and caching](https://developers.cloudflare.com/r2/buckets/public-buckets/).

## J. Wildcard DNS

Um registro proxied `*.imobiliarista.net` cobre os clientes sem 10.000 entradas. Reservar explicitamente apex, `www`, `dados`, `media` e `api`, pois registros exatos têm precedência. DNS só resolve hostname; não escolhe objeto por slug.

## K. Origin/Rewrite Rules

Origin Rules podem alterar DNS origin/Host header; Transform Rules podem reescrever URI com expressões. Não foi possível provar localmente nem assumir que o plano da conta permite extrair o primeiro label do hostname e interpolá-lo de modo seguro em `/minisites/<slug>/index.html`. Além disso, apontar um hostname wildcard a um Custom Domain R2 envolve validação/TLS/origin host. Portanto a recomendação **não depende** dessa derivação. Regras remotas exatas a criar na migração:

1. wildcard DNS proxied para a origem estática escolhida;
2. Origin Rule somente `http.host wildcard` para a origem que contém o shell, com DNS override e Host header aceito pela origem;
3. rewrite somente `/` para o **mesmo** `/minisite-shell/index.html` (constante, sem slug);
4. assets apontam ao apex; o browser extrai o slug;
5. nenhuma Worker Route deve casar com wildcard.

Validar em conta de staging com Trace antes de produção. Referências: [Origin Rules settings](https://developers.cloudflare.com/rules/origin-rules/features/) e [URL Rewrite expressions](https://developers.cloudflare.com/rules/transform/url-rewrite/).

## L. Solução do wildcard 10.000 minisites

A solução robusta é shell único: `location.hostname.split('.')[0]`, validação estrita do slug e GET direto a `https://dados.../profiles/<slug>.json`. A PoC está em `public/minisite-shell` e `public/assets/minisite.js`. Resultado: 0 Worker, 0 D1, 0 Queue por visita; crescem edge requests, pequenas tarefas do browser e R2 cache misses.

**CSR versus HTML materializado:** shell+JSON minimiza storage/publicação, mas meta/OG/structured data por perfil só aparecem depois de JS. SSG gera HTML indexável e rápido, exige escrever/invalidation por alteração. O template SSR existente medido com fixture gera aproximadamente o tamanho verificável pelo comando indicado em AB; multiplicar esse valor por 10.000 dá a projeção de storage, sem adotar 30 KB como fato. Recomendação: shell para rollout e HTML materializado por publisher para páginas SEO prioritárias, nunca SSR por pageview.

## M. Arquitetura recomendada

**RECOMENDADA — híbrida Pages + R2 Custom Domains/Cache + wildcard shell estático + Worker API-only.**

```text
apex/www → Pages (HTML/CSS/JS/painel/admin)
dados → R2 acts-dados + edge cache
media → R2 acts-midias + edge cache
wildcard → origem estática/R2 do shell único → browser resolve slug → dados R2
/api/* → Worker → D1/Queue/R2 de publicação
Blogger → browser (quando CORS/API permitir), sem proxy
```

Ela preserva GitHub para código, escala 10.000 anunciantes sem domínios manuais, elimina compute/D1/KV público e separa atualização de audiência. Pages sozinho perde no wildcard; Static Assets sozinho tem fallback perigoso; R2 sozinho perde ergonomia Git/build do portal.

## N. Antes × Depois

| Item | Atual | Static Assets | Pages | R2/Edge | Híbrido recomendado |
|---|---:|---:|---:|---:|---:|
| Worker/visita pública | N=2..4+M | 0 para asset conhecido; fallback pode >0 | 0 | 0 | **0** |
| CPU Worker pública | N × C desconhecida | 0 nos assets | 0 | 0 | **0** |
| D1/visita | M em páginas com mídia | 0 se mídia direta | 0 | 0 | **0** |
| R2 origin reads | minisite/JSON + M, mitigados por cache Worker | depende | depende dos dados | cache misses | cache misses |
| edge delivery | parcial | sim | sim | sim | sim, dominante |
| wildcard 10k | sim, via Worker | não sozinho | não | shell/origin a validar | sim, shell constante |
| GitHub deploy | Wrangler/repo | sim | nativo | artefatos separados | sim |
| complexidade | média, acoplada | baixa/média | baixa no apex | média | média, separada |

| Métrica | Hoje | Solução nova | Redução |
|---|---:|---:|---|
| Worker público/visita | `N=2..4+M` conforme tela | 0 | `N` invocações; percentual não único |
| CPU Worker pública | `N × C`, C desconhecida | 0 | toda CPU pública; ms indisponíveis |
| D1 público/visita | `M` para mídia; 0 demais | 0 | M reads quando há mídia |
| Queue/visita | 0 | 0 | nenhuma; já não publicava em GET |
| servidor render público | 1 no minisite; shell no portal | 0 | toda renderização por pageview |
| browser processing | parse/render portal; baixo minisite | maior | JSON, template e Blogger no cliente |
| R2 origin | JSON/minisite/mídia via Worker | somente cache misses | depende do hit ratio |
| Edge delivery | cache parcial | dominante | não há base para percentual |

## O. Processamento servidor

| Processamento | Atual | Novo |
|---|---|---|
| roteamento público | Worker | edge/browser |
| renderização HTML | Worker no minisite | browser ou SSG na publicação |
| parse JSON | Worker + browser | browser |
| Blogger parse | Queue/publisher | browser quando possível |
| D1 lookup | mídia pública | zero |
| template público | Worker | browser/SSG |
| auth | servidor | servidor |
| payments | servidor | servidor |

Classificação: asset/HTML shell **BAIXO**; JSON cache/R2 **MÉDIO**; mídia D1+R2 **MÉDIO**; minisite R2+parse+template **ALTO** relativo; API/auth **MÉDIO**; pagamentos/publicação/Blogger **ALTO**. Novo pageview: servidor **ZERO**, browser **BAIXO/MÉDIO**.

## P. Worker invocations

Modelo: `execuções = visitas × N`. Não misturar APIs privadas.

| Visitas | Atual home (N=3) | Atual cidade/perfil (`N=4+M`) | Atual minisite (`N=2+M`) | Novo público |
|---:|---:|---:|---:|---:|
| 1 | 3 | 4+M | 2+M | 0 |
| 1.000 | 3.000 | 1.000×(4+M) | 1.000×(2+M) | 0 |
| 100.000 | 300.000 | 100.000×(4+M) | 100.000×(2+M) | 0 |
| 1.000.000 | 3.000.000 | 1.000.000×(4+M) | 1.000.000×(2+M) | 0 |
| 10.000.000 | 30.000.000 | 10.000.000×(4+M) | 10.000.000×(2+M) | 0 |

## Q. CPU Worker

**CPU medida: indisponível.** Não há profiler local confiável equivalente ao isolate/colo. Atual: total `visitas × N × C`, onde C é CPU média observável no dashboard. Novo: `0 × C = 0` para público. APIs conservam CPU real.

## R. D1

Atual mídia: `visitas × M` lookups no pior caso do navegador, independentemente de cache R2 do objeto no código. Novo: 0 público. D1 fica restrito a alterações, auth, pagamentos, admin e publicação.

## S. R2 origin

Novo não significa zero R2: cada objeto ausente na cache causa read de origem; hits não. Estimar `reads ≈ requests cacheáveis × (1-hit_ratio)` por região/chave/TTL, sem inventar hit ratio. Monitorar Cache Analytics/`CF-Cache-Status`, R2 Class B, bytes e chaves quentes separadamente.

## T. Processamento navegador

O browser passa a identificar rota/hostname, buscar JSON, parsear, filtrar, montar DOM e opcionalmente ler Blogger. Isso aumenta levemente CPU/memória cliente, intencionalmente, e remove CPU central por audiência. Há estados de erro e validação de URL/slug; nenhuma inserção de HTML Blogger bruto.

## U. 10 mil anunciantes

10 alterações/visitas não devem ser confundidas. Se cada anunciante altera dados 1 vez/dia, são ~10.000 operações backend/dia, mais Queue/publicações correlatas; são independentes dos pageviews.

## V. 100 mil visitas

Cenário conservador (10/dia/cliente): atual `100.000×N`; novo 0 Worker/D1 público. Edge atende assets/dados; R2 vê misses.

## W. 1 milhão de visitas

Cenário médio (100/dia/cliente): atual `1.000.000×N`; novo 0 Worker/D1 público. O custo cresce em edge delivery/browser e misses R2.

## X. 10 milhões de visitas

Cenário alto (1.000/dia/cliente): atual `10.000.000×N`; novo 0 Worker/D1 público. Backend de alterações permanece da ordem das operações reais, não da audiência.

## Y. SEO

CSR pode atrasar indexação e não personaliza title, description, canonical, Open Graph ou JSON-LD no HTML inicial. Migrar sem SSR: publisher gera HTML estático incremental para cidade/perfil/minisite prioritário quando dados mudam, junto ao JSON; define canonical/OG/structured data e invalida apenas artefatos relacionados. O shell continua fallback. Medir indexação e rich results antes de ampliar.

## Z. Segurança

JSON público usa allowlist e nunca contém email, hash, sessão, segredo de pagamento, admin ou auditoria. CORS recomendado em dados: permitir `https://imobiliarista.net`, `https://www...` e `https://*.imobiliarista.net` se a configuração R2 aceitar origem wildcard; caso contrário, dados deliberadamente públicos podem usar `Access-Control-Allow-Origin: *` **sem credentials**, documentando que confidencialidade não depende de CORS. Mídia pública pode ser legível publicamente. APIs usam same-origin path `/api` no apex e conteúdo privado nunca é cacheado. CSP limita connect ao domínio de dados e Blogger; sanitização DOM evita `innerHTML` externo.

## AA. Mudanças de código

- Rotas Wrangler tornadas API-only, removendo apex Custom Domain e wildcard Worker Route.
- Worker rejeita qualquer request fora de apex `/api/*` antes de criar runtime/storage.
- Build determinístico materializa portal, painel e admin em `public/`; Pages controls adicionados.
- Portal busca cidade diretamente no Custom Domain de dados.
- Shell wildcard PoC extrai/valida hostname, busca profile R2 e faz Blogger browser-side fail-closed.
- Testes arquiteturais protegem rotas, ausência de bindings e artefatos.

## AB. Testes

Comandos obrigatórios e resultados devem ser registrados no PR/final: `npm ci`, `npm run lint`, `npm test`, `npm audit --audit-level=moderate`, `git diff --check`. Medida de HTML real: `node -e "import('./frontend/minisite/template.js').then(({minisiteDocument})=>console.log(Buffer.byteLength(minisiteDocument(JSON.parse(require('fs').readFileSync('tests/fixtures/profile-test.json')),'anunciante-teste'))))"`; multiplicar o resultado por 10.000.

## AC. Dry-run

Como `wrangler.toml` mudou, executar `npx wrangler deploy --dry-run --env production`. Dry-run apenas empacota/valida; não fazer deploy real.

## AD. Git

Alterações serão commitadas na branch de trabalho atual e PR aberto contra `main`. Nenhuma alteração remota Cloudflare integra o commit.

## AE. Plano de migração

1. **Static assets:** criar Pages staging, build `npm run build:public`, testar apex/painel/admin. Rollback: manter DNS no Worker antigo.
2. **JSON/R2:** criar Custom Domains, CORS e Cache Rules; publicar em paralelo; comparar payload/ETag. Rollback: frontend volta temporariamente ao endpoint anterior durante janela controlada.
3. **Wildcard:** configurar origem/rewrite constante para shell em staging wildcard, testar TLS, host, 404, CORS, Blogger e SEO. Rollback: restaurar route/origem wildcard antiga (com custo Worker temporário).
4. **Remover public Worker routes:** aplicar rotas API-only, monitorar 404/API/Worker metrics e retirar código público legado após estabilidade. Rollback: restaurar configuração versionada anterior; nunca publicar em GET.

Cada fase é canário, observa logs/métricas antes da seguinte e não exige downtime.

## AF. Pendências

- Autenticar no painel Cloudflare e validar entitlement/sintaxe de Origin/Rewrite Rules com Trace.
- Criar Pages, Custom Domains R2, CORS, cache/tiered cache e DNS — fora desta tarefa.
- Definir versionamento/invalidação e URLs diretas de mídia (publisher hoje emite `/media/<id>`).
- Implementar SSG incremental para SEO e manifests/favicon/fontes ainda inexistentes no repo.
- Validar CORS real em blogs Blogger representativos; não criar proxy se falhar.
- Dashboards/alerts: Worker requests e CPU por route, D1 rows, Queue, R2 Class B, cache hit/miss e tráfego de origem.
