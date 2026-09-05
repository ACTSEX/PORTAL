# Autenticação Google implementada

Foi escolhido OpenID Connect **Authorization Code no Worker + PKCE S256**. O navegador recebe somente redirecionamentos e cookie opaco; o código é trocado no Worker, onde ID token é validado por assinatura RS256/JWKS, `iss`, `aud`, `exp` e `nonce`. `state` e a transação são consumidos uma única vez. Isso evita token Google em `localStorage`, permite segredo somente no servidor e previne CSRF, replay e fixation (uma sessão nova é emitida após login).

Escopos exatos: `openid email profile`. Exige `email_verified === true`, endereço normalizado terminado exatamente em `@gmail.com` e `sub` não vazio. Workspace e outros provedores são rejeitados. O papel vem da lista privada de `sub`, nunca do navegador.

Referências oficiais consultadas para o desenho: [OpenID Connect do Google](https://developers.google.com/identity/openid-connect/openid-connect) e [OAuth 2.0 para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server). Em 5 de setembro de 2026, o ambiente automatizado recusou o download das páginas com HTTP 403; a implementação segue os endpoints e requisitos oficiais conhecidos, e a revisão operacional deve reconfirmá-los antes de produção.

Sessões expiram em oito horas, usam cookie `__Host-portal_session` com `HttpOnly; Secure; SameSite=Lax`, são armazenadas em `acts_private`, suportam logout unitário e geral, e exigem `Origin` exata mais token CSRF em mutações. Operações administrativas críticas exigem autenticação com no máximo 15 minutos.
