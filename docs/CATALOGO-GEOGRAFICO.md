# Catálogo geográfico oficial

> **Catálogo completo ≠ cidades ativas.**

O catálogo geral contém Brasil, as 27 UFs e todos os municípios oficiais, mesmo sem anúncio. A única fonte é a [API de Localidades do IBGE](https://servicodados.ibge.gov.br/api/docs/localidades): `/estados` e `/estados/{UF}/municipios`. IDs oficiais são a identidade (`paisId + estadoId + municipioId`); slugs são apenas URLs.

## Snapshot auditável

`node scripts/atualizar-catalogo-ibge.mjs plan <saida> <versao>` consulta o IBGE explicitamente, valida HTTP/estrutura, 27 UFs, duplicidades, vínculos e slugs, ordena, separa um JSON por UF e grava manifesto com UTC, contagens, bytes e SHA-256. Não roda no build nem em visitas. A saída é `atual.json` e `versoes/{versao}/{paises,estados,municipios/*.json,manifesto}.json`. Sem snapshot integral, o ponteiro não é produzido.

O repositório deliberadamente não inclui snapshot nesta rodada: o primeiro `plan` do GitHub Actions produzirá o artifact oficial. `tests/fixtures/geografia` nunca é produção.
