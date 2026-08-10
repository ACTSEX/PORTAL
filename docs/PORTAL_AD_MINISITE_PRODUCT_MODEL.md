# ACTS — Modelo de Produto: Portal, Anúncio e Minisite Premium

**Status:** Decisão arquitetural proposta para incorporação oficial  
**Escopo:** portal público, cards por cidade, modal do anúncio, planos Básico/Free e Premium, minisite individual e integração com Blogger  
**Complementa:** `ARCHITECTURE.md`, `ROADMAP.md`, `BLOGGER_FEED_ARCHITECTURE.md`

---

## 1. Objetivo

Este documento define o fluxo público principal do ACTS e separa três experiências que não devem ser confundidas:

1. **Portal central:** descoberta de anunciantes por cidade/categoria.
2. **Anúncio completo:** apresentação comercial da anunciante em modal grande dentro do portal.
3. **Minisite individual Premium:** site próprio da anunciante, enriquecido por conteúdo pessoal vindo do Blogger autorizado por ela.

A regra comercial central é:

```text
Conta Básica/Free
= classificado no portal

Conta Premium
= classificado no portal + minisite individual
```

O minisite não é obrigatório para que uma anunciante esteja publicada no portal.

---

## 2. Fluxo público principal

```text
Portal ACTS
   ↓
seleção/localização de cidade
   ↓
listagem de cards das anunciantes daquela cidade
   ↓
clique em VER ANÚNCIO
   ↓
modal grande com anúncio completo
   ↓
WhatsApp | Ligar | Acessar meu site (quando Premium)
```

O portal deve ser orientado à descoberta rápida. O card não deve carregar todos os dados do anúncio.

---

## 3. Cidades e descoberta

O portal deve permitir localizar e navegar pelas cidades disponíveis.

Uma cidade apresenta somente os anúncios públicos elegíveis para aquela localidade.

A página/listagem da cidade pode aplicar filtros e ordenação conforme módulos oficiais, mas deve preservar a regra de leitura pública já definida pela arquitetura: dados públicos devem vir de artefatos/índices publicados e não de consulta pública direta ao D1.

---

## 4. Card da anunciante

O card é um resumo compacto.

Conteúdo mínimo previsto:

- 1 foto de destaque;
- nome artístico;
- categoria;
- idade calculada;
- classificação em estrelas, somente se o módulo de avaliações estiver habilitado e com regras de confiança/moderação definidas;
- botão `Ver anúncio`.

Exemplo conceitual:

```text
┌──────────────────────────────┐
│      FOTO DE DESTAQUE        │
│                              │
│ Nome artístico               │
│ Categoria • 28 anos          │
│ ★★★★☆                        │
│                              │
│       [ VER ANÚNCIO ]        │
└──────────────────────────────┘
```

O card não deve incorporar o feed Blogger, galerias completas, vídeos pesados ou conteúdo editorial do minisite.

---

## 5. Foto de destaque do card

A foto de destaque do card faz parte da mídia oficial do anúncio.

Ela deve pertencer ao conjunto de até cinco fotos oficiais de destaque controladas pelo Superadmin.

Regra:

```text
R2 ACTS
└── mídia oficial do anúncio
    ├── destaque 1
    ├── destaque 2
    ├── destaque 3
    ├── destaque 4
    └── destaque 5
```

Essas imagens são diferentes do acervo editorial do Blogger.

### 5.1 Controle

As cinco fotos oficiais:

- ficam no R2;
- são aprovadas/controladas pelo Superadmin;
- não podem ser substituídas livremente pela anunciante no painel comum;
- podem ser alteradas pelo fluxo administrativo definido pela plataforma;
- servem para card, slider do anúncio e demais derivados oficiais.

O objetivo é manter consistência e controle sobre a apresentação comercial exibida pelo portal central.

---

## 6. Idade

A idade nunca deve ser armazenada como número fixo editável.

Deve existir uma data de nascimento validada no registro oficial da conta/perfil.

```text
data_nascimento
      ↓
função de cálculo
      ↓
idade atual
```

