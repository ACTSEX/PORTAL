# Autenticação Google planejada

Rodada 2 usará Google Identity Services/OpenID Connect com escopos somente `openid email profile`. `googleSub` é identificador permanente; exige e-mail verificado e Gmail pessoal. Conta nova nasce pendente e só SUPERADMIN aprova/vincula ou troca a conta.

Não haverá senha local nem recuperação de senha. O Worker validará assinatura, emissor, audiência, expiração, nonce/estado e sessão segura; cliente não decide autorização. Mudanças de vínculo são auditadas. Não existe fluxo real nesta rodada.
