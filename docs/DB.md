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

## Decisão de dados planejada para o Lote 13 (2026-08-04)

A auditoria de `schema.sql`, `0001` e `0002` confirma localização livre e ausência de estado canônico por cidade. Isso é insuficiente para identidade, FK, versão concorrente, lease e manifest vigente. Fica autorizada, mas não criada, a `[P]` `0003_city_publication_state.sql`, com `cities`, `listings.city_id`, `city_publication_state` e complementos estritamente necessários em `publication_jobs`. `0001` permanece imutável; snapshot só muda na implementação.

`listings.city_id` terá FK `cities(id) ON DELETE RESTRICT`, índice `city_id, status` e, ao final, `NOT NULL`. Os textos atuais permanecem durante a transição; leitura pública usa o join canônico e retirada futura exige migration própria. A equivalência final é regida pela correção abaixo e só existe depois de backfill e contração; a `0003` isolada é deliberadamente transitória.

A prova posterior revogou a hipótese de executar o contrato canônico no SQLite/D1 ou de concluir a evolução numa migration única. O backfill não adivinha abreviações/homônimos e segue exclusivamente a decisão faseada mais recente abaixo.

Rollback antes da troca é transacional. Depois de aplicada/publicada, não se apaga estado: backup/restore ou migration corretiva forward-only. Durante compatibilidade, escrita nova resolve/cria cidade validada e FK na mesma transação. Identidade, estados, versão e lease estão em PUBLISHER.


## Correção vigente do Lote 13 — expand/backfill/contract (2026-08-06)

Esta decisão mais recente substitui a exigência incompatível de backfill numa migration SQL única. A prova técnica confirmou que o SQLite/D1 disponível não oferece `normalize()`, NFC/NFKD, remoção Unicode geral de marcas, casefold equivalente ao JavaScript nem `sha256()` nativo; `lower()` é essencialmente ASCII, NFC e NFD continuam distintos, SQL não executa JavaScript e uma lista parcial de `replace()` não satisfaz Unicode geral.

1. **Expansão:** a futura `[P]` `database/migrations/0003_city_publication_state.sql` cria `cities` e `city_publication_state`, acrescenta `listings.city_id` temporariamente anulável e somente FKs, constraints e índices seguros. Preserva dados e contratos, não normaliza Unicode, não faz o backfill canônico, não publica e não altera manifests.
2. **Backfill:** o futuro `[P]` `scripts/backfill-cities.js` usa JavaScript e a única função canônica pública de `Listings.js`, cria/reutiliza por `canonical_key` e preenche a FK em lotes parametrizados. Ambiguidade interrompe sem escolha silenciosa.
3. **Validação:** exige zero nulos, órfãos e ambiguidades; unicidade de chaves/slugs; FKs válidas; contagens compatíveis; inventário sem perda de coluna, default, check, unique, FK/ação, índice ou trigger; segunda execução idempotente; relatório sem PII; backup/rollback; e staging com banco representativo aprovado.
4. **Contração:** somente então a futura `[P]` `database/migrations/0004_city_publication_contract.sql` reconstrói `listings` com `city_id NOT NULL`, preserva integralmente o inventário e aborta diante de qualquer inválido. Anulabilidade nunca é estado final.

### Contrato canônico único

A futura função pública de domínio em `app/modules/Listings.js` será a única implementação consumida por futuras escritas/alterações, pelo executor, por `Publish.js` na validação e pelos testes. Não pertence ao Core, a `Seo.js` ou a SQL.

- Exibição: `trim`, colapso de toda sequência Unicode `White_Space` para U+0020 e preservação em NFC; nome público entre 1 e 120 code points.
- Chaves: NFKD; remoção de todas as combining marks Unicode `M` (`Mn`, `Mc`, `Me`); Unicode Default Case Folding completo C+F na versão Unicode fixada pelos testes, sem mappings Turkic T; hífens/dashes e apóstrofos Unicode viram separadores; demais whitespace/pontuação viram espaço; separadores são colapsados e aparados.
- Rejeições: NUL, controles, surrogates isolados, não atribuídos e controles bidi; após transformação, chave fora de letras/números ASCII, vazia ou excedente é erro, sem fallback.
- `country_code`: ISO 3166-1 alfa-2 ASCII maiúsculo. `region_key` e `city_key`: 1–80 caracteres ASCII normalizados. `canonical_key`: composição delimitada `country_code + region_key + city_key`, única, até 170 caracteres.
- `slug`: determinístico, `[a-z0-9-]`, separadores como hífen, hífens colapsados/aparados, máximo 100. Colisão global acrescenta região e país; persistindo, digest determinístico da `canonical_key` calculado em JavaScript, nunca ID ou ordem de inserção. Homônimos por país/região permanecem distintos. Resultado vazio é erro.

`cities.id` é opaco, aleatório e estável no banco, nunca derivado de nome, slug ou chave. Retry reutiliza a cidade encontrada por `canonical_key`; IDs não precisam coincidir entre bancos independentes. Clean install e evolução são estrutural e semanticamente equivalentes: chaves/slugs determinísticos e referências internas consistentes, sem igualdade literal de IDs aleatórios.

