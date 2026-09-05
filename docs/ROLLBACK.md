# Rollback

Pare novas ativações; desligue flags (Asaas, cron, V2, publicação e escrita); preserve evidências. Restaure o ponteiro público para publicationId anterior, sem apagar versões. Reverta Worker pelo artefato/commit aprovado. Restaure export de rotas/DNS e origem anterior. Migração: descarte checkpoint/saída V2 local; V1 permanece íntegra. Confirme health, autenticação, três diretórios e ausência de eventos novos. Registre ator, motivo, horários, hashes e impacto na auditoria append-only; comunique titulares se aplicável.

O bootstrap create-only não tem rollback destrutivo: objetos preexistentes não são modificados e nunca devem ser apagados para “desfazer” uma execução. Se uma corrida causar `412`, preserve o relatório e investigue a chave; se uma falha ocorrer após algumas criações novas, interrompa a operação e não delete nem sobrescreva os manifestos criados. O inventário de metadados não contém bytes e não deve ser usado como backup restaurável.
