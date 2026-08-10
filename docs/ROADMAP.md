# ACTS Portal — Plano mestre de implantação

**Versão:** 2.0
**Status:** Oficial
**Arquitetura de referência:** Etapa 2/7, formalizada em 2026-08-10
**Unidade de avanço:** lote funcional

## 1. Governança e leitura de estado

Este ROADMAP reorganiza o plano de implementação sem reconstruir o projeto. Os Lotes 1–13B mantêm sua numeração e seu histórico técnico. Uma fundação preservada não é considerada errada: ela pode estar concluída e ainda exigir uma adequação posterior, explicitamente planejada, para o produto oficial.

Legenda:

- ✅ **concluído:** implementação e testes locais documentados e mergeados;
- 🟡 **implementado tecnicamente, gate pendente:** o código existe, mas falta evidência operacional exigida;
- 🔧 **preservado com adequação futura:** fundação válida; mudança de produto será feita em lote novo;
- ⛔ **bloqueado:** não pode começar antes das dependências e decisões indicadas;
- ⬜ **não iniciado:** entrega futura autorizada apenas quando desbloqueada.

Um lote só começa após o anterior aplicável estar implementado, testado, revisado, aprovado e mergeado na `main`. Nenhuma linha deste documento inicia automaticamente um lote, autoriza deploy ou dispensa PR. Limite inicial recomendado: uma fronteira funcional, até 20 arquivos e aproximadamente 2.000 linhas líquidas; dividir somente quando a revisão deixar de ser segura.

São proibidos placeholders, antecipação de lote, regra de negócio no Core, regra comercial em Functions e consulta pública normal ao D1. Testes funcionais acompanham cada lote; o Lote 18 valida transversalmente o sistema completo.

**DoD comum:** arquivos completos; testes próprios aprovados; documentação e contratos coerentes; segurança e rollback avaliados; nenhuma decisão pendente escondida; PR aprovada e mergeada na `main`; gates específicos comprovados.

## 2. Arquitetura de produto que governa os lotes futuros

As entregas abaixo obedecem simultaneamente a estas decisões, que não podem ser revertidas por implementação incidental:

1. existem apenas os planos estruturais `STANDARD` e `PREMIUM`; `FREE` não é plano;
2. trial, cortesia, promoção e gratuidade são **condições comerciais** independentes;
3. PREMIUM habilita minisite em `{slug}.acompanhantesex.com`, integração Blogger client-side e direito de comprar impulsionamentos separados; não inclui impulsionamento;
4. downgrade PREMIUM → STANDARD é reversível e preserva conta, anúncio, perfil, configurações e Blogger externo;
5. cada anunciante tem uma pequena JSON pública ACTS individual; o catálogo municipal é somente índice leve para cards e descoberta;
6. Blogger é consultado diretamente pelo navegador e permanece fora de backend, Publisher, D1, R2, KV, Queue e Cron;
7. navegação pública normal usa Edge/R2 e não consulta D1, KV, Worker ou Pages Function.

Schemas exatos, preços e demais decisões ainda abertas não são definidos por este ROADMAP.

## 3. Matriz executiva

| Lote | Estado | Fronteira | Depende de | Desbloqueia |
|---|---|---|---|---|
| 1–6 | ✅ preservar | raiz/Cloudflare, Core, eventos, segurança, render e banco base | histórico | 7 |
| 7 | ✅ 🔧 | identidade e assinaturas; adequar em 13E | 6 | 8 |
| 8 | ✅ 🔧 | catálogo e mídia; adequar em 13E/13F | 7 | 9 |
| 9 | ✅ 🔧 | descoberta; adequar ao catálogo leve em 13F | 8 | 9A |
| 9A | ✅ preservar | infraestrutura técnica de publicação | 9 | 10 |
| 10 | ✅ preservar | relacionamento | 9A | 11 |
| 11 | ✅ 🔧 | Asaas, pagamentos e integrações; ampliar em 13G | 10 | 12 |
| 12 | ✅ preservar | gestão | 11 | 13A |
| 13A | ✅ preservar | expansão segura de cidade | 12 | 13B |
| 13B | 🟡 gate remoto | canonicalização e backfill técnico | 13A | 13C somente após gate |
| 13C | ⛔ | validação e contração compatível com domínio ACTS | gate 13B | 13E |
| 13E | ⛔ | produto, planos, condição comercial e domínio do anúncio | 13C + decisões próprias | 13F |
| 13F | ⛔ | JSON individual, catálogo leve, minisite e prova Blogger | 13E | 13G |
| 13G | ⛔ | impulsionamentos e adequação financeira | 13F + decisão de downgrade | 13D |
| 13D | ⛔ | publicação ACTS e SEO finais | 13E–13G + gates SEO | 14A |
| 14A–14B | ⛔ | componentes básicos e compostos | 13D | 15 |
| 15 | ⛔ | layouts e templates | 14B | 16A |
| 16A–16B | ⛔ | APIs ACTS, painel, administração e jobs ACTS | 15 | 17 |
| 17 | ⛔ | frontend público estático e Blogger client-side | 16B | 18 |
| 18 | ⛔ | aceite transversal, staging e produção | 17 | produção aceita |

> A ordem intencional do bloco 13 é `13C → 13E → 13F → 13G → 13D`. O identificador 13D é preservado por continuidade histórica, mas sua antiga implementação de Publish/SEO fica adiada até a adequação de produto. Não existe Lote 13D pronto.

## 4. Histórico preservado — Lotes 1 a 12

### Lotes 1–6 — preservar sem refazer

- **Lote 1:** raiz, toolchain e ambientes Cloudflare.
- **Lote 2:** configuração, helpers e observabilidade do Core.
- **Lote 3:** Event Bus e primitivas técnicas de D1/cache/R2.
- **Lote 4:** autenticação/autorização técnica e roteamento.
- **Lote 5:** renderização, pipeline genérico de publicação e composição.
- **Lote 6:** schema e contratos iniciais.

Essas fundações permanecem válidas. O pipeline técnico do Lote 5 não equivale ao Publisher final do produto.

### Lotes 7–9 — preservar e adequar, sem apagar histórico

- **Lote 7 — identidade/assinaturas:** `Auth.js`, `Users.js`, `Imobiliaristas.js`, `Plans.js`, `Subscriptions.js` e testes estão implementados. Os conceitos de plano, perfil e assinatura serão adequados no 13E; o legado imobiliário não é removido de forma oportunista.
- **Lote 8 — catálogo/mídia:** categorias, Listings, mídia e upload são fundações válidas. O domínio comercial do anúncio será remodelado no 13E e a projeção pública será separada no 13F.
- **Lote 9 — descoberta:** busca, geolocalização, mapas, favoritos e comparação permanecem. O consumo do novo índice municipal leve será adequado no 13F e no frontend.

### Lote 9A — preservar sem refazer

A infraestrutura técnica já cobre Queue, deduplicação, projeção allowlist, objetos versionados, confirmação antes do manifest, idempotência e rollback. Ela não é produção: runtime real, reconciliação, Cache Rules, staging e projeções finais continuam nos lotes 13D, 16B e 18. O conceito antigo de cidade como JSON completa não governa as novas projeções.

### Lotes 10 e 12 — preservar sem refazer

- **Lote 10:** relacionamento implementado, mantendo contatos, leads e notificações privados e avaliações moderadas.
- **Lote 12:** Dashboard, Analytics e Reports privados implementados com RBAC, limites e exportação segura.

### Lote 11 — preservar e adequar

O gateway único Asaas, a reserva idempotente, ordenação de webhook, timeout recuperável e D1 como fonte financeira são preservados. O 13G ampliará o domínio para assinatura e compra avulsa de impulsionamento, sem reimplementar ou substituir o gateway. Provas D1 reais e recuperação de reserva abandonada continuam obrigatórias antes da exposição financeira.

## 5. Cidade canônica — Lotes 13A a 13C

### 13A — expansão do schema ✅

Implementado em 2026-08-06: `cities`, `city_publication_state` e `listings.city_id` temporariamente anulável, preservando o contrato anterior. Não fez backfill, contração ou publicação. Não deve ser refeito pela nova arquitetura.

### 13B — canonicalização e backfill 🟡

**Estado:** implementação técnica local concluída; aceite operacional ainda pendente.

- executor JavaScript parametrizado via `getPlatformProxy()`/`ACTS_DB`;
- paginação keyset, retomada por `city_id IS NULL`, concorrência fail-closed, relatórios sem PII e segunda execução idempotente;
- testes SQLite e D1 local existentes;
- **gate pendente:** D1 remoto de staging representativo, backup, execução, relatório de zero pendências/ambiguidades, segunda execução sem mutação e restore comprovado.

Sem essa evidência, 13B não está operacionalmente concluído e 13C permanece bloqueado. A nova arquitetura não autoriza refazer canonicalização ou backfill.

### 13C — validação e contração ⛔

Finalidade preservada: validar nulos, órfãos, ambiguidades, unicidade, FKs, contagens e inventário; depois impor `city_id NOT NULL` com backup/rollback, equivalência snapshot/evolução e staging.

Antes de implementar, o inventário e a reconstrução de `listings` devem ser compatíveis com o domínio final do anúncio ACTS planejado no 13E. A contração não pode cristalizar como produto final venda, aluguel, preço/endereço imobiliário ou profissional imobiliário. Não editar migrations antigas; evolução será forward-only e controlada.

**Gate:** 13B aceito remotamente + contrato de compatibilidade 13C/13E revisado. Desbloqueia somente 13E.

## 6. Bloco bloqueante de adequação da nova arquitetura

### LOTE 13E — Produto, planos e domínio comercial ⛔

**Objetivo:** adequar as fundações válidas dos Lotes 7 e 8 ao produto oficial antes de qualquer Publisher/SEO ou frontend final.

#### 13E.1 — Planos, condição comercial e entitlements

- adequar `Plans.js`, `Subscriptions.js`, contratos/schemas, testes e, em implementação futura própria, banco/snapshot/migration necessários;
- permitir somente `STANDARD` e `PREMIUM`; rejeitar `FREE` como plano;
- representar trial, cortesia, promoção e gratuidade fora da identidade do plano;
- definir entitlements para anúncio, mídias oficiais, minisite, subdomínio, apresentação Blogger e elegibilidade de nova compra de boost;
- definir preço/versionamento, inadimplência/tolerância e efeitos de condição comercial antes de persistir o modelo.

#### 13E.2 — Upgrade, downgrade e reativação

Testar explicitamente:

- PREMIUM → STANDARD preserva conta, card/anúncio, perfil, contatos, dados, mídias permitidas, configuração de minisite, configuração Blogger e Blogger externo;
- desativa minisite, publicação do subdomínio, apresentação Blogger dentro do ACTS e novas compras de impulsionamento;
- invalida publicação/cache ACTS para não manter entitlement removido;
- STANDARD → PREMIUM reativa configurações preservadas sem reconstruir patrimônio editorial;
- gratuidade continua uma condição, sem terceiro plano.

#### 13E.3 — Domínio final do anúncio

Remodelar de forma faseada os conceitos imobiliários legados — venda, aluguel, preço/endereço de imóvel e profissional imobiliário — para o domínio comercial final ACTS. Preservar `city_id`, owner, categorias, status, mídia, slug, segurança e eventos úteis. Migrations antigas permanecem imutáveis e código legado só é removido após migração, compatibilidade, testes e rollback próprios.

Inclui perfil comercial e somente configurações ACTS de minisite e Blogger (identificador/URL, habilitação e opções), nunca conteúdo editorial.

