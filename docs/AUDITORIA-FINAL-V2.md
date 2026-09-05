# Auditoria final da V2 — Rodada 5

Data: 2026-09-05. Escopo: arquitetura, contratos, autenticação OIDC, sessão, cadastro/maioridade/documentos, painéis, formulário, mídias, publicação, portal/minisites, shards/índices/cron/cache/R2, rotas, workflows, recuperação, acessibilidade, móvel e financeiro. Estado inicial: `d056372`, merges explícitos dos PRs #1–#4, `npm ci` sem vulnerabilidades e `npm run check` com 42/42 testes e build aprovado. O snapshot não contém ref local `main`; a integração foi comprovada pelos quatro merge commits ancestrais.

## Método e resultado

Revisão integral dos arquivos versionados, busca estática por segredos, bindings alternativos, sinks HTML, chamadas externas e deploy; testes com storages falsos; `npm audit`; inspeção de tamanhos. Não houve acesso à conta Cloudflare, buckets ou Asaas. A consulta web à documentação oficial falhou com HTTP 401 no ambiente; por isso rotas devem ser validadas na homologação contra a documentação/conta atual antes de `apply`.

| ID | Nível inicial | Achado | Correção/decisão | Residual |
|---|---|---|---|---|
| A-01 | ALTO | Erros 500 retornavam `error.message`, podendo revelar caminhos/bindings internos. | Resposta uniforme `INTERNAL_ERROR`; códigos controlados apenas em 4xx. | Encerrado. |
| A-02 | ALTO | Limite dependia somente de `Content-Length`, contornável com corpo chunked. | Mede bytes reais em JSON comum e webhook. | Encerrado. |
| A-03 | ALTO | Asaas era apenas stub, sem bloqueio configurável nem webhook idempotente. | Cliente fechado por padrão, sandbox/produção separados, timeout, token, create-only e conciliação posterior. | Encerrado; integração desligada. |
| A-04 | ALTO | Deploy/R2/rotas não tinham gates manuais completos. | Workflows separados, branch, confirmação, environments, inventário e nenhum delete. | Encerrado no código; proteção dos environments é pendência externa. |
| A-05 | MÉDIO | HSTS, Permissions-Policy e frame protection não eram uniformes nas respostas JSON. | Headers adicionados. Respostas binárias ainda aplicam `nosniff`, privadas e `no-store`. | Aceito; validar headers do host estático. |
| A-06 | MÉDIO | Painel não explicitava estruturas financeiras futuras. | Estado manual e aviso inequívoco; geração online não é apresentada como disponível. | APIs administrativas financeiras adicionais dependem do produto. |
| A-07 | MÉDIO | Migração não possuía ferramentas repetíveis. | Inventário, validação, conversão local, checkpoint, comparação e rollback lógico. | Validar amostra real anonimizada. |
| A-08 | BAIXO | Métricas mobile não eram automatizadas em navegador real. | Orçamento estático verificável e matriz de homologação criada. | Lighthouse/visual permanece pendente em URL de homologação. |
| A-09 | INFORMATIVO | Não há dependências runtime; mídia usa APIs nativas e evita biblioteca pesada. | Mantido. | Reavaliar compatibilidade de codecs em dispositivos reais. |

## Controles confirmados

Não foi encontrado login falso, segredo, dado de cartão, escrita pública sem duas flags, `innerHTML` de avisos, path traversal ou binding alternativo. A projeção pública tem allowlist e testes contra CPF, nascimento, Gmail, Google `sub`, documentos e endereço. Autorização deriva cliente da sessão; SUPERADMIN é obrigatório antes de rotas administrativas. Upload valida tamanho, assinatura e MIME; publicação troca ponteiros por último e cron/checkpoints são idempotentes. Logs/auditoria usam IDs e ações, não PII.

## Estado de saída

Nenhum CRÍTICO ou ALTO permanece conhecido. Isso **não equivale a pronto para produção**: secrets, environments protegidos, validação documental de rotas, testes em navegador/dispositivo e homologação são bloqueios externos obrigatórios.
