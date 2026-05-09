# Manual do Usuário — Gestão de Equipe e Configurações (Avaliação 2.0)

Bem-vindo ao manual das telas de **Gestão de Equipe** e **Configurações**. Estas são as áreas administrativas do sistema.

---

## 🎯 O que estas telas fazem?

- **Gestão de Equipe (`/users`)**: Permite cadastrar novos membros no time de Customer Success (CSMs) e visualizar quem já tem acesso.
- **Configurações de Funcionalidades (`/settings/features`)**: Permite ativar ou desativar módulos do sistema (Admin).
- **Admin Panel (`/admin`)**: Área reservada para configurações avançadas (Atualmente em desenvolvimento).

---

## 📊 Regras de Negócio e Memória de Cálculo

### 1. Cadastro de CSM
- **Email**: Deve ser um email corporativo.
- **Senha**: Deve ter no mínimo 6 caracteres.
- **Acessos**: Os acessos são auditados via logs do Supabase para garantir a segurança.

### 2. Ativação de Módulos
- As funcionalidades são divididas por módulos.
- Uma funcionalidade inativa não aparecerá para os usuários finais ou não executará suas automações.

---

## 💡 Como Usar a Tela

### Gestão de Equipe
1. **Cadastrar**: Preencha o e-mail e a senha do novo CSM no formulário à esquerda e clique em "Cadastrar CSM".
2. **Visualizar**: A lista à direita mostra todos os usuários cadastrados e a data do último login.

### Configuração de Funcionalidades
1. **Visualizar**: Veja os cards de cada funcionalidade e seu status (Ativa/Inativa).
2. **Editar**: Clique no card para abrir o modal de edição (Disponível apenas para administradores).

---

## 🎭 Estrutura de Apresentação (Roteiro de Treinamento)

*   **Slide 1: Controle de Acesso** — "Apenas administradores podem cadastrar novos usuários. Mantenham as senhas seguras."
*   **Slide 2: Modularidade** — "O sistema é dinâmico. Podemos ligar ou desligar recursos conforme a evolução do produto."

---

## 🗺️ Mapeamento do Ícone de Ajuda (?)

- **Onde incluir**: No cabeçalho das respectivas páginas.
- **Comportamento**: Abrirá este manual em uma nova aba.
