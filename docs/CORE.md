# ACTS Portal — Core

**Versão:** 1.1
**Status:** Oficial
**Escopo:** `app/core/`

## 1. Objetivo e limites

O Core fornece exclusivamente infraestrutura técnica genérica para o runtime Cloudflare. Ele não conhece anúncios, usuários, planos, pagamentos ou qualquer regra comercial; não contém SQL de domínio; não importa módulos. D1 é a fonte de verdade, KV contém cache e artefatos derivados e R2 contém arquivos.

O conjunto aprovado é deliberadamente pequeno. Descrições históricas ou exemplos em documentos especializados não criam caminhos: somente `TREE.md` autoriza localização e somente o lote correspondente do `ROADMAP.md` autoriza implementação.

## 2. Arquivos oficiais

| Caminho | Responsabilidade exclusiva | Lote |
|---|---|---:|
| `app/core/config.js` | Ler, normalizar e expor configuração e bindings, sem segredos no repositório. | 2 |
| `app/core/helpers.js` | Utilitários técnicos puros e reutilizáveis, sem regra de domínio. | 2 |
| `app/core/logger.js` | Logs estruturados, correlação e redação de dados sensíveis. | 2 |
| `app/core/events.js` | Event Bus e envelope técnico de eventos. | 3 |
| `app/core/db.js` | Primitivas seguras de acesso ao D1 e transações, sem SQL de domínio. | 3 |
| `app/core/cache.js` | Leitura, escrita e invalidação técnica de cache/KV. | 3 |
| `app/core/storage.js` | Operações técnicas de objetos em R2. | 3 |
| `app/core/auth.js` | Autenticação, autorização técnica e políticas comuns. | 4 |
| `app/core/router.js` | Correspondência de rota, método e despacho, sem negócio. | 4 |
| `app/core/render.js` | Compor layouts, templates e componentes com dados prontos. | 5 |
| `app/core/publish.js` | Orquestrar geração e gravação de artefatos derivados. | 5 |
| `app/core/app.js` | Compor e inicializar Core, módulos e rotas por registro explícito. | 5 |

## 3. Inconsistência auditada e decisão

`CORE.md` anteriormente descrevia 22 arquivos, enquanto `TREE.md` autorizava somente 12. A análise de responsabilidades concluiu que os dez candidatos adicionais não comprovam uma responsabilidade independente necessária para a primeira implantação:

| Caminho candidato anterior | Decisão e destino da responsabilidade |
|---|---|
| `app/core/bootstrap.js` | Não criar; composição e bootstrap pertencem a `app/core/app.js`. |
| `app/core/container.js` | Não criar; injeção explícita é feita por `app/core/app.js`. |
| `app/core/registry.js` | Não criar; registros explícitos pertencem a `app/core/app.js`. |
| `app/core/loader.js` | Não criar; não haverá descoberta dinâmica; composição explícita em `app/core/app.js`. |
| `app/core/queues.js` | Não criar nesta implantação; produtores/consumidores usam bindings via eventos/publicação e Functions finas. Requer nova necessidade e decisão documental para existir. |
| `app/core/request.js` | Não criar; normalização mínima pertence ao Router/Function. |
| `app/core/response.js` | Não criar; resposta técnica mínima pertence ao Router/Function. |
| `app/core/permissions.js` | Não criar; autorização técnica pertence a `app/core/auth.js`; regras comerciais ficam nos módulos. |
| `app/core/security.js` | Não criar; controles transversais ficam em `auth.js`, `router.js`, `helpers.js` e nos limites de entrada. |
| `app/core/validator.js` | Não criar; schemas são consumidos nos limites de entrada e módulos. |
| `app/core/errors.js` | Não criar; erros padronizados são parte dos contratos dos serviços e do Router. |
| `app/core/scheduler.js` | Não criar; `functions/scheduled.js` apenas orquestra módulos. |
| `app/core/assets.js` | Não criar; assets pertencem a `site/`; renderização só os referencia. |

Assim, `request.js`, `response.js`, `errors.js`, `security.js`, `permissions.js` e `validator.js` não são indispensáveis como unidades independentes. Esta decisão não elimina os requisitos de validação, segurança, autorização ou erros consistentes; apenas evita abstrações genéricas sem necessidade concreta.

## 4. Contratos obrigatórios

- APIs públicas pequenas, explícitas e compatíveis com ES Modules e runtime Cloudflare.
- Bindings entram pelo contexto; nunca por globais ocultas.
- Entradas não confiáveis são validadas no limite adequado.
- Logs nunca contêm tokens, credenciais ou dados pessoais integrais.
- Falhas expõem mensagem pública estável e preservam diagnóstico somente em log seguro.
- Módulos recebem infraestrutura por interface pública; nenhum acesso a detalhes internos.
- `db.js` oferece execução parametrizada, mas consultas e decisões de domínio ficam nos módulos.
- `publish.js` produz derivados somente depois da persistência no D1.
- Navegação pública não consulta D1.

## 5. Ordem e revisão

A implementação ocorre nos Lotes 2 a 5. Um lote pode incluir vários arquivos e seus testes na mesma PR. O lote só termina quando todos os seus arquivos estiverem implementados, testados, revisados, aprovados e mesclados. Não há autorização individual pelo ROADMAP.

Critérios de revisão de cada arquivo:

- uma responsabilidade principal;
- nenhuma regra de negócio ou importação de módulo pelo Core;
- entradas e falhas tratadas de modo consistente;
- segredo e dado sensível protegidos;
- compatibilidade com Cloudflare;
- testes do lote presentes;
- nenhum placeholder, TODO substitutivo ou abstração preventiva.

## 6. Gateway Asaas

O caminho oficial único é `app/gateways/Asaas.js`. `app/modules/Payments.js` contém regras financeiras; o gateway contém somente transporte, autenticação e tradução do protocolo Asaas. O caminho `app/modules/payments/gateways/Asaas.js` é rejeitado e não deve existir.

## 7. Regra final

Adicionar um serviço ao Core exige necessidade concreta compartilhada, responsabilidade técnica independente, contrato testável e atualização prévia de `TREE.md`, `ROADMAP.md` e `CHANGELOG.md`. Exemplos ou possibilidades não são autorização.
