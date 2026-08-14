# ACTS — arquitetura

## Admin operacional — OPERACIONAL

O frontend separado `/admin` reutiliza a sessão D1 `__Host-acts_session`; a autorização é obtida exclusivamente de uma conta ativa com `users.role = 'admin'`. O fluxo é **ADMIN → D1 → regras business → ACTS_QUEUE quando necessário → publisher → ACTS_DATA**. Busca e detalhe são allowlisted; pagamentos e impulsionamentos são somente leitura.

Condição comercial, suspensão, reativação e republicação exigem Origin same-origin, confirmação visual e auditoria append-only. Condições vigentes (`trial`, `courtesy`, `promotion`, `temporary_free`) são independentes de pagamento e concedem elegibilidade PREMIUM. O admin não confirma pagamentos, não ativa boosts, não impersona usuários e não escreve diretamente no R2; todo efeito público usa o contrato canônico da Queue.

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
| ACTS_MEDIA / upload de imagens | **OPERACIONAL** | Painel → API autenticada → validação JPEG/PNG/WEBP (10 MB) → ACTS_MEDIA + D1 → ACTS_QUEUE → projeção pública. As imagens são armazenadas como recebidas, inclusive metadados EXIF; não há processamento nesta etapa. |
| Queue | **OPERACIONAL** | Producer e consumer do Worker transportam pedidos mínimos de city/profile. |
| Publicação assíncrona | **OPERACIONAL** | Queue → D1 → publisher canônico → ACTS_DATA, com coalescência por batch. |
| Autenticação | **OPERACIONAL** | Sessões D1 via cookie HttpOnly protegem as APIs privadas do anunciante. |
| Pagamentos/Asaas | **MÓDULO ISOLADO** | Domínio e adapter testados, sem endpoints/webhook integrados. |
| Painel do anunciante | **OPERACIONAL** | `/painel` → APIs privadas → D1 → ACTS_QUEUE → publicação em ACTS_DATA. |
| Admin | **PLANEJADO** | Sem fluxo funcional conectado. |
| Blogger no minisite | **OPERACIONAL** | Sync Atom seguro via Queue, projeção em ACTS_DATA e renderização PREMIUM. |
| Impulsionamentos | **OPERACIONAL** | PREMIUM → checkout PIX/Boleto com preço autoritativo → Asaas → webhook autenticado → D1 → ACTS_QUEUE → CityProjection. |

Boosts são compras avulsas, independentes tanto do plano funcional quanto de `commercial_conditions`. O catálogo autoritativo oferece `24h` (R$ 9,90), `7d` (R$ 39,90), `15d` (R$ 69,90) e `30d` (R$ 119,90). STANDARD não pode contratar novos boosts. A ordenação oficial é boost ativo, PREMIUM, e `id` como desempate estável. A projeção inclui somente `boosted` e `boostEndsAt`; o Portal também compara o término com seu relógio para que um objeto em cache não mantenha destaque expirado. Não há cron.

Condições `normal`, `trial`, `courtesy`, `promotion` e `temporary_free` são registros auditáveis separados. Elas não mudam por si mesmas o código do plano e não podem ser atribuídas pela API do usuário desta etapa.

### Contrato público R2 canônico

Publisher e leitor compartilham as keys centralizadas em
`business/public-content.js`: `cities/{slug}.json` e `profiles/{slug}.json`.
Não há leitura dupla, fallback legado ou consulta D1 no request público.

## Blogger no minisite — OPERACIONAL

A integração Blogger é exclusiva do plano PREMIUM e mantém o blog sob propriedade do anunciante. O painel persiste somente URL e estado operacional em `blogger_integrations`; posts não são armazenados no D1.

O fluxo canônico é: **Blogger → sync interno pela Queue existente → parser Atom → sanitização allowlist → ProfileProjection → ACTS_DATA (`profiles/{slug}.json`) → Minisite**. A sincronização lê no máximo 10 posts, limita o feed a 512 KiB, usa timeout de 8 segundos e valida cada redirect contra destinos locais, privados, link-local e internos. Domínios personalizados só são aceitos como conteúdo após o feed declarar o gerador Blogger.

O request público do minisite **NÃO consulta Blogger**. Em falha, a mensagem é repetida pela Queue e o objeto válido anterior em ACTS_DATA permanece intacto. A remoção da URL agenda uma nova projeção sem a seção `blog`.

## Pagamentos Asaas — OPERACIONAL (Etapa 9)

O fluxo comercial é `Painel autenticado → checkout → Asaas → webhook autenticado → D1 → ACTS_QUEUE → publisher → ACTS_DATA`. O D1 é a fonte de verdade: o frontend **nunca define o plano ativo** e uma cobrança pendente não habilita PREMIUM. Somente um evento Asaas autenticado e normalizado pode promover a assinatura; cancelamento, estorno ou inadimplência retornam a elegibilidade a STANDARD e solicitam nova publicação pelo Queue, sem escrita direta no R2 e sem apagar a configuração Blogger.

Rotas mínimas: `GET /api/me/billing`, `POST /api/me/billing/checkout` (somente PIX e BOLETO) e `POST /api/webhooks/asaas`. O preço de PREMIUM é lido da tabela `plans`; campos financeiros extras do browser são rejeitados. A criação e a entrega de webhook usam os registros de idempotência existentes em `idempotency_records`, e a ordenação usa `payments.external_updated_at`.

Secrets/variáveis de runtime exigidos, nunca gravados no TOML: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` e `ASAAS_BASE_URL` (URL HTTPS adequada ao sandbox ou produção). O webhook valida o header `asaas-access-token`. Cartão não é oferecido no painel nesta etapa para evitar ampliar o escopo PCI.
