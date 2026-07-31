ACTS Portal

DEPLOYMENT

Versão: 1.0Status: Oficial

1. Objetivo

Este documento define o processo oficial de implantação (Deployment) do PortalACTS.

Todo deploy deve ser previsível, reproduzível, seguro e passível de rollback.

2. Ambientes

Ambientes suportados:

development

staging

production

Cada ambiente deve possuir configurações, bindings e dados apropriados.

3. Pipeline

Fluxo oficial:

Commit
  ↓
CI
  ↓
Testes
  ↓
Build
  ↓
Deploy
  ↓
Validação
  ↓
Monitoramento

Nenhum deploy deve ignorar etapas obrigatórias.

O pipeline é promovido por lote funcional. Cada PR contém uma única fronteira, seus testes e no máximo os limites de revisão definidos no `ROADMAP.md`. O lote seguinte somente parte da `main` depois do merge aprovado do anterior.

4. Cloudflare

O processo de implantação deve considerar:

Pages;

Pages Functions;

D1;

KV;

R2;

Queues;

Cache.

5. Migrações

Toda alteração de banco deve:

possuir migration;

ser versionada;

ser reversível quando possível.

6. Publicação

Após alterações aprovadas:

atualizar artefatos;

publicar conteúdo no KV/R2 quando aplicável;

invalidar cache afetado.

7. Rollback

Todo deploy deve possuir estratégia documentada de rollback.

Sempre preservar integridade dos dados.

Antes do aceite do Lote 18, o rollback deve ser ensaiado em staging, incluindo versão anterior da aplicação, artefatos publicados, invalidação de cache e restauração verificada quando uma migration não puder ser revertida com segurança.

8. Checklist

Antes do deploy verificar:

testes aprovados;

documentação atualizada;

migrations revisadas;

feature flags;

monitoramento configurado.

9. Pós-deploy

Monitorar:

erros;

performance;

filas;

cache;

disponibilidade.

O deploy final é incremental: validar migrations, publicar em staging, executar smoke e segurança, promover de forma gradual, observar métricas e interromper ou reverter ao ultrapassar os limiares aprovados. A evidência integra o aceite final do Lote 18.

10. Regra final

Nenhuma implantação do Portal ACTS deve ocorrer sem validação automatizada,procedimento de rollback e monitoramento pós-deploy.
