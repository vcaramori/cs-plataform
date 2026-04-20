# 8. Usuários — Gestão de Equipe CS

## Visão Geral do Módulo

O módulo **Usuários** permite a gestão de membros da equipe de Customer Success. Apenas administradores têm acesso a este módulo.

**Caminhos:**
- `/users` → Lista de usuários
- `/users/[id]` → Detalhe do usuário
- `/users/new` → Novo usuário

---

## 8.1 Telas do Módulo

### 8.1.1 Lista de Usuários (`/users`)

| Coluna | Descrição |
|--------|-----------|
| Nome | Nome completo |
| Email | Email de acesso |
| Função | Papel no sistema |
| Status | Ativo/Inativo |
| Ações | Editar / Desativar |

### 8.1.2 Detalhe do Usuário (`/users/[id]`)

| Seção | Descrição |
|-------|-----------|
| Perfil | Foto, nome, email |
| Função | Papel e permissões |
| Atribuições | Contas atribuídas |
| Métricas | Performance |

### 8.1.3 Criação/Edição (`/users/new`, `/users/[id]/edit`)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Nome | Text | Sim | Nome completo |
| Email | Email | Sim | Email único |
| Senha | Password | Sim (novo) | Senha inicial |
| Função | Select | Sim | Papel no sistema |
| Avatar | File | Não | Foto de perfil |

---

## 8.2 Regras de Negócio

### Funções (Roles)
| Role | Descrição |
|------|-----------|
| `admin` | Acesso total ao sistema |
| `head_cs` | Gestión de CSMs + configurações |
| `csm` | Gestão de contas分配adas |
| `viewer` | Apenas visualização |

### Permissões
| Ação | Admin | Head CS | CSM | Viewer |
|------|-------|---------|-----|-------|
| Ver dashboard | ✓ | ✓ | ✓ | ✓ |
| Ver contas | ✓ | ✓ | ✓ | ✓ |
| Editar contas | ✓ | ✓ | ✓ | ✗ |
| Ver métricas | ✓ | ✓ | ✓ | ✓ |
| Settings | ✓ | ✓ | ✗ | ✗ |
| Gerenciar users | ✓ | ✓ | ✗ | ✗ |

### Atribuição de Contas
- Admin/Head CS podem atribuir contas a CSMs
- Cada conta tiene exactamente um CSM owner
- Transferência mantém histórico

---

## 8.3 Componentes Visuais

### Header
- Breadcrumb: "Dashboard > Usuários"
- Título: "Equipe de Customer Success"

### UsersTable
- Lista paginada
- Busca por nome/email
- Filtro por função

### UserCard
- Avatar + Nome + Função
- Status indicator
- Ações rápidas

---

## 8.4 Interações do Usuário

| Ação | Gatilho | Resultado |
|------|---------|-----------|
| Listar usuários | Acesso `/users` | Exibe lista |
| Ver detalhe | Clique no nome | Abre detalhe |
| Criar usuário | Clique em "Novo" | Abre formulário |
| Editar usuário | Clique em editar | Abre edição |
| Desativar usuário | Clique em desativar | Altera status |
| Atribuir contas | drag & drop | Atualiza owner |

---

## 8.5 Requisitos Técnicos

### Autenticação
🔒 **Obrigatória** — apenas admin/head_cs

### Dados
| Tabela | Acesso |
|--------|--------|
| `users` | Full access |
| `account_assignments` | Full access |

---

## 8.6 Casos de Borda

| Caso | Comportamento |
|------|----------------|
| Email duplicado | Erro "Email já cadastrado" |
| Auto-desativação | Não pode desativar a si mesmo |
| Última admin | Impede desativação |

---

## 8.7 Histórico

| Data | Alteração |
|------|------------|
| Abr/2026 | Versão initial |