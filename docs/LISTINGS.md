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

## Estado atual e contrato alvo do anúncio ACTS

**ESTADO ATUAL:** `Listings.js`, schemas, banco e migrations ainda preservam campos e fluxos do domínio imobiliário original. Eles explicam compatibilidade física e não definem o produto AcompanhanteSex. Esta etapa não os altera.

**CONTRATO/ESTADO ALVO:** Listing é o único anúncio comercial principal da conta anunciante. Preserva owner, categoria, `city_id` canônico, slug, status, datas, mídia ACTS, moderação e publicação; sem semântica normativa de sale/rent, imóvel, preço/endereço imobiliário ou imobiliarista. A migração forward-only e o desenho físico pertencem ao 13E. O anúncio existe em STANDARD e PREMIUM; minisite e compra de novos boosts dependem de PREMIUM.
