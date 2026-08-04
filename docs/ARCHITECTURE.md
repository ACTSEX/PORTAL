ACTS Portal
Arquitetura Oficial da Plataforma
Versão: 1.0  
Status: Oficial
---
1. Objetivo
Este documento define a arquitetura oficial do Portal ACTS.
Todas as decisões técnicas, estruturais e organizacionais do projeto devem seguir este documento.
Sempre que houver conflito entre implementação e arquitetura, este documento prevalece.
O código implementa a arquitetura.
A arquitetura não deve ser alterada apenas para acomodar código existente.
---
2. Objetivos da Arquitetura
A arquitetura foi projetada para atender cinco objetivos principais.
2.1 Simplicidade
A plataforma deve ser simples de entender.
Sempre que existirem duas soluções equivalentes, deve ser escolhida a menos complexa.
Complexidade desnecessária é considerada dívida técnica.
2.2 Escalabilidade
O crescimento do sistema deve ocorrer pela adição de módulos e funcionalidades, e não pelo aumento da complexidade do Core.
2.3 Manutenção
A manutenção deve ser previsível.
Arquivos pequenos, responsabilidades claras e baixo acoplamento reduzem o custo de evolução do projeto.
2.4 Reutilização
Sempre que possível, uma solução deve ser reutilizada antes de uma nova implementação.
Duplicação de código deve ser evitada.
2.5 Desempenho
Toda a arquitetura foi desenhada para operar de forma eficiente na infraestrutura da Cloudflare.
A navegação pública deve exigir o mínimo possível de processamento e consultas ao banco de dados.
---
3. Filosofia da Plataforma
O ACTS segue uma arquitetura baseada em microkernel.
O núcleo permanece pequeno e estável.
As funcionalidades evoluem por meio de módulos, plugins, componentes, eventos e configurações.
O objetivo é permitir crescimento contínuo sem comprometer a estabilidade do sistema.
---
4. Princípios Arquiteturais
4.1 Core pequeno
O Core deve conter apenas infraestrutura comum.
Ele não implementa regras de negócio.
4.2 Separação de responsabilidades
Cada arquivo possui uma responsabilidade principal.
Cada módulo possui um domínio claramente definido.
4.3 Baixo acoplamento
Os módulos não devem depender diretamente uns dos outros.
A comunicação ocorre por contratos públicos e eventos.
4.4 Alta coesão
Tudo que pertence ao mesmo domínio deve permanecer junto.
Responsabilidades não devem ser espalhadas por diferentes partes da aplicação sem necessidade.
4.5 Configuração acima de código
Sempre que possível, comportamento deve ser definido por configuração.
Não deve ser criado código novo quando uma configuração resolver o problema.
4.6 Evolução incremental
O projeto será desenvolvido por lotes funcionais ordenados no `ROADMAP.md`.
Arquivos do mesmo lote podem ser implementados, testados, commitados e revisados juntos; nenhum arquivo de lote futuro será antecipado.
---
5. Arquitetura Geral
A plataforma é organizada em cinco grandes camadas:
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
Cada camada possui responsabilidades específicas.
Nenhuma camada deve assumir responsabilidades da outra.
---
6. Core
O Core representa o núcleo da plataforma.
Seu objetivo é fornecer infraestrutura reutilizável para todo o sistema.
O Core não possui conhecimento sobre regras de negócio.
Ele não sabe o que é:
anúncio;
imóvel;
usuário;
cidade;
categoria;
assinatura;
pagamento.
Esses conceitos pertencem aos módulos.
6.1 Responsabilidades do Core
O Core poderá conter apenas funcionalidades de infraestrutura, como:
inicialização da aplicação;
carregamento de módulos;
carregamento de plugins;
roteamento;
autenticação;
autorização;
configuração;
cache;
renderização;
eventos;
armazenamento;
publicação;
banco de dados;
logging;
utilitários compartilhados.
Qualquer responsabilidade além dessas deverá ser avaliada antes de ser incorporada ao Core.
---
7. Módulos
Os módulos representam o domínio do negócio.
Cada módulo é responsável por uma funcionalidade específica da plataforma.
Exemplos:
anúncios;
usuários;
planos;
financeiro;
SEO;
mídia;
notificações;
busca.
Os módulos podem utilizar serviços do Core, mas nunca alterar diretamente seu comportamento interno.
7.1 Características dos Módulos
Cada módulo deve:
possuir responsabilidade principal clara;
expor apenas interfaces públicas necessárias;
emitir eventos quando ocorrerem alterações relevantes;
evitar dependências diretas de outros módulos;
manter regras de negócio dentro do próprio domínio.
---
8. Plugins
Plugins adicionam funcionalidades opcionais.
Sua instalação ou remoção não deve exigir alterações no Core.
Plugins são carregados durante a inicialização da aplicação.
Eles podem registrar:
eventos;
comandos;
serviços;
integrações;
configurações;
tarefas.
Plugins nunca devem modificar arquivos do Core.
---
9. Componentes
Componentes representam elementos reutilizáveis da interface.
Exemplos:
cards;
tabelas;
formulários;
modais;
galerias;
menus;
paginação.
Componentes recebem dados.
Eles não implementam regras de negócio.
---
10. Templates
Templates definem apenas a estrutura visual das páginas.
Toda regra de negócio pertence aos módulos.
Toda lógica visual reutilizável pertence aos componentes.
Templates não devem acessar diretamente o banco de dados.
---
11. Comunicação entre Camadas
A comunicação estrutural ocorre de cima para baixo:
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
Eventos podem trafegar entre partes da plataforma, desde que respeitem os contratos públicos definidos.
---
12. Regra Fundamental
A arquitetura deve permanecer compreensível durante toda a vida do projeto.
Sempre que uma implementação aumentar significativamente a complexidade da plataforma, ela deverá ser reavaliada antes de ser incorporada.
A simplicidade é um requisito arquitetural permanente.
---
13. Estrutura do Core
O Core é o único elemento obrigatório da plataforma.
Todos os demais recursos dependem dele.
Sua principal responsabilidade é fornecer infraestrutura comum para módulos, plugins e interface.
O Core deve permanecer pequeno, estável e previsível.
---
14. Organização do Core
O Core será organizado em áreas funcionais:
```text
Core
├── Config
├── Application
├── Router
├── Events
├── Storage
├── Cache
├── Database
├── Authentication
├── Authorization
├── Rendering
├── Publishing
├── Assets
├── Logger
└── Helpers
```
Cada área possui apenas uma responsabilidade principal.
---
15. Inicialização da Aplicação
Toda execução inicia pelo bootstrap da aplicação.
Fluxo simplificado:
```text
Bootstrap
    ↓
Carregar configurações
    ↓
Inicializar Core
    ↓
Registrar eventos
    ↓
Carregar plugins
    ↓
Carregar módulos
    ↓
Inicializar rotas
    ↓
Aplicação pronta
```
Nenhum módulo deve executar código antes da inicialização do Core.
---
16. Configuração
Toda configuração da plataforma deve ser centralizada.
Exemplos:
ambiente;
domínio;
idioma;
timezone;
cache;
publicação;
recursos habilitados;
integrações.
Valores de configuração não devem ficar espalhados pelo código.
Segredos e credenciais nunca devem ser gravados diretamente no repositório.
---
17. Roteamento
O Router possui apenas uma responsabilidade:
Interpretar a requisição e encaminhá-la para o destino correto.
O Router não executa regras de negócio.
Ele também não consulta diretamente o banco de dados.
17.1 Responsabilidades do Router
identificar rota;
validar método HTTP;
extrair parâmetros;
encaminhar execução;
retornar resposta.
Nada além disso.
---
18. Sistema de Eventos
Toda comunicação desacoplada da plataforma utiliza eventos.
Sempre que ocorrer uma alteração importante, um evento poderá ser publicado.
Exemplos:
```text
UserCreated
ListingPublished
PaymentReceived
SubscriptionCanceled
```
O módulo que publica um evento não conhece quem irá consumi-lo.
18.1 Benefícios
baixo acoplamento;
facilidade de expansão;
integração simples entre módulos;
menor impacto durante manutenção.
---
19. Banco de Dados
O D1 é a única fonte oficial de dados.
Toda alteração permanente ocorre primeiro no banco.
Fluxo:
```text
Aplicação
    ↓
D1
    ↓
Evento
    ↓
Publicação
    ↓
Cache
    ↓
Visitante
```
O banco nunca deve ser ignorado.
---
20. Publicação
Após alterações relevantes, o sistema poderá publicar conteúdo para consumo público.
A publicação poderá gerar:
JSON;
HTML;
índices;
sitemap;
feeds;
manifestos;
cache.
O visitante deve consumir preferencialmente conteúdo já publicado.
---
21. Cache
O cache reduz processamento.
Sempre que possível, páginas públicas devem ser servidas diretamente do cache.
O cache nunca substitui o banco de dados.
Ele apenas acelera a leitura de conteúdo derivado.
---
22. Armazenamento
A plataforma utiliza diferentes meios de armazenamento.
Cada um possui responsabilidade específica.
22.1 D1
Fonte oficial dos dados.
22.2 KV
Conteúdo publicado, cache, JSON, índices e manifestos.
22.3 R2
Arquivos, imagens, vídeos, downloads, exportações e backups.
Cada tecnologia deve ser utilizada apenas para seu propósito.
---
23. Renderização
A renderização da interface utiliza:
```text
Templates
    ↓
Layouts
    ↓
Componentes
    ↓
Dados
```
A renderização não contém regras de negócio.
Ela apenas apresenta informações.
---
24. Assets
Arquivos estáticos incluem:
CSS;
JavaScript;
fontes;
ícones;
imagens;
arquivos públicos.
O gerenciamento de recursos compartilhados pertence ao Core.
---
25. Logger
Toda operação relevante poderá gerar registros.
Exemplos:
erros;
exceções;
autenticação;
publicação;
integrações;
tarefas.
O Logger não deve interferir na execução normal da aplicação.
Dados sensíveis não devem ser registrados integralmente.
---
26. Helpers
Helpers concentram funções utilitárias reutilizáveis.
Exemplos:
datas;
texto;
URL;
números;
validações simples.
Helpers nunca devem conter regras de negócio.
---
27. Segurança
Toda entrada de dados deve ser considerada não confiável.
A plataforma deve validar:
parâmetros;
formulários;
uploads;
tokens;
autenticação;
permissões;
webhooks;
dados externos.
Segurança não é responsabilidade exclusiva da interface.
Ela deve existir em todas as camadas.
---
28. Autenticação
A autenticação identifica quem está utilizando a plataforma.
Ela responde:
> Quem é o usuário?
Ela não define o que o usuário pode fazer.
---
29. Autorização
A autorização define permissões.
Ela responde:
> O usuário possui acesso a esta funcionalidade?
Autenticação e autorização são responsabilidades distintas.
---
30. Tratamento de Erros
Toda exceção deve possuir tratamento padronizado.
Objetivos:
evitar falhas silenciosas;
registrar informações úteis;
proteger dados internos;
fornecer respostas consistentes.
Nenhum erro deve expor informações sensíveis ao usuário final.
---
31. Responsabilidade do Core
O Core deve permanecer pequeno durante toda a vida do projeto.
Sempre que surgir uma nova funcionalidade, a primeira pergunta deverá ser:
> Isto realmente pertence ao Core?
Se a resposta for não, a implementação deverá ocorrer em um módulo, plugin ou componente.
---
32. Arquitetura dos Módulos
Os módulos representam o domínio de negócio da plataforma.
Toda funcionalidade relacionada ao negócio deve existir dentro de um módulo.
O Core nunca implementa regras de negócio.
32.1 Objetivos dos Módulos
Cada módulo deve ser responsável por apenas um domínio funcional.
Exemplos:
usuários;
anúncios;
categorias;
financeiro;
assinaturas;
SEO;
notificações;
mídia;
busca.
Cada módulo deve poder evoluir independentemente dos demais.
32.2 Responsabilidades
Um módulo pode:
validar regras de negócio;
consultar o banco de dados por meio da infraestrutura aprovada;
emitir eventos;
consumir eventos;
utilizar serviços do Core;
publicar conteúdo;
expor interfaces públicas.
Um módulo não deve modificar diretamente outro módulo.
---
33. Comunicação entre Módulos
Os módulos devem permanecer desacoplados.
A comunicação ocorre preferencialmente por:
Event Bus;
interfaces públicas;
contratos documentados.
Nunca por acesso direto a arquivos internos.
Exemplo incorreto:
```text
Módulo A
    ↓
Acessa arquivo interno
    ↓
Módulo B
```
Exemplo correto:
```text
Módulo A
    ↓
Evento ou interface pública
    ↓
Módulo B
```
---
34. Event Bus
O Event Bus é o mecanismo oficial de integração interna da plataforma.
Quando algo importante acontece, um evento pode ser publicado.
Outros módulos podem reagir a esse evento sem criar dependências diretas.
Exemplo:
```text
ListingPublished
    ↓
SEO atualiza sitemap
    ↓
Publish regenera artefatos
    ↓
Analytics atualiza estatísticas
```
Nenhum desses módulos conhece a implementação interna dos demais.
---
35. Contratos
Toda comunicação pública entre módulos deve ocorrer por contratos claramente definidos.
Um contrato define:
entradas;
saídas;
formato dos dados;
comportamento esperado;
erros possíveis.
Alterações incompatíveis em contratos devem ser evitadas e documentadas.
---
36. Plugins
Plugins adicionam funcionalidades opcionais.
Eles não fazem parte do núcleo obrigatório da plataforma.
Um plugin pode registrar:
eventos;
comandos;
integrações;
menus;
tarefas;
configurações.
A remoção de um plugin não deve comprometer o funcionamento do Core.
---
37. Componentes
Componentes representam elementos reutilizáveis da interface.
Eles devem ser independentes do domínio da aplicação.
Um componente recebe dados.
Nunca consulta diretamente o banco.
Nunca contém regras de negócio.
Exemplos:
Card;
Tabela;
Grid;
Formulário;
Menu;
Modal;
Paginação;
Breadcrumb.
---
38. Templates
Templates definem apenas a estrutura visual.
Eles utilizam componentes para montar páginas.
Exemplo:
```text
Template
    ↓
Header
    ↓
Menu
    ↓
Grid
    ↓
Cards
    ↓
Footer
```
A lógica pertence aos módulos.
Os templates apenas organizam a apresentação.
---
39. Fluxo de Publicação
A navegação pública do ACTS deve utilizar conteúdo previamente publicado.
Fluxo oficial:
```text
Usuário altera conteúdo
    ↓
D1
    ↓
Evento
    ↓
Publisher
    ↓
JSON ou HTML
    ↓
KV, R2 ou arquivos estáticos
    ↓
Visitante
```
Esse fluxo reduz consultas ao banco durante a navegação pública.
---
40. Estratégia de Publicação
A publicação poderá gerar diferentes artefatos.
Exemplos:
páginas HTML;
JSONs;
sitemap;
feeds;
índices;
manifestos;
cache.
Cada artefato possui finalidade específica.
---
41. Fonte Oficial dos Dados
A plataforma possui apenas uma fonte de verdade:
```text
D1
```
Todo o restante é considerado derivado.
Exemplos:
KV;
HTML;
JSON;
índices;
cache.
Caso exista divergência, o D1 prevalece.
---
42. Conteúdo Público
Durante a navegação pública, a prioridade será utilizar conteúdo previamente publicado.
Sempre que possível, o visitante não deverá gerar consultas ao D1.
A consulta ao banco deve ocorrer principalmente em:
painel administrativo;
autenticação;
operações de escrita;
processamento interno;
integrações;
tarefas administrativas.
---
43. Organização do Frontend
O frontend será composto por quatro elementos:
```text
Layouts
    ↓
Templates
    ↓
Componentes
    ↓
Dados
```
Cada camada possui responsabilidade própria.
---
44. Separação entre Interface e Negócio
A interface nunca implementa regras de negócio.
Ela apenas apresenta informações.
Toda decisão pertence aos módulos.
Essa separação facilita:
manutenção;
testes;
reutilização;
evolução.
---
45. Configuração
A plataforma privilegia configuração em vez de código.
Sempre que possível, novas funcionalidades devem ser habilitadas por configuração.
Exemplos:
módulos ativos;
plugins ativos;
temas;
menus;
permissões;
publicação;
cache.
Mudanças operacionais não devem exigir alteração de código quando uma configuração for suficiente.
---
46. Escalabilidade
O crescimento do ACTS deverá ocorrer pela adição de novos módulos.
O Core deve permanecer praticamente inalterado.
A evolução da plataforma deve acontecer sem aumento proporcional da complexidade.
---
47. Reutilização
Antes de criar qualquer implementação, verificar:
Já existe um componente equivalente?
Já existe um serviço semelhante?
O Core já oferece essa funcionalidade?
É possível reutilizar código existente?
Somente após essas verificações uma nova implementação deve ser criada.
---
48. Arquitetura Evolutiva
A arquitetura do ACTS foi projetada para evoluir continuamente.
Novos recursos devem ampliar a plataforma sem exigir reestruturações profundas.
Uma boa implementação:
respeita a arquitetura;
reduz complexidade;
aumenta reutilização;
preserva estabilidade.
---
49. Arquitetura Edge-First
O ACTS foi concebido para operar prioritariamente na borda da rede.
Sempre que possível, o processamento deve ocorrer próximo ao visitante.
Os recursos da Cloudflare não são utilizados apenas como infraestrutura, mas como parte integrante da arquitetura da plataforma.
---
50. Infraestrutura Oficial
A plataforma utilizará os seguintes serviços:
Serviço	Responsabilidade
Cloudflare Pages	Hospedagem do frontend e dos arquivos estáticos
Pages Functions	Endpoints privados e administrativos
D1	Fonte única e oficial dos dados
KV	Configuração, coordenação e cache técnico interno de baixo volume
R2	Armazenamento permanente de arquivos
Queues	Processamento assíncrono
Cache	Distribuição global de respostas
Cron Triggers	Execução de tarefas agendadas
Cada serviço possui uma finalidade específica.
Não devem existir sobreposições desnecessárias entre os serviços.
---
51. D1
O D1 é a única fonte oficial dos dados da plataforma.
Toda operação de escrita deve ocorrer primeiro no banco de dados.
Exemplos:
criação;
atualização;
exclusão;
autenticação;
permissões;
configurações;
registros financeiros;
dados dos módulos.
Nenhuma alteração permanente deve ocorrer diretamente no KV ou no R2.
KV, R2, HTML, JSON, índices e caches são derivados dos dados registrados no D1.
Caso exista divergência entre o D1 e qualquer conteúdo derivado, o D1 prevalece.
---
52. KV
O KV deve ser utilizado para cache e distribuição de artefatos publicados.
Exemplos:
JSONs públicos;
índices;
manifestos;
configurações públicas;
fragmentos publicados;
resultados preparados para navegação;
controle de versões dos artefatos.
O KV não substitui o banco de dados.
Ele não deve ser utilizado como fonte primária das regras de negócio.
Seu objetivo é reduzir processamento e eliminar consultas ao D1 durante a navegação pública.
---
53. R2
O R2 deve armazenar arquivos permanentes e objetos binários.
Exemplos:
imagens;
vídeos;
documentos;
arquivos para download;
exportações;
backups;
arquivos processados.
Arquivos binários não devem ser armazenados diretamente no D1.
O D1 poderá armazenar apenas metadados e referências aos arquivos existentes no R2.
---
54. Pages Functions
As Pages Functions representam a camada dinâmica e privada da plataforma.
Elas devem ser utilizadas principalmente para:
autenticação;
painel administrativo;
APIs privadas;
operações de escrita;
webhooks;
tarefas internas;
ações que exigem validação no servidor.
Uma Function deve:
receber a requisição;
validar os dados básicos;
verificar autenticação e autorização;
chamar o módulo responsável;
transformar o resultado em resposta HTTP.
Uma Function não deve conter regras de negócio extensas.
As regras de negócio devem permanecer nos módulos.
Pages Functions devem atuar como orquestradoras finas.
---
55. Navegação Pública
A navegação pública deve ser atendida prioritariamente por arquivos estáticos, cache e artefatos publicados.
O fluxo preferencial é:
```text
Visitante
    ↓
Cloudflare Cache
    ↓
Arquivo estático ou artefato publicado
    ↓
HTML, JSON, CSS, JavaScript ou mídia
    ↓
Resposta
```
A navegação pública deve realizar zero consultas ao D1 sempre que tecnicamente possível.
Consultas públicas diretas ao D1 devem ser tratadas como exceção arquitetural e precisam ser justificadas antes da implementação.
---
56. Queues
Operações demoradas ou desacopladas da requisição principal devem ser enviadas para filas.
Exemplos:
geração de páginas;
geração de JSONs;
atualização de índices;
publicação;
envio de e-mails;
notificações;
processamento de imagens;
sincronizações externas;
invalidação de artefatos relacionados.
A interface não deve aguardar tarefas demoradas que possam ser processadas de forma assíncrona.
Uma operação de escrita deve responder assim que o registro principal estiver seguro no D1, desde que o restante do processamento possa ocorrer posteriormente sem comprometer a consistência.
---
57. Scheduler
O Scheduler executa tarefas periódicas da plataforma.
Exemplos:
processar publicações pendentes;
republicar artefatos;
gerar sitemap;
limpar registros temporários;
verificar assinaturas;
executar rotinas de manutenção;
processar tarefas acumuladas;
atualizar índices.
A frequência das tarefas deve ser configurável.
O painel do Superadministrador poderá permitir execução manual e definição de intervalos aprovados pelo projeto.
O Scheduler não deve concentrar regras de negócio.
Ele apenas inicia tarefas pertencentes aos módulos responsáveis.
---
58. Fluxo Oficial de Escrita
Toda alteração permanente deve seguir este fluxo:
```text
Requisição
    ↓
Function
    ↓
Validação
    ↓
Autenticação e autorização
    ↓
Módulo responsável
    ↓
D1
    ↓
Evento de domínio
    ↓
Queue, quando necessária
    ↓
Publicação dos artefatos afetados
    ↓
KV, R2 ou arquivos estáticos
    ↓
Invalidação ou atualização do cache
```
O salvamento no D1 deve ocorrer antes da publicação dos dados derivados.
Nenhuma publicação pode ser tratada como fonte oficial da informação.
---
59. Fluxo Oficial de Leitura Pública
Durante a navegação pública, a prioridade deve ser:
```text
Visitante
    ↓
Cache
    ↓
Arquivo estático
    ↓
KV ou R2
    ↓
Resposta
```
O D1 não deve participar do fluxo normal de navegação pública.
Dados que precisem ser pesquisados ou filtrados pelo visitante devem ser previamente publicados em formatos adequados, como JSONs segmentados.
---
60. Publicação Incremental
A publicação deve afetar somente os artefatos relacionados à alteração realizada.
Exemplo: atualização de um anúncio.
Não deve ser necessário reconstruir todo o portal.
Poderão ser regenerados apenas:
página do anúncio;
JSON da cidade e categoria;
página do anunciante;
índices relacionados;
resultados de busca publicados;
sitemap, quando necessário;
manifestos afetados.
A plataforma deve evitar reconstruções globais quando uma atualização incremental for suficiente.
---
61. Conteúdo Derivado
Todo conteúdo público gerado a partir do D1 é considerado derivado.
Exemplos:
HTML;
JSON;
sitemap;
feeds;
índices;
manifestos;
cache;
páginas de cidade;
páginas de categoria;
páginas de perfil;
resultados preparados para busca.
Conteúdo derivado pode ser apagado e reconstruído a partir da fonte oficial.
Por isso, nenhuma informação essencial pode existir apenas em conteúdo publicado.
---
62. Cache
O cache é parte integrante da arquitetura.
Seus objetivos são:
reduzir latência;
diminuir processamento;
minimizar consultas;
reduzir custos;
melhorar a escalabilidade;
proteger serviços internos contra picos de acesso.
Toda estratégia de cache deve possuir uma estratégia correspondente de atualização ou invalidação.
Não deve existir cache sem definição de:
chave;
conteúdo;
duração;
origem;
momento de atualização;
forma de invalidação.
---
63. Estratégia de Chaves
As chaves utilizadas no KV e no cache devem ser previsíveis e documentadas.
Exemplo conceitual:
```text
portal:manifest
portal:city:londrina
portal:city:londrina:category:apartamentos
listing:123
profile:456
sitemap:index
```
A estrutura definitiva das chaves será documentada antes da implementação do publicador.
Chaves não devem ser criadas aleatoriamente dentro dos módulos.
---
64. APIs
As APIs representam interfaces oficiais da plataforma.
Toda API deve possuir:
URL previsível;
método HTTP correto;
validação;
autenticação quando necessária;
autorização;
resposta padronizada;
códigos HTTP adequados;
tratamento consistente de erros.
As APIs não devem duplicar regras de negócio.
Elas devem chamar os módulos responsáveis.
---
65. Versionamento de APIs
Mudanças incompatíveis em APIs públicas devem ser versionadas.
Exemplo:
```text
/api/v1/
/api/v2/
```
APIs internas poderão evoluir sem versionamento público quando todos os consumidores forem atualizados de maneira controlada.
Nenhuma integração externa deve ser quebrada sem planejamento e registro da decisão.
---
66. Webhooks
Webhooks devem possuir endpoints finos.
Um webhook deve:
receber a requisição;
validar origem, assinatura ou token;
impedir processamento duplicado;
identificar o tipo do evento;
encaminhar os dados ao módulo responsável;
responder rapidamente ao provedor.
O endpoint não deve conter toda a regra de negócio da integração.
No caso do Asaas, o webhook encaminhará os eventos ao módulo financeiro, que decidirá quais alterações realizar e quais eventos internos emitir.
---
67. Segurança
Toda entrada deve ser considerada não confiável.
Isso inclui:
parâmetros de URL;
formulários;
JSON;
cabeçalhos;
cookies;
uploads;
tokens;
webhooks;
dados recebidos de integrações.
A plataforma deve aplicar:
validação;
normalização;
autenticação;
autorização;
limitação de operações quando necessária;
proteção contra repetição;
proteção contra exposição de informações internas.
Segurança não pode depender exclusivamente do frontend.
---
68. Idempotência
Operações que possam ser repetidas devem possuir proteção contra duplicidade.
Isso é especialmente importante para:
webhooks;
pagamentos;
publicação;
processamento de filas;
tarefas agendadas;
criação de cobranças;
atualizações externas.
O processamento repetido da mesma mensagem não deve produzir cobranças, registros ou publicações duplicadas.
---
69. Auditoria
Operações relevantes devem poder ser registradas para auditoria.
Exemplos:
login;
falhas de autenticação;
alterações administrativas;
mudanças de permissões;
alterações financeiras;
publicação;
exclusões;
integrações externas;
execução manual de tarefas.
Os registros devem conter apenas as informações necessárias.
Dados sensíveis não devem ser armazenados integralmente nos logs.
---
70. Monitoramento
A plataforma deve permitir o acompanhamento de:
erros;
filas;
publicação;
webhooks;
tarefas agendadas;
integrações;
desempenho;
consumo de recursos;
falhas de cache;
artefatos desatualizados.
O monitoramento deve fornecer informações suficientes para diagnóstico sem interferir na execução normal da aplicação.
---
71. Desempenho
Toda implementação deve considerar desempenho desde o início.
Diretrizes:
evitar consultas repetidas;
evitar consultas públicas ao D1;
utilizar consultas preparadas;
publicar dados para leitura pública;
utilizar cache quando apropriado;
reduzir processamento síncrono;
processar tarefas demoradas em filas;
gerar apenas os artefatos afetados;
evitar dependências grandes no frontend;
reutilizar resultados e componentes.
Desempenho é requisito arquitetural, não uma correção posterior.
---
72. Custos Operacionais
A arquitetura deve considerar o custo de cada operação.
O projeto deve evitar:
consultas desnecessárias ao D1;
escrita excessiva no KV;
processamento repetido;
regeneração global sem necessidade;
armazenamento duplicado;
chamadas externas redundantes;
filas geradas sem finalidade.
Baixo custo operacional não deve comprometer a consistência dos dados ou a segurança.
---
73. Objetivo Operacional
O objetivo da arquitetura Edge-First é garantir que a maior parte das requisições públicas seja atendida diretamente pela infraestrutura distribuída da Cloudflare.
O processamento dinâmico deve ficar concentrado em:
autenticação;
painel;
operações de escrita;
tarefas internas;
integrações;
publicação;
administração.
Essa separação permite alta escalabilidade, baixa latência e controle dos custos operacionais.
---
74. Regras de Engenharia
As regras desta seção são obrigatórias para toda implementação do projeto.
Elas existem para impedir o crescimento descontrolado do código e preservar a clareza da arquitetura.
---
75. Criação de Arquivos
Arquivos são criados por necessidade, nunca por previsão.
Antes de criar um arquivo, deve ser possível responder:
Qual é sua responsabilidade principal?
Por que essa responsabilidade não pertence a um arquivo existente?
Onde ele será registrado no `TREE.md`?
Em qual etapa do `ROADMAP.md` ele será implementado?
Quais contratos públicos ele expõe?
Quais arquivos dependem dele?
Se essas respostas não estiverem claras, o arquivo não deve ser criado.
---
76. Limites de Tamanho
Como regra geral:
nenhum arquivo de código deve ultrapassar 500 linhas;
nenhuma função deve ultrapassar 80 linhas;
nenhum método deve ultrapassar 40 linhas;
cada arquivo deve possuir uma responsabilidade principal.
A divisão deve ocorrer quando houver separação real de responsabilidades.
Arquivos não devem ser fragmentados apenas para cumprir números artificialmente.
76.1 Exceção aprovada
O arquivo abaixo possui exceção específica:
```text
app/core/db.js
```
Ele poderá permanecer com aproximadamente 643 linhas, desde que continue funcional, organizado e com responsabilidade coerente.
Essa exceção vale apenas para esse arquivo e não altera a regra geral dos demais arquivos.
---
77. Nomenclatura
A nomenclatura deve ser previsível e consistente.
77.1 Arquivos JavaScript
Usar nomes descritivos e consistentes com a função do arquivo.
Exemplos:
```text
config.js
router.js
events.js
Listings.js
Payments.js
Asaas.js
```
77.2 Módulos
Os módulos poderão utilizar nomes em PascalCase quando forem representados por uma unidade principal exportada.
Exemplos:
```text
Listings.js
Users.js
Payments.js
```
77.3 Variáveis e funções
Utilizar camelCase.
Exemplos:
```text
listingId
publishListing()
validateRequest()
```
77.4 Constantes
Utilizar UPPER_SNAKE_CASE quando forem valores imutáveis globais.
Exemplo:
```text
DEFAULT_CACHE_TTL
```
77.5 Eventos
Eventos devem utilizar PascalCase e representar algo que já aconteceu.
Exemplos:
```text
ListingCreated
ListingUpdated
PaymentReceived
SubscriptionActivated
```
---
78. Organização dos Módulos
Cada módulo deve permanecer compacto.
A regra padrão é um arquivo principal por módulo, enquanto isso for suficiente para manter clareza e respeitar os limites aprovados.
Exemplo:
```text
app/modules/Listings.js
```
O arquivo poderá conter seções internas claramente identificadas, como:
configuração;
validação;
criação;
atualização;
exclusão;
consulta;
publicação;
eventos;
interface pública.
Um módulo só deve ser dividido quando existirem responsabilidades independentes ou integrações externas que justifiquem arquivos próprios.
---
79. Integrações Externas
Integrações externas devem permanecer isoladas.
Exemplo aprovado para o módulo financeiro:
```text
app/modules/Payments.js
app/gateways/Asaas.js
```
`Payments.js` controla as regras financeiras.
`app/gateways/Asaas.js` controla exclusivamente a comunicação com a API do Asaas; não existe um segundo caminho de gateway dentro do módulo.
A plataforma utilizará somente o Asaas como gateway financeiro.
Não devem ser criadas abstrações para gateways que não serão utilizados.
---
80. Pages Functions
Pages Functions devem ser pequenas e atuar apenas como orquestradoras.
Uma Function deve:
receber a requisição;
validar o formato básico;
autenticar e autorizar;
chamar o módulo;
retornar a resposta.
Ela não deve conter:
regras de negócio extensas;
consultas complexas espalhadas;
lógica de publicação;
implementação de integrações externas;
duplicação de validações pertencentes ao módulo.
---
81. Banco de Dados
Consultas e comandos do D1 devem utilizar a infraestrutura central aprovada.
Regras:
utilizar statements preparados;
evitar SQL duplicado;
validar parâmetros;
manter transações quando necessárias;
não expor detalhes do banco para templates;
não consultar D1 diretamente na navegação pública normal.
Alterações de schema devem ser realizadas por migrations versionadas.
---
82. Frontend
O frontend utilizará:
Bootstrap 5;
Tailwind CSS;
JavaScript puro com ES Modules.
Não devem ser adicionados frameworks JavaScript sem uma decisão arquitetural formal.
A interface deve:
reutilizar componentes;
evitar código duplicado;
manter acessibilidade;
funcionar responsivamente;
separar comportamento, apresentação e dados;
consumir artefatos públicos sem consultar diretamente o D1.
---
83. Comentários
Comentários devem explicar intenção, regra ou decisão.
Não devem apenas repetir o que o código já demonstra.
Comentários extensos devem ser utilizados apenas quando necessários para preservar contexto importante.
Cabeçalhos internos podem ser utilizados para organizar módulos compactos.
---
84. Tratamento de Dependências
Novas dependências externas devem ser evitadas quando a plataforma nativa ou JavaScript padrão resolverem o problema adequadamente.
Antes de adicionar uma dependência, avaliar:
necessidade real;
tamanho;
manutenção;
segurança;
compatibilidade com Cloudflare;
impacto no deploy;
possibilidade de implementação simples sem biblioteca.
Toda dependência adicionada deve possuir justificativa clara.
---
85. Testes
Cada unidade implementada deve ser testável.
Os testes devem priorizar:
regras de negócio;
contratos públicos;
validações;
publicação;
eventos;
pagamentos;
autenticação;
autorização;
idempotência.
Não é necessário testar detalhes triviais da linguagem ou de bibliotecas confiáveis.
---
86. Processo Oficial de Implementação
Todo novo arquivo segue este processo:
```text
Definir responsabilidade
    ↓
Registrar no TREE.md
    ↓
Adicionar ao ROADMAP.md
    ↓
Implementar completamente
    ↓
Revisar arquitetura
    ↓
Testar
    ↓
Aprovar
    ↓
Commit
```
Não devem ser criados arquivos vazios, stubs ou estruturas completas por antecipação.
---
87. Alterações Arquiteturais
Uma alteração arquitetural não deve ser aplicada diretamente no código.
Fluxo obrigatório:
identificar a necessidade;
analisar impacto;
registrar a decisão;
atualizar a documentação;
atualizar `TREE.md` e `ROADMAP.md`;
implementar;
testar;
registrar no `CHANGELOG.md`.
Mudanças estruturais relevantes poderão utilizar ADRs em `docs/adr/`.
---
88. Critérios para Dividir um Arquivo
Um arquivo deve ser dividido quando:
possui mais de uma responsabilidade principal;
contém uma integração externa independente;
apresenta dificuldade real de manutenção;
partes distintas podem evoluir separadamente;
ultrapassa os limites sem justificativa aprovada;
mistura infraestrutura com regra de negócio;
mistura domínio com apresentação.
Um arquivo não deve ser dividido apenas porque possui várias seções relacionadas ao mesmo domínio.
---
89. Critérios para Criar um Plugin
Uma funcionalidade deve ser considerada plugin quando:
for opcional;
puder ser ativada ou desativada;
não representar domínio central;
integrar serviço externo opcional;
puder ser removida sem comprometer o funcionamento principal.
Funcionalidades centrais do negócio pertencem aos módulos, não aos plugins.
---
90. Critérios para Criar um Componente
Um componente deve ser criado quando:
for reutilizado em mais de um contexto;
possuir estrutura visual própria;
receber dados por uma interface clara;
não contiver regra de negócio;
melhorar consistência da interface.
Não devem ser criados componentes para elementos usados uma única vez sem benefício real.
---
91. Checklist Antes do Commit
Antes de concluir qualquer arquivo, verificar:
a responsabilidade está clara;
o arquivo está registrado no `TREE.md`;
o arquivo está previsto no `ROADMAP.md`;
não existe duplicação desnecessária;
os limites foram respeitados;
funções e métodos permanecem compreensíveis;
regras de negócio estão no módulo correto;
Functions permanecem finas;
eventos estão documentados;
entradas estão validadas;
erros são tratados;
dados sensíveis não são expostos;
o código foi testado;
a documentação necessária foi atualizada.
---
92. Meta de Tamanho do Projeto
O projeto deve permanecer compacto.
Referência inicial:
aproximadamente 60 a 70 arquivos no início;
aproximadamente 80 a 100 arquivos em uma versão madura;
preferencialmente abaixo de 110 a 120 arquivos de código.
Essa meta não é uma limitação absoluta.
Ela existe para impedir crescimento desnecessário e estimular reutilização.
A qualidade da organização prevalece sobre a contagem isolada.
---
93. Governança
Os documentos oficiais do projeto são:
```text
docs/README.md
docs/PROJECT.md
docs/INDEX.md
docs/ARCHITECTURE.md
docs/TREE.md
docs/ROADMAP.md
docs/MODULES.md
docs/COMPONENTS.md
docs/EVENTS.md
docs/SCHEMAS.md
docs/CLOUDFLARE.md
docs/CHANGELOG.md
```
Esses documentos devem permanecer sincronizados com a implementação.
Decisões não devem depender apenas de conversas ou memória.
93.1 Responsabilidades documentais
`CONSTITUTION.md` define as regras permanentes e possui a maior autoridade documental.
`ARCHITECTURE.md` define a arquitetura técnica oficial.
Documentos especializados detalham responsabilidades dentro dos limites definidos pelos documentos superiores.
`TREE.md` autoriza onde uma pasta ou arquivo pode existir.
`ROADMAP.md` determina quando cada item aprovado pode ser implementado.
Contratos e schemas definem estruturas públicas compartilhadas.
Listas de referência presentes em documentos especializados não autorizam criação antecipada e não substituem a ordem do `ROADMAP.md`.
---
94. Precedência das Regras
Em caso de conflito, utilizar esta ordem:
`CONSTITUTION.md`;
decisão explícita mais recente, formalmente aprovada e registrada na documentação;
`ARCHITECTURE.md`;
ADR específico aprovado;
documentação especializada aplicável;
`TREE.md`;
`ROADMAP.md`;
contratos e schemas;
implementação existente.
O código existente não se torna regra apenas por já estar implementado.
Uma alteração estrutural deve seguir este fluxo:
identificar a necessidade;
resolver conflitos documentais;
registrar RFC quando houver impacto relevante;
registrar ADR quando houver decisão arquitetural permanente;
atualizar a Constituição ou a arquitetura, quando aplicável;
atualizar `TREE.md`;
atualizar `ROADMAP.md`;
implementar somente após aprovação.
---
95. Compromisso Final
O ACTS deve crescer em capacidade, não em desorganização.
Toda implementação deverá preservar:
Core pequeno;
módulos coesos;
baixo acoplamento;
navegação pública sem D1;
publicação incremental;
uso correto da Cloudflare;
integração exclusiva com Asaas;
documentação atualizada;
desenvolvimento arquivo por arquivo;
simplicidade permanente.
Este documento é a referência técnica principal da arquitetura do Portal ACTS.
Toda alteração estrutural deverá respeitá-lo ou atualizá-lo formalmente antes da implementação.

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
