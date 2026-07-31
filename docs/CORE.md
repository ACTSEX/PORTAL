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

## 7. Governança de novos serviços

Adicionar um serviço ao Core exige necessidade concreta compartilhada, responsabilidade técnica independente, contrato testável e atualização prévia de `TREE.md`, `ROADMAP.md` e `CHANGELOG.md`. Exemplos ou possibilidades não são autorização.

## 8. Responsabilidades e limites arquiteturais

### 8.1 Responsabilidades permitidas

O Core pode fornecer somente infraestrutura compartilhada:

- inicialização e composição explícita da aplicação;
- configuração e bindings por ambiente;
- roteamento e normalização técnica de requisições e respostas;
- autenticação e autorização técnica;
- Event Bus e envelopes de eventos;
- acesso parametrizado a D1;
- cache e artefatos derivados em KV;
- arquivos e objetos em R2;
- renderização e publicação;
- logging, correlação, erros públicos e utilitários técnicos.

### 8.2 Responsabilidades proibidas

O Core não pode conter regras de anúncios, imóveis, usuários, planos, assinaturas, pagamentos, Asaas, SEO ou qualquer domínio; SQL específico de domínio; dependência ou importação de módulo; templates com decisões comerciais; credenciais; estado global mutável compartilhado; ou acesso público direto ao D1.

Os requisitos técnicos anteriormente associados a arquivos independentes rejeitados continuam obrigatórios, mas são implementados nos 12 arquivos oficiais: normalização de request/response e erros em `router.js`; autorização e políticas de segurança em `auth.js`; validação estrutural nos limites coordenados por `router.js` e helpers puros; bootstrap, registro e carregamento explícito em `app.js`; jobs em `functions/scheduled.js`; assets em `site/`.

### 8.3 Dependências e APIs públicas

O Core não depende de módulos, componentes, layouts ou templates de domínio. Dependências externas devem ser compatíveis com Workers, justificadas e injetáveis. Módulos usam apenas APIs públicas documentadas; não acessam estado interno. APIs devem possuir entradas, saídas, erros, efeitos colaterais e compatibilidade definidos, sem expor bindings brutos sem necessidade.

### 8.4 Limites de código

Cada arquivo possui uma responsabilidade principal. Como orientação, arquivos não devem ultrapassar aproximadamente 500 linhas, funções 80 linhas e métodos 40 linhas; a divisão ocorre por responsabilidade real, nunca para satisfazer números ou antecipar abstrações. `app/core/db.js` pode exceder a orientação quando suas primitivas técnicas permanecerem coesas e testáveis.

## 9. Configuração e composição da aplicação

### 9.1 `app/core/config.js`

Deve ler ambiente e bindings recebidos, aplicar defaults seguros, validar configurações obrigatórias, normalizar valores e fornecer visão imutável aos consumidores. Não consulta D1 para configuração de domínio, não registra segredos, não usa `process.env` como pressuposto de runtime e não mantém configuração duplicada.

Configurações persistidas de negócio são obtidas pelo módulo responsável. O arquivo pode descrever ambiente, domínio, idioma, timezone, TTLs técnicos, recursos habilitados e nomes lógicos de bindings, preservando separação entre configuração pública e segredo.

### 9.2 `app/core/app.js`

É o único ponto de composição e bootstrap. Deve:

1. receber contexto e configuração;
2. inicializar serviços técnicos na ordem explícita;
3. registrar módulos e rotas autorizados sem descoberta arbitrária;
4. conectar listeners conhecidos;
5. devolver aplicação pronta ou falhar de forma observável.

Não haverá container, registry, loader ou bootstrap independentes. Dependências são montadas explicitamente, ciclos são rejeitados e inicialização repetida deve ser segura ou falhar claramente. Nenhum módulo executa antes da infraestrutura da qual depende.

## 10. Event Bus — `app/core/events.js`

O Event Bus desacopla produtores e consumidores. Um evento representa fato ocorrido e possui, no mínimo, nome, versão, identificador único, data/hora, origem, `correlationId`, `causationId` quando aplicável e payload contratual.

