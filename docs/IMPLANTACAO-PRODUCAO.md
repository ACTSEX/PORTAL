# Implantação controlada

## PREPARAR
Proteja environments `production` e `production-r2` com revisores; configure secrets mínimos; decida origem estática do apex; registre inventários/backup e freeze da V1.
## TESTAR
`npm ci && npm run check && npm audit --audit-level=high`; homologação completa com flags falsas.
## PUBLICAR R2
Execute workflow em `check`, depois `plan`; revise hashes/inventário. Somente após aprovação use `apply` e frase exata. Seeds primeiro; conteúdo explicitamente autorizado; ponteiros/manifestos por último; sem exclusões.
## IMPLANTAR WORKER
Na `main`, workflow manual, frase `IMPLANTAR-WORKER-PORTAL`, aprovação do environment; ele testa, builda, dry-run e só então deploya.
## CONFIGURAR ROTAS
Execute check/plan, aplique adições aprovadas e conclua mudanças do apex manualmente conforme plano de rotas. Valide Tail.
## HOMOLOGAR
Execute `HOMOLOGACAO.md`, registre métricas e aceite.
## ATIVAR V2
Ative separadamente `PUBLIC_V2_ENABLED`; publicação/escrita exigem mudança independente e janela de rollback.
## MIGRAR CLIENTES
Somente lotes explícitos após ensaio; checkpoint/comparação; nunca apagar V1.
## ATIVAR CRON
Após observação, habilite `CRON_ENABLED` em janela própria e monitore idempotência.
## ATIVAR ASAAS FUTURAMENTE
Não faz parte do go-live V2. Projeto separado: sandbox, webhook/conciliação, aprovação jurídica/financeira, secrets por ambiente; habilitar `ASAAS_ENABLED` por último e cobranças automáticas em mudança ainda separada.
