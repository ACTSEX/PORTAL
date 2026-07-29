ACTS Portal

STORAGE

Versão: 1.0Status: OficialEscopo: app/core/storage.js

1. Objetivo

A camada Storage é responsável pelo gerenciamento de arquivos permanentes daplataforma.

Seu provedor oficial é o Cloudflare R2.

2. Princípios

Responsabilidade única.

Arquivos separados dos dados.

D1 armazena apenas metadados.

R2 armazena o conteúdo.

Operações previsíveis e auditáveis.

3. Arquitetura

Aplicação
   ↓
Storage
   ↓
Cloudflare R2

4. Responsabilidades

O Storage pode:

enviar arquivos;

recuperar arquivos;

excluir arquivos;

verificar existência;

gerar URLs internas;

organizar buckets.

Não pode:

armazenar regras de negócio;

gravar dados relacionais;

publicar páginas;

manipular cache diretamente.

5. Tipos de arquivos

imagens;

documentos;

vídeos;

backups;

exportações;

anexos.

6. Organização

Exemplo:

uploads/
images/
documents/
exports/
backups/

Evitar estruturas desorganizadas.

7. Upload

Todo upload deve validar:

tipo MIME;

extensão;

tamanho;

nome;

integridade.

8. Exclusão

Excluir apenas após validações necessárias.

Operações críticas devem ser auditadas.

9. Versionamento

Quando necessário:

manter histórico;

preservar referências;

evitar sobrescritas indevidas.

10. Segurança

Nunca permitir:

execução de arquivos enviados;

upload de tipos proibidos;

acesso sem autorização;

exposição de buckets privados.

11. Integração

Integra-se com:

DB (metadados);

Auth;

Security;

Publisher;

Logger.

12. Observabilidade

Registrar:

upload;

download;

exclusão;

duração;

tamanho;

usuário.

13. Performance

upload em streaming quando possível;

evitar cópias desnecessárias;

organizar objetos por prefixos.

14. Testes

Cobrir:

upload;

download;

exclusão;

permissões;

arquivos inválidos.

15. Critérios de aceitação

compatível com R2;

sem regras de negócio;

seguro;

auditável;

testável.

16. Regra final

Todo armazenamento permanente de arquivos do Portal ACTS deve passar pela camadaStorage.

O D1 armazena apenas metadados; o conteúdo permanece no R2.
