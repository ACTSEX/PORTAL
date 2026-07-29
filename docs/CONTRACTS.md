ACTS Portal

CONTRACTS

Versão: 1.0Status: OficialEscopo: app/contracts/

1. Objetivo

Este documento define os contratos públicos da plataforma ACTS.

Contratos estabelecem como módulos, plugins e o Core podem se comunicar semdependências diretas.

Um contrato é um compromisso de comportamento, não uma implementação.

2. Princípios

Contratos são públicos.

Devem ser estáveis.

Devem ser versionados.

Não podem depender de detalhes internos.

Alterações incompatíveis exigem nova versão.

3. Tipos de contratos

Contratos de Serviço

Definem operações públicas.

Exemplos:

AuthService

ListingsService

PaymentsService

Contratos de Evento

Definem payloads dos eventos publicados.

Referência: EVENTS.md

Contratos HTTP

Definem entradas e saídas de endpoints.

Contratos de Dados

Definem estruturas compartilhadas entre módulos.

Referência: SCHEMAS.md

4. Estrutura prevista

app/contracts/
├── services/
├── events/
├── http/
└── data/

Os diretórios devem ser criados somente quando houver implementação real.

5. Regras

Um contrato não contém regra de negócio.

Um contrato não acessa banco.

Um contrato não depende de outro contrato interno sem necessidade.

Implementações podem evoluir sem quebrar o contrato.

6. Versionamento

Adotar SemVer.

Mudanças incompatíveis:

nova versão MAJOR;

atualização do CHANGELOG;

documentação de migração.

7. Compatibilidade

Módulos devem depender do contrato, nunca da implementação.

Fluxo:

Módulo
   ↓
Contrato
   ↓
Implementação

8. Critérios de aceitação

Um contrato é considerado válido quando:

possui responsabilidade única;

é compreensível;

é independente da implementação;

possui documentação;

possui versionamento;

é testável.

9. Checklist

responsabilidade única

interface pública clara

documentação atualizada

sem regra de negócio

sem dependência circular

compatível com versões suportadas

10. Regra final

Nenhum módulo deve acessar detalhes internos de outro módulo.

Toda comunicação compartilhada deve ocorrer por contratos públicos,eventos documentados ou APIs oficialmente expostas.
