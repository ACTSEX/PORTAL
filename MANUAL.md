# PORTAL DE ANÚNCIOS
# MANUAL — CONSOLIDAÇÃO OFICIAL

Este é o documento único de referência do projeto. Consolida a
especificação mestre original, o adendo técnico e todos os ajustes
aprovados em revisão.

Este arquivo é lido integralmente pelo agente de programação (Claude
Code) a cada execução, direto do GitHub. Em caso de dúvida durante a
implementação, este documento é a fonte oficial.

Se este manual e qualquer outro documento do repositório entrarem em
conflito, este manual prevalece.

============================================================
1. O QUE É O PROJETO
============================================================

Portal de anúncios com quatro interfaces:

1. PORTAL PÚBLICO — dominio.com
2. MINISITES DOS ANUNCIANTES — nome.dominio.com
3. PAINEL DO ANUNCIANTE — dominio.com/painel
4. ADMINISTRAÇÃO — dominio.com/admin

O sistema deve ser entregue como produto funcional, progressivamente.
Não entregar apenas arquitetura, documentação, placeholders ou telas
sem funcionamento.

============================================================
2. ESCALA REAL DO PROJETO
============================================================

Volume de referência validado:

- Maior cidade: até 3.500 anúncios.
- JSON de listagem da maior cidade: menos de 1MB comprimido.

Consequência direta:

- NÃO particionar `cities/{cidade}.json` por diretório.
- NÃO criar manifest multi-arquivo por DIR.
- Um único arquivo por cidade é suficiente em todos os casos
  conhecidos. Reavaliar apenas se uma cidade ultrapassar
  ~10.000 anúncios.

============================================================
3. PRINCÍPIO FUNDAMENTAL
============================================================

O banco de dados (D1) é a fonte da verdade e concentra toda escrita.
A navegação pública NUNCA consulta D1 repetidamente.

Fluxo geral:

```
D1 (escreve)
  → PUBLISHER
  → R2 DATA (JSON público) + R2 MEDIA (fotos/vídeos/áudio)
  → CLOUDFLARE EDGE CACHE
  → NAVEGADOR
  → JAVASCRIPT / FILTROS LOCAIS
```

O estado público é publicado como projeções (JSON). Filtro de
diretório, categoria, tag e ordenação acontece no navegador, em cima
do catálogo já carregado — nunca gera nova consulta ao banco.

============================================================
4. DIVISÃO DE PERSISTÊNCIA
============================================================

**D1** — banco transacional, fonte da verdade, escrita.
Contas, anunciantes, perfis, anúncios, cidades, diretórios,
categorias, tags, planos, assinaturas, pagamentos, boosts, estados
editoriais e de publicação, referências de mídia.

**R2 MEDIA** — arquivos binários originais.
Fotos, vídeos, áudio. Upload direto do anunciante. NÃO é derivado —
se perder o arquivo, perdeu de verdade. Precisa de proteção real
(versionamento de bucket ou backup cruzado).

**R2 DATA** — conteúdo público derivado, texto/JSON.
Catálogos de cidade, perfis, detalhes de anúncio, manifests,
índices, artefatos publicáveis. NÃO é fonte da verdade — sempre
reconstruível a partir do D1. Não precisa de backup dedicado.

Critério de separação (nunca misturar em um bucket só):

```toml
[[r2_buckets]]
binding = "R2_DATA"
bucket_name = "portal-data"

[[r2_buckets]]
binding = "R2_MEDIA"
bucket_name = "portal-media"
```

============================================================
5. VERSIONAMENTO E PUBLICAÇÃO ATÔMICA
============================================================

Todo artefato em R2 DATA usa nome de arquivo IMUTÁVEL baseado em
hash de conteúdo (sha256, 6-8 caracteres). Nunca sobrescrever um
arquivo já publicado.

```
cities/{cidade}.{hash}.json        Cache-Control: public, max-age=31536000, immutable
cities/{cidade}.manifest.json      Cache-Control: public, max-age=30, must-revalidate

listings/{slug}.{hash}.json        immutable
profiles/{slug}.{hash}.json        immutable
profiles/{slug}.manifest.json      max-age=30
```

O manifest é o único arquivo com cache curto e aponta para o hash
ativo:

