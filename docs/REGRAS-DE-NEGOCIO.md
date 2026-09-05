# Regras de negócio

Segue `ARQUITETURA.md`. A V2 aceita uma cidade por anunciante, mas mantém `cidadePrincipal` e `cidadesAtendimento`. Diretórios são exatamente mulheres, homens e transex; categorias variam por diretório e não são presumidas. A canônica é `/{cidade}/{diretorio}/{categoria}/{slug}`; subdomínio é alias sem duplicação. Troca de diretório mantém cidade; troca de cidade retorna à entrada.

Cadastro enviado permite autoedição apenas de endereço, CEP, telefone e WhatsApp. Dados protegidos exigem SUPERADMIN, justificativa e trilha antes/depois. Publicação exige aprovação, idade calculada >=18 e plano elegível. Nascimento não sai da fronteira privada.

Aniversário gera no máximo um aviso privado por cliente/ano/modelo; comunicação externa depende de consentimento. IDs de mídia não são reutilizados nem renumerados. Limites comerciais e categorias permanecem pendentes.

Estados de cadastro implementados: `cadastro_incompleto`, `aguardando_analise`, `correcao_solicitada`, `aprovado`, `reprovado`, `suspenso`, `bloqueado` e `encerrado`. Aprovação e reativação nunca publicam na Rodada 2. Plano é exclusivamente manual e admite `aguardando_ativacao`, `ativo`, `proximo_do_vencimento`, `vencido`, `suspenso`, `cancelado` e `cortesia`.
