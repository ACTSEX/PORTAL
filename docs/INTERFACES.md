ACTS Portal

INTERFACES

Versão: 1.0Status: OficialEscopo: app/interfaces/

1. Objetivo

Este documento define as interfaces técnicas públicas utilizadas pelo Core.

Interfaces desacoplam contratos das implementações concretas.

2. Princípios

Interfaces descrevem comportamento.

Não possuem regras de negócio.

Não dependem de implementações.

Podem ser implementadas por diferentes provedores.

3. Interfaces oficiais

DatabaseInterface

Responsável por operações genéricas de persistência.

Exemplos:

query()

execute()

batch()

transaction()

CacheInterface

Responsável por cache.

Exemplos:

get()

put()

delete()

invalidate()

StorageInterface

Responsável por armazenamento permanente.

Exemplos:

upload()

download()

delete()

exists()

QueueInterface

Responsável por filas.

Exemplos:

publish()

consume()

LoggerInterface

Responsável por observabilidade.

Exemplos:

debug()

info()

warn()

error()

RendererInterface

Responsável pela renderização.

Exemplos:

render()

renderComponent()

renderLayout()

PublisherInterface

Responsável pela publicação de artefatos.

Exemplos:

publish()

invalidate()

rebuild()

4. Organização

app/interfaces/
├── DatabaseInterface.js
├── CacheInterface.js
├── StorageInterface.js
├── QueueInterface.js
├── LoggerInterface.js
├── RendererInterface.js
└── PublisherInterface.js

Arquivos devem ser criados apenas quando houver implementação real.

5. Regras

Módulos dependem de interfaces.

O Core fornece implementações.

Plugins utilizam apenas interfaces públicas.

Implementações podem mudar sem quebrar consumidores.

6. Compatibilidade

Mudanças incompatíveis exigem:

nova versão;

atualização do CHANGELOG;

migração documentada.

7. Checklist

responsabilidade única

documentação completa

sem regra de negócio

sem dependência de implementação

testável

8. Regra final

Nenhuma camada da plataforma deve depender diretamente de detalhes internos de uma implementação quando existir uma interface pública equivalente.
