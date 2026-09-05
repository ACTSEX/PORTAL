# Rodada 3 — formulário público e mídias privadas

## Funcional

O painel renderiza onze etapas pelo contrato versionado, salva perfil/site por etapa com revisão otimista, separa consentimento de contato público e oferece prévia autenticada conforme o tema do diretório. A API oferece reserva, streaming privado, finalização, cancelamento, manifesto, ordem, principal, exclusão recuperável e moderação SUPERADMIN.

Fotos são recodificadas no navegador para WebP em duas dimensões, removendo metadados por reconstrução do canvas. Vídeos não usam FFmpeg nem alegam muxing via WebCodecs: navegadores sem pipeline completo aceitam somente MP4 H.264/AAC já compatível. Áudio aceita M4A/AAC e informa capacidade de gravação.

## Fronteiras

Tudo permanece em `acts-private`. A flag de publicação está desativada e `acts-public` não recebe escrita. Categorias e limites comerciais continuam pendentes; ambos fecham o fluxo em vez de liberar valores inventados. Asaas continua desativado. Não houve deploy.

A Rodada 4 deve implementar projeção estática, promoção idempotente, índices/shards, portal/minisites públicos e cron, ativando publicação somente após aceite explícito.
