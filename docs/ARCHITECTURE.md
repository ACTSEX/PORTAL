# ACTS — arquitetura

## Estado oficial

ACTS adota arquitetura **Worker-first**. O Worker `portal` é a entrada HTTP e o ponto de composição do runtime. Pages e Pages Functions não são componentes principais. A implementação mantém as fundações em `core/` e os domínios consolidados em `business/`, com `worker/` como entrada única.

```text
core/       infraestrutura independente do negócio
business/   módulos e regras do domínio ACTS
worker/     entrada, adaptadores HTTP e consumers Cloudflare
frontend/   interface e assets compartilhados
database/   schema e migrations D1
tests/      testes por responsabilidade e fluxo
scripts/    operações controladas e repetíveis
docs/       arquitetura, banco, deploy e produto
```

## Responsabilidades

| Área | Responsabilidade | Não deve fazer |
|---|---|---|
| `core/` | configuração, contratos técnicos, roteamento genérico, auth, logging, persistência, publicação e utilitários | conhecer plano, anúncio, cidade, pagamento ou outra regra ACTS |
| `business/` | contas, perfis, anúncios, cidades, categorias, planos, assinaturas, pagamentos, boosts, publicação de domínio e SEO | depender do protocolo HTTP ou de internals de outro módulo |
| `worker/` | `fetch`, validação da fronteira HTTP, composição, bindings e respostas | concentrar regra de negócio |
| `frontend/` | portal, painel e minisite compartilhados; apresentação e consumo de projeções públicas | consultar D1 ou confiar em conteúdo externo bruto |
| `database/` | snapshot de referência e migrations forward-only | servir como API pública |
| `tests/` | unidade, integração, contrato, segurança e fluxos críticos | espelhar a árvore sem necessidade |
| `scripts/` | manutenção explícita, segura, idempotente e auditável | virar caminho normal de requisição |

## Topologia Cloudflare

```text
Worker portal
├── D1 ACTS_DB       → portal-db
├── R2 ACTS_MEDIA    → acts-midias
├── R2 ACTS_DATA     → acts-dados
└── Queue ACTS_QUEUE → acts-queues
```

- **D1** contém o estado relacional autoritativo por ambiente.
- **ACTS_MEDIA** contém mídia oficial e seus derivados autorizados.
- **ACTS_DATA** contém somente projeções públicas ACTS reconstruíveis, prontas para leitura.
- **ACTS_QUEUE** transporta trabalho assíncrono que realmente precise de retry ou desacoplamento, sobretudo publicação.
- **HTTP/Cloudflare Edge Cache** distribui o conteúdo público originado em `acts-dados`; não há duplicação em KV.
- **KV não faz parte da arquitetura inicial.** Introduzi-lo exige nova decisão arquitetural e caso comprovado.

## Fluxos

### Requisição privada ou mutação

```text
cliente → Worker → autenticação/autorização/validação
        → módulo business → D1
        → resposta
        └→ fato confirmado → Queue, somente se necessário
```

Toda mutação é confirmada no D1 antes de emitir trabalho derivado. Falha de publicação não desfaz o negócio confirmado.

### Publicação

```text
transação Business confirmada → evento ACTS_QUEUE → consumer `queue()` do Worker
→ leitura autoritativa D1 → publisher canônico → projeção pública allowlisted e determinística
→ `cities/{citySlug}.json` ou `profiles/{profileSlug}.json` em ACTS_DATA
→ Edge Cache → Worker → Portal ou Minisite
```

Cada publicação substitui o objeto canônico. R2 é reconstruível a partir do D1 e
não é banco transacional. A Queue apenas transporta pedidos de reconstrução e
nunca constitui fonte de verdade.

### Leitura pública

```text
navegador → Worker/rota pública → Edge Cache
          → ACTS_DATA em cache miss → resposta cacheável
```

O Worker continua sendo a entrada oficial, mesmo quando a resposta é satisfeita no Edge. O fluxo é sempre `PUBLIC HTTP → ACTS_DATA`, nunca `PUBLIC HTTP → D1`.

## Projeções públicas

- `profiles/{profileSlug}.json` contém somente o estado público aprovado de um perfil PREMIUM ativo; perda de elegibilidade remove o objeto.
- `cities/{citySlug}.json` contém o necessário para cards, descoberta, filtros e ordenação.
- As keys são estáveis, o conteúdo é substituído e usa TTL curto com revalidação.
- Dados privados, linhas D1 completas, segredos, auditoria, pagamentos e moderação interna são proibidos nas projeções.
- O cache HTTP usa TTL curto; TTLs exatos podem ser ajustados por medição operacional.

