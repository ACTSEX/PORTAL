# ACTS — regras de negócio

## Estado do produto

Este documento registra regras atuais, inclusive regras-alvo ainda não totalmente implementadas. Onde o banco ou módulos existentes usam domínio imobiliário, trata-se de legado em migração e não de regra ACTS.

## Conta, anunciante e acesso

- Uma conta anunciante possui exatamente um perfil comercial e um anúncio principal.
- Pode preservar no máximo uma configuração de minisite; somente PREMIUM pode ativá-la.
- Identidade/autenticação, perfil público e autorização são responsabilidades distintas.
- Ações protegidas verificam sessão, papel/permissão, propriedade do recurso, estado da assinatura e entitlement no momento do uso.
- Exclusão, suspensão e moderação não podem apagar silenciosamente histórico financeiro ou auditoria necessária.
- Data de nascimento, quando necessária, permanece privada; idade pública é derivada conforme política aprovada, nunca publicada como data de nascimento.

## Anúncio, perfil e publicação

- O anúncio é a representação comercial da anunciante dentro do portal; perfil concentra dados da anunciante e o anúncio concentra oferta, categoria, cidade, mídia e estado editorial/comercial.
- Slug e identificador público devem ser únicos, estáveis e resolvidos sem expor ID interno sensível.
- Somente estado público/moderado entra em catálogo, projeção individual, busca, sitemap ou minisite.
- Rascunho, pendente, suspenso, arquivado ou removido não é servido normalmente; transições preservam auditoria e retiram pointers/índices quando aplicável.
- Alterar campo privado não publica. Alterar card atualiza projeção individual e catálogo. Alterar apenas detalhe individual não recompila o catálogo. Trocar cidade atualiza a cidade anterior e a nova.
- Projeções usam allowlist e nunca incluem e-mail privado, nascimento, finanças, assinatura, tokens, moderação, auditoria ou linha D1 integral.
- Mídia oficial ACTS é validada, associada ao proprietário e armazenada em `ACTS_MEDIA`; limites exatos de quantidade/formato só valem depois de implementados e configurados.

## Cidades, localizações e categorias

- Cidade é entidade canônica, não texto livre duplicado. O anúncio referencia uma cidade válida.
- Normalização e slug de cidade devem ser determinísticos; unicidade é garantida no banco e no domínio.
- O catálogo municipal é um índice público leve para cards, filtros, ordenação, categoria e localização da projeção individual; não duplica perfil completo ou minisite.
- Categoria pertence à taxonomia ACTS. Categorias e localizações inativas deixam de aceitar novas associações e são removidas da descoberta pública sem destruir histórico.
- Coordenada precisa e endereço privado não são publicados sem necessidade e autorização explícitas.

## Planos, assinatura e condição comercial

Existem somente os planos estruturais abaixo:

| Plano | Direitos principais |
|---|---|
| STANDARD | conta, card, anúncio, perfil, contatos e mídias oficiais permitidas |
| PREMIUM | tudo do STANDARD, minisite, subdomínio, integração Blogger no minisite e direito de comprar boosts |

- Não existe plano FREE.
- Trial, cortesia, promoção e gratuidade temporária são condições comerciais auditáveis associadas a STANDARD ou PREMIUM, nunca um terceiro plano.
- Assinatura liga conta e plano, com ciclo, estado e condição comercial. Entitlement é derivado no momento do uso; não é uma cópia permanente de flags desconectadas.
- Downgrade PREMIUM → STANDARD é reversível: preserva conta, perfil, anúncio, contatos e mídia permitida; desativa minisite, subdomínio, Blogger no ACTS e novas compras de boost. Configurações do minisite/Blogger permanecem preserváveis para reativação.
- Preço, tolerância de inadimplência e tratamento de boost já ativo no downgrade permanecem **planejados**; não inventar comportamento até decisão e implementação.

## Pagamentos

- Asaas é o gateway financeiro atual. Payload externo é validado e traduzido por adapter; nunca vira estado interno automaticamente.
- Pagamento registra finalidade, valor/moeda, estado, referência externa mínima e timestamps/auditoria necessários.
- Webhooks exigem autenticidade, idempotência e validação de transição. Duplicata não duplica cobrança, entitlement ou evento.
- Transições financeiras ocorrem no módulo responsável e somente após persistência em D1 emitem fatos internos mínimos.
- Token, documento, resposta integral do provedor e dados sensíveis não entram em evento, projeção pública ou log.
- Assinatura recorrente e compra avulsa de boost são finalidades distintas, ainda que compartilhem pagamentos e gateway.

## Boosts/destaques

- Boost é produto comercial separado: **PREMIUM não inclui boost**; apenas habilita novas compras.
- STANDARD não compra novo boost.
- Cada boost deve ter alvo, produto, período, estado, cobrança e expiração explícitos; ativação depende de pagamento confirmado e elegibilidade.
- Expiração remove o efeito de ordenação/destaque sem despublicar o anúncio.
- Preço, duração, ranking e comportamento de campanha ativa após downgrade estão planejados e bloqueados até decisão específica.

## Minisites e Blogger

- Minisite é vitrine ACTS virtual e compartilhada em `{slug}.acompanhantesex.com`, exclusiva do PREMIUM. Não existe aplicação, pasta ou assets por anunciante.
- O minisite usa a projeção pública ACTS. STANDARD não publica minisite/subdomínio nem configuração Blogger.
- Blogger e Conta Google pertencem à anunciante. Posts, fotos, vídeos e histórico permanecem no provedor; ACTS não é CMS, proprietário, backup ou repositório desse acervo.
- Integração Blogger é planejada como `feed público → navegador → parsing/sanitização/normalização → DOM seguro`. Não há proxy, import, sync, D1, R2, Queue, Cron ou evento editorial no backend.
- Alterar post Blogger causa zero escrita/publicação ACTS. Falha do feed isola a seção editorial; perfil, contatos e mídia ACTS continuam disponíveis com fallback e retry limitado/manual.
- Se consumo client-side seguro for inviável, a entrega deve parar para nova decisão; não migrar silenciosamente ao backend.

## Regras pendentes

Não são recursos atuais até contrato e testes: taxonomia final, limites exatos de mídia, preços e ciclos, inadimplência, ranking de boost, wildcard operacional completo, políticas SEO/canonical/noindex, campos/URLs/TTLs finais das projeções e política jurídica/privacidade/idade para Blogger e conteúdo público.
