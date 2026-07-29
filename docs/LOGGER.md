ACTS Portal

LOGGER

Versão: 1.0Status: OficialEscopo: app/core/logger.js

1. Objetivo

A camada Logger é responsável pela observabilidade da plataforma ACTS.

Seu objetivo é registrar informações técnicas, facilitar auditorias e apoiardiagnósticos sem interferir na lógica de negócio.

2. Princípios

Responsabilidade única.

Logs estruturados.

Observabilidade por padrão.

Segurança em primeiro lugar.

Baixo impacto de desempenho.

3. Responsabilidades

O Logger pode:

registrar eventos;

registrar erros;

registrar auditorias técnicas;

medir duração;

correlacionar requisições.

Não pode:

conter regras de negócio;

armazenar segredos;

modificar dados.

4. Níveis

DEBUG

INFO

WARN

ERROR

FATAL

Cada nível deve possuir finalidade clara.

5. Estrutura mínima

Todo log deve permitir registrar:

timestamp;

level;

message;

requestId;

correlationId;

module;

duration;

status.

6. Auditoria

Registrar:

login;

logout;

alterações críticas;

exclusões;

publicações;

falhas relevantes.

7. Segurança

Nunca registrar:

senhas;

tokens completos;

segredos;

chaves privadas;

dados financeiros sensíveis.

8. Integração

Integra-se com:

Bootstrap;

Auth;

Security;

DB;

Event Bus;

Publisher;

Router.

9. Observabilidade

Permitir identificar:

origem da requisição;

duração;

consumidor;

evento;

erro;

usuário quando aplicável.

10. Performance

evitar logs redundantes;

minimizar serialização;

permitir níveis configuráveis.

11. Retenção

A política de retenção deve ser configurável conforme ambiente e requisitosoperacionais.

12. Testes

Cobrir:

níveis;

correlação;

mascaramento;

auditoria;

desempenho.

13. Critérios de aceitação

logs estruturados;

seguros;

observáveis;

configuráveis;

testáveis.

14. Regra final

Toda camada do Portal ACTS deve utilizar exclusivamente o Logger do Core pararegistro de informações técnicas e operacionais.
