# ACTS — ARCHITECTURE.md
> Documento normativo principal do ACTS.
> Repositório: `ACTSEX/PORTAL`
> Domínio: `acompanhantesex.com`
> Arquitetura oficial: **Worker-first**
> Limite deste arquivo: **máximo 600 linhas**
## 1. Objetivo
ACTS é a plataforma do portal `acompanhantesex.com`, composta por:
- portal central de descoberta;
- anúncios de anunciantes;
- busca por cidade/categoria;
- perfil comercial público;
- contatos e mídia oficial;
- planos STANDARD e PREMIUM;
- pagamentos e boosts;
- painel da anunciante;
- administração;
- minisite PREMIUM em `{slug}.acompanhantesex.com`.
O Worker `portal` é a entrada HTTP oficial. Cloudflare Pages não é a arquitetura principal.
## 2. Autoridade e estados
Ordem de autoridade:
1. decisão explícita mais recente aprovada para ACTS;
2. este `ARCHITECTURE.md`;
3. código/configuração atual já validado;
4. documentação histórica;
5. legado.
Estados:
- **IMPLEMENTADO**: existe e é verificável.
- **EM REMONTAGEM**: existe parcialmente e está sendo adaptado.
- **PLANEJADO**: depende de decisão, contrato, implementação e testes.
Nunca apresentar PLANEJADO como recurso disponível.
## 3. Princípios permanentes
1. Simplicidade antes de abstração.
2. Criar o mínimo razoável de arquivos.
3. Não criar arquitetura para hipótese futura.
4. Não criar camadas por hábito de framework.
5. Worker é a entrada principal.
6. D1 é a fonte de verdade do estado estruturado.
7. R2 guarda mídia e artefatos públicos derivados.
8. Queue existe apenas quando retry/desacoplamento justificarem.
9. KV não faz parte da arquitetura inicial.
10. Conteúdo público usa HTTP/Cloudflare Edge Cache.
11. Frontend não acessa D1 diretamente.
12. Regra de negócio fica em `business/`.
13. Infraestrutura reutilizável fica em `core/`.
14. Worker orquestra; não concentra regra de negócio.
15. Segurança, validação e observabilidade são obrigatórias.
16. Dados privados nunca entram em projeções públicas.
17. Não duplicar a mesma regra em dois módulos.
18. Integrações externas ficam isoladas do domínio.
19. Código morto/legado não é preservado por apego histórico.
20. Não voltar para Pages-first sem decisão explícita.
## 4. Estrutura oficial
```text
ACTS/
├── core/
│   ├── app.js
│   ├── router.js
│   ├── auth.js
│   ├── db.js
│   ├── storage.js
│   ├── cache.js
│   ├── events.js
│   └── logger.js
├── business/
│   ├── accounts.js
│   ├── listings.js
│   ├── locations.js
│   ├── plans.js
│   ├── payments.js
│   ├── boosts.js
│   └── publishing.js
├── worker/
│   └── index.js
├── frontend/
│   ├── portal/
│   ├── minisite/
│   ├── painel/
│   └── admin/
├── database/
│   ├── schema.sql
│   └── migrations/
├── tests/
├── scripts/
├── docs/
├── package.json
├── package-lock.json
└── wrangler.toml
```
`package.json`, `package-lock.json` e `wrangler.toml` permanecem na raiz enquanto isso simplificar npm, Wrangler e Workers Builds. Não criar `config/` apenas para movê-los.
## 5. Dependências
Fluxo:
```text
request → worker → core → business → D1/R2/Queue → response
```
Regras:
- `worker/` compõe Core e Business.
- `core/` não conhece plano, anúncio, pagamento, boost ou outra regra ACTS.
- `business/` recebe dependências técnicas; não conhece detalhes HTTP.
- frontend consome APIs/projeções; não importa backend.
- módulo business não acessa internals privados de outro módulo.
- dependência circular é proibida.
## 6. Core
### `core/app.js`
Composição runtime, configuração, utilitários realmente compartilhados e injeção de dependências. Não decide regras comerciais.
### `core/router.js`
Registro/resolução de rotas, método, caminho, parâmetros e dispatch. Não contém lógica de negócio.
### `core/auth.js`
Mecanismo técnico de autenticação, sessão, identidade, tokens e autorização técnica. Regras comerciais de conta ficam em `business/accounts.js`.
### `core/db.js`
Acesso técnico ao D1, SQL parametrizado, persistência e tratamento técnico de erros. D1 é a fonte de verdade.
### `core/storage.js`
Acesso técnico a R2 (`ACTS_MEDIA`, `ACTS_DATA`). Não decide política comercial de mídia.
### `core/cache.js`
HTTP cache, Edge Cache, headers, ETag, revalidação e invalidação controlada. Não usar KV.
### `core/events.js`
Envelopes, correlação, idempotência, versionamento e utilitários de eventos/Queue. Evento representa fato confirmado; não é padrão para toda função.
### `core/logger.js`
Logging estruturado. Pode incluir ambiente, versão, requestId, correlationId, operação, duração e resultado. Nunca logar secret, token, PII desnecessária ou payload financeiro integral.
## 7. Regra dos módulos de negócio
Cada domínio possui **um arquivo principal sempre que razoável**.
Não fragmentar automaticamente em `controller/service/repository/validator/entity/events`.
CRUD, consultas, validações e regras coesas podem ficar juntas.
Separar apenas responsabilidade realmente distinta, principalmente gateway/provider/adapter externo.
Exemplo permitido:
```text
business/
├── payments.js
└── payments/
    └── gateways/
        └── asaas.js
```
Tamanho sozinho não obriga fragmentação. Arquivo grande deve ser auditado por mistura de domínios, código morto, duplicação e integrações externas embutidas.
## 8. Business
### `business/accounts.js`
Dono de conta, anunciante, perfil comercial, estado da conta, propriedade, assinatura e entitlements comerciais. Não reimplementa login/sessão de `core/auth.js`.
Regras:
- uma conta anunciante possui um perfil comercial;
- uma conta anunciante possui um anúncio principal;
- suspensão/exclusão não apaga silenciosamente histórico financeiro/auditoria.
### `business/listings.js`
Dono de anúncio, card, categoria, apresentação, serviços, mídia associada, estado editorial, descoberta, busca/filtros e contatos públicos ligados ao anúncio.
Não virar depósito de analytics geral, relatórios administrativos, billing, autenticação ou gateway. Funcionalidade legada sem necessidade atual deve ser removida ou classificada como planejada.
### `business/locations.js`
Cidades, localizações, normalização geográfica, slugs e associação anúncio↔cidade. Cidade é entidade canônica; evitar texto livre duplicado.
### `business/plans.js`
Planos estruturais permitidos: `STANDARD` e `PREMIUM`. Não existe `FREE`. Trial/cortesia/promoção são condições comerciais, não terceiro plano.
### `business/payments.js`
Cobrança, pagamento, finalidade, valor/moeda, status, referência externa mínima, recorrência e compra de boost. Provider externo não define estado interno automaticamente.
### `business/boosts.js`
Boost é produto separado. PREMIUM não inclui boost; apenas pode habilitar compra. Boost deve possuir alvo, período, estado, cobrança e expiração. Expiração não despublica anúncio.
### `business/publishing.js`
Projeções públicas, catálogo municipal, manifest/pointer, serialização, publicação e reconstrução de derivados. Publicação nunca vira fonte de verdade.
## 9. Worker
Arquivo oficial: `worker/index.js`.
Responsabilidades:
- receber request;
- validar fronteira HTTP;
- identificar hostname;
- compor dependências;
- chamar router/Core/Business;
- acessar bindings;
- retornar resposta;
- executar consumer da Queue quando configurado.
Proibido concentrar regra de negócio, SQL disperso, regra financeira ou regra de plano no Worker.
## 10. Cloudflare
### Worker
- nome: `portal`
- entrypoint: `worker/index.js`
- `workers_dev = false`
- código oficial vive no GitHub; não editar produção manualmente no dashboard.
### D1
- binding: `ACTS_DB`
- database atual: `portal-db`
- uso: estado relacional, contas, perfis, anúncios, cidades, planos/assinaturas, pagamentos, estados e auditoria necessária.
### R2 mídia
- binding: `ACTS_MEDIA`
- bucket: `acts-midias`
- uso: fotos, vídeos ACTS quando aplicável, avatars e derivados oficiais.
### R2 dados
- binding: `ACTS_DATA`
- bucket: `acts-dados`
- uso: JSON público, projeções individuais, catálogos, manifests, pointers e artefatos reconstruíveis.
### Queue
- binding: `ACTS_QUEUE`
- queue: `acts-queues`
- usar somente quando retry, desacoplamento ou processamento assíncrono justificarem.
### KV
- não usar;
- não criar `ACTS_KV`;
- não duplicar `ACTS_DATA` em KV sem nova decisão arquitetural.
### Domínios
- `acompanhantesex.com` → Worker `portal`;
- `*.acompanhantesex.com` → Worker `portal`;
- subdomínios são virtuais; não criar app/pasta por anunciante.
## 11. Cache
Conteúdo público de `ACTS_DATA` usa HTTP Cache + Cloudflare Edge Cache.
Regras:
- objeto versionado/imutável pode ter cache longo;
- manifest/pointer usa TTL menor e revalidação;
- leitura pública normal deve evitar D1;
- nunca cachear dados privados publicamente;
- validar ETag, Cache-Control, HIT/MISS e invalidação.
Fluxo:
```text
browser → Worker/Edge → cache → ACTS_DATA em cache miss
```
## 12. Publicação
Fluxo:
```text
mutação → validação → D1 commit → evento/pedido mínimo
→ ACTS_QUEUE → consumer → projeção allowlisted
→ ACTS_DATA versionado → verificação → manifest/pointer
→ Edge Cache
```
Regras:
1. nunca publicar antes do commit do D1;
2. publicação é idempotente;
3. Queue pode reentregar;
4. reentrega não duplica efeito;
5. objeto parcial nunca vira ativo;
6. derivados são reconstruíveis do D1;
7. troca de cidade atualiza catálogo antigo e novo;
8. falha de publicação não desfaz automaticamente negócio confirmado;
9. pointer só muda após novo objeto válido;
10. projeção pública usa allowlist.
## 13. Projeções públicas
Modelo:
```text
1 anunciante → 1 JSON individual → catálogo municipal leve
```
JSON individual contém somente estado público aprovado.
Catálogo municipal contém apenas o necessário para:
- cards;
- descoberta;
- filtros;
- ordenação;
- categoria;
- localização da projeção individual.
Não publicar:
- e-mail privado;
- data de nascimento;
- documento;
- finanças;
- assinatura;
- token;
- moderação interna;
- auditoria;
- linha D1 integral.
## 14. Produto público
### Portal
Descoberta por cidade, categoria e filtros aprovados.
Card pode apresentar, conforme implementação:
- foto de destaque;
- nome artístico;
- categoria;
- idade pública derivada;
- classificação quando habilitada;
- ação para abrir anúncio.
### Anúncio
Pode apresentar:
- galeria;
- vídeo permitido;
- nome artístico;
- idade derivada;
- classificação;
- perfil físico/comercial;
- serviços;
- apresentação;
- contatos;
- acesso ao minisite quando disponível.
Data de nascimento nunca é pública.
### Minisite
Exclusivo do PREMIUM em `{slug}.acompanhantesex.com`. Não existe aplicação, pasta ou bundle por anunciante. O mesmo frontend resolve hostname + dados.
## 15. Planos
### STANDARD
Base comercial:
- conta;
- perfil;
- anúncio;
- card;
- contatos;
- mídia oficial permitida.
Não publica minisite e não habilita nova compra de boost.
### PREMIUM
Tudo do STANDARD +:
- minisite;
- subdomínio;
- configuração Blogger permitida;
- direito de comprar boosts.
PREMIUM não inclui boost gratuitamente.
## 16. Upgrade/downgrade
Downgrade PREMIUM→STANDARD deve ser reversível.
Preservar quando permitido:
- conta;
- perfil;
- anúncio;
- contatos;
- mídia;
- configuração minisite;
- configuração Blogger.
Desativar:
- minisite público;
- subdomínio funcional;
- Blogger no ACTS;
- novas compras de boost.
Preço, inadimplência e boost ativo no downgrade só podem ser implementados após regra aprovada.
## 17. Pagamentos e Asaas
Asaas é o gateway financeiro atual.
Regras:
- `payments.js` controla domínio financeiro;
- adapter Asaas controla protocolo externo;
- payload externo é validado/traduzido;
- resposta externa não vira estado interno automaticamente;
- webhook exige autenticidade, idempotência, correlação e transição válida;
- duplicata não duplica cobrança/entitlement/evento;
- assinatura e boost são finalidades distintas;
- nunca registrar payload sensível integral.
## 18. Mídia
Mídia oficial ACTS fica em `ACTS_MEDIA`.
Uploads validam:
- proprietário;
- autorização;
- tamanho;
- MIME;
- conteúdo permitido;
- chave gerada pelo servidor;
- bucket correto.
Limites exatos de quantidade/formato só viram regra após implementação aprovada.
Mídia controlada pelo superadmin não deve ser alterável pela anunciante quando essa política estiver configurada.
## 19. Blogger
Blogger é integração planejada para minisite PREMIUM.
Fluxo obrigatório:
```text
feed público → navegador → parsing → normalização
→ sanitização → DOM seguro
```
Backend ACTS não deve:
- fazer proxy;
- importar/sincronizar posts;
- persistir posts em D1/R2;
- enviar posts para Queue;
- criar Cron editorial;
- virar CMS do Blogger.
Conta Google e conteúdo pertencem à anunciante. Falha de CORS/segurança bloqueia implementação até nova decisão; não criar fallback backend silencioso.
## 20. Frontend
Estrutura:
```text
frontend/
├── portal/
├── minisite/
├── painel/
└── admin/
```
Regras:
- reutilizar componentes e assets;
- evitar páginas duplicadas;
- renderizar por dados;
- não acessar D1 diretamente;
- não tratar entitlement do browser como fonte de verdade;
- sanitizar conteúdo externo;
- respeitar CSP/CORS;
- compartilhar estruturas quando razoável.
## 21. Database
Estrutura:
```text
database/
├── schema.sql
└── migrations/
```
Regras:
1. D1 é autoritativo;
2. migrations são forward-only;
3. migration aplicada não é editada;
4. mudança gera nova migration;
5. testar instalação limpa e evolução;
6. SQL parametrizado;
7. produção não é alterada manualmente sem procedimento;
8. backup/restore antes de operação destrutiva;
9. nomenclatura legada pode permanecer em migration histórica.
## 22. Ambientes
Ambientes: development, staging, production.
Não presumir isolamento apenas por seções no Wrangler. Antes de escrita remota confirmar conta, ambiente, database, buckets, Queue e rotas. Staging e produção não devem compartilhar recursos por acidente.
## 23. Segurança
Obrigatório:
- secrets fora do Git;
- menor privilégio;
- validar toda entrada;
- SQL parametrizado;
- sessão protegida;
- CSRF quando aplicável;
- CORS explícito;
- rate limit quando necessário;
- webhook assinado;
- upload validado;
- log sem secret/PII;
- resposta sem stack/SQL/caminho interno;
- autorização por propriedade;
- verificar assinatura/entitlement no momento da ação;
- conteúdo externo tratado como não confiável;
- projeção pública por allowlist.
Data de nascimento é privada; idade pública é derivada.
## 24. Eventos e Queue
Criar evento somente quando houver múltiplos consumidores, desacoplamento, retry ou trabalho assíncrono real.
Mensagem preferencial:
- id;
- tipo;
- versão;
- idempotency key;
- correlationId;
- timestamp;
- referência mínima.
Não enviar blobs, mídia, linha D1 integral, segredo, PII desnecessária ou payload financeiro completo.
## 25. Logging e observabilidade
Monitorar quando aplicável:
- HTTP/latência/erros;
- D1;
- Queue backlog/retries/falhas;
- R2;
- cache hit ratio;
- publicação atrasada;
- webhooks;
- pagamentos.
Alertas precisam de limiar, responsável e ação. Incidente preserva correlação e trilha auditável.
## 26. Testes
Organizar por responsabilidade:
```text
tests/
├── core/
├── business/
├── database/
├── operations/
└── integrations/ ou gateways/ quando necessário
```
Regras:
- não criar teste só para espelhar arquivo;
- remover teste de funcionalidade removida;
- preservar cobertura útil;
- testes encerram sozinhos;
- não mascarar hang com `process.exit(0)`;
- fechar subprocessos, timers, servidores e streams.
Antes de PR:
- lint;
- testes afetados;
- suíte completa quando viável;
- Wrangler validation/dry-run;
- `git diff --check`.
## 27. GitHub e deploy
GitHub é a fonte oficial do código.
Fluxo:
```text
main → branch → mudança coesa → testes → commit
→ Pull Request → checks → merge → Workers Builds
→ deploy Cloudflare
```
Não manter código diferente apenas no dashboard Cloudflare.
`wrangler.toml` deve preservar:
```text
name = "portal"
main = "worker/index.js"
workers_dev = false
```
Dry-run deve reconhecer `ACTS_DB`, `ACTS_MEDIA`, `ACTS_DATA`, `ACTS_QUEUE`, domínio, wildcard e nenhum KV.
## 28. Código e arquivos
Regras:
- nomes claros;
- composição antes de herança/abstração inútil;
- evitar wrapper sem valor;
- evitar duplicação;
- remover código morto;
- não preservar legado por hábito;
- evitar estado global mutável;
- validar fronteiras;
- erro público deve ser seguro;
- imports refletem arquitetura atual;
- não reintroduzir `app/`.
Arquivo grande deve ser auditado por:
1. múltiplos domínios misturados;
2. código morto;
3. integração externa embutida;
4. duplicação;
5. funcionalidade futura sem uso;
6. helper que pertence ao Core;
7. responsabilidade administrativa não relacionada.
Não recriar dezenas de módulos antigos para reduzir linhas artificialmente.
## 29. Proibições arquiteturais
Não reintroduzir sem decisão nova:
- Pages-first;
- `app/` como árvore principal;
- KV obrigatório;
- Worker por funcionalidade;
- aplicação/pasta por anunciante;
- CRUD/service/repository por padrão;
- backend Blogger;
- catálogo municipal com perfil completo;
- dado privado em R2 público;
- gateway externo misturado ao domínio quando precisar isolamento;
- reescrita de migration histórica;
- edição manual de produção como fluxo normal.
## 30. Regras ainda pendentes
Não inventar enquanto não houver decisão/implementação:
- preços e ciclos;
- tolerância de inadimplência;
- taxonomia final;
- limites definitivos de mídia;
- ranking/duração de boosts;
- regra de boost ativo após downgrade;
- contratos finais de projeção;
- TTLs definitivos;
- SEO/canonical/noindex;
- política jurídica/privacidade/idade;
- prova final Blogger;
- isolamento definitivo de ambientes onde não estiver comprovado.
## 31. Nova tecnologia ou camada
Antes de adicionar novo serviço Cloudflare, KV, Durable Object, Worker, Queue, provider, pasta principal ou família de módulos, responder:
1. qual problema real resolve?
2. por que a estrutura atual não resolve?
3. custo operacional?
4. custo financeiro?
5. como testar?
6. como remover se não funcionar?
Sem resposta objetiva, não adicionar.
## 32. Regra de manutenção
Para qualquer mudança:
1. ler este arquivo;
2. verificar código atual;
3. não reabrir decisão fechada;
4. alterar só o necessário;
5. preservar bindings/rotas funcionais;
6. atualizar testes;
7. validar;
8. abrir PR;
9. atualizar este arquivo somente se a regra arquitetural mudou.
## 33. Checklist antes do merge
- [ ] Worker-first preservado.
- [ ] `app/` não voltou.
- [ ] Worker continua orquestrador.
- [ ] Core sem regra de negócio.
- [ ] Business sem dependência de HTTP.
- [ ] D1 continua fonte de verdade.
- [ ] R2 usado corretamente.
- [ ] Queue usada apenas quando necessária.
- [ ] KV não adicionado.
- [ ] dados privados não publicados.
- [ ] migrations preservadas.
- [ ] imports válidos.
- [ ] lint aprovado.
- [ ] testes aprovados e encerrando normalmente.
- [ ] `git diff --check` aprovado.
- [ ] Wrangler dry-run aprovado.
- [ ] bindings/rotas reconhecidos.
- [ ] planejado não apresentado como implementado.
## 34. Resumo executivo
```text
GitHub
→ Worker portal
→ Core
→ Business
→ D1 / R2 / Queue
→ HTTP/Edge Cache
→ Portal / Painel / Minisite / Admin
```
```text
D1         = verdade
ACTS_MEDIA = mídia
ACTS_DATA  = dados públicos derivados
ACTS_QUEUE = assíncrono
Edge Cache = distribuição
KV         = não usado
```
Filosofia:
```text
menos arquivos
menos camadas
menos duplicação
mais clareza
mais teste
mais controle
```
Este documento é a referência arquitetural principal do ACTS.
