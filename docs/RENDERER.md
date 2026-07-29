ACTS Portal

RENDERER

Versão: 1.0Status: OficialEscopo: app/core/renderer.js

1. Objetivo

O Renderer é responsável exclusivamente pela transformação de dados em artefatosde apresentação.

Ele recebe dados preparados pelos módulos ou pelo Publisher e produz HTML, JSON,XML ou outros formatos de saída.

O Renderer não contém regras de negócio.

2. Princípios

Separação entre lógica e apresentação.

Renderização determinística.

Componentes reutilizáveis.

Templates independentes do domínio.

Compatível com Edge Runtime.

3. Fluxo oficial

Módulo
   ↓
Dados
   ↓
Renderer
   ↓
Layout
   ↓
Template
   ↓
Componentes
   ↓
HTML / JSON

4. Responsabilidades

O Renderer pode:

aplicar layouts;

renderizar templates;

compor componentes;

gerar HTML;

gerar JSON público;

gerar XML (sitemap, feeds);

escapar conteúdo quando necessário.

O Renderer não pode:

consultar D1;

acessar APIs externas;

executar regras de negócio;

modificar entidades;

decidir permissões.

5. Estrutura sugerida

app/
├── layouts/
├── templates/
└── components/

Cada elemento possui responsabilidade única.

6. Layouts

Layouts definem a estrutura comum:

head;

header;

footer;

sidebar;

áreas de conteúdo.

7. Templates

Templates representam páginas específicas:

home;

listing;

categoria;

cidade;

painel;

erro.

8. Componentes

Componentes são reutilizáveis:

card;

menu;

breadcrumbs;

paginação;

banner;

formulário.

Devem ser independentes entre si.

9. Contexto

O Renderer recebe um contexto contendo apenas os dados necessários para arenderização.

Não deve realizar consultas adicionais.

10. Segurança

Todo conteúdo dinâmico deve ser tratado para evitar XSS.

Nunca renderizar HTML arbitrário sem sanitização.

11. Performance

Evitar renderizações duplicadas.

Reutilizar componentes.

Minimizar alocações.

Produzir saída adequada para cache.

12. Integração

O Publisher utiliza o Renderer para gerar artefatos públicos.

O Renderer não publica conteúdo.

13. Testes

Cobrir:

layouts;

templates;

componentes;

escape;

renderização completa;

casos de erro.

14. Critérios de aceitação

sem regras de negócio;

sem acesso direto ao banco;

reutilização de componentes;

compatível com Cloudflare;

testável.

15. Regra final

Toda geração de saída visual do Portal ACTS deve passar pelo Renderer.

A lógica de negócio permanece exclusivamente nos módulos e no Core.
