# ACTS Portal — Estratégia de testes

**Versão:** 1.1
**Status:** Oficial

## 1. Princípios

Testes são parte do lote funcional e seguem na mesma PR da implementação. Não existe uma fase tardia para recuperar cobertura omitida: o Lote 18 contém somente integração transversal, segurança, E2E e aceite. Testes devem ser determinísticos, reproduzíveis no runtime Cloudflare aplicável e observar duração, ambiente e versão.

A pirâmide prioriza unidade, seguida de integração/contrato e poucos E2E críticos. Cobertura é indicador, não substituto para casos significativos. Fixtures são pequenas; mocks isolam APIs, gateways, filas e serviços remotos, mas não escondem problemas reais de integração.

## 2. Suítes oficiais e lote de origem

| Lote | Arquivo | Escopo |
|---:|---|---|
| 2 | `tests/core/config-helpers-logger.test.js` | Configuração, helpers e logs seguros. |
| 3 | `tests/core/events-persistence.test.js` | Event Bus, D1, KV/cache e R2. |
| 4 | `tests/core/auth-router.test.js` | Auth, autorização e roteamento. |
| 5 | `tests/core/render-publish-app.test.js` | Renderização, publicação e composição. |
| 6 | `tests/database/schema-migrations.test.js` | Schema e migration inicial. |
| 6 | `tests/schemas/schemas.test.js` | Seis schemas JSON e versionamento. |
| 7 | `tests/modules/identity-subscriptions.test.js` | Identidade, planos e assinaturas. |
| 8 | `tests/modules/catalog-media.test.js` | Catálogo, mídia e upload. |
| 9 | `tests/modules/discovery.test.js` | Busca, geolocalização, mapas, favoritos e comparação. |
| 10 | `tests/modules/relationship.test.js` | Contatos, leads, reviews e notificações. |
| 11 | `tests/modules/payments-integrations.test.js` | Regras financeiras e integrações. |
| 11 | `tests/gateways/asaas.contract.test.js` | Contrato do único gateway Asaas. |
| 12 | `tests/modules/management-intelligence.test.js` | Dashboard, analytics, reports e AI. |
| 13 | `tests/modules/publishing-seo.test.js` | Publicação de domínio e SEO. |
| 14A/14B | `tests/components/components.test.js` | Todos os componentes, acessibilidade e interação. |
| 15 | `tests/rendering/layouts-templates.test.js` | Layouts e templates sem D1. |
| 16A | `tests/functions/api.test.js` | Middleware e APIs. |
| 16A–17 | `tests/contract/public-api.test.js` | Contrato HTTP e consumidor público. |
| 16B | `tests/functions/panel-admin.test.js` | Painel e administração. |
| 16B | `tests/functions/webhooks-scheduled.test.js` | Webhook e agendamentos. |
| 17 | `tests/site/public-frontend.test.js` | Site estático e zero D1 direto. |
| 18 | `tests/integration/publication-flow.test.js` | D1→evento→publicação→KV/R2/cache. |
| 18 | `tests/e2e/critical-flows.test.js` | Autenticação, cadastro, anúncio, busca, pagamento e administração. |
| 18 | `tests/security/security.test.js` | AuthN/AuthZ, SQLi, XSS, CSRF, upload, webhook e segredos. |

## 3. Gates por lote

Cada lote deve executar a suíte nova, todas as suítes afetadas e verificações estáticas. Um teste falho bloqueia a conclusão. Contratos incompatíveis exigem documentação e estratégia de migração. Integrações Cloudflare usam ambiente local controlado e, antes de produção, staging com bindings reais não produtivos.

Critérios mínimos:

- casos felizes, limites, entradas inválidas, falhas e autorização;
- ausência de regra de domínio no Core e Functions;
- SQL parametrizado e migrations verificadas em banco vazio;
- logs sem segredos/PII integral;
- acessibilidade de componentes e frontend;
- publicação idempotente e cache invalidável;
- prova automatizada de que o frontend público não consulta D1 diretamente.

## 4. Validação transversal do Lote 18

Executar suíte completa, contrato, E2E, segurança, performance, migration/restore, publicação incremental e smoke pós-deploy. Validar rollback, correlação de logs, alertas e zero consulta pública direta ao D1. Nenhum achado crítico ou alto pode permanecer aberto no aceite final.

## 5. Regra final

Um lote só está pronto quando seus testes nomeados estão presentes e verdes, sua evidência é revisável e as regressões anteriores continuam aprovadas.
