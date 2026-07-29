ACTS Portal
CORE
Versão: 1.0  
Status: Oficial  
Escopo: `app/core/`
---
1. Objetivo
Este documento define a arquitetura, as responsabilidades, os limites e o funcionamento oficial do Core do Portal ACTS.
O Core é o núcleo técnico da plataforma.
Ele fornece infraestrutura reutilizável para módulos, plugins, Pages Functions, tarefas agendadas e processos de publicação.
O Core não implementa regras de negócio.
Sempre que houver conflito entre uma implementação do Core e este documento, este documento prevalece.
---
2. Princípio fundamental
O Core deve permanecer:
pequeno;
estável;
previsível;
reutilizável;
desacoplado dos domínios de negócio;
independente dos módulos;
compatível com o ambiente Cloudflare.
A pergunta obrigatória antes de adicionar qualquer recurso ao Core é:
> Esta funcionalidade é uma infraestrutura genérica necessária para diferentes partes da plataforma?
Se a resposta for não, a funcionalidade não pertence ao Core.
---
3. Responsabilidades permitidas
O Core pode fornecer infraestrutura para:
inicialização da aplicação;
configuração;
injeção de dependências;
registro de serviços;
carregamento de módulos;
carregamento de plugins;
banco de dados;
cache;
armazenamento;
filas;
eventos;
roteamento;
requisições e respostas HTTP;
autenticação técnica;
autorização técnica;
segurança;
validação estrutural;
tratamento de erros;
logging;
publicação;
renderização;
assets;
tarefas agendadas;
utilitários compartilhados.
Essas responsabilidades devem permanecer genéricas.
---
4. Responsabilidades proibidas
O Core não pode conhecer regras ou conceitos específicos de negócio.
O Core não deve saber o que é:
anúncio;
acompanhante;
perfil comercial;
categoria de anúncio;
cidade publicada;
plano comercial;
assinatura;
pagamento do cliente;
lead;
favorito;
avaliação;
campanha;
destaque;
relatório comercial;
SEO de um domínio específico.
Esses conceitos pertencem aos módulos.
Também é proibido no Core:
acessar arquivos internos de módulos;
importar módulos de negócio;
conter SQL específico de um domínio;
conter regras comerciais;
conter nomes de planos;
conter preços;
conter regras do Asaas;
montar páginas específicas de negócio;
decidir quais anúncios devem ser publicados;
definir permissões de negócio diretamente;
executar lógica específica de um portal.
---
5. Dependências
O Core não depende de módulos.
Os módulos podem depender das interfaces públicas do Core.
Fluxo permitido:
```text
Pages Functions
      ↓
Core
      ↓
Módulos
```
Fluxo de dependência do código:
```text
Módulos
      ↓
Interfaces públicas do Core
```
Fluxo proibido:
```text
Core
      ↓
Módulo de negócio
```
---
6. Estrutura oficial
A estrutura inicial prevista para o Core é:
```text
app/
└── core/
    ├── bootstrap.js
    ├── config.js
    ├── container.js
    ├── registry.js
    ├── loader.js
    ├── events.js
    ├── db.js
    ├── cache.js
    ├── storage.js
    ├── queues.js
    ├── router.js
    ├── request.js
    ├── response.js
    ├── auth.js
    ├── permissions.js
    ├── security.js
    ├── validator.js
    ├── errors.js
    ├── logger.js
    ├── publisher.js
    ├── renderer.js
    ├── scheduler.js
    ├── assets.js
    └── helpers.js
```
Esta árvore representa responsabilidades aprovadas.
Os arquivos não devem ser criados todos de uma vez.
Cada arquivo somente será criado quando sua implementação for necessária na ordem definida pelo `ROADMAP.md`.
---
7. Regra de criação de arquivos
O projeto segue desenvolvimento incremental.
Fluxo obrigatório:
definir o arquivo;
confirmar sua responsabilidade;
implementar completamente;
revisar;
testar;
aprovar;
registrar no changelog;
realizar o commit;
iniciar o próximo arquivo.
É proibido criar arquivos vazios ou estruturas antecipadas apenas para representar uma arquitetura futura.
A árvore documenta o destino arquitetural.
O repositório contém apenas o que já possui necessidade real e implementação aprovada.
---
8. Limites de código
Regras gerais:
nenhum arquivo de código deve ultrapassar aproximadamente 500 linhas;
nenhuma função deve ultrapassar aproximadamente 80 linhas;
nenhum método deve ultrapassar aproximadamente 40 linhas;
cada arquivo deve possuir uma responsabilidade principal;
funções devem ser pequenas e previsíveis;
comentários não devem esconder complexidade excessiva;
arquivos não devem ser divididos apenas para atender números artificialmente.
8.1 Exceção aprovada
O arquivo:
```text
app/core/db.js
```
possui uma exceção oficial.
Ele pode permanecer com aproximadamente 643 linhas, desde que:
mantenha uma única responsabilidade principal;
continue organizado;
não incorpore regras de negócio;
permaneça testável;
sua divisão não produza fragmentação artificial;
novas responsabilidades não sejam adicionadas apenas porque a exceção existe.
Esta exceção vale exclusivamente para `app/core/db.js`.
Ela não altera a regra geral dos demais arquivos.
---
9. APIs públicas do Core
Os módulos e demais camadas devem utilizar apenas interfaces públicas do Core.
Uma API pública deve:
possuir nome claro;
receber entradas documentadas;
retornar resultados previsíveis;
tratar erros de maneira padronizada;
evitar exposição de detalhes internos;
permanecer compatível sempre que possível.
Nenhum módulo deve acessar:
variáveis internas do Core;
caches internos não publicados;
conexões privadas;
registradores privados;
métodos prefixados ou documentados como internos;
estado mutável não exposto por contrato.
---
10. Bootstrap
Arquivo previsto:
```text
app/core/bootstrap.js
```
Responsabilidade única:
> Inicializar a aplicação e coordenar a ordem de carregamento de sua infraestrutura.
O bootstrap não implementa regras de negócio.
Fluxo oficial:
```text
Iniciar bootstrap
      ↓
Validar ambiente
      ↓
Carregar configuração
      ↓
Criar container
      ↓
Registrar serviços do Core
      ↓
Inicializar infraestrutura
      ↓
Registrar Event Bus
      ↓
Carregar plugins habilitados
      ↓
Carregar módulos habilitados
      ↓
Registrar rotas
      ↓
Inicializar tarefas necessárias
      ↓
Congelar registros essenciais
      ↓
Aplicação pronta
```
10.1 Regras do bootstrap
O bootstrap deve:
executar uma única vez por contexto de execução;
ser idempotente quando tecnicamente necessário;
falhar explicitamente quando faltar configuração obrigatória;
não esconder erros de inicialização;
não executar consultas de negócio;
não publicar conteúdo;
não criar dados de negócio;
não conter configurações fixas do ambiente.
---
11. Configuração
Arquivo previsto:
```text
app/core/config.js
```
Responsabilidade única:
> Ler, normalizar, validar e disponibilizar configurações da aplicação.
Configurações podem vir de:
bindings da Cloudflare;
variáveis de ambiente;
arquivos públicos de configuração;
configurações persistidas autorizadas;
parâmetros controlados de inicialização.
11.1 Regras
Segredos nunca devem ser versionados.
Configurações obrigatórias devem ser validadas.
Valores devem ser normalizados uma única vez.
O código não deve acessar bindings diretamente quando houver uma interface do Core.
Configurações não devem ser modificadas livremente durante a execução.
Configurações de negócio pertencem ao módulo correspondente.
11.2 Exemplos permitidos
ambiente atual;
timezone;
idioma padrão;
bindings D1, KV e R2;
fila disponível;
nível de log;
domínios permitidos;
limites técnicos;
flags de infraestrutura.
11.3 Exemplos proibidos
preço de plano;
quantidade de anúncios por plano;
regras de aprovação;
duração de destaque;
comissão comercial;
regras específicas de publicação de um módulo.
---
12. Container
Arquivo previsto:
```text
app/core/container.js
```
Responsabilidade única:
> Registrar e resolver dependências da aplicação.
O container poderá manter:
serviços;
factories;
singletons;
adapters;
interfaces;
configurações resolvidas.
12.1 Regras
registros devem possuir nomes únicos;
dependências circulares são proibidas;
sobrescritas devem ser explícitas;
serviços essenciais podem ser bloqueados após o bootstrap;
módulos não podem substituir silenciosamente serviços críticos;
o container não deve se tornar um local de estado global arbitrário.
---
13. Registry
Arquivo previsto:
```text
app/core/registry.js
```
Responsabilidade única:
> Manter registros controlados de módulos, plugins, eventos, rotas, tarefas e recursos habilitados.
O Registry não executa regras de negócio.
Ele apenas registra e fornece metadados controlados.
Pode registrar:
nome;
versão;
status;
dependências públicas;
eventos publicados;
eventos consumidos;
rotas;
tarefas;
inicializadores.
---
14. Loader
Arquivo previsto:
```text
app/core/loader.js
```
Responsabilidade única:
> Carregar módulos e plugins autorizados durante a inicialização.
O Loader deve:
respeitar a configuração de habilitação;
validar a interface mínima do item carregado;
impedir carregamentos duplicados;
registrar falhas;
preservar a ordem definida;
não alterar arquivos;
não procurar código arbitrariamente fora dos caminhos autorizados.
---
15. Event Bus
Arquivo previsto:
```text
app/core/events.js
```
Responsabilidade única:
> Publicar eventos e executar consumidores registrados.
O catálogo funcional de eventos está em `EVENTS.md`.
15.1 Estrutura mínima de evento
Todo evento deve possuir, quando aplicável:
```text
id
name
version
occurredAt
source
payload
metadata
```
15.2 Regras
eventos representam fatos ocorridos;
nomes devem utilizar PascalCase;
consumidores não devem depender de ordem implícita;
falha em um consumidor não deve corromper o evento;
consumidores devem ser idempotentes quando houver reprocessamento;
dados sensíveis devem ser minimizados;
eventos incompatíveis devem utilizar nova versão;
o Event Bus não contém lógica de negócio.
15.3 Eventos síncronos e assíncronos
Eventos internos leves podem ser executados no mesmo contexto.
Processamentos demorados, sujeitos a repetição ou independentes devem utilizar Cloudflare Queues.
O Event Bus não substitui a Queue.
A Queue não substitui o Event Bus.
---
16. Banco de dados
Arquivo previsto:
```text
app/core/db.js
```
Responsabilidade única:
> Fornecer uma interface segura e reutilizável para acesso ao Cloudflare D1.
O D1 é a única fonte oficial de verdade da plataforma.
16.1 O Core pode fornecer
execução de statements;
binding de parâmetros;
transações suportadas;
batch;
leitura de resultados;
normalização técnica;
paginação técnica;
tratamento de erros;
observabilidade;
helpers genéricos;
proteção contra SQL inseguro.
16.2 O Core não pode fornecer
consultas específicas de anúncios;
consultas específicas de usuários;
consultas específicas de pagamentos;
nomes de tabelas de domínio espalhados como regras;
decisões de negócio;
transformação de dados em entidades comerciais.
Essas consultas pertencem aos módulos ou repositórios de domínio.
16.3 Segurança
parâmetros devem utilizar binding;
concatenação insegura de SQL é proibida;
erros internos não devem ser expostos ao cliente;
credenciais nunca devem ser registradas;
queries relevantes podem gerar métricas técnicas;
migrations pertencem a `database/`.
---
17. Cache
Arquivo previsto:
```text
app/core/cache.js
```
Responsabilidade única:
> Fornecer operações genéricas de cache e invalidação.
O cache pode utilizar:
Cloudflare Cache API;
KV;
memória efêmera por execução, quando apropriado.
17.1 Regras
cache nunca é fonte de verdade;
toda entrada deve possuir estratégia de expiração;
chaves devem seguir convenção documentada;
invalidação deve ser explícita;
falha de cache não deve destruir dados oficiais;
dados sensíveis não devem ser armazenados sem necessidade;
cache privado e público devem ser separados.
---
18. Storage
Arquivo previsto:
```text
app/core/storage.js
```
Responsabilidade única:
> Fornecer uma interface genérica para armazenamento permanente de objetos no R2.
O Storage pode fornecer:
gravação;
leitura;
remoção;
metadados;
streams;
URLs controladas;
validações técnicas de objeto.
Regras de mídia, formatos comerciais e associação de arquivos a entidades pertencem aos módulos `Media` e `Upload`.
---
19. Queues
Arquivo previsto:
```text
app/core/queues.js
```
Responsabilidade única:
> Publicar e consumir mensagens técnicas por meio de Cloudflare Queues.
Pode ser utilizada para:
publicação;
processamento de mídia;
notificações;
sincronizações;
webhooks;
tarefas demoradas;
reprocessamentos.
19.1 Regras
mensagens devem possuir identificador;
consumidores devem ser idempotentes;
tentativas devem ser controladas;
falhas definitivas devem ser observáveis;
payloads devem ser pequenos;
informações sensíveis devem ser minimizadas;
uma mensagem deve representar uma tarefa clara.
---
20. Router
Arquivo previsto:
```text
app/core/router.js
```
Responsabilidade única:
> Identificar uma rota e encaminhar a requisição ao handler correspondente.
O Router pode:
registrar rotas;
validar método HTTP;
identificar parâmetros;
aplicar middlewares técnicos;
localizar handlers;
retornar erro de rota inexistente.
O Router não pode:
consultar D1;
executar regra de negócio;
montar entidades;
decidir permissões comerciais;
publicar eventos de domínio;
renderizar diretamente páginas específicas.
---
21. Request
Arquivo previsto:
```text
app/core/request.js
```
Responsabilidade única:
> Normalizar a requisição recebida.
Pode fornecer:
URL;
método;
headers;
query string;
parâmetros;
body;
cookies;
IP técnico permitido;
contexto autenticado;
metadados da Cloudflare.
Toda entrada deve ser considerada não confiável.
---
22. Response
Arquivo previsto:
```text
app/core/response.js
```
Responsabilidade única:
> Padronizar respostas HTTP.
Pode fornecer builders para:
JSON;
HTML;
texto;
redirect;
arquivo;
erro;
resposta vazia;
headers de cache;
CORS controlado.
Estrutura de erro público deve permanecer consistente.
Exemplo conceitual:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos."
  }
}
```
Detalhes internos não devem ser enviados ao cliente.
---
23. Autenticação
Arquivo previsto:
```text
app/core/auth.js
```
Responsabilidade única:
> Fornecer mecanismos técnicos para identificar a identidade ativa.
A autenticação responde:
> Quem está executando esta ação?
O Core pode fornecer:
leitura de sessão;
validação de token;
criação técnica de contexto autenticado;
expiração;
revogação técnica;
helpers de autenticação.
Fluxos de cadastro, recuperação de senha e regras específicas pertencem ao módulo `Auth`.
---
24. Autorização
Arquivo previsto:
```text
app/core/permissions.js
```
Responsabilidade única:
> Avaliar permissões já definidas por contratos e políticas autorizadas.
A autorização responde:
> Esta identidade pode executar esta ação?
O Core pode fornecer o mecanismo.
Os módulos definem as permissões de seu domínio.
Exemplo:
```text
Core:
can(identity, permission, context)

