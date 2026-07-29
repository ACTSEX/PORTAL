# ACTS Portal

## Filosofia e Visão do Projeto

---

# O que é o ACTS

O ACTS é uma plataforma para criação de portais multisites e multidomínio construída sobre a infraestrutura Edge da Cloudflare.

Mais do que um portal, o ACTS é um microkernel capaz de suportar diferentes tipos de projetos utilizando a mesma base de código.

Toda a arquitetura foi projetada para privilegiar:

- simplicidade;
- desempenho;
- baixo custo operacional;
- reutilização de código;
- baixa complexidade;
- manutenção de longo prazo.

---

# Nossa Filosofia

O ACTS não pretende ser um clone de WordPress, Laravel ou qualquer outro framework.

O objetivo é construir uma plataforma moderna, pequena e extremamente organizada.

A prioridade nunca será ter mais recursos.

A prioridade será manter um código simples.

Sempre que existir uma escolha entre:

- mais arquivos;
- mais abstrações;
- mais padrões;

ou

- menos arquivos;
- mais reutilização;
- mais simplicidade;

a segunda opção deverá ser escolhida.

---

# Nossa Missão

Construir uma plataforma capaz de atender milhares de portais utilizando praticamente o mesmo núcleo.

Cada novo portal deve exigir configuração, não reescrita de código.

---

# Nossa Visão

O Core deve permanecer praticamente inalterado ao longo dos anos.

Toda evolução do sistema deverá acontecer através de:

- módulos;
- plugins;
- componentes;
- eventos;
- configurações.

---

# O que nunca faremos

O ACTS não será desenvolvido baseado em antecipação.

Nunca criaremos:

- arquivos porque poderão ser úteis um dia;
- módulos vazios;
- plugins vazios;
- controllers sem código;
- services sem responsabilidade real;
- abstrações para problemas inexistentes.

Cada arquivo deverá justificar sua existência.

---

# Nossa Regra de Ouro

> Arquivos são criados por necessidade, nunca por previsão.

---

# Desenvolvimento

O projeto será construído um arquivo por vez.

Fluxo oficial:

```text
Definir
    ↓
Implementar
    ↓
Revisar
    ↓
Testar
    ↓
Aprovar
    ↓
Commit
```

Somente depois iniciaremos o próximo arquivo.

---

# Responsabilidade dos Arquivos

Cada arquivo deve possuir apenas uma responsabilidade principal.

Quando um arquivo crescer além do aceitável, ele poderá ser dividido.

Nunca antes disso.

---

# Estrutura da Plataforma

O ACTS será composto por cinco grandes blocos.

```text
Core

↓

Modules

↓

Plugins

↓

Components

↓

Templates
```

Essa hierarquia nunca deve ser invertida.

---

# O Core

O Core fornece apenas infraestrutura.

Ele não conhece regras de negócio.

O Core não sabe o que é:

- anúncio;
- usuário;
- cidade;
- plano;
- pagamento;
- categoria.

Esses conceitos pertencem aos módulos.

---

# Os Módulos

Os módulos representam o domínio do sistema.

Cada módulo é responsável por uma parte do negócio.

Exemplos:

- anúncios;
- usuários;
- cidades;
- financeiro;
- planos;
- assinaturas.

---

# Os Plugins

Plugins adicionam funcionalidades opcionais.

Eles nunca alteram o Core.

Exemplos:

- SEO;
- Analytics;
- WhatsApp;
- E-mail;
- Backup;
- Integrações.

---

# Os Componentes

A interface será construída por componentes reutilizáveis.

Nunca existirão componentes específicos para cada cidade, categoria ou anunciante.

Os componentes recebem dados.

Eles não conhecem regras de negócio.

---

# Templates

Os templates definem apenas a estrutura visual.

Toda lógica pertence aos módulos e componentes.

---

# Eventos

A comunicação do sistema será orientada por eventos.

Um módulo nunca deve acessar diretamente outro módulo.

Ao invés disso, ele publica eventos.

Outros módulos decidem se desejam responder.

Essa arquitetura reduz o acoplamento e facilita a evolução do projeto.

---

# Banco de Dados

O D1 será a única fonte de verdade.

Todas as alterações ocorrerão primeiro no banco.

A publicação para o público será feita posteriormente através de JSONs.

---

# Conteúdo Público

A navegação pública deverá utilizar:

- páginas estáticas;
- cache;
- JSONs publicados;
- componentes reutilizáveis.

Sempre que possível, nenhuma consulta deverá ser realizada ao D1 durante a navegação pública.

---

# Infraestrutura

O projeto utilizará:

- Cloudflare Pages;
- Cloudflare Functions;
- D1;
- KV;
- R2;
- Queues.

Toda a arquitetura foi desenhada especificamente para esse ambiente.

---

# Gateway Financeiro

O ACTS utilizará exclusivamente o Asaas.

Não serão criadas abstrações para múltiplos gateways de pagamento.

Essa decisão reduz complexidade e facilita a manutenção.

---

# Escalabilidade

O sistema deverá crescer em funcionalidades.

Nunca em complexidade.

Adicionar um novo recurso não deve obrigar alterações profundas no Core.

---

# Objetivo Final

Ao final do desenvolvimento, o ACTS deverá possuir:

- um Core pequeno;
- módulos independentes;
- plugins opcionais;
- poucos templates;
- componentes reutilizáveis;
- documentação completa;
- uma base de código compacta e organizada.

A meta é manter o projeto abaixo de aproximadamente 100 arquivos de código, preservando clareza, desempenho e facilidade de manutenção.

---

# Compromisso

Toda decisão arquitetural deverá respeitar este documento.

Caso uma nova necessidade exija mudanças estruturais, este arquivo deverá ser atualizado antes da implementação.

O código deve seguir a arquitetura.

Nunca o contrário.
