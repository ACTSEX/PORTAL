ACTS Portal

OPERATIONS

Versão: 1.0Status: Oficial

1. Objetivo

Este documento define os procedimentos operacionais oficiais do Portal ACTS.

Seu objetivo é garantir disponibilidade, estabilidade, rastreabilidade e rápidaresposta a incidentes.

2. Princípios

Operação contínua.

Automação sempre que possível.

Observabilidade por padrão.

Recuperação rápida.

Melhoria contínua.

3. Monitoramento

Monitorar continuamente:

disponibilidade;

latência;

erros;

filas;

cache;

banco de dados;

consumo de recursos.

4. Incidentes

Todo incidente deve possuir:

identificação;

classificação;

prioridade;

responsável;

plano de ação;

registro de encerramento.

5. Backup e recuperação

Os procedimentos devem prever:

backup de dados críticos;

testes periódicos de restauração;

documentação do processo de recuperação.

6. Operação diária

Verificar regularmente:

filas;

publicações;

jobs agendados;

integridade dos artefatos;

métricas da plataforma.

7. Manutenção

Manutenções devem ser:

planejadas;

documentadas;

comunicadas;

reversíveis quando possível.

8. Observabilidade

Correlacionar:

requestId;

correlationId;

logs;

métricas;

eventos.

9. Segurança operacional

Revisar periodicamente:

acessos;

permissões;

segredos;

auditorias;

alertas.

10. Capacidade

Monitorar crescimento de:

armazenamento;

tráfego;

filas;

banco;

cache.

Planejar expansão antes da saturação.

11. Checklist operacional

Monitoramento ativo.

Alertas configurados.

Backups validados.

Filas saudáveis.

Logs íntegros.

Dashboards atualizados.

Antes do aceite final do Lote 18 também devem estar comprovados: runbooks de deploy, rollback e incidente; responsáveis e canais de escalonamento; alertas com limiares; correlação por `requestId`/`correlationId`; restauração testada; e monitoramento capaz de detectar consulta pública direta ao D1.

Após cada lote implantável, a observabilidade e os runbooks afetados acompanham a mesma PR. O Lote 18 valida o conjunto e não posterga requisitos operacionais conhecidos dos lotes anteriores.

12. Regra final

A operação do Portal ACTS deve ser continuamente monitorada, documentada eorientada por processos padronizados para garantir alta disponibilidade econfiabilidade.
