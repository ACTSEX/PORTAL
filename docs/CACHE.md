CTS Portal

CACHE

Versão: 1.0Status: OficialEscopo: app/core/cache.js

1. Objetivo

O Cache é responsável por acelerar o acesso aos artefatos publicados sem alterara fonte oficial dos dados.

D1 permanece sendo a única fonte de verdade.

2. Princípios

Cache nunca é fonte oficial.

Pode ser descartado e reconstruído.

Deve ser transparente para os módulos.

Deve ser invalidado de forma controlada.

3. Camadas de cache

D1
 ↓
Publisher
 ↓
R2 (artefatos versionados)
 ↓
Cloudflare Cache API
 ↓
Visitante

4. Responsabilidades

O Cache pode:

armazenar respostas públicas;

armazenar HTML publicado;

armazenar JSON publicados;

armazenar metadados técnicos;

invalidar conteúdos.

O Cache não pode:

armazenar dados oficiais;

substituir D1;

conter regras de negócio.

5. Estratégia

Sempre que possível:

salvar alteração no D1;

publicar artefato;

atualizar KV;

invalidar Cache API;

servir nova versão.

6. Tipos de cache

Cache API

respostas HTTP;

HTML;

JSON.

KV

artefatos publicados;

índices;

manifestos;

páginas estáticas.

7. TTL

Cada tipo de artefato pode possuir TTL próprio.

Exemplos:

HTML publicado;

JSON por cidade;

sitemap;

feeds.

TTL deve ser configurável.

8. Invalidação

Preferir invalidação seletiva.

Exemplos:

anúncio atualizado;

cidade afetada;

categoria afetada;

sitemap parcial.

Evitar limpeza global.

9. Chaves

As chaves devem ser previsíveis.

Exemplos:

listing:123
city:londrina
category:casas
sitemap:index

10. Publicação

A invalidação deve ocorrer após a publicação bem-sucedida.

Nunca invalidar antes da existência da nova versão.

11. Observabilidade

Registrar:

cache hit;

cache miss;

invalidações;

tempo de resposta;

TTL utilizado.

12. Segurança

Não armazenar:

sessões;

tokens;

segredos;

credenciais.

13. Compatibilidade

Compatível com:

Cloudflare Cache API;

KV;

Pages Functions.

14. Testes

Cobrir:

hit;

miss;

invalidação;

expiração;

reconstrução.

15. Critérios de aceitação

D1 continua sendo a fonte oficial;

invalidação seletiva;

sem regras de negócio;

compatível com Cloudflare;

testável.

16. Regra final

O objetivo do Cache é reduzir latência e custo operacional sem comprometer aconsistência dos dados.

Sempre que houver divergência entre Cache e D1, prevalece o conteúdo do D1.

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
