ACTS Portal

PUBLISHER

Versão: 1.0Status: OficialEscopo: app/core/publisher.js

1. Objetivo

O Publisher é responsável por transformar dados aprovados em artefatos públicosotimizados para distribuição na Edge.

O Publisher não decide o que será publicado.

Essa decisão pertence aos módulos de negócio e ao módulo Publish.

2. Princípios

D1 é a única fonte de verdade.

KV armazena apenas artefatos derivados.

R2 armazena arquivos permanentes.

Publicações devem ser incrementais.

Navegação pública deve evitar consultas ao D1.

3. Fluxo oficial

Alteração
    ↓
D1
    ↓
Evento
    ↓
Queue
    ↓
Publisher
    ↓
Renderer
    ↓
HTML / JSON
    ↓
KV / R2
    ↓
Cache
    ↓
Visitante

4. Responsabilidades

O Publisher pode:

gerar HTML;

gerar JSON;

atualizar manifestos;

invalidar cache;

gravar em KV;

gravar em R2;

emitir eventos técnicos.

O Publisher não pode:

executar regras de negócio;

consultar diretamente entidades específicas;

aprovar conteúdo;

decidir prioridades comerciais.

5. Tipos de artefatos

páginas HTML;

JSON públicos;

sitemap;

robots;

feeds;

índices;

manifestos.

6. Publicação incremental

Sempre que possível, regenerar apenas os artefatos afetados.

Exemplos:

página de um anúncio;

índice de uma cidade;

sitemap parcial;

manifesto atualizado.

Evitar reconstruções completas sem necessidade.

7. Cache

Após a publicação:

atualizar KV/R2;

invalidar cache relacionado;

disponibilizar a nova versão.

8. Renderer

O Publisher recebe dados prontos e delega a renderização ao Renderer.

O Renderer não consulta o banco.

9. Observabilidade

Registrar:

publicationId;

duração;

quantidade de artefatos;

destino;

sucesso ou falha.

10. Falhas

Uma falha de publicação deve:

ser registrada;

permitir reprocessamento;

não corromper artefatos válidos;

preservar a última versão publicada.

11. Critérios de aceitação

sem regras de negócio;

compatível com Cloudflare;

geração incremental;

uso correto de D1, KV e R2;

testável;

idempotente quando necessário.

12. Regra final

O Publisher existe para publicar artefatos estáticos de forma segura, eficientee previsível, mantendo a arquitetura Edge-first do Portal ACTS.
