# Shards e índices

A árvore preserva o contrato: `dados/clientes/{id}/{perfil,site,midias}.json`, `dados/cidades/{cidade}/{diretorio}/todos/{manifesto,NNN}.json`, categorias em `categorias/{categoria}/`, e ponteiros em `dados/sistema/`. Perfil/mídias não são duplicados por cidade ou categoria.

Shards ordenam por slug e `clienteId`, têm IDs `001` estáveis para a mesma entrada determinística, alvo padrão 100, limite de bytes configurável, hash SHA-256, quantidade, versão e manifesto. Nunca misturam diretórios. Reconstruções com entradas iguais geram conteúdo igual; comparação permite atualizar só objetos afetados.

`dados/sistema/slugs/{slug}.json` contém somente slug, `clienteId` e URL canônica. Normalização remove diacríticos; reservados e colisões falham. Mudança exige fluxo autorizado e o desenho admite histórico/redirect futuro.