Depois da contração, `database/schema.sql` representa diretamente o estado final com `city_id NOT NULL`. Instalação limpa não roda backfill desnecessário: nasce no schema final e toda nova escrita usa o contrato canônico, enquanto a evolução chega ao mesmo estado por `0001 → 0002 → 0003 → backfill → 0004`.

## Lote 13A implementado — contrato canônico executável e expansão transitória (2026-08-06)

### Normalização `unicode-17.0.0-v1`

`canonicalization_version` tem formato `unicode-<major>.<minor>.<patch>-v<contrato>` e valor inicial obrigatório **`unicode-17.0.0-v1`**. Cada `cities` persiste a versão que produziu suas chaves e slug; um backfill inteiro fixa uma única versão antes de começar, checkpoints e retries a repetem, e misturar versões aborta a execução. `Listings.js` e o executor 13B deverão chamar a mesma implementação pública. Troca de versão exige decisão e migration próprias; função e tabela de transliteração nunca são armazenadas no D1.

“Casefold C+F” significa os mappings **C (Common) e F (Full)** do arquivo oficial versionado Unicode 17.0.0 `CaseFolding.txt`, sem S (Simple) nem T (Turkic), obtido de `https://www.unicode.org/Public/17.0.0/ucd/CaseFolding.txt`. É Default Case Folding completo, independente de locale, inclusive expansões de um code point para vários (`ß` → `ss`). `toLowerCase()` não implementa esse contrato.

A implementação JavaScript do 13B deverá percorrer code points e aplicar tabela/pacote imutável derivado daquela fonte. A escolha fica bloqueada até auditoria de licença Unicode, tamanho, integridade e compatibilidade Workers/Node; nenhuma dependência entra no 13A e o backfill não pode iniciar sem a decisão. Ordem exata: (1) validar e limitar a entrada a 120 code points; (2) NFKD; (3) remover categorias `M` (`Mn`, `Mc`, `Me`); (4) aplicar C+F 17.0.0; (5) converter Unicode `White_Space`, dash punctuation e apóstrofos em U+0020; (6) converter pontuação restante em U+0020; (7) rejeitar resultado fora de ASCII `a-z`, `0-9` e espaço; (8) colapsar/aparar espaços; (9) exigir 1–80 bytes ASCII. `public_name` colapsa `White_Space`, aplica NFC e exige 1–120 code points. NUL, controles, bidi controls, surrogate isolado e não atribuído são rejeitados. `CC|region_key|city_key` exige 5–170 bytes.

Vetores obrigatórios do 13B: `Straße` → `strasse`; `İ` → `i`; `Σ`, `σ` e `ς` → `σ` antes da rejeição ASCII; `ﬀ` → `ff`; `CAFÉ` e `Cafe\u0301` → `cafe`; whitespace, hífens e apóstrofos Unicode são separados; controles, não atribuído, vazio, entrada >120 code points e saída >80 bytes são rejeitados. O vetor grego prova que casefold precede a allowlist ASCII, sem fallback.

### Slug determinístico v1

`city-slug-v1` recebe somente a `canonical_key`, separa `CC|region_key|city_key`, troca espaços por hífens e monta `lower(CC)-region-city`. Reserva 13 caracteres, trunca a base a no máximo 87 bytes ASCII, apara hífens e sempre acrescenta `-` mais os primeiros 12 hexadecimais minúsculos do SHA-256 dos bytes UTF-8 exatos da `canonical_key`. A saída satisfaz `[a-z0-9-]{1,100}`. O sufixo sempre presente torna clean install, evolução, retry e ordem invertida idênticos, sem ID, `randomblob` ou ordem. Colisão do digest truncado é rejeitada pela UNIQUE. Após persistência/publicação o slug é imutável; colisão posterior não renomeia cidade existente.

Vetores obrigatórios: `BR|parana|primavera` e `BR|sao paulo|primavera` produzem bases distintas; chaves distintas com transliteração visual igual recebem hashes distintos; NFC/NFD equivalentes produzem a mesma chave/slug; retry e ordem invertida repetem bytes; nova colisão após publicação preserva o slug anterior. Entradas que virem a mesma `canonical_key` são a mesma identidade, reutilizadas ou marcadas ambíguas.

### Estado instalado pela `0003`

`cities` contém ID opaco sem default derivado, país, chaves, chave canônica e slug únicos, nome público, versão, atividade e timestamps; `(country_code, region_key, city_key)` é único. `listings.city_id` foi acrescentado sem reconstrução, aceita `NULL` somente no 13A, referencia `cities(id) ON DELETE RESTRICT` e possui índice `(city_id,status)`; todo contrato anterior permanece. Nenhuma linha é preenchida.

`city_publication_state`, separado de `publication_jobs`, tem PK/FK por cidade `ON DELETE CASCADE`, versões iniciais `0/1`, artifact path/digest pareados, estado allowlist, lease/expiração pareados, tentativas, código de erro normalizado, revisão, última publicação e timestamps. A migration não cria linha, job, artefato ou manifest. O 13A não usa Queue, KV, R2 ou Publisher. Staging D1 representativo, backup/restore e compatibilidade D1 continuam gates; SQLite local não os substitui.
