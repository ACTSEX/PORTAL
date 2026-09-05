# Cloudflare e R2

Bindings oficiais: `env.acts_private` → `acts-private`; `env.acts_public` → `acts-public`. Endpoints existentes são `https://bf11b6d61e5882a32523633ffb4288a4.r2.cloudflarestorage.com/acts-private` e `/acts-public`; domínio público `https://public.acompanhantesex.com`.

Rotas observadas, não gerenciadas neste repositório: `acompanhantesex.com/api/*`, `*.acompanhantesex.com/*` e domínio de produção `acompanhantesex.com`. O domínio público pode coincidir com wildcard: validar exclusão/precedência antes de produção. Cache não elimina necessariamente execução do Worker.

Árvore lógica privada: `sistema/`; `clientes/{clienteId}/{identidade,operacional,documentos,rascunho,avisos,auditoria,uploads-temporarios}/`; `superadmin/`. Pública: `app/{portal,painel,site}/`; `dados/sistema/`; `dados/cidades/{cidade}/{mulheres,homens,transex}/`; `dados/clientes/{clienteId}/`; `midias/clientes/{clienteId}/{fotos,videos,audios,capas}/`. R2 não tem pastas vazias: futuros `manifest.json` materializam prefixos. Nada remoto é criado nesta rodada.
