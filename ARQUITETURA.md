# Arquitetura normativa da V2

> **Autoridade principal.** Este arquivo prevalece sobre toda documentação especializada.

## 1. Escopo e invariantes

A solução é um **monólito modular** com um Worker privado `portal`, um painel responsivo, um template público, os diretórios exatos `mulheres`, `homens`, `transex`, os temas respectivos `pink`, `royal`, `lilás` e os buckets `acts-private` e `acts-public`. A Rodada 1 é deliberadamente não operacional.

O Worker usa exclusivamente `env.acts_private` e `env.acts_public`. KV e D1 não participam da leitura pública. Segredos nunca pertencem ao Git.

## 2. Fronteira pública/privada

Visitantes recebem arquivos estáticos por CDN/R2: HTML, CSS, JavaScript, JSON, WebP e MP4. Não há consulta a banco, geração dinâmica ou leitura privada por visita. O Worker privado concentrará autenticação, cadastro, painel, SUPERADMIN, validação, autorização de upload, publicação, cron, financeiro e auditoria.

O acesso canônico por subpasta deve ser estático. O wildcard de subdomínio pode executar roteamento no Worker; cache de resposta, sozinho, **não prova ausência de execução do Worker**.

## 3. Navegação e isolamento

Hierarquia imutável: `CIDADE → DIRETÓRIO → CATEGORIA → ANÚNCIO`.

Rotas planejadas: `/`, `/{cidade}/{diretorio}`, `/{cidade}/{diretorio}/{categoria}` e `/{cidade}/{diretorio}/{categoria}/{slug}`. Exemplo: `/londrina/mulheres/categoria/nome-artistico`. O minisite completo ocupa a subpasta, que é canônica; `{slug}.acompanhantesex.com` é apenas endereço alternativo para o mesmo perfil e mídias.

Cards abrem a canônica na mesma aba. Estado de retorno preservará filtros, shard/página e rolagem. O portal escolhe cidade + diretório; dentro da cidade troca-se somente o diretório, e para trocar a cidade retorna-se ao portal.

Cada combinação possui índices independentes `cidade/diretório/todos` e `cidade/diretório/categorias/{categoria}`. Uma página jamais baixa feeds de outro diretório; não existe feed global. Categorias são independentes e permanecem vazias até comprovação da V1 ou fornecimento posterior.

## 4. Modelo sem duplicação

Nesta versão, `cidadePrincipal` e `cidadesAtendimento` existem desde o início, com limite de uma cidade. Perfil e mídias são armazenados uma única vez por `clienteId`; índices por cidade apenas os referenciam, permitindo expansão futura sem duplicação.

## 5. Privacidade, idade e controle

Identidade, CPF, nascimento, nacionalidade, sexo cadastral, Gmail, `googleSub`, contatos pessoais, endereço, rosto real, documentos, termos, rascunhos, plano, vencimento, avisos, aprovação, auditoria, financeiro operacional e temporários ficam em `acts-private`.

Após envio, a anunciante só altera endereço, CEP, telefone e WhatsApp pessoais. Nome civil, CPF, nascimento, nacionalidade, sexo/diretório, Google vinculado, documentos, identificação e demais protegidos exigem SUPERADMIN e auditoria com antes, depois, responsável, justificativa e instante.

Nascimento nunca é público. A autoridade privada calcula idade por dia/mês/ano, impede publicação abaixo de 18, publica apenas idade e a atualiza no aniversário. O processo diário cria aviso privado anual idempotente, usa modelo aprovado, lista aniversariantes ao SUPERADMIN e pode preparar WhatsApp; comunicação externa exige consentimento. E-mail é futuro.

## 6. Publicação consistente

Publicação futura será incremental: cliente, cidade, diretório e categorias afetadas apenas; mídias antes dos JSON que as referenciam; manifesto/ponteiro por último; comparação de conteúdo evita gravação idêntica. Operações precisam ser idempotentes, recuperáveis e impedir estado parcial.

## 7. Mídia

Mobile-first (aproximadamente 95% móvel): fotos/capas WebP, vídeos MP4 H.264/AAC até 720p inicialmente e áudio M4A/AAC. Fluxo futuro: conversão no navegador; autenticação, limites e autorização no Worker; upload temporário; validação; promoção; CDN. IDs (`001.webp`) são permanentes e nunca renumerados; o manifesto ordena.

## 8. Operação, cron e integrações

Cron futuro recuperará pendências, processará idade/aniversários e vencimentos diariamente, reconciliará rede, fará auditoria completa semanal, em lotes com checkpoint e idempotência, além de gatilho manual no SUPERADMIN.

Asaas nasce estritamente desativado (`habilitado=false`, `ambiente=desativado`, `cobrancaAutomatica=false`). Rodadas futuras preveem sandbox, cliente, cobrança, assinatura, Pix, boleto, link, webhook, idempotência, conciliação, histórico e controle manual; produção exige ativação explícita.

## 9. Cloudflare preservada

Bindings existentes: `acts_private → acts-private` e `acts_public → acts-public`. Rotas, DNS e domínios são administrados separadamente e não estão no Wrangler. As rotas observadas são `acompanhantesex.com/api/*`, `*.acompanhantesex.com/*` e o domínio de produção `acompanhantesex.com`. `public.acompanhantesex.com` pode coincidir com o wildcard; exclusão e precedência precisam ser validadas antes da produção V2.

Nenhum objeto R2, binding remoto, rota ou domínio é criado/alterado nesta rodada.
