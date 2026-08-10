ACTS Portal

CONSTITUTION

Versão: 1.0Status: Oficial

Constituição da Arquitetura

Este documento define as regras permanentes da arquitetura do Portal ACTS.Em caso de conflito entre documentos, esta Constituição prevalece.

1. Fonte de verdade

O D1 é a única fonte de verdade para dados da aplicação.

O KV limita-se a necessidades técnicas pequenas e comprovadas, fora da navegação pública normal.

O R2 armazena apenas arquivos.

2. Arquitetura Edge

Cloudflare Pages é a plataforma principal.

Pages Functions apenas orquestram.

O Core fornece exclusivamente infraestrutura técnica genérica.

Regras de negócio permanecem exclusivamente nos módulos.

3. Organização

Cada arquivo possui uma responsabilidade principal.

Nenhum módulo acessa arquivos internos de outro módulo.

Comunicação entre módulos ocorre por Interfaces, Contracts e Event Bus.

4. Publicação

Fluxo oficial:

D1 confirmado → Event Bus → Queue → Publisher → R2 → Edge Cache

A navegação pública não deve depender de consultas ao D1.

5. Qualidade

Arquivos devem permanecer pequenos e coesos.

Funções devem ser simples.

Código deve ser testável e documentado.

6. Segurança

Todo acesso passa por Auth e Security.

Segredos nunca são registrados em logs.

Erros nunca expõem detalhes internos.

7. Governança

Toda alteração arquitetural relevante deve atualizar:

ADR correspondente;

documentação;

testes, quando aplicável.

8. Precedência documental

Em caso de conflito, deve ser observada a seguinte ordem:

esta Constituição;

decisão explícita mais recente, formalmente aprovada e registrada;

ARCHITECTURE.md;

ADR específico aprovado;

documentação especializada aplicável;

TREE.md;

ROADMAP.md;

contratos e schemas;

implementação existente.

TREE.md define onde um arquivo pode existir.

ROADMAP.md define quando um lote funcional pode ser implementado e quais arquivos pertencem a ele.

Listas de referência de documentos especializados não autorizam arquivos: `TREE.md` controla caminhos e `ROADMAP.md` controla a ordem dos lotes.

O lote funcional é a unidade oficial de implantação, testes, commit, revisão, Pull Request, aprovação e avanço. Cada arquivo conserva responsabilidade individual, mas não constitui uma etapa isolada de autorização.

O código existente não se torna regra apenas por já estar implementado.

Regra Final

Nenhuma implementação pode contrariar esta Constituição sem aprovação formalda arquitetura do projeto.

---

---

## Arquitetura 3.0 — decisão vigente (2026-08-10)

Esta seção substitui toda descrição anterior incompatível neste documento. A decisão é exclusivamente documental e não autoriza implementação, schema, migration, 13C, 13D ou Lote 14.

### Produto e planos

O ACTS possui três superfícies distintas:

1. **Portal central — `acompanhantesex.com`:** descoberta por cidade e categoria, cards, busca, acesso aos anúncios e exposição comercial da rede.
2. **Anúncio:** representação comercial da anunciante dentro do portal, disponível nos planos STANDARD e PREMIUM.
3. **Minisite — `{slug}.acompanhantesex.com`:** vitrine individual na infraestrutura ACTS, exclusiva do PREMIUM. Exemplo: `juliana.acompanhantesex.com`.

Existem somente dois planos estruturais:

- **STANDARD:** conta ACTS, card, anúncio, perfil, contatos e mídias oficiais permitidas; não inclui minisite, subdomínio, integração Blogger no ACTS nem direito de comprar impulsionamento.
- **PREMIUM:** tudo do STANDARD, minisite, subdomínio, integração Blogger no minisite e direito de comprar impulsionamentos pagos separadamente.

Não existe plano FREE. Trial, cortesia, promoção e gratuidade temporária são condições comerciais associadas a STANDARD ou PREMIUM e nunca uma terceira identidade de plano. **`PREMIUM != IMPULSIONAMENTO INCLUÍDO`**: impulsionamento é produto comercial separado, com preço próprio; PREMIUM apenas habilita novas compras. Produto, duração, alvo, estado, cobrança e expiração serão definidos futuramente, sem estrutura de banco nesta decisão.

### Estado e publicação ACTS

Há um único D1 operacional por ambiente. Ele é a única fonte de verdade do estado privado e comercial ACTS: conta, autenticação, perfil, anúncio, plano, assinatura, pagamento, condição comercial, configuração, moderação e eventos legítimos. D1 pode guardar configuração de integração Blogger — identificador, URL, habilitação, opções permitidas e seções — mas nunca posts, HTML, mídia editorial, histórico ou cache do feed. Isso não limita uma cliente a uma linha; separa estado ACTS de acervo editorial externo.

A unidade pública individual é `1 anunciante → 1 pequeno estado público ACTS → 1 JSON individual`. Essa JSON contém somente projeção pública legítima do ACTS e é regenerada apenas quando estado ACTS relevante da anunciante muda, como nome artístico, perfil, cidade, serviços, contatos públicos, mídia oficial, plano efetivo, disponibilidade/configuração pública do minisite ou moderação. Ela nunca contém posts, fotos ou vídeos editoriais, histórico, HTML ou cópia do feed Blogger.