A idade exibida deve ser calculada pelo sistema com base na data atual.

A anunciante não altera diretamente a idade exibida.

Alterações da data de nascimento devem obedecer ao fluxo administrativo/validação definido pelo ACTS.

---

## 7. Classificação por estrelas

A interface pode prever classificação em estrelas, mas a existência visual do componente não autoriza implementar uma avaliação sem regras.

Antes da ativação definitiva devem estar definidos:

- quem pode avaliar;
- o que exatamente está sendo avaliado;
- prevenção de avaliações repetidas/fraudulentas;
- moderação;
- cálculo da média;
- quantidade mínima de avaliações para exibição;
- regras de remoção/contestação;
- proteção contra abuso.

Enquanto essas regras não estiverem fechadas, o layout pode reservar o espaço, mas a lógica não deve ser inventada.

---

## 8. Modal do anúncio completo

Ao clicar em `Ver anúncio`, o portal não precisa obrigatoriamente navegar para uma página separada.

A experiência preferencial é uma modal/popup grande que funciona como uma página interna.

### 8.1 Dimensões

```text
Desktop
≈ 80% da área útil da tela

Mobile
100% da tela
```

A modal deve possuir rolagem própria e ser responsiva.

No mobile ela se comporta como uma tela completa.

### 8.2 Acessibilidade e navegação

A implementação deve considerar:

- fechamento claro;
- tecla Escape no desktop;
- foco preso corretamente dentro da modal;
- retorno do foco ao elemento que abriu a modal;
- histórico/URL quando necessário para compartilhamento e SEO;
- não bloquear navegação por teclado;
- tamanho de toque adequado no mobile.

---

## 9. Conteúdo da modal

A modal representa o anúncio comercial completo.

Ordem conceitual:

```text
1. Slider de 5 fotos oficiais
2. Vídeo de destaque
3. Nome artístico
4. Idade calculada
5. Categoria
6. Classificação, se ativa
7. Perfil físico/pessoal permitido
8. Serviços
9. Apresentação
10. WhatsApp e Ligar
11. Acessar meu site, somente Premium
```

---

## 10. Slider de cinco fotos oficiais

A modal usa as cinco fotos oficiais do anúncio armazenadas no R2.

O slider deve:

- carregar imagens otimizadas;
- utilizar lazy loading quando aplicável;
- oferecer anterior/próxima;
- funcionar por toque no mobile;
- manter proporção/layout estável;
- não depender do Blogger.

Essas fotos são a vitrine comercial oficial e permanecem sob controle administrativo.

---

## 11. Vídeo de destaque

Cada anúncio pode possuir um vídeo principal de apresentação/desfile.

A origem preferencial definida para essa mídia é YouTube, via embed oficial.

O ACTS deve armazenar preferencialmente apenas o identificador normalizado do vídeo, e não o arquivo binário.

Fluxo:

```text
Superadmin cadastra/aprova vídeo
        ↓
ACTS normaliza ID
        ↓
artefato público contém ID
        ↓
modal monta embed seguro
```

O vídeo oficial:

- não é alterado livremente pela anunciante no painel comum;
- fica sob controle do Superadmin;
- não ocupa R2 como arquivo de vídeo;
- deve usar embed seguro/privacidade reforçada quando disponível.

---

## 12. Nome artístico

O anúncio público utiliza nome artístico.

O sistema deve distinguir claramente:

```text
identidade legal/privada
≠
nome artístico público
```

Dados legais necessários para conta, verificação, cobrança ou compliance não devem ser expostos automaticamente no portal.

---

## 13. Perfil

O bloco `Perfil` pode conter campos estruturados aprovados pelo produto, por exemplo:

- altura;
- peso;
- medidas;
- cabelo;
- olhos;
- características adicionais permitidas.

O schema definitivo deve existir no módulo de perfil/anúncio e não no template.

A interface apenas apresenta os campos públicos habilitados.

---

## 14. Serviços

O bloco `Serviços` apresenta informações comerciais do anúncio conforme taxonomia e regras do ACTS.

