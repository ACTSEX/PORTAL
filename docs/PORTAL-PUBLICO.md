# Portal público

Um único template em `app/site` identifica pathname/hostname e renderiza entrada, listagem ou minisite. `/` solicita apenas `dados/sistema/cidades.json`; cidade/diretório solicita somente o manifesto escolhido e seus shards. Categoria muda a fonte. A troca de diretório descarta o DOM anterior; “Trocar cidade” retorna a `/`.

Cards contêm a projeção mínima, abrem a subpasta canônica na mesma aba e usam apenas miniatura WebP lazy/async. Filtros, rolagem e retorno usam `history.state` e `sessionStorage`, sem PII. O minisite busca perfil/site/mídias uma vez, escapa texto, declara dimensões, carrega galeria sob demanda e usa vídeo/áudio `preload=none`, pausando outras reproduções.

Temas: mulheres/pink, homens/royal e transex/lilás. Alvos têm 44px, foco visível, teclado, contraste e `prefers-reduced-motion`. Erro de JSON, mídia ausente e resultado vazio possuem estado seguro.
