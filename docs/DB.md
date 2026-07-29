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

12. Repositórios

Os módulos acessam o banco através de repositórios.

Fluxo:

Módulo
 ↓
Repository
 ↓
DB
 ↓
D1

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

Módulos
   ↓
Repositories
   ↓
DB
   ↓
D1
   ↓
Event Bus
   ↓
Publisher
   ↓
KV / Cache

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
