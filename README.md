# PORTAL V2 — Rodada 3

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

O build gera `dist/{worker,painel,publico}`. O shell público continua sem anúncios; a aplicação privada única fica em `/painel/`. As definições dos formulários vêm de `config/formulario-cadastro-privado.json` e `config/formulario-publico.json`, não do HTML. Toda mídia e rascunho permanece em `acts-private`; publicação e escrita em `acts-public` estão desativadas.

## Configuração obrigatória futura

Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `CPF_INDEX_SECRET`, `SUPERADMIN_GOOGLE_SUBS`; variável `APP_ORIGIN`. Sem todos os itens do login, `/api/auth/google/config` informa **Configuração Google pendente** e nenhum login é aceito. Consulte [configuração Google](docs/CONFIGURAR-GOOGLE.md), [operação SUPERADMIN](docs/OPERAR-SUPERADMIN.md) e [escopo da Rodada 2](docs/RODADA-2.md).

Asaas permanece `{ provedor: "asaas", habilitado: false, ambiente: "desativado", cobrancaAutomatica: false }`; não existe cliente HTTP para o provedor. Não há deploy automático.
