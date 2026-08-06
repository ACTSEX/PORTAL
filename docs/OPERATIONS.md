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
### Painel, lote explícito e progresso

O painel mantém alterações pendentes preferencialmente em IndexedDB. O rascunho sobrevive quando possível a reload/fechamento, mas não é fonte de verdade, autorização nem substituto de validação. O fluxo é `editar localmente → acumular → revisar pacote → Enviar alterações → backend validar e persistir lote`. A interface mostra contagem, resumo, botão explícito, processamento e resultado.

Decisão inicial: **até cinco envios de alterações por usuário por dia**, configurável e contado por ciclo explícito, não por item. Falha técnica após persistência confirmada não consome novo envio. A implementação definirá timezone, administradores, exceções, reset, auditoria e proteção contra repetição. Cada pacote preserva autenticação, autorização, propriedade, plano, domínio, concorrência/versão, transações e idempotência.

Progresso usa fatos do cliente ou estados confirmados pelo backend: preparando, validando, enviando, persistindo, alterações salvas, aguardando agregação, compilando, publicando, concluído, falha recuperável ou falha definitiva. Sem progresso numérico real, exibem-se etapas, nunca percentuais inventados.


## Runbook autorizado — backfill de cidades do Lote 13 (2026-08-06)

O único caminho oficial futuro é `[P] scripts/backfill-cities.js`, responsabilidade JavaScript operacional distinta; seu teste é `[P] tests/operations/city-backfill.test.js`. Não é Core, módulo de publicação, `Seo.js` ou migration. O executor recebe explicitamente ambiente e binding D1, recusa produção sem confirmação operacional, usa apenas statements parametrizados e a função canônica pública de `Listings.js`, e nunca contém credenciais.

### Execução e retomada

1. Congelar escritas de localização e publicação; confirmar que catálogo/manifest anterior segue ativo. Fazer backup D1 identificado pelo commit, ambiente e timestamp e provar restore.
2. Em staging representativo, aplicar a `0003`, executar em modo de análise, resolver ambiguidades por mapeamento revisado e versionado fora de PII, e processar lotes limitados. Cada lote confirma seu checkpoint técnico (último ID/chave, versão do contrato e métricas); retry relê pendentes e reutiliza `canonical_key`, portanto é idempotente e retomável.
3. Falha ou ambiguidade interrompe antes do item, registra somente contagens, códigos e identificadores técnicos, nunca nomes/endereço/PII, e deixa pendentes bloqueando publicação. A resolução exige decisão humana explícita no mapeamento de entrada; jamais escolha silenciosa.
4. Reexecutar até uma execução completa sem mutações; gerar relatório assinado com commit, ambiente, versão Unicode/contrato, início/fim, totais lidos/criados/reutilizados/atualizados/pendentes/ambíguos/falhos, checks de integridade e hash do relatório, sem PII.
5. Repetir em produção na mesma ordem, janela aprovada e backup restaurável. Somente com relatório e checklist aprovados aplicar `0004`; 13D/publicação vem depois.

### Rollback por fase

- **Expansão:** antes de backfill, restaurar o backup ou aplicar reversão previamente ensaiada que remova somente estruturas novas; nunca editar `0001`. Se já houver cidades/FKs preenchidas, preferir manter a expansão inerte e restaurar backup para desfazer.
- **Backfill:** falha é retomada pelo checkpoint; correção de ambiguidade entra como input revisado. Antes da contração, pode-se restaurar o backup integral; catálogo/manifest público não mudou.
- **Contração:** não iniciar sem gate e backup. Depois que `city_id` for adotado, rollback destrutivo sem backup é impossível e proibido; restaurar o backup e o binário/schema anteriores como unidade. Em toda a evolução, preservar catálogo e manifest anteriores até publicação final confirmada.

## Gate operacional após o Lote 13A

A expansão não autoriza backfill. Antes do 13B devem ser aprovadas implementação compartilhada `unicode-17.0.0-v1`, fonte/tabela C+F 17.0.0 após auditorias de licença, tamanho e Workers/Node, e vetores do DB. Staging D1 representativo, backup e restore são obrigatórios; SQLite local prova somente compatibilidade SQLite.
