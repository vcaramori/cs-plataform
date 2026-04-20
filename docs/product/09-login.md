# 9. Login — Autenticação

## Visão Geral do Módulo

O módulo **Login** gerencia a autenticação de usuários no CS-Continuum. Suporta autenticação via email/senha com integração Supabase Auth.

**Caminho:** `/login`

---

## 1.1 Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| **Provedor** | Supabase Auth (email/password) |
| **Session Duration** | 7 dias |
| **Remember Me** | Extende para 30 dias |
| **Redirect** | `/dashboard` pós-login |
| **Logout** | Limpa sessão e redireciona `/login` |

### Fluxo de Autenticação

```
1. [Usuário acessa /login]
2. [Se já autenticado → redirect /dashboard]
3. [Usuário preenche email + senha]
4. [POST /api/auth/login]
5. [Supabase valida credenciais]
6. [Se válido → cria session → redirect /dashboard]
7. [Se inválido → exibe erro]
```

---

## 1.2 Componentes Visuais

### LoginForm
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Email | Email | Sim | Email cadastrado |
| Senha | Password | Sim | Senha de acesso |
| Lembrar-me | Checkbox | Não | Extend session |

### Estados
| Estado | Exibe |
|--------|------|
| carregando | Spinner no botão |
| erro | Mensagem de erro em vermelho |
| sucesso | Redirect |

### Esqueceu Senha
- Link para recuperação
- Email com token

---

## 1.3 Interações do Usuário

| Ação | Gatilho | Resultado |
|------|---------|-----------|
| Login | Preenchimento + clique em "Entrar" | Autentica e redireciona |
| Esqueceu senha | Clique em "Esqueci minha senha" | Abre modal de recuperação |
| Logout | Clique em "Sair" | Limpa sessão |

---

## 1.4 Requisitos Técnicos

### Autenticação
- Supabase Auth via `@supabase/ssr`
- Cookies HttpOnly para session
- JWT storage no cliente

### Segurança
- Rate limiting: 5 tentativas
- Lock: 15 minutos após falhas
- HTTPS obrigatório

### API
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/reset` | Reset password |

---

## 1.5 Casos de Borda

| Caso | Comportamento |
|------|----------------|
| Email não cadastrado | Erro genérico |
| Senha incorreta | Erro genérico |
| Usuário inativo | Erro "Usuário desativado" |
| Rate limit | "Tente novamente em 15min" |

---

## 1.6 Histórico

| Data | Alteração |
|------|------------|
| Abr/2026 | Versão inicial |