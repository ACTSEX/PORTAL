ACTS Portal

PLUGINS

Versão: 1.0Status: OficialEscopo: app/plugins/

1. Objetivo

Este documento define a arquitetura, as responsabilidades, os limites e o ciclo de vida oficial dos plugins do Portal ACTS.

Plugins são extensões opcionais da plataforma.

Eles adicionam capacidades sem alterar o Core e sem modificar diretamente os arquivos internos dos módulos.

O sistema deve continuar funcional quando um plugin opcional estiver desabilitado, salvo quando a documentação daquele plugin declarar dependência obrigatória aprovada.

2. Princípio fundamental

O Core permanece pequeno e estável.

Os módulos concentram regras de negócio.

Os plugins ampliam capacidades existentes por meio de contratos públicos, eventos, hooks, rotas e configurações autorizadas.

Fluxo conceitual:

Core
  ↓
Contratos públicos
  ↓
Módulos
  ↓
Pontos de extensão
  ↓
Plugins opcionais

Um plugin nunca deve obrigar o Core a conhecer sua implementação.

3. Diferença entre Core, módulo, plugin e componente

3.1 Core

Responsável por infraestrutura técnica reutilizável.

Exemplos:

bootstrap;

Event Bus;

container;

banco de dados;

cache;

filas;

roteamento;

logging.

3.2 Módulo

Responsável por um domínio de negócio.

Exemplos:

Listings;

Payments;

Users;

Leads;

Plans;

Publish.

3.3 Plugin

Responsável por adicionar uma capacidade opcional por meio de interfaces públicas.

Exemplos conceituais:

integração analítica adicional;

exportador de dados;

recurso visual opcional;

automação complementar;

conector autorizado;

extensão de painel;

importador especializado.

3.4 Componente

Responsável por uma unidade visual reutilizável.

Exemplos:

Card;

Modal;

Tabs;

Gallery;

Pagination.

4. Quando utilizar um plugin

Uma funcionalidade pode ser implementada como plugin quando:

for opcional;

puder ser ativada ou desativada;

ampliar um módulo sem alterar seus arquivos internos;

utilizar contratos públicos;

possuir ciclo de vida próprio;

não for essencial para a operação básica da plataforma;

puder ser instalada ou removida de forma controlada;

não exigir conhecimento interno do Core.

5. Quando não utilizar um plugin

Não criar plugin quando a funcionalidade:

for parte essencial de um domínio de negócio;

pertencer claramente a um módulo existente;

for infraestrutura genérica do Core;

for apenas um componente visual;

for uma regra obrigatória da plataforma;

existir apenas para contornar arquitetura mal definida;

precisar acessar arquivos privados de outro módulo;

depender de alteração direta no Core.

6. Estrutura oficial

Estrutura prevista:

app/
└── plugins/
    ├── registry.js
    ├── loader.js
    └── nome-do-plugin/
        ├── index.js
        ├── manifest.json
        ├── config.schema.json
        ├── routes.js
        ├── events.js
        ├── hooks.js
        ├── components/
        ├── templates/
        ├── assets/
        └── tests/

Essa árvore representa possibilidades aprovadas.

Nenhum diretório ou arquivo deve ser criado antes de existir necessidade real.

Um plugin simples pode começar apenas com:

app/plugins/nome-do-plugin/
├── index.js
└── manifest.json

7. Manifesto obrigatório

Todo plugin deve possuir:

manifest.json

O manifesto descreve o plugin sem executar seu código.

Estrutura conceitual:

{
  "name": "nome-do-plugin",
  "displayName": "Nome do Plugin",
  "version": "1.0.0",
  "status": "stable",
  "enabled": false,
  "entry": "./index.js",
  "description": "Descrição objetiva.",
  "requires": {
    "core": ">=1.0.0",
    "modules": []
  },
  "permissions": [],
  "events": {
    "publishes": [],
    "subscribes": []
  },
  "routes": [],
  "configSchema": "./config.schema.json"
}

8. Campos do manifesto

8.1 name

Identificador técnico único.

Regras:

minúsculas;

kebab-case;

sem espaços;

sem acentos;

imutável após publicação oficial.

Exemplo:

advanced-analytics

