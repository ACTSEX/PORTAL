ACTS Portal

DEPLOYMENT

Versão: 1.0Status: Oficial

1. Objetivo

Este documento define o processo oficial de implantação (Deployment) do PortalACTS.

Todo deploy deve ser previsível, reproduzível, seguro e passível de rollback.

2. Ambientes

Ambientes suportados:

development

staging

production

Cada ambiente deve possuir configurações, bindings e dados apropriados.

3. Pipeline

Fluxo oficial:

Commit
  ↓
CI
  ↓
Testes
  ↓
Build
  ↓
Deploy
  ↓
Validação
  ↓
Monitoramento

Nenhum deploy deve ignorar etapas obrigatórias.

O pipeline é promovido por lote funcional. Cada PR contém uma única fronteira, seus testes e no máximo os limites de revisão definidos no `ROADMAP.md`. O lote seguinte somente parte da `main` depois do merge aprovado do anterior.

4. Cloudflare

O processo de implantação deve considerar:

Pages;

Pages Functions;

D1;

KV;

R2;

Queues;

Cache.

5. Migrações

Toda alteração de banco deve:

possuir migration;

ser versionada;

ser reversível quando possível.

6. Publicação

Após alterações aprovadas:

atualizar artefatos;

publicar artefatos públicos versionados no R2;

invalidar cache afetado.

7. Rollback

Todo deploy deve possuir estratégia documentada de rollback.

Sempre preservar integridade dos dados.

Antes do aceite do Lote 18, o rollback deve ser ensaiado em staging, incluindo versão anterior da aplicação, artefatos publicados, invalidação de cache e restauração verificada quando uma migration não puder ser revertida com segurança.

8. Checklist

Antes do deploy verificar:

testes aprovados;

documentação atualizada;

migrations revisadas;

feature flags;

monitoramento configurado.

9. Pós-deploy

Monitorar:

erros;

performance;

filas;

cache;

disponibilidade.

O deploy final é incremental: validar migrations, publicar em staging, executar smoke e segurança, promover de forma gradual, observar métricas e interromper ou reverter ao ultrapassar os limiares aprovados. A evidência integra o aceite final do Lote 18.

10. Regra final

Nenhuma implantação do Portal ACTS deve ocorrer sem validação automatizada,procedimento de rollback e monitoramento pós-deploy.

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
- Alterações marcam cidades afetadas. Uma janela curta, configurável e limitada agrega eventos da mesma cidade, preserva idempotência e trata chegadas durante compilação; não pode adiar indefinidamente. Só cidades afetadas são recompiladas e mudanças convergem quando possível. Cron é complementar para reconciliação, recuperação, manutenção, limpeza, auditoria e tarefas periódicas, nunca caminho obrigatório de cada alteração.
- Falha de publicação não reverte o negócio confirmado: D1 permanece verdadeiro. Publicação é repetível/idempotente, suporta republicação e retenção temporária de versões para rollback; falha em R2 não aponta manifest a arquivo parcial.
- O navegador prioriza cache HTTP, memória, Cache Storage quando necessário, IndexedDB para persistência estruturada e `localStorage` somente para pequenos metadados/preferências. A JSON completa não tem `localStorage` como armazenamento principal.
- Catálogos contêm somente projeções públicas aprovadas: sem e-mail privado, dados administrativos, tokens, pagamentos, endereço privado não autorizado ou coordenada precisa proibida.
