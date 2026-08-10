# ACTS — Arquitetura de Conteúdo Pessoal via Blogger Feed

**Status:** Decisão arquitetural proposta para incorporação oficial  
**Escopo:** sites individuais das anunciantes (`{slug}.acts.com`)  
**Não se aplica:** portal central do ACTS

---

## 1. Objetivo

O ACTS deve separar claramente duas responsabilidades:

1. **ACTS:** conta, perfil, anúncio/classificado, identidade do site individual, descoberta, navegação, configuração e apresentação.
2. **Blogger da própria anunciante:** conteúdo editorial e acervo pessoal publicado pela anunciante, incluindo textos, fotografias, vídeos/embeds, publicações históricas e marcadores.

O objetivo é evitar transformar o ACTS em um CMS completo de publicações e em um repositório central de grandes volumes de mídia quando a própria anunciante já mantém voluntariamente seu conteúdo em um blog pessoal.

O Blogger funciona como **origem editorial externa controlada pela própria anunciante**. O ACTS funciona como **camada de apresentação, organização e integração** desse conteúdo exclusivamente no site individual da anunciante.

---

## 2. Princípio fundamental

A integração é estritamente **1:1**:

```text
Anunciante
    │
    ├── possui e administra seu próprio Blogger
    │
    ├── publica seu próprio conteúdo
    │
    ├── define os marcadores das publicações
    │
    └── informa voluntariamente o próprio feed no painel ACTS
            │
            ▼
      {slug}.acts.com
```

O ACTS **não deve coletar feeds aleatórios**, não deve agregar publicações de várias anunciantes no portal central e não deve transformar o conteúdo dos feeds em um feed editorial global da plataforma.

---

## 3. Separação obrigatória: Portal x Site individual

### 3.1 Portal central

O portal central (`acts.com`) trabalha exclusivamente com os dados oficiais do classificado/perfil definidos pela plataforma.

Pode exibir, conforme regras do produto:

- nome;
- foto principal permitida pelo modelo do anúncio;
- cidade/localização;
- categoria;
- descrição resumida;
- dados públicos do perfil;
- meios de contato permitidos;
- estado do anúncio;
- link para o site individual.

O portal central **não lê, não agrega e não reproduz o feed do Blogger da anunciante**.

Fluxo:

```text
acts.com
│
├── busca
├── cidades
├── categorias
├── anúncios
└── link para {slug}.acts.com

Blogger feed: NÃO utilizado aqui
```

### 3.2 Site individual

A integração com Blogger existe exclusivamente no site individual:

```text
{slug}.acts.com
│
├── perfil
├── informações da anunciante
├── contato
├── foto principal ACTS
├── vídeo principal configurado no ACTS, quando aplicável
└── conteúdo pessoal autorizado
        │
        └── feed Blogger informado pela própria anunciante
```

---

## 4. Consentimento e configuração pela anunciante

A integração nunca deve ser presumida automaticamente.

A própria anunciante deve inserir no painel ACTS a URL do feed de um blog que ela declara administrar e autorizar sua utilização no site individual.

Modelo conceitual:

```text
Painel ACTS

Feed do meu Blogger:
[ https://exemplo.blogspot.com/feeds/posts/default ]

[ ] Exibir minhas publicações no meu site ACTS
```

A configuração deve permitir, no mínimo:

- URL do feed;
- status ativo/inativo;
- lista de marcadores reconhecidos/exibidos;
- ordem dos itens de menu, quando configurável;
- possibilidade de desvincular o feed imediatamente.

A URL do feed é uma configuração da conta/perfil. Ela não transforma o Blogger em fonte oficial dos dados comerciais do anúncio.

---

## 5. Fonte da verdade

### 5.1 D1 continua sendo fonte oficial do ACTS

Dados internos e comerciais continuam pertencendo ao ACTS e devem ter D1 como fonte oficial, conforme a arquitetura geral da plataforma.

Exemplos:

- conta;
- autenticação;
- perfil;
- slug/subdomínio;
- cidade;
- categoria do anúncio;
- descrição comercial;
- meios de contato;
- plano;
- permissões;
- status;
- configurações do site;
- URL do feed;
- marcadores escolhidos para navegação.

### 5.2 Blogger é fonte editorial externa

O Blogger é fonte somente do conteúdo pessoal/editorial publicado pela anunciante.

Exemplos:

- posts;
- textos de publicações;
- imagens referenciadas pelos posts;
- vídeos ou embeds permitidos;
- datas editoriais;
- títulos;
- marcadores/labels;
- histórico de publicações.

Portanto:

```text
D1 = identidade, conta, anúncio e configuração oficial do ACTS
Blogger = conteúdo editorial/pessoal externo da anunciante
```

O feed nunca deve substituir o D1 para os dados oficiais do classificado.

---

## 6. Papel do painel ACTS

Com esta arquitetura, o painel da anunciante deve permanecer pequeno e ser usado principalmente para **configuração**, não para produção editorial diária.

O painel pode concentrar:

```text
CONTA
├── login/autenticação
├── plano
├── status
└── configurações essenciais

PERFIL/ANÚNCIO
├── nome
├── cidade
├── categoria
├── descrição
├── telefone/WhatsApp e demais contatos permitidos
├── foto principal
└── URL de vídeo principal, quando aplicável

SITE INDIVIDUAL
├── slug/subdomínio
├── configurações visuais permitidas
├── URL do feed Blogger
├── feed ativo/inativo
└── marcadores que aparecem na navegação
```

Depois da configuração inicial, a anunciante não precisa voltar ao ACTS toda vez que desejar publicar fotos, vídeos, textos ou novas postagens.

Seu fluxo cotidiano pode ser:

```text
Blogger
   ↓
Nova postagem
   ↓
Texto / fotos / vídeo
   ↓
Marcador correto
   ↓
Publicar
   ↓
Site individual ACTS organiza/apresenta
```

---

## 7. Marcadores como mecanismo editorial

Os marcadores do Blogger funcionam como uma taxonomia editorial simples controlada pela própria anunciante.

Exemplo de regra operacional:

```text
Conteúdo com fotos      → marcador `Fotos`
Conteúdo com vídeo      → marcador `Videos`
Novidades               → marcador `Novidades`
Bastidores               → marcador `Bastidores`
Eventos                  → marcador `Eventos`
```

A anunciante precisa apenas aplicar o marcador correto ao criar a postagem.

O ACTS interpreta os marcadores reconhecidos e transforma esses grupos em experiências próprias de navegação.

---

## 8. Navegação do site individual

Exemplo:

```text
{slug}.acts.com

INÍCIO | FOTOS | VÍDEOS | NOVIDADES | TUDO
```

Cada item tem função distinta.

### 8.1 Tudo / Publicações

Apresenta o fluxo cronológico geral das publicações aceitas do feed.

```text
/tudo
ou
/publicacoes
```

Pode utilizar paginação ou carregamento incremental.

### 8.2 Fotos

O item `Fotos` não precisa simplesmente reproduzir a aparência de posts do Blogger.

O ACTS pode interpretar posts marcados como `Fotos`, extrair as referências de imagem permitidas e montar uma galeria própria:

```text
Post Blogger + marcador Fotos
           ↓
ACTS identifica imagens
           ↓
/fotos
           ↓
Galeria ACTS
```

Assim, várias imagens existentes em diferentes posts podem formar uma galeria sequencial única.

### 8.3 Vídeos

O mesmo princípio vale para `Videos`:

```text
Post Blogger + marcador Videos
           ↓
ACTS identifica mídia/embed permitido
           ↓
/videos
           ↓
Galeria/listagem de vídeos
```

### 8.4 Outros marcadores

Marcadores adicionais podem gerar seções específicas, desde que sejam reconhecidos/configurados pelo ACTS.

O sistema não deve transformar automaticamente todo marcador encontrado em item do menu principal, pois blogs antigos podem possuir dezenas de labels.

A anunciante ou a configuração da plataforma deve decidir quais marcadores são exibidos.

---

## 9. Feed geral e feeds por marcador

O Blogger disponibiliza feed geral e mecanismos de filtragem por marcadores.

Conceitualmente:

```text
Feed geral
https://{blog}.blogspot.com/feeds/posts/default

Feed por marcador
https://{blog}.blogspot.com/feeds/posts/default/-/{Marcador}
```

A implementação poderá escolher entre:

1. consumir o feed geral e classificar as entradas pelos labels existentes; ou
2. consultar feeds específicos por marcador quando isso for mais adequado.

A escolha é de implementação e desempenho. A regra de negócio permanece a mesma.

---

## 10. Conteúdo adulto e aviso de maioridade

O blog pode ser configurado pela própria anunciante como conteúdo adulto conforme as regras do serviço externo utilizado.

