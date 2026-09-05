# Rodada 2 — núcleo privado

## Entregue

- Google OIDC code flow com PKCE; modo sem credenciais fail-closed.
- Primeiro acesso cria `clienteId` aleatório permanente e estados privados separados.
- CPF validado e indexado por HMAC; maioridade no fuso `America/Sao_Paulo`.
- Cadastro por contrato, bloqueio de dados protegidos no Worker e controle otimista por revisão.
- Upload privado pelo Worker (JPEG/PNG/WebP, magic bytes, 5 MiB, nomes do servidor).
- Painel mobile-first único; resumo, avisos e administração baseada em papel.
- Decisões humanas, correção protegida motivada, plano/vencimento manual e auditoria imutável.

## Rotas

Além de `/api/health`: `/api/auth/google/{config,start,callback}`, `/api/auth/{session,logout,logout-all}`, `/api/cadastro`, `/api/cadastro/{status,contato-endereco,documentos}`, `/api/painel/{resumo,avisos}`, `/api/painel/avisos/{id}/lido`, `/api/superadmin/clientes` e operações por cliente `decisao`, `dados-protegidos`, `plano`, `avisos`, `auditoria` e leitura protegida de documentos.

## Privacidade e concorrência

Todas as gravações usam apenas o adaptador criado de `env.acts_private`; o código não grava em `acts_public`. CPF bruto existe somente na identidade. Índices usam HMAC e create-only. A atualização de documentos JSON exige revisão conhecida; conflito retorna 409. Auditoria usa objetos imutáveis individuais. Uma falha depois da reserva do CPF executa rollback lógico da reserva.

## Limites deliberados

Nada público é publicado. Não existem cards, minisites, shards, transformação de mídia pública, cron, migração, deploy ou cobrança. A consulta de CEP é uma interface injetável; nenhum fornecedor está ativado e falha sempre permite preenchimento manual. Limites comerciais continuam pendentes. A atomicidade forte entre vários objetos R2 é limitada pelo serviço; índices usam criação condicional e fluxos aplicam rollback lógico.
