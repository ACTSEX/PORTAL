# Índice de cidades ativas

> **Catálogo completo ≠ cidades ativas.**

`dados/cidades/manifesto.json` contém apenas municípios com ao menos um anúncio efetivamente publicado. Rascunho, pendente, suspenso, vencido e reprovado não contam. `gerarIndiceCidadesAtivas` deriva contagens dos índices publicados do servidor, mantém `mulheres`, `homens` e `transex` isolados, ordena deterministicamente e remove cidades cuja soma chegou a zero.

A reconciliação deve gerar e validar shards/índices antes de trocar o manifesto. O navegador nunca fornece contagens. O estado inicial válido é `cidades: []`.
