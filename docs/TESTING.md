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
| 12 | `tests/modules/management.test.js` | Dashboard, analytics e relatórios privados limitados. |
| 13 | `tests/modules/publishing-seo.test.js` | Publicação de domínio e SEO. |
| 14A/14B | `tests/components/components.test.js` | Todos os componentes, acessibilidade e interação. |
| 15 | `tests/rendering/layouts-templates.test.js` | Layouts e templates sem D1. |
| 16A | `tests/functions/api.test.js` | Middleware e APIs. |
| 16A–17 | `tests/contract/public-api.test.js` | Contrato HTTP e consumidor público. |
| 16B | `tests/functions/panel-admin.test.js` | Painel e administração. |
| 16B | `tests/functions/webhooks-scheduled.test.js` | Webhook e agendamentos. |
| 17 | `tests/site/public-frontend.test.js` | Site estático e zero D1 direto. |
| 18 | `tests/integration/publication-flow.test.js` | D1 confirmado→Queue→Publisher→R2→Edge Cache. |
| 18 | `tests/e2e/critical-flows.test.js` | Autenticação, cadastro, anúncio, busca, pagamento e administração. |
| 18 | `tests/security/security.test.js` | AuthN/AuthZ, SQLi, XSS, CSRF, upload, webhook e segredos. |

## 3. Gates por lote

O Lote 12 implementa 44 casos individuais em `management.test.js`, cobrindo
autenticação, RBAC, ownership, períodos, allowlists, parametrização, limites,
ordenação, minimização, logs e CSV seguro, além das proibições arquiteturais.

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

## 5. Gate funcional

Um lote só está pronto quando seus testes nomeados estão presentes e verdes, sua evidência é revisável e as regressões anteriores continuam aprovadas.

## 6. Pirâmide de testes

```text
          E2E
       Contratos
      Integração
       Unitários
```

A base unitária deve ser ampla e rápida. Integrações comprovam fronteiras reais. Contratos protegem consumidores e produtores. E2E são poucos e cobrem jornadas críticas. O formato não impede testes de segurança e performance em mais de um nível.

## 7. Testes unitários

Validam arquivo ou unidade coesa com dependências controladas. Devem cobrir Core, módulos, helpers, componentes, schemas e transformações das Functions, incluindo sucesso, limites, entrada inválida, falha e idempotência.

Testes unitários do Core provam ausência de domínio, estado isolado e APIs compatíveis com Workers. Testes de módulo provam regras e SQL do próprio domínio. Componentes provam renderização, escaping, propriedades e acessibilidade sem banco.

## 8. Testes de integração

Validam interação entre Core, D1, KV, R2, Event Bus, Publisher, Renderer, módulos, gateway e APIs. Devem usar implementações locais compatíveis com Cloudflare quando disponíveis e verificar efeitos persistidos, ordem D1→evento→publicação, falhas parciais, retry e limpeza.

Mocks não substituem a execução da migration em D1 limpo, a leitura/gravação real dos stores no ambiente de teste nem o ensaio do fluxo de publicação. A integração transversal final está em `tests/integration/publication-flow.test.js`; integrações menores acompanham seus lotes.

## 9. Testes de contrato

Protegem interfaces públicas, envelopes de eventos, schemas, APIs e gateway Asaas. Cada contrato define versão, campos obrigatórios, compatibilidade, status/erros e exemplos válidos/inválidos. Mudança incompatível exige estratégia explícita e atualização coordenada de produtor e consumidor.

`tests/contract/public-api.test.js` evolui nos Lotes 16A, 16B, 17 e 18. `tests/gateways/asaas.contract.test.js` valida tradução do protocolo externo sem acoplar regras financeiras ao gateway.

## 10. Testes End-to-End

E2E valida o sistema pela superfície pública/protegida e cobre somente jornadas de alto valor:

- cadastro, autenticação e sessão;
- criação e publicação de anúncio;
- busca pública sem consulta direta ao D1;
- upload e associação de mídia;
- assinatura/pagamento e webhook idempotente;
- painel e administração autorizados;
- falha, recuperação e conteúdo publicado atualizado.