```json
{ "current": "a3f9c1" }
```

Fluxo de publicação:

1. Publisher gera o JSON a partir do D1.
2. Calcula hash do conteúdo.
3. Escreve `arquivo.{hash}.json` (nunca sobrescreve).
4. Só depois de confirmada a escrita, atualiza o manifest.
5. Manifest nunca é escrito antes do arquivo versionado existir.

Hash determinístico a partir do conteúdo (não timestamp) garante
idempotência: reentrega/retry do publisher gera o mesmo hash e a
mesma escrita, sem duplicar efeito.

Mudança de cidade, diretório, categoria ou tag em um anúncio exige
republicação de todas as projeções afetadas (cidade de origem,
cidade de destino, projeção individual do anúncio). Nunca deixar
anúncio fantasma em projeção antiga.

============================================================
6. CACHE EM CAMADAS
============================================================

Ordem de resolução, da mais barata para a mais cara. O Worker
sempre tenta sair pela camada mais barata:

1. Constantes em memória do Worker (subdomínios reservados, nomes
   de DIR/CAT) — zero I/O.
2. Cache API do Workers (`caches.default`) — evita releitura de R2
   no mesmo datacenter.
3. R2 (DATA para JSON, MEDIA para binário) — já serve com headers
   de cache longos/versionados.
4. D1 — nunca no caminho de leitura pública. Só em mutação ou rota
   privada autenticada.

Nota: `caches.default` é por datacenter, não global. Não substitui
os headers `Cache-Control` (que propagam para o Cloudflare Edge
Cache e o navegador) — os dois mecanismos coexistem.

Resolução de hostname de minisite segue a mesma regra: leitura
cacheável (`profiles/{slug}.manifest.json`, cache de 30s), não
decisão recalculada a cada request.

Não adicionar KV como dependência inicial. Não duplicar os mesmos
dados em D1 + R2 + KV + outro cache sem necessidade comprovada. Não
adicionar Service Worker automaticamente — HTTP cache + Edge +
cache do navegador é suficiente até haver necessidade comprovada.

============================================================
7. ROTEAMENTO — WORKER ÚNICO
============================================================

Um único Worker. Um único repositório GitHub. Nunca criar Worker
separado por domínio/subdomínio/função (nunca `worker-auth`,
`worker-listings`, `worker-payments`, etc.).

O entrypoint (`worker/index.js`) decide a rota e só então importa o
código correspondente via `import()` dinâmico:

```
REQUEST
  → hostname reservado? (www/admin/api/painel) — decisão em memória
  → hostname != domínio principal? → import dinâmico de minisite
  → path /admin?  → import dinâmico de admin
  → path /painel? → import dinâmico de painel
  → path /data/*  → handler de dados públicos (sem import pesado)
  → default       → import dinâmico de portal
```

O caminho público (leitura de JSON/mídia, maior parte do tráfego)
nunca carrega código de autenticação, pagamentos ou admin. O
handler de `/data/*` é deliberadamente burro: lê do R2 e devolve o
body sem transformação, sem parse de JSON no servidor.

============================================================
8. ALLOWLIST DE DADOS PÚBLICOS
============================================================

Antes de adicionar qualquer campo ao publisher, aplicar o teste:

**"Se esse campo vazar publicamente amanhã, algum anunciante ou
usuário é prejudicado?"**

Sim → fica no D1, nunca entra na allowlist.
Não → pode entrar no JSON público.

Implementação correta — objeto novo, campos explícitos:

```javascript
function toPublicListing(row) {
  return {
    slug: row.slug,
    title: row.title,
    city: row.city,
    directory: row.directory,
    category: row.category,
    tags: row.tags,
    thumbnail: row.thumbnail,
    badge: row.badge,
  };
}
```

Nunca usar destructuring de exclusão (`const { password, ...rest }
= row`) — vaza qualquer campo novo adicionado no futuro sem que
ninguém perceba.

Card no catálogo de cidade permanece enxuto. Dados extensos
(descrição completa, características, galeria) vivem apenas em
`listings/{slug}.json`, carregado sob demanda quando o anúncio
abre.

Nunca em JSON público: senha, token, secret, documento, e-mail
privado, telefone privado, dados financeiros, cobrança, moderação
interna, auditoria.

