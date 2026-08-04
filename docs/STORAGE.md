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

---

## Arquitetura 2.0 — decisão vigente (2026-08-04)

Esta seção substitui qualquer descrição anterior incompatível neste documento. A evolução preserva os Lotes 1 a 9 já concluídos; ajustes de implementação dependem de necessidade concreta, autorização e lote futuro. Esta revisão é exclusivamente documental.

- Há **um único D1 operacional por ambiente**, única fonte de verdade relacional para usuários, anúncios, clientes, planos, assinaturas, pagamentos, configurações e demais dados oficiais. Não existe segundo D1 público. Toda mutação é validada e confirmada no D1 antes de publicar; derivados nunca se tornam fonte de verdade.
- O R2 é a origem oficial de JSONs públicos compilados, catálogos de cidades, manifests, mídia, imagens e demais artefatos públicos aprovados. Esses objetos são reconstruíveis do D1.
- O KV fica fora da navegação pública normal: visitantes não fazem `KV.get()` para catálogos e KV não origina os JSONs públicos. Seu uso limita-se a configuração, feature flags, coordenação, cache interno de baixo volume e metadados operacionais quando comprovado.
- Valem simultaneamente: `navegação pública normal = zero consultas ao D1`, `navegação pública normal = zero leituras no KV` e `navegação pública normal = zero Worker/Pages Function`. Pages entrega HTML, CSS e JavaScript; R2 com Cloudflare Edge Cache entrega JSON e mídia. Functions e Workers servem escrita, autenticação, administração, integrações e processamento privado.
- A unidade principal é **uma cidade = uma JSON pública unificada e versionada**. Ela reutiliza anunciantes por identificador e atende cidade, categorias, filtros, busca local, cards, detalhes, dados públicos de anunciantes, minisites e comparação. Não se adota como padrão JSON completa por anúncio, cliente ou minisite. Acesso direto a minisite resolve anunciante, cidade e versão, então reutiliza o catálogo da cidade.
- A JSON permanece unificada enquanto tamanho e carregamento medidos forem aceitáveis. Divisão por categoria, página, chunk, geografia ou outro grupo exige necessidade real, aprovação, poucas requisições e reutilização dos dados carregados.
- O Publisher produz projeções compactas, serializáveis, minificáveis, sem campos internos, dados privados ou duplicação evitável, adequadas a parsing e compressão HTTP no Edge. Otimização estrutural, minificação e compressão HTTP são etapas distintas; não se exige Brotli/Gzip manual sem validação futura.
- Catálogos usam nomes imutáveis versionados, como `cidades/londrina/catalogo-v145.json`. Um manifest estável, como `cidades/londrina/manifest.json`, informa ao menos versão, caminho vigente, atualização e integridade aplicável. O catálogo admite cache longo/imutável e o manifest cache curto. O manifest só muda após confirmação integral do novo objeto.
- R2 é origem e Edge Cache é a camada principal de entrega. JSON exige Cache Rules explícitas e validadas no domínio dos artefatos; hits devem atender o tráfego normal e apenas misses alcançam R2. Não há promessa de latência fixa.
- Cloudflare Queue é o transporte principal da publicação assíncrona, com desacoplamento, recompilação, retries, agrupamento e recuperação. Não substitui D1. O fluxo é `Painel → Function/Worker de escrita → módulo → D1 → evento → Queue → Publisher → JSON otimizada → R2 → Edge Cache → navegador`. Separadamente: escrita `Painel → backend privado → D1`; publicação `D1 confirmado → Queue → Publisher → R2`; leitura `Pages + Edge Cache + R2 → navegador`.
- Alterações marcam cidades afetadas e somente elas são recompiladas. O Lote 9A agrega mensagens da mesma cidade apenas dentro do batch entregue; `dueAt` calculado não executa espera persistente. A janela entre batches/invocações permanece pendente para o runtime do Lote 16B, enquanto regras de domínio são do Lote 13 e reconciliação operacional pertence aos Lotes 16B e 18. Cron é complementar, nunca o caminho obrigatório de cada alteração.
- Falha de publicação não reverte o negócio confirmado: D1 permanece verdadeiro. Publicação é repetível/idempotente, suporta republicação e retenção temporária de versões para rollback; falha em R2 não aponta manifest a arquivo parcial.
- O navegador prioriza cache HTTP, memória, Cache Storage quando necessário, IndexedDB para persistência estruturada e `localStorage` somente para pequenos metadados/preferências. A JSON completa não tem `localStorage` como armazenamento principal.
- Catálogos contêm somente projeções públicas aprovadas: sem e-mail privado, dados administrativos, tokens, pagamentos, endereço privado não autorizado ou coordenada precisa proibida.