O conteúdo não deve ser tratado como texto arbitrário sem validação quando houver categorias/serviços estruturados.

A definição final de serviços deve respeitar regras de negócio, moderação, legislação aplicável e políticas da plataforma.

---

## 15. Apresentação

O bloco `Apresentação` é o espaço em que a anunciante descreve a si própria e sua proposta.

Pode ser editável no painel dentro das regras definidas.

Deve possuir:

- limite de tamanho;
- sanitização;
- validação;
- política de conteúdo;
- saída segura na renderização.

Não deve aceitar HTML arbitrário da usuária.

---

## 16. Contato: WhatsApp e Ligar

Na parte de contato, dois botões principais ocupam a mesma linha no desktop quando houver espaço:

```text
┌──────────────────────┬──────────────────────┐
│      WHATSAPP        │        LIGAR         │
└──────────────────────┴──────────────────────┘
       50%                        50%
```

No mobile podem permanecer lado a lado se houver espaço e acessibilidade suficientes, ou empilhar se a interface exigir.

### 16.1 WhatsApp

O botão monta link seguro usando o número público configurado/aprovado.

### 16.2 Ligar

O botão utiliza `tel:` com número normalizado.

Nenhum dos dois deve expor dados privados adicionais além do contato autorizado para publicação.

---

## 17. Botão `Acessar meu site`

Somente contas com plano que permita minisite exibem este botão.

```text
Conta Básica/Free
WhatsApp | Ligar

Conta Premium
WhatsApp | Ligar
Acessar meu site
```

O botão abre o minisite da anunciante em nova página/aba conforme decisão de UX.

Exemplo conceitual:

```text
https://{slug}.acts.com
```

O visitante não deve receber um botão bloqueado ou mensagem de upgrade de plano da anunciante.

Se a conta não possui minisite, o botão simplesmente não aparece.

---

## 18. Regra comercial de planos

### 18.1 Básico/Free

A conta Básica/Free pode possuir:

- presença no portal;
- card por cidade/categoria;
- anúncio completo em modal;
- cinco fotos oficiais, conforme política do plano/produto;
- vídeo oficial, se permitido pelo plano/produto;
- perfil;
- serviços;
- apresentação;
- WhatsApp;
- ligação;
- demais funções explicitamente incluídas no plano.

Não possui site individual quando `permiteMinisite = false`.

### 18.2 Premium

A conta Premium possui tudo o que o plano base correspondente oferece e, adicionalmente:

- minisite individual;
- subdomínio/slug;
- integração autorizada com Blogger;
- seção Fotos;
- seção Vídeos;
- seção Tudo/Publicações;
- seções adicionais por marcadores configurados;
- experiência editorial pessoal rica sem transformar ACTS em CMS.

A permissão deve ser dirigida por configuração/plano e nunca por `if` comercial hardcoded em template.

Exemplo conceitual:

```text
plan.permiteMinisite = true | false
```

---

## 19. Minisite Premium

O minisite é uma extensão da presença da anunciante e não substitui o anúncio oficial.

```text
Portal
   ↓
Anúncio oficial
   ↓
Acessar meu site
   ↓
{slug}.acts.com
```

O minisite pode reutilizar identidade e dados públicos do ACTS, mas o conteúdo editorial adicional vem do feed Blogger autorizado.

A arquitetura detalhada do feed é definida em `BLOGGER_FEED_ARCHITECTURE.md`.

---

## 20. Blogger permanece fora do portal central

Regra permanente:

```text
acts.com
= NÃO reproduz feed Blogger

{slug}.acts.com Premium
= pode reproduzir/organizar feed autorizado
```

O portal central pode linkar para o minisite, mas não agrega fotos, vídeos ou posts editoriais do Blogger nos cards ou na listagem central.

As cinco fotos oficiais e o vídeo oficial do anúncio pertencem ao modelo ACTS e são independentes do Blogger.

---

## 21. Organização de Fotos no minisite

A anunciante publica diretamente no próprio Blogger.

Regra editorial simples:

```text
post com fotos
→ marcador `Fotos`
```

