# Idade e aniversários

Nascimento fica exclusivamente privado. O cálculo existente usa `America/Sao_Paulo`, inclui aniversário/ano bissexto e publica só idade inteira. O controle privado registra idade e próxima atualização; só produz alteração quando a idade muda. Correção que resulte em menor de 18 anos gera suspensão indicada imediatamente.

A rotina localiza o dia pelo índice operacional, prefere nome artístico, usa modelo/versão de `config/mensagens.json` e reserva `clienteId + ano + canal`, impedindo duplicidade. Cria aviso privado, prepara link manual do WhatsApp apenas com consentimento e prepara e-mail sem envio automático. SUPERADMIN consulta registros, mensagem, estado de envio e histórico anual; aniversário não aparece no público.

Planos preservam estados ativo, próximo do vencimento, vencido, suspenso, cortesia e cancelado. Como antecedência/tolerância/suspensão/valores não estão configurados, cria-se pendência administrativa sem ação automática e sem apagar cadastro, documentos, mídias ou auditoria.
