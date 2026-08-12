ACTS Portal

OPERATIONS

Versão: 1.0Status: Oficial

1. Objetivo

Este documento define os procedimentos operacionais oficiais do Portal ACTS.

Seu objetivo é garantir disponibilidade, estabilidade, rastreabilidade e rápidaresposta a incidentes.

2. Princípios

Operação contínua.

Automação sempre que possível.

Observabilidade por padrão.

Recuperação rápida.

Melhoria contínua.

3. Monitoramento

Monitorar continuamente:

disponibilidade;

latência;

erros;

filas;

cache;

banco de dados;

consumo de recursos.

4. Incidentes

Todo incidente deve possuir:

identificação;

classificação;

prioridade;

responsável;

plano de ação;

registro de encerramento.

5. Backup e recuperação

Os procedimentos devem prever:

backup de dados críticos;

testes periódicos de restauração;

documentação do processo de recuperação.

6. Operação diária

Verificar regularmente:

filas;

publicações;

jobs agendados;

integridade dos artefatos;

métricas da plataforma.

7. Manutenção

Manutenções devem ser:

planejadas;

documentadas;

comunicadas;

reversíveis quando possível.

8. Observabilidade

Correlacionar:

requestId;

correlationId;

logs;

métricas;

eventos.

9. Segurança operacional

Revisar periodicamente:

acessos;

permissões;

segredos;

auditorias;

alertas.

10. Capacidade

Monitorar crescimento de:

armazenamento;

tráfego;

filas;

banco;

cache.

Planejar expansão antes da saturação.

11. Checklist operacional

Monitoramento ativo.

Alertas configurados.

Backups validados.

Filas saudáveis.

Logs íntegros.

Dashboards atualizados.

Antes do aceite final do Lote 18 também devem estar comprovados: runbooks de deploy, rollback e incidente; responsáveis e canais de escalonamento; alertas com limiares; correlação por `requestId`/`correlationId`; restauração testada; e monitoramento capaz de detectar consulta pública direta ao D1.

Após cada lote implantável, a observabilidade e os runbooks afetados acompanham a mesma PR. O Lote 18 valida o conjunto e não posterga requisitos operacionais conhecidos dos lotes anteriores.

12. Regra final

A operação do Portal ACTS deve ser continuamente monitorada, documentada eorientada por processos padronizados para garantir alta disponibilidade econfiabilidade.

---

## HISTÓRICO — Arquitetura 2.0 (substituída pela Arquitetura 3.0)

> **Estado:** registro histórico do estado então aprovado em 2026-08-04. Esta seção não é normativa para o estado alvo; em conflito, prevalecem `CONSTITUTION.md`, `ARCHITECTURE.md` (Arquitetura 3.0) e os contratos específicos mais recentes.

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
### Painel, lote explícito e progresso

O painel mantém alterações pendentes preferencialmente em IndexedDB. O rascunho sobrevive quando possível a reload/fechamento, mas não é fonte de verdade, autorização nem substituto de validação. O fluxo é `editar localmente → acumular → revisar pacote → Enviar alterações → backend validar e persistir lote`. A interface mostra contagem, resumo, botão explícito, processamento e resultado.

Decisão inicial: **até cinco envios de alterações por usuário por dia**, configurável e contado por ciclo explícito, não por item. Falha técnica após persistência confirmada não consome novo envio. A implementação definirá timezone, administradores, exceções, reset, auditoria e proteção contra repetição. Cada pacote preserva autenticação, autorização, propriedade, plano, domínio, concorrência/versão, transações e idempotência.

Progresso usa fatos do cliente ou estados confirmados pelo backend: preparando, validando, enviando, persistindo, alterações salvas, aguardando agregação, compilando, publicando, concluído, falha recuperável ou falha definitiva. Sem progresso numérico real, exibem-se etapas, nunca percentuais inventados.


## Runbook autorizado — backfill de cidades do Lote 13 (2026-08-06)

O caminho oficial implementado é `[E] scripts/backfill-cities.js`, responsabilidade JavaScript operacional distinta; seu teste é `[E] tests/operations/city-backfill.test.js`. Não é Core, módulo de publicação, `Seo.js` ou migration. O executor recebe ambiente em allowlist e o binding D1 pelo Wrangler, rejeita produção no 13B, usa apenas statements parametrizados e a função canônica pública de `Listings.js`, e nunca contém credenciais.

### Execução e retomada