8.2 displayName

Nome exibido na interface administrativa.

8.3 version

Versão SemVer do plugin.

8.4 status

Estados permitidos:

experimental;

beta;

stable;

deprecated;

disabled.

8.5 enabled

Define o estado padrão controlado.

O estado efetivo pode ser sobrescrito pela configuração autorizada da plataforma.

8.6 entry

Arquivo público de inicialização.

8.7 requires

Dependências mínimas de Core e módulos.

8.8 permissions

Permissões técnicas solicitadas.

8.9 events

Eventos publicados e consumidos.

8.10 routes

Rotas públicas ou administrativas registradas.

8.11 configSchema

Schema de validação das configurações do plugin.

9. Interface pública do plugin

Todo plugin deve expor uma interface previsível.

Exemplo conceitual:

export default {
  name: "advanced-analytics",
  version: "1.0.0",

  async register(context) {
    // Registrar recursos.
  },

  async boot(context) {
    // Inicializar após registros.
  },

  async shutdown(context) {
    // Encerrar recursos quando aplicável.
  }
};

Métodos oficiais:

register;

boot;

shutdown.

Métodos adicionais somente podem existir como APIs internas do próprio plugin.

10. Ciclo de vida

Fluxo oficial:

Descoberta
   ↓
Leitura do manifesto
   ↓
Validação
   ↓
Verificação de compatibilidade
   ↓
Verificação de permissões
   ↓
Registro
   ↓
Boot
   ↓
Execução
   ↓
Shutdown, quando aplicável

10.1 Descoberta

O Loader identifica apenas plugins localizados em diretórios autorizados ou explicitamente registrados.

10.2 Validação

O manifesto e a interface pública devem ser validados antes da execução.

10.3 Compatibilidade

O plugin somente pode iniciar quando suas versões mínimas forem atendidas.

10.4 Registro

Nesta fase, o plugin pode registrar:

handlers;

listeners;

hooks;

rotas;

componentes;

templates;

tarefas;

configurações.

10.5 Boot

Nesta fase, os serviços essenciais já estão registrados.

O plugin pode inicializar integrações e listeners autorizados.

10.6 Shutdown

Utilizado apenas quando o ambiente ou processo exigir liberação explícita de recursos.

11. Contexto recebido

O plugin recebe um contexto controlado.

Exemplo conceitual:

context.config
context.events
context.logger
context.router
context.container
context.cache
context.storage
context.queues
context.registry
context.permissions

O contexto deve expor apenas interfaces públicas necessárias.

O plugin não recebe acesso irrestrito a:

bindings completos;

segredos globais;

internals do Core;

estado privado de módulos;

conexão D1 sem contrato;

arquivos arbitrários.

12. Dependências

Plugins podem depender de:

versão mínima do Core;

interfaces públicas do Core;

módulos oficialmente registrados;

eventos documentados;

contratos públicos;

outros plugins, somente quando inevitável e documentado.

Dependências circulares são proibidas.

Um plugin não pode declarar dependência implícita.

Toda dependência deve constar no manifesto.

13. Comunicação com módulos

Plugins não acessam arquivos internos de módulos.

Formas permitidas:

Event Bus;

contratos públicos;

APIs internas documentadas;

hooks aprovados;

serviços registrados no container;

endpoints autorizados;

dados publicados.

Forma proibida:

plugin → import direto de arquivo interno do módulo

Exemplo proibido:

// Plugins usam apenas a API pública autorizada do módulo; internos não são importados.

Exemplo permitido:

const listings = context.container.resolve("modules.listings");
await listings.create(data);

Somente quando essa interface estiver oficialmente publicada.

14. Eventos

Plugins podem publicar e consumir eventos registrados em EVENTS.md.

Regras:

declarar eventos no manifesto;

não inventar eventos silenciosamente;

manter payload compatível;

respeitar versionamento;

tratar reprocessamento;

implementar idempotência quando necessário;

não depender da ordem de outros consumidores.

Eventos exclusivos de um plugin devem utilizar namespace claro.

Exemplo:

AdvancedAnalyticsReportGenerated

15. Hooks

Hooks são pontos de extensão controlados.

Exemplos conceituais:

