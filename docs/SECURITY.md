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
D1 / KV / R2

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
