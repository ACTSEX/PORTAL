# Auditoria contínua de produto e arquitetura

> Documento vivo de acompanhamento. Cada nova auditoria deve atualizar este
> arquivo, preservando o histórico resumido das conclusões anteriores.

## Controle

| Campo | Valor |
| --- | --- |
| Repositório | `ACTSEX/PORTAL` |
| Última auditoria | 2026-08-10 |
| Etapa | 1/7 — auditoria completa de impacto |
| Estado | Concluída |
| Próxima ação | Validar decisões pendentes antes de iniciar a Etapa 2 |

## Como manter este documento

Em cada nova auditoria:

1. atualizar data, etapa e estado na tabela de controle;
2. revisar o percentual preservável e as listas de impacto;
3. registrar novas decisões, riscos e investigações;
4. marcar itens resolvidos sem apagar seu contexto histórico;
5. acrescentar uma entrada ao histórico no fim do arquivo;
6. não tratar este documento como substituto dos ADRs e contratos oficiais.

## Decisões oficiais vigentes

### Planos

- Existem somente os planos estruturais `STANDARD` e `PREMIUM`.
- `FREE` não é plano. Trial, cortesia, promoção e gratuidade até uma data são
  condições comerciais independentes do plano.
- Standard inclui conta, card, anúncio, perfil, contatos e mídias oficiais.
- Premium inclui tudo do Standard, além de minisite, subdomínio, integração
  Blogger no minisite e direito de comprar impulsionamentos.
- Impulsionamento é pago separadamente e não está incluído no Premium.

### Downgrade Premium para Standard

- Conta, card, anúncio, perfil, dados e mídias oficiais permanecem.
- Minisite, subdomínio, apresentação do Blogger e compra de novos
  impulsionamentos são desativados.
- Configurações de minisite e Blogger devem ser preservadas para reativação.
- O ACTS não altera, apaga, migra, copia ou limpa o Blogger da anunciante.

### Blogger

- O Blogger e todo o acervo editorial pertencem à anunciante.
- O ACTS não persiste posts, fotos, vídeos ou JSON derivada do feed em D1, R2
  ou KV.
- Não haverá importação por backend, Queue ou Cron.
- O fluxo obrigatório é feed público para navegador, parser client-side,
  sanitização, normalização e renderização no minisite.
- Falha do feed não pode impedir perfil, contatos ou mídias oficiais ACTS de
  funcionar.

### Publicação e storage

- Cada anunciante terá uma pequena JSON pública com seu estado comercial ACTS.
- Conteúdo novo no Blogger não regenera artefatos ACTS.
- O catálogo da cidade deve conter a projeção mínima dos cards e relacionar-se
  com as JSON individuais sem duplicação desnecessária.
- A navegação pública normal não consulta D1 nem KV.
- R2 permanece reservado a mídias oficiais, JSON públicas, manifests e outros
  artefatos próprios da plataforma.
- O domínio oficial do minisite é `{slug}.acompanhantesex.com`.

## Resumo da auditoria de 2026-08-10

### Conclusão executiva

A fundação técnica é amplamente reutilizável, mas o domínio ainda contém
conceitos imobiliários e a documentação vigente centraliza a publicação em uma
JSON completa por cidade. A principal correção arquitetural é introduzir uma
JSON pequena por anunciante, mantendo o catálogo municipal como índice de
descoberta. A segunda correção bloqueante é eliminar as propostas de
sincronização backend do Blogger e consolidar seu consumo exclusivamente no
navegador.

**Preservação estimada:** aproximadamente **72%** do projeto.

### MANTER

- Core genérico: configuração, DB, eventos, autenticação, autorização, router,
  renderer, logger, cache e storage.
- Gateway Asaas, idempotência financeira e separação de integrações.
- Upload e metadados de mídias oficiais ACTS.
- Cidades canônicas, `city_id` e backfill operacional.
- Hash, objetos versionados, manifests, confirmação em R2 e rollback do
  Publisher.
- Contatos, leads, avaliações, notificações, favoritos, dashboards, analytics e
  relatórios, com ajustes de domínio quando necessários.
- Queue para publicação de estado ACTS e Cron para reconciliações legítimas.
- Migrations existentes, que permanecem imutáveis.
- Blogger fora do portal central e painel ACTS sem função de CMS editorial.

### ALTERAR

- `plans`: restringir identidade estrutural a Standard e Premium.
- `subscriptions`: separar plano, condição comercial e entitlement efetivo.
- `payments`: suportar assinatura e compras avulsas de impulsionamento.
- `profiles` e `listings`: substituir conceitos imobiliários por dados da
  anunciante e do anúncio ACTS.
