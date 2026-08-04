ACTS Portal

PUBLISHER

Versão: 1.0Status: OficialEscopo: app/core/publisher.js

1. Objetivo

O Publisher é responsável por transformar dados aprovados em artefatos públicosotimizados para distribuição na Edge.

O Publisher não decide o que será publicado.

Essa decisão pertence aos módulos de negócio e ao módulo Publish.

2. Princípios

D1 é a única fonte de verdade.

KV limita-se a necessidades técnicas pequenas e comprovadas, fora da navegação pública normal.

R2 armazena arquivos permanentes.

Publicações devem ser incrementais.

Navegação pública deve evitar consultas ao D1.

3. Fluxo oficial

Alteração
    ↓
D1
    ↓
Evento
    ↓
Queue
    ↓
Publisher
    ↓
Renderer
    ↓
HTML / JSON
    ↓
R2
    ↓
Cache
    ↓
Visitante

4. Responsabilidades

O Publisher pode:

gerar HTML;

gerar JSON;

atualizar manifestos;

invalidar cache;

gravar em KV;

gravar em R2;

emitir eventos técnicos.

O Publisher não pode:

executar regras de negócio;

consultar diretamente entidades específicas;

aprovar conteúdo;

decidir prioridades comerciais.

5. Tipos de artefatos

páginas HTML;

JSON públicos;

sitemap;

robots;

feeds;

índices;

manifestos.

6. Publicação incremental

Sempre que possível, regenerar apenas os artefatos afetados.

Exemplos:

página de um anúncio;

índice de uma cidade;

sitemap parcial;

manifesto atualizado.

Evitar reconstruções completas sem necessidade.

7. Cache

Após a publicação:

atualizar R2;

invalidar cache relacionado;

disponibilizar a nova versão.

8. Renderer

O Publisher recebe dados prontos e delega a renderização ao Renderer.

O Renderer não consulta o banco.

9. Observabilidade

Registrar:

publicationId;

duração;

quantidade de artefatos;

destino;

sucesso ou falha.

10. Falhas

Uma falha de publicação deve:

ser registrada;

permitir reprocessamento;

não corromper artefatos válidos;

preservar a última versão publicada.

11. Critérios de aceitação

sem regras de negócio;

compatível com Cloudflare;

geração incremental;

uso correto de D1, KV e R2;

testável;

idempotente quando necessário.

12. Regra final

O Publisher existe para publicar artefatos estáticos de forma segura, eficientee previsível, mantendo a arquitetura Edge-first do Portal ACTS.

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

## Lote 9A — contrato implementado da Arquitetura 2.0

A publicação pública normal tem unidade de cidade. O Core recebe uma projeção autorizada reconstruída do D1, aplica allowlists e ordenação determinística e grava `cidades/<slug>/catalogo-vNNNNNN.json` no R2 com JSON UTF-8, schema `2.0`, SHA-256, tamanho, cidade e cache longo imutável. Após `head` confirmar tamanho e digest, grava `cidades/<slug>/manifest.json` com cache curto, versão vigente e referência anterior. O manifest anterior não é removido em falha e o rollback valida cidade, caminho, objeto e digest sem alterar o D1.

A Queue transporta somente identificadores técnicos. No processamento testável, mensagens do mesmo batch são agregadas por `cityId` e `citySlug`, duplicatas convergem por `eventId`, e toda mensagem entregue recebe confirmação ou retry. `dueAt` é cálculo informativo: não existe espera persistente entre batches. KV não armazena catálogo ou manifest e permanece técnico/privado; compressão é responsabilidade HTTP do Edge.

O Lote 9A implementou configuração técnica, producer e batch testáveis, allowlist, catálogo determinístico, digest da projeção e do artefato, objeto versionado imutável, confirmação por `head`, ativação posterior do manifest, preservação em falha, rollback, pacote/cota explícitos e idempotência persistida do pacote. Não implementou `queue()` de produção, binding do consumer ao runtime, projeção real do domínio, identidade canônica, versão concorrente persistente, conversão de eventos, janela entre batches, dead-letter, Cron, Cache Rules/domínio ou validação staging; essas entregas permanecem nos Lotes 13, 16B e 18.

