# PORTAL V2 — Rodada 2

Núcleo privado do **Acompanhantes EX** em um único Cloudflare Worker `portal`: login Google OIDC, sessões privadas, cadastro, documentos de identificação, painel compartilhado de CLIENTE/SUPERADMIN, avisos, plano manual e auditoria. `ARQUITETURA.md` é a autoridade normativa.

## Desenvolvimento local

Requer Node.js 22+. Todos os testes usam `MemoryPrivateStorage`; não acessam R2 real.

```bash
npm ci
npm run lint
npm run test
npm run build
npm run check
npm run dry-run # apenas empacota; nunca publica
```

O build gera `dist/{worker,painel,publico}`. O shell público continua sem anúncios; a aplicação privada única fica em `/painel/`. A definição do formulário vem de `config/formulario-cadastro-privado.json`, não do HTML.

## Configuração obrigatória futura

Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `CPF_INDEX_SECRET`, `SUPERADMIN_GOOGLE_SUBS`; variável `APP_ORIGIN`. Sem todos os itens do login, `/api/auth/google/config` informa **Configuração Google pendente** e nenhum login é aceito. Consulte [configuração Google](docs/CONFIGURAR-GOOGLE.md), [operação SUPERADMIN](docs/OPERAR-SUPERADMIN.md) e [escopo da Rodada 2](docs/RODADA-2.md).

Asaas permanece `{ provedor: "asaas", habilitado: false, ambiente: "desativado", cobrancaAutomatica: false }`; não existe cliente HTTP para o provedor. Não há deploy automático.