beforeRender
afterRender
beforePublish
afterPublish
beforeResponse
afterUpload
dashboardWidgets
navigationItems

Regras:

todo hook deve ser documentado;

entradas e retornos devem possuir contrato;

hooks não podem alterar dados críticos silenciosamente;

falhas devem ser isoladas;

hooks não podem criar dependência oculta;

hooks executados em sequência devem possuir ordem explícita.

16. Rotas

Um plugin pode registrar rotas quando autorizado.

Tipos:

rota pública;

rota autenticada;

rota administrativa;

webhook;

endpoint interno.

Toda rota deve declarar:

método HTTP;

caminho;

autenticação exigida;

permissão exigida;

rate limit;

cache;

handler;

formato de resposta.

Plugins não podem sobrescrever rotas existentes silenciosamente.

Conflitos devem impedir o boot.

17. Interface administrativa

Plugins podem adicionar elementos ao painel por pontos de extensão oficiais.

Exemplos:

item de menu;

página de configuração;

widget;

relatório;

ação contextual;

aba adicional.

Regras:

utilizar componentes oficiais;

respeitar layouts;

não injetar HTML arbitrário fora dos pontos autorizados;

respeitar permissões;

não duplicar páginas de módulos;

manter acessibilidade;

permitir desativação completa.

18. Componentes e templates

Plugins podem fornecer componentes e templates próprios.

Eles devem:

permanecer dentro do diretório do plugin;

utilizar contratos públicos de renderização;

não substituir templates oficiais sem autorização;

evitar dependência de internals visuais;

possuir assets versionados;

respeitar o Theme Engine.

Overrides somente podem ocorrer por mecanismo explícito e documentado.

19. Assets

Plugins podem incluir:

JavaScript;

CSS;

ícones;

imagens;

fontes autorizadas;

manifests.

Regras:

assets devem ser carregados apenas quando necessários;

nomes devem evitar colisão;

assets devem ser versionados;

bibliotecas externas devem ser justificadas;

não duplicar dependências já fornecidas;

não carregar código remoto sem aprovação;

seguir Content Security Policy.

20. Configuração

Configurações devem possuir schema.

Exemplo conceitual:

{
  "type": "object",
  "properties": {
    "enabled": {
      "type": "boolean"
    }
  },
  "required": ["enabled"],
  "additionalProperties": false
}

Regras:

validar antes de inicializar;

utilizar valores padrão explícitos;

separar segredos de configurações públicas;

não versionar credenciais;

não acessar variáveis aleatórias do ambiente;

documentar cada campo.

21. Feature Flags

Plugins podem ser controlados por Feature Flags.

Estados possíveis:

globalmente habilitado;

globalmente desabilitado;

habilitado por site;

habilitado por plano;

habilitado por ambiente;

habilitado para teste.

A regra de negócio de disponibilidade por plano pertence ao módulo responsável.

O Core fornece apenas o mecanismo técnico.

22. Permissões

Todo plugin deve operar com o menor privilégio possível.

Possíveis permissões técnicas:

ler configuração própria;

registrar eventos;

registrar rotas;

utilizar cache;

utilizar storage próprio;

publicar mensagens em fila específica;

acessar API pública de módulo;

renderizar componentes.

Permissões sensíveis devem ser aprovadas explicitamente.

23. Banco de dados

Plugins não acessam D1 diretamente por padrão.

Quando necessitarem persistência, devem utilizar:

repositório próprio autorizado;

API pública de módulo;

serviço registrado;

contrato específico.

Tabelas próprias, quando aprovadas, devem possuir prefixo ou namespace claro.

Exemplo:

plugin_advanced_analytics_reports

Migrations devem ficar em local documentado e seguir a governança do banco.

24. KV

Plugins podem utilizar KV apenas para:

cache;

artefatos derivados;

configuração pública derivada;

índices reconstruíveis;

estados técnicos não autoritativos.

KV nunca é fonte de verdade.

Chaves devem possuir namespace.

Exemplo:

plugin:advanced-analytics:report:2026-07

25. R2

Plugins podem utilizar R2 para objetos permanentes autorizados.

Chaves devem possuir namespace.

Exemplo:

plugins/advanced-analytics/exports/report.csv

