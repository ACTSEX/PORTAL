ACTS Portal

SECURITY

Versão: 1.0Status: OficialEscopo: Plataforma

1. Objetivo

Este documento define as diretrizes oficiais de segurança do Portal ACTS.

Toda implementação deve seguir estas regras antes de entrar em produção.

2. Princípios

Segurança por padrão.

Menor privilégio.

Defesa em profundidade.

Falha segura.

Auditoria contínua.

3. Camadas

Cliente
 ↓
Cloudflare
 ↓
Pages Functions
 ↓
Core
 ↓
Módulos
 ↓
D1 / R2

Cada camada deve validar suas próprias responsabilidades.

4. Autenticação

Toda autenticação deve passar pelo Core.

Proibido implementar autenticação isolada em módulos.

5. Autorização

Permissões devem ser verificadas antes da execução de qualquer ação protegida.

Preferir RBAC com suporte a permissões granulares.

6. Validação

Toda entrada externa deve ser validada.

Inclui:

HTTP;

Webhooks;

Uploads;

APIs;

Plugins.

7. SQL Injection

Obrigatório:

prepared statements;

parâmetros vinculados;

proibição de SQL concatenado.

8. XSS

Escapar conteúdo dinâmico.

Nunca renderizar HTML arbitrário sem sanitização.

9. CSRF

Aplicar proteção para operações autenticadas quando aplicável.

10. CSP

Utilizar Content Security Policy restritiva.

Permitir apenas origens necessárias.

11. Headers

Configurar:

Content-Security-Policy

X-Content-Type-Options

Referrer-Policy

Permissions-Policy

Strict-Transport-Security

12. HTTPS

Todo tráfego deve utilizar HTTPS.

13. Segredos

Nunca armazenar:

tokens;

senhas;

chaves privadas;

credenciais

em código-fonte, logs ou KV público.

14. Rate Limit

Aplicar limites para:

login;

APIs;

webhooks;

operações críticas.

15. Uploads

Validar:

tipo;

tamanho;

extensão;

conteúdo.

Arquivos permanecem no R2.

16. Webhooks

Fluxo:

Receber
 ↓
Validar assinatura
 ↓
Normalizar
 ↓
Módulo
 ↓
Evento interno

17. Logs

Nunca registrar:

senhas;

tokens completos;

dados financeiros sensíveis.

18. Auditoria

Registrar:

usuário;

ação;

data;

requestId;

resultado.

19. Cloudflare

Utilizar recursos oficiais:

WAF;

Rate Limiting;

Turnstile quando necessário;

Access quando aplicável.

20. Testes

Executar:

testes de autenticação;

autorização;

validação;

injeção SQL;

XSS;

uploads;

webhooks.

21. Critérios de aceitação

menor privilégio;

validação completa;

HTTPS obrigatório;

sem segredos em código;

observável;

testável.

22. Regra final

Toda funcionalidade do Portal ACTS deve ser projetada considerando segurançacomo requisito obrigatório, e não como etapa posterior.

---

## HISTÓRICO — Arquitetura 2.0 (substituída pela Arquitetura 3.0)

> **Estado:** registro histórico do estado então aprovado em 2026-08-04. Esta seção não é normativa para o estado alvo; em conflito, prevalecem `CONSTITUTION.md`, `ARCHITECTURE.md` (Arquitetura 3.0) e os contratos específicos mais recentes.

Esta seção substitui qualquer descrição anterior incompatível neste documento. A evolução preserva os Lotes 1 a 9 já concluídos; ajustes de implementação dependem de necessidade concreta, autorização e lote futuro. Esta revisão é exclusivamente documental.

- Há **um único D1 operacional por ambiente**, única fonte de verdade relacional para usuários, anúncios, clientes, planos, assinaturas, pagamentos, configurações e demais dados oficiais. Não existe segundo D1 público. Toda mutação é validada e confirmada no D1 antes de publicar; derivados nunca se tornam fonte de verdade.
- O R2 é a origem oficial de JSONs públicos compilados, catálogos de cidades, manifests, mídia, imagens e demais artefatos públicos aprovados. Esses objetos são reconstruíveis do D1.
- O KV fica fora da navegação pública normal: visitantes não fazem `KV.get()` para catálogos e KV não origina os JSONs públicos. Seu uso limita-se a configuração, feature flags, coordenação, cache interno de baixo volume e metadados operacionais quando comprovado.
- Valem simultaneamente: `navegação pública normal = zero consultas ao D1`, `navegação pública normal = zero leituras no KV` e `navegação pública normal = zero Worker/Pages Function`. Pages entrega HTML, CSS e JavaScript; R2 com Cloudflare Edge Cache entrega JSON e mídia. Functions e Workers servem escrita, autenticação, administração, integrações e processamento privado.
- A unidade principal é **uma cidade = uma JSON pública unificada e versionada**. Ela reutiliza anunciantes por identificador e atende cidade, categorias, filtros, busca local, cards, detalhes, dados públicos de anunciantes, minisites e comparação. Não se adota como padrão JSON completa por anúncio, cliente ou minisite. Acesso direto a minisite resolve anunciante, cidade e versão, então reutiliza o catálogo da cidade.
- A JSON permanece unificada enquanto tamanho e carregamento medidos forem aceitáveis. Divisão por categoria, página, chunk, geografia ou outro grupo exige necessidade real, aprovação, poucas requisições e reutilização dos dados carregados.
- O Publisher produz projeções compactas, serializáveis, minificáveis, sem campos internos, dados privados ou duplicação evitável, adequadas a parsing e compressão HTTP no Edge. Otimização estrutural, minificação e compressão HTTP são etapas distintas; não se exige Brotli/Gzip manual sem validação futura.
- Catálogos usam nomes imutáveis versionados, como `cidades/londrina/catalogo-v145.json`. Um manifest estável, como `cidades/londrina/manifest.json`, informa ao menos versão, caminho vigente, atualização e integridade aplicável. O catálogo admite cache longo/imutável e o manifest cache curto. O manifest só muda após confirmação integral do novo objeto.
- R2 é origem e Edge Cache é a camada principal de entrega. JSON exige Cache Rules explícitas e validadas no domínio dos artefatos; hits devem atender o tráfego normal e apenas misses alcançam R2. Não há promessa de latência fixa.
- Cloudflare Queue é o transporte principal da publicação assíncrona, com desacoplamento, recompilação, retries, agrupamento e recuperação. Não substitui D1. O fluxo é `Painel → Function/Worker de escrita → módulo → D1 → evento → Queue → Publisher → JSON otimizada → R2 → Edge Cache → navegador`. Separadamente: escrita `Painel → backend privado → D1`; publicação `D1 confirmado → Queue → Publisher → R2`; leitura `Pages + Edge Cache + R2 → navegador`.
- Alterações marcam cidades afetadas e somente elas são recompiladas. O Lote 9A agrega mensagens da mesma cidade apenas dentro do batch entregue; `dueAt` calculado não executa espera persistente. A janela entre batches/invocações permanece pendente para o runtime do Lote 16B, enquanto regras de domínio são do Lote 13 e reconciliação operacional pertence aos Lotes 16B e 18. Cron é complementar, nunca o caminho obrigatório de cada alteração.
- Falha de publicação não reverte o negócio confirmado: D1 permanece verdadeiro. Publicação é repetível/idempotente, suporta republicação e retenção temporária de versões para rollback; falha em R2 não aponta manifest a arquivo parcial.
- O navegador prioriza cache HTTP, memória, Cache Storage quando necessário, IndexedDB para persistência estruturada e `localStorage` somente para pequenos metadados/preferências. A JSON completa não tem `localStorage` como armazenamento principal.
- Catálogos contêm somente projeções públicas aprovadas: sem e-mail privado, dados administrativos, tokens, pagamentos, endereço privado não autorizado ou coordenada precisa proibida.
### Painel, lote explícito e progresso

O painel mantém alterações pendentes preferencialmente em IndexedDB. O rascunho sobrevive quando possível a reload/fechamento, mas não é fonte de verdade, autorização nem substituto de validação. O fluxo é `editar localmente → acumular → revisar pacote → Enviar alterações → backend validar e persistir lote`. A interface mostra contagem, resumo, botão explícito, processamento e resultado.

Decisão inicial: **até cinco envios de alterações por usuário por dia**, configurável e contado por ciclo explícito, não por item. Falha técnica após persistência confirmada não consome novo envio. A implementação definirá timezone, administradores, exceções, reset, auditoria e proteção contra repetição. Cada pacote preserva autenticação, autorização, propriedade, plano, domínio, concorrência/versão, transações e idempotência.

Progresso usa fatos do cliente ou estados confirmados pelo backend: preparando, validando, enviando, persistindo, alterações salvas, aguardando agregação, compilando, publicando, concluído, falha recuperável ou falha definitiva. Sem progresso numérico real, exibem-se etapas, nunca percentuais inventados.

## Contrato de segurança — Arquitetura 3.0

Toda projeção pública é allowlist; linha/tabela D1, data de nascimento, e-mail privado, IDs financeiros, tokens, secrets, auditoria e moderação interna nunca são publicados. Autenticação, autorização, upload, webhook e publicação operam fail-closed, com least privilege. Conteúdo Blogger é externo e não confiável: fetch client-side limitado por timeout, parsing e normalização seguros, sanitização, allowlists de URL/provider, DOM seguro, CSP, proteção XSS e iframe sandbox. Falha usa fallback e retry limitado/manual, sem backend, persistência ou exposição de segredo. Política jurídica de Google/Blogger, cookies, PII e idade pública permanece pendente em `CONTRACTS.md`.