O ACTS **não deve depender do aviso visual do Blogger**, pois uma integração por feed pode não passar pelo mesmo intersticial exibido ao visitar diretamente o blog.

Consequentemente, qualquer controle de maioridade, consentimento ou aviso necessário no ACTS deve ser implementado pelo próprio ACTS e aplicado ao site individual conforme a política da plataforma.

Fluxo conceitual:

```text
Visitante
   ↓
{slug}.acts.com
   ↓
site exige aviso/controle +18 quando aplicável
   ↓
visitante confirma
   ↓
conteúdo permitido do site individual
```

O fato de o Blogger possuir sua própria classificação de conteúdo não substitui as obrigações e regras do ACTS.

---

## 11. Responsabilidade pelo conteúdo

O conteúdo editorial é produzido e publicado pela própria anunciante em serviço externo que ela controla.

A integração deve registrar de forma clara que:

- a anunciante informa voluntariamente seu feed;
- a anunciante declara possuir autorização/direitos sobre o conteúdo disponibilizado;
- o conteúdo exibido no site individual continua sujeito às regras do ACTS;
- conteúdo que viole regras da plataforma pode ter a integração desativada, mesmo que o serviço externo permita sua hospedagem;
- a plataforma deve possuir mecanismo de desvinculação/suspensão do feed;
- remoção ou indisponibilidade do blog não pode derrubar o anúncio/perfil principal.

---

## 12. Segurança: feed é entrada externa não confiável

O feed e o HTML vindo do Blogger devem ser tratados como dados externos não confiáveis.

O ACTS nunca deve inserir conteúdo externo cru no DOM ou em páginas publicadas sem sanitização.

### 12.1 Elementos potencialmente permitidos

Conforme política de implementação:

- parágrafos;
- títulos;
- texto formatado;
- listas;
- links seguros;
- imagens por HTTPS;
- blockquotes;
- elementos simples de conteúdo;
- embeds/iframes somente de provedores explicitamente autorizados.

### 12.2 Elementos a remover ou bloquear

- `<script>`;
- JavaScript inline;
- atributos `on*` como `onclick`;
- formulários externos não autorizados;
- iframes de origens desconhecidas;
- objetos/plugins inseguros;
- URLs com esquemas perigosos;
- CSS/HTML capaz de quebrar o layout ou executar código;
- qualquer elemento fora da allowlist definida pelo sanitizador.

Regra:

```text
Feed externo
   ↓
Parser
   ↓
Sanitização allowlist
   ↓
Normalização
   ↓
Conteúdo seguro
   ↓
Renderização/Publicação ACTS
```

---

## 13. Imagens

Quando tecnicamente permitido e adequado, o ACTS deve preferir **referenciar a imagem na origem**, em vez de copiar automaticamente cada imagem para o R2.

Conceitualmente:

```text
Página ACTS
   ├── HTML/estrutura → ACTS
   └── imagem → URL da infraestrutura externa
```

Isso reduz:

- armazenamento no R2;
- processamento de uploads;
- duplicação de mídia;
- necessidade de migrations de grandes acervos;
- custo operacional da plataforma.

O ACTS não deve prometer uma capacidade fixa de armazenamento pertencente ao serviço externo. Quotas e políticas do fornecedor externo podem mudar e são responsabilidade da conta da anunciante.

---

## 14. Vídeos e embeds

Vídeos devem ser tratados como mídia referenciada/embutida quando possível, sem cópia automática para o R2.

A integração deve possuir allowlist de provedores e formatos aceitos.

Exemplos conceituais:

```text
YouTube permitido
   ↓
ACTS extrai/normaliza o identificador
   ↓
reconstrói embed seguro
```

Um iframe arbitrário copiado do feed nunca deve ser confiado automaticamente.

---

## 15. R2 nesta arquitetura

A adoção do Blogger reduz drasticamente a necessidade de R2 para o acervo editorial cotidiano das anunciantes.

O objetivo **não é obrigatoriamente remover R2 do ACTS**, mas impedir que ele se transforme, sem necessidade, no armazenamento central de milhares ou milhões de fotos e vídeos dos blogs das anunciantes.

R2 permanece apropriado para dados que realmente pertencem à plataforma, como:

```text
R2 ACTS
├── arquivos institucionais
├── backups da plataforma
├── exportações
├── arquivos gerados pelo ACTS
├── eventual mídia própria do ACTS
└── mídia do perfil/anúncio quando a arquitetura oficial assim exigir
```

Não é responsabilidade padrão do R2:

