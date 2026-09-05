# PORTAL V2 — Rodada 5

Aplicação privada do **Acompanhantes EX** em um único Cloudflare Worker `portal`: base da Rodada 2 mais formulário público configurável, rascunhos privados, prévia autenticada e pipeline privado de fotos WebP, vídeos MP4 e áudios M4A com limites fail-closed. `ARQUITETURA.md` é a autoridade normativa.

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

O build gera `dist/{worker,painel,publico}`. O template público único renderiza portal, listagens e minisites; a aplicação privada única fica em `/painel/`. As definições dos formulários vêm de `config/formulario-cadastro-privado.json` e `config/formulario-publico.json`, não do HTML. Rascunhos permanecem em `acts-private`; todas as flags de publicação, cron, V2 pública e Asaas são fechadas por padrão e nenhuma escrita real em `acts-public` ocorre no desenvolvimento/teste.

## Configuração obrigatória futura

Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `CPF_INDEX_SECRET`, `SUPERADMIN_GOOGLE_SUBS`; variável `APP_ORIGIN`. Sem todos os itens do login, `/api/auth/google/config` informa **Configuração Google pendente** e nenhum login é aceito. Consulte [configuração Google](docs/CONFIGURAR-GOOGLE.md), [operação SUPERADMIN](docs/OPERAR-SUPERADMIN.md) e [escopo da Rodada 2](docs/RODADA-2.md).

Asaas permanece `{ provedor: "asaas", habilitado: false, ambiente: "desativado", cobrancaAutomatica: false }`. O adaptador HTTP e webhook existem para homologação futura, mas falham fechados sem habilitação explícita e secrets do ambiente. Não há deploy automático; deploy, R2 e rotas usam workflows exclusivamente manuais e protegidos.
