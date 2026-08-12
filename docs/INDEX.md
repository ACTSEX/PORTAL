# Índice da Documentação

> Este documento centraliza toda a documentação oficial do Portal ACTS.

---

# Documentação Oficial

A documentação do ACTS está organizada por assunto.

Cada documento possui uma responsabilidade específica.

---

## 01. README

**Arquivo**

```text
/docs/README.md
```

**Objetivo**

Apresentação rápida do projeto.

Contém:

- visão geral;
- tecnologias utilizadas;
- estrutura básica;
- documentação disponível.

---

## 02. PROJECT

**Arquivo**

```text
/docs/PROJECT.md
```

**Objetivo**

Define a filosofia do projeto.

Contém:

- missão;
- visão;
- princípios;
- objetivos;
- regras permanentes;
- forma oficial de desenvolvimento.

Este documento representa a identidade do ACTS.

---

## 03. ARCHITECTURE

**Arquivo**

```text
/docs/ARCHITECTURE.md
```

**Objetivo**

Documento técnico principal.

Define toda a arquitetura da plataforma.

Contém:

- microkernel;
- módulos;
- plugins;
- componentes;
- eventos;
- renderização;
- publicação;
- banco de dados;
- Cloudflare;
- organização do projeto.

É a Constituição Técnica do ACTS.

---

## 04. TREE

**Arquivo**

```text
/docs/TREE.md
```

**Objetivo**

Define a árvore oficial do projeto.

Toda pasta e todo arquivo devem existir primeiro neste documento antes de serem implementados.

Nenhum arquivo deve surgir "fora da árvore".

---

## 05. ROADMAP

**Arquivo**

```text
/docs/ROADMAP.md
```

**Objetivo**

Define a ordem oficial de implementação.

Cada arquivo do projeto aparece aqui.

Quando concluído, é marcado como implementado.

---

## 06. MODULES

**Arquivo**

```text
/docs/MODULES.md
```

**Objetivo**

Documentar todos os módulos do sistema.

Cada módulo possui:

- responsabilidade;
- eventos;
- dependências;
- interfaces públicas;
- observações.

---

## 07. COMPONENTS

**Arquivo**

```text
/docs/COMPONENTS.md
```

**Objetivo**

Documentar todos os componentes reutilizáveis.

Exemplos:

- Card
- Grid
- Form
- Gallery
- Table
- Modal

---

## 08. EVENTS

**Arquivo**

```text
/docs/EVENTS.md
```

**Objetivo**

Catálogo oficial de eventos.

Para cada evento será documentado:

- descrição;
- quem dispara;
- quem pode consumir;
- parâmetros;
- exemplos.

---

## 09. SCHEMAS

**Arquivo**

```text
/docs/SCHEMAS.md
```

**Objetivo**

Documentar todos os arquivos JSON utilizados pela plataforma.

Exemplos:

- schemas de formulário;
- temas;
- menus;
- permissões;
- configurações.

---

## 10. CLOUDFLARE

**Arquivo**

```text
/docs/CLOUDFLARE.md
```

**Objetivo**

Documentar toda a infraestrutura Cloudflare.

Inclui:

- Pages;
- Functions;
- D1;
- KV;
- R2;
- Queues;
- Cache;
- Deploy.

---

## 11. CHANGELOG

**Arquivo**

```text
/docs/CHANGELOG.md
```

**Objetivo**

Registrar todas as decisões importantes do projeto.

Sempre que uma decisão arquitetural mudar, ela deve ser registrada aqui.

Nunca apagar histórico.

---

# Fluxo Oficial

Toda implementação deve seguir esta sequência.

```text
PROJECT
        │
        ▼
ARCHITECTURE
        │
        ▼
TREE
        │
        ▼
ROADMAP
        │
        ▼
IMPLEMENTAÇÃO
```

Isso garante que nenhuma decisão seja tomada apenas durante a programação.

---

# Hierarquia da Documentação

```text
README
        │
        ▼
PROJECT
        │
        ▼
ARCHITECTURE
        │
        ▼
TREE
        │
        ▼
ROADMAP
        │
        ▼
MODULES
COMPONENTS
EVENTS
SCHEMAS
CLOUDFLARE
CHANGELOG
```

Cada documento possui uma responsabilidade única.

---

# Regra Permanente

Antes de implementar qualquer arquivo do projeto, verificar:

1. O arquivo existe na árvore oficial?
2. O arquivo está previsto no roadmap?
3. A arquitetura permite sua criação?
4. A responsabilidade está claramente definida?

Se alguma resposta for **não**, o arquivo não deve ser criado.

---

# Objetivo da Documentação

A documentação existe para garantir que:

- o projeto permaneça organizado;
- a arquitetura não se perca;
- novos desenvolvedores entendam rapidamente o sistema;
- decisões não dependam da memória dos participantes;
- a evolução aconteça de forma previsível.

Toda a documentação deve permanecer sincronizada com a implementação.

Sempre que a arquitetura mudar, os documentos correspondentes deverão ser atualizados antes do código.

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

## Precedência e versões documentais — consolidação 2026-08-12

Em conflito, aplica-se `CONSTITUTION.md` → `ARCHITECTURE.md` → contrato normativo específico/ADR → `ROADMAP.md` → `TREE.md` → documentação especializada → histórico/`CHANGELOG.md`. O TREE inventaria caminhos físicos e o ROADMAP ordena lotes; nenhum dos dois substitui contrato de domínio.

“Arquitetura 3.0” e “ROADMAP 2.0” versionam documentos de responsabilidades diferentes, não duas arquiteturas concorrentes. Preservam seus números. A Arquitetura 3.0 define o sistema vigente; ROADMAP 2.0 organiza a sequência para alcançar esse estado. Seções “Arquitetura 2.0” estão mantidas somente como histórico e não governam o contrato alvo.