**Decisões/gates antes do DoD:** cardinalidade conta/anúncio/minisite; taxonomia e campos comerciais; limites de mídia; preço/versionamento dos planos; inadimplência; contrato de condição comercial; inventário legado e estratégia de migração.

### LOTE 13F — Estado público individual, catálogo, minisite e Blogger ⛔

**Dependência:** 13E concluído. O lote pode ser revisado em PRs coesas, mas sua ordem interna é obrigatória.

#### 13F.1 — JSON pública individual

Entregar o princípio `1 anunciante → 1 pequena JSON pública ACTS`, incluindo contrato e versionamento, projeção allowlist, Publisher, invalidação, relação com catálogo municipal, testes, privacidade e rollback. O schema exato será decidido no lote, não neste ROADMAP. Mudança exclusivamente editorial no Blogger não regenera essa JSON.

#### 13F.2 — catálogo municipal leve

Substituir a premissa histórica `cidade = JSON completa` por `cidade = índice leve de descoberta`. O catálogo serve cards, filtros, ordenação, identificação e localização da JSON individual; o estado público completo permitido vem da JSON individual. Medir tamanho, cache, integridade, paginação/chunking se comprovadamente necessária e ausência de PII/duplicação.

#### 13F.3 — minisite PREMIUM e wildcard

Definir e testar `{slug}.acompanhantesex.com`, dependendo de entitlements, JSON individual, resolução segura e inequívoca do slug, publicação/manifest e infraestrutura wildcard Cloudflare validada. Downgrade deve retirar a apresentação e invalidar cache sem apagar configuração. STANDARD nunca recebe minisite.

#### 13F.4 — gate técnico Blogger em navegador real

Antes da experiência editorial completa, comprovar em navegador real: endpoint escolhido, CORS, blogs reais, conteúdo adulto, labels, paginação, imagens, vídeos, timeout e CSP. Registrar matriz de browsers, evidências e privacidade.

**Falha do gate:** parar. Não criar proxy, sincronização ou fallback backend; abrir nova decisão arquitetural.

#### 13F.5 — integração editorial client-side

Somente após o gate, planejar frontend para fetch direto, timeout, parsing, sanitização, normalização, allowlist, URLs/providers seguros, lazy loading, paginação, fotos, vídeos, labels, loading/erro/fallback, retry limitado, CSP, XSS, iframe sandbox e privacidade.

É proibido criar backend sync, Worker proxy, endpoint ACTS de feed, D1/R2/KV de posts, Queue Blogger ou Cron Blogger. O Blogger não entra no Publisher e sua indisponibilidade não derruba perfil, contatos, mídias oficiais ou informações comerciais do minisite.

**Decisões/gates:** schema/versionamento da JSON; campos do índice leve; manifest individual; wildcard; endpoint/CORS/paginação Blogger; providers; limites; privacidade; aprovação da prova técnica.

### LOTE 13G — Impulsionamentos e adequação financeira ⛔

**Objetivo:** adicionar produto comercial separado sem confundi-lo com PREMIUM e sem reimplementar Asaas.

- elegibilidade: somente PREMIUM compra novos impulsionamentos;
- definir produtos, preço/versionamento, período, alvo, campanha, estados, pagamento avulso, ativação, expiração, auditoria e idempotência;
- definir ranking/posição e comportamento determinístico no catálogo leve;
- adequar Payments/Integrations/Asaas para assinatura e compra avulsa, preservando gateway único e garantias existentes;
- cobrir cobrança duplicada, webhook/replay, timeout, expiração, concorrência, cache e rollback.

**Decisão obrigatoriamente pendente:** comportamento de impulsionamento já pago/ativo durante downgrade. Nenhuma implementação ou teste deve inventar essa regra. O gate de produto aprova essa decisão antes do desenvolvimento do fluxo.

## 7. LOTE 13D — Publicação ACTS e SEO finais ⛔