O ACTS pode ler todos os posts com esse marcador e extrair as imagens permitidas.

Exemplo:

```text
Post A → 20 fotos
Post B → 15 fotos
Post C → 30 fotos

/fotos
→ 65 imagens em uma supergaleria
```

As imagens continuam hospedadas na origem externa quando tecnicamente permitido. O ACTS não copia automaticamente o acervo para o R2.

---

## 22. Layout da supergaleria de Fotos

No desktop:

```text
3 colunas
```

No tablet/mobile, a grade deve ser responsiva, por exemplo:

```text
Desktop → 3 colunas
Tablet  → 2 colunas
Mobile  → 1 coluna ou configuração visual equivalente aprovada
```

A página utiliza:

- carregamento progressivo;
- infinite scroll ou paginação incremental invisível;
- lazy loading;
- lotes pequenos de itens;
- nenhuma tentativa de carregar centenas de imagens simultaneamente.

Exemplo:

```text
carrega 18 itens
      ↓
visitante rola
      ↓
carrega +18
      ↓
continua
```

O número de itens por lote deve ser configurável/ajustável por desempenho, não tratado como regra eterna.

---

## 23. Clique em foto: lightbox/slider sequencial

A grade é a visualização principal.

Quando o visitante clica em uma imagem:

```text
foto N da grade
     ↓
abre lightbox/slider
     ↓
começa exatamente na foto N
     ↓
anterior/próxima continuam pela sequência global
```

Assim, se a supergaleria possuir 200 imagens e o visitante clicar na 73ª, o slider inicia na 73ª e pode seguir para 74, 75 etc.

Internamente cada item pode manter referência ao post de origem, título e data.

Isso permite apresentar, quando desejado:

- título da publicação;
- data;
- posição;
- link/ação para ver o álbum/post de origem.

---

## 24. Organização de Vídeos no minisite

A regra editorial é semelhante:

```text
post com vídeo
→ marcador `Videos`
```

Todos os posts relevantes podem compor uma coleção única em `/videos`.

A visualização principal não é um slideshow obrigatório.

A experiência preferencial é:

```text
GRID DE VÍDEOS
       ↓
3 colunas no desktop
       ↓
infinite scroll
       ↓
clique
       ↓
player/modal
       ↓
anterior/próximo
```

---

## 25. Card de vídeo

O grid de vídeos não deve inicializar dezenas de players pesados.

Cada item deve inicialmente exibir:

- capa/thumbnail;
- ícone de play;
- título sobre a capa.

O player real só é criado/ativado após clique.

---

## 26. Capa do vídeo

Vídeos incorporados por provedores como YouTube podem possuir thumbnail oficial.

Vídeos enviados diretamente ao Blogger podem não fornecer uma capa visual adequada para o grid.

Para garantir consistência, a regra editorial preferencial é:

```text
Post com marcador Videos
├── primeira imagem = capa
└── vídeo = mídia principal
```

Prioridade de capa:

```text
1. imagem de capa existente no próprio post
2. thumbnail oficial do provedor, quando disponível
3. imagem padrão ACTS
```

A implementação não deve depender de capturar frames do vídeo no navegador, pois isso pode gerar custo, downloads prematuros e limitações de CORS.

---

## 27. Título sobre a capa do vídeo

O título da postagem Blogger pode ser reutilizado como título visual do card.

O texto aparece sobre a parte inferior da capa, preferencialmente sobre um degradê para contraste.

Regra visual:

- uma única linha;
- `text-overflow: ellipsis`;
- texto completo preservado nos dados;
- título completo disponível no player/modal ou contexto detalhado.

Exemplo:

```text
Título completo:
Vida selvagem do Pantanal em minhas férias

Card:
Vida selvagem do...
```

CSS conceitual:

```css
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

---

## 28. Infinite scroll e leveza

Fotos e vídeos devem seguir o princípio de que o navegador recebe somente o necessário para a viewport e para o próximo pequeno lote.

### Fotos

- imagens lazy;
- URLs da origem;
- itens incrementais;
- lightbox apenas após clique.

### Vídeos

- somente capa inicialmente;
- player não carregado no grid;
- player ativado apenas após clique;
- embeds pesados removidos/desativados da grade inicial.

Esse comportamento reduz transferência, CPU, memória e tempo de carregamento inicial.

---

## 29. Leitura no navegador x artefatos publicados

A experiência de grade pode ser montada no navegador, mas a arquitetura não deve assumir cegamente que qualquer feed externo poderá ser consultado diretamente pelo browser para sempre.

Há duas estratégias possíveis:

### 29.1 Browser direto

```text
browser
→ feed Blogger
→ parse
→ grade
```

Só é permitido quando CORS, segurança, disponibilidade e desempenho estiverem validados.

### 29.2 Artefato normalizado publicado — opção robusta

```text
Blogger
→ integração ACTS
→ sanitização/normalização
→ JSON/HTML publicado
→ navegador
→ grade
```

Essa estratégia continua sem copiar as mídias para R2: o artefato pode conter URLs externas normalizadas.

A decisão final deve privilegiar segurança, cache, disponibilidade e custo real.

---

## 30. Conteúdo adulto

O ACTS deve aplicar suas próprias regras de maioridade e conteúdo, independentemente de o blog de origem estar marcado como adulto no Blogger.

Testes realizados durante a definição desta arquitetura indicaram que feeds de blogs marcados como adultos puderam ser lidos sem o intersticial visual exibido no acesso normal ao blog.

Esse resultado é **observação de teste**, não garantia permanente do fornecedor externo.

Portanto:

- o ACTS não tenta burlar a página de aviso do Blogger;
- o feed é utilizado como mecanismo oficial de integração quando disponível;
- o site ACTS aplica seu próprio controle +18 quando necessário;
- mudanças futuras nas políticas/comportamento do Blogger devem ser absorvidas na integração.

---

## 31. O painel da anunciante não vira CMS

A rotina editorial permanece no Blogger.

```text
ACTS painel
= conta + perfil + anúncio + contato + feed/configuração

Blogger
= postar textos + fotos + vídeos + marcadores
```

O ACTS não deve implementar upload/editor editorial completo apenas para reproduzir funções que já estão fora da plataforma.

Isso mantém o painel pouco utilizado após a configuração inicial.

---

## 32. Controle do Superadmin

Itens oficiais de alto impacto no anúncio devem permanecer sob controle administrativo, incluindo:

- aprovação/publicação;
- cinco fotos oficiais de destaque;
- vídeo oficial de destaque;
- dados validados que não podem ser livremente adulterados;
- eventual correção de data de nascimento;
- status da conta/anúncio;
- moderação;
- concessão de plano/benefícios quando aplicável.

A anunciante pode editar somente os campos permitidos pela política de produto.

A separação de permissões deve existir no domínio e na autorização, não apenas esconder campos no frontend.

---

## 33. Responsabilidades de armazenamento

### D1

Fonte oficial para:

- conta;
- perfil;
- anúncio;
- data de nascimento;
- contatos;
- plano;
- status;
- configurações;
- URL do feed;
- permissões de minisite;
- demais dados internos.

### R2

Usado para mídia oficial ACTS e objetos que realmente pertençam à plataforma, principalmente:

- cinco fotos oficiais do anúncio;
- arquivos institucionais;
- backups/exportações quando previstos;
- outros arquivos internos aprovados.

### Blogger/Google e provedores externos

Origem do acervo editorial pessoal do minisite:

- posts;
- fotos editoriais;
- vídeos/embeds;
- histórico;
- marcadores.

### YouTube

Origem preferencial do vídeo oficial de apresentação quando essa regra estiver ativa.

---

## 34. Não duplicação de mídia

Regra:

```text
mídia oficial do anúncio
→ ACTS/R2

