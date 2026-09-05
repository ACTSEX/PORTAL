# PORTAL V2

Fundação da V2 do **Acompanhantes EX**, organizada como monólito modular: um Worker privado `portal`, um painel responsivo, um template público, três diretórios e dois buckets R2. Esta Rodada 1 entrega arquitetura, contratos, shells e validação local; não entrega autenticação, cadastro funcional, processamento/publicação de mídia, cron operacional ou integração ativa com Asaas.

`ARQUITETURA.md` é a autoridade normativa. Em caso de divergência, os documentos especializados devem ser corrigidos para segui-lo.

## Desenvolvimento local

Requer Node.js 22+.

```bash
npm ci
npm run check
npm run build
npm run dry-run
```

O build reproduzível gera `dist/{worker,painel,publico}`; `dist/` não é versionado. `dry-run` apenas empacota o Worker e não publica. É proibido executar deploy nesta etapa.

## Superfícies desta rodada

- `GET /api/health`: única rota implementada.
- qualquer outra rota: resposta controlada `404 NOT_IMPLEMENTED`.
- frontends: avisos estáticos honestos, sem ações funcionais.
- Asaas: contrato desativado e sem transporte de rede.
- R2: bindings declarados, mas nenhuma escrita é implementada.

Consulte [ARQUITETURA.md](ARQUITETURA.md), [plano](docs/PLANO-DE-IMPLANTACAO.md) e [aceite](docs/TESTES-E-ACEITE.md).
