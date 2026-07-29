# ACTS Portal

# EVENT BUS

Versão: 1.0  
Status: Oficial  
Escopo: `app/core/events.js`

---

# 1. Objetivo

Este documento define o funcionamento oficial do Event Bus do Portal ACTS.

O Event Bus é a infraestrutura responsável por registrar, publicar e entregar eventos entre módulos, plugins e serviços da plataforma.

O catálogo funcional dos eventos permanece em:

```text
docs/EVENTS.md
```

Este documento define como esses eventos são transportados, validados, processados, observados e versionados.

---

# 2. Princípio fundamental

O Event Bus existe para desacoplar produtores e consumidores.

O produtor publica um fato.

O consumidor reage ao fato.

O produtor não conhece:

- quais consumidores existem;
- quantos consumidores existem;
- em qual ordem serão executados;
- como cada consumidor implementa sua ação;
- se o processamento ocorrerá no mesmo contexto ou por Queue.

Fluxo conceitual:

```text
Produtor
   ↓
Evento
   ↓
Event Bus
   ↓
Consumidores registrados
```

---

# 3. Eventos representam fatos

Eventos devem representar algo que já aconteceu.

Exemplos corretos:

```text
UserCreated
ListingPublished
PaymentReceived
SubscriptionCancelled
```

Exemplos incorretos:

```text
CreateUser
PublishListing
ReceivePayment
CancelSubscription
```

Comandos solicitam uma ação.

Eventos registram um fato ocorrido.

O Event Bus oficial trabalha com eventos.

---

# 4. Responsabilidades do Event Bus

O Event Bus pode:

- registrar consumidores;
- validar eventos;
- publicar eventos;
- entregar eventos;
- aplicar filtros técnicos;
- controlar prioridades explícitas;
- registrar tentativas;
- gerar identificadores;
- propagar correlação;
- isolar falhas;
- encaminhar eventos para Queue;
- registrar métricas;
- aplicar idempotência técnica;
- rejeitar eventos inválidos.

O Event Bus não pode:

- implementar regra de negócio;
- decidir se uma entidade pode ser criada;
- decidir se um pagamento deve ser aceito;
- alterar dados de domínio diretamente;
- consultar tabelas específicas sem contrato;
- substituir serviços de módulo;
- esconder falhas de negócio;
- garantir ordenação global implícita.

---

# 5. Estrutura oficial de um evento

Todo evento deve possuir uma estrutura padronizada.

Exemplo conceitual:

```json
{
  "id": "evt_01J...",
  "name": "ListingPublished",
  "version": "1.0",
  "occurredAt": "2026-07-29T18:00:00.000Z",
  "source": "listings",
  "payload": {},
  "metadata": {
    "requestId": "req_01J...",
    "correlationId": "cor_01J...",
    "causationId": "evt_01J...",
    "actorId": "usr_01J...",
    "tenantId": "site_01J..."
  }
}
```

---

# 6. Campos obrigatórios

## 6.1 id

Identificador único do evento.

Regras:

- imutável;
- único;
- gerado uma única vez;
- preservado em reprocessamentos;
- utilizado para idempotência e rastreabilidade.

---

## 6.2 name

Nome oficial do evento.

Regras:

- PascalCase;
- deve existir em `EVENTS.md`;
- não pode ser alterado silenciosamente;
- deve representar um fato ocorrido.

---

## 6.3 version

Versão do contrato do evento.

Formato inicial:

```text
1.0
```

Mudanças incompatíveis exigem nova versão.

---

## 6.4 occurredAt

Data e hora em UTC em que o fato ocorreu.

Formato:

```text
ISO 8601
```

Exemplo:

```text
2026-07-29T18:00:00.000Z
```

---

## 6.5 source

Identificador do módulo, plugin ou serviço que publicou o evento.

Exemplos:

```text
users
listings
payments
publish
```

---

## 6.6 payload

Dados funcionais mínimos necessários para os consumidores.

O payload não deve carregar:

- dados desnecessários;
- segredos;
- tokens;
- senhas;
- payloads completos de integrações sem necessidade;
- objetos excessivamente grandes;
- estados internos privados.

