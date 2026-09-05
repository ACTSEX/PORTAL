# Secrets e variáveis

Não há valores no repositório. Configure secrets nos environments GitHub protegidos: `CLOUDFLARE_API_TOKEN` com escopo mínimo, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`; para S3/R2 direto, `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`. Worker: `GOOGLE_CLIENT_ID`, `SESSION_SECRET`, `CPF_INDEX_SECRET`, `SUPERADMIN_GOOGLE_SUBS`, `APP_ORIGIN`; `GOOGLE_CLIENT_SECRET` somente se o fluxo OIDC configurado exigir. Futuro, separado por ambiente: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`.

Flags iniciais obrigatórias: `PUBLICATION_ENABLED=false`, `PUBLIC_R2_WRITES_ENABLED=false`, `CRON_ENABLED=false`, `PUBLIC_V2_ENABLED=false`, `ASAAS_ENABLED=false`, `ASAAS_ENV=disabled`, `ASAAS_AUTOMATIC_CHARGES=false`. Ausência fecha funcionalidades. Nunca reutilizar chaves sandbox/produção; rotacionar após incidente e registrar apenas identificadores redigidos.