## Modularização e integração

Cada módulo de negócio possui **um único arquivo principal sempre que razoável**. CRUD, regras, consultas e validações coesas permanecem juntos. Arquivos auxiliares existem somente quando representam responsabilidade realmente distinta, como `Asaas` ou outro gateway/provider/adapter externo. Não criar Worker, consumer, controller ou arquivo por operação.

Comunicação síncrona usa interfaces públicas pequenas. Eventos não são padrão universal: representam fatos após commit e são usados quando múltiplos consumidores, isolamento ou execução assíncrona justificarem. Mensagens levam identificadores, versão, idempotency key e correlação; não snapshots privados nem binários.

## Frontend, minisite e integrações externas

Portal, painel e minisites reutilizam templates e assets. Não existe pasta, aplicação ou bundle por anunciante. O wildcard resolve virtualmente o minisite PREMIUM.

Blogger é uma integração **planejada** e estritamente client-side: o navegador busca o feed público da anunciante, limita, analisa, normaliza e sanitiza o conteúdo antes de montar DOM seguro. O backend não faz proxy, importação, sincronização, persistência ou publicação editorial. Se CORS ou segurança inviabilizarem essa prova, a implementação para até nova decisão.

Asaas é o gateway financeiro atual. Seu adapter isola protocolo, assinatura e payload externo; regras de cobrança permanecem no domínio de pagamentos.

## Publicação e deploy

O artefato implantável é o Worker configurado por `wrangler.toml`. Deploy promove o mesmo código validado entre ambientes, aplica migrations separadamente e verifica bindings, rotas, Queue, cache e smoke. Procedimentos ficam em `DEPLOY.md`.

## Estado atual

Esta seção é a **única fonte oficial** para o estado de integração. Os termos não
indicam apenas existência de código:

- **OPERACIONAL:** capacidade conectada ao Worker/runtime e utilizável.
- **MÓDULO ISOLADO:** código existente e testado, mas ainda não conectado ao runtime.
- **PLANEJADO:** não implementado ou ainda sem fluxo funcional.

| Capacidade | Estado | Evidência/limite atual |
|---|---|---|
| Worker único | **OPERACIONAL** | `worker/index.js` é a única entrada HTTP. |
| Portal | **OPERACIONAL** | Shell e projeções públicas de cidade são servidos pelo Worker. |
| Minisite | **OPERACIONAL** | Wildcard oficial lê projeção pública de perfil. |
| ACTS_DATA | **OPERACIONAL** | O leitor público usa `cities/{slug}.json` e `profiles/{slug}.json`. |
| Edge Cache | **OPERACIONAL** | Cache público fail-open no fluxo de projeções de cidade/perfil. |
| D1 | **OPERACIONAL** | Consumer assíncrono reconstrói projeções; as rotas públicas não consultam D1. |
| ACTS_MEDIA | **PLANEJADO** | Binding configurado, sem fluxo HTTP de mídia/upload integrado. |
| Queue | **OPERACIONAL** | Producer e consumer do Worker transportam pedidos mínimos de city/profile. |
| Publicação assíncrona | **OPERACIONAL** | Queue → D1 → publisher canônico → ACTS_DATA, com coalescência por batch. |
| Autenticação | **OPERACIONAL** | Sessões D1 via cookie HttpOnly protegem as APIs privadas do anunciante. |
| Pagamentos/Asaas | **MÓDULO ISOLADO** | Domínio e adapter testados, sem endpoints/webhook integrados. |
| Painel do anunciante | **OPERACIONAL** | `/painel` → APIs privadas → D1 → ACTS_QUEUE → publicação em ACTS_DATA. |
| Admin | **PLANEJADO** | Sem fluxo funcional conectado. |
| Blogger | **PLANEJADO** | Sem integração funcional. |
| Boosts | **PLANEJADO** | Sem implementação de domínio; marcação visual existente não constitui o produto. |

### Contrato público R2 canônico

Publisher e leitor compartilham as keys centralizadas em
`business/public-content.js`: `cities/{slug}.json` e `profiles/{slug}.json`.
Não há leitura dupla, fallback legado ou consulta D1 no request público.