Regras obrigatórias:

- nomes em PascalCase e no passado;
- payload pequeno, serializável e sem segredo;
- versão explícita para evolução compatível;
- ordem de listeners documentada somente quando inevitável;
- inscrição e remoção previsíveis;
- falha de listener observável, sem ser silenciosamente convertida em sucesso;
- prevenção de loops e emissão duplicada;
- eventos somente após a persistência correspondente no D1;
- consumidores idempotentes para entregas repetidas;
- correlação preservada em filas, publicação e integrações.

Eventos locais podem ser síncronos quando necessários à unidade de trabalho. Trabalho durável ou desacoplado pode usar bindings de Queue, orquestrado por `events.js`, `publish.js` ou Functions autorizadas, sem justificar `queues.js` independente nesta implantação.

## 11. D1 — `app/core/db.js`

D1 é a única fonte de verdade. O arquivo fornece conexão pelo binding recebido, statements parametrizados, execução, batch/transação suportada, paginação técnica, mapeamento consistente de resultados, timeouts e tradução segura de falhas.

O Core pode validar presença do binding, impedir interpolação insegura, registrar duração/contagem sem SQL sensível e disponibilizar primitivas testáveis. Não pode conhecer tabelas ou consultas de um domínio, decidir regras comerciais, criar schema em runtime ou misturar cache com persistência.

Regras de segurança:

- valores sempre parametrizados;
- identificadores dinâmicos somente por allowlist explícita;
- retorno mínimo necessário;
- falha não inclui SQL, bindings ou dados no cliente;
- migrations vivem exclusivamente em `database/migrations/`;
- alteração permanente precede evento e publicação;
- operações críticas definem atomicidade e comportamento de retry.

## 12. Cache — `app/core/cache.js`

Cache é derivado e nunca substitui D1. `cache.js` define chaves previsíveis e versionáveis, serialização, TTL, leitura, escrita, invalidação e política técnica de miss. Não contém regra de elegibilidade comercial nem reconstrói a fonte de verdade a partir do KV.

Toda entrada deve poder ser descartada e regenerada. Escritas e invalidações devem ser idempotentes; falha de cache não pode corromper D1; métricas distinguem hit, miss, stale, erro e latência. Dados sensíveis exigem política explícita e menor retenção. Stampede, colisão de chave e conteúdo obsoleto devem possuir mitigação testada.

## 13. Storage — `app/core/storage.js`

R2 armazena arquivos, imagens, vídeos, exportações e backups autorizados. `storage.js` fornece put/get/delete, metadados técnicos, streaming, validação de chave e tipo/tamanho técnico, integridade e URLs assinadas quando aplicável.

Não decide regras de upload do negócio, ownership ou visibilidade comercial. Chaves impedem path traversal; conteúdo não confiável não é executado; credenciais e URLs assinadas não são logadas; operações repetidas definem idempotência; objetos órfãos e falhas parciais são observáveis e reconciliáveis.

## 14. Autenticação, autorização e segurança — `app/core/auth.js`

Autenticação responde quem é o principal. Autorização técnica responde se o principal pode executar uma capacidade comum. Regras comerciais permanecem no módulo.

`auth.js` deve validar assinatura, expiração, emissor, audiência e revogação aplicáveis; produzir identidade mínima e imutável; negar por padrão; separar ausência, invalidade e insuficiência sem facilitar enumeração; aplicar menor privilégio; e aceitar relógio/armazenamento injetáveis para teste.

As responsabilidades de `permissions.js` e `security.js` rejeitados como arquivos independentes permanecem aqui ou no limite técnico responsável:

- políticas e capacidades técnicas em `auth.js`;
- método, origem, headers e tamanho de entrada em `router.js`/middleware;
- schema e sanitização no limite de entrada e apresentação;
- SQL parametrizado em `db.js`;
- upload técnico seguro em `storage.js`;
- webhook autenticado na Function e regra no módulo;
- redação de segredo em `logger.js`.