A cidade deixa de ser uma JSON pública unificada completa e passa a ser **índice público leve de descoberta**. O catálogo municipal contém apenas o necessário para cards, descoberta, filtros, ordenação, identificação e localização da JSON individual; não carrega o minisite, posts Blogger nem duplica desnecessariamente a JSON individual. Os contratos exatos permanecem pendentes.

Fluxos públicos oficiais:

- portal: `D1 privado → evento legítimo → publicação → R2 → Edge Cache → catálogo municipal → navegador`;
- anunciante: `D1 privado → evento legítimo → publicação → R2 → Edge Cache → JSON individual → navegador`;
- minisite PREMIUM: o navegador recebe HTML/CSS/JS e JSON individual ACTS; separadamente, busca o feed diretamente no Blogger e o transforma client-side.

A navegação pública normal continua com zero consulta D1, zero leitura KV e zero Worker/Pages Function. R2 contém apenas responsabilidades ACTS: mídias oficiais, JSON públicas, manifests, artefatos versionados, assets e derivados autorizados. KV permanece técnico e privado. Queue permanece válida para publicação e processamento assíncrono interno. Cron permanece válido para reconciliação, expiração comercial, manutenção, pagamentos e operações. Nenhum desses componentes pode armazenar, importar, baixar, copiar, sincronizar ou gerar artefato do acervo Blogger.

### Blogger: propriedade e fronteira obrigatória

O Blogger e a Conta Google pertencem à anunciante. Posts, fotos, vídeos e histórico permanecem sob responsabilidade e controle dela e da infraestrutura de origem. O ACTS não se torna proprietário, repositório, backup ou CMS desse patrimônio. **Premium habilita a vitrine; não hospeda o patrimônio editorial.**

Fluxo único permitido:

`Blogger → feed público → navegador do visitante → parser client-side → sanitização → normalização → modelo interno de apresentação → renderização no minisite`.

O feed não passa por backend ACTS; não entra em D1, R2 ou KV; não gera JSON ou HTML derivado persistente; não usa Queue, Cron ou Worker para importação, cópia ou sincronização; e não cria banco ACTS de posts nem storage ACTS de mídia editorial. É proibido trocar silenciosamente essa arquitetura por proxy ou sincronização backend. Se a prova técnica futura mostrar inviável o consumo direto no navegador, a implementação deve parar até nova aprovação arquitetural.

Alteração editorial Blogger não é evento de domínio ACTS. Novo post, foto ou vídeo implica zero write D1, zero publicação ACTS, zero Queue ACTS e zero R2 ACTS; por isso também não regenera a JSON individual.

O feed é conteúdo externo não confiável. O frontend deve aplicar limites, timeout, parsing seguro, sanitização, allowlist, validação de URLs e providers, DOM seguro, CSP, proteção XSS e iframe sandbox quando aplicável. HTML bruto nunca pode ser confiado ou inserido diretamente. O Core backend permanece genérico e não conhece conteúdo Blogger.

Falha do Blogger não derruba o minisite nem causa write backend. Estrutura ACTS, perfil, contatos, mídias oficiais e informações comerciais continuam disponíveis; a área editorial isola loading, timeout e erro, oferece fallback visual e retry limitado ou manual.

### Downgrade e crescimento desacoplado

O downgrade PREMIUM → STANDARD é reversível. Permanecem conta, card, anúncio, perfil, dados, contatos e mídias oficiais permitidas. São desativados minisite, publicação do subdomínio, integração Blogger no ACTS e direito de novas compras de impulsionamento. Configurações de minisite e Blogger devem ser preserváveis para reativação futura.

O ACTS não apaga, altera, migra ou copia Blogger; não exclui histórico editorial; não executa limpeza R2 do acervo Blogger. Um upgrade futuro pode reativar o minisite sem reconstruir esse patrimônio.

O crescimento editorial deve permanecer desacoplado do crescimento proporcional da infraestrutura ACTS. Vinte ou dois mil posts, cem ou milhares de fotos continuam representando estado backend relativamente pequeno. O modelo busca baixo custo marginal, pouca escrita D1, pouco storage editorial ACTS, poucas limpezas, menos processamento e jobs, liberdade da anunciante e propriedade editorial descentralizada, sem promessa financeira quantitativa.

### Domínio legado e decisões pendentes

Referências imobiliárias são legado técnico do projeto inicial e não definem o produto final AcompanhanteSex. Código, banco e migrations não são apagados nesta etapa; a adequação futura requer decisão própria.

## DECISÕES PENDENTES

Permanecem abertas e bloqueadas para implementação: cardinalidade conta/anúncio/minisite; estrutura exata da JSON individual; conteúdo exato do catálogo municipal; política de manifest individual; comportamento de impulsionamento ativo durante downgrade; inadimplência e tolerância; preço/versionamento dos planos; endpoint, CORS e paginação Blogger; providers de vídeo; canonical/noindex editorial; política de privacidade Google/Blogger; wildcard Cloudflare; limites exatos de mídia oficial; taxonomia final; destino técnico das estruturas imobiliárias; e algoritmo de ranking de impulsionamento.
