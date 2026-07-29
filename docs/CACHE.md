CTS Portal

CACHE

Versão: 1.0Status: OficialEscopo: app/core/cache.js

1. Objetivo

O Cache é responsável por acelerar o acesso aos artefatos publicados sem alterara fonte oficial dos dados.

D1 permanece sendo a única fonte de verdade.

2. Princípios

Cache nunca é fonte oficial.

Pode ser descartado e reconstruído.

Deve ser transparente para os módulos.

Deve ser invalidado de forma controlada.

3. Camadas de cache

D1
 ↓
Publisher
 ↓
KV (artefatos)
 ↓
Cloudflare Cache API
 ↓
Visitante

4. Responsabilidades

O Cache pode:

armazenar respostas públicas;

armazenar HTML publicado;

armazenar JSON publicados;

armazenar metadados técnicos;

invalidar conteúdos.

O Cache não pode:

armazenar dados oficiais;

substituir D1;

conter regras de negócio.

5. Estratégia

Sempre que possível:

salvar alteração no D1;

publicar artefato;

atualizar KV;

invalidar Cache API;

servir nova versão.

6. Tipos de cache

Cache API

respostas HTTP;

HTML;

JSON.

KV

artefatos publicados;

índices;

manifestos;

páginas estáticas.

7. TTL

Cada tipo de artefato pode possuir TTL próprio.

Exemplos:

HTML publicado;

JSON por cidade;

sitemap;

feeds.

TTL deve ser configurável.

8. Invalidação

Preferir invalidação seletiva.

Exemplos:

anúncio atualizado;

cidade afetada;

categoria afetada;

sitemap parcial.

Evitar limpeza global.

9. Chaves

As chaves devem ser previsíveis.

Exemplos:

listing:123
city:londrina
category:casas
sitemap:index

10. Publicação

A invalidação deve ocorrer após a publicação bem-sucedida.

Nunca invalidar antes da existência da nova versão.

11. Observabilidade

Registrar:

cache hit;

cache miss;

invalidações;

tempo de resposta;

TTL utilizado.

12. Segurança

Não armazenar:

sessões;

tokens;

segredos;

credenciais.

13. Compatibilidade

Compatível com:

Cloudflare Cache API;

KV;

Pages Functions.

14. Testes

Cobrir:

hit;

miss;

invalidação;

expiração;

reconstrução.

15. Critérios de aceitação

D1 continua sendo a fonte oficial;

invalidação seletiva;

sem regras de negócio;

compatível com Cloudflare;

testável.

16. Regra final

O objetivo do Cache é reduzir latência e custo operacional sem comprometer aconsistência dos dados.

Sempre que houver divergência entre Cache e D1, prevalece o conteúdo do D1.