============================================================
9. MÍDIA — COMPRESSÃO E PROTEÇÃO
============================================================

**Compressão acontece no navegador do anunciante**, antes do
upload — não no Worker, não em serviço externo pago. Custo zero de
CPU para a plataforma.

```javascript
const VARIANTS = {
  thumb:  { maxWidth: 300,  quality: 0.75 },
  card:   { maxWidth: 600,  quality: 0.80 },
  medium: { maxWidth: 1200, quality: 0.82 },
  large:  { maxWidth: 1920, quality: 0.85 },
};

async function resizeImage(file, { maxWidth, quality }) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = new OffscreenCanvas(
    bitmap.width * scale,
    bitmap.height * scale
  );
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({ type: 'image/webp', quality });
}
```

Formato de saída: WebP. Reencodar descarta metadata EXIF (GPS,
modelo do aparelho) — proteção de privacidade do anunciante como
efeito colateral necessário.

Fallback: se `OffscreenCanvas`/`createImageBitmap` não existir,
sobe o arquivo original sem compressão client-side. Compressão
server-side só como plano B raro, não como caminho principal.

**O servidor nunca confia que o navegador de fato comprimiu.**
Mesmo com compressão client-side, o Worker:

1. Autentica e verifica ownership antes de autorizar upload.
2. Valida o `Content-Type` real do arquivo (não confia no header).
3. Valida tamanho pós-compressão (rejeita acima de um teto, ex.:
   2MB por variante).
4. Controla a chave final do objeto no R2 — nunca aceita chave
   vinda do cliente.
5. Verifica limite de quantidade de mídia por anúncio antes de
   autorizar novo upload.

Upload usa URL assinada (presigned) com expiração curta e escopo
restrito à chave exata gerada pelo servidor.

Chave de mídia usa identificador não sequencial
(`crypto.randomUUID()`) — impede enumeração de mídia de outros
anunciantes. Bucket R2 MEDIA nunca permite listagem pública de
objetos.

============================================================
10. FEED DO BLOGGER
============================================================

Blogger é CMS externo do anunciante. O Portal apenas armazena a
URL configurada. O minisite consome e renderiza o feed público —
nunca sincroniza posts para D1/R2/Queue sem necessidade comprovada.

Preferência: busca do feed 100% client-side, direto do minisite
para o domínio do Blogger.

Validação obrigatória, feita cedo (spike técnico na Fase 1, não
descoberta tardia): testar se o endpoint de feed retorna
`Access-Control-Allow-Origin` liberado para fetch cross-origin —
isso varia por configuração e pode mudar sem aviso.

Se CORS bloquear, ativar proxy fino no Worker — sem armazenar
nada, apenas relay:

