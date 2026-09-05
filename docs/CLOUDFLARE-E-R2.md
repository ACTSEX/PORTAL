# Cloudflare e R2

A árvore normativa e o procedimento de reconciliação estão em [ARQUITETURA-STORAGE-V2.md](ARQUITETURA-STORAGE-V2.md). `app/` e `dados/` são os únicos prefixos públicos globais; todo objeto individual usa `clientes/{clienteId}/`.