Regras de retenção e acesso devem ser documentadas.

26. Queues

Plugins podem publicar tarefas em filas autorizadas.

Mensagens devem possuir:

tipo;

versão;

plugin;

identificador;

timestamp;

payload mínimo;

chave idempotente quando necessário.

O consumidor deve tratar:

repetição;

atraso;

falha;

tentativa;

descarte;

observabilidade.

27. Scheduler

Plugins podem registrar tarefas agendadas.

Toda tarefa deve declarar:

nome;

descrição;

frequência;

timeout;

política de repetição;

lock;

permissões;

dependências.

O plugin não deve criar agendamentos externos silenciosamente.

28. Integrações externas

Um plugin pode isolar uma integração opcional.

Entretanto, integrações essenciais a um domínio devem permanecer dentro do módulo responsável.

Exemplo oficial:

Asaas pertence ao domínio financeiro;

portanto, permanece no módulo Payments;

não deve ser transformado em plugin genérico.

Plugins não podem criar abstrações desnecessárias para provedores hipotéticos.

29. Segurança

Plugins são código privilegiado e devem ser tratados como superfície de risco.

Regras obrigatórias:

validar toda entrada;

não registrar segredos;

utilizar menor privilégio;

evitar eval;

evitar execução dinâmica arbitrária;

não baixar código em runtime;

validar webhooks;

utilizar assinatura quando aplicável;

aplicar rate limit;

proteger rotas administrativas;

manter dependências auditáveis;

impedir path traversal;

sanitizar saída HTML;

respeitar CSP.

30. Isolamento de falhas

Falha em plugin opcional não deve derrubar toda a plataforma.

O Loader deve:

registrar o erro;

marcar o plugin como falho;

impedir uso parcial inseguro;

manter outros plugins ativos;

preservar serviços essenciais;

permitir diagnóstico.

Exceção:

Um plugin declarado como obrigatório pode impedir o boot, desde que essa dependência esteja documentada e aprovada.

31. Observabilidade

Todo plugin deve registrar:

inicialização;

versão;

status;

falhas;

rotas registradas;

eventos consumidos;

tarefas executadas;

duração;

tentativas;

resultado.

Campos recomendados:

plugin
version
operation
requestId
eventId
jobId
duration
status
errorCode

32. Performance

Plugins devem ser carregados somente quando habilitados.

Diretrizes:

evitar dependências pesadas;

evitar inicialização desnecessária;

não aumentar navegação pública sem necessidade;

preferir processamento assíncrono;

utilizar cache de forma controlada;

não consultar D1 em páginas públicas;

carregar assets sob demanda;

limitar payloads;

evitar múltiplos listeners equivalentes.

33. Compatibilidade

Todo plugin deve declarar compatibilidade mínima.

Exemplo:

{
  "requires": {
    "core": ">=1.0.0 <2.0.0",
    "modules": {
      "analytics": ">=1.0.0"
    }
  }
}

Atualizações incompatíveis exigem:

nova versão major;

changelog;

instruções de migração;

validação antes do boot.

34. Versionamento

Plugins adotam SemVer:

MAJOR: mudança incompatível;

MINOR: nova funcionalidade compatível;

PATCH: correção compatível.

O manifesto e o código devem declarar a mesma versão.

35. Instalação

Instalação significa:

adicionar os arquivos autorizados;

validar o manifesto;

validar compatibilidade;

validar permissões;

executar migrations aprovadas;

registrar o plugin;

manter desabilitado por padrão quando apropriado;

habilitar explicitamente;

executar testes de saúde.

Nenhum plugin deve instalar código remoto durante a inicialização.

36. Habilitação

Fluxo:

Plugin instalado
    ↓
Configuração validada
    ↓
Dependências verificadas
    ↓
Permissões verificadas
    ↓
Plugin habilitado
    ↓
Register
    ↓
Boot

A habilitação deve ser reversível.

37. Desabilitação

Ao desabilitar, o plugin deve:

parar de registrar novas tarefas;

remover listeners quando o runtime permitir;

deixar de expor rotas;

ocultar elementos visuais;

preservar dados oficiais;

não apagar dados automaticamente;

registrar a alteração.

