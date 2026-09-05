# Segurança e privacidade

Princípios: minimização, separação de buckets, negação padrão, validação no Worker, least privilege, auditoria e nenhum segredo no cliente/Git. `acts-private` contém PII e temporários; `acts-public` somente material aprovado. Logs não devem carregar tokens, CPF, nascimento, documentos ou contato pessoal.

Uploads futuros usam autorização curta, limites e chave específica; promoção só após validação. Dados protegidos só mudam por SUPERADMIN com evento imutável. Respostas públicas usam cabeçalhos seguros e não revelam internals. Dependências e credenciais são verificadas no CI; incidentes devem suspender publicação, preservar evidência e revogar acesso fora do repositório.
