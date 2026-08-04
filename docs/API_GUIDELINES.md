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

Erros técnicos comuns são normalizados nas fronteiras já autorizadas do Core; erros de domínio permanecem no módulo. Router e Functions convertem falhas em respostas públicas seguras. Não há autorização para `errors.js`.

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


## Limite dos contratos HTTP

Respostas públicas nunca expõem stack, SQL, segredo ou caminho interno. Os contratos HTTP executáveis serão definidos nas Functions finas dos Lotes 16A e 16B; este guia não cria caminho novo. Exemplos de `ERRORS.md` são vocabulário, não autorização de arquivo.