```javascript
if (url.pathname === '/api/blogger-feed') {
  const slug = url.searchParams.get('slug');
  const profile = await getPublicProfile(slug, env);
  if (!profile?.blogUrl) return new Response('{}', { status: 404 });

  try {
    const res = await fetch(
      `${profile.blogUrl}/feeds/posts/default?alt=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error('feed indisponível');

    return new Response(await res.text(), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('{}', { status: 502 });
  }
}
```

Cache de 5 minutos no proxy evita martelar o Blogger a cada visita.
Timeout curto (5s) e falha silenciosa — a seção de publicações
desaparece de forma controlada; o restante do minisite nunca é
bloqueado. Conteúdo do feed nunca é inserido via `innerHTML` cru —
usar `textContent`, DOM seguro, sanitização quando indispensável.

Integração pode ser entitlement (`features.blogFeed`), controlado
centralmente por plano.

============================================================
11. TAGS — CURADORIA MÍNIMA
============================================================

Tags não são 100% livres:

- Lista de tags sugeridas/curadas por categoria, editável pelo
  admin (`status: approved`).
- Anunciante pode adicionar até um limite (ex.: 5) de tags fora da
  lista curada, normalizadas, com `status: pending`.
- Tags `pending` aparecem no anúncio normalmente, mas entram em
  fila de moderação assíncrona no admin.

Evita que tags livres sem curadoria virem vetor de spam/SEO.

============================================================
12. REBUILD
============================================================

Rebuild de uma cidade específica: síncrono, dentro da própria rota
admin. No volume validado (até 3.500 anúncios/cidade), roda em
segundos — não exige Queue.

```
POST /admin/rebuild?city={slug}
```

Rebuild total: enfileira uma mensagem por cidade na Queue e expõe
status:

```
GET /admin/rebuild/status
→ { total: N, done: M, failed: [...] }
```

============================================================
13. QUEUE — QUANDO USAR
============================================================

Publicar uma cidade (query D1 + serialização + escrita versionada
em R2 DATA) é sub-segundo no volume validado. Não é obrigatório
usar Queue no caminho crítico de publicação individual — pode
rodar síncrono, dentro da própria requisição de salvar do painel.

Queue fica reservada para: publicação em lote, rebuild total, e
processamento assíncrono futuro caso a necessidade seja
comprovada. Não introduzir Queue por padrão arquitetural.

============================================================
14. PLANOS E ENTITLEMENTS
============================================================

STANDARD e PREMIUM. Regra comercial centralizada, nunca espalhada
em `if premium` pelo código:

```
features.minisite
features.blogFeed
features.boostPurchase
features.extraMedia
```

STANDARD: conta, anúncio, card, mídia permitida, contatos
públicos, presença no catálogo.

PREMIUM: tudo do STANDARD + minisite + subdomínio + integração
Blogger + possibilidade de comprar recursos extras. PREMIUM não
inclui boost gratuito por padrão.

============================================================
15. SEGURANÇA — RESUMO OPERACIONAL
============================================================

- Ownership verificado no backend em toda mutação — frontend nunca
  decide sozinho se operação privada é permitida.
- SQL sempre parametrizado.
- Rate limit em: login, cadastro, recuperação, upload, contato,
  webhooks, operações administrativas sensíveis.
- CORS explícito — nunca liberar endpoints privados
  universalmente.
- Webhooks: autenticação/assinatura, idempotência, correlação,
  logs, transições permitidas. Reentrega nunca duplica pagamento
  ou benefício.
- Secrets nunca no Git, nunca enviados ao navegador. Tudo que
  chega ao browser é considerado público.
- Slugs normalizados, validados, únicos no escopo apropriado —
  impedir path traversal.

============================================================
16. ÁRVORE DE CÓDIGO — MODELO FINAL APROVADO
============================================================

```
portal-anuncios/
│
├── .github/
│   └── workflows/
│       └── deploy.yml            # lint → testes → wrangler deploy
│
├── worker/
│   └── index.js                  # ÚNICO entrypoint + router inline
│
├── core/                         # infraestrutura, zero regra de negócio
│   ├── auth.js                   # sessão, autenticação, autorização técnica
│   ├── storage.js                # wrapper R2 (DATA + MEDIA)
│   ├── cache.js                  # Cache API + hash + manifest
│   └── config.js                 # domínio, limites, nomes centrais, features
│
├── business/
│   ├── http/                     # handlers HTTP finos, por interface
│   │   ├── portal.js              # dominio.com
│   │   ├── minisite.js            # nome.dominio.com
│   │   ├── painel.js              # dominio.com/painel (auth obrigatória)
│   │   └── admin.js               # dominio.com/admin (auth obrigatória)
│   │
│   ├── listings.js               # anúncios, categorias, tags, filtros
│   ├── accounts.js               # conta, anunciante, ownership
│   ├── locations.js              # cidades, diretórios, slugs
│   ├── plans.js                  # STANDARD/PREMIUM, entitlements
│   ├── payments.js               # regras financeiras
│   ├── payments-gateway.js       # integração externa isolada
│   ├── boosts.js                 # destaque, vigência, expiração
│   ├── media.js                  # validação upload, presigned URL
│   ├── blogger.js                # feed + proxy fallback
│   └── publishing.js             # gera JSON, versiona por hash, ativa manifest
│
├── frontend/
│   ├── shared/
│   │   ├── components/           # card, filtros, galeria — reusáveis
│   │   └── utils/                # normalização de tags, formatters
│   ├── portal/
│   │   ├── index.html
│   │   ├── cidade.html
│   │   └── anuncio.html
│   ├── minisite/
│   │   └── index.html            # UM template, dado muda por projeção
│   ├── painel/
│   │   ├── index.html
│   │   └── upload.js              # compressão client-side (Canvas/WebP)
│   └── admin/
│       └── index.html
│
├── database/
│   ├── schema.sql
│   └── migrations/
│       └── 0001_init.sql
│
├── tests/
│   └── *.test.js                 # plano, nomeado por domínio, sem subpasta
│
├── MANUAL.md                     # este arquivo — fonte oficial consolidada
├── package.json
├── wrangler.toml
└── .env.example
```

Regra prática para qualquer novo arquivo/pasta durante o
desenvolvimento: **"esse conteúdo já cabe em algo que existe sem
confundir dois assuntos diferentes?"** Se sim, não cria. Se não,
cria — mas só quando o conteúdo já existir de fato, nunca como
placeholder antecipado.

`core/db.js` foi deliberadamente omitido: um wrapper fino em cima
de `env.D1.prepare().bind()` não agrega nada além da própria API
do D1. Cada `business/*.js` chama `env.D1` diretamente. Só criar
esse arquivo se, na prática, surgir lógica real para centralizar
(ex.: log de query lenta, retry).

============================================================
17. GITHUB E CI/CD
============================================================

Todo o código mora no GitHub. Nenhum deploy manual.

```
push em main
  → checkout
  → npm ci
  → lint
  → testes
  → deploy via wrangler (Cloudflare)
```

Produção é sempre reproduzível a partir do estado do repositório.
Secrets de deploy ficam em GitHub Secrets, nunca commitados.

============================================================
18. INSTRUÇÃO DE EXECUÇÃO PARA O AGENTE DE PROGRAMAÇÃO
============================================================

Ao ser invocado, o agente (Claude Code) deve:

1. Ler este manual integralmente antes de qualquer alteração.
2. Verificar o estado real do repositório — não assumir pela
   documentação.
3. Comparar implementação atual com este manual.
4. Preservar código funcional compatível; remover duplicação ou
   legado somente quando necessário.
5. Não reiniciar o projeto sem justificativa.
6. Identificar a próxima fase incompleta e implementá-la
   completamente.
7. Rodar lint e testes localmente antes de commit.
8. Abrir Pull Request — não fazer push direto em `main` quando a
   alteração for estrutural.
9. Informar exatamente o que já pode ser acessado (URLs/rotas
   testáveis).
10. Continuar para a próxima fase.

============================================================
19. ORDEM DE CONSTRUÇÃO
============================================================

```
FASE 1  — Fundação (inclui spikes: CORS Blogger, wildcard DNS,
          esquema de hash/manifest)
FASE 2  — Home pública
FASE 3  — Cidade + cities/{cidade}.json
FASE 4  — DIR + categorias + tags + filtros locais
FASE 5  — Cards
FASE 6  — Página do anúncio
FASE 7  — Minisite
FASE 8  — Conta/autenticação
FASE 9  — Painel
FASE 10 — Uploads/R2 MEDIA (com compressão client-side)
FASE 11 — Planos/assinaturas
FASE 12 — Pagamentos
FASE 13 — Blogger
FASE 14 — Boosts
FASE 15 — Admin
FASE 16 — Publicação/rebuild
FASE 17 — SEO/performance/segurança
FASE 18 — Testes finais/deploy
```

O site precisa estar visível e utilizável durante todo o
desenvolvimento — nunca passar longos ciclos apenas em
infraestrutura invisível.

============================================================
20. PROIBIÇÕES
============================================================

NÃO:

- Consultar D1 a cada filtro de navegação pública.
- Criar aplicação por minisite.
- Criar JSON obrigatório por DIR sem necessidade comprovada.
- Publicar dados privados em JSON público.
- Adicionar KV automaticamente.
- Criar Worker separado por domínio/função.
- Adicionar frontend pesado sem justificativa.
- Criar dezenas de arquivos vazios ou placeholders.
- Criar microsserviços prematuramente.
- Colocar secrets no frontend.
- Editar migrations históricas.
- Usar Queue por padrão sem necessidade operacional comprovada.
- Comprimir mídia no servidor como caminho principal.
- Deixar tags 100% livres sem curadoria mínima.
- Confundir handler HTTP com regra de negócio no mesmo arquivo.
- Duplicar posts do Blogger no banco sem necessidade.
- Transformar o Portal em CMS de Blogger.

============================================================
FIM DO MANUAL.
============================================================
