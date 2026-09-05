# Operar o SUPERADMIN

Somente `googleSub` presente em `SUPERADMIN_GOOGLE_SUBS` recebe o papel. Gmail, parâmetro de URL ou corpo de requisição não concedem acesso. Para obter o `sub`, conclua um login Google validado em ambiente controlado e consulte a trilha privada — nunca use e-mail como identidade estável.

O painel permite pesquisar por ID/Gmail e a API também por CPF (HMAC, sem CPF em chave), filtrar status, abrir cadastro/documentos privados, decidir, corrigir dados protegidos, alterar plano/vencimento, emitir aviso e consultar auditoria. Pesquisa nominal completa depende da leitura administrativa dos registros privados e deve ser usada com minimização.

Decisão e correção protegida exigem sessão recente e motivo. A visualização como cliente é declaradamente somente leitura, sem impersonação. Reativar não publica. Vencimento não exclui dados. Mensagens são texto simples e limitadas. Toda operação relevante gera evento imutável com horário do servidor.

Antes da produção: conferir lista de administradores por duas pessoas, configurar retenção ainda pendente, testar revogação geral, revisar eventos, confirmar precedência de rotas Cloudflare e validar novamente a documentação oficial Google.