## Decisão preparatória do Lote 13 — publicação por cidade (2026-08-04)

Esta decisão é documental; o Lote 13 continua não implementado. A auditoria encontrou incompatibilidade estrutural: `listings` tem apenas localização textual livre, o Core exige `cityId`, `citySlug` e versão inteira, e `publication_jobs` não conserva identidade, versão e manifest vigentes por cidade. Grafias, acentos, caixa, espaços e abreviações podem dividir uma cidade; homônimos e slugs repetidos podem uni-las. Mudança de cidade pode perder a origem, agrupar ou recompilar o destino errado e produzir manifest divergente. O schema é **insuficiente** e fica autorizada, somente como caminho `[P]`, `database/migrations/0003_city_publication_state.sql`.

### Cidade canônica e URL

`cities` nascerá sob demanda, após necessidade real e validação, sem carga preventiva de municípios. Terá `id` textual opaco, aleatório e estável no padrão aceito pelo Core (por exemplo `city_<id>`, nunca derivado do nome), `country_code` ISO alfa-2 maiúsculo, `region_name`, `region_key`, `name`, `city_key`, `slug`, `canonical_key`, `active`, `created_at` e `updated_at`.

A identidade inequívoca é `country_code + region_key + city_key`, nunca nome ou slug isolado. Exibição usa Unicode NFC; comparação usa NFKD, remoção de marcas diacríticas, casefold documentado, trim, espaços colapsados e pontuação/separadores normalizados. As keys não são exibidas. `canonical_key` e a tripla têm unicidade. O slug usa ASCII minúsculo, transliteração sem acentos, não alfanuméricos como hífen e hífens colapsados. Como o caminho atual usa somente slug, este é globalmente único: começa no nome; colisão recebe região/país (`santa-maria-rs-br`) e, se necessário, sufixo determinístico do `id`, nunca ordem de inserção. Homônimos regionais são cidades distintas.

Após primeira publicação, `id`, identidade e slug são imutáveis. Correção legítima muda o nome público; mudança real de identidade cria cidade nova e preserva a antiga/redirect em SEO. Cidade inativa não recebe anúncio novo, mas permanece auditável e referenciável, garantindo estabilidade de URLs.

### Projeção pública real

`Publish.js` carregará do D1 fotografia determinística da cidade: cidade; apenas anúncios `published`; categorias ativas efetivamente usadas; anunciantes distintos referenciados; perfis e mídia aprovados; reviews `published`; média e contagem; filtros, ordenações e dados de cidade, cards, detalhe, busca local, comparação e minisites. Ordenação tem desempate por id e anunciantes formam dicionário por id, sem duplicação por anúncio.

Allowlists: cidade (`id`, `slug`, `name`, `region`, `countryCode`); categoria (`id`, `slug`, `name`, `description`, `parentId`); anunciante (`id`, `name`, `slug`, `displayName`, `biography`, `avatarUrl`, `coverUrl`, `publicPhone`, `website`); anúncio (`id`, `slug`, `title`, `description`, `listingType`, `status`, `priceMinor`, `currency`, `categoryId`, `advertiserId`, `district`, `approximateLocation`, `attributes`, mídia pública, agregados aprovados, `publishedAt`, `updatedAt`); filtros/metadados calculados. Novo campo exige revisão e teste.

São proibidos e-mail privado, telefone sem autorização, documento, endereço completo, coordenada precisa, contatos, leads, notificações, pagamentos, assinaturas, moderação, tokens, chaves idempotentes, dados administrativos e `r2_key` quando se exige URL pública. Review não expõe PII do autor. SEO não consulta nem deriva dados privados.

### Estado, versão, concorrência e recuperação

`city_publication_state`, uma linha por cidade, complementará jobs e conterá `current_version`, `next_version`, digests ativos de projeção/artefato, caminho ativo, estado, `lease_token`, `lease_expires_at`, tentativas consecutivas, erro normalizado, última publicação, timestamps e revisão para compare-and-swap. Estados técnicos: `idle`, `queued`, `compiling`, `published`, `recoverable_failure`, `definitive_failure`; nunca estados de negócio.

