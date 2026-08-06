ACTS Portal

CLOUDFLARE

Versão: 1.0Status: Oficial

Objetivo

Este documento define como os serviços da Cloudflare serão utilizados pelo Portal ACTS.

A infraestrutura faz parte da arquitetura e não deve ser alterada sem revisão da documentação.

Serviços Utilizados

Serviço

Finalidade

Cloudflare Pages

Hospedagem do frontend

Pages Functions

Endpoints dinâmicos

D1

Banco de dados oficial

KV

Cache e artefatos publicados

R2

Arquivos permanentes

Queues

Processamento assíncrono

Cache

Distribuição global

Cron Triggers

Execução agendada

Regras Gerais

D1 é a única fonte de verdade.

KV armazena apenas conteúdo derivado.

R2 armazena arquivos permanentes.

Navegação pública deve evitar consultas ao D1.

Escritas sempre começam no D1.

Fluxo de Escrita

Requisição→ Function→ Módulo→ D1→ Evento→ Queue→ Publicação→ R2→ Cache

Fluxo de Leitura

Visitante→ Cloudflare Cache→ HTML / JSON publicado→ R2→ Resposta

Publicação

A publicação deve ser incremental.

Alterações regeneram apenas os artefatos afetados.

Exemplos:

página do anúncio;

JSON da cidade;

sitemap;

índices.

D1

Responsável por:

usuários;

anúncios;

pagamentos;

planos;

configurações;

autenticação.

Nunca utilizar KV como banco de dados.

KV

Responsável por:

JSON públicos;

manifestos;

cache;

índices;

páginas derivadas.

R2

Responsável por:

imagens;

vídeos;

documentos;

uploads;

backups.

Queues

Utilizadas para:

publicação;

geração de sitemap;

processamento de imagens;

notificações;

tarefas demoradas.

Cron

Executa:

manutenção;

publicação programada;

limpeza;

sincronizações;

verificações.

Segurança

Secrets apenas no ambiente Cloudflare.

Nunca versionar credenciais.

Validar webhooks.

Aplicar autenticação e autorização.

Deploy

Fluxo oficial:

Commit→ GitHub→ Cloudflare Pages→ Build→ Deploy→ Publicação→ Cache

Objetivo Final

A infraestrutura deve entregar:

baixa latência;

baixo custo operacional;

alta disponibilidade;

escalabilidade;

navegação pública predominantemente estática.

Este documento é a referência oficial para a infraestrutura Cloudflare do Portal ACTS.

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

## Acesso operacional planejado do backfill 13B

O executor Node futuro usará a API oficial `getPlatformProxy()` do Wrangler instalado pelo projeto. Com `configPath` fixo em `wrangler.toml`, obterá exclusivamente `platform.env.ACTS_DB` e encerrará com `platform.dispose()`. Isso não roda em Worker, não cria endpoint HTTP, Pages Function, Worker ou REST API própria e não recebe credenciais, binding, IDs ou caminho de configuração do usuário.

Os modos são separados: `development/local` usa binding sem `remote = true`; `staging/remote` exige simultaneamente `remoteBindings: true` no proxy e `remote = true` no `ACTS_DB` de staging. Produção é proibida no 13B. Autenticação remota segue o mecanismo normal do Wrangler, sem leitura direta de `process.env` pelo executor. Suporte da versão instalada e funcionamento real em staging são gates anteriores a qualquer `--execute` remoto.

`remote = true` direciona operações ao recurso Cloudflare real configurado. Por isso, staging deve ser fisicamente distinto de production e o executor futuro deve comparar os IDs internamente sem imprimi-los. A configuração atual ainda não marca nenhum D1 como remoto; a implementação 13B deverá marcar somente staging. `getPlatformProxy()` é best-effort fora do runtime Worker: incompatibilidade interrompe, sem fallback automático para REST, endpoint, Worker, subprocesso SQL ou produção. Backup/restore validado precede escrita remota e SQLite local não substitui D1 staging.
