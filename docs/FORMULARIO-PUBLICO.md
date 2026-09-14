# Formulário público configurável

A fonte única é `config/formulario-publico.json`, versão 2. Ela define ordem, onze seções, tipos, rótulos, ajuda, limites, contadores, obrigatoriedade, condicionais, diretórios, planos, somente leitura e classificação público/privado. O renderizador genérico trata texto, textarea, número, telefone, URL, select, multiselect, radio, checkbox, alternador, horário, faixa e agrupamento.

O Worker aceita somente allowlists próprias para perfil e site, remove espaços, rejeita controles, tags, scripts e protocolos perigosos. `revision` impede sobrescrita silenciosa. O diretório nunca é aceito no corpo: vem do cadastro privado. A cidade é modelada como lista, porém limitada a `londrina`. As categorias oficiais permanecem vazias porque ainda não foram comprovadas; o mecanismo por diretório está pronto e o Worker recusa categorias inventadas.

Contatos pessoais só são copiados mediante escolha e consentimento explícitos; “nenhum” revoga a exposição. Gmail, CPF, nascimento, `googleSub`, nome civil, endereço completo e documentos não pertencem ao contrato do rascunho.

## Identidade municipal

Endereço privado registra `paisId`, `estadoId`, `estadoSigla`, `municipioId` e `municipioNome`, além de CEP, bairro, rua, número e complemento. CEP apenas sugere; o município deve existir no arquivo da UF. O anúncio usa ID, nome e slug validados. O schema admite evolução, mas esta versão mantém exatamente uma cidade principal e não ativa publicação multicidade.