Operação D1 atômica/condicional adquire lease ausente ou expirado e reserva/incrementa `next_version` no mesmo sucesso. Token e revisão elegem um vencedor: versões não colidem nem regridem. A reserva vira job antes da escrita; abandono fica como lacuna auditável. Retry do mesmo evento/job reutiliza a reserva. Nova versão só ocorre para projeção nova ou republicação explícita; digest igual conclui sem ativação e sem avalanche.

O lease inicial é 60 segundos, renovado pelo proprietário antes de restarem 20 segundos via `city_id + lease_token + revisão`. Expiração permite recuperação. Só o portador vigente registra sucesso/falha/ativação; concorrente faz ack se absorvido/atualizado ou retry com atraso e jitter. Worker morto nunca bloqueia indefinidamente.

Falhas transitórias de D1, Queue, R2, rede, timeout e confirmação são recuperáveis, com backoff exponencial+jitter e máximo de 5 tentativas por execução; contrato inválido, cidade inexistente, projeção inconsistente e violação de privacidade são definitivos até correção. O Core escreve catálogo imutável, confirma tamanho/digest e só então troca manifest. Depois, compare-and-swap no D1 registra versão/digests/caminho, libera lease e marca `published`. Confirmação ambígua reconcilia D1 com manifest validado, nunca por listagem R2.

Rollback valida artefato histórico da mesma cidade e troca manifest, mas não reduz `next_version`, apaga histórico ou reutiliza número. D1 registra o alvo ativo; a próxima publicação usa número maior que qualquer reserva. D1 segue fonte operacional e R2 origem pública. Cron complementar recupera leases/divergências no Lote 16B; o Lote 18 valida alarmes, retenção e reconciliação. Memória, timestamp, cliente, KV e listagem R2 não alocam versão.

`publication_jobs` continua histórico de **execução/tentativa**: id, recurso, alvo, status, artifact key, hash, tentativas, erro e publicação. Não é catálogo, vínculo listing–cidade, contador nem estado integral do manifest. Estados atuais podem representar o job; `target=kv` é legado e não pode servir catálogo/manifest 2.0. A `0003` complementa e só ajusta jobs para ligar cidade, reserva/versão e erro quando necessário, sem semântica falsa; vigente fica em `city_publication_state`.

### Agregação e fronteira

Publish decide **o que** publicar: fato confirmado, consulta D1, impacto, cidade(s), projeção e Queue. Core executa **como**: valida, serializa, calcula digest, grava/confirma R2, ativa manifest e rollback. Publish nunca grava R2, ativa manifest ou duplica Core.

Auditoria de `app/core/publish.js` confirma que o contrato atual cobre catálogo JSON e manifest de cidade (`publishCity`/`rollback`), mas não oferece contrato completo para sitemap e demais artefatos SEO. O Lote 13 pode alterar o Core existente, sem criar novos arquivos, para receber de módulos chaves previamente validadas, conteúdo serializado, content type allowlist, cache control autorizado, digest, metadados técnicos, estratégia de confirmação e operação técnica de ativação/substituição. Essa ampliação deve ser genérica: o Core não decide canonical, title, description, robots, noindex, URLs do sitemap, regra de indexação nem conteúdo SEO.

Fluxo autorizado: `Seo.js decide conteúdo e elegibilidade → Publish.js coordena o domínio → Core Publisher grava, confirma e ativa tecnicamente → R2/Edge entrega`. `Seo.js` permanece dono das decisões SEO e o Core apenas executa escrita, confirmação por `head`, digest, headers/cache e ativação técnica preservando artefato anterior em falha.

Pedido contém `eventId`, `type`, `version`, `cityId`, `citySlug`, `reason`, `correlationId`, `source`, `occurredAt`, sem PII/snapshot. `eventId + cityId + type/version` dá idempotência persistente. Agrupamento dentro do batch já é Core; cidades afetadas são Lote 13; janela entre batches é 16B; reconciliação é 16B/18. D1 não vira fila paralela.
