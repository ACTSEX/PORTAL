# Uploads e mídias

## Fluxo

1. O navegador recodifica foto/capa em WebP, mede e calcula SHA-256; vídeo/áudio compatível também recebe hash.
2. O Worker autentica sessão, CSRF/Origin, proprietário, tipo, tamanho e limite do plano; cria reserva de dez minutos e nome/chave do servidor.
3. O navegador faz `PUT` no endpoint autenticado de streaming do Worker.
4. O Worker confere tamanho e magic bytes (`RIFF…WEBP` ou ISO BMFF `ftyp`) antes de gravar em `acts_private/clientes/{id}/uploads-temporarios/{uploadId}/`.
5. A finalização relê bytes, confere hash e limite e cria manifesto autoritativo em `rascunho/midias.json`; é idempotente.

Foi escolhido fallback funcional por streaming privado no Worker: Workers/R2 bindings não oferecem uma URL pré-assinada sem implementar AWS SigV4 e credenciais adicionais. Nenhuma credencial permanente chega ao browser. Uma integração futura opcional poderá usar `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`, exclusivamente como secrets.

IDs são monotônicos, não reutilizados; ordem e principal vivem somente no manifesto. Exclusão remove a referência e cria órfão recuperável por sete dias, sem apagar em operação parcial. Limpeza fica para cron futuro. O Worker nunca transcodifica vídeo. Sem muxer MP4, WebCodecs não é considerado suficiente; o fallback exige MP4/H.264/AAC até 720p/24 ou 30 fps. Áudio exige M4A/AAC.
