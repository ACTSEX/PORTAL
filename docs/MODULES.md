ACTS Portal

MODULES

Versão: 1.0Status: Oficial

Objetivo

Este documento define os módulos oficiais do Portal ACTS.

Cada módulo representa um domínio de negócio independente.

O Core nunca implementa regras de negócio.

Regras Gerais

Um módulo possui uma responsabilidade principal.

Comunicação por Event Bus, contratos e interfaces públicas.

Nenhum módulo acessa arquivos internos de outro módulo.

Integrações externas ficam isoladas.

Um módulo começa como um único arquivo e só é dividido quando houver necessidade real.

Módulos Oficiais

Módulo

Responsabilidade

AI

Recursos de inteligência artificial

Analytics

Métricas e estatísticas

Auth

Autenticação

Categories

Categorias

Compare

Comparação de anúncios

Contacts

Contatos e formulários

Dashboard

Painéis administrativos

Favorites

Favoritos

Geolocation

Geolocalização

Imobiliaristas

Perfis de corretores

Integrations

Integrações externas

Leads

Gestão de leads

Listings

Anúncios

Maps

Mapas

Media

Biblioteca de mídia

Notifications

Notificações

Payments

Cobranças e pagamentos

Plans

Planos

Publish

Publicação de artefatos

Reports

Relatórios

Reviews

Avaliações

Search

Busca

Seo

SEO

Subscriptions

Assinaturas

Upload

Upload de arquivos

Users

Usuários

Dependências

Todos os módulos podem utilizar serviços do Core.

Nenhum módulo depende diretamente de outro módulo.

Quando uma integração for necessária, utilizar:

Event Bus;

interfaces públicas;

contratos documentados.

Integrações

Integrações externas devem permanecer isoladas.

Inicialmente:

Asaas (financeiro)

Novas integrações deverão ser documentadas antes da implementação.

Eventos

Cada módulo poderá publicar e consumir eventos.

A documentação completa ficará em EVENTS.md.

Evolução

Um módulo poderá ser dividido quando:

possuir múltiplas responsabilidades;

integrar provedores externos;

ultrapassar os limites arquiteturais;

exigir equipes independentes.

Estado

Todos os módulos encontram-se planejados.

A implementação seguirá rigorosamente a ordem definida em ROADMAP.md.

## Lote 11 — Payments e Integrations

`Payments.js` é o proprietário das regras financeiras. Ele resolve o valor em
unidade mínima inteira a partir do plano vinculado à assinatura, exige
ownership, limita formas de cobrança a `BOLETO`, `CREDIT_CARD` e `PIX`, grava a
cobrança no D1 e aplica os estados canônicos `pending`, `paid`, `failed`,
`refunded` e `canceled`. Criação e eventos externos usam
`idempotency_records`; uma mesma chave com conteúdo diferente é conflito. A
reserva ocorre por `INSERT OR IGNORE` antes da rede: a chave primária escolhe um
único vencedor, enquanto concorrentes aguardam/reutilizam o resultado. O
identificador interno é derivado de escopo, usuário e hashes, tornando
referência externa e POST idênticos em replay ou recuperação de timeout.

`Integrations.js` mantém exclusivamente o registro operacional privado do
provedor `asaas` na tabela `integrations`. Segredos não são persistidos nesse
catálogo. `app/gateways/Asaas.js` recebe URL, credencial e `fetch` por injeção,
aplica HTTPS, timeout e retry limitado, e devolve apenas contratos internos.

Eventos Asaas autenticados e normalizados podem ser aplicados pelo módulo com
deduplicação, conferência do vínculo e do valor e prevenção de regressão de
estado. O checkpoint `payments.external_updated_at` rejeita evento antigo e o
sucesso idempotente só é marcado quando o update condicional altera uma linha.
A borda HTTP do webhook continua pertencendo ao Lote 16B. Nenhuma
operação financeira acessa KV/R2, chama Publisher ou altera catálogo público.

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
### Painel, lote explícito e progresso

O painel mantém alterações pendentes preferencialmente em IndexedDB. O rascunho sobrevive quando possível a reload/fechamento, mas não é fonte de verdade, autorização nem substituto de validação. O fluxo é `editar localmente → acumular → revisar pacote → Enviar alterações → backend validar e persistir lote`. A interface mostra contagem, resumo, botão explícito, processamento e resultado.

Decisão inicial: **até cinco envios de alterações por usuário por dia**, configurável e contado por ciclo explícito, não por item. Falha técnica após persistência confirmada não consome novo envio. A implementação definirá timezone, administradores, exceções, reset, auditoria e proteção contra repetição. Cada pacote preserva autenticação, autorização, propriedade, plano, domínio, concorrência/versão, transações e idempotência.

Progresso usa fatos do cliente ou estados confirmados pelo backend: preparando, validando, enviando, persistindo, alterações salvas, aguardando agregação, compilando, publicando, concluído, falha recuperável ou falha definitiva. Sem progresso numérico real, exibem-se etapas, nunca percentuais inventados.
