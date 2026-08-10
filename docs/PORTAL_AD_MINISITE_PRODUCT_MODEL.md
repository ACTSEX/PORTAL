# ACTS — Modelo oficial de produto: Portal, Anúncio e Minisite

**Versão:** 3.0
**Status:** decisão arquitetural vigente em 2026-08-10
**Natureza:** exclusivamente documental; não implementa Blogger, minisite ou impulsionamento.

## 1. Três superfícies distintas

### Portal central

`acompanhantesex.com` é responsável por descoberta, cidade, categorias, cards, busca, acesso aos anúncios e exposição comercial da rede. Seu catálogo municipal é um índice público leve, não um minisite agregado.

### Anúncio

É a representação comercial da anunciante dentro do portal. Está disponível para STANDARD e PREMIUM e inclui perfil, contatos e mídias oficiais permitidas conforme o plano.

### Minisite

`{slug}.acompanhantesex.com` é a vitrine individual da anunciante dentro da infraestrutura ACTS, exclusiva do PREMIUM. Exemplo: `juliana.acompanhantesex.com`. O minisite é produto ACTS; o Blogger é apenas origem editorial externa.

## 2. Planos estruturais oficiais

Existem somente **STANDARD** e **PREMIUM**.

### STANDARD

Inclui conta ACTS, card, anúncio, perfil, contatos e mídias oficiais permitidas. Não inclui minisite, subdomínio, integração Blogger no ACTS nem direito de comprar impulsionamentos.

### PREMIUM

Inclui tudo do STANDARD, mais minisite, subdomínio `{slug}.acompanhantesex.com`, integração Blogger no minisite e direito de comprar impulsionamentos pagos separadamente.

**`PREMIUM != IMPULSIONAMENTO INCLUÍDO`.** Impulsionamento é produto comercial separado, com preço próprio. PREMIUM apenas habilita o direito de realizar novas compras.

## 3. FREE não é plano

Não existe plano FREE. Trial, cortesia, promoção e gratuidade temporária são condições comerciais, nunca identidades estruturais:

```text
plan = premium
commercial_condition = courtesy
```

ou

```text
plan = standard
commercial_condition = trial
```

A condição comercial não cria um terceiro plano.

## 4. Downgrade PREMIUM → STANDARD

O downgrade é reversível. Permanecem conta, card, anúncio, perfil, dados, contatos e mídias oficiais permitidas. São desativados minisite, publicação do subdomínio, integração Blogger no ACTS e direito de novas compras de impulsionamento.

Configurações de minisite e Blogger devem ser preserváveis para reativação. O ACTS não apaga, altera, migra ou copia Blogger; não exclui histórico editorial; não executa limpeza R2 do acervo Blogger. Upgrade futuro pode reativar a vitrine sem reconstruir o patrimônio editorial.

O comportamento de impulsionamentos já ativos durante downgrade permanece pendente.

## 5. Impulsionamento separado

Somente PREMIUM pode comprar novos impulsionamentos. Cada impulsionamento terá preço próprio e deverá futuramente possuir produto, duração, alvo, estado, cobrança e expiração. Esta decisão não define banco, regras de campanhas ativas, preços nem algoritmo de ranking e não autoriza implementação.

## 6. Estado público pequeno

Cada anunciante possui uma pequena projeção pública ACTS em uma JSON individual. Ela pode refletir nome artístico, perfil, cidade, serviços, contatos públicos, mídia oficial, plano efetivo, disponibilidade do minisite, configuração pública necessária e moderação. Não contém feed, posts, fotos ou vídeos editoriais, histórico ou HTML Blogger. Somente mudança relevante no estado ACTS a regenera.

O catálogo municipal contém apenas dados necessários a cards, descoberta, filtros, ordenação, identificação e localização da JSON individual. Não carrega o conteúdo completo do minisite, posts Blogger ou duplicação desnecessária.

## 7. Minisite e Blogger

O minisite recebe HTML/CSS/JS e JSON individual ACTS por R2/Edge Cache. Separadamente, o navegador consulta o feed público da anunciante, faz parsing, sanitização e normalização client-side e renderiza a seção editorial.

Blogger e Conta Google pertencem à anunciante. O ACTS não hospeda nem sincroniza esse patrimônio no backend, D1, R2 ou KV e não usa Queue ou Cron para copiá-lo. **Premium habilita a vitrine; não hospeda o patrimônio editorial.**

Falha Blogger não derruba o minisite: perfil, contatos, mídias oficiais e informações comerciais permanecem disponíveis; a seção editorial isola loading, timeout e erro, mostra fallback e oferece retry limitado/manual, sem write backend.

## 8. Segurança e Core

O feed é conteúdo externo não confiável. O frontend aplica limites, timeout, parsing seguro, sanitização, allowlist, validação de URLs e providers, DOM seguro, CSP, proteção XSS e iframe sandbox quando aplicável. HTML bruto não é inserido diretamente. O Core backend continua genérico e não conhece conteúdo Blogger.

## 9. Domínio imobiliário legado

Referências imobiliárias são legado técnico do projeto inicial e não definem o produto final AcompanhanteSex. Código, banco e migrations não são removidos nesta etapa; a adequação técnica futura exige decisão própria.

## DECISÕES PENDENTES

Permanecem abertas e bloqueadas para implementação: cardinalidade conta/anúncio/minisite; estrutura exata da JSON individual; conteúdo exato do catálogo municipal; manifest individual; boost ativo durante downgrade; inadimplência e tolerância; preço/versionamento dos planos; endpoint, CORS e paginação Blogger; providers de vídeo; canonical/noindex editorial; privacidade Google/Blogger; wildcard Cloudflare; limites exatos de mídia oficial; taxonomia final; destino das estruturas imobiliárias; e algoritmo de ranking de impulsionamento.
