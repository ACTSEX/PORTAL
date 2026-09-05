# Workflow de bootstrap R2

O workflow exibido como **Bootstrap e publicação R2** mantém o environment protegido `production-r2` e um único artifact, `relatorio-r2`, contendo `bootstrap-report.json`. O relatório nunca contém credenciais, headers de autenticação, endpoints assinados ou conteúdo remoto.

| Modo | Rede | Escrita | Secrets | Resultado esperado |
|---|---|---|---|---|
| `check` | nenhuma | nenhuma | nenhum | valida exatamente oito manifestos locais e seus hashes/tamanhos |
| `plan` | oito `HEAD` | nenhuma | credenciais R2 somente leitura | `ausente`, `existente_igual` ou `existente_diferente` por chave |
| `apply` | `HEAD` e PUT condicional | somente criação | credenciais R2 | cria apenas quando todas estão ausentes |

`apply` exige `refs/heads/main`, confirmação literal `PUBLICAR-V2-NO-R2`, `entrada_cliente` vazia e aprovação do environment. Antes do primeiro PUT, todas as chaves são consultadas; qualquer existente bloqueia o lote. Cada PUT inclui `If-None-Match: *`; `412 PreconditionFailed` interrompe a execução, nunca faz fallback para PUT incondicional e nunca causa retry sem a precondição. Não há COPY ou DELETE.

O resumo informa modo, branch, commit, total, ausentes, existentes, iguais, diferentes, leituras remotas, writes, deletes, overwrites, resultado e artifact. O inventário é somente um registro de chaves/metadados e não é backup restaurável.