A suíte deve ser determinística, usar dados isolados e coletar evidência suficiente sem registrar segredo. `tests/e2e/critical-flows.test.js` é completado no Lote 18, depois que os testes próprios dos lotes estiverem verdes.

## 11. Testes de performance

Medem latência, throughput, tamanho de resposta, consultas, renderização, publicação, cache hit/miss, uso de memória/CPU e consumo dos bindings. Devem estabelecer orçamento por jornada e comparar regressões em ambiente representativo.

Cenários mínimos incluem busca pública cacheada, publicação incremental, API autenticada, upload/streaming e carga concorrente. Uma otimização só é aceita com medição antes/depois e sem degradar correção, segurança ou observabilidade.

## 12. Testes de segurança

Devem cobrir autenticação, autorização, elevação de privilégio, token/cookie, SQL injection, XSS, CSRF, CORS, open redirect, uploads, path traversal, SSRF quando aplicável, webhook/assinatura/replay, rate limit, exposição de erro e segredos em logs.

Casos negativos existem desde o lote funcional responsável. `tests/security/security.test.js` agrega varredura transversal no Lote 18. Nenhum achado crítico ou alto pode permanecer aberto no aceite final; exceções menores exigem risco, responsável e prazo documentados.

## 13. Fixtures e dados de teste

Fixtures devem ser pequenas, legíveis, versionadas, reutilizáveis sem acoplamento excessivo e específicas o suficiente para revelar intenção. Cada teste cria ou identifica seus dados e faz limpeza. Datas, IDs e relógio são controlados. Dados pessoais reais e credenciais de produção são proibidos.

Factories podem reduzir repetição quando houver necessidade comprovada, mas não devem esconder campos relevantes ao cenário. A migration inicial, não um seed de produção, prepara o banco estrutural de teste.

## 14. Mocks, stubs e fakes

Mocks são apropriados para API Asaas, IA, mapas, filas e falhas remotas controladas. Fakes podem representar bindings em testes unitários. Spies comprovam que Functions apenas delegam.

Não usar doubles para esconder incompatibilidade real, SQL inválido, contrato divergente ou migration quebrada. Teste de contrato deve usar payloads representativos e, quando possível, staging/sandbox não produtivo. Expectativas evitam conhecer detalhes internos sem relevância contratual.

## 15. Cobertura

Cobertura deve ser coletada para Core, módulos, Functions, contratos e apresentação crítica, com linhas, branches e funções. Percentual não substitui análise de risco nem exige teste sem significado.

Queda injustificada bloqueia a PR. Código de autenticação, autorização, pagamento, publicação, migrations e webhook exige atenção a branches negativos, concorrência e idempotência. Exclusões de cobertura devem ser mínimas e justificadas no próprio mecanismo de configuração.

## 16. Integração contínua

Toda PR de lote executa instalação reproduzível, lint/verificação estática, testes novos, regressões afetadas, contratos e build. O pipeline deve falhar em teste instável, migration inválida, contrato incompatível, segredo detectado ou artefato fora do TREE.

A `main` executa a suíte aplicável completa. Staging adiciona bindings reais não produtivos, migrations, smoke, segurança e publicação. Lote 18 acrescenta E2E, performance, restore, rollback e evidência de observabilidade. Resultados registram commit, ambiente, duração e versão das ferramentas.

## 17. Critérios de aceite

Uma suíte é aceita quando é determinística, legível, falha pelo motivo correto, controla dados/tempo, não depende de ordem e testa contrato público em vez de detalhe acidental.

Um lote é aceito quando:

- sua suíte nomeada existe e está verde;
- regressões anteriores e checks estáticos passam;
- casos negativos, autorização e falhas relevantes estão cobertos;
- integração/contrato necessário não foi substituído apenas por mock;
- evidência e cobertura estão disponíveis;
- nenhum teste foi desabilitado para obter sucesso;
- documentação e comportamento concordam.

## 18. Observabilidade dos testes

