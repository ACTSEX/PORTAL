ACTS Portal

DB

Versão: 1.0Status: OficialEscopo: app/core/db.js

1. Objetivo

A camada DB é responsável por todo o acesso ao banco de dados da plataforma ACTS.

O D1 é a única fonte oficial de verdade. Toda persistência de dados deve passarpor esta camada.

2. Princípios

D1 é a única fonte de verdade.

Uma única responsabilidade: persistência.

Interface única para acesso ao banco.

Determinismo e previsibilidade.

Compatibilidade com Cloudflare D1.

3. D1-FIRST

Toda implementação deve considerar as características do Cloudflare D1.

Regras:

utilizar bindings oficiais;

preferir prepared statements;

minimizar round trips;

utilizar batch quando aplicável;

evitar consultas N+1;

evitar SQL dinâmico inseguro.

4. Responsabilidades

A camada DB pode:

consultar dados;

inserir;

atualizar;

remover;

executar transações;

executar batch;

controlar paginação;

registrar auditoria técnica.

Não pode:

conter regras de negócio;

publicar eventos diretamente;

renderizar conteúdo;

manipular cache;

acessar R2 ou KV.

5. Estrutura

app/core/
└── db.js

A exceção ao limite geral de tamanho aplica-se exclusivamente a este arquivo,desde que permaneça responsável apenas pela infraestrutura de acesso ao D1.

6. API pública

Exemplos conceituais:

db.query(sql, params)
db.execute(sql, params)
db.batch(commands)
db.transaction(callback)
db.prepare(sql)

7. Prepared Statements

Sempre que possível utilizar consultas preparadas.

Benefícios:

segurança;

desempenho;

reutilização.

8. Query

Consultas de leitura devem ser determinísticas.

Evitar:

SELECT * sem necessidade;

ordenação implícita;

consultas excessivamente grandes.

9. Execute

Responsável por operações de escrita.

Cada operação deve retornar informações suficientes para auditoria técnica.

10. Batch

Agrupar operações independentes quando suportado pelo D1.

Objetivos:

reduzir round trips;

melhorar desempenho;

manter previsibilidade.

11. Transações

Utilizar transações apenas quando houver necessidade de consistência entremúltiplas operações.

Fluxo:

BEGIN
 ↓
Operações
 ↓
COMMIT

Em caso de erro:

BEGIN
 ↓
Operações
 ↓
ROLLBACK

12. Acesso dos módulos

Fluxo oficial:

Módulo
 ↓
primitivas técnicas de app/core/db.js
 ↓
D1

SQL de domínio, CRUD, validação e regras permanecem no arquivo principal do módulo. `app/core/db.js` fornece somente primitivas técnicas; repositories separados não são criados por padrão. Gateway/provider externo autorizado é exceção legítima por responsabilidade externa distinta.

13. Paginação

Suporte a:

cursor pagination;

offset pagination.

Preferir cursor para grandes volumes.

14. Índices

Toda consulta frequente deve possuir índice adequado.

Índices devem ser documentados nas migrations.

15. Auditoria

Registrar tecnicamente:

duração;

consulta;

parâmetros mascarados;

linhas afetadas;

erros;

requestId.

Nunca registrar segredos.

16. Segurança

Obrigatório:

prepared statements;

validação de parâmetros;

proteção contra SQL Injection;

menor privilégio.

17. Relação com outras camadas

Módulo
   ↓
primitivas técnicas de app/core/db.js
   ↓
D1 confirmado
   ↓
Event Bus → Queue → Publisher → R2 → Edge Cache

O DB nunca grava diretamente em KV.

18. Performance

Diretrizes:

evitar N+1;

selecionar apenas colunas necessárias;

utilizar índices;

evitar consultas redundantes;

medir consultas lentas.

19. Tratamento de erros

Classificar:

DatabaseError;

TransactionError;

ConstraintError;

TimeoutError;

ConnectionError.

20. Observabilidade

Registrar:

requestId;

duration;

affectedRows;

queryHash;

retries;

status.

21. Testes

Cobrir:

query;

execute;

batch;

transaction;

rollback;

paginação;

prepared statements;

tratamento de erros.

22. Critérios de aceitação

compatível com Cloudflare D1;

sem regras de negócio;

uso de prepared statements;

transações consistentes;

testável;

observável.

23. Autoridade documental

Este documento complementa:

CONSTITUTION.md

ARCHITECTURE.md

CORE.md

CONTRACTS.md

INTERFACES.md

24. Regra final

Toda operação de persistência do Portal ACTS deve passar pela camada DB.

O D1 permanece como única fonte oficial de verdade.

A exceção de tamanho do arquivo app/core/db.js é válida apenas para estacamada e não altera a regra geral aplicada aos demais arquivos do projeto.

---

## Lote 11 — reserva financeira e ordenação externa

`idempotency_records` é reutilizada como coordenação persistente. `NULL` em
`response_status` representa operação técnica reservada/em processamento,
`201` representa cobrança interna confirmada, `202` resultado externo
desconhecido e recuperável e `409` operação não aplicada. Esses códigos são
resultado técnico e não alteram o estado comercial de `payments`.

A migration imutável `0002_payment_event_ordering.sql` acrescenta somente
`payments.external_updated_at`. O campo registra o timestamp do último evento
Asaas efetivamente aplicado e permite rejeitar eventos antigos. A mudança de pagamento e a conclusão idempotente usam batch D1 e `changes()`. Batch reverte quando um statement falha; condição que altera zero linhas é sucesso técnico e não causa rollback. O domínio deve conferir o resultado. Conferência posterior ao commit detecta conflito, mas não desfaz statement anterior já confirmado; coerência atômica deve estar no próprio SQL ou em operação que falhe.

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
