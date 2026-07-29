ACTS Portal

ERRORS

Versão: 1.0Status: OficialEscopo: app/core/errors.js

1. Objetivo

A camada Errors padroniza o tratamento de exceções da plataforma ACTS.

Todos os erros devem possuir comportamento previsível, observável e seguro.

2. Princípios

Responsabilidade única.

Erros tipados.

Mensagens consistentes.

Sem vazamento de informações internas.

Integração com Logger.

3. Responsabilidades

A camada Errors pode:

definir classes de erro;

classificar exceções;

converter erros para respostas HTTP;

integrar-se ao Logger.

Não pode:

conter regras de negócio;

ocultar falhas críticas;

acessar módulos diretamente.

4. Hierarquia

ActsError
├── ValidationError
├── AuthError
├── AuthorizationError
├── DatabaseError
├── TransactionError
├── NotFoundError
├── ConflictError
├── RateLimitError
├── StorageError
├── PublishError
├── IntegrationError
└── InternalError

5. Estrutura mínima

Todo erro deve possuir:

código;

mensagem;

categoria;

status HTTP;

requestId;

timestamp.

6. Status HTTP

Mapeamento sugerido:

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Unprocessable Entity

429 Too Many Requests

500 Internal Server Error

503 Service Unavailable

7. Tratamento

Fluxo:

Erro
 ↓
Classificação
 ↓
Logger
 ↓
Resposta padronizada

8. Segurança

Nunca retornar:

stack trace;

SQL;

caminhos internos;

segredos;

credenciais.

Essas informações permanecem apenas nos logs técnicos.

9. Integração

Integra-se com:

Logger;

Router;

Security;

Auth;

DB;

Event Bus.

10. Observabilidade

Registrar:

requestId;

correlationId;

código;

duração;

origem;

categoria.

11. Testes

Cobrir:

todas as classes;

conversão HTTP;

mascaramento;

integração com Logger;

erros inesperados.

12. Critérios de aceitação

erros padronizados;

seguros;

observáveis;

testáveis;

consistentes.

13. Regra final

Toda exceção do Portal ACTS deve utilizar a hierarquia oficial da camada Errors.

Nenhum módulo deve lançar erros arbitrários sem classificação.
