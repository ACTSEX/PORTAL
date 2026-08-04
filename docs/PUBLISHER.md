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