Tokens, cookies e sessões devem usar atributos seguros, comparação resistente quando aplicável e rotação/revogação documentada. Nenhuma credencial é persistida em texto claro ou exposta em resposta/log.

## 15. Router, requisição, resposta e erros — `app/core/router.js`

O Router reconhece rota e método, extrai parâmetros técnicos, aplica middleware autorizado, chama o handler e normaliza a resposta. Não consulta D1 diretamente nem contém regra comercial.

As responsabilidades necessárias dos arquivos rejeitados `request.js`, `response.js` e `errors.js` ficam neste arquivo:

- limitar e interpretar URL, headers, body e content type;
- produzir request context imutável com IDs de correlação;
- padronizar status, headers, corpo JSON/HTML e ausência de conteúdo;
- representar erro técnico com código estável, status público, causa interna e metadados seguros;
- mapear erro conhecido sem stack trace; converter desconhecido em resposta genérica e log correlacionado;
- proteger CORS, cache headers e content type conforme rota;
- impedir rota ambígua, método inesperado e open redirect.

Erros nunca são usados como fluxo normal, nunca são ignorados e nunca transformam falha em sucesso. Retentativas usam limite e backoff apenas para falhas transitórias e operações idempotentes.

## 16. Logger e observabilidade — `app/core/logger.js`

O logger emite registros estruturados com timestamp, nível, mensagem estável, ambiente, versão, serviço, `requestId`, `correlationId`, evento/operação e duração quando aplicável. Deve permitir destino injetável em testes e não alterar o resultado da operação observada.

É proibido registrar senha, token, segredo, cookie completo, chave de API, payload financeiro integral, documento pessoal integral, conteúdo privado, SQL com valores ou stack trace para cliente. Redação deve ser central e testada.

Níveis e amostragem são consistentes; erros preservam causa segura; métricas cobrem latência, taxa de erro, cache, D1, R2, eventos, publicação e integrações. Logs não substituem métricas nem auditoria de domínio. Alertas devem ser acionáveis e correlacionáveis ao deploy.

## 17. Publisher — `app/core/publish.js`

O Publisher transforma dados já persistidos e autorizados em artefatos derivados para KV/R2/cache, conforme instrução do módulo `Publish.js`. Pode gerar HTML, JSON, índices, sitemap, feeds e manifestos, mas não decide regras editoriais.

Publicação deve ser idempotente, incremental quando possível e observável. Deve usar versão/chave temporária ou estratégia equivalente para evitar artefato parcial, validar resultado antes da troca, invalidar somente cache afetado, registrar versão/origem e permitir reconstrução completa a partir do D1. Falha não altera a fonte de verdade e deve permitir retry seguro.

## 18. Renderer — `app/core/render.js`

O Renderer recebe template, layout, componentes e dados prontos; escapa conteúdo por contexto; compõe saída determinística; suporta estados de erro/vazio; e não consulta banco, chama módulo ou decide negócio.

Deve impedir injeção, separar conteúdo confiável de não confiável, produzir HTML acessível e testável, evitar estado global e manter compatibilidade com runtime Cloudflare. O caminho oficial é `render.js`, não `renderer.js`.

## 19. Helpers — `app/core/helpers.js`

Helpers são funções pequenas, puras e genéricas para datas, texto, números, URL, serialização e validações técnicas simples. Devem ter entrada/saída explícitas, ser determinísticos ou receber relógio/aleatoriedade como dependência, e não acessar bindings, rede, banco ou domínio.

Um helper usado uma única vez permanece no consumidor. Helpers não se tornam depósito de funções, não substituem módulo e não ocultam efeitos colaterais.

## 20. Pages Functions

Pages Functions são adaptadores finos. Elas recebem a requisição, fazem validação técnica básica, autenticam/autorizam, chamam Core/módulo, e devolvem resposta padronizada. Não contêm SQL, regra comercial, renderização extensa, integração complexa nem duplicação do módulo.

Middleware trata preocupações HTTP transversais. APIs delegam ao domínio. Webhooks validam protocolo/assinatura e delegam payload normalizado. Agendamentos disparam operações idempotentes. Cada Function preserva correlação, limita exposição de erro e opera apenas com bindings do ambiente.

