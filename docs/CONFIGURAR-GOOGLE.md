# Configurar Google futuramente

1. No Google Cloud Console, crie ou escolha um projeto e configure a tela de consentimento OAuth.
2. Crie um cliente **OAuth 2.0 / Web application**. Não coloque a credencial no Git.
3. Registre como origem JavaScript autorizada o valor HTTPS exato de `APP_ORIGIN`.
4. Registre o redirect URI exato `${APP_ORIGIN}/api/auth/google/callback`.
5. Configure por `wrangler secret put`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `CPF_INDEX_SECRET` e `SUPERADMIN_GOOGLE_SUBS` (lista de `sub` separada por vírgula). Configure `APP_ORIGIN` como variável privada do ambiente.
6. Restrinja o consentimento aos escopos `openid`, `email`, `profile`. Não habilite Gmail, Drive, contatos ou calendário.

Em teste, use projeto/cliente e origem separados da produção e contas de teste autorizadas. Em produção, revise consentimento, redirect exato, rotação e acesso aos secrets. `SESSION_SECRET` e `CPF_INDEX_SECRET` devem ser valores aleatórios independentes. Nunca reutilize Client ID como segredo nem registre valores reais em documentação. Sem configuração completa, o botão fica indisponível e nenhum login alternativo existe.