---

## 6.7 metadata

Informações técnicas de contexto.

Campos permitidos:

- requestId;
- correlationId;
- causationId;
- actorId;
- tenantId;
- traceId;
- attempt;
- environment.

Metadados não substituem o payload funcional.

---

# 7. Identificadores de correlação

## 7.1 requestId

Identifica a requisição HTTP que iniciou o fluxo.

## 7.2 correlationId

Agrupa todas as operações relacionadas ao mesmo fluxo funcional.

## 7.3 causationId

Identifica o evento ou comando que causou o evento atual.

Exemplo:

```text
PaymentReceived
    ↓
SubscriptionActivated
```

O `SubscriptionActivated` pode registrar o `PaymentReceived` como `causationId`.

## 7.4 eventId

É o próprio campo `id` do evento.

---

# 8. Publicação síncrona

A publicação síncrona ocorre no mesmo contexto de execução.

Indicada para:

- listeners leves;
- validações técnicas pós-operação;
- atualização de métricas em memória;
- registro de logs;
- tarefas rápidas e determinísticas;
- notificações internas que não exigem persistência.

Fluxo:

```text
Produtor
   ↓
Event Bus
   ↓
Consumidor
   ↓
Resposta ao produtor
```

## 8.1 Regras

- consumidores devem ser rápidos;
- não executar tarefas pesadas;
- não realizar processamento prolongado;
- não bloquear navegação pública;
- falhas devem ser tratadas conforme a política do evento;
- o tempo total deve permanecer controlado.

---

# 9. Publicação assíncrona

A publicação assíncrona utiliza Cloudflare Queues.

Indicada para:

- publicação de artefatos;
- processamento de mídia;
- envio de notificações;
- sincronização externa;
- webhooks;
- geração de relatórios;
- tarefas demoradas;
- operações sujeitas a retry;
- processamento independente da resposta HTTP.

Fluxo:

```text
Produtor
   ↓
Event Bus
   ↓
Queue
   ↓
Consumer
   ↓
Handler registrado
```

---

# 10. Relação entre Event Bus e Queue

O Event Bus e a Queue possuem responsabilidades diferentes.

## Event Bus

Responsável por:

- contratos de eventos;
- registro de listeners;
- publicação;
- entrega;
- correlação;
- observabilidade;
- roteamento lógico.

## Queue

Responsável por:

- transporte assíncrono;
- persistência temporária da mensagem;
- tentativas;
- atraso;
- redelivery;
- escalabilidade.

Regra:

> O Event Bus define o significado e o destino lógico. A Queue fornece o transporte assíncrono.

---

# 11. Registro de consumidores

Consumidores devem ser registrados explicitamente.

Exemplo conceitual:

```js
events.subscribe("ListingPublished", {
  id: "publish-listing-page",
  version: "1.0",
  priority: 100,
  async: true,
  handler: handleListingPublished
});
```

Campos recomendados:

- id;
- event;
- version;
- priority;
- async;
- handler;
- filter;
- retryPolicy;
- idempotent.

---

# 12. Identidade do consumidor

Todo consumidor deve possuir identificador único.

Exemplo:

```text
publish-listing-page
analytics-listing-published
notify-owner-listing-published
```

O identificador é utilizado para:

- logs;
- métricas;
- idempotência;
- diagnóstico;
- controle de tentativas;
- prevenção de registro duplicado.

---

# 13. Prioridade

Prioridade somente deve ser utilizada quando houver necessidade real.

Escala recomendada:

```text
100 = alta
500 = normal
900 = baixa
```

A prioridade não garante ordem global entre consumidores assíncronos.

Ela apenas ajuda a ordenar consumidores dentro do mesmo contexto controlado.

Não criar dependência de negócio baseada apenas em prioridade.

Quando uma ação depender obrigatoriamente de outra, deve existir:

- evento subsequente;
- contrato explícito;
- workflow documentado;
- serviço orquestrador.

---

# 14. Filtros

Consumidores podem declarar filtros técnicos.

Exemplo conceitual:

```js
filter(event) {
  return event.payload.status === "published";
}
```

Regras:

