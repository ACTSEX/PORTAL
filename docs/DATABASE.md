# ACTS — banco de dados

## Fonte de verdade

O Cloudflare D1 é a fonte autoritativa do estado relacional. O binding é
`ACTS_DB`, o banco é `portal-db` e as migrations forward-only ficam em
`database/migrations/`. `database/schema.sql` é o snapshot usado por testes e
ferramentas locais; migrations aplicadas não devem ser reescritas.

R2 não substitui o banco. `ACTS_MEDIA` (`acts-midias`) preserva mídia e
`ACTS_DATA` (`acts-dados`) armazena projeções públicas reconstruíveis. O catálogo
público é derivado do D1 e distribuído por cache HTTP/Edge, sem KV.

## Alterações e migrations

1. Criar uma nova migration numerada, pequena e forward-only.
2. Atualizar `database/schema.sql` para representar uma instalação nova.
3. Cobrir instalação limpa e evolução nos testes de banco.
4. Executar localmente `npm run db:migrate:local` antes de qualquer ambiente remoto.
5. Em operação remota, confirmar conta, ambiente, database ID e backup antes de
   `npm run db:migrate:staging` ou `npm run db:migrate:production`.

Deploy do Worker não aplica migration automaticamente. Backfills devem ser
idempotentes, retomáveis, paginados e dry-run por padrão; o utilitário atual de
cidades é executado com `npm run city:backfill`.

## Integridade

- Usar SQL parametrizado e validar entradas antes da persistência.
- Confirmar a mutação em D1 antes de emitir eventos ou trabalho para a Queue.
- Não guardar secrets, tokens ou payloads integrais de provedores.
- Tratar projeções R2 como derivados: falhas de publicação não alteram a verdade
  do negócio e a recuperação deve partir do D1.
# ETAPA 10

`commercial_conditions` modela condição comercial auditável sem sobrepor `plans`/`subscriptions`. `boosts` liga anúncio e proprietário à cobrança, guarda produto/duração, preço histórico autoritativo e seu próprio ciclo de estado. A migration forward-only é `0005_paid_boosts.sql`; não requer cron e não deve ser aplicada remotamente por este trabalho.
