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
| `worker/` | `fetch`, validação da fronteira HTTP, composição, bindings, Queue consumers e respostas | concentrar regra de negócio |
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
- **ACTS_DATA** contém projeções públicas, catálogos leves, manifests e outros artefatos ACTS reconstruíveis.
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
D1 confirmado → evento/pedido mínimo → ACTS_QUEUE
→ consumer no Worker → projeção allowlisted e determinística
→ objeto versionado em ACTS_DATA → confirmação
→ ativação de manifest/pointer → Edge Cache
```

Processamento deve ser idempotente, tolerar reentrega, preservar correlação e nunca ativar objeto parcial. Republicação reconstrói derivados a partir do D1. Mudança de cidade em anúncio público atualiza de forma coordenada os catálogos antigo e novo.

### Leitura pública

```text
navegador → Worker/rota pública → Edge Cache
          → ACTS_DATA em cache miss → resposta cacheável
```

O Worker continua sendo a entrada oficial, mesmo quando a resposta é satisfeita no Edge. A leitura pública normal evita D1 e Queue.

## Projeções públicas

- Uma projeção JSON pequena por anunciante contém apenas estado público ACTS aprovado.
- Um catálogo municipal leve contém o necessário para cards, descoberta, filtros, ordenação e localização da projeção individual.
- Objetos de conteúdo são imutáveis/versionados; manifest ou pointer estável só muda após verificação do novo objeto.
- Dados privados, linhas D1 completas, segredos, auditoria, pagamentos e moderação interna são proibidos nas projeções.
- Cache HTTP longo pode ser usado para objetos imutáveis; pointers usam TTL curto e revalidação. TTLs exatos dependem de medição operacional.

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

Estão implementados o Worker público, portal e minisite compartilhados, bindings
Cloudflare, fundações em `core/` e `business/`, migrations, publicação assíncrona,
gateway Asaas, backfill de cidades e testes correspondentes. O domínio imobiliário
remanescente nessas fundações é legado técnico em migração, não uma regra do
produto ACTS. Funcionalidades planejadas são identificadas em `PRODUCT.md` e não
devem ser apresentadas como disponíveis.
