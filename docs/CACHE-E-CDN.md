# Cache e CDN

Política futura: assets com nome/versionamento de conteúdo usam `Cache-Control: public, max-age=31536000, immutable`; manifestos e ponteiros usam `public, max-age=60, must-revalidate`; APIs e objetos privados usam `no-store`. Publicação não depende de purge: versões são imutáveis e somente o pequeno ponteiro muda por último.

Listagens transferem miniaturas `{id}-thumb.webp`; originais `{id}.webp` entram apenas na galeria. Vídeos MP4/H.264/AAC até 720p têm capa WebP e `preload=none`. A Rodada 5 deve validar metadados reais do R2/CDN antes de ativar.