Desabilitar não significa desinstalar.

38. Desinstalação

Desinstalação exige ação explícita.

Fluxo:

desabilitar;

verificar dependências;

impedir novos processamentos;

concluir ou cancelar jobs;

exportar dados quando necessário;

executar rotina aprovada de remoção;

remover registros;

remover arquivos;

atualizar changelog.

Dados não devem ser destruídos sem confirmação explícita e política documentada.

39. Marketplace

O Marketplace de módulos e plugins é uma capacidade futura da plataforma.

Até sua implementação, plugins são instalados somente por processo controlado no repositório.

O Marketplace deverá validar:

identidade do fornecedor;

manifesto;

assinatura;

versão;

permissões;

compatibilidade;

segurança;

integridade;

licença;

histórico.

A existência futura do Marketplace não autoriza instalação dinâmica insegura.

40. Plugins internos e externos

40.1 Plugin interno

Mantido no mesmo repositório e sob governança direta do ACTS.

40.2 Plugin externo

Fornecido por terceiro ou repositório separado.

Plugins externos exigem controles adicionais:

revisão de código;

licença;

assinatura;

política de atualização;

análise de dependências;

auditoria de segurança;

responsável definido.

Inicialmente, recomenda-se apenas plugins internos.

41. Testes

Cada plugin deve possuir testes proporcionais ao risco.

Tipos:

manifesto;

compatibilidade;

register;

boot;

shutdown;

eventos;

hooks;

rotas;

permissões;

configuração;

falhas;

idempotência;

integração;

desabilitação.

Um plugin não pode ser considerado estável sem testes de habilitação e desabilitação.

42. Critérios de aceitação

Um plugin será aprovado quando:

possuir responsabilidade clara;

for realmente opcional;

não alterar o Core;

não acessar internals de módulos;

possuir manifesto válido;

declarar dependências;

declarar permissões;

possuir configuração validada;

possuir interface pública;

tratar falhas;

respeitar segurança;

ser testável;

permitir desabilitação;

estar documentado;

atualizar o changelog.

43. Checklist de revisão

Antes da aprovação:

possui manifest.json;

nome é único;

versão está correta;

responsabilidade é clara;

é realmente um plugin;

dependências estão declaradas;

não existem dependências circulares;

permissões estão declaradas;

eventos estão documentados;

hooks estão documentados;

rotas estão protegidas;

configuração possui schema;

segredos não estão versionados;

não acessa arquivos internos de módulos;

não consulta D1 sem contrato;

utiliza namespace em KV e R2;

consumidores são idempotentes;

falhas são isoladas;

assets são carregados sob demanda;

testes foram executados;

desabilitação foi testada;

documentação foi atualizada;

changelog foi atualizado.

44. Plugins iniciais

Nenhum plugin deve ser criado apenas para preencher a estrutura.

A lista inicial permanece vazia até existir necessidade funcional concreta.

Possíveis plugins futuros devem ser avaliados individualmente e não constituem aprovação antecipada.

45. Governança

A criação ou alteração de um plugin exige:

proposta;

definição da responsabilidade;

justificativa de opcionalidade;

contrato;

análise de segurança;

análise de dependências;

documentação;

implementação;

testes;

revisão;

aprovação;

changelog;

commit.

Plugins de alto impacto podem exigir RFC e ADR.

46. Autoridade documental

A interpretação de plugins deve respeitar esta ordem:

ARCHITECTURE.md;

CORE.md;

PLUGINS.md;

MODULES.md;

EVENTS.md;

SCHEMAS.md;

CLOUDFLARE.md;

manifesto do plugin;

documentação específica;

implementação.

Em caso de contradição, a documentação deve ser corrigida antes da continuidade da implementação.

47. Regra final

Plugins existem para ampliar a plataforma sem enfraquecer sua arquitetura.

Um plugin deve ser opcional, isolado, verificável e removível.

Nenhum plugin pode transformar o Core em dependente de extensões, acessar internals de módulos ou criar acoplamento oculto.

Quando houver dúvida entre módulo e plugin, a responsabilidade funcional deve ser analisada primeiro.

Funcionalidade essencial pertence ao módulo.

Extensão opcional pertence ao plugin.
