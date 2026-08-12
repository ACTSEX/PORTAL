ACTS Portal

SCHEMAS

Versão: 1.0Status: Oficial

Objetivo

Este documento define os schemas oficiais utilizados pelo Portal ACTS.

Schemas padronizam estruturas de dados, validações e contratos entre módulos.

Eles não substituem as regras de negócio.

Princípios

Todo schema possui uma responsabilidade única.

Schemas são independentes da interface.

Schemas não acessam banco de dados.

Alterações incompatíveis devem ser documentadas.

Todo schema deve possuir versão.

Organização

app/schemas/
├── listing.schema.json
├── user.schema.json
├── profile.schema.json
├── plan.schema.json
├── settings.schema.json
└── theme.schema.json

Schemas Oficiais

listing.schema.json

Responsável por validar:

anúncio

tipo

categoria

localização

preço

atributos

publicação

user.schema.json

Responsável por validar:

usuário

autenticação

permissões

dados cadastrais

profile.schema.json

Responsável por validar:

perfil público

corretor

empresa

contatos

redes sociais

plan.schema.json

Responsável por validar:

planos

limites

recursos

cobrança

settings.schema.json

Responsável por validar:

configurações gerais

parâmetros do sistema

recursos habilitados

theme.schema.json

Responsável por validar:

tema

cores

layout

componentes visuais

Versionamento

Todo schema deverá possuir controle de versão.

Mudanças incompatíveis devem gerar nova versão ou migração correspondente.

Regras

Validar entradas antes das regras de negócio.

Nunca confiar em dados externos.

Reutilizar schemas quando possível.

Evitar duplicação.

Relação com o D1

Schemas validam dados.

O D1 continua sendo a única fonte oficial de armazenamento.

Estado

Os schemas listados representam a estrutura inicial aprovada.

Novos schemas deverão ser registrados neste documento antes de sua implementação.

## Contratos conceituais de projeção pública — Etapa 5/7

Não há novo arquivo de schema nem implementação nesta etapa. Os nomes abaixo são contratos lógicos para posterior versionamento formal.

### `ActsAdvertiserPublicProjection`

Uma projeção pequena por anunciante pública, produzida por allowlist:

- metadados: `contractVersion`, revisão/digest técnico e instante publicado;
- identidade: id público opaco, slug, nome artístico, idade **derivada quando autorizada**, categoria e cidade canônica pública;
- card/perfil: foto principal, rating apenas quando habilitado, apresentação, campos públicos de perfil e serviços aprovados;
- contato: WhatsApp/telefone e outros contatos apenas quando marcados públicos;
- mídia ACTS: no máximo cinco fotos oficiais e vídeo oficial autorizado;
- minisite: disponibilidade efetiva e URL oficial somente sob entitlement;
- Blogger: somente referência/configuração mínima necessária ao fetch client-side, apenas se `canExposeBlogger` for verdadeiro.

São proibidos data de nascimento, e-mail privado, IDs financeiros/assinatura/pagamento, moderação/auditoria interna, secrets/tokens, PII privada, linha D1 integral e qualquer post/HTML/mídia/cache/derivado Blogger. STANDARD omite/desativa minisite e Blogger; PREMIUM não expõe finanças.

Quando o anúncio não estiver público, não se serve normalmente essa projeção: seu pointer público é retirado/inativado. A forma física do envelope e a política exata de idade permanecem abertas.

### `ActsMunicipalCatalog`

Índice leve versionado de uma cidade. Cada entrada contém somente id público, slug/locator da projeção individual, nome/foto de card, categoria/cidade, campos mínimos de filtro/ordenação e sinalização de destaque/prioridade quando aplicável. Deve renderizar o card sem fan-out para JSONs individuais.

Não contém perfil/apresentação completos, todos os contatos, galeria/vídeo completos, minisite completo ou configuração/conteúdo Blogger. Catálogo é descoberta; projeção individual é estado público detalhado e só é carregada quando necessária.

### Versionamento e validação

Ambos exigem versão explícita de contrato, serialização determinística, allowlist, limites de tamanho/quantidade, referências públicas válidas e digest verificável. Catálogo só referencia revisão individual já confirmada. Consumidores devem rejeitar versão incompatível sem fazer fallback para D1.

Mudança de card produz ambas as unidades; mudança apenas individual produz somente a projeção; configuração ou conteúdo Blogger não produz nenhuma. Uma mudança ACTS independente de entitlement pode voltar a projetar a configuração então elegível. Boost que só altera ranking produz catálogo. Troca de cidade coordena projeção nova, catálogo antigo e novo como uma ativação lógica idempotente.