```text
✗ copiar todo o histórico do Blogger
✗ duplicar todas as fotos das publicações
✗ armazenar todos os vídeos pessoais
✗ virar backup do Blogger da anunciante
```

---

## 16. D1 nesta arquitetura

O D1 também deve permanecer enxuto.

Não é necessário criar registros internos individuais para cada foto, vídeo ou post apenas para reproduzir um blog externo.

Exemplo conceitual de configuração:

```text
id
slug
nome
cidade
categoria
foto_principal
video_principal_url
descricao
contatos
feed_url
feed_ativo
marcadores_menu
plano_id
status
```

O modelo real seguirá as tabelas e contratos oficiais do ACTS; a lista acima é apenas ilustrativa.

O D1 não deve virar réplica integral do Blogger.

---

## 17. Estratégia de consumo/publicação

A arquitetura preferencial do ACTS é evitar que cada visitante cause processamento desnecessário no backend da plataforma.

Existem duas formas técnicas possíveis:

### 17.1 Leitura direta no navegador

```text
Visitante
   ↓
site ACTS
   ↓
JavaScript
   ↓
feed Blogger
```

É simples, porém cria dependência direta do serviço externo durante cada visita e pode trazer limitações de CORS, SEO, disponibilidade e comportamento do feed.

### 17.2 Sincronização + artefatos publicados — abordagem preferencial

```text
Blogger
   ↓
integração ACTS
   ↓
parser + sanitização + normalização
   ↓
Publish
   ↓
HTML / JSON / índices / sitemap / cache
   ↓
visitante
```

Esta segunda abordagem é a preferencial quando compatível com custos e requisitos, pois respeita a filosofia oficial do ACTS de gerar conteúdo público já preparado para leitura.

Ela permite que múltiplas visitas consumam artefatos publicados sem consultar D1 e sem solicitar novamente o feed externo a cada acesso.

---

## 18. Atualização do conteúdo

A sincronização pode ser disparada por estratégia compatível com a plataforma, como:

- ação explícita da anunciante (`Atualizar publicações`);
- scheduler/cron em intervalo controlado;
- atualização oportunística com cache e TTL;
- outro mecanismo aprovado futuramente.

A sincronização deve evitar polling agressivo.

O ACTS não precisa consultar cada blog a cada visita.

---

## 19. Resiliência e falhas

O site individual nunca deve depender integralmente da disponibilidade do Blogger.

Se o feed estiver temporariamente indisponível:

- perfil ACTS continua funcionando;
- anúncio continua funcionando;
- contatos continuam funcionando;
- navegação estrutural do site continua funcionando;
- apenas a área editorial pode apresentar estado indisponível ou último artefato seguro publicado, conforme política de cache.

Se o blog for excluído ou o feed ficar permanentemente inválido, o ACTS deve permitir desativar a integração sem alterar a conta/anúncio principal.

---

## 20. SEO

Se as publicações tiverem URLs próprias dentro do site individual, a implementação deve garantir que o conteúdo indexável seja entregue de forma adequada aos mecanismos de busca.

Não se deve assumir que conteúdo montado exclusivamente após JavaScript client-side oferece a experiência SEO desejada.

A estratégia de artefatos publicados pode gerar, quando aprovado:

- páginas HTML;
- metadados;
- canonical coerente;
- sitemap do site individual;
- índices por seção/marcador.

A política de canonical e indexação deve respeitar eventual duplicidade entre a publicação original no Blogger e sua apresentação no ACTS.

---

## 21. O que esta arquitetura evita

Com a integração editorial externa, o ACTS não precisa construir, por padrão:

- editor de posts completo;
- sistema complexo de rascunhos;
- histórico editorial;
- biblioteca de milhares de mídias por anunciante;
- processamento próprio de todas as fotos editoriais;
- hospedagem própria de grandes vídeos;
- categorias editoriais duplicadas;
- CMS equivalente a WordPress/Blogger;
- backup integral do acervo editorial da anunciante.

Essa redução de escopo é deliberada.

---

## 22. Benefícios arquiteturais

### 22.1 Menor uso do painel ACTS

A anunciante configura a conta e passa a utilizar o Blogger para a rotina editorial.

### 22.2 Menor armazenamento central

O acervo editorial permanece no serviço externo controlado pela anunciante, reduzindo a necessidade de R2.

### 22.3 D1 menor

O banco armazena principalmente dados oficiais da plataforma e configuração da integração, não cópia integral do acervo editorial.

