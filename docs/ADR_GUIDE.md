ACTS Portal

ADR_GUIDE

Versão: 1.0Status: Oficial

1. Objetivo

Este documento define o padrão oficial para Architecture Decision Records (ADRs)do Portal ACTS.

Toda decisão arquitetural permanente deve possuir um ADR.

2. Estrutura

Cada ADR deve conter:

Número

Título

Status

Data

Contexto

Problema

Alternativas

Decisão

Consequências

Referências

3. Numeração

docs/ADR/
├── 0001-edge-first.md
├── 0002-event-bus.md
├── 0003-publisher.md
├── 0004-d1-first.md
└── 0005-modular-architecture.md

Os números nunca devem ser reutilizados.

4. Status permitidos

Proposto

Aprovado

Substituído

Obsoleto

5. Regras

Um ADR trata apenas uma decisão.

ADRs aprovados tornam-se referência oficial.

Mudanças arquiteturais devem atualizar o ADR correspondente.

6. Template

# ADR 000X

## Status

## Contexto

## Problema

## Alternativas

## Decisão

## Consequências

## Referências

7. Regra final

Nenhuma alteração estrutural importante deve ser implementada sem um ADRaprovado e documentado.
