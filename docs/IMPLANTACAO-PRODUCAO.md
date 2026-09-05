# Implantação controlada

## PREPARAR
Proteja environments `production` e `production-r2` com revisores; configure secrets mínimos; decida origem estática do apex; registre inventários/backup e freeze da V1.
## TESTAR
`npm ci && npm run check && npm audit --audit-level=high`; homologação completa com flags falsas.
## PUBLICAR R2
No workflow `Bootstrap e publicação R2`, execute `check` e revise o artifact `relatorio-r2`: essa etapa valida localmente os oito seeds, sem rede ou secrets. Depois execute `plan`, que faz somente `HEAD` das oito chaves em `acts-private` e `acts-public` e as classifica como ausente, igual ou diferente. O inventário contém apenas chaves e metadados, não conteúdo, e **não é backup restaurável**.

Somente após os testes e a aprovação do plano use `apply` na `main`, com `entrada_cliente` vazia e a frase `PUBLICAR-V2-NO-R2`. O apply aborta antes da primeira escrita se qualquer chave existir e cada criação usa `If-None-Match: *`; uma corrida retorna `412 PreconditionFailed` e interrompe sem sobrescrever. Não há COPY nem DELETE.
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