mídia editorial do Blogger
→ permanece na origem externa
```

O ACTS não copia automaticamente todo o acervo do Blogger para o R2.

Isso evita transformar o R2 em storage central do conteúdo cotidiano das anunciantes.

---

## 35. Requisitos para implementação futura

Antes de implementar o fluxo completo, os lotes correspondentes devem atualizar schemas/contratos para incluir explicitamente, quando ainda ausentes:

- `nome_artistico`;
- `data_nascimento`;
- campos públicos de perfil;
- serviços/taxonomia;
- apresentação;
- WhatsApp;
- telefone público;
- conjunto de cinco mídias oficiais;
- vídeo oficial/ID YouTube;
- plano e `permiteMinisite`;
- slug/subdomínio;
- `feed_url`;
- `feed_ativo`;
- configuração de marcadores;
- estado de moderação/aprovação.

Nomes concretos devem seguir os schemas e convenções vigentes quando implementados. Este documento define comportamento, não obriga nomes físicos antecipadamente.

---

## 36. Impacto sobre o ROADMAP atual

Esta decisão **não autoriza pular lotes**.

Ela altera/refina requisitos funcionais de lotes já previstos:

- **Lote 6 — banco/schemas:** acomodar campos e permissões necessárias.
- **Lote 7 — identidade/planos:** diferença Básico/Free x Premium e permissão de minisite.
- **Lote 8 — catálogo/mídia:** cinco fotos oficiais, vídeo de destaque e controle de ownership/admin.
- **Lote 9 — descoberta:** cards por cidade e dados públicos mínimos.
- **Lote 10 — avaliações:** estrelas somente conforme módulo de reviews.
- **Lote 13 — publicação/SEO:** derivados públicos e minisites.
- **Lotes 14/15 — componentes/templates:** card, modal, slider, grid, lightbox, vídeo.
- **Lotes 16/17 — APIs/painel/frontend:** permissões, edição limitada, modal pública, minisite e integração.
- **Lote 18 — aceite:** responsividade, performance, segurança, acessibilidade e consistência de planos.

Se um lote já foi implementado antes desta decisão e os novos requisitos exigirem mudança de código, deve ser criado um lote corretivo/adequação explícito antes da implementação dependente, em vez de alterar silenciosamente código histórico.

---

## 37. Segurança e privacidade

Dados pessoais privados não devem ser expostos só porque existem no D1.

É obrigatório distinguir:

- dados legais/administrativos;
- dados públicos do anúncio;
- dados editoriais externos;
- dados sensíveis/restritos.

Links externos, HTML do feed e embeds passam por validação/sanitização conforme `BLOGGER_FEED_ARCHITECTURE.md` e `SECURITY.md`.

---

## 38. Resumo executivo

```text
PORTAL ACTS
    ↓
CIDADE
    ↓
CARD
    ├── 1 foto
    ├── nome artístico
    ├── categoria
    ├── idade calculada
    └── estrelas, se módulo ativo
          ↓
      VER ANÚNCIO
          ↓
   MODAL ~80% DESKTOP / 100% MOBILE
          ├── 5 fotos oficiais R2
          ├── vídeo oficial YouTube
          ├── identidade
          ├── idade
          ├── rating
          ├── perfil
          ├── serviços
          ├── apresentação
          ├── WhatsApp 50%
          ├── Ligar 50%
          └── Acessar meu site (somente Premium)
                         ↓
                 {slug}.acts.com
                         ↓
             BLOGGER DA ANUNCIANTE
                         ↓
          Fotos | Vídeos | Tudo | marcadores
```

### Básico/Free

```text
Portal + Card + Modal + Contato
SEM minisite
```

### Premium

```text
Portal + Card + Modal + Contato
+
Minisite individual
+
Blogger autorizado
+
Supergaleria de Fotos
+
Grid de Vídeos
+
Publicações/Marcadores
```

---

## 39. Regra permanente

O portal central é o **classificado e mecanismo de descoberta**.

A modal é o **anúncio comercial completo**.

O minisite Premium é a **presença pessoal ampliada da anunciante**.

O Blogger é o **CMS editorial externo da própria anunciante**.

O R2 armazena somente a mídia oficial que pertence ao ACTS e não replica automaticamente o acervo editorial externo.

Essa divisão deve prevalecer sobre implementações que tentem concentrar todos os papéis dentro do painel ACTS.
