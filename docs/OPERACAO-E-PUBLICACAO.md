# Operação e publicação

Publicação será incremental, idempotente e recuperável: calcular diferenças; publicar mídia; perfil/site; shards somente das combinações afetadas; manifesto/ponteiro por último. Não gravar quando hash não mudou. Falha antes do ponteiro mantém versão anterior visível; checkpoint permite retomada.

Cron em lotes: pendências, idade/aniversário diário, vencimentos diário, reconciliação, auditoria completa semanal e botão manual SUPERADMIN. Cada tarefa possui chave de idempotência e checkpoint. Rodada 1 não agenda nem escreve. Build local cria `dist`; deploy exige etapa futura, revisão e nunca é parte do CI atual.
