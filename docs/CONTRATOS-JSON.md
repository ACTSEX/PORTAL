# Contratos JSON

Schemas Draft 2020-12 residem em `schemas/`; exemplos correspondentes em `examples/`. Configurações são versionadas em `config/`. O Worker é autoridade: validação no navegador serve apenas à experiência.

Formulários suportam seções, campos, tipo, rótulo, obrigatoriedade, limites pendentes, opções, condicionais, diretórios, categorias por diretório, planos, ordem, ajuda e classificação público/privado. Mudanças incompatíveis incrementam versão e requerem migração. JSON público proíbe CPF e qualquer nascimento; contém apenas idade. Shards preservam `cidade → diretório → categoria` e nunca agregam diretórios.

A versão 2 do formulário público possui onze etapas e tipos genéricos. O manifesto privado autoritativo mantém revisão, próximo ID, ordem, principal, hashes, dimensões, tamanhos, estado e órfãos; o cliente não fornece chaves finais.
