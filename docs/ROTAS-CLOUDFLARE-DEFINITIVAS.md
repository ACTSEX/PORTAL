# Rotas Cloudflare definitivas

## Estado e impedimento

Observado: `acompanhantesex.com/api/*` e `*.acompanhantesex.com/*` associados ao Worker `portal`, além da indicação de apex como domínio de produção. Desejado: API no Worker; minisites wildcard no Worker mínimo; `public.acompanhantesex.com` como custom domain público do bucket `acts-public`; conteúdo canônico do apex estático.

Uma rota Worker cacheada continua invocando o Worker. R2 custom domain funciona em um **hostname**, não monta diretamente subpastas do apex. Portanto, “zero Worker” em subpastas canônicas do mesmo apex não é possível mantendo o apex inteiro como Custom Domain do Worker e sem uma origem/CDN que faça o roteamento. A menor alteração suportável é: (a) servir o apex por Pages/origem estática que consuma/espelhe R2 e manter somente `/api/*` como Worker Route; ou (b) redirecionar caminhos canônicos para `public.acompanhantesex.com`, aceitando mudança de URL. A opção (a) preserva URLs, mas precisa ser comprovada em homologação.

## Plano e precedência

1. Criar e validar `public.acompanhantesex.com` como custom domain do bucket `acts-public`, DNS proxied/gerenciado e certificado Universal SSL ativo.
2. Criar rota de exclusão `public.acompanhantesex.com/*` com `script: null` **antes** de confiar no wildcard. Rotas mais específicas vencem padrões menos específicos; conferir o resultado retornado pela API.
3. Preparar origem estática para o apex, sem promover ainda. Ela deve buscar somente objetos públicos e aplicar cache imutável a assets versionados; ponteiros/manifestos usam revalidação curta.
4. Manter `acompanhantesex.com/api/* → portal` e validar que a origem do apex não intercepta `/api/`.
5. Manter wildcard para minisites, excluindo explicitamente `public`. Wildcard DNS proxied e SSL cobrindo subdomínios são necessários.
6. Remover o Custom Domain do Worker no apex somente após a origem estática responder e a rota API ser comprovada. Esta decisão não é automatizada pelo workflow.

DNS esperado: apex proxied para origem estática, wildcard proxied compatível com Worker Routes, e hostname R2 criado pelo painel de Custom Domains do bucket (não CNAME improvisado). Certificados devem estar `Active`; HSTS só após confirmar todos os hostnames. Nunca cachear API privada, sessão ou painel.

## Workflow/API

`reconciliar-rotas.yml` faz GET em `/zones/{zone_id}/workers/routes`, produz inventário e plano, não escreve em `check/plan`, e somente POSTa adições após branch `main`, environment `production`, token e frase `APLICAR-ROTAS-V2-ACOMPANHANTESEX`. Não exclui rotas, DNS ou Custom Domains. Revise IDs e diff antes do apply. Pelo painel: Workers & Pages → portal → Settings → Domains & Routes; R2 → acts-public → Settings → Custom Domains; DNS → Records; SSL/TLS → Edge Certificates.

## Validação e critérios de aceite

- `curl -I https://acompanhantesex.com/api/health`: resposta V2 e headers de segurança.
- `curl -I https://public.acompanhantesex.com/app/manifesto.json`: R2/CDN, sem header de diagnóstico exclusivo do Worker; confirme também Tail/observabilidade sem evento do script.
- Apex canônico entrega estático sem evento em Workers Logs/Tail. `CF-Cache-Status` **não prova** ausência de Worker.
- Subdomínio de teste chega ao minisite correto; `public` nunca chega ao Worker.
- API privada não é cacheada; assets versionados têm cache longo; ponteiros permitem rollback.

## Rollback

Guardar export de rotas/DNS antes da mudança. Reassociar o Custom Domain anterior ou origem anterior do apex, restaurar as rotas por ID, reduzir TTL previamente, restaurar ponteiro público versionado e confirmar API/minisite. Não excluir bucket/objetos. O apply fica bloqueado até que a opção de origem do apex seja decidida e testada na conta.