## 21. Testabilidade, estado e mutabilidade

Serviços recebem dependências explicitamente e podem usar doubles sem runtime global. Relógio, IDs, rede e bindings devem ser controláveis. Testes cobrem sucesso, limites, falhas, autorização, concorrência e efeitos colaterais.

Estado compartilhado mutável é proibido. Configuração e identidade são imutáveis; estado de request não vaza para outra execução; caches em memória não são fonte de verdade; inicialização não pressupõe isolamento ou afinidade de instância do runtime Edge.

## 22. Idempotência e concorrência

Operações repetíveis devem declarar chave e janela de idempotência, resultado de repetição e persistência do marcador quando necessário. Isso é obrigatório para eventos, publicação, webhooks, jobs, uploads finais e pagamentos. Concorrência deve usar constraints, versões ou transações suportadas, nunca apenas memória local.

Retries são limitados, com backoff e classificação de erro. Operações não idempotentes não são repetidas automaticamente. Duplicatas são observáveis e não produzem efeito comercial duplicado.

## 23. Performance e compatibilidade Cloudflare

O Core deve evitar trabalho desnecessário, N+1, payloads grandes, serialização repetida e leituras públicas no D1. Deve usar streaming quando adequado, paginação limitada, cache derivado e publicação antecipada. Otimização exige medida; clareza e correção não são sacrificadas por micro-otimização.

Todo código deve usar APIs Web e ES Modules compatíveis com Cloudflare Pages/Workers. Não pode depender implicitamente de Node.js, filesystem local, processo persistente, memória entre requests ou bibliotecas incompatíveis. Bindings D1/KV/R2/Queue entram pelo contexto e são validados por ambiente.

## 24. Tratamento de falhas e segurança por padrão

Toda entrada é não confiável. O padrão é negar acesso, limitar exposição, sanitizar saída, validar formato/tamanho, parametrizar SQL, proteger headers e registrar somente diagnóstico seguro. Falhas conhecidas têm contrato; desconhecidas têm resposta genérica e correlação.

O sistema não deve falhar silenciosamente, capturar e ignorar, repetir indefinidamente, retornar stack trace, registrar segredo ou mascarar erro como sucesso. Degradação de cache pode ser tolerada; perda de persistência, autorização ou integridade bloqueia a operação.

## 25. Evolução, critérios de aceite e revisão

Mudança no Core deve justificar infraestrutura compartilhada, provar que não pertence a módulo/componente/Function, avaliar os 12 arquivos existentes antes de criar caminho, atualizar TREE/ROADMAP/CHANGELOG e incluir testes no lote. Novo serviço exige responsabilidade independente, múltiplos consumidores concretos, API definida e compatibilidade Cloudflare comprovada.

Um lote de Core é aceito quando:

- não contém domínio nem depende de módulos;
- expõe APIs pequenas e documentadas;
- D1/KV/R2 permanecem em seus papéis;
- erros, logs e autorização são seguros;
- eventos e efeitos repetidos são idempotentes;
- estado não vaza entre requests;
- funciona no runtime Cloudflare;
- testes do lote cobrem sucesso e falhas;
- observabilidade e performance possuem evidência;
- não há placeholder, TODO substitutivo ou arquivo antecipado.

Checklist de revisão por arquivo:

- [ ] responsabilidade única e caminho oficial;
- [ ] pertence ao lote atual e não antecipa lote futuro;
- [ ] nenhuma regra/SQL de domínio no Core;
- [ ] entradas, saídas e erros documentados;
- [ ] menor privilégio e segredo protegido;
- [ ] efeitos colaterais e idempotência claros;
- [ ] dependências injetáveis e estado controlado;
- [ ] testes adequados e regressões verdes;
- [ ] compatibilidade e limites Cloudflare verificados;
- [ ] logs/metricas correlacionáveis;
- [ ] documentação estrutural sincronizada.

A revisão e o commit ocorrem por lote funcional. Este checklist preserva responsabilidade individual, mas não recria autorização arquivo a arquivo.
