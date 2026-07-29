ACTS Portal

Árvore Oficial do Projeto

Versão: 1.0Status: Oficial

1. Objetivo

Este documento define a estrutura oficial de diretórios e arquivos do Portal ACTS.

Nenhuma pasta ou arquivo de código deve ser criado sem antes estar registrado aqui.

A árvore será atualizada somente quando uma necessidade real justificar a criação, remoção ou reorganização de um item.

Arquivos são criados por necessidade, nunca por previsão.

2. Regras da Árvore

Todo arquivo deve possuir uma responsabilidade principal.

Nenhum arquivo vazio ou placeholder deve ser criado.

Pastas devem existir apenas quando contiverem arquivos reais.

Nenhum módulo deve acessar arquivos internos de outro módulo.

Pages Functions devem permanecer finas e apenas orquestrar requisições.

O D1 é a única fonte de verdade.

KV e R2 armazenam somente conteúdo derivado, cache e arquivos.

A navegação pública deve realizar zero consultas ao D1 sempre que tecnicamente possível.

Novos arquivos devem ser incluídos neste documento antes da implementação.

Mudanças estruturais devem ser registradas no CHANGELOG.md.

3. Legenda

[EXISTE]     Arquivo ou diretório já criado no repositório
[PLANEJADO]  Item aprovado, ainda não implementado
[FUTURO]     Item possível, condicionado a necessidade real

Itens marcados como [FUTURO] não devem ser criados antecipadamente.

4. Árvore Oficial

