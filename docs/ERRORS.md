# ACTS Portal — Tratamento de erros

**Versão:** 1.1
**Status:** Oficial
**Escopo:** convenções; este documento não autoriza arquivo

## Regra

Erros técnicos comuns são normalizados pelas fronteiras já autorizadas do Core. Erros de domínio e seu vocabulário permanecem no módulo responsável. Router e Pages Functions traduzem falhas para respostas HTTP públicas seguras; os contratos reais pertencem aos Lotes 16A e 16B.

Não existe autorização para criar `app/core/errors.js` ou qualquer `errors.js`. Classes e payloads mostrados como exemplos neste documento não criam caminho, camada genérica ou hierarquia obrigatória.

## Resposta pública

A resposta pode conter código público estável, mensagem segura e `correlationId` quando aplicável. Nunca contém stack trace, SQL, parâmetros sensíveis, segredo, token, credencial, caminho interno, detalhe do provider ou PII desnecessária. Status HTTP distingue entrada inválida, não autenticado, não autorizado, não encontrado, conflito, limite e falha interna sem revelar implementação.

## Observabilidade

Logs internos usam correlação e metadados mínimos, mascaram segredos e separam mensagem pública de diagnóstico técnico. O tratamento não engole falhas nem transforma erro em sucesso. Cada módulo testa seus erros de domínio; Router/Functions testam a tradução pública nos lotes autorizados.