O antigo 13D é preservado como identificador histórico, mas fica **depois** de 13E, 13F e 13G. Não pode publicar o antigo catálogo completo de cidade nem tratar Blogger.

### Publicação

- `Publish.js` trata somente estado ACTS confirmado: JSON individual, catálogo municipal leve, manifests e invalidação;
- Core permanece genérico; R2/Edge entrega artefatos e D1 permanece fonte privada;
- Blogger fica fora de Publisher, Queue, Cron, R2, KV e D1;
- ativação atômica de manifest, retenção/rollback, Cache Rules e reconciliação são comprovadas em staging.

### Gate SEO

Depois de definidos portal, anúncio, JSON individual, catálogo, minisite/subdomínio e política Blogger, decidir formalmente — sem pressupor resposta — canonical, indexação do minisite, indexação ou não do editorial client-side, sitemap, robots e duplicidade com Blogger.

**DoD:** contratos e testes de publicação/SEO aprovados; cache antigo preservado até ativação íntegra; staging e rollback comprovados. Só então 14A é desbloqueado.

## 8. Lotes visuais, Functions e frontend

### LOTE 14A/14B — Componentes ⛔

Primitivas e compostos permanecem depois da arquitetura de produto. Devem cobrir acessibilidade, escaping e estados de anúncio, modal, minisite, galeria, vídeos, Blogger loading/error, paginação, lightbox e impulsionamento. Componentes recebem dados prontos, não acessam D1 nem incorporam regra comercial.

### LOTE 15 — Layouts e templates ⛔

Compor portal, listagem/anúncio, minisite, painel/admin e erros sobre contratos aprovados. Templates não consultam Blogger nem D1; estados editoriais são apresentados pelo frontend client-side. Dividir 15A/15B apenas se a revisão exigir.

### LOTE 16A — Middleware e APIs ACTS ⛔

Functions finas somente para estado ACTS: autenticação, perfil, anúncio, plano, configuração de minisite, configuração Blogger, compra de boost, pagamentos, mídia e publicação administrativa. Nenhuma API de posts, proxy ou endpoint ACTS que sirva feed Blogger.

### LOTE 16B — Painel, superadmin, webhook e jobs ACTS ⛔

- painel da anunciante administra seu estado ACTS e configura a origem Blogger, sem importar conteúdo;
- superadmin administra contas, plano, condição comercial/cortesia, moderação, mídias oficiais, minisite, slug, suspensão da **apresentação** Blogger e impulsionamentos;
- superadmin não administra Blogger, Conta Google, posts ou mídia editorial da cliente;
- ligar Queue/publicação ACTS, janela persistente, webhook Asaas, expirações comerciais, retry/dead-letter e reconciliação; nenhum job consulta Blogger.

### LOTE 17 — Frontend público ⛔

Fluxos obrigatórios:

```text
Portal   → Edge → catálogo municipal leve
Anúncio  → Edge → JSON individual ACTS
Minisite → Edge → JSON individual ACTS
         + Browser → Blogger
```

Nenhuma consulta pública D1, KV, Worker ou Function no fluxo normal. O frontend implementa busca/descoberta sobre índice leve, anúncio/minisite sobre JSON individual e, somente no minisite PREMIUM, consumo Blogger client-side aprovado no gate 13F.4.

## 9. Testes distribuídos e gates obrigatórios

Cada lote adiciona seus testes, no mínimo:

- **13C:** integridade, equivalência, staging, backup e rollback da contração;
- **13E:** STANDARD, PREMIUM, gratuidade sem terceiro plano, entitlements, upgrade, downgrade, reativação, preservação de configuração e cache após downgrade;
- **13F:** JSON individual, catálogo leve, zero D1 público, wildcard/subdomínio, CORS real, parsing, XSS, CSP, feed inválido, timeout, Blogger indisponível e zero persistência editorial;
- **13G:** elegibilidade, impulsionamentos, ranking aprovado, expiração, pagamento avulso, idempotência e regra de downgrade aprovada;
- **13D:** manifests, invalidação, Cache Rules, SEO, staging e rollback;
- **14–17:** acessibilidade, estados visuais, RBAC, APIs somente ACTS, ausência de endpoint Blogger e fluxos públicos Edge;
- **18:** segurança, performance, Cloudflare, pagamentos, publicação, cache, subdomínios, downgrade, Blogger, rollback, observabilidade e produção.

