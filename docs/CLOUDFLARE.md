ACTS Portal

CLOUDFLARE

Versão: 1.0Status: Oficial

Objetivo

Este documento define como os serviços da Cloudflare serão utilizados pelo Portal ACTS.

A infraestrutura faz parte da arquitetura e não deve ser alterada sem revisão da documentação.

Serviços Utilizados

Serviço

Finalidade

Cloudflare Pages

Hospedagem do frontend

Pages Functions

Endpoints dinâmicos

D1

Banco de dados oficial

KV

Cache e artefatos publicados

R2

Arquivos permanentes

Queues

Processamento assíncrono

Cache

Distribuição global

Cron Triggers

Execução agendada

Regras Gerais

D1 é a única fonte de verdade.

KV armazena apenas conteúdo derivado.

R2 armazena arquivos permanentes.

Navegação pública deve evitar consultas ao D1.

Escritas sempre começam no D1.

Fluxo de Escrita

Requisição→ Function→ Módulo→ D1→ Evento→ Queue→ Publicação→ KV / R2→ Cache

Fluxo de Leitura

Visitante→ Cloudflare Cache→ HTML / JSON publicado→ KV / R2→ Resposta

Publicação

A publicação deve ser incremental.

Alterações regeneram apenas os artefatos afetados.

Exemplos:

página do anúncio;

JSON da cidade;

sitemap;

índices.

D1

Responsável por:

usuários;

anúncios;

pagamentos;

planos;

configurações;

autenticação.

Nunca utilizar KV como banco de dados.

KV

Responsável por:

JSON públicos;

manifestos;

cache;

índices;

páginas derivadas.

R2

Responsável por:

imagens;

vídeos;

documentos;

uploads;

backups.

Queues

Utilizadas para:

publicação;

geração de sitemap;

processamento de imagens;

notificações;

tarefas demoradas.

Cron

Executa:

manutenção;

publicação programada;

limpeza;

sincronizações;

verificações.

Segurança

Secrets apenas no ambiente Cloudflare.

Nunca versionar credenciais.

Validar webhooks.

Aplicar autenticação e autorização.

Deploy

Fluxo oficial:

Commit→ GitHub→ Cloudflare Pages→ Build→ Deploy→ Publicação→ Cache

Objetivo Final

A infraestrutura deve entregar:

baixa latência;

baixo custo operacional;

alta disponibilidade;

escalabilidade;

navegação pública predominantemente estática.

Este documento é a referência oficial para a infraestrutura Cloudflare do Portal ACTS.
