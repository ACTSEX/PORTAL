ACTS Portal

ROUTER

Versão: 1.0Status: OficialEscopo: app/core/router.js

1. Objetivo

O Router é responsável por receber requisições, identificar a rota correta,executar o pipeline de middlewares e encaminhar a execução ao destino adequado.

O Router não implementa regras de negócio.

2. Princípios

Responsabilidade única.

Rotas previsíveis.

Middlewares reutilizáveis.

Separação entre roteamento e domínio.

Compatível com Cloudflare Pages Functions.

3. Fluxo oficial

Request
   ↓
Router
   ↓
Middlewares
   ↓
Controller / Endpoint
   ↓
Response

4. Responsabilidades

O Router pode:

registrar rotas;

resolver URLs;

executar middlewares;

extrair parâmetros;

encaminhar requisições;

retornar respostas.

Não pode:

acessar diretamente o D1;

conter regras de negócio;

renderizar páginas;

manipular cache.

5. Estrutura

functions/
├── api/
├── _middleware.js

app/core/
└── router.js

6. Tipos de rotas

Públicas;

Autenticadas;

Administrativas;

Webhooks;

APIs internas.

7. Métodos HTTP

Suportar:

GET

POST

PUT

PATCH

DELETE

OPTIONS

8. Middlewares

Exemplos:

autenticação;

autorização;

validação;

rate limit;

logs;

CORS.

Executados em ordem definida.

9. Parâmetros

Suportar:

parâmetros de rota;

query string;

headers;

corpo da requisição.

10. Respostas

Padronizar:

sucesso;

erro;

validação;

autenticação;

autorização;

recurso inexistente.

11. Integração

O Router integra-se com:

Bootstrap;

Auth;

Security;

Logger;

Event Bus.

12. Observabilidade

Registrar:

requestId;

rota;

método;

duração;

status.

13. Segurança

Executar validações antes do acesso aos endpoints protegidos.

Nunca expor detalhes internos em mensagens de erro.

14. Testes

Cobrir:

resolução de rotas;

middlewares;

parâmetros;

métodos HTTP;

respostas;

rotas inexistentes.

15. Critérios de aceitação

sem regras de negócio;

pipeline previsível;

compatível com Cloudflare;

testável;

observável.

16. Regra final

Toda requisição do Portal ACTS deve passar pelo Router.

O Router apenas orquestra o fluxo de execução, mantendo a lógica de negócionos módulos e serviços apropriados.
