# Mídias

Produto mobile-first (~95% móvel). Fotos e capas: WebP; vídeo: MP4/H.264/AAC, máximo inicial 720p; áudio: M4A/AAC. Limites quantitativos estão pendentes.

Fluxo futuro: navegador converte → Worker autentica/limita/autoriza → navegador envia ao prefixo temporário → Worker valida conteúdo real → promoção → CDN. IDs são monotônicos e permanentes (`001.webp`, `002.webp`); exclusão não renumera e manifesto controla ordem. Rodada 1 não converte, envia ou promove arquivos.

A Rodada 3 implementa recodificação WebP no canvas/OffscreenCanvas com fallback, capacidade/fallback explícito de vídeo e áudio, streaming privado no Worker, validação e manifesto. Parâmetros estão centralizados em `config/midias.json`; limites comerciais pendentes bloqueiam upload.
