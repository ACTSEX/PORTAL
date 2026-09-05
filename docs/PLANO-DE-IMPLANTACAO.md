# Plano de implantação

1. **Rodada 1 — arquitetura, contratos e fundação**: documentação, schemas, configuração, shells, Worker health, testes/build; sem operação externa.
2. **Rodada 2 — Google, cadastro privado e painéis (implementada)**: OIDC, sessão, aprovação/vínculo e SUPERADMIN, com auditoria; ativação real depende de secrets e revisão operacional.
3. **Rodada 3 — formulário público e mídias**: renderização por contrato, autorização, conversão/validação e temporários.
4. **Rodada 4 — portal, anúncios, minisites, publicação, índices e cron**: entrega estática isolada e pipeline incremental.
5. **Rodada 5 — Asaas desativado, testes, migração e implantação**: adaptador ainda off, ensaio, aceite e ativação controlada posterior.

Cada rodada exige revisão de ameaça, testes, build, PR sem merge automático e aceite antes da seguinte.

Estado após a Rodada 3: rascunho e pipeline privado implementados; publicação, CORS real, promoção para `acts-public`, portal definitivo, índices e cron continuam bloqueados para a Rodada 4.
