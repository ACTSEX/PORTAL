# ACTS — Regras de UI para Conteúdo Blogger no Minisite

**Status:** Complemento funcional da arquitetura Blogger  
**Escopo:** somente minisites Premium  
**Referências:** `BLOGGER_FEED_ARCHITECTURE.md`, `PORTAL_AD_MINISITE_PRODUCT_MODEL.md`

---

## 1. Objetivo

Definir como fotos, vídeos e publicações vindos do feed Blogger devem ser transformados em experiências próprias do ACTS sem reproduzir o layout original do Blogger.

---

## 2. Princípio

O Blogger fornece conteúdo e mídia. O ACTS fornece organização, navegação e apresentação.

```text
Blogger
→ feed
→ parser/normalização
→ ACTS
→ UI própria
```

---

## 3. Fotos

Posts marcados como `Fotos` podem conter uma ou várias imagens.

O ACTS deve reunir as imagens de todos os posts elegíveis em uma coleção única.

Exemplo:

```text
Post 1 → 20 fotos
Post 2 → 15 fotos
Post 3 → 30 fotos

/fotos
→ 65 fotos
```

---

## 4. Grade de Fotos

No desktop, usar 3 colunas até a largura útil final da página.

Responsividade:

```text
Desktop → 3 colunas
Tablet  → 2 colunas
Mobile  → 1 coluna ou equivalente aprovado
```

A grade deve carregar progressivamente durante a rolagem.

Requisitos:

- lazy loading;
- infinite scroll ou carregamento incremental equivalente;
- lotes pequenos;
- sem carregamento antecipado de centenas de imagens;
- manter proporções e evitar layout shift excessivo.

---

## 5. Clique em Foto

Ao clicar em qualquer foto da grade:

```text
foto clicada
→ abre lightbox/slider
→ inicia na posição clicada
→ segue anterior/próxima pela coleção global
```

A sequência deve continuar atravessando fotos provenientes de posts diferentes.

O item pode manter metadados do post de origem para exibir título/data quando desejado.

---

## 6. Vídeos

Posts marcados como `Videos` podem alimentar uma coleção única de vídeos.

A página `/videos` deve usar grade/listagem, não múltiplos players ativos simultaneamente.

---

## 7. Grade de Vídeos

No desktop:

```text
3 colunas
```

Comportamento:

- infinite scroll;
- carregamento progressivo;
- somente capas/thumbnails na grade;
- player real carregado apenas após clique;
- anterior/próximo dentro do player/modal quando aplicável.

---

## 8. Capa do Vídeo

Prioridade:

```text
1. primeira imagem do post com marcador Videos
2. thumbnail oficial do provedor, se disponível
3. fallback visual ACTS
```

Para vídeos enviados diretamente ao Blogger, a primeira imagem do post deve ser tratada como capa editorial preferencial.

Não depender de captura automática de frame do vídeo no navegador.

---

## 9. Título do Vídeo

O título da postagem Blogger pode ser exibido sobre a própria capa.

Regras:

- uma linha;
- truncamento visual com `...`;
- título completo preservado;
- título completo visível no contexto detalhado/player.

Exemplo:

```text
Vida selvagem do Pantanal em minhas férias
→
Vida selvagem do...
```

Conceito CSS:

```css
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

---

## 10. Player

Ao clicar no card do vídeo:

```text
capa
→ player/modal
→ carrega o vídeo
→ permite anterior/próximo
```

O player não deve existir previamente para todos os itens da grade.

---

## 11. Tudo / Publicações

A seção `Tudo` ou `Publicações` apresenta o fluxo cronológico completo das entradas aceitas.

Ela não substitui as experiências especializadas:

```text
/fotos  → supergaleria de imagens
/videos → grade de vídeos
/tudo   → fluxo editorial cronológico
```

---

## 12. Marcadores

Marcadores adicionais podem gerar seções próprias quando explicitamente habilitados.

Não criar itens de menu automaticamente para todo label encontrado.

---

## 13. Desempenho

O navegador deve receber apenas os itens necessários para a viewport e para o próximo lote.

Fotos:

- mídia lazy;
- URLs externas quando permitido;
- lightbox sob demanda.

Vídeos:

- capa primeiro;
- player apenas após clique;
- embeds pesados fora da grade inicial.

---

## 14. Regra permanente

A UI do ACTS deve transformar o feed em uma experiência moderna e leve, sem obrigar a anunciante a gerenciar novamente seu acervo dentro do painel ACTS.
