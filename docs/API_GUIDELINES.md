ACTS Portal

API_GUIDELINES

Versão: 1.0Status: Oficial

1. Objetivo

Este documento define o padrão oficial para todas as APIs do Portal ACTS.

As APIs devem ser previsíveis, versionáveis, seguras e consistentes.

2. Princípios

REST quando aplicável.

Contratos estáveis.

Versionamento explícito.

Idempotência.

Observabilidade.

3. Versionamento

Padrão:

/api/v1/

Mudanças incompatíveis exigem nova versão.

4. Métodos HTTP

GET: consulta

POST: criação

PUT: atualização completa

PATCH: atualização parcial

DELETE: remoção

5. Respostas

Formato JSON padronizado:

{
  "success": true,
  "data": {},
  "meta": {},
  "errors": []
}

6. Paginação

Coleções devem suportar:

page;

limit;

total;

totalPages.

7. Filtros

Filtros devem ser previsíveis, documentados e combináveis.

8. Segurança

Autenticação obrigatória quando aplicável.

Autorização por papéis/permissões.

Rate limiting.

Validação de entrada.

9. Erros

Utilizar exclusivamente a camada Errors.

Respostas devem conter:

código;

mensagem;

status HTTP;

requestId.

10. Observabilidade

Registrar:

duração;

requestId;

correlationId;

status;

endpoint.

11. Documentação

Toda API pública deve documentar:

endpoints;

parâmetros;

exemplos;

códigos de retorno;

eventos relacionados.

12. Regra final

Todas as APIs do Portal ACTS devem seguir este padrão para garantircompatibilidade, estabilidade e evolução controlada.
