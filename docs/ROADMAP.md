# ACTS — estado e roadmap

Este documento registra somente o que está implementado, em remontagem ou planejado. Planejamento não equivale a autorização nem a recurso disponível.

## IMPLEMENTADO

- Fundações atuais em `app/`: configuração, logging, persistência D1/R2, eventos, autenticação, roteamento, renderização e publicação.
- Schema e migrations iniciais, expansão de cidades, backfill controlado, schemas JSON, módulos iniciais, gateway Asaas e testes correspondentes.
- Publicação assíncrona existente com envelopes de Queue, correlação, idempotência, objetos R2 versionados, confirmação anterior ao manifest, retry e rollback.
- Worker mínimo em `worker/index.js`, configurado como entrada do Worker `portal`.
- Bindings `ACTS_DB`, `ACTS_MEDIA`, `ACTS_DATA` e `ACTS_QUEUE` e rotas do domínio principal/wildcard declarados em `wrangler.toml`.
- Documentação consolidada nos cinco documentos oficiais.

O domínio imobiliário presente nas fundações é legado técnico implementado, não regra do produto atual.

## EM REMONTAGEM

- Migração física de `app/` para a estrutura Worker-first `core/`, `business/`, `worker/` e `frontend/`.
- Composição do Worker como entrada HTTP, adaptador de fronteira e consumer da Queue, mantendo regras em `business/`.
- Adequação do domínio legado para contas, perfis, anúncios ACTS, cidades, categorias, STANDARD/PREMIUM e condições comerciais.
- Substituição do catálogo municipal completo por catálogo leve mais projeção pública individual.
- Entrega de conteúdo de `ACTS_DATA` por HTTP/Cloudflare Edge Cache, sem KV.
- Separação e validação real dos recursos de development, staging e production antes de operações remotas.

## PLANEJADO

- Portal, painel e minisite compartilhado completos no `frontend/`.
- Entitlements finais, upgrade/downgrade, cobrança recorrente e compras avulsas de boost.
- Produtos, preços, duração, expiração e ranking de boosts, inclusive regra para campanha ativa durante downgrade.
- Contratos finais de projeção individual, catálogo municipal, manifests, URLs, TTLs e SEO.
- Limites de mídia oficial, taxonomia comercial final, política de inadimplência e regras jurídicas/privacidade/idade.
- Validação operacional do wildcard e do minisite PREMIUM.
- Prova em navegador real da integração Blogger client-side; falha de CORS ou segurança exige nova decisão, nunca proxy backend automático.
- Gates completos de integração, segurança, observabilidade, backup/restore, staging, rollback e smoke antes da produção.
