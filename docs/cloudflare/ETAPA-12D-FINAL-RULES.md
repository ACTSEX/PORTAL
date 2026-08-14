# Cloudflare Dashboard — ETAPA 12D-FINAL

Este é um roteiro operacional; **não foi aplicado remotamente**. Validar disponibilidade das Rules no plano e usar Cloudflare Trace antes da ativação.

## 1. DNS e origens

| Tipo | Nome | Destino | Proxy |
|---|---|---|---|
| CNAME | `www` | origem estática do apex/Pages indicada pela Cloudflare | Proxied |
| CNAME | `dados` | Custom Domain do bucket `acts-dados` | Proxied |
| CNAME | `media` | Custom Domain do bucket `acts-midias` | Proxied |
| CNAME | `*` | hostname da origem estática que contém `minisite-shell/index.html` | Proxied |

Registros exatos `www`, `dados`, `media` e apex têm precedência sobre `*`. Não criar `*.*`; `www.<slug>.imobiliarista.net` não faz parte do produto e não se assume coberto pelo certificado `*.imobiliarista.net`.

## 2. Redirect Rule canônica WWW

Criar **Single Redirect**, antes de regras de origem:

- nome: `canonical-www-to-apex`;
- match: `http.host eq "www.imobiliarista.net"`;
- status: `308`;
- target dinâmico: `concat("https://imobiliarista.net", http.request.uri.path)`;
- preserve query string: **enabled**;
- preserve path: incorporado em `http.request.uri.path`;
- Worker: nenhum.

Aceitação via `curl -sS -I`:

| Entrada | `Location` esperado |
|---|---|
| `https://www.imobiliarista.net/` | `https://imobiliarista.net/` |
| `https://www.imobiliarista.net/cidade/sao-paulo` | `https://imobiliarista.net/cidade/sao-paulo` |
| `https://www.imobiliarista.net/cidade/sao-paulo?x=1` | `https://imobiliarista.net/cidade/sao-paulo?x=1` |
| `https://www.imobiliarista.net/api/me` | `https://imobiliarista.net/api/me` |

A última URL somente alcança o Worker **depois** do redirect e de uma nova requisição ao host canônico.

## 3. Wildcard: Origin Rule

Aplicar apenas após a origem estática estar operacional:

- match: `http.host matches "^[a-z0-9]+(?:-[a-z0-9]+)*\\.imobiliarista\\.net$"`;
- excluir hosts reservados: apex não casa; adicionar `not http.host in {"www.imobiliarista.net" "dados.imobiliarista.net" "media.imobiliarista.net"}`;
- DNS override: hostname da origem estática do shell;
- Host header override: hostname que essa origem aceita;
- SNI: hostname da origem;
- nenhuma Worker Route wildcard.

Origin Rules não derivam o slug nem escolhem objetos: todos os hosts recebem o mesmo shell. A disponibilidade de override/SNI deve ser confirmada no plano com Trace.

## 4. Wildcard: URL Rewrite Rule

- mesmo match seguro da Origin Rule;
- quando path for `/`, rewrite estático para `/minisite-shell/index.html`;
- quando path for `/assets/minisite.css` ou `/assets/minisite.js`, servir o asset estático correspondente (ou usar URLs absolutas do apex, como a PoC);
- outros paths: 404 estático; não fazer fallback a Worker/D1.

Não é necessário nem recomendado interpolar o hostname em uma key R2. O navegador deriva o slug e solicita `/tenants/<slug>/profile.json` diretamente.

## 5. R2 Custom Domains e CORS

- `dados.imobiliarista.net` → `acts-dados`;
- `media.imobiliarista.net` → `acts-midias`;
- desabilitar uso de `r2.dev` em produção;
- dados são públicos, sem cookies/credentials: permitir GET/HEAD de `https://imobiliarista.net` e origens oficiais `https://<slug>.imobiliarista.net`; se o mecanismo não aceitar wildcard de origem, `Access-Control-Allow-Origin: *` é aceitável somente para estes objetos deliberadamente públicos e sem credentials;
- mídia pública: GET/HEAD, sem credentials.

## 6. Cache Rules

1. **Dados JSON**: host `dados...`, métodos GET/HEAD, extensão `.json`; cache eligible, Edge TTL 300 s, Browser TTL 60 s, respect origin ETag, stale-while-revalidate quando disponível, Tiered Cache ligado.
2. **Mídia**: host `media...`, GET/HEAD; cache eligible, Edge/Browser TTL longo para keys imutáveis, respect ETag, Tiered Cache ligado.
3. **Shell/assets**: origins estáticas; HTML TTL curto/revalidável, assets versionados TTL longo.
4. **Bypass**: `/api/*`, painel/admin responses privados, cookies/sessões e qualquer objeto não público.

Cache miss pode acessar somente a origem R2/estática. Nunca configurar fallback a Worker, D1, Queue ou publisher.