- filtros devem ser determinísticos;
- filtros não devem executar queries pesadas;
- filtros não devem alterar o evento;
- filtros não substituem regras de negócio;
- filtros devem ser testáveis.

---

# 15. Imutabilidade

Eventos são imutáveis após publicação.

Consumidores não podem:

- alterar o payload original;
- alterar metadados;
- alterar a versão;
- reutilizar o mesmo objeto mutável para outro evento;
- modificar o evento para afetar consumidores seguintes.

Quando um novo fato ocorrer, deve ser criado um novo evento.

---

# 16. Versionamento

Eventos adotam versionamento explícito.

Exemplo:

```text
ListingPublished v1.0
ListingPublished v2.0
```

## 16.1 Mudanças compatíveis

Podem manter a mesma versão minor quando:

- adicionam campo opcional;
- adicionam metadata opcional;
- ampliam enum sem quebrar consumidores;
- preservam estrutura existente.

## 16.2 Mudanças incompatíveis

Exigem nova versão major quando:

- removem campo;
- renomeiam campo;
- mudam tipo;
- alteram significado;
- mudam estrutura;
- tornam campo opcional em obrigatório;
- alteram semântica do evento.

---

# 17. Compatibilidade de consumidores

Consumidores devem declarar quais versões aceitam.

Exemplo:

```text
ListingPublished >=1.0 <2.0
```

O Event Bus deve rejeitar:

- consumidor incompatível;
- evento sem versão;
- versão desconhecida;
- contrato inválido.

---

# 18. Idempotência

Consumidores assíncronos devem ser idempotentes quando houver possibilidade de reentrega.

Uma mesma mensagem pode ser processada mais de uma vez.

Estratégias:

- chave por `event.id + consumer.id`;
- tabela de processamento;
- upsert controlado;
- comparação de versão;
- lock técnico;
- operação naturalmente idempotente.

Exemplo conceitual de chave:

```text
evt_01J...:publish-listing-page
```

---

# 19. Registro de processamento

Quando necessário, o sistema pode registrar:

```text
eventId
consumerId
status
attempt
startedAt
completedAt
errorCode
```

Estados sugeridos:

- pending;
- processing;
- completed;
- failed;
- dead_lettered;
- skipped.

Esse registro é técnico e não substitui dados de negócio.

---

# 20. Tentativas

Política recomendada:

- tentativa inicial;
- retry com atraso progressivo;
- limite máximo;
- envio para dead letter quando disponível;
- alerta operacional em falha definitiva.

Exemplo conceitual:

```text
1ª tentativa: imediata
2ª tentativa: após atraso curto
3ª tentativa: atraso progressivo
4ª tentativa: atraso maior
Falha final: dead letter
```

A quantidade exata deve ser configurável.

---

# 21. Backoff

Retries devem utilizar backoff controlado.

Estratégias possíveis:

- linear;
- exponencial;
- exponencial com jitter.

Recomendação:

```text
backoff exponencial com jitter
```

Evitar retries simultâneos que ampliem uma indisponibilidade externa.

---

# 22. Dead Letter

Eventos que excederem o limite de tentativas devem ser encaminhados para tratamento de falha definitiva quando a infraestrutura permitir.

Informações mínimas:

- evento original;
- consumidor;
- tentativas;
- erro final;
- data;
- correlação;
- ambiente.

A dead letter não deve expor segredos.

---

# 23. Reprocessamento

Reprocessamento deve ser explícito e auditável.

Regras:

- preservar o `event.id`;
- incrementar tentativa;
- registrar operador ou origem;
- validar compatibilidade atual;
- respeitar idempotência;
- evitar reprocessamento infinito;
- registrar resultado.

---

# 24. Tratamento de falhas

Falhas devem ser classificadas.

Categorias:

- erro temporário;
- erro permanente;
- erro de contrato;
- erro de autenticação;
- erro de autorização;
- erro de dependência;
- erro de integração;
- erro interno;
- evento inválido.

## 24.1 Erro temporário

Pode gerar retry.

Exemplos:

- indisponibilidade externa;
- timeout;
- rate limit;
- falha transitória de rede.

## 24.2 Erro permanente

Não deve ser repetido indefinidamente.

Exemplos:

- payload inválido;
- versão incompatível;
- entidade inexistente sem possibilidade de correção;
- permissão negada;
- configuração ausente.

---

# 25. Isolamento de falhas

Um consumidor não deve impedir outros consumidores independentes.

Fluxo desejado:

```text
Evento
 ├── Consumidor A → sucesso
 ├── Consumidor B → falha
 └── Consumidor C → sucesso
```

A falha do consumidor B deve ser registrada e tratada de forma isolada.

Exceções somente quando o fluxo for explicitamente transacional e síncrono.

---

# 26. Eventos críticos

Eventos críticos devem possuir política específica.

Exemplos:

- PaymentReceived;
- SubscriptionActivated;
- UserDeleted;
- ListingDeleted;
- PublishCompleted.

Podem exigir:

- persistência do evento;
- idempotência obrigatória;
- auditoria;
- retry;
- dead letter;
- alerta;
- reconciliação.

---

# 27. Persistência de eventos

O Event Bus não exige Event Sourcing completo.

Entretanto, eventos críticos podem ser persistidos para:

- auditoria;
- idempotência;
- reconciliação;
- diagnóstico;
- reprocessamento.

D1 continua sendo a fonte oficial de verdade.

O log de eventos é um registro técnico ou histórico, não substituto das entidades de domínio.

---

# 28. Limite de payload

Eventos devem transportar apenas dados necessários.

Diretrizes:

- evitar objetos completos;
- preferir identificadores;
- evitar binários;
- não incluir arquivos;
- não incluir imagens codificadas;
- não incluir respostas integrais de APIs;
- respeitar limites da Queue;
- manter serialização eficiente.

Arquivos devem permanecer em R2.

O evento deve transportar apenas referências.

---

# 29. Dados sensíveis

Nunca incluir:

- senha;
- token completo;
- segredo;
- chave de API;
- cookie;
- dados completos de cartão;
- documento pessoal sem necessidade;
- payload integral sensível de webhook;
- credenciais.

Quando necessário, transportar:

- identificador;
- hash;
- referência;
- valor mascarado;
- metadado mínimo.

---

# 30. Segurança

O Event Bus deve:

- validar origem;
- validar contrato;
- validar versão;
- limitar payload;
- proteger eventos administrativos;
- controlar publicação externa;
- impedir registro duplicado;
- registrar ações sensíveis;
- aplicar menor privilégio;
- rejeitar eventos desconhecidos.

Eventos externos nunca devem entrar diretamente no Event Bus sem validação e tradução.

Fluxo correto:

```text
Webhook externo
   ↓
Validação de assinatura
   ↓
Normalização
   ↓
Regra do módulo
   ↓
Evento interno
```

---

# 31. Eventos externos

Eventos de fornecedores devem ser tratados por adapters ou gateways.

Exemplo:

```text
Webhook Asaas
   ↓
Asaas.js
   ↓
Payments
   ↓
PaymentReceived
   ↓
Event Bus
```

O payload externo não se torna automaticamente um evento interno.

---

# 32. Nomenclatura

Eventos:

```text
PascalCase
```

Consumidores:

```text
kebab-case
```

Exemplos:

```text
ListingPublished
publish-listing-page
notify-listing-owner
```

Filas e tópicos devem possuir nomes técnicos claros e estáveis.

---

# 33. Registro duplicado

O mesmo consumidor não pode ser registrado duas vezes para o mesmo evento e versão.

O Event Bus deve rejeitar duplicidade de:

- consumer.id;
- combinação evento + consumidor;
- rota assíncrona equivalente;
- handler sem identidade.

---

# 34. Inicialização

O Event Bus deve ser inicializado durante o bootstrap.

Ordem recomendada:

```text
Config
   ↓
Logger
   ↓
Container
   ↓
Registry
   ↓
Event Bus
   ↓
Módulos
   ↓
Plugins
   ↓
Consumidores registrados
   ↓
Aplicação pronta
```

Eventos não devem ser publicados antes da conclusão do registro essencial.

---

# 35. API pública conceitual

A API pública pode oferecer:

```js
events.subscribe(eventName, consumer);
events.unsubscribe(eventName, consumerId);
events.publish(event);
events.publishAsync(event);
events.hasSubscribers(eventName);
events.listSubscribers(eventName);
events.validate(event);
```

A implementação final deve seguir as necessidades reais e o `CORE.md`.

---

# 36. Publicação

Exemplo conceitual:

```js
await events.publish({
  name: "ListingPublished",
  version: "1.0",
  source: "listings",
  payload: {
    listingId: "lst_01J..."
  },
  metadata: {
    requestId,
    correlationId,
    actorId
  }
});
```

O Event Bus deve completar campos técnicos autorizados quando necessário, como:

- id;
- occurredAt;
- attempt;
- environment.

---

# 37. Consumidor

Exemplo conceitual:

```js
async function handleListingPublished(event, context) {
  const { listingId } = event.payload;

  await context.publisher.publish({
    type: "listing",
    id: listingId
  });
}
```

O consumidor deve:

- validar os dados necessários;
- não alterar o evento;
- tratar idempotência;
- lançar erro classificado;
- registrar resultado;
- respeitar timeout.

---

# 38. Timeouts

Consumidores devem possuir timeout adequado.

Tarefas longas devem ser encaminhadas para Queue.

O Event Bus síncrono não deve aguardar operações demoradas sem justificativa.

Timeouts devem gerar erro técnico classificável e observável.

---

# 39. Concorrência

Consumidores não devem presumir execução exclusiva.

Devem considerar:

- processamento paralelo;
- eventos fora de ordem;
- reentrega;
- duplicidade;
- concorrência entre workers;
- atualização simultânea.

Quando exclusividade for necessária, utilizar:

- lock técnico;
- chave idempotente;
- versão;
- transação suportada;
- Durable Object somente se formalmente aprovado.

---

# 40. Ordenação

O Event Bus não garante ordenação global.

Quando a ordem for essencial:

- usar sequência explícita;
- incluir versão ou número de sequência;
- validar estado atual no D1;
- publicar evento subsequente;
- utilizar fila dedicada quando necessário;
- documentar o workflow.

Nunca depender apenas do horário de chegada.

---

# 41. Eventos fora de ordem

Consumidores devem ser capazes de detectar eventos antigos ou incompatíveis.

Estratégias:

- versionamento da entidade;
- `updatedAt`;
- número de sequência;
- comparação com estado atual;
- descarte controlado;
- reprocessamento.

---

# 42. Observabilidade

Toda publicação deve permitir registrar:

- eventId;
- eventName;
- version;
- source;
- correlationId;
- causationId;
- consumerId;
- attempt;
- duration;
- status;
- errorCode.

Métricas recomendadas:

- eventos publicados;
- eventos processados;
- falhas;
- retries;
- dead letters;
- tempo médio;
- consumidores lentos;
- eventos sem consumidores.

---

# 43. Eventos sem consumidores

Eventos sem consumidores podem ser válidos.

O Event Bus deve registrar essa condição quando relevante.

Políticas possíveis:

- ignorar silenciosamente em ambiente produtivo controlado;
- registrar em debug;
- alertar para eventos críticos;
- rejeitar apenas quando o contrato exigir consumidor obrigatório.

---

# 44. Logs

Logs devem ser estruturados.

Exemplo conceitual:

```json
{
  "level": "info",
  "message": "Event processed",
  "eventId": "evt_01J...",
  "eventName": "ListingPublished",
  "consumerId": "publish-listing-page",
  "duration": 42,
  "status": "completed"
}
```

Nunca registrar payload sensível integralmente.

---

# 45. Métricas

Métricas devem permitir responder:

- quantos eventos foram publicados;
- quantos falharam;
- quais consumidores estão lentos;
- quantos retries ocorreram;
- quantos eventos foram para dead letter;
- quais eventos não possuem consumidores;
- quais versões ainda estão em uso.

---

# 46. Testes

O Event Bus deve possuir testes para:

