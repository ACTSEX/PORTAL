ACTS Portal

CODING_STANDARDS

Versão: 1.0Status: Oficial

1. Objetivo

Este documento define os padrões oficiais de desenvolvimento do Portal ACTS.

Todo código da plataforma deve seguir estas regras para manter consistência,legibilidade, testabilidade e facilidade de manutenção.

2. Princípios

Simplicidade.

Legibilidade.

Baixo acoplamento.

Alta coesão.

Responsabilidade única.

3. Organização

Cada arquivo possui uma responsabilidade principal.

Evitar dependências circulares.

Reutilizar componentes do Core.

Não duplicar lógica.

4. Nomenclatura

Arquivos:

PascalCase para classes.

camelCase para utilitários.

nomes descritivos.

Variáveis:

camelCase.

evitar abreviações.

Constantes:

UPPER_SNAKE_CASE.

5. Tamanho

Arquivos preferencialmente até 500 linhas.

Funções preferencialmente até 80 linhas.

Métodos preferencialmente até 40 linhas.

Exceções devem ser justificadas e documentadas.

6. Imports

Importar apenas o necessário.

Evitar dependências implícitas.

Preferir interfaces e contratos.

7. Tratamento de erros

Usar erros de domínio no módulo e normalização técnica nas fronteiras já autorizadas; não criar `errors.js`.

Nunca ignorar exceções silenciosamente.

Registrar erros relevantes no Logger.

8. Comentários

Comentar:

decisões complexas;

algoritmos não triviais;

limitações conhecidas.

Evitar comentários óbvios.

9. Testes

Toda funcionalidade relevante deve possuir testes compatíveis com TESTING.md.

10. Revisão

Antes do merge verificar:

arquitetura;

segurança;

testes;

documentação;

impacto em contratos.

11. Regra final

Todo código do Portal ACTS deve respeitar a CONSTITUTION, os ADRs aprovados eestes padrões de desenvolvimento.
