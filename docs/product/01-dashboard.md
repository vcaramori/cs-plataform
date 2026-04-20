# 1. Dashboard — Visão Geral do Portfólio

## Visão Geral do Módulo

O **Dashboard** é a tela inicial do sistema, oferecendo uma visão executiva Consolidada do portfólio de clientes. Permite aos CSMs e Heads de CS avaliarem rapidamente a saúde do negócio, identificarem contas em risco e acompanharem métricas-chave de performance.

**Caminho:** `/dashboard`

---

## 1.1 KPIs Principais

| KPI | Descrição | Fórmula | Threshold |
|-----|-----------|---------|------------|
| **Total de LOGOs** | Número de contas ativas | `COUNT(accounts)` | — |
| **MRR Total** | Receita recorrente mensal | `SUM(contracts.mrr WHERE status='active')` | — |
| **Health Médio** | Média dos health scores | `AVG(accounts.health_score)` | >70 Saudável |
| **LOGOs em Risco** | Contas com health < 40 | `COUNT WHERE health_score < 40` | 0 Ideal |
| **Renovações (30d)** | Contratos a vencer em 30 dias | `COUNT WHERE renewal_date BETWEEN now AND now+30d` | — |
| **NPS Score** | Net Promoter Score global | `((promoters - detratores) / total) * 100` | >50 Bom |

---

## 1.2 Regras de Negócio

### Cálculo de MRR
- Apenas contratos com `status = 'active'` são inclusos
- Soma todos os valores `mrr` de todas as contas do CSM

### Health Score Thresholds
- **< 40**: Classificado como "em risco" — destaca em vermelho
- **40-59**: Classificado como "atenção" — destaca em amarelo
- **≥ 60**: Classificado como "saudável"

### Renovação
- Calcula contratos onde `renewal_date` está no intervalo [hoje, hoje + 30 dias]
- Inclui contratos de qualquer status exceto `churned`

### NPS
- Inclui apenas respostas onde `dismissed = false` e `score IS NOT NULL`
- Usa admin client para bypassar RLS (dados sensíveis)
- Fórmula: `((promoters - detratores) / responses) * 100`

### Ordenação
- Accounts são ordenados alfabeticamente por `company_name`

---

## 1.3 Componentes Visuais

### Header
- Breadcrumb: "Dashboard"
- Título: "Visão Geral do Portfólio"

### KPI Strip (6 cards)
| Card | Ícone | Cor |
|------|------|-----|
| Total de LOGOs | Users | 🔵 |
| MRR Total | DollarSign | 💚 |
| Health Médio | Activity | Segun color |
| LOGOs em Risco | AlertTriangle | 🔴 |
| Renovações 30d | Calendar | 🟡 |
| NPS Score | Heart | Segun score |

### AccountsTable
- **Colunas:** LOGO, Segmento,Health, MRR, Renovação, NPS
- **Ordenação:** Clicável no header
- **Navegação:** Clique na linha → `/accounts/[id]`

### Estados Vazios
- Se não existem contas: exibe "Nenhum LOGO encontrado"
-KPIs mostram zeros

---

## 1.4 Fluxo de Dados

```
[Acesso à página]
    ↓
[Carrega dados]
    ├─ accounts (via Supabase)
    ├─ contracts (filtered by status='active')
    ├─ health_scores (latest)
    └─ nps_responses (via stats API)
    ↓
[Calcula KPIs em memória]
    ├─ Total accounts
    ├─ Sum MRR
    ├─ Avg health
    └─ NPS formula
    ↓
[Renderiza UI]
```

---

## 1.5 Interações do Usuário

| Ação | Gatilho | Resultado |
|------|---------|-----------|
| Visualizar KPIs | Acesso página | Exibe métricas em tempo real |
| Ordenar tabela | Clique no header | Reordena por coluna |
| Filtrar | Digitação no search | Filtra por nome (client-side) |
| Acessar conta | Clique na linha | Navega para `/accounts/[id]` |

---

## 1.6 Requisitos Técnicos

### Autenticação
🔒 **Obrigatória** — redireciona para `/login` se não autenticado

### Dados
- **Fonte:** `accounts`, `contracts`, `health_scores`, `nps_responses`
- **RLS:** Apenas contas do CSM logado

### Performance
- Carregamento: Server-side rendering
- Dados agregados: Calculados no servidor

---

## 1.7 Casos de Borda

| Caso | Comportamento |
|------|----------------|
| Sem contas | Exibe KPIs em zero, tabela vazia |
| Sem contratos ativos | MRR = 0 |
| Sem respostas NPS | NPS = null (exibe "—") |
| Health null | Treat como 0 |

---

## 1.8 Histórico

| Data | Alteração |
|------|------------|
| Abr/2026 | Versão inicial |