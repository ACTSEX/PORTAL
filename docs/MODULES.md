ACTS Portal

MODULES

Versão: 1.0Status: Oficial

Objetivo

Este documento define os módulos oficiais do Portal ACTS.

Cada módulo representa um domínio de negócio independente.

O Core nunca implementa regras de negócio.

Regras Gerais

Um módulo possui uma responsabilidade principal.

Comunicação por Event Bus, contratos e interfaces públicas.

Nenhum módulo acessa arquivos internos de outro módulo.

Integrações externas ficam isoladas.

Um módulo começa como um único arquivo e só é dividido quando houver necessidade real.

Módulos Oficiais

Módulo

Responsabilidade

AI

Recursos de inteligência artificial

Analytics

Métricas e estatísticas

Auth

Autenticação

Categories

Categorias

Compare

Comparação de anúncios

Contacts

Contatos e formulários

Dashboard

Painéis administrativos

Favorites

Favoritos

Geolocation

Geolocalização

Imobiliaristas

Perfis de corretores

Integrations

Integrações externas

Leads

Gestão de leads

Listings

Anúncios

Maps

Mapas

Media

Biblioteca de mídia

Notifications

Notificações

Payments

Cobranças e pagamentos

Plans

Planos

Publish

Publicação de artefatos

Reports

Relatórios

Reviews

Avaliações

Search

Busca

Seo

SEO

Subscriptions

Assinaturas

Upload

Upload de arquivos

Users

Usuários

Dependências

Todos os módulos podem utilizar serviços do Core.

Nenhum módulo depende diretamente de outro módulo.

Quando uma integração for necessária, utilizar:

Event Bus;

interfaces públicas;

contratos documentados.

Integrações

Integrações externas devem permanecer isoladas.

Inicialmente:

Asaas (financeiro)

Novas integrações deverão ser documentadas antes da implementação.

Eventos

Cada módulo poderá publicar e consumir eventos.

A documentação completa ficará em EVENTS.md.

Evolução

Um módulo poderá ser dividido quando:

possuir múltiplas responsabilidades;

integrar provedores externos;

ultrapassar os limites arquiteturais;

exigir equipes independentes.

Estado

Todos os módulos encontram-se planejados.

A implementação seguirá rigorosamente a ordem definida em ROADMAP.md.
