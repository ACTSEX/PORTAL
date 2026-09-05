# Migração operacional V1 → V2

Ferramentas operam **somente arquivos locais explícitos**; recusam URL, não leem R2, não publicam e não apagam V1. Formato de entrada: array JSON preservando `clienteId`, `slug`, `diretorio`, `cidadeId`, categorias reais, URLs e mídias.

1. `node scripts/inventariar-v1.mjs check --input amostra.json` conta diretórios e gera hash.
2. `node scripts/validar-v1.mjs plan --input amostra.json` detecta IDs/slugs duplicados, CPF inválido, menoridade, cidade/diretório ausente ou misturado, arquivo ausente e MIME incompatível.
3. Corrigir a origem; categorias nunca são inferidas.
4. `node scripts/migrar-v1-v2.mjs convert --input entrada.json --output area-local/checkpoint.json` cria V2 com estado `convertido_nao_publicado`, hash e rollback lógico (descartar saída). Entrada permanece intacta.
5. `node scripts/comparar-v1-v2.mjs check --input entrada.json --target area-local/checkpoint.json` compara quantidade, IDs e diretórios.
6. Repetir produz o mesmo hash/checkpoint; arquivar relatórios e aprovar manualmente. Publicação posterior é outra operação protegida.

Antes de dados reais: cópia somente leitura, base legal/acesso mínimo, armazenamento temporário protegido, backup, amostra anonimizada, validação dos três diretórios, ensaio de rollback e dupla aprovação. Nunca disponibilizar checkpoint em diretório público.
