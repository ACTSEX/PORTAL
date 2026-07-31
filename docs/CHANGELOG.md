CHANGELOG.md


ACTS Portal
CHANGELOG
Versão: 1.0
Status: Oficial

Objetivo
Este documento registra oficialmente todas as alterações relevantes do projeto ACTS.

O objetivo é manter um histórico rastreável das decisões arquiteturais,
funcionais e estruturais.

Regras
Toda alteração significativa deve ser registrada.

Alterações arquiteturais devem referenciar o documento afetado.

Cada registro deve conter data, versão e descrição.

Mudanças incompatíveis (breaking changes) devem ser claramente identificadas.

Formato
YYYY-MM-DD
Versão X.Y.Z
Adicionado
...

Alterado
...

Corrigido
...

Removido
...

Breaking Changes
...

Histórico

2026-07-31
Versão 1.5.0
Adicionado
Lote 4 com autenticação técnica por credenciais assinadas, autorização genérica com negação por padrão, validação de origem e identificadores seguros.

Router determinístico com normalização imutável de requisições, middlewares, despacho autenticado, respostas HTTP padronizadas, erros públicos seguros e observabilidade por Logger e Event Bus.

Suíte integrada de autenticação, autorização, segurança, requisições, roteamento, respostas e falhas, sem dependências de domínio ou persistência.

Breaking Changes
Nenhuma.

2026-07-31
Versão 1.4.0
Adicionado
Lote 3 com Event Bus técnico determinístico, acesso parametrizado ao D1, cache técnico por KV e armazenamento genérico de objetos no R2.

Suíte integrada com bindings D1, KV e R2 simulados, cobertura de falhas seguras, expiração, normalização e isolamento de listeners.

Breaking Changes
Nenhuma.
2026-07-31
Versão 1.3.0
Adicionado
Lote 2 com configuração técnica centralizada e imutável, validação de ambientes e bindings Cloudflare e feature flags normalizadas.

Helpers técnicos puros para reconhecimento e congelamento profundo de estruturas de configuração.

Logger estruturado com níveis configuráveis, correlação, saída injetável, normalização segura de erros, redação profunda e proteção contra ciclos.

Suíte unitária da fronteira de configuração, helpers e observabilidade, incluindo integração, imutabilidade e ausência de segredos.

Breaking Changes
Nenhuma.

2026-07-31
Versão 1.2.0
Adicionado
Lote 1 com arquivos da raiz, manifesto ESM e lockfile reproduzível, comandos técnicos e configuração Cloudflare separada para development, staging e production.

Definidos bindings documentais de D1, KV, R2 e Queue, sem provisionar recursos ou registrar segredos.

Breaking Changes
Nenhuma.

2026-07-31
Versão 1.1.0
Adicionado
Plano mestre de implantação em 18 lotes funcionais, com sublotes 14A/14B e 16A/16B, arquivos, dependências, testes, riscos, aceite e definição de concluído.

Nomes exatos para a migration inicial e para todas as suítes de teste planejadas.

Restaurado
Especificações técnicas detalhadas de Core, TREE e estratégia de testes que haviam sido excessivamente resumidas durante o replanejamento inicial.

As responsabilidades técnicas de segurança, validação, request/response e erros foram preservadas nos 12 arquivos oficiais, sem recriar os caminhos independentes rejeitados.

Alterado
O lote funcional substitui o arquivo como unidade de implementação, commit, revisão, Pull Request, aprovação e avanço.

TREE.md passou a inventariar integralmente o estado real e todos os caminhos planejados; ROADMAP.md agora cobre raiz, Cloudflare, Core, banco, módulos, gateway, interface, Functions, frontend, testes, segurança, deploy e operação.

CORE.md foi reconciliado com os 12 caminhos oficiais e consolidou responsabilidades que não justificavam arquivos independentes.

Corrigido
Adotado exclusivamente `app/gateways/Asaas.js`, removendo do plano o caminho contraditório sob `app/modules/payments/`.

Removidos do plano seed de produção, frameworks CSS sem origem definida e diretórios vazios de imagens/ícones.

Breaking Changes
Sim, apenas de governança documental: a autorização sequencial por arquivo foi substituída por gates de lote funcional. Não há breaking change de runtime, API ou dados, pois ainda não existe código de produto.

2026-07-31
Versão 1.0.3
Alterado
ROADMAP.md sincronizado com o estado real da documentação existente, incluindo CONSTITUTION.md e CORE.md na Fase 0.

Todos os itens documentais da Fase 0 foram auditados e marcados como concluídos.

CORE.md sincronizado com os nomes oficiais `app/core/render.js` e `app/core/publish.js`, conforme TREE.md e ROADMAP.md.

Corrigido
Resolvida a divergência entre `render.js` e `renderer.js`, adotando oficialmente `render.js`.

Resolvida a divergência entre `publish.js` e `publisher.js`, adotando oficialmente `publish.js`.

Autorizado
A Fase 1 — Infraestrutura está formalmente liberada, sem criação antecipada de código ou diretórios de implementação.

O primeiro e único arquivo autorizado para início da implementação é `app/core/config.js`.

Breaking Changes
Nenhuma.

2026-07-31
Versão 1.0.2
Alterado
TREE.md sincronizado com os 40 arquivos de documentação existentes no repositório.

Todos os documentos existentes passaram a ser identificados como [EXISTE].

A seção de estado atual foi atualizada para registrar que ainda não existem arquivos de código nem diretórios de implementação.

Corrigido
Removidos estados [PLANEJADO] incorretos de documentos já presentes no repositório.

Breaking Changes
Nenhuma.

2026-07-31
Versão 1.0.1
Alterado
A Constituição passou a declarar explicitamente que o Core fornece somente infraestrutura técnica genérica e que as regras de negócio pertencem exclusivamente aos módulos.

Definida a precedência documental oficial, com CONSTITUTION.md como autoridade máxima.

Esclarecidas as responsabilidades de ARCHITECTURE.md, documentos especializados, TREE.md e ROADMAP.md.

Definido que listas de referência em documentos especializados não autorizam a criação antecipada de arquivos nem substituem a ordem do ROADMAP.md.

Documentado o fluxo obrigatório para alterações estruturais, incluindo RFC e ADR quando aplicáveis.

Corrigido
Removida a contradição que permitia interpretar que regras de negócio poderiam permanecer no Core.

Breaking Changes
Nenhuma. A alteração formaliza a separação de responsabilidades já estabelecida nos documentos especializados.

2026-07-29
Versão 1.0.0
Adicionado
Documentação oficial do projeto.

README.md

PROJECT.md

INDEX.md

ARCHITECTURE.md

TREE.md

ROADMAP.md

MODULES.md

COMPONENTS.md

EVENTS.md

SCHEMAS.md

CLOUDFLARE.md

CHANGELOG.md

Alterado
Definida oficialmente a arquitetura Edge-first.

D1 definido como única fonte de verdade.

KV definido para cache e artefatos publicados.

R2 definido para armazenamento permanente.

Pages Functions definidas como camada de orquestração.

Corrigido
Consolidação das regras arquiteturais em documentos permanentes.

Removido
Nenhuma remoção registrada.

Breaking Changes
Nenhuma.

Próximas Versões
1.1.0
Planejado:

Início da implementação do Core.

Bootstrap do projeto.

Configuração da infraestrutura.

Primeiros módulos.

Política de Versionamento
O projeto adota Versionamento Semântico (SemVer):

MAJOR: alterações incompatíveis.

MINOR: novas funcionalidades compatíveis.

PATCH: correções sem quebra de compatibilidade.

Estado
Este documento é a referência oficial para o histórico do Portal ACTS.

## Lote 5 — Core de renderização, publicação e composição

Adicionado `render.js`, `publish.js` e `app.js` com registro explícito, publicação
incremental de derivados e bootstrap determinístico, acompanhados pelos testes
integrados oficiais do Core.

Nenhuma alteração estrutural deve ocorrer sem atualização deste arquivo.
