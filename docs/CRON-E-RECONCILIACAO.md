# Cron e reconciliação

Handlers existem, mas `CRON_ENABLED` ausente/falso retorna sem processamento e nenhum trigger foi ativado. Planejamento futuro em UTC: recuperação a cada 15 minutos; rotina diária perto de 00:10 de Brasília; reconciliação perto de 03:00; auditoria semanal na madrugada de domingo. A Rodada 5 deverá converter horários considerando UTC e horário de negócio `America/Sao_Paulo`.

Reconciliação lê índice operacional privado, ordena, divide em lotes, grava checkpoint após cada item e retoma idempotentemente. Compara objetos antes de regravar. Falha parcial conserva checkpoint. Auditoria procura elegibilidade, ausências, órfãos, hashes/versões, duplicações, índices, mistura de diretório e nomes de campos privados. Órfãos materiais são reportados, nunca apagados automaticamente sem retenção e auditoria.
