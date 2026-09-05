# Operação diária

Verificar health, erros redigidos, filas/checkpoints, vencimentos, integridade dos três shards, ponteiros e auditoria; conferir que flags esperadas não mudaram. Pagamentos permanecem manuais: registrar pagamento/cortesia/vencimento/suspensão/reativação com motivo e sessão SUPERADMIN recente. Webhooks Asaas ficam indisponíveis enquanto flag falsa; futuramente, revisar desconhecidos/fora de ordem e conciliar antes de efeitos. Nunca editar R2 manualmente, nunca confirmar pagamento pelo retorno do navegador e nunca copiar PII para tickets/logs.