### 22.4 Menor complexidade

O ACTS não precisa se tornar simultaneamente classificado, CMS, galeria, rede social e hospedagem de vídeo.

### 22.5 Autonomia editorial

A anunciante mantém o próprio histórico e publica usando uma ferramenta que já fornece editor, upload, organização e gerenciamento editorial.

### 22.6 Site individual mais rico

O ACTS consegue reconstruir o conteúdo em uma interface própria com:

- menus;
- galerias;
- vídeos;
- categorias/marcadores;
- paginação;
- design ACTS;
- integração com perfil/anúncio.

---

## 23. Limites e dependências externas

Esta arquitetura depende parcialmente de fornecedor externo.

Portanto:

- formatos de feed podem mudar;
- quotas de armazenamento podem mudar;
- políticas de conteúdo podem mudar;
- disponibilidade do serviço pode variar;
- URLs de mídia podem mudar;
- determinados tipos de mídia/embeds podem exigir tratamento especial.

Nenhuma regra do ACTS deve garantir como permanente uma política, quota ou comportamento específico do Blogger/Google que esteja fora do controle da plataforma.

Mudanças externas devem ser absorvidas no provider/adaptador, sem espalhar dependências de Blogger por Core, módulos e templates.

---

## 24. Organização arquitetural recomendada

A integração deve respeitar a regra oficial de módulos e integrações externas.

Conceitualmente:

```text
modules/
└── publicacoes.js

plugins/ ou provider adequado/
└── blogger.js
```

Responsabilidades:

### `publicacoes.js`

- regras do domínio Publicações;
- seções permitidas;
- classificação por marcador;
- transformação em galeria/listagem;
- integração com Publish;
- eventos e contratos públicos necessários.

### `blogger.js`

- comunicação com Blogger/feed;
- parsing do formato externo;
- normalização de dados externos;
- tratamento de erros específicos do fornecedor;
- isolamento de detalhes do Blogger.

A localização física final deve respeitar a árvore oficial vigente no momento da implementação.

O Core não deve conhecer Blogger.

---

## 25. Modelo de fluxo completo

```text
ANUNCIANTE
    │
    ├── configura conta/perfil no ACTS
    │
    ├── informa seu feed Blogger
    │
    └── continua publicando no Blogger
             │
             ├── texto
             ├── fotos
             ├── vídeos/embeds permitidos
             └── marcadores
                    │
                    ▼
             PROVIDER BLOGGER
                    │
             parser / validação
                    │
             sanitização / normalização
                    │
                    ▼
             MÓDULO PUBLICAÇÕES
                    │
             classifica por marcador
                    │
                    ▼
                  PUBLISH
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
     HTML          JSON        índices
       │            │            │
       └────────────┼────────────┘
                    ▼
             cache/conteúdo público
                    │
                    ▼
             {slug}.acts.com
                    │
       ┌────────────┼──────────────┐
       ▼            ▼              ▼
     FOTOS        VÍDEOS          TUDO
```

Enquanto isso:

```text
acts.com (portal central)
       │
       └── NÃO reproduz o feed Blogger
```

---

## 26. Regra permanente de escopo

A integração Blogger existe para enriquecer **o site individual da própria anunciante com conteúdo que ela própria administra e autorizou**.

Ela não deve ser utilizada para criar agregador global de mídia no portal central.

Ela não altera a natureza do D1 como fonte oficial dos dados internos do ACTS.

Ela não transforma o R2 em réplica do conteúdo externo.

Ela não transforma o ACTS em CMS editorial completo.

Ela não autoriza conteúdo apenas porque o provedor externo o hospeda: as regras próprias do ACTS continuam prevalecendo.

---

## 27. Decisão resumida

```text
ACTS
= conta + perfil + classificado + identidade + navegação + apresentação

BLOGGER DA ANUNCIANTE
= posts + textos + fotos + vídeos/embeds + marcadores + histórico editorial

PORTAL CENTRAL
= não reproduz o feed

SITE INDIVIDUAL
= pode reproduzir/organizar o feed autorizado da própria anunciante

D1
= fonte oficial dos dados internos do ACTS

R2
= reservado para conteúdo que realmente pertence à infraestrutura ACTS;
  não duplica automaticamente todo o Blogger

PAINEL ACTS
= configuração enxuta, não CMS cotidiano
```

Esta separação deve orientar qualquer implementação futura do módulo de Publicações e da integração com Blogger.