PORTAL/
│
├── docs/                                      [EXISTE]
│   ├── README.md                              [EXISTE]
│   ├── PROJECT.md                             [EXISTE]
│   ├── INDEX.md                               [EXISTE]
│   ├── ARCHITECTURE.md                        [EXISTE]
│   ├── TREE.md                                [PLANEJADO]
│   ├── ROADMAP.md                             [PLANEJADO]
│   ├── MODULES.md                             [PLANEJADO]
│   ├── COMPONENTS.md                          [PLANEJADO]
│   ├── EVENTS.md                              [PLANEJADO]
│   ├── SCHEMAS.md                             [PLANEJADO]
│   ├── CLOUDFLARE.md                          [PLANEJADO]
│   ├── CHANGELOG.md                           [PLANEJADO]
│   └── adr/                                   [FUTURO]
│
├── app/                                       [PLANEJADO]
│   │
│   ├── core/                                  [PLANEJADO]
│   │   ├── app.js                             [PLANEJADO]
│   │   ├── config.js                          [PLANEJADO]
│   │   ├── events.js                          [PLANEJADO]
│   │   ├── router.js                          [PLANEJADO]
│   │   ├── db.js                              [PLANEJADO]
│   │   ├── storage.js                         [PLANEJADO]
│   │   ├── cache.js                           [PLANEJADO]
│   │   ├── auth.js                            [PLANEJADO]
│   │   ├── render.js                          [PLANEJADO]
│   │   ├── publish.js                         [PLANEJADO]
│   │   ├── logger.js                          [PLANEJADO]
│   │   └── helpers.js                         [PLANEJADO]
│   │
│   ├── modules/                               [PLANEJADO]
│   │   ├── AI.js                              [PLANEJADO]
│   │   ├── Analytics.js                       [PLANEJADO]
│   │   ├── Auth.js                            [PLANEJADO]
│   │   ├── Categories.js                      [PLANEJADO]
│   │   ├── Compare.js                         [PLANEJADO]
│   │   ├── Contacts.js                        [PLANEJADO]
│   │   ├── Dashboard.js                       [PLANEJADO]
│   │   ├── Favorites.js                       [PLANEJADO]
│   │   ├── Geolocation.js                     [PLANEJADO]
│   │   ├── Imobiliaristas.js                  [PLANEJADO]
│   │   ├── Integrations.js                    [PLANEJADO]
│   │   ├── Leads.js                           [PLANEJADO]
│   │   ├── Listings.js                        [PLANEJADO]
│   │   ├── Maps.js                            [PLANEJADO]
│   │   ├── Media.js                           [PLANEJADO]
│   │   ├── Notifications.js                   [PLANEJADO]
│   │   ├── Payments.js                        [PLANEJADO]
│   │   ├── Plans.js                           [PLANEJADO]
│   │   ├── Publish.js                         [PLANEJADO]
│   │   ├── Reports.js                         [PLANEJADO]
│   │   ├── Reviews.js                         [PLANEJADO]
│   │   ├── Search.js                          [PLANEJADO]
│   │   ├── Seo.js                             [PLANEJADO]
│   │   ├── Subscriptions.js                   [PLANEJADO]
│   │   ├── Upload.js                          [PLANEJADO]
│   │   └── Users.js                           [PLANEJADO]
│   │
│   ├── gateways/                              [PLANEJADO]
│   │   └── Asaas.js                           [PLANEJADO]
│   │
│   ├── components/                            [PLANEJADO]
│   │   ├── Alert.js                           [PLANEJADO]
│   │   ├── Breadcrumb.js                      [PLANEJADO]
│   │   ├── Button.js                          [PLANEJADO]
│   │   ├── Card.js                            [PLANEJADO]
│   │   ├── Form.js                            [PLANEJADO]
│   │   ├── Gallery.js                         [PLANEJADO]
│   │   ├── Grid.js                            [PLANEJADO]
│   │   ├── Menu.js                            [PLANEJADO]
│   │   ├── Modal.js                           [PLANEJADO]
│   │   ├── Pagination.js                      [PLANEJADO]
│   │   ├── Table.js                           [PLANEJADO]
│   │   └── Tabs.js                            [PLANEJADO]
│   │
│   ├── layouts/                               [PLANEJADO]
│   │   ├── public.js                          [PLANEJADO]
│   │   ├── panel.js                           [PLANEJADO]
│   │   └── admin.js                           [PLANEJADO]
│   │
│   ├── templates/                             [PLANEJADO]
│   │   ├── home.js                            [PLANEJADO]
│   │   ├── listing.js                         [PLANEJADO]
│   │   ├── listings.js                        [PLANEJADO]
│   │   ├── profile.js                         [PLANEJADO]
│   │   ├── location.js                        [PLANEJADO]
│   │   ├── panel.js                           [PLANEJADO]
│   │   └── error.js                           [PLANEJADO]
│   │
│   └── schemas/                               [PLANEJADO]
│       ├── listing.schema.json                [PLANEJADO]
│       ├── user.schema.json                   [PLANEJADO]
│       ├── profile.schema.json                [PLANEJADO]
│       ├── plan.schema.json                   [PLANEJADO]
│       ├── settings.schema.json               [PLANEJADO]
│       └── theme.schema.json                  [PLANEJADO]
│
├── functions/                                 [PLANEJADO]
│   ├── _middleware.js                         [PLANEJADO]
│   │
│   ├── api/                                   [PLANEJADO]
│   │   ├── auth.js                            [PLANEJADO]
│   │   ├── listings.js                        [PLANEJADO]
│   │   ├── users.js                           [PLANEJADO]
│   │   ├── media.js                           [PLANEJADO]
│   │   ├── payments.js                        [PLANEJADO]
│   │   └── publish.js                         [PLANEJADO]
│   │
│   ├── admin/                                 [PLANEJADO]
│   │   └── [[path]].js                        [PLANEJADO]
│   │
│   ├── painel/                                [PLANEJADO]
│   │   └── [[path]].js                        [PLANEJADO]
│   │
│   ├── webhooks/                              [PLANEJADO]
│   │   └── asaas.js                           [PLANEJADO]
│   │
│   └── scheduled.js                           [PLANEJADO]
│
├── site/                                      [PLANEJADO]
│   ├── index.html                             [PLANEJADO]
│   ├── 404.html                               [PLANEJADO]
│   ├── robots.txt                             [PLANEJADO]
│   │
│   ├── css/                                   [PLANEJADO]
│   │   ├── bootstrap.min.css                  [PLANEJADO]
│   │   ├── tailwind.css                       [PLANEJADO]
│   │   └── app.css                            [PLANEJADO]
│   │
│   ├── js/                                    [PLANEJADO]
│   │   ├── app.js                             [PLANEJADO]
│   │   ├── router.js                          [PLANEJADO]
│   │   ├── api.js                             [PLANEJADO]
│   │   └── search.js                          [PLANEJADO]
│   │
│   ├── images/                                [PLANEJADO]
│   └── icons/                                 [PLANEJADO]
│
├── database/                                  [PLANEJADO]
│   ├── schema.sql                             [PLANEJADO]
│   ├── seed.sql                               [FUTURO]
│   └── migrations/                            [PLANEJADO]
│
├── tests/                                     [FUTURO]
│   ├── core/                                  [FUTURO]
│   ├── modules/                               [FUTURO]
│   └── functions/                             [FUTURO]
│
├── .gitignore                                 [PLANEJADO]
├── package.json                               [PLANEJADO]
├── package-lock.json                          [PLANEJADO]
├── wrangler.toml                              [PLANEJADO]
├── LICENSE                                    [PLANEJADO]
└── README.md                                  [PLANEJADO]

5. Diretório docs

O diretório docs contém a documentação oficial do projeto.

Ele define:

visão;

arquitetura;

árvore;

ordem de implementação;

módulos;

componentes;

eventos;

schemas;

infraestrutura;

histórico de decisões.

A documentação deve ser atualizada antes de mudanças estruturais no código.

6. Diretório app/core

Contém somente infraestrutura compartilhada.

Não pode conter regras específicas de anúncios, usuários, pagamentos, cidades ou qualquer outro domínio de negócio.

Responsabilidades previstas:

Arquivo

Responsabilidade

app.js

Inicialização e ciclo de vida da aplicação

