# Arquitetura definitiva de objetos V2

## Regra de isolamento

Todo objeto individual de uma cliente começa obrigatoriamente por `clientes/{clienteId}/`, nos dois buckets. Somente `app/` (assets compartilhados) e `dados/` (manifestos e índices **agregados** de cidade, diretório e categoria) são globais no `acts-public`. Índices agregados não são movidos para clientes.

```text
acts-public/
├── app/
├── dados/
└── clientes/{clienteId}/
    ├── dados/                 # perfil e manifesto JSON públicos
    ├── site/                  # configuração do minisite
    └── midias/{fotos,videos,audios}/

acts-private/
└── clientes/{clienteId}/
    ├── dados-privados/        # identidade, operacional, avisos e publicação
    ├── documentos/
    ├── rascunho-publico/
    ├── midias/{fotos,videos,audios}/
    └── auditoria/
```

Uploads temporários ficam em `clientes/{clienteId}/midias/uploads-temporarios/`, portanto continuam isolados. O navegador envia bytes pela API e nunca constrói uma chave fora desse contrato. Exclusão lógica e regeneração conservam a chave no subtipo da mídia; a publicação copia os bytes privados para o mesmo caminho relativo no bucket público antes de gravar referências JSON.

## Caminhos incorretos encontrados e substituições

- `acts-public/midias/clientes/{clienteId}/{fotos,videos,audios,capas}/` → `clientes/{clienteId}/midias/{fotos,videos,audios}/`.
- `dados/clientes/{clienteId}/{perfil,site,midias}.json` e `versoes/{publicationId}/dados/clientes/...` → `clientes/{clienteId}/dados/{perfil,midias}.json` e `clientes/{clienteId}/site/configuracao.json`.
- `clientes/{clienteId}/rascunho/midias/` e `uploads-temporarios/` → `clientes/{clienteId}/midias/...`.
- `clientes/{clienteId}/{identidade,operacional,avisos,publicacao}/` → `clientes/{clienteId}/dados-privados/`.
- `clientes/{clienteId}/rascunho/` → `clientes/{clienteId}/rascunho-publico/`.
- tarefas e idempotência individuais em `sistema/publicacao/` → `clientes/{clienteId}/dados-privados/publicacao/`.

## Reconciliação dos oito objetos já criados

Não execute novamente o bootstrap: ele é create-only e os oito objetos existentes devem ser inventariados. Os sete manifestos corretos são `acts-private/{sistema,superadmin,clientes}/manifesto.json` e `acts-public/app/manifesto.json`, `acts-public/dados/{sistema,cidades,clientes}/manifesto.json`. Compare tamanho e SHA-256 com o inventário local e preserve-os; divergências exigem revisão humana, nunca sobrescrita silenciosa.

O oitavo objeto incorreto tem chave exata `acts-public/midias/clientes/manifesto.json`. A migração `scripts/remover-marcador-midias-raiz.mjs` não roda no bootstrap nem em CI/deploy. Execute primeiro `plan`: ela lista todo o prefixo `midias/`, exige que exista somente essa chave, lê o JSON, confirma `estado=bootstrap`, `ambiente=nao-configurado` e `objetos=[]`, e registra tamanho/hash. Ela falha diante de qualquer mídia ou objeto adicional. Somente depois de revisão, na `main`, rode `apply` com confirmação literal `REMOVER-MARCADOR-MIDIAS-RAIZ`. A exclusão usa `delete-object` para a chave exata, sem remoção recursiva.

Nenhum procedimento deste documento publica, faz deploy ou migra automaticamente.