CI registra duração total e por suíte, falha, retry de infraestrutura, ambiente, commit e artefatos diagnósticos seguros. Flakiness é defeito: teste instável deve ser corrigido, não repetido indefinidamente. Logs de teste seguem as mesmas regras de redação de produção.

Performance e E2E publicam tendências. Segurança preserva relatório e severidade. Deploy/rollback registra timestamps, versão, smoke e decisão de promover ou reverter.

## 19. Relação entre lotes e as 24 suítes

A tabela da seção 2 é normativa e contém 24 caminhos únicos. Suítes compartilhadas são iniciadas no primeiro sublote e ampliadas nos seguintes, sem criar duplicata. O Lote 18 não substitui nenhum teste unitário, de integração local, contrato ou Function exigido anteriormente.

A revisão e o commit são feitos por lote funcional. Um arquivo de teste continua com responsabilidade clara, mas não se torna gate isolado de autorização para o próximo arquivo.

---

## Arquitetura 2.0 — decisão vigente (2026-08-04)

Esta seção substitui qualquer descrição anterior incompatível neste documento. A evolução preserva os Lotes 1 a 9 já concluídos; ajustes de implementação dependem de necessidade concreta, autorização e lote futuro. Esta revisão é exclusivamente documental.

- Há **um único D1 operacional por ambiente**, única fonte de verdade relacional para usuários, anúncios, clientes, planos, assinaturas, pagamentos, configurações e demais dados oficiais. Não existe segundo D1 público. Toda mutação é validada e confirmada no D1 antes de publicar; derivados nunca se tornam fonte de verdade.
- O R2 é a origem oficial de JSONs públicos compilados, catálogos de cidades, manifests, mídia, imagens e demais artefatos públicos aprovados. Esses objetos são reconstruíveis do D1.
- O KV fica fora da navegação pública normal: visitantes não fazem `KV.get()` para catálogos e KV não origina os JSONs públicos. Seu uso limita-se a configuração, feature flags, coordenação, cache interno de baixo volume e metadados operacionais quando comprovado.
- Valem simultaneamente: `navegação pública normal = zero consultas ao D1`, `navegação pública normal = zero leituras no KV` e `navegação pública normal = zero Worker/Pages Function`. Pages entrega HTML, CSS e JavaScript; R2 com Cloudflare Edge Cache entrega JSON e mídia. Functions e Workers servem escrita, autenticação, administração, integrações e processamento privado.
- A unidade principal é **uma cidade = uma JSON pública unificada e versionada**. Ela reutiliza anunciantes por identificador e atende cidade, categorias, filtros, busca local, cards, detalhes, dados públicos de anunciantes, minisites e comparação. Não se adota como padrão JSON completa por anúncio, cliente ou minisite. Acesso direto a minisite resolve anunciante, cidade e versão, então reutiliza o catálogo da cidade.
- A JSON permanece unificada enquanto tamanho e carregamento medidos forem aceitáveis. Divisão por categoria, página, chunk, geografia ou outro grupo exige necessidade real, aprovação, poucas requisições e reutilização dos dados carregados.
- O Publisher produz projeções compactas, serializáveis, minificáveis, sem campos internos, dados privados ou duplicação evitável, adequadas a parsing e compressão HTTP no Edge. Otimização estrutural, minificação e compressão HTTP são etapas distintas; não se exige Brotli/Gzip manual sem validação futura.
- Catálogos usam nomes imutáveis versionados, como `cidades/londrina/catalogo-v145.json`. Um manifest estável, como `cidades/londrina/manifest.json`, informa ao menos versão, caminho vigente, atualização e integridade aplicável. O catálogo admite cache longo/imutável e o manifest cache curto. O manifest só muda após confirmação integral do novo objeto.
- R2 é origem e Edge Cache é a camada principal de entrega. JSON exige Cache Rules explícitas e validadas no domínio dos artefatos; hits devem atender o tráfego normal e apenas misses alcançam R2. Não há promessa de latência fixa.
- Cloudflare Queue é o transporte principal da publicação assíncrona, com desacoplamento, recompilação, retries, agrupamento e recuperação. Não substitui D1. O fluxo é `Painel → Function/Worker de escrita → módulo → D1 → evento → Queue → Publisher → JSON otimizada → R2 → Edge Cache → navegador`. Separadamente: escrita `Painel → backend privado → D1`; publicação `D1 confirmado → Queue → Publisher → R2`; leitura `Pages + Edge Cache + R2 → navegador`.
- Alterações marcam cidades afetadas e somente elas são recompiladas. O Lote 9A agrega mensagens da mesma cidade apenas dentro do batch entregue; `dueAt` calculado não executa espera persistente. A janela entre batches/invocações permanece pendente para o runtime do Lote 16B, enquanto regras de domínio são do Lote 13 e reconciliação operacional pertence aos Lotes 16B e 18. Cron é complementar, nunca o caminho obrigatório de cada alteração.
- Falha de publicação não reverte o negócio confirmado: D1 permanece verdadeiro. Publicação é repetível/idempotente, suporta republicação e retenção temporária de versões para rollback; falha em R2 não aponta manifest a arquivo parcial.
- O navegador prioriza cache HTTP, memória, Cache Storage quando necessário, IndexedDB para persistência estruturada e `localStorage` somente para pequenos metadados/preferências. A JSON completa não tem `localStorage` como armazenamento principal.
- Catálogos contêm somente projeções públicas aprovadas: sem e-mail privado, dados administrativos, tokens, pagamentos, endereço privado não autorizado ou coordenada precisa proibida.