Gates que bloqueiam avanço:

1. aceite remoto do 13B;
2. compatibilidade 13C com o domínio final ACTS;
3. decisões de produto do 13E;
4. contratos da JSON individual e catálogo leve;
5. wildcard e resolução segura de slug;
6. prova Blogger em navegador real;
7. regra de boost ativo durante downgrade;
8. decisões SEO;
9. staging/rollback de publicação;
10. aceite transversal humano no 18.

## 10. LOTE 18 — Aceite transversal e produção ⛔

O lote final não substitui testes funcionais. Ele valida de ponta a ponta:

- autenticação/autorização, SQLi, XSS, CSRF, upload, webhook e CSP;
- performance e arquitetura Cloudflare, incluindo zero D1/KV/Function público normal;
- assinaturas, compras avulsas, Asaas, idempotência e expiração;
- JSON individual, catálogo leve, publicação, manifests, cache e rollback;
- wildcard, resolução de subdomínio, upgrade/downgrade e cache após downgrade;
- Blogger client-side, CORS, falha isolada e prova de zero persistência/processamento editorial ACTS;
- migrations/evolução, backup/restore, staging representativo, deploy gradual e rollback;
- logs sem segredos, métricas, alertas, runbooks, observabilidade e smoke em produção.

**Aceite:** CI verde; nenhum achado crítico/alto; gates e evidências arquivados; staging e rollback aprovados; proprietário registra aceite humano. Só então produção é desbloqueada. Não há merge ou deploy automático.

## 11. Decisões pendentes e itens bloqueados

Permanecem explicitamente pendentes, não devendo ser inventados durante implementação: cardinalidade conta/anúncio/minisite; schema da JSON individual; campos do catálogo leve; manifest individual; domínio comercial/taxonomia final; destino das estruturas imobiliárias; limites de mídia oficial; preço/versionamento de planos e boosts; inadimplência/tolerância; boost ativo no downgrade; endpoint/CORS/paginação Blogger; providers de vídeo; privacidade Google/Blogger; limites de conteúdo; wildcard Cloudflare; algoritmo de ranking; canonical/noindex editorial, sitemap, robots e duplicidade.

Enquanto pendentes, ficam bloqueadas as partes dependentes de 13E–13G, 13D e todos os Lotes 14–18. Uma falha da prova Blogger exige nova decisão, nunca mudança automática para backend.

## 12. Ordem futura completa

```text
13B gate remoto
→ 13C validação/contração compatível com ACTS
→ 13E planos STANDARD/PREMIUM
→ condição comercial e entitlements
→ upgrade/downgrade/reativação
→ domínio comercial do anúncio
→ 13F JSON individual
→ catálogo municipal leve
→ minisite/subdomínio e wildcard
→ prova Blogger em navegador real
→ integração Blogger client-side
→ 13G impulsionamentos e pagamentos avulsos
→ 13D publicação ACTS e decisões SEO
→ 14 componentes
→ 15 templates
→ 16 Functions/painel/superadmin
→ 17 frontend
→ 18 aceite transversal
→ produção aceita e operação contínua
```

## 13. Fronteira documental com a Etapa 4/7

Este ROADMAP pode nomear caminhos futuros, mas não altera nem autoriza caminhos em `docs/TREE.md`. A árvore atual ainda reflete fronteiras anteriores; toda divergência de novos módulos, schemas, Functions, componentes, templates, site e testes deve ser resolvida exclusivamente na Etapa 4/7 antes da implementação. Código, schema e migrations permanecem intocados nesta etapa.
