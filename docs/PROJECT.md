# ACTS Portal

## Filosofia e Visão do Projeto

---

# O que é o ACTS

O ACTS é uma plataforma para criação de portais multisites e multidomínio construída sobre a infraestrutura Edge da Cloudflare.

Mais do que um portal, o ACTS é um microkernel capaz de suportar diferentes tipos de projetos utilizando a mesma base de código.

Toda a arquitetura foi projetada para privilegiar:

- simplicidade;
- desempenho;
- baixo custo operacional;
- reutilização de código;
- baixa complexidade;
- manutenção de longo prazo.

---

# Nossa Filosofia

O ACTS não pretende ser um clone de WordPress, Laravel ou qualquer outro framework.

O objetivo é construir uma plataforma moderna, pequena e extremamente organizada.

A prioridade nunca será ter mais recursos.

A prioridade será manter um código simples.

Sempre que existir uma escolha entre:

- mais arquivos;
- mais abstrações;
- mais padrões;

ou

- menos arquivos;
- mais reutilização;
- mais simplicidade;

a segunda opção deverá ser escolhida.

---

# Nossa Missão

Construir uma plataforma capaz de atender milhares de portais utilizando praticamente o mesmo núcleo.

Cada novo portal deve exigir configuração, não reescrita de código.

---

# Nossa Visão

O Core deve permanecer praticamente inalterado ao longo dos anos.

Toda evolução do sistema deverá acontecer através de:

- módulos;
- plugins;
- componentes;
- eventos;
- configurações.

---

# O que nunca faremos

O ACTS não será desenvolvido baseado em antecipação.

Nunca criaremos:

- arquivos porque poderão ser úteis um dia;
- módulos vazios;
- plugins vazios;
- controllers sem código;
- services sem responsabilidade real;
- abstrações para problemas inexistentes.

Cada arquivo deverá justificar sua existência.

---

# Nossa Regra de Ouro

> Arquivos são criados por necessidade, nunca por previsão.

---

# Desenvolvimento

O projeto será construído um arquivo por vez.

Fluxo oficial:

```text
Definir
    ↓
Implementar
    ↓
Revisar
    ↓
Testar
    ↓
Aprovar
    ↓
Commit
```

Somente depois iniciaremos o próximo arquivo.

---

# Responsabilidade dos Arquivos

Cada arquivo deve possuir apenas uma responsabilidade principal.

Quando um arquivo crescer além do aceitável, ele poderá ser dividido.

Nunca antes disso.

---

# Estrutura da Plataforma

O ACTS será composto por cinco grandes blocos.

```text
Core

↓

Modules

↓

Plugins

↓

Components

↓

Templates
```

Essa hierarquia nunca deve ser invertida.

---

# O Core

O Core fornece apenas infraestrutura.

Ele não conhece regras de negócio.

O Core não sabe o que é:

- anúncio;
- usuário;
- cidade;
- plano;
- pagamento;
- categoria.

Esses conceitos pertencem aos módulos.

---

# Os Módulos

Os módulos representam o domínio do sistema.

Cada módulo é responsável por uma parte do negócio.

Exemplos:

- anúncios;
- usuários;
- cidades;
- financeiro;
- planos;
- assinaturas.

---

# Os Plugins

Plugins adicionam funcionalidades opcionais.

Eles nunca alteram o Core.

Exemplos:

- SEO;
- Analytics;
- WhatsApp;
- E-mail;
- Backup;
- Integrações.

---

# Os Componentes

A interface será construída por componentes reutilizáveis.

Nunca existirão componentes específicos para cada cidade, categoria ou anunciante.

Os componentes recebem dados.

Eles não conhecem regras de negócio.

---

# Templates

Os templates definem apenas a estrutura visual.

Toda lógica pertence aos módulos e componentes.

---

# Eventos

A comunicação do sistema será orientada por eventos.

Um módulo nunca deve acessar diretamente outro módulo.

Ao invés disso, ele publica eventos.

Outros módulos decidem se desejam responder.

Essa arquitetura reduz o acoplamento e facilita a evolução do projeto.

---

# Banco de Dados

O D1 será a única fonte de verdade.

Todas as alterações ocorrerão primeiro no banco.

A publicação para o público será feita posteriormente através de JSONs.

---

# Conteúdo Público

A navegação pública deverá utilizar:

- páginas estáticas;
- cache;
- JSONs publicados;
- componentes reutilizáveis.

Sempre que possível, nenhuma consulta deverá ser realizada ao D1 durante a navegação pública.

---

# Infraestrutura

O projeto utilizará:

- Cloudflare Pages;
- Cloudflare Functions;
- D1;
- KV;
- R2;
- Queues.

Toda a arquitetura foi desenhada especificamente para esse ambiente.

---

# Gateway Financeiro

O ACTS utilizará exclusivamente o Asaas.

Não serão criadas abstrações para múltiplos gateways de pagamento.

Essa decisão reduz complexidade e facilita a manutenção.

---

# Escalabilidade

O sistema deverá crescer em funcionalidades.

Nunca em complexidade.

Adicionar um novo recurso não deve obrigar alterações profundas no Core.

---

# Objetivo Final

Ao final do desenvolvimento, o ACTS deverá possuir:

- um Core pequeno;
- módulos independentes;
- plugins opcionais;
- poucos templates;
- componentes reutilizáveis;
- documentação completa;
- uma base de código compacta e organizada.

A meta é manter o projeto abaixo de aproximadamente 100 arquivos de código, preservando clareza, desempenho e facilidade de manutenção.

---

# Compromisso

Toda decisão arquitetural deverá respeitar este documento.

Caso uma nova necessidade exija mudanças estruturais, este arquivo deverá ser atualizado antes da implementação.

O código deve seguir a arquitetura.

Nunca o contrário.

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
