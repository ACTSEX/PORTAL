# Modelo de dados

A chave estável é `clienteId`. Identidade e operacional privados são separados de `perfil-publico`; índices por cidade/diretório/categoria guardam referências, não cópias. Exemplos em `examples/` são fictícios e validáveis pelos schemas.

`identidade`: civil, CPF, nascimento, nacionalidade, sexo, Google. `operacional`: cidade, diretório, contatos, endereço, aprovação/plano. `perfil-publico`: slug, nome artístico, idade calculada, cidades, categorias e manifesto. `midias`: IDs permanentes e ordem. `shard`: somente uma combinação cidade/diretório e categoria opcional. `manifesto`: versão e hashes, promovido por último. `auditoria`: antes/depois, administrador, motivo e instante. `financeiro`: Asaas desativado.

Na Rodada 2, todo documento privado mutável contém `schemaVersion`, `revision`, `clienteId`, `criadoEm` e `atualizadoEm`. Identidade e operacional ficam nos caminhos normativos; documentos têm manifesto semântico; avisos formam documento revisionado. Sessões e vínculos Google ficam sob `sistema/`. Índices de Google e CPF são HMAC e não revelam seus valores. Auditoria é um objeto imutável por evento.
