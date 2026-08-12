ACTS Portal

CONTRACTS

Versão: 1.0Status: OficialEscopo: app/contracts/

1. Objetivo

Este documento define os contratos públicos da plataforma ACTS.

Contratos estabelecem como módulos, plugins e o Core podem se comunicar semdependências diretas.

Um contrato é um compromisso de comportamento, não uma implementação.

2. Princípios

Contratos são públicos.

Devem ser estáveis.

Devem ser versionados.

Não podem depender de detalhes internos.

Alterações incompatíveis exigem nova versão.

3. Tipos de contratos

Contratos de Serviço

Definem operações públicas.

Exemplos:

AuthService

ListingsService

PaymentsService

Contratos de Evento

Definem payloads dos eventos publicados.

Referência: EVENTS.md

Contratos HTTP

Definem entradas e saídas de endpoints.

Contratos de Dados

Definem estruturas compartilhadas entre módulos.

Referência: SCHEMAS.md

4. Estrutura prevista

app/contracts/
├── services/
├── events/
├── http/
└── data/

Os diretórios devem ser criados somente quando houver implementação real.

5. Regras

Um contrato não contém regra de negócio.

Um contrato não acessa banco.

Um contrato não depende de outro contrato interno sem necessidade.

Implementações podem evoluir sem quebrar o contrato.

6. Versionamento

Adotar SemVer.

Mudanças incompatíveis:

nova versão MAJOR;

atualização do CHANGELOG;

documentação de migração.

7. Compatibilidade

Módulos devem depender do contrato, nunca da implementação.

Fluxo:

Módulo
   ↓
Contrato
   ↓
Implementação

8. Critérios de aceitação

Um contrato é considerado válido quando:

possui responsabilidade única;

é compreensível;

é independente da implementação;

possui documentação;

possui versionamento;

é testável.

9. Checklist

responsabilidade única

interface pública clara

documentação atualizada

sem regra de negócio

sem dependência circular

compatível com versões suportadas

10. Regra final

Nenhum módulo deve acessar detalhes internos de outro módulo.

Toda comunicação compartilhada deve ocorrer por contratos públicos,eventos documentados ou APIs oficialmente expostas.

## 11. Contratos de domínio futuros do MVP ACTS (Etapa 5/7)

Esta seção fecha sem implementar os limites que 13E, 13F, 13G e 13D deverão respeitar.

### 11.1 Conta e cardinalidade

Uma conta anunciante possui exatamente um perfil comercial e um anúncio principal; pode preservar no máximo uma configuração de minisite. STANDARD não tem minisite efetivamente disponível. PREMIUM pode ativar esse único minisite. Unicidade deve ser garantida no futuro no banco e no domínio, não apenas na UI.

### 11.2 Plano, cobrança e assinatura

- `Plan = STANDARD | PREMIUM`; FREE é inválido.
- condição comercial é política auditável de cobrança (`NORMAL`, `TRIAL`, `CORTESIA`, `PROMOCAO`, `GRATUIDADE_TEMPORARIA`), nunca plano;
- assinatura liga conta ao plano e registra ciclo/estado e condição aplicável;
- entitlement é avaliação no momento do uso: plano, assinatura, condição e regra administrativa;
- `canUseMinisite`, `canExposeBlogger`, `canPurchaseBoost` e `canPublishListing` são saídas lógicas, não flags independentes como fonte da verdade;
- PREMIUM habilita compra de boost, mas boost continua produto pago separado.

### 11.3 Perfil e anúncio

O perfil mantém fronteiras explícitas: privado (incluindo data de nascimento e contatos não consentidos), público allowlisted (nome artístico, apresentação, contatos/dados físicos/comerciais aprovados) e administrativo (moderação/auditoria). Idade pública, se a política permitir, é sempre calculada; a data de nascimento nunca é publicada.

O anúncio principal é a representação comercial única e preserva owner, categoria, `city_id`, slug, status, datas, mídia ACTS, publicação e moderação. O contrato futuro rejeita semântica imobiliária sale/rent, preço/endereço/profissional. `city_id NOT NULL` é compatível e obrigatório para publicação futura, sem executar 13C nesta etapa.

