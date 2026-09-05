# Segurança e privacidade

Princípios: minimização, separação de buckets, negação padrão, validação no Worker, least privilege, auditoria e nenhum segredo no cliente/Git. `acts-private` contém PII e temporários; `acts-public` somente material aprovado. Logs não devem carregar tokens, CPF, nascimento, documentos ou contato pessoal.

Uploads futuros usam autorização curta, limites e chave específica; promoção só após validação. Dados protegidos só mudam por SUPERADMIN com evento imutável. Respostas públicas usam cabeçalhos seguros e não revelam internals. Dependências e credenciais são verificadas no CI; incidentes devem suspender publicação, preservar evidência e revogar acesso fora do repositório.

Na Rodada 2, upload de identificação ocorre no Worker e nunca gera URL pública. Sessões opacas, OAuth state/nonce de uso único, CPF HMAC e auditoria ficam somente no privado. Respostas de cliente mascaram CPF e resumos omitem nascimento. Mutações exigem sessão, CSRF, Origin e revisão. Logs da aplicação não recebem corpos, cookies, tokens, CPF ou nascimento.

## Rodada 3

Rascunhos usam allowlist, sanitização e revisão; diretório/proprietário vêm da sessão e do cadastro. Upload exige CSRF, Origin, reserva curta, chave do servidor, magic bytes, tamanho, SHA-256 e limite fail-closed. Respostas privadas usam `no-store`, `nosniff`, CSP e `no-referrer`. Não há escrita pública.
