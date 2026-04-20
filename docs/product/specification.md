# CS-Continuum — Especificação de Produto

> Documento de especificação técnica e funcional para todas as telas do sistema.
> Versão: 1.0 | Data: Abril/2026

---

## Índice

### Módulos Principais

| # | Módulo | Tela(s) | Arquivo |
|---|-------|--------|--------|
| 1 | Dashboard | Visão Geral | [01-dashboard.md](01-dashboard.md) |
| 2 | Contas (LOGOs) | Lista, Detalhe, Edição | [02-accounts.md](02-accounts.md) |
| 3 | NPS Hub | Dashboard, Programas | [03-nps.md](03-nps.md) |
| 4 | Suporte | Lista, Detalhe, Dashboard | [04-suporte.md](04-suporte.md) |
| 5 | Perguntar | Assistente RAG | [05-perguntar.md](05-perguntar.md) |
| 6 | Esforço | Time Tracking | [06-esforco.md](06-esforco.md) |
| 7 | Settings | Planos, Features, SLA, HH | [07-settings.md](07-settings.md) |
| 8 | Usuários | Gestão de Equipe | [08-users.md](08-users.md) |
| 9 | Login | Autenticação | [09-login.md](09-login.md) |

---

## Visão Geral do Sistema

### Propósito
Plataforma interna de Customer Success para gestão de clientes (LOGOs), contratos, suporte, adoção de produto, health score e NPS — com motor de IA (RAG) para consultas em linguagem natural.

### Usuários Alvo
- **CSMs** (Customer Success Managers): Gestão dia a dia de contas
- **Head de CS**: Visão executiva do portfólio
- **Suporte**: Atendimento de tickets
- **Admin**: Configurações do sistema

### Stack Tecnológica
| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS, Radix UI |
| Banco | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth (JWT + RLS) |
| LLM | Ollama → Gemini → Claude (fallback) |

---

## Regras de Negócio Globais

### Autenticação
- Todas as telas (exceto `/nps-test`, `/csat/[token]`) exigem autenticação
- Sessão gerenciada via Supabase Auth JWT
- Sesões expiradas redirecionam para `/login`

### Autorização (RLS)
- CSMs só acessam dados das contas onde são `csm_owner_id`
- `service_role` é usado apenas para operações que precisam bypass RLS

### Health Score
| Faixa | Classificação |
|-------|----------------|
| 80-100 | Saudável / Engajado |
| 60-79 | Estável com atenção |
| 40-59 | Risco moderado |
| 0-39 | Alto risco |

### NPS Score
| Segmento | Scores |
|----------|--------|
| Promotor | 9-10 |
| Passivo | 7-8 |
| Detrator | 0-6 |

**Fórmula:** `((promotores - detratores) / total) * 100`

### Contratos
| Status | Descrição |
|--------|-----------|
| `active` | Em vigor |
| `at-risk` | Em risco de churn |
| `churned` | Perdido |
| `in-negotiation` | Em renovação |

---

## Legenda de Símbolos

| Símbolo | Significado |
|--------|-------------|
| 🔒 | Requer autenticação |
| ⚙️ | API call |
| 🤖 | Envolvimento de IA |
| 📊 | Dados agregados |

---

## Histórico de Versões

| Versão | Data | Descrição |
|--------|------|------------|
| 1.0 | Abr/2026 | Versão inicial do documento |