# Publicação versionada

O publicador lê rascunho e identidade exclusivamente em `acts_private`, valida aprovação de cadastro/identidade/documentos, conta, plano, completude, autorização, mídia, idade, diretório, cidade e categorias. Uma allowlist constrói perfil, site, mídia e card; nascimento e demais PII nunca atravessam.

Cada operação exige idempotency key, cria `publicationId`, grava sob `versoes/{publicationId}/`, publica mídia antes de referências, JSONs, shards e manifestos intermediários, e troca `dados/sistema/versao.json` por último. Falha anterior mantém o ponteiro e registra tarefa incompleta retomável. Conteúdo idêntico não é regravado; a versão anterior fica indicada para rollback.

Escrita real exige simultaneamente `PUBLICATION_ENABLED=true` e `PUBLIC_R2_WRITES_ENABLED=true`. Na Rodada 4 ambas ficam falsas. Endpoints só operam com autenticação, papel, Origin/CSRF, limite de corpo e idempotência; SUPERADMIN não é acessível a cliente.
