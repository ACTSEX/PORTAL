# ACTS — Arquitetura oficial do feed Blogger

**Versão:** 3.0
**Status:** decisão arquitetural vigente em 2026-08-10
**Escopo:** seção editorial dos minisites PREMIUM em `{slug}.acompanhantesex.com`
**Natureza:** exclusivamente documental; não autoriza implementação.

## 1. Papel e propriedade

O Blogger é origem editorial externa, não uma superfície ACTS. O blog, a Conta Google, os posts, as fotos, os vídeos e todo o histórico editorial pertencem à anunciante e permanecem sob responsabilidade e controle dela e da infraestrutura de origem. O ACTS não é proprietário, CMS, repositório, espelho ou backup desse acervo.

**Premium habilita a vitrine; não hospeda o patrimônio editorial.** A integração existe somente no minisite PREMIUM. O portal central e o anúncio não consomem nem reproduzem o feed.

## 2. Fronteira client-side obrigatória

Este é o único fluxo permitido:

```text
Blogger
→ feed público
→ navegador do visitante
→ parser client-side
→ sanitização
→ normalização
→ modelo interno de apresentação
→ renderização no minisite
```

O navegador recebe primeiro HTML/CSS/JS e a JSON individual ACTS. Depois consulta diretamente a origem Blogger. O Core backend não conhece o conteúdo do feed.

É proibido substituir silenciosamente esse fluxo por proxy, sincronização ou ingestão backend. Se uma prova técnica futura demonstrar inviabilidade do consumo direto no navegador, a implementação deve parar e aguardar nova decisão arquitetural aprovada. Endpoint, CORS e paginação são decisões pendentes, não pressupostos resolvidos.

## 3. Proibições de persistência e processamento

O feed e seus derivados:

- não passam pelo backend ACTS;
- não são persistidos no D1, R2 ou KV;
- não geram JSON ou HTML derivado persistido pelo ACTS;
- não são importados por Queue, copiados por Cron ou sincronizados por Worker;
- não criam banco ACTS de posts;
- não criam storage ACTS de mídia editorial;
- não criam `blogger_feed_cache`, `blogger_posts` ou cache editorial persistente equivalente.

R2 armazena exclusivamente responsabilidades ACTS, como mídias oficiais, JSON públicas, manifests, artefatos versionados e assets autorizados. Não é espelho Blogger nem cache editorial. D1 pode manter somente configuração necessária à integração — identificador, URL, habilitação, opções e configuração de seções — nunca posts, HTML, mídia, histórico ou cache do feed. KV permanece técnico/privado.

Queue continua destinada à publicação e ao processamento assíncrono interno legítimo do ACTS; nunca importa, baixa ou copia feed, posts, fotos ou vídeos Blogger. Cron continua permitido para reconciliação, expiração comercial, manutenção, pagamentos e operações ACTS; nunca consulta Blogger periodicamente, sincroniza feed, gera seus artefatos ou copia mídia editorial.

## 4. Atividade editorial não é estado ACTS

Alterações editoriais no Blogger não são eventos do domínio ACTS:

| Atividade na origem | D1 | Publicação ACTS | Queue ACTS | R2 ACTS |
| --- | --- | --- | --- | --- |
| novo post | zero write | zero | zero | zero |
| nova foto | zero write | zero | zero | zero |
| novo vídeo | zero write | zero | zero | zero |

A JSON individual é regenerada somente por mudança relevante no estado ACTS. Uma alteração exclusiva no Blogger não a regenera.

## 5. Segurança obrigatória

O feed Blogger é conteúdo externo não confiável. O frontend deve obrigatoriamente aplicar:

- limites de conteúdo e timeout;
- parsing seguro e sanitização;
- allowlist de elementos e atributos;
- validação de URLs e providers;
- construção de DOM segura;
- CSP e proteção XSS;
- `iframe sandbox` quando aplicável.

HTML bruto nunca pode ser confiado nem inserido diretamente. Providers de vídeo e limites exatos permanecem pendentes; nenhuma integração pode ampliar a allowlist por conveniência.

## 6. Falha isolada

Falha Blogger não derruba o minisite e não produz write backend. Estrutura ACTS, perfil, contatos, mídias oficiais e informações comerciais continuam disponíveis. A seção editorial deve ter loading, timeout, erro isolado, fallback visual e retry limitado ou manual.

## 7. Plano e downgrade

Somente PREMIUM habilita integração Blogger no minisite. STANDARD não a inclui. No downgrade PREMIUM → STANDARD, a integração e a publicação do minisite são desativadas, mas sua configuração deve ser preservável para futura reativação.

O ACTS não apaga, altera, migra ou copia o Blogger, não exclui o histórico da anunciante e não executa limpeza R2 relacionada ao acervo. A reativação futura não exige reconstruir patrimônio editorial no ACTS.

## 8. Princípio operacional e econômico

O volume editorial não deve aumentar proporcionalmente D1, R2, KV, publicação, Queue, Cron ou jobs ACTS. Uma anunciante com 20 ou 2.000 posts, cem ou milhares de fotos continua com estado ACTS relativamente pequeno. Busca-se baixo custo marginal, pouca escrita e limpeza, menos processamento e propriedade editorial descentralizada, sem promessa financeira quantitativa.

## DECISÕES PENDENTES

A lista normativa única está em `CONTRACTS.md`. O gate 13F.4 deve comprovar em
navegador real endpoint, CORS, blogs reais, conteúdo adulto, paginação, labels,
imagens, vídeos/providers, CSP e timeout. Deve ainda validar parsing,
sanitização, normalização, allowlists, URLs, iframe sandbox, loading, erro,
fallback e retry limitado/manual. Falha significa **PARAR → NOVA DECISÃO
ARQUITETURAL**, nunca criar proxy backend automaticamente.