- Publisher: suportar JSON individual e catálogo municipal leve.
- Eventos: regenerar somente artefatos ACTS realmente afetados.
- Documentação de arquitetura, produto, banco, storage, cache, publicação,
  segurança, operações, módulos, TREE e ROADMAP.
- Frontend, painel, superadmin, Workers e Pages Functions planejados, para que já
  nasçam sob o novo contrato.

### REMOVER

- `FREE` ou `Básico/Free` como plano.
- Domínio conceitual `{slug}.acts.com`.
- Sincronização, proxy ou parsing backend do Blogger.
- Queue, Cron, cache persistente ou botão de atualização para importar posts.
- HTML, JSON, índices ou sitemaps persistidos a partir do feed Blogger.
- Qualquer tabela de posts ou mídia editorial Blogger.
- Conceitos imobiliários (`sale`, `rent`, profissional imobiliário, preço e
  endereço de imóvel) quando o domínio final for migrado.

### CRIAR

- Contrato de condições comerciais e histórico de concessões.
- Política de downgrade, upgrade, inadimplência e reativação.
- Configuração pequena de minisite e Blogger, sem conteúdo editorial.
- Contrato e publicador da JSON pública individual.
- Resolução segura de wildcard/subdomínio.
- Domínio, pedido, pagamento e campanha de impulsionamento.
- Loader, parser, normalizador e sanitizador Blogger no frontend.
- Matriz de eventos e invalidação dos artefatos públicos.
- Testes de CORS, CSP, XSS, privacidade, downgrade e ausência de persistência do
  Blogger.

### INVESTIGAR

- Endpoint/formato público do Blogger, CORS real, paginação, labels e blogs
  marcados como adultos.
- Biblioteca de sanitização, Trusted Types e allowlist de elementos/URLs.
- Providers de vídeo, sandbox de iframe, imagens externas e hotlinking.
- Política SEO/canonical do conteúdo Blogger renderizado no cliente.
- Privacidade da requisição direta do visitante ao Google.
- DNS wildcard, certificados, roteamento Cloudflare e slugs reservados.
- Cardinalidade entre conta, perfil, anúncio, cidade e minisite.
- Destino de impulsionamentos já pagos após downgrade.
- Efeito de inadimplência e expiração de gratuidade sobre o Premium.
- Atomicidade e cache entre JSON individual e catálogo da cidade.

## Impacto por área

| Área | Situação | Direção |
| --- | --- | --- |
| Produto | Alterar | Consolidar portal, anúncio e minisite |
| Planos | Alterar | Somente Standard e Premium |
| Pagamentos | Alterar/Criar | Cobrança avulsa de impulsionamento |
| Usuários/Auth | Manter | Ajustar apenas capabilities específicas |
| Perfis/Anúncios | Alterar | Remover domínio imobiliário |
| Cidades/Categorias | Manter/Alterar | Preservar infraestrutura e trocar taxonomia |
| Mídias/Uploads | Manter | Restringir a mídias oficiais ACTS |
| D1 | Alterar | Configuração pequena, sem posts Blogger |
| R2 | Manter | Artefatos ACTS, nunca espelho Blogger |
| KV/Cache | Manter/Alterar | Sem persistência do feed |
| Publicação | Alterar | JSON individual mais catálogo municipal |
| Minisite/Subdomínio | Criar | Exclusivo Premium |
| Blogger | Criar/Remover | Cliente browser; remover sync backend |
| Impulsionamentos | Criar | Compra separada habilitada por Premium |
| SEO | Criar/Investigar | Separar estado ACTS de editorial externo |
| Segurança | Manter/Alterar | Sanitização, CSP e privacidade |
| Frontend/Painel | Criar | Configuração enxuta, não CMS |
| Superadmin | Criar | Plano, cortesia, moderação e boosts |
| Workers/Functions | Criar/Alterar | Escrita e publicação ACTS apenas |
| Eventos/Queues/Cron | Alterar | Nenhuma ingestão Blogger |
| Testes/Observabilidade | Criar/Alterar | Cobrir novos invariantes e falhas externas |
| Operações | Alterar | Wildcard, cache, downgrade e runbooks |

## Mapa de dados futuro — sem migration nesta auditoria

### Preservar e adaptar