config.js

Configurações centralizadas

events.js

Event Bus

router.js

Roteamento interno

db.js

Acesso central ao D1

storage.js

Acesso a KV e R2

cache.js

Estratégias de cache

auth.js

Autenticação e autorização

render.js

Renderização de layouts, templates e componentes

publish.js

Infraestrutura de publicação

logger.js

Logging e auditoria técnica

helpers.js

Utilitários genéricos

A existência definitiva de cada arquivo será confirmada no ROADMAP.md antes da implementação.

7. Diretório app/modules

Contém as regras de negócio da plataforma.

Cada módulo começa como um único arquivo e somente será dividido quando houver separação real de responsabilidades.

Os módulos não podem acessar arquivos internos uns dos outros.

A comunicação ocorre por:

Event Bus;

interfaces públicas;

contratos documentados.

8. Diretório app/gateways

Contém integrações externas diretamente ligadas a um domínio.

O gateway aprovado inicialmente é:

app/gateways/Asaas.js

O Asaas será o único provedor financeiro.

Não serão criadas abstrações para gateways que não serão utilizados.

9. Diretório app/components

Contém elementos reutilizáveis da interface.

Componentes:

recebem dados;

não consultam o banco;

não contêm regras de negócio;

podem ser reutilizados por diferentes templates.

Um componente somente deve ser criado quando houver benefício real de reutilização.

10. Diretórios app/layouts e app/templates

Layouts definem a estrutura base das áreas da plataforma.

Templates definem a composição visual de páginas específicas.

Nenhum layout ou template deve consultar diretamente o D1.

Os dados devem chegar prontos por meio dos módulos e da camada de renderização.

11. Diretório app/schemas

Contém schemas usados para:

validação;

formulários;

configurações;

temas;

contratos de dados.

Schemas devem ser documentados no arquivo docs/SCHEMAS.md.

12. Diretório functions

Contém os endpoints dinâmicos da Cloudflare Pages.

Functions devem:

receber a requisição;

validar formato básico;

autenticar e autorizar;

chamar o módulo responsável;

retornar resposta padronizada.

Functions não devem conter regras de negócio extensas.

Arquivos de API podem reunir operações relacionadas no mesmo domínio, desde que permaneçam organizados e dentro dos limites definidos.

Exemplo:

functions/api/listings.js

Esse arquivo poderá conter seções para:

criar;

atualizar;

excluir;

listar;

detalhar.

Não é obrigatório criar um arquivo separado para cada operação.

13. Diretório site

Contém o frontend público e os assets estáticos.

A navegação pública deve utilizar:

HTML estático;

JavaScript ES Modules;

JSON publicado;

Cloudflare Cache;

KV;

R2.

O frontend não deve consultar diretamente o D1.

14. Diretório database

Contém o schema e as migrations do D1.

Regras:

toda alteração estrutural deve possuir migration;

migrations não devem ser alteradas depois de aplicadas;

novas mudanças devem gerar uma nova migration;

o D1 permanece como única fonte de verdade.

15. Diretório tests

O diretório de testes somente será criado quando o primeiro teste real for implementado.

Não deve ser criado vazio.

A estrutura interna será expandida conforme os testes forem adicionados.

16. Arquivos da Raiz

Arquivo

Responsabilidade

.gitignore

Exclusões do controle de versão

package.json

Dependências e scripts

package-lock.json

Travamento das versões

wrangler.toml

Configuração Cloudflare

LICENSE

Licença do projeto

README.md

Apresentação principal do repositório

17. Inclusão de Novos Arquivos

Para adicionar um novo arquivo:

justificar a necessidade;

definir sua responsabilidade;

verificar se um arquivo existente pode receber a responsabilidade;

registrar o caminho neste documento;

adicionar a implementação ao ROADMAP.md;

implementar;

testar;

atualizar o CHANGELOG.md, quando aplicável.

Nenhum arquivo deve surgir fora desse processo.

18. Remoção de Arquivos

Um arquivo poderá ser removido quando:

sua responsabilidade deixar de existir;

sua função for incorporada legitimamente a outro arquivo;

sua abstração se mostrar desnecessária;

sua remoção reduzir complexidade sem quebrar contratos.

A remoção deve ser registrada antes da alteração no código.

19. Estado Atual

No momento da criação deste documento, o repositório possui:

docs/
├── README.md
├── PROJECT.md
├── INDEX.md
└── ARCHITECTURE.md

O próprio TREE.md será o próximo arquivo adicionado.

Nenhuma pasta de código deve ser criada antes da conclusão do ROADMAP.md.

20. Regra Final

Esta árvore representa a estrutura oficial planejada do Portal ACTS.

Ela não autoriza a criação automática de todos os itens listados.

Cada arquivo continua sujeito ao princípio:

Arquivos são criados por necessidade, nunca por previsão.

O TREE.md define onde um arquivo poderá existir.

O ROADMAP.md define quando ele será criado.
