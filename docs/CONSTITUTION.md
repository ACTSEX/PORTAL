ACTS Portal

CONSTITUTION

Versão: 1.0Status: Oficial

Constituição da Arquitetura

Este documento define as regras permanentes da arquitetura do Portal ACTS.Em caso de conflito entre documentos, esta Constituição prevalece.

1. Fonte de verdade

O D1 é a única fonte de verdade para dados da aplicação.

O KV armazena apenas cache e artefatos publicados.

O R2 armazena apenas arquivos.

2. Arquitetura Edge

Cloudflare Pages é a plataforma principal.

Pages Functions apenas orquestram.

O Core fornece exclusivamente infraestrutura técnica genérica.

Regras de negócio permanecem exclusivamente nos módulos.

3. Organização

Cada arquivo possui uma responsabilidade principal.

Nenhum módulo acessa arquivos internos de outro módulo.

Comunicação entre módulos ocorre por Interfaces, Contracts e Event Bus.

4. Publicação

Fluxo oficial:

D1 → Event Bus → Queue → Publisher → Renderer → KV/R2 → Cache

A navegação pública não deve depender de consultas ao D1.

5. Qualidade

Arquivos devem permanecer pequenos e coesos.

Funções devem ser simples.

Código deve ser testável e documentado.

6. Segurança

Todo acesso passa por Auth e Security.

Segredos nunca são registrados em logs.

Erros nunca expõem detalhes internos.

7. Governança

Toda alteração arquitetural relevante deve atualizar:

ADR correspondente;

documentação;

testes, quando aplicável.

8. Precedência documental

Em caso de conflito, deve ser observada a seguinte ordem:

esta Constituição;

decisão explícita mais recente, formalmente aprovada e registrada;

ARCHITECTURE.md;

ADR específico aprovado;

documentação especializada aplicável;

TREE.md;

ROADMAP.md;

contratos e schemas;

implementação existente.

TREE.md define onde um arquivo pode existir.

ROADMAP.md define quando um lote funcional pode ser implementado e quais arquivos pertencem a ele.

Listas de referência de documentos especializados não autorizam arquivos: `TREE.md` controla caminhos e `ROADMAP.md` controla a ordem dos lotes.

O lote funcional é a unidade oficial de implantação, testes, commit, revisão, Pull Request, aprovação e avanço. Cada arquivo conserva responsabilidade individual, mas não constitui uma etapa isolada de autorização.

O código existente não se torna regra apenas por já estar implementado.

Regra Final

Nenhuma implementação pode contrariar esta Constituição sem aprovação formalda arquitetura do projeto.