Módulo:
define quais permissões existem e quando são exigidas
```
---
25. Segurança
Arquivo previsto:
```text
app/core/security.js
```
Responsabilidade única:
> Fornecer proteções técnicas reutilizáveis.
Pode incluir:
geração segura de identificadores;
hashing;
comparação segura;
assinatura;
verificação de assinatura;
proteção de headers;
sanitização técnica;
rate limit quando aplicável;
validação de origem;
proteção de webhooks.
Segurança não deve ficar concentrada apenas neste arquivo.
Todas as camadas são responsáveis por validar entradas e proteger dados.
---
26. Validator
Arquivo previsto:
```text
app/core/validator.js
```
Responsabilidade única:
> Executar validações estruturais genéricas e schemas.
Pode validar:
tipos;
campos obrigatórios;
formatos;
limites técnicos;
estruturas JSON;
schemas documentados.
Não pode decidir:
se um anúncio pode ser publicado;
se um plano permite determinado recurso;
se um pagamento deve ser aceito;
se uma conta deve ser aprovada.
Essas são regras de negócio.
---
27. Errors
Arquivo previsto:
```text
app/core/errors.js
```
Responsabilidade única:
> Definir e normalizar erros técnicos da plataforma.
Categorias previstas:
ConfigurationError;
ValidationError;
AuthenticationError;
AuthorizationError;
NotFoundError;
ConflictError;
RateLimitError;
StorageError;
DatabaseError;
IntegrationError;
InternalError.
Cada erro deve possuir:
código;
mensagem segura;
status HTTP quando aplicável;
causa interna opcional;
metadados controlados.
---
28. Logger
Arquivo previsto:
```text
app/core/logger.js
```
Responsabilidade única:
> Registrar informações técnicas e operacionais de maneira estruturada.
Níveis previstos:
debug;
info;
warn;
error;
fatal.
Campos recomendados:
```text
timestamp
level
message
requestId
eventId
module
operation
duration
metadata
```
28.1 Dados proibidos em logs
senha;
token completo;
cookie de sessão;
segredo;
chave de API;
número completo de documento;
dados financeiros sensíveis;
payload integral de webhook quando sensível.
---
29. Publisher
Arquivo previsto:
```text
app/core/publisher.js
```
Responsabilidade única:
> Fornecer infraestrutura genérica para gerar, gravar e invalidar artefatos publicados.
O Publisher pode:
receber dados prontos;
selecionar um renderer registrado;
gerar HTML ou JSON;
gravar em KV, R2 ou destino aprovado;
atualizar manifestos;
invalidar cache;
registrar versão de publicação;
emitir resultados técnicos.
O Publisher não decide quais entidades devem ser publicadas.
Essa decisão pertence ao módulo `Publish` e aos módulos de domínio envolvidos.
---
30. Renderer
Arquivo previsto:
```text
app/core/renderer.js
```
Responsabilidade única:
> Coordenar renderização técnica de templates, layouts e componentes.
O Renderer:
recebe dados prontos;
seleciona template;
aplica layout;
compõe componentes;
retorna conteúdo renderizado.
O Renderer não:
consulta D1;
aplica regra de negócio;
escolhe planos;
aprova conteúdo;
modifica entidades.
---
31. Scheduler
Arquivo previsto:
```text
app/core/scheduler.js
```
Responsabilidade única:
> Registrar e executar tarefas agendadas autorizadas.
Pode fornecer:
registro de tarefas;
identificação de execução;
lock técnico;
controle de duplicidade;
timeout;
logging;
métricas;
despacho para Queue.
A frequência oficial é configurada pelo ambiente e pelas regras documentadas.
O Scheduler não contém a regra executada.
Ele apenas chama uma tarefa registrada.
---
32. Assets
Arquivo previsto:
```text
app/core/assets.js
```
Responsabilidade única:
> Gerenciar referências e manifestos de assets compartilhados.
Pode tratar:
CSS;
JavaScript;
ícones;
fontes autorizadas;
hashes;
versões;
URLs;
preload;
integridade.
Não deve conter lógica visual específica de um módulo.
---
33. Helpers
Arquivo previsto:
```text
app/core/helpers.js
```
Responsabilidade única:
> Disponibilizar utilitários realmente genéricos e reutilizados.
Exemplos permitidos:
datas;
strings;
URLs;
números;
identificadores;
objetos;
arrays;
normalizações simples.
33.1 Regra de contenção
`helpers.js` não deve se tornar um depósito de funções sem relação.
Quando um conjunto de helpers possuir responsabilidade própria e reutilização real, poderá ser promovido a arquivo específico mediante atualização da documentação.
Helpers nunca contêm regras de negócio.
---
34. Pages Functions
Pages Functions devem permanecer finas.
Responsabilidades permitidas:
receber requisição;
obter contexto;
chamar o bootstrap;
resolver handler;
executar módulo;
retornar resposta.
Pages Functions não devem:
conter SQL extenso;
conter regra de negócio;
implementar publicação;
integrar diretamente com Asaas;
processar mídia;
duplicar serviços do Core.
Fluxo:
```text
Pages Function
      ↓
Request normalizada
      ↓
Core
      ↓
Módulo
      ↓
Response padronizada
```
---
35. Integrações externas
Integrações externas não pertencem ao Core, salvo a infraestrutura HTTP genérica estritamente necessária.
Regras específicas ficam isoladas no módulo correspondente.
Exemplo financeiro oficial:
```text
app/modules/payments/
├── Payments.js
└── gateways/
    └── Asaas.js
```
Ou estrutura equivalente aprovada no momento da implementação.
O Asaas é o único gateway financeiro oficial.
Não será criada abstração para múltiplos gateways sem decisão arquitetural futura registrada.
---
36. Testabilidade
Cada serviço do Core deve ser testável isoladamente.
Princípios:
dependências injetáveis;
ausência de estado global descontrolado;
funções determinísticas quando possível;
adapters substituíveis em testes;
erros previsíveis;
contratos públicos estáveis;
mocks apenas nas fronteiras externas.
Tipos de teste:
testes unitários;
testes de integração com bindings simulados;
testes de contrato;
testes de bootstrap;
testes de falha;
testes de idempotência.
---
37. Estado e mutabilidade
O Core deve evitar estado mutável global.
Estado permitido deve ser:
necessário;
controlado;
encapsulado;
inicializado pelo bootstrap;
limpo ou descartável entre contextos;
seguro para o ambiente serverless.
Não se deve presumir que uma instância Cloudflare continuará ativa entre requisições.
Persistência oficial ocorre em D1, KV ou R2 conforme a responsabilidade de cada serviço.
---
38. Idempotência
Operações sujeitas a repetição devem ser idempotentes.
Exemplos:
consumo de Queue;
processamento de webhook;
publicação;
geração de sitemap;
atualização de manifesto;
tarefas Cron;
sincronizações externas.
Estratégias possíveis:
chave idempotente;
registro de processamento;
versão de artefato;
comparação de estado;
lock técnico;
operação upsert controlada.
---
39. Observabilidade
O Core deve permitir identificar:
qual operação ocorreu;
quando ocorreu;
qual contexto a iniciou;
duração;
resultado;
erro;
tentativas;
dependência utilizada.
Identificadores recomendados:
requestId;
correlationId;
eventId;
jobId;
publicationId.
Observabilidade não autoriza exposição de dados sensíveis.
---
40. Performance
O Core deve ser eficiente no ambiente Edge.
Diretrizes:
evitar inicializações desnecessárias;
minimizar consultas ao D1;
utilizar cache de forma segura;
evitar bibliotecas pesadas;
preferir JavaScript ES Modules;
reduzir serializações repetidas;
evitar payloads excessivos;
publicar artefatos incrementais;
manter Pages Functions finas;
não executar trabalho pesado durante navegação pública.
---
41. Compatibilidade Cloudflare
Todo código do Core deve ser compatível com os runtimes adotados pela Cloudflare.
Não assumir disponibilidade de:
sistema de arquivos persistente;
processos permanentes;
APIs exclusivas do Node.js sem compatibilidade confirmada;
memória compartilhada durável;
conexões tradicionais persistentes.
Bindings devem ser recebidos pelo contexto autorizado.
---
42. Nomenclatura
Regras:
arquivos JavaScript: `camelCase.js`;
classes, quando realmente necessárias: `PascalCase`;
funções e métodos: `camelCase`;
constantes: `UPPER_SNAKE_CASE`;
eventos: `PascalCase`;
códigos de erro: `UPPER_SNAKE_CASE`;
nomes devem refletir responsabilidade, não implementação acidental.
Evitar nomes genéricos como:
manager;
common;
misc;
general;
stuff;
utils2;
serviceBase.
---
43. Classes e funções
Não existe obrigação de utilizar classes.
Preferir funções e objetos simples quando forem suficientes.
Classes devem ser utilizadas quando houver:
estado encapsulado;
ciclo de vida;
múltiplas instâncias;
comportamento coerente associado ao estado.
Evitar herança profunda.
Preferir composição.
---
44. Comentários
Comentários devem explicar:
motivo;
restrição;
decisão arquitetural;
comportamento não óbvio;
risco;
compatibilidade.
Comentários não devem:
repetir o código;
justificar código confuso;
manter instruções obsoletas;
substituir documentação pública.
---
45. Tratamento de falhas
Falhas devem ser:
detectadas;
classificadas;
registradas;
convertidas em resposta segura;
reprocessadas quando apropriado;
isoladas quando possível.
É proibido:
capturar erro e ignorar;
retornar stack trace ao cliente;
transformar todo erro em sucesso;
registrar segredos;
repetir indefinidamente uma operação com falha.
---
46. Segurança por padrão
Toda API pública do Core deve adotar segurança por padrão.
Isso inclui:
negar quando não houver autorização;
validar entradas;
limitar exposição;
usar bindings seguros;
sanitizar saídas quando necessário;
proteger headers;
evitar mensagens internas;
aplicar princípio do menor privilégio.
---
47. Evolução do Core
Uma alteração no Core exige:
justificar por que a funcionalidade é infraestrutura comum;
verificar se não pertence a módulo, plugin ou componente;
avaliar impacto em todas as dependências;
atualizar este documento;
atualizar `ARCHITECTURE.md` quando necessário;
atualizar `TREE.md` se houver mudança estrutural;
atualizar `CHANGELOG.md`;
criar ou atualizar testes;
revisar compatibilidade;
aprovar antes do commit.
---
48. Critérios para dividir um arquivo
Um arquivo pode ser dividido quando:
possuir mais de uma responsabilidade principal;
tornar-se difícil de testar;
apresentar alto acoplamento interno;
ultrapassar limites sem justificativa;
possuir partes reutilizadas independentemente;
exigir ciclos de vida diferentes.
Um arquivo não deve ser dividido apenas para:
obedecer uma estética;
criar muitas pastas;
antecipar crescimento;
imitar frameworks externos;
reduzir artificialmente contagem de linhas.
---
49. Critérios para adicionar um novo serviço
Um novo serviço do Core somente pode ser criado quando:
houver necessidade concreta;
mais de uma parte da plataforma precisar dele;
a responsabilidade for técnica e genérica;
não houver serviço existente adequado;
sua interface pública puder ser definida;
sua testabilidade estiver clara;
a documentação for atualizada.
---
50. Ordem inicial de implementação
A ordem exata deve seguir o `ROADMAP.md`.
Como referência estrutural, a fundação tende a seguir:
```text
1. config.js
2. errors.js
3. logger.js
4. container.js
5. registry.js
6. events.js
7. db.js
8. cache.js
9. storage.js
10. queues.js
11. request.js
12. response.js
13. router.js
14. security.js
15. auth.js
16. permissions.js
17. validator.js
18. renderer.js
19. publisher.js
20. scheduler.js
21. loader.js
22. bootstrap.js
```
Esta lista não autoriza criação antecipada.
Antes da implementação, a ordem deve ser comparada com o `ROADMAP.md` oficial existente no repositório.
---
51. Critérios de aceitação do Core
O Core será considerado arquiteturalmente correto quando:
não contiver regras de negócio;
não depender de módulos;
expuser interfaces públicas claras;
funcionar no runtime Cloudflare;
utilizar D1 como fonte de verdade;
diferenciar D1, KV e R2 corretamente;
possuir tratamento de erros padronizado;
possuir logging seguro;
permitir testes isolados;
suportar carregamento controlado de módulos;
suportar Event Bus;
manter Pages Functions finas;
respeitar os limites de código;
documentar qualquer exceção;
permanecer compreensível.
---
52. Checklist de revisão de cada arquivo
Antes da aprovação de um arquivo do Core, verificar:
[ ] possui uma responsabilidade principal;
[ ] não contém regra de negócio;
[ ] não importa módulo;
[ ] não expõe detalhes internos sem necessidade;
[ ] entradas são validadas;
[ ] erros são padronizados;
[ ] dados sensíveis não são registrados;
[ ] funciona no ambiente Cloudflare;
[ ] possui testes adequados;
[ ] respeita os limites de tamanho;
[ ] comentários explicam decisões reais;
[ ] não duplica funcionalidade;
[ ] documentação está atualizada;
[ ] foi revisado antes do commit.
---
53. Autoridade documental
A interpretação do Core deve respeitar esta ordem:
`ARCHITECTURE.md`;
`CORE.md`;
`TREE.md`;
`ROADMAP.md`;
`CLOUDFLARE.md`;
`EVENTS.md`;
`SCHEMAS.md`;
contratos e documentação específica do arquivo;
implementação.
Se houver contradição, a documentação superior deve ser corrigida ou a implementação deve ser ajustada antes de continuar.
Nenhum código existente possui autoridade para alterar sozinho a arquitetura oficial.
---
54. Regra final
O Core existe para manter a plataforma simples.
Ele não é o lugar onde todas as funcionalidades devem ser colocadas.
O crescimento do ACTS deve acontecer principalmente por módulos, plugins, componentes, templates, eventos e configuração.
O Core deve permanecer pequeno, estável e praticamente imutável.
Quando houver dúvida sobre onde uma funcionalidade pertence, ela deve permanecer fora do Core até que sua responsabilidade seja claramente comprovada e documentada.
