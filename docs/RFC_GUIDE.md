ACTS Portal

RFC_GUIDE

Versão: 1.0Status: Oficial

1. Objetivo

Este documento define o processo oficial de RFC (Request for Comments) doPortal ACTS.

Toda mudança arquitetural, funcional ou operacional com impacto relevante devepassar pelo processo de RFC antes da implementação.

2. Quando criar uma RFC

Criar uma RFC para:

novos módulos;

mudanças na arquitetura;

alterações em contratos públicos;

mudanças em eventos;

integrações relevantes;

alterações de segurança;

mudanças de infraestrutura.

3. Fluxo oficial

Ideia
  ↓
RFC
  ↓
Análise
  ↓
Discussão
  ↓
Aprovação
  ↓
ADR (quando aplicável)
  ↓
Implementação
  ↓
Deploy

4. Estrutura

Cada RFC deve conter:

Número;

Título;

Autor;

Data;

Objetivo;

Contexto;

Motivação;

Solução proposta;

Impactos;

Alternativas;

Plano de implantação;

Plano de rollback.

5. Status

Rascunho

Em análise

Aprovada

Rejeitada

Implementada

Arquivada

6. Template

# RFC 000X

## Objetivo

## Contexto

## Problema

## Solução proposta

## Impactos

## Alternativas

## Implantação

## Rollback

7. Regras

Uma RFC trata um único assunto.

Toda decisão deve ser documentada.

RFC aprovada não substitui ADR quando houver decisão arquitetural permanente.

8. Critérios de aprovação

Compatibilidade com a CONSTITUTION;

Impactos identificados;

Riscos documentados;

Plano de implantação e rollback definidos.

9. Regra final

Nenhuma alteração estrutural relevante deve ser implementada sem passar peloprocesso oficial de RFC.
