ACTS Portal

AUTH

Versão: 1.0Status: OficialEscopo: app/core/auth.js

1. Objetivo

A camada de autenticação é responsável por identificar usuários e garantir queapenas identidades válidas possam acessar recursos protegidos.

Autenticação e autorização são responsabilidades distintas.

2. Princípios

Autenticação centralizada no Core.

Menor privilégio.

Tokens de curta duração.

Sessões seguras.

Auditoria completa.

3. Responsabilidades

O Auth pode:

autenticar usuários;

encerrar sessões;

validar tokens;

emitir tokens;

recuperar senha;

verificar e-mail;

aplicar MFA.

Não pode:

implementar regras de negócio;

acessar módulos diretamente;

decidir lógica funcional.

4. Fluxo

Login
 ↓
Validação
 ↓
Auth
 ↓
Sessão / Token
 ↓
Permissões
 ↓
Aplicação

5. Métodos suportados

usuário e senha;

API Key;

Token Bearer;

Sessão autenticada.

Novos métodos devem ser documentados.

6. Senhas

hash obrigatório;

nunca armazenar texto puro;

política de complexidade;

redefinição segura.

7. Sessões

Registrar:

usuário;

criação;

expiração;

último acesso;

IP quando aplicável;

dispositivo quando disponível.

8. Tokens

Devem possuir:

identificador;

emissão;

expiração;

escopo;

assinatura.

9. MFA

Quando habilitado:

validar segundo fator;

permitir recuperação segura;

registrar auditoria.

10. Recuperação de senha

Fluxo:

Solicitação
 ↓
Token temporário
 ↓
Validação
 ↓
Nova senha

11. Autorização

Preferir RBAC.

Permissões devem ser verificadas antes da execução de ações protegidas.

12. Auditoria

Registrar:

login;

logout;

falhas;

troca de senha;

MFA;

bloqueios.

13. Segurança

Nunca registrar:

senha;

token completo;

segredo;

chave privada.

14. Integração

O Auth integra-se com:

Security;

Logger;

Event Bus;

DB.

15. Eventos

Exemplos:

UserAuthenticated;

UserLoggedOut;

PasswordChanged;

MFAEnabled.

16. Testes

Cobrir:

login válido;

login inválido;

expiração;

recuperação;

MFA;

permissões.

17. Critérios de aceitação

autenticação centralizada;

sessões seguras;

tokens válidos;

auditoria;

testável.

18. Regra final

Nenhum módulo do Portal ACTS pode implementar autenticação própria.

Toda autenticação deve passar obrigatoriamente pela camada Auth do Core.