## Cobertura futura obrigatória — Lote 13 e migration 0003

Nenhum teste executável foi criado nesta decisão. A cobertura da evolução foi separada pela correção vigente abaixo: a `0003` não executa backfill; executor JavaScript e `0004` possuem gates próprios. Permanecem exigidos versão monotônica, concorrência, lease, retry, rollback e migration inicial imutável.

`tests/modules/publishing-seo.test.js` deverá cobrir: somente publicados; cidade correta; cidade anterior/nova; categoria usada; anunciante multicidade; reviews de anúncio/perfil; mídia; PII ausente; envelope completo; idempotência; versão/concorrência; falhas antes de catálogo/manifest; manifest anterior; rollback; sitemap; canonical; noindex; remoção; nenhum KV público; nenhum Worker na leitura; estados/limite de retry; lease; erro definitivo; ordenação/digest determinísticos; e coerência SEO–manifest.

`tests/core/render-publish-app.test.js` deverá ser atualizado no Lote 13 somente se `app/core/publish.js` receber contrato técnico genérico para artefatos SEO. A cobertura mínima será escrita, digest, confirmação por `head`, falha antes da ativação, preservação do artefato anterior, cache headers, chave segura, content type allowlist e ausência de regra SEO no Core.


## Correção vigente da cobertura do Lote 13 (2026-08-06)

A `0003` é testada apenas como expansão segura: banco preenchido preservado, tabelas/coluna anulável/constraints/índices transitórios e nenhuma tentativa SQL de Unicode/backfill/publicação. O futuro `[P]` `tests/operations/city-backfill.test.js` cobre vetores Unicode fixados, NFC público, NFKD/marcas/casefold, espaços, hífens, apóstrofos, rejeições, limites, vazio, país/região/cidade, homônimos, colisões/determinismo de slug, criação/reuso por chave, IDs opacos, statements parametrizados, lote limitado, checkpoint, retry, retomada, idempotência, ambiguidade fail-closed, métricas sem PII e bloqueio de publicação.

`tests/database/schema-migrations.test.js` deverá provar separadamente `0001 → 0002 → 0003`, execução/reexecução do executor e `0004`, além de snapshot limpo final equivalente semanticamente: zero nulos/órfãos/ambiguidades, chaves/slugs únicos, FK check, contagens e inventário integral de colunas/defaults/checks/uniques/FKs/ações/índices/triggers. IDs aleatórios podem diferir; chaves, slugs, estrutura e referências devem equivaler. Restore/rollback e staging representativo são evidência obrigatória antes da contração. A antiga expectativa de preenchimento integral dentro da `0003` fica revogada.