1. Congelar escritas de localização e publicação; confirmar que catálogo/manifest anterior segue ativo. Fazer backup D1 identificado pelo commit, ambiente e timestamp e provar restore.
2. Em staging representativo, aplicar a `0003`, executar em modo de análise, resolver ambiguidades por mapeamento revisado e versionado fora de PII, e processar lotes limitados. Cada lote registra métricas técnicas; retry relê pendentes e reutiliza `canonical_key`, portanto é idempotente e retomável sem checkpoint persistido.
3. Falha ou ambiguidade interrompe antes do item, registra somente contagens, códigos e identificadores técnicos, nunca nomes/endereço/PII, e deixa pendentes bloqueando publicação. A resolução exige decisão humana explícita no mapeamento de entrada; jamais escolha silenciosa.
4. Reexecutar até uma execução completa sem mutações; gerar relatório assinado com commit, ambiente, versão Unicode/contrato, início/fim, totais lidos/criados/reutilizados/atualizados/pendentes/ambíguos/falhos, checks de integridade e hash do relatório, sem PII.
5. Produção permanece fora do 13B e exige decisão operacional futura própria. Somente com relatório de staging e checklist aprovados considerar o gate do `0004`; 13D/publicação vem depois.

### Rollback por fase

- **Expansão:** antes de backfill, restaurar o backup ou aplicar reversão previamente ensaiada que remova somente estruturas novas; nunca editar `0001`. Se já houver cidades/FKs preenchidas, preferir manter a expansão inerte e restaurar backup para desfazer.
- **Backfill:** falha é retomada pelo estado canônico `listings.city_id IS NULL`; correção de ambiguidade entra como input revisado. Antes da contração, pode-se restaurar o backup integral; catálogo/manifest público não mudou.
- **Contração:** não iniciar sem gate e backup. Depois que `city_id` for adotado, rollback destrutivo sem backup é impossível e proibido; restaurar o backup e o binário/schema anteriores como unidade. Em toda a evolução, preservar catálogo e manifest anteriores até publicação final confirmada.

## Gate operacional após o Lote 13A

A expansão não autoriza backfill. Antes do 13B devem ser aprovadas implementação compartilhada `unicode-17.0.0-v1`, fonte/tabela C+F 17.0.0 após auditorias de licença, tamanho e Workers/Node, e vetores do DB. Staging D1 representativo, backup e restore são obrigatórios; SQLite local prova somente compatibilidade SQLite.

## Contrato executável do Lote 13B — decisão documental (2026-08-06)

O contrato foi implementado no 13B. A evidência local não substitui staging: dry-run remoto, backup/restore e execução real controlada continuam pendentes. 13C, 13D e 14 continuam bloqueados.

### Binding D1 pelo Wrangler

O futuro executor é um processo Node e importa `getPlatformProxy` da API oficial do Wrangler fixado pelo projeto. Ele não roda dentro de Worker. O contrato é:

```js
const platform = await getPlatformProxy({
  configPath: 'wrangler.toml',
  environment,
  remoteBindings: mode === 'remote'
});
const db = platform.env.ACTS_DB;
```

O executor sempre encerra a sessão com `await platform.dispose()`, inclusive após falha. `ACTS_DB` é o único binding D1 autorizado e `wrangler.toml`, na raiz, é o único caminho de configuração. Binding, caminho, database ID, account ID e token não são opções de usuário. O executor não lê `process.env` diretamente: autenticação e configuração seguem o comportamento normal do Wrangler, sem credencial em argumento ou log.

`getPlatformProxy()` não cria endpoint HTTP, Pages Function, Worker novo ou REST API própria. Statements D1 usam `prepare().bind()`. Local e remoto são modos distintos. `remoteBindings: true` habilita o suporte do proxy, mas somente seleciona o D1 real quando o binding `ACTS_DB` do ambiente também possui `remote = true`. A versão instalada deve comprovar suporte real antes de staging e nenhuma alternativa silenciosa por REST, endpoint, Worker, subprocesso com SQL interpolado ou produção é permitida.

O proxy é uma API Node best-effort fora do runtime Worker. `remote = true` provoca operações no recurso Cloudflare real identificado pelo binding, portanto staging deve ser fisicamente distinto de production. Qualquer incompatibilidade entre proxy, versão, autenticação ou configuração interrompe a execução.

### Opções e comandos oficiais futuros

Ambientes em allowlist: `development` somente com `local` e binding sem `remote = true`; `staging` com `remote` e `ACTS_DB` marcado `remote = true`. `production` é sempre rejeitado no 13B. Ausência de modo, opção desconhecida ou combinação fora da allowlist falha antes de abrir o proxy. O executor também falha se development estiver remoto, staging não estiver remoto ou os `database_id` de staging e production forem iguais. Dry-run é o padrão; escrita exige `--execute`; `--dry-run` e `--execute` são mutuamente exclusivos.

```text
npm run city:backfill -- --environment development --mode local --dry-run
npm run city:backfill -- --environment development --mode local --execute
npm run city:backfill -- --environment staging --mode remote --dry-run
npm run city:backfill -- --environment staging --mode remote --execute
```

