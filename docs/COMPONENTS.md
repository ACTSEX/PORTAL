ACTS Portal

COMPONENTS

Versão: 1.0Status: Oficial

Objetivo

Este documento define os componentes reutilizáveis da interface do Portal ACTS.

Componentes são elementos visuais reutilizáveis.

Eles não implementam regras de negócio.

Regras

Recebem dados prontos.

Não acessam D1.

Não executam consultas.

Não conhecem módulos.

Devem ser reutilizáveis.

Devem ser independentes do layout.

Componentes Oficiais

Componente

Finalidade

Alert

Mensagens e avisos

Breadcrumb

Navegação hierárquica

Button

Botões padronizados

Card

Exibição resumida de conteúdo

Form

Estrutura de formulários

Gallery

Galeria de imagens

Grid

Organização em grade

Menu

Navegação

Modal

Janelas modais

Pagination

Paginação

Table

Tabelas

Tabs

Abas

Organização

app/components/
├── Alert.js
├── Breadcrumb.js
├── Button.js
├── Card.js
├── Form.js
├── Gallery.js
├── Grid.js
├── Menu.js
├── Modal.js
├── Pagination.js
├── Table.js
└── Tabs.js

Boas Práticas

Componentes devem ser pequenos.

Um componente deve possuir responsabilidade única.

Não duplicar componentes semelhantes.

Preferir composição em vez de herança.

Receber configuração por propriedades.

Layouts

Layouts utilizam componentes para montar páginas completas.

Componentes não devem conhecer layouts específicos.

Templates

Templates combinam layouts e componentes para renderizar páginas.

Evolução

Novos componentes somente devem ser adicionados quando houver reutilização real.

Elementos utilizados uma única vez devem permanecer no template correspondente.

Estado

Todos os componentes listados estão aprovados conceitualmente.

A implementação seguirá a ordem definida no ROADMAP.
