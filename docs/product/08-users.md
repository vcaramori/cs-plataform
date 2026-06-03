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
| Perfil | Select | Sim | Custom role (define o escopo por módulo) |
| Acesso Total | Checkbox/Toggle | Não | Override que ignora o perfil e libera tudo de todos. Só quem tem Acesso Total concede. |
| Avatar | File | Não | Foto de perfil (qualquer usuário pode trocar a **própria** foto) |

---

## 8.2 Regras de Negócio

### Perfil (escopo) + Acesso Total (override)

Desde Jun/2026 o acesso tem **dois eixos independentes** (ver [permissions-plan.md](permissions-plan.md)):

- **Perfil** = um `custom_role` configurado na matriz `/settings/roles`, que define o **escopo** por módulo (`view`/`create`/`edit`/`delete`/`export`/`view_team`). É o único valor do seletor de "Perfil de Acesso".
- **Acesso Total** = flag `profiles.is_super_admin` por usuário. Quando ligada, **ignora o perfil** e libera ver/editar tudo de todos, sem restrição de escopo. Gerenciada no cadastro de usuários (toggle no card / checkbox no formulário). Só quem já tem Acesso Total pode conceder/remover (e não no próprio card).

> Roles legados (`csm`, `csm_senior`, `head_cs`, `admin`, `super_admin`) seguem em `profiles.role` como base de compatibilidade, mas `super_admin` **não** aparece mais como opção de perfil — virou a flag Acesso Total.

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
- Avatar (overlay de troca de foto: própria sempre; de terceiros se puder gerenciar) + Nome + badges (Inativo / Externo / **Acesso Total**)
- Seletor de **Perfil** (custom roles) quando o autor pode gerenciar o usuário
- Toggle **Acesso Total** (só visível para quem tem Acesso Total, fora do próprio card)
- Toggle **Ativo/Bloqueado**

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
| Jun/2026 | "Acesso Total" separado do Perfil (flag `is_super_admin`); Perfil = custom roles; troca da própria foto (`PATCH /api/users/me`) |