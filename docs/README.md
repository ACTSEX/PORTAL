# ACTS — documentação do projeto

## Objetivo e escopo

ACTS é a plataforma do portal `acompanhantesex.com`: reúne descoberta por cidade e categoria, anúncios de anunciantes e minisites individuais. O projeto está sendo remontado para execução **Worker-first** na Cloudflare.

As superfícies do produto são:

1. portal central para descoberta e acesso aos anúncios;
2. anúncio comercial, disponível em STANDARD e PREMIUM;
3. minisite `{slug}.acompanhantesex.com`, exclusivo do PREMIUM.

O código existente ainda contém fundações e nomes do protótipo imobiliário anterior. Isso é legado técnico, não definição do produto ACTS. Migrações históricas não devem ser reescritas; a adaptação ocorre por novas migrations e mudanças explicitamente aprovadas.

## Princípios permanentes

- Simplicidade precede abstração, extensibilidade hipotética e quantidade de arquivos.
- Criar código, diretórios, eventos e integrações somente para uma necessidade real.
- D1 é a fonte de verdade do estado ACTS; conteúdo público e caches são derivados reconstruíveis.
- O Worker é a entrada principal. Cloudflare Pages não é a arquitetura principal.
- Regras de negócio ficam em `business/`; infraestrutura reutilizável fica em `core/`.
- Frontend recebe dados prontos e não decide regras de negócio nem acessa D1 diretamente.
- Segurança, menor privilégio, validação e observabilidade fazem parte da implementação, não são etapas posteriores.
- Contratos públicos devem ser explícitos, versionados quando necessário e compatíveis por padrão.
- Não registrar segredos, tokens, dados financeiros ou PII desnecessária.
- Não usar KV na arquitetura inicial. Conteúdo de `acts-dados` usa HTTP/Cloudflare Edge Cache.

## Convenções fundamentais

- Cada módulo de negócio deve possuir **um único arquivo principal sempre que razoável**.
- Não separar CRUD, service, repository, validator e events por hábito. Separar somente responsabilidades distintas comprovadas, especialmente gateways, providers e adapters externos.
- Um arquivo tem uma responsabilidade principal, mas tamanho isolado não obriga fragmentação.
- Dependências apontam para contratos públicos; acesso a detalhes internos de outro módulo é proibido.
- Eventos representam fatos confirmados e só existem quando desacoplamento, retry ou processamento assíncrono os justificarem.
- Código e configuração atuais vencem documentação histórica quando a remontagem Worker-first já tornou a descrição antiga falsa.
- Mudanças de banco usam migrations forward-only; dados de produção nunca são alterados manualmente sem procedimento, backup e validação.

## Estado e decisões

| Classificação | Significado |
|---|---|
| Implementado | Existe e é verificável no repositório/configuração atual. |
| Regra arquitetural | Limite obrigatório para a remontagem, ainda que a movimentação física não tenha terminado. |
| Planejado | Depende de contrato, implementação e testes; não deve ser apresentado como recurso disponível. |

Hoje existem um Worker, bindings Cloudflare, fundações consolidadas em `core/` e `business/`, banco, scripts e testes. A árvore física segue a arquitetura Worker-first. `ARCHITECTURE.md` descreve o destino técnico; `PRODUCT.md`, as regras de produto; `OPERATIONS.md`, a operação; e `ROADMAP.md`, o estado de implementação e remontagem.
