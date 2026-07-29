ACTS Portal

SCHEMAS

Versão: 1.0Status: Oficial

Objetivo

Este documento define os schemas oficiais utilizados pelo Portal ACTS.

Schemas padronizam estruturas de dados, validações e contratos entre módulos.

Eles não substituem as regras de negócio.

Princípios

Todo schema possui uma responsabilidade única.

Schemas são independentes da interface.

Schemas não acessam banco de dados.

Alterações incompatíveis devem ser documentadas.

Todo schema deve possuir versão.

Organização

app/schemas/
├── listing.schema.json
├── user.schema.json
├── profile.schema.json
├── plan.schema.json
├── settings.schema.json
└── theme.schema.json

Schemas Oficiais

listing.schema.json

Responsável por validar:

anúncio

tipo

categoria

localização

preço

atributos

publicação

user.schema.json

Responsável por validar:

usuário

autenticação

permissões

dados cadastrais

profile.schema.json

Responsável por validar:

perfil público

corretor

empresa

contatos

redes sociais

plan.schema.json

Responsável por validar:

planos

limites

recursos

cobrança

settings.schema.json

Responsável por validar:

configurações gerais

parâmetros do sistema

recursos habilitados

theme.schema.json

Responsável por validar:

tema

cores

layout

componentes visuais

Versionamento

Todo schema deverá possuir controle de versão.

Mudanças incompatíveis devem gerar nova versão ou migração correspondente.

Regras

Validar entradas antes das regras de negócio.

Nunca confiar em dados externos.

Reutilizar schemas quando possível.

Evitar duplicação.

Relação com o D1

Schemas validam dados.

O D1 continua sendo a única fonte oficial de armazenamento.

Estado

Os schemas listados representam a estrutura inicial aprovada.

Novos schemas deverão ser registrados neste documento antes de sua implementação.
