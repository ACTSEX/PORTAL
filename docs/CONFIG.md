ACTS Portal

CONFIG

Versão: 1.0Status: OficialEscopo: app/core/config.js

1. Objetivo

A camada Config centraliza toda a configuração da plataforma ACTS.

Nenhum módulo deve acessar variáveis de ambiente diretamente.

2. Princípios

Configuração centralizada.

Ambiente determinístico.

Sem valores mágicos.

Validação obrigatória.

Leitura somente.

3. Responsabilidades

A camada Config pode:

carregar configurações;

validar bindings;

validar variáveis de ambiente;

expor configurações públicas;

expor feature flags.

Não pode:

conter regras de negócio;

modificar configurações em tempo de execução;

acessar módulos.

4. Ambientes

Suportados:

development;

staging;

production;

test.

Cada ambiente deve possuir configuração própria.

5. Cloudflare

Centralizar:

D1;

KV;

R2;

Queues;

Analytics;

Images;

Cache.

Todos os bindings devem ser validados no bootstrap.

6. Feature Flags

Toda funcionalidade opcional deve utilizar Feature Flags.

Benefícios:

implantação gradual;

testes controlados;

rollback rápido.

7. Constantes

Constantes compartilhadas devem permanecer nesta camada.

Evitar duplicação.

8. Segredos

Nunca expor:

API Keys;

Tokens;

Segredos;

Credenciais.

Somente o Core acessa valores sensíveis.

9. Estrutura

app/core/
└── config.js

10. Integração

Integra-se com:

Bootstrap;

Logger;

Security;

DB;

Storage;

Event Bus.

11. Observabilidade

Registrar:

ambiente;

versão;

bindings válidos;

falhas de configuração.

Nunca registrar segredos.

12. Testes

Cobrir:

configuração ausente;

binding inválido;

feature flags;

ambientes.

13. Critérios de aceitação

configuração centralizada;

bindings validados;

sem segredos em logs;

compatível com Cloudflare;

testável.

14. Regra final

Toda configuração do Portal ACTS deve ser acessada exclusivamente através dacamada Config do Core.
