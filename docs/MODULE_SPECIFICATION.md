ACTS Portal

MODULE_SPECIFICATION

Versão: 1.0Status: Oficial

1. Objetivo

Este documento define o contrato obrigatório para todos os módulos do Portal ACTS.

Todo módulo deve seguir esta especificação para garantir interoperabilidade,baixo acoplamento e padronização.

2. Princípios

Responsabilidade única.

Baixo acoplamento.

Alta coesão.

Comunicação por contratos.

Reutilização do Core.

3. Estrutura mínima

Cada módulo deve conter, quando aplicável:

entidade;

serviço;

repositório;

validador;

eventos;

interfaces públicas;

testes;

documentação.

4. Dependências

Um módulo pode depender apenas de:

Core;

Interfaces;

Contracts;

Event Bus.

É proibido acessar arquivos internos de outro módulo.

5. Comunicação

Toda comunicação entre módulos deve ocorrer por:

Event Bus;

Interfaces públicas;

Contracts oficiais.

6. Eventos

Cada módulo deve documentar:

eventos publicados;

eventos consumidos;

payloads;

versionamento.

7. APIs públicas

Interfaces expostas devem ser:

estáveis;

documentadas;

versionáveis;

testadas.

8. Testes

Todo módulo deve possuir:

testes unitários;

testes de integração quando aplicável;

testes de contrato para APIs públicas.

9. Documentação

Cada módulo deve incluir:

objetivo;

responsabilidades;

dependências;

eventos;

limitações.

10. Checklist

Antes da aprovação verificar:

conformidade com a CONSTITUTION;

aderência aos ADRs;

documentação atualizada;

testes aprovados;

eventos documentados.

11. Regra final

Nenhum módulo pode ser integrado ao Portal ACTS sem cumprir integralmente estaespecificação.