- registro;
- remoção;
- duplicidade;
- publicação;
- múltiplos consumidores;
- prioridade;
- filtros;
- falha isolada;
- evento inválido;
- versão incompatível;
- idempotência;
- retry;
- reprocessamento;
- correlação;
- payload imutável;
- publicação assíncrona;
- consumidor inexistente.

---

# 47. Teste de contrato

Cada evento deve possuir teste de contrato.

O teste deve validar:

- nome;
- versão;
- campos obrigatórios;
- tipos;
- payload;
- metadata;
- compatibilidade;
- serialização.

Schemas de eventos podem permanecer em:

```text
app/contracts/events/
```

ou no local definido por `CONTRACTS.md`.

---

# 48. Compatibilidade Cloudflare

A implementação deve considerar:

- ambiente serverless;
- ausência de processo permanente;
- memória efêmera;
- execução concorrente;
- limites de CPU;
- limites de payload;
- Cloudflare Queues;
- bindings por contexto;
- ausência de garantia de instância persistente.

O registro de consumidores deve ser reconstruível durante o bootstrap.

---

# 49. Performance

Diretrizes:

- indexar consumidores por nome do evento;
- evitar buscas lineares desnecessárias;
- validar contratos eficientemente;
- evitar cópias excessivas de payload;
- não carregar bibliotecas pesadas;
- não publicar eventos redundantes;
- evitar consultas ao D1 para simples roteamento;
- encaminhar tarefas pesadas para Queue.

---

# 50. Governança de novos eventos

Antes de criar um novo evento:

1. confirmar que representa um fato;
2. identificar o módulo proprietário;
3. definir nome;
4. definir versão;
5. definir payload mínimo;
6. definir metadata necessária;
7. definir consumidores esperados;
8. definir sincronismo;
9. definir idempotência;
10. definir política de retry;
11. atualizar `EVENTS.md`;
12. atualizar contratos;
13. atualizar testes;
14. atualizar `CHANGELOG.md`.

---

# 51. Critérios de aceitação

O Event Bus será considerado correto quando:

- não contiver regras de negócio;
- produtores não conhecerem consumidores;
- eventos forem imutáveis;
- contratos forem versionados;
- consumidores forem identificáveis;
- falhas forem isoladas;
- processamento assíncrono utilizar Queue;
- consumidores críticos forem idempotentes;
- retries forem controlados;
- correlação estiver disponível;
- dados sensíveis forem protegidos;
- testes cobrirem cenários críticos;
- funcionar no runtime Cloudflare.

---

# 52. Checklist de revisão

- [ ] evento representa fato ocorrido;
- [ ] nome consta em `EVENTS.md`;
- [ ] versão foi definida;
- [ ] payload é mínimo;
- [ ] não contém segredos;
- [ ] source foi informado;
- [ ] correlationId é propagado;
- [ ] consumidor possui id único;
- [ ] sincronismo foi justificado;
- [ ] operação pesada usa Queue;
- [ ] idempotência foi analisada;
- [ ] retry foi definido;
- [ ] falhas são isoladas;
- [ ] compatibilidade foi testada;
- [ ] logs são seguros;
- [ ] métricas foram previstas;
- [ ] documentação foi atualizada;
- [ ] changelog foi atualizado.

---

# 53. Autoridade documental

A interpretação do Event Bus deve respeitar esta ordem:

1. `ARCHITECTURE.md`;
2. `CORE.md`;
3. `EVENT_BUS.md`;
4. `EVENTS.md`;
5. `CONTRACTS.md`;
6. `INTERFACES.md`;
7. `CLOUDFLARE.md`;
8. contrato específico do evento;
9. implementação.

Em caso de contradição, a documentação deve ser corrigida antes de continuar.

---

# 54. Regra final

O Event Bus existe para desacoplar a plataforma.

Ele não é um atalho para esconder dependências, nem um substituto para contratos claros.

Eventos devem ser fatos imutáveis, mínimos, versionados, observáveis e seguros.

Consumidores devem ser independentes, idempotentes quando necessário e preparados para falhas, repetição, concorrência e processamento fora de ordem.

Toda comunicação orientada a eventos do Portal ACTS deve seguir este documento.
