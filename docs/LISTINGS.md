ACTS Portal

LISTINGS

Versão: 1.0Status: OficialMódulo: Listings

1. Objetivo

O módulo Listings é responsável pelo ciclo de vida dos anúncios publicados naplataforma ACTS.

2. Responsabilidades

criar anúncios;

editar anúncios;

arquivar anúncios;

excluir anúncios;

controlar status;

publicar eventos do domínio.

Não é responsável por autenticação, pagamentos ou renderização.

3. Dependências

Core

DB

Event Bus

Storage

Auth

Security

4. Eventos Publicados

ListingCreated

ListingUpdated

ListingPublished

ListingArchived

ListingDeleted

5. Eventos Consumidos

UserDeleted

SubscriptionCancelled

PublishCompleted

6. Status

Draft

Pending

Published

Archived

Deleted

7. APIs Públicas

Criar anúncio

Atualizar anúncio

Consultar anúncio

Listar anúncios

Arquivar anúncio

Excluir anúncio

8. Regras de Negócio

Todo anúncio pertence a um proprietário.

Alterações devem ser auditadas.

Publicação gera eventos.

Exclusões devem respeitar regras de integridade.

9. Segurança

Permissões obrigatórias.

Validação de entrada.

Auditoria de alterações.

10. Testes

Cobrir:

CRUD;

transições de status;

publicação de eventos;

autorização.

11. Checklist

Documentação atualizada.

Eventos documentados.

Testes aprovados.

Compatível com CONSTITUTION.

Compatível com MODULE_SPECIFICATION.

Regra final

Toda manipulação de anúncios do Portal ACTS deve ocorrer exclusivamente atravésdo módulo Listings.