Esses comandos são conceituais até a implementação sincronizar `package.json`; esta decisão não altera configuração. Nenhuma credencial aparece no comando ou relatório.

### Retomada derivada e varreduras

A garantia durável é **`listings.city_id` persistido no D1**, não um cursor separado. Não existe checkpoint persistido. A seleção usa colunas explícitas e paginação keyset:

```sql
SELECT colunas_explicitas
FROM listings
WHERE city_id IS NULL AND id > ?
ORDER BY id ASC
LIMIT ?
```

`OFFSET` é proibido. O cursor existe apenas em memória durante uma passagem, não é garantia durável e o relatório não é checkpoint. Após falha, a próxima execução começa pelo menor ID ainda com `city_id IS NULL`; vinculadas ficam fora da seleção. Não se cria tabela, KV, R2 ou arquivo local, e memória não é persistência de garantia.

Ao fim de cada passagem, uma nova consulta começa do início. A execução só conclui sem elegíveis; um limite máximo de passagens impede atividade infinita. Se novas pendências continuarem surgindo, termina como `incomplete`, nunca como concluída com `city_id NULL`. Isso cobre IDs concorrentes inseridos abaixo do cursor.

### Unidade concorrente e fail-closed

Para cada listing: selecionar pendente; reler por ID; canonicalizar; localizar ou criar cidade; validar identidade, `canonical_key`, slug e versão; garantir o estado inicial em `city_publication_state`; executar `UPDATE listings SET city_id = ? WHERE id = ? AND city_id IS NULL`; verificar `success` e `changes`; e, se zero, reler. Só converge quando o vínculo é a cidade esperada; vínculo diferente é conflito fail-closed.

Criação concorrente de cidade converge pelas constraints `UNIQUE`, seguida obrigatoriamente de releitura e validação integral. Não se presume atomicidade entre múltiplas chamadas. `D1Database.batch()` somente pode ser usado conforme o contrato real e cada resultado deve ter `success` e `meta.changes` conferidos. Retry relê e valida, e execução repetida converge.

### Novas escritas e relatório

No 13B, `Listings.js` resolve e persiste `city_id` em criação e mudança de localização, mantém os textos durante a transição, rejeita `cityId` do cliente e compartilha sua única função canônica pública com o executor. Nenhuma publicação é solicitada. Escritas concorrentes anteriores à ativação seguem elegíveis por `city_id IS NULL`.

O relatório é evidência, não checkpoint. Pode conter somente `runId` efêmero, modo, ambiente allowlist, versão canônica, passagens, lotes, analisadas, vinculadas, cidades criadas/reutilizadas, retries, conflitos, rejeições, pendentes finais, status e duração. Não contém localização textual, nome de cidade, conteúdo de listing ou PII.

### Gate de staging

Antes do primeiro `--execute` remoto: confirmar versão instalada do Wrangler e suporte a `getPlatformProxy`, `remoteBindings` e `remote = true`; confirmar que staging aponta para D1 distinto de production; criar backup restaurável e validar restore; executar dry-run e revisar métricas; executar lote mínimo e repeti-lo; provar idempotência e ausência de publicação; executar `PRAGMA foreign_key_check`; e contar `city_id NULL`. SQLite local não substitui D1 staging. Se proxy remoto não funcionar com a versão/configuração reais, interromper. Produção permanece proibida.

### Estado atual e alteração de configuração futura

O binding `ACTS_DB` de staging possui `remote = true`; development permanece local, staging e production possuem identificadores distintos e production permanece não selecionável pelo executor. A execução real de staging não foi feita nesta entrega e continua pendente.

Todos os bindings D1, inclusive o binding raiz e as repetições de development, staging e production, declaram `migrations_dir = "database/migrations"`. Wrangler 4.118.0 resolve esse caminho relativamente ao `wrangler.toml`; por isso `npm run db:migrate:local` encontra exatamente `0001`, `0002` e `0003`. A ausência anterior da propriedade fazia o Wrangler procurar o default `migrations/`, que não pertence à árvore oficial. As migrations não são movidas nem duplicadas.

## Operação alvo — ACTS versus Blogger

Operações ACTS cobrem D1, publicação imutável em R2, Edge Cache, Queue/Cron legítimos, pagamentos, moderação, suspensão, downgrade, rollback e reconciliação. Não existe runbook de sync/import de posts Blogger: conta Google, blog, posts e mídia editorial são da anunciante e permanecem na origem. A futura observabilidade pode registrar, com privacidade e sem conteúdo editorial, falhas client-side agregadas de CORS, timeout, parsing e renderização; isso não autoriza proxy. Falha no gate 13F.4 exige parar e obter nova decisão arquitetural.