### 11.4 Minisite e Blogger

`MinisiteConfig` guarda desejo (slug, ativação, tema mínimo, moderação), enquanto `canUseMinisite` decide disponibilidade efetiva em `{slug}.acompanhantesex.com`. `BloggerConfig` guarda somente referência canônica, desejo, labels/seções, versão e validação técnica mínima. STANDARD pode preservar ambos privadamente, mas não os expõe; PREMIUM elegível pode expor Blogger client-side no minisite.

Posts, HTML, fotos/vídeos, cache, derivados e histórico editorial nunca pertencem aos contratos D1/R2/KV. Não existem sync/import, backend Blogger ou evento editorial. A falha Blogger não altera anúncio, contatos ou mídia oficial.

### 11.5 Boost e financeiro

Produto, order e campanha são contratos distintos. Compra captura preço/moeda imutáveis e referência ao payment; campanha só ativa após revalidar PREMIUM e alvo. Pagamentos suportam cobrança recorrente de assinatura e avulsa de order, preservando idempotência e ordering Asaas. Boost afeta catálogo/ranking quando ativo; não integra o plano.

### 11.6 Transições

Downgrade preserva identidades, perfil, anúncio, mídia, configs e finanças; revoga minisite, subdomínio, Blogger exposto e nova compra de boost e solicita projeção/invalidação imediata. Upgrade reutiliza configurações, sujeito a validação, moderação e colisão. O tratamento de campanha já paga no downgrade permanece bloqueante para 13G.

### 11.7 Eventos e garantias

Eventos aceitos: `ProfileUpdated`, `ListingUpdated`, `ListingPublished`, `PlanChanged`, `CommercialConditionChanged`, `MinisiteEligibilityChanged`, `BloggerConfigChanged`, `BoostActivated`, `BoostExpired`. O evento é emitido após commit e deve permitir retry idempotente. Não transporta PII desnecessária nem conteúdo editorial Blogger.

Publicação nunca aponta a objeto inexistente; troca de cidade converge sem duplicidade permanente; falha parcial mantém último estado integral confirmado; downgrade não deixa minisite elegível indefinidamente.

### 11.8 Decisões fechadas e abertas

Fechadas: um anúncio principal e no máximo um minisite por conta; STANDARD não expõe Blogger; PREMIUM elegível o habilita; config Blogger sobrevive ao downgrade; catálogo renderiza card sozinho; JSON individual é sob demanda; Blogger nunca dispara publicação; boost pode alterar catálogo/ranking; D1 é fonte da verdade ACTS.

Este é o cadastro único de decisões pendentes. Documentos especializados devem
referenciá-lo, sem criar respostas ou listas concorrentes:

| Decisão ainda aberta | Lote que deve fechá-la |
| --- | --- |
| desenho físico das novas tabelas e migrations forward-only | 13E (domínio) e 13G (boost/pagamento) |
| path exato no R2, formato/pointer do manifest individual e campos finais das projeções | 13F, ratificação em 13D |
| destino físico do legado imobiliário e taxonomia comercial final | 13E |
| boost já pago/ativo durante downgrade; produto, preço, período e ranking | 13G |
| inadimplência, tolerância, reativação e preço/versionamento dos planos | 13E |
| wildcard, resolução de slug e operação de subdomínio | 13F |
| endpoint Blogger, CORS, paginação, labels, limites e providers de vídeo | gate 13F.4 |
| privacidade Google/Blogger, cookies, conteúdo externo e contatos/PII | 13F, com validação jurídica antes de produção |
| canonical, indexação Blogger/minisite, duplicidade, sitemap, robots, noindex e SEO client-side | 13D, após 13E–13G |
| TTL e invalidação exatos para downgrade, suspensão e moderação | 13F/13D, validação no 18 |
| política pública exata de idade derivada | 13E, com validação jurídica antes de produção |
| limites exatos de mídia ACTS | 13E/13F |

Uma falha no gate Blogger significa **PARAR → NOVA DECISÃO ARQUITETURAL**;
jamais autoriza automaticamente proxy, importação ou sincronização backend.
