# Rotas V2 e implantação futura

Canônicas estáticas: `/`, `/{cidade}/{diretorio}`, `/{cidade}/{diretorio}/{categoria}` e `/{cidade}/{diretorio}/{categoria}/{slug}`. `{slug}.acompanhantesex.com` resolve o índice público mínimo e renderiza o mesmo template/JSON/mídias, sem D1/KV, duplicação ou geração pesada, declarando a subpasta como canonical. Cards nunca redirecionam ao subdomínio.

Hoje existem `acompanhantesex.com/api/*`, `*.acompanhantesex.com/*` e o domínio de produção do Worker. O caminho canônico público desejado não deve executar Worker, enquanto o wildcard pode executar roteamento mínimo. Há conflito potencial porque `public.acompanhantesex.com` também casa com `*.acompanhantesex.com/*`; cache não prova que o Worker não executou.

Na Rodada 5: auditar precedência das rotas no dashboard, excluir/contornar explicitamente `public`, garantir que o host do bucket não caia no roteador de slugs, validar canonical e cache, ensaiar com flags falsas, depois ativar controladamente. Esta rodada não altera DNS, Worker Routes, domínios ou bindings e não faz deploy.
