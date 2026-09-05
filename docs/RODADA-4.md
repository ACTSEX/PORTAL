# Rodada 4 — portal e publicação

## Estado inicial registrado

Em 5/9/2026, `main` continha os merges dos PRs #1 (`7453650`), #2 (`3295a50`) e #3 (`7252e44`). Antes das alterações, `npm ci` concluiu sem vulnerabilidades e `npm run check` aprovou 35 testes e o build da Rodada 3.

A rodada entrega o template público mobile-first, projeção pública por allowlist, publicação versionada, shards/índice de slugs e handlers privados de idade, aniversário, vencimento, recuperação, reconciliação e auditoria. Tudo permanece inativo: `PUBLICATION_ENABLED`, `PUBLIC_R2_WRITES_ENABLED`, `CRON_ENABLED` e `PUBLIC_V2_ENABLED` assumem `false` quando ausentes.

Não houve deploy, alteração de DNS/rotas/bindings, acesso ou escrita em R2 real, migração, cobrança ou chamada ao Asaas. Testes usam somente memória. Categorias seguem vazias e pendentes, sem invenção.
