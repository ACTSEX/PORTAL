# Testes e aceite

`npm run check` executa lint, validações de configuração/arquitetura, testes nativos e build. `npm run dry-run` é o único comando Wrangler permitido nesta rodada. CI usa `npm ci`, check e nunca deploy.

Aceite exige documentos/árvore, JSON/schema, três diretórios/temas, isolamento hierárquico, bindings exatos, saúde, shells, Asaas off, ausência de segredo/PII pública/chamadas externas/escrita R2, build com três saídas e revisão documental. Evidências Git e PR devem declarar que nenhuma infraestrutura foi alterada.
