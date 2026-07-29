# ACTS Portal

> Plataforma Edge-First para portais multisites e multidomínio construída sobre Cloudflare.

---

# Sobre o Projeto

O ACTS é um framework/plataforma para criação de portais altamente escaláveis, utilizando uma arquitetura baseada em:

- Microkernel
- Módulos
- Plugins
- Componentes reutilizáveis
- Eventos (Event Bus)
- Configuração orientada por JSON

O objetivo é manter uma base de código pequena, organizada, reutilizável e preparada para crescer sem aumentar a complexidade.

---

# Princípios

- Core pequeno e estável.
- Arquivos criados apenas por necessidade.
- Um arquivo = uma responsabilidade principal.
- Módulos independentes.
- Plugins opcionais.
- Interface composta por componentes reutilizáveis.
- Navegação pública baseada em conteúdo publicado.
- D1 como fonte de verdade.
- KV e R2 para distribuição de conteúdo.
- Asaas como único gateway financeiro.

---

# Tecnologias

- Cloudflare Pages
- Cloudflare Functions
- Cloudflare D1
- Cloudflare KV
- Cloudflare R2
- Cloudflare Queues

Frontend:

- Bootstrap 5
- Tailwind CSS
- JavaScript ES Modules

---

# Estrutura

```text
docs/
app/
functions/
site/
database/
```

A árvore completa encontra-se em:

```text
/docs/TREE.md
```

---

# Documentação

| Documento | Descrição |
|-----------|-----------|
| PROJECT.md | Visão geral e filosofia do projeto |
| INDEX.md | Índice da documentação |
| ARCHITECTURE.md | Arquitetura oficial |
| TREE.md | Estrutura oficial de diretórios |
| ROADMAP.md | Ordem oficial de implementação |
| MODULES.md | Documentação dos módulos |
| COMPONENTS.md | Documentação dos componentes |
| EVENTS.md | Catálogo de eventos |
| SCHEMAS.md | Esquemas JSON |
| CLOUDFLARE.md | Infraestrutura Cloudflare |
| CHANGELOG.md | Histórico das decisões |

---

# Filosofia

O ACTS evolui por meio de módulos, plugins e componentes.

O Core permanece pequeno e praticamente imutável.

Novas funcionalidades devem ser adicionadas sem alterar o núcleo da plataforma.

---

# Desenvolvimento

O projeto é desenvolvido seguindo uma regra simples:

1. Definir o arquivo.
2. Implementar completamente.
3. Revisar.
4. Testar.
5. Aprovar.
6. Commit.
7. Próximo arquivo.

Nenhum arquivo é criado apenas por antecipação.

---

# Licença

Proprietário.

Todos os direitos reservados.
