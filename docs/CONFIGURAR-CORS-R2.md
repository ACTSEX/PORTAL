# Configurar CORS do R2 futuramente

A Rodada 3 usa streaming no Worker e não requer mudar CORS do bucket. Nenhuma configuração real foi aplicada.

Se a Rodada 4 adotar URLs SigV4 temporárias, configure no bucket privado somente origens HTTPS oficiais exatas, métodos `PUT`/`HEAD`, cabeçalhos estritamente necessários (`Content-Type`, checksum e headers assinados) e `MaxAgeSeconds` curto. Nunca use `AllowedOrigins: ["*"]` em upload autenticado. Valide preflight, expiração, objeto exato e ausência de leitura/listagem. Secrets futuros: `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`; não os exponha em JavaScript ou JSON.
