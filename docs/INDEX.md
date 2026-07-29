# Índice da Documentação

> Este documento centraliza toda a documentação oficial do Portal ACTS.

---

# Documentação Oficial

A documentação do ACTS está organizada por assunto.

Cada documento possui uma responsabilidade específica.

---

## 01. README

**Arquivo**

```text
/docs/README.md
```

**Objetivo**

Apresentação rápida do projeto.

Contém:

- visão geral;
- tecnologias utilizadas;
- estrutura básica;
- documentação disponível.

---

## 02. PROJECT

**Arquivo**

```text
/docs/PROJECT.md
```

**Objetivo**

Define a filosofia do projeto.

Contém:

- missão;
- visão;
- princípios;
- objetivos;
- regras permanentes;
- forma oficial de desenvolvimento.

Este documento representa a identidade do ACTS.

---

## 03. ARCHITECTURE

**Arquivo**

```text
/docs/ARCHITECTURE.md
```

**Objetivo**

Documento técnico principal.

Define toda a arquitetura da plataforma.

Contém:

- microkernel;
- módulos;
- plugins;
- componentes;
- eventos;
- renderização;
- publicação;
- banco de dados;
- Cloudflare;
- organização do projeto.

É a Constituição Técnica do ACTS.

---

## 04. TREE

**Arquivo**

```text
/docs/TREE.md
```

**Objetivo**

Define a árvore oficial do projeto.

Toda pasta e todo arquivo devem existir primeiro neste documento antes de serem implementados.

Nenhum arquivo deve surgir "fora da árvore".

---

## 05. ROADMAP

**Arquivo**

```text
/docs/ROADMAP.md
```

**Objetivo**

Define a ordem oficial de implementação.

Cada arquivo do projeto aparece aqui.

Quando concluído, é marcado como implementado.

---

## 06. MODULES

**Arquivo**

```text
/docs/MODULES.md
```

**Objetivo**

Documentar todos os módulos do sistema.

Cada módulo possui:

- responsabilidade;
- eventos;
- dependências;
- interfaces públicas;
- observações.

---

## 07. COMPONENTS

**Arquivo**

```text
/docs/COMPONENTS.md
```

**Objetivo**

Documentar todos os componentes reutilizáveis.

Exemplos:

- Card
- Grid
- Form
- Gallery
- Table
- Modal

---

## 08. EVENTS

**Arquivo**

```text
/docs/EVENTS.md
```

**Objetivo**

Catálogo oficial de eventos.

Para cada evento será documentado:

- descrição;
- quem dispara;
- quem pode consumir;
- parâmetros;
- exemplos.

---

## 09. SCHEMAS

**Arquivo**

```text
/docs/SCHEMAS.md
```

**Objetivo**

Documentar todos os arquivos JSON utilizados pela plataforma.

Exemplos:

- schemas de formulário;
- temas;
- menus;
- permissões;
- configurações.

---

## 10. CLOUDFLARE

**Arquivo**

```text
/docs/CLOUDFLARE.md
```

**Objetivo**

Documentar toda a infraestrutura Cloudflare.

Inclui:

- Pages;
- Functions;
- D1;
- KV;
- R2;
- Queues;
- Cache;
- Deploy.

---

## 11. CHANGELOG

**Arquivo**

```text
/docs/CHANGELOG.md
```

**Objetivo**

Registrar todas as decisões importantes do projeto.

Sempre que uma decisão arquitetural mudar, ela deve ser registrada aqui.

Nunca apagar histórico.

---

# Fluxo Oficial

Toda implementação deve seguir esta sequência.

```text
PROJECT
        │
        ▼
ARCHITECTURE
        │
        ▼
TREE
        │
        ▼
ROADMAP
        │
        ▼
IMPLEMENTAÇÃO
```

Isso garante que nenhuma decisão seja tomada apenas durante a programação.

---

# Hierarquia da Documentação

```text
README
        │
        ▼
PROJECT
        │
        ▼
ARCHITECTURE
        │
        ▼
TREE
        │
        ▼
ROADMAP
        │
        ▼
MODULES
COMPONENTS
EVENTS
SCHEMAS
CLOUDFLARE
CHANGELOG
```

Cada documento possui uma responsabilidade única.

---

# Regra Permanente

Antes de implementar qualquer arquivo do projeto, verificar:

1. O arquivo existe na árvore oficial?
2. O arquivo está previsto no roadmap?
3. A arquitetura permite sua criação?
4. A responsabilidade está claramente definida?

Se alguma resposta for **não**, o arquivo não deve ser criado.

---

# Objetivo da Documentação

A documentação existe para garantir que:

- o projeto permaneça organizado;
- a arquitetura não se perca;
- novos desenvolvedores entendam rapidamente o sistema;
- decisões não dependam da memória dos participantes;
- a evolução aconteça de forma previsível.

Toda a documentação deve permanecer sincronizada com a implementação.

Sempre que a arquitetura mudar, os documentos correspondentes deverão ser atualizados antes do código.