- `users`, `sessions`, `profiles`;
- `plans`, `subscriptions`, `payments`;
- `categories`, `cities`, `listings`, `media`;
- `contacts`, `leads`, `reviews`, `notifications`;
- `integrations`, `settings`, `idempotency_records`;
- `publication_jobs`, `city_publication_state`;
- `favorites` e `comparisons`, se confirmados no produto.

### Estruturas potenciais

- condições comerciais e histórico de concessões;
- configuração de minisite;
- configuração Blogger somente com identificador/URL, estado e labels;
- produtos/pedidos/campanhas de impulsionamento;
- estado/versionamento de publicação individual.

### Estruturas proibidas

- posts Blogger;
- mídia editorial Blogger;
- cache persistente do feed;
- JSON persistente derivada do feed;
- checkpoint ou job de sincronização Blogger.

## Matriz de regeneração pública

| Alteração | JSON individual | Catálogo da cidade |
| --- | --- | --- |
| Nome/foto/dado exibido no card | Sim | Sim |
| Cidade ou status público | Sim | Cidade anterior e nova |
| Contato/serviço só do detalhe | Sim | Não |
| Plano ou eligibility do minisite | Sim | Se afeta card/link |
| Slug/subdomínio | Sim | Sim |
| Configuração Blogger ACTS | Sim | Normalmente não |
| Novo post/foto/vídeo Blogger | Não | Não |
| Impulsionamento ativo/expirado | Se exposto | Sim, se altera ordenação |

## Blogger client-side — requisitos mínimos

- timeout e cancelamento de fetch;
- limite de bytes, itens, páginas e requisições;
- parsing para estrutura inerte;
- sanitização por allowlist;
- bloqueio de scripts, handlers, formulários e embeds arbitrários;
- validação de protocolos e origens de URLs;
- reconstrução de vídeos somente para providers permitidos;
- lazy loading de imagens e vídeos;
- fallback apenas da área editorial;
- perfil e contatos ACTS sempre independentes;
- CSP separando `connect-src`, `img-src` e `frame-src`;
- nenhum conteúdo do feed em logs ou observabilidade;
- nenhuma escrita D1, KV ou R2 por mudança editorial.

## Riscos prioritários

1. CORS inviabilizar o endpoint escolhido.
2. XSS por HTML ou embed externo.
3. Cache manter minisite visível depois de downgrade.
4. Condição comercial virar um terceiro plano disfarçado.
5. Pagamento atual não representar compra avulsa.
6. Catálogo municipal duplicar excessivamente as JSON individuais.
7. SEO duplicado entre Blogger e ACTS.
8. Tracking e privacidade em chamadas diretas e embeds.
9. Colisão ou takeover de subdomínio.
10. Conceitos imobiliários residuais contaminarem APIs e interfaces.

## Ordem recomendada das etapas futuras

1. aprovar ADRs e decisões pendentes;
2. formalizar planos, condição comercial, downgrade e impulsionamentos;
3. definir JSON individual e relação com catálogo municipal;
4. testar tecnicamente Blogger client-side em navegador real;
5. definir sanitização, CSP, privacidade e SEO;
6. atualizar documentação constitucional, contratos, TREE e ROADMAP;
7. projetar migrations futuras sem editar migrations existentes;
8. adequar módulos e schemas de domínio;
9. estender pagamentos e entitlements;
10. adaptar eventos e Publisher;
11. implementar minisite, subdomínio e frontend Blogger;
12. implementar Functions e jobs legítimos;
13. validar segurança, staging, cache, rollback e observabilidade.

## Impacto no ROADMAP

- Lotes 1–6: preservar; não refazer.
- Lotes 7–9: preservar a base e adequar domínio/planos.
- Lotes 9A–12: preservar infraestrutura e módulos; ajustar projeções.
- Lotes 13A e 13B: preservar; concluir gates operacionais pendentes.
- Lote 13C: manter, revendo o contrato final do domínio.
- Antes do 13D: inserir a adequação bloqueante da nova arquitetura.
- 13D e lotes 14–17: só iniciar após os contratos de JSON individual,
  minisite, Blogger client-side e impulsionamentos estarem aprovados.
- Lote 18: acrescentar provas de CORS, CSP, XSS, downgrade, wildcard e
  inexistência de persistência editorial.

## Histórico de auditorias

### 2026-08-10 — Etapa 1/7

- Auditoria completa inicial registrada.
- Preservação técnica estimada em 72%.
- Identificadas como mudanças bloqueantes: dois planos, condição comercial
  independente, JSON individual, Blogger exclusivamente client-side e
  impulsionamentos separados.
- Nenhuma migration ou implementação foi produzida durante a auditoria.

