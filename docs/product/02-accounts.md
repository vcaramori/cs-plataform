# 2. Accounts — Gestão de Clientes (LOGOs)

## Visão Geral do Módulo

O módulo **Accounts** é o centro de gestão de clientes (LOGOs) do CS-Continuum. Permite aos CSMs visualizar, editar e gerenciar todas as informações relacionadas às contas, incluindo contratos, contatos, interações, tickets de suporte e métricas de saúde.

**Caminhos:**
- Lista: `/accounts` (redireciona para `/dashboard`)
- Detalhe: `/accounts/[id]`
- Edição: `/accounts/[id]/edit`
- Novo: `/accounts/new`
- SLA da conta: `/accounts/[id]/sla`

---

## 2.1 Telas do Módulo

### 2.1.1 Lista de Accounts (`/accounts`)

Redireciona automaticamente para `/dashboard` — a lista de contas é exibida como parte do Dashboard.

---

### 2.1.2 Detalhe do Account (`/accounts/[id]`)

Página principal de visualização de uma conta específica. Layout em 3 colunas proporcionais (31% / 45% / 24%) em desktop.

| Coluna | Conteúdo |
|--------|----------|
| **Esquerda (31%)** | Linha do Tempo (interações + esforço unificados, scroll independente) |
| **Centro (45%)** | Resultados Estratégicos (SuccessPlan) → Uso & Adoção Funcional → Risco & Atrito (tickets) |
| **Direita (24%)** | Health Score Ponderado (4 dimensões) → Mapa de Influência (stakeholders) → Governança Contratual (contratos) → Central de Arquivos |

**Acima das 3 colunas:** `AccountHeader` com health grid e navegação.

---

### 2.1.3 Edição de Account (`/accounts/[id]/edit` e `/accounts/new`)

Formulário linear de coluna única com 4 blocos sequenciais:

| Bloco | Campos |
|-------|--------|
| **Identificação** | Logo upload, Razão Social, Nome Fantasia, Segmento, Setor, Website, CNPJ |
| **Localização** | CEP (via ViaCEP), Logradouro, Número, Complemento, Bairro, Cidade, UF, Toggle Internacional |
| **Gestão Comercial** | Contratos: MRR base, ARR (calculado), Tipo de Serviço, Plano, Financial Engine (Standard/Custom toggle + `pricing_explanation` quando Custom), Datas, Duração |
| **Governança Comercial** | Descontos, multas e fidelidade centralizados por regra global ou por contrato, com valor, tipo e datas de vigência |
| **Faturamento e Time** | Dia vencimento, Contato faturamento (nome/e-mail/telefone), Regras, CSM Responsável, Executivo Comercial |

Todos os inputs usam `h-10 rounded-xl`. Layout full-width sem `max-w` restritivo.

---

## 2.2 Regras de Negócio

### 2.2.1 Health Score

**Health Score v1 (Manual/Shadow — Legado):**

| Condição | Classificação | Cor |
|----------|--------------|-----|
| `health_score < 40` | Em Risco | Vermelho (`#d85d4b`) |
| `health_score 40–69` | Atenção | Laranja (`#f7941e`) |
| `health_score >= 70` | Saudável | Verde-azulado (`#2ba09d`) |

Discrepância: se `|manual − shadow| > 20`, flag `discrepancy_alert` é ativado e exibe ícone de alerta pulsante no gauge.

**Health Score v2 (Ponderado — F2-02):**

Campo: `health_score_v2` na tabela `accounts`. Calcula-se diariamente via cron `/api/cron/health-score-daily` (rodando a cada 24h em todos os clientes com contrato ativo).

Fórmula ponderada:
```
health_score_v2 = (SLA × 0.35) + (NPS × 0.30) + (Adoption × 0.25) + (Relationship × 0.10)
```

**Dimensões:**
1. **SLA** (35%) — % de tickets resolvidos dentro do SLA nos últimos 30 dias. Range: 0–100
2. **NPS** (30%) — Escore NPS normalizado: `(avgNPS + 100) / 2`. Range: 0–100 (converte -100..100 para 0..100)
3. **Adoption** (25%) — % de features ativas do plano. Range: 0–100
4. **Relationship** (10%) — Frequência de contato (últimos 30 dias). Range: 0–100
   - 1–7 dias desde última interação = 100
   - 8–14 dias = 75
   - 15–21 dias = 50
   - 22–30 dias = 25
   - > 30 dias = 0

**Classificação (health_status):**

| Condição | Status | Cor |
|----------|--------|-----|
| `health_score_v2 >= 75` | `healthy` | Verde (`emerald-500`) |
| `health_score_v2 50–74` | `at-risk` | Âmbar (`yellow-500`) |
| `health_score_v2 < 50` | `critical` | Vermelho (`red-500`) |

**Armazenamento:**
- `health_breakdown`: JSON com { sla, nps, adoption, relationship }
- `health_classified_at`: timestamp da última atualização
- `health_status`: enum ('healthy', 'at-risk', 'critical')

**Visualização:**
- Componente `HealthBreakdownCard` exibe as 4 barras de progresso (direita da página de detalhe, coluna 3)
- Modal `HealthScoreDetailsModal` mostra histórico v1 + grid das 4 dimensões v2 (quando disponível)

**Cron Job:**
- Rota: `POST /api/cron/health-score-daily`
- Autenticação: header `x-api-secret` (valor: env `API_SECRET`)
- Processamento: batches de 100 accounts
- Retorno: { success, accounts_processed, total_accounts, errors: [...] }

### 2.2.2 Adoption Score

```
Adoption Score = ((in_use + partial × 0.5) / total_aplicável) × 100
```

- `na` (não aplicável) é excluído do denominador
- Exibido no health grid como gauge "Adoção"

### 2.2.3 Financial Engine

Cada contrato possui `pricing_type`:
- `standard` — preço tabelado; exibe apenas MRR + desconto
- `custom` — negociação específica; exibe campo `pricing_explanation` (textarea livre)

O toggle Standard/Custom no formulário mostra/oculta o campo de explicação dinamicamente.

Descontos e multas não são mais configurados dentro do contrato. Toda redução de MRR, desconto progressivo, valor fixo, percentual, multa e fim de fidelização deve ser cadastrada em **Governança Comercial**, com `starts_at` e `ends_at` para que os cálculos considerem apenas regras vigentes.

### 2.2.4 Contratos

| Status | Significado |
|--------|-------------|
| `active` | Ativo |
| `in-negotiation` | Em negociação |
| `at-risk` | Em risco |
| `churned` | Cancelado |

Múltiplos contratos por conta são suportados. O MRR exibido no header é do primeiro contrato ativo encontrado.

### 2.2.5 Busca de CEP

- Disparada automaticamente ao completar 8 dígitos
- Consome ViaCEP (`viacep.com.br`)
- Preenche: logradouro, bairro, cidade, UF
- Campo `complemento` permanece editável após auto-fill

---

## 2.3 Componentes Visuais

### 2.3.1 AccountHeader

Componente client-side. Estrutura em dois blocos empilhados:

**Bloco 1 — Barra de Navegação:**
| Elemento | Descrição |
|----------|-----------|
| Botão Voltar | Link para `/dashboard` |
| Avatar | Inicial do nome + badge de segmento |
| Nome da conta | Uppercase, h1 responsivo |
| Lápis de edição | `<Link href="/accounts/[id]/edit">` — abre formulário completo |
| Pill MRR | Receita mensal do contrato ativo |
| Pill Renovação | Dias até/desde renovação (vermelho < 30d, âmbar < 90d, verde ≥ 90d) |

**Bloco 2 — Health & Intelligence Grid (sempre visível):**

Grid `lg:grid-cols-4`:
- **Col 1** — Gauge circular animado (SVG) com health score, botão de edição manual e botão Sparkles (gera Shadow Score via IA). Sparkline de fundo com histórico dos últimos 10 pontos.
- **Col 2–4** — Mini-gauges em grid `grid-cols-3` com **2 linhas**:

| Linha | Gauge 1 | Gauge 2 | Gauge 3 |
|-------|---------|---------|---------|
| **1** | Adoção | Suporte | Relacionamento |
| **2** | NPS | SLA | Score IA |

Separador `h-px` entre as linhas.

**NPS gauge:** valor normalizado `(score + 100) / 2` para fill visual; `displayLabel` mostra o score real (`+75`, `-10`, `—`). Cor indigo. Fonte: `GET /api/nps/stats?account_id=` (últimos 30 dias).

**SLA gauge:** fill 100 se ativo, 15 se sem SLA. `displayLabel` = "Ativo" ou "Sem SLA". Ícone `ShieldCheck` (teal) ou `ShieldOff` (cinza). Fonte: `GET /api/sla-policies?contract_id=` do contrato ativo.

**Score IA (Shadow Score):** número inteiro da IA com botão `Info` para ver raciocínio. Se ausente, mostra "Pendente" com opacidade 30%.

### 2.3.2 HealthBreakdownCard (F2-02)

Novo componente para exibir o Health Score v2 com as 4 dimensões ponderadas.

| Seção | Conteúdo |
|-------|----------|
| **Header** | Título "Health Score Ponderado" + badge de status (healthy/at-risk/critical) + data de classificação |
| **4 Dimension Bars** | Uma barra de progresso para cada: SLA, NPS, Adoption, Relationship com cor (verde/âmbar/vermelho) baseada no score |
| **Score Display** | Cada dimensão mostra: ícone + label + valor 0-100 + percentual de peso (35%, 30%, 25%, 10%) |
| **Progress Bar** | Fill visual proporcional ao score, com cores semânticas |
| **Calculation Info** | Rodapé com a fórmula ponderada: (SLA×0.35) + (NPS×0.30) + (Adopt×0.25) + (Relat×0.10) |
| **Tooltips** | Cada dimensão tem tooltip explicando a fonte dos dados e como é calculada |
| **Fallback** | Se `breakdown` é null, exibe card vazio com "Sem dados disponíveis" |

**Cores por Score:**
- ≥ 70: verde (`emerald-500`)
- 40–69: âmbar (`yellow-500`)
- < 40: vermelho (`red-500`)

**Placement:** Coluna direita (24%), acima do "Mapa de Influência"

### 2.3.3 AccountUnifiedTimeline

Timeline unificada de interações (estratégicas) + esforço (operacional) + **eventos de contrato** (F2-01-A) + **health scores** (F2-01-B).

| Elemento | Valor |
|----------|-------|
| Ícone | `w-8 h-3.5 rounded-xl` (compacto) |
| Rail | `left-8` (centro do ícone: 16px padding + 16px) — `top-4 bottom-4` |
| Gap ícone↔card | `gap-3` |
| Card | `flex-1 min-w-0 overflow-hidden` — evita overflow de texto |
| Título | `truncate` sem max-w fixo |
| Itens exibidos | Máximo 15 (slice) com paginação (F2-01-D) |
| Filtros | Feed Geral / Estratégia / Atendimento & NPS (F2-01-C) |
| Sort | Toggle Mais recente ↔ Mais antigo (F2-01-C) |
| Busca | Client-side search com debounce (F2-01-E) |
| Tipos de eventos | `interaction`, `effort`, `ticket`, `nps`, **`contract_event`**, **`health_event`** |
| Clique na Interação | Abre o `InteractionDetailModal` |
| Clique em Contrato | Abre o `ContractDetailModal` |
| Clique em Health | Abre o `HealthEventDetailModal` |

**Cleanup de Eventos Deletados (F2-01-F):**
- `interactions`: filtra `!i.deleted_at && !i.is_archived`
- `efforts` (time_entries): filtra `!e.deleted_at && !e.is_archived`
- `tickets` (support_tickets): filtra `!t.deleted_at`
- `npsResponses`: filtra `!n.deleted_at`
- `contracts`: filtra `!c.deleted_at` (status `churned` é válido, não deletado)
- `healthScores`: filtra `!hs.deleted_at && hs.evaluated_at`
- Dados vêm do servidor limpo (Supabase via select sem soft-deletes) — filtros são safety net

**Eventos de Contrato (F2-01-A):**
- Ícone: `DollarSign` (indigo-500)
- Sempre `isStrategic: true` — aparece em "Feed Geral" e "Estratégia"
- Classificação de evento (`event_type`):
  - `renewal`: renovation_date é hoje ou ontem
  - `status_change`: status em `at-risk` ou `in-negotiation`
  - `created`: padrão
- Data exibida: `renewal_date` ou `created_at` (fallback)
- Título: `Contrato: {description || service_type || 'N/A'}`
- Status: badge com cor conforme `contract.status`

### 2.3.5 InteractionDetailModal (Reuniões Estratégicas)

Modal para visualização e edição das interações estratégicas registradas na timeline.

| Bloco | Conteúdo / Funcionalidade |
|-------|---------------------------|
| **Metadados** | Data da realização, com quem foi realizada (Contato/Stakeholder da conta). |
| **Checklist** | Visualização de todo o checklist validado durante a reunião. |
| **Edição** | Permitir edição dos apontamentos (campos e checklist) caso algo tenha sido registrado errado pelo assistente/CSM. |

### 2.3.6 ContractDetailModal (F2-01-A — Contract Events)

Modal read-only para visualização de detalhes de eventos de contrato na timeline. Clique em qualquer evento de contrato abre este modal.

| Seção | Conteúdo |
|-------|----------|
| **Cabeçalho** | Ícone contrato + descrição + status (badge colorida) |
| **Informações Financeiras** | MRR Base, Horas Contratadas (se > 0) |
| **Timeline Contratual** | Data de Início, Data de Renovação + contador (T-minus, expirado, etc.) |
| **Termos do Contrato** | Tipo (initial/additive/migration/renewal), Plano, Fidelidade, Multa Rescisória |
| **Notas Estratégicas** | Campo `notes` em card expandido (se preenchido) |
| **Descontos Progressivos** | Grid de descontos com label e valor (if any) |
| **Ações** | Botão "Editar Contrato" abre `EditContractDialog` |

**Comportamento:**
- Modal read-only (sem edição direta, apenas visualização)
- Ação principal: "Editar Contrato" delega para `EditContractDialog` existente
- Fechar modal: clique fora, Escape, ou botão "Fechar"

### 2.3.7 Data Passing — 6 Timeline Data Sources (F2-01-G)

AccountUnifiedTimeline consolida 6 tipos de eventos. Validação de data passing:

**1. Server Query (`page.tsx`):**
```typescript
const { data: account } = await supabase.from('accounts').select(`
  interactions (*),
  time_entries (*),      // → efforts
  support_tickets (*),   // → tickets
  nps_responses (*),
  contracts (*),
  health_scores (*)
`).single()
```

**2. Normalização e Passagem (`page.tsx` → `AccountDetailPageClient`):**
```typescript
const interactions = Array.isArray(account.interactions) ? ... : []
const entries = Array.isArray(account.time_entries) ? ... : []
const tickets = Array.isArray(account.support_tickets) ? ... : []
const npsResponses = Array.isArray(account.nps_responses) ? ... : []
const contracts = Array.isArray(account.contracts) ? ... : []
const healthScores = Array.isArray(account.health_scores) ? ... : []

<AccountDetailPageClient
  interactions={interactions}
  efforts={entries}
  tickets={tickets}
  npsResponses={npsResponses}
  contracts={contracts}
  healthScores={healthScores}
  // ...
/>
```

**3. Props em `AccountDetailPageClient`:**
```typescript
interface Props {
  interactions: any[]     // ✅
  efforts: any[]          // ✅
  tickets: any[]          // ✅
  npsResponses: any[]     // ✅
  contracts?: any[]       // ✅ (optional, já tem default F2-01-A)
  healthScores?: any[]    // ✅ (optional, já tem default F2-01-B)
  // ... resto
}

<AccountUnifiedTimeline
  interactions={interactions}
  efforts={efforts}
  tickets={tickets}
  npsResponses={npsResponses}
  contracts={contracts}
  healthScores={healthScores}
  // ...
/>
```

**4. Props em `AccountUnifiedTimeline`:**
```typescript
interface Props {
  interactions: any[]    // ✅ Obrigatório
  efforts: any[]         // ✅ Obrigatório
  tickets: any[]         // ✅ Obrigatório
  npsResponses: any[]    // ✅ Obrigatório
  contracts?: any[]      // ✅ Opcional (com default [])
  healthScores?: any[]   // ✅ Opcional (com default [])
  // ... resto
}
```

**Padrão:** 6 tipos são consolidados num array `combined[]` com filtro de soft-delete (F2-01-F) e então processados no pipeline de filtro → busca → sort → pagina.

### 2.3.4 AccountsTable (Dashboard)

| Elemento | Comportamento |
|----------|--------------|
| Lápis (hover no health score) | `router.push('/accounts/[id]/edit')` — sem modal |
| Clique na linha | `router.push('/accounts/[id]')` |
| Busca | Filtra por nome (client-side) |
| Filtro segmento | Tudo / Indústria / MRO / Varejo |

---

## 2.4 Interações do Usuário

| Ação | Gatilho | Resultado |
|------|---------|-----------|
| Visualizar conta | Acesso `/accounts/[id]` | Carrega dados e exibe dashboard |
| Editar conta | Clique no lápis (header ou tabela) | Navega para `/accounts/[id]/edit` |
| Buscar CEP | Digitar 8 dígitos | Preenche endereço automaticamente |
| Toggle Standard/Custom | Clique no pill do Financial Engine | Mostra/oculta `pricing_explanation` |
| Adicionar contrato | Clique em "Add Contrato" | Adiciona novo bloco |
| Remover contrato | Clique no ícone lixeira | Remove do array |
| Salvar conta | Clique em "Efetivar Cadastro" | POST/PATCH + redirect |
| Gerar Shadow Score | Clique no botão Sparkles (header) | POST `/api/health-scores/generate` |
| Editar health score manual | Clique no lápis mini (dentro do gauge) | Abre `HealthScoreEditModal` |
| Ver raciocínio IA | Clique no ícone Info | Expande painel de reasoning |
| Detalhar Interação | Clique em um item estratégico na timeline | Abre `InteractionDetailModal` para visualização/edição |
| Visualizar Contrato | Clique em evento de contrato na timeline | Abre `ContractDetailModal` (read-only) |
| Editar Contrato | Clique em "Editar Contrato" no `ContractDetailModal` | Abre `EditContractDialog` |
| Filtrar por Estratégia | Clique em aba "Estratégia" | Mostra apenas interações + contratos (isStrategic=true) |
| Filtrar por Atendimento | Clique em aba "Atendimento & NPS" | Mostra apenas tickets + NPS (exclui contratos) |
| Adicionar stakeholder | Clique em "Adicionar" no Mapa de Influência | Abre `AddContactModal` (form vazio) → `POST /api/contacts` |
| **Editar stakeholder** | **Clique no card do stakeholder** (afordância: lápis no hover) | Abre `AddContactModal` preenchido → `PATCH /api/contacts/[id]`; upsert otimista no card. Cliques em Convidar/Desligar/contatos não disparam (stopPropagation) |
| Desligar stakeholder | Clique em "Desligar" no card | Abre `DepartureDialog` → `PATCH` com `departed_at` |
| Criar meta (indicador) | "Nova Meta" no Plano de Sucesso | `AddIndicatorModal` → `POST /api/accounts/[id]/indicators`. **Data-alvo (`target_date`) obrigatória** (campo "Atingir até") |
| Definir/editar data-alvo | Abrir a meta → editar "Atingir até" no `IndicatorDetailsModal` | `PATCH /api/accounts/[id]/indicators/[indicatorId]` — usado para dar prazo a metas antigas (sem data) |
| Acompanhar prazo da meta | Visualizar o card do indicador | Chip de status: Atingida / Atrasada / Vence hoje / faltam Nd / até DD/MM / Sem prazo (compara `current_value` vs `target_value` e hoje vs `target_date`) |

---

## 2.5 Fluxo de Dados

### 2.5.1 Carregamento (Detalhe)

```
[Acesso à página /accounts/[id]]
    ↓
[Server Component — query única com joins]
    ├─ contracts, contacts, interactions
    ├─ support_tickets, health_scores
    ├─ time_entries, success_goals
    ├─ adoption_metrics, feature_adoption
    ↓
[Calcula Adoption Score e seleciona displayContracts]
    ↓
[Renderiza AccountHeader + AccountDetailPageClient]
    ↓
[AccountHeader (client): fetcha em paralelo]
    ├─ GET /api/health-scores/[id]   → history + summaryData
    ├─ GET /api/nps/stats?account_id → npsScore
    └─ GET /api/sla-policies?contract_id → slaActive
```

### 2.5.2 Edição (Form Submit)

```
[Usuário preenche formulário (react-hook-form + Zod)]
    ↓
[Validação client-side]
    ↓
[mode='create': POST /api/accounts]
[mode='edit':   PATCH /api/accounts/[id]]
    ↓
[Contratos: POST /api/contracts (novos) ou PATCH /api/contracts/[id] (existentes)]
    ↓
[Redirect para /accounts/[id]]
```

---

## 2.6 Requisitos Técnicos

### 2.6.1 Autenticação

🔒 **Obrigatória** — redireciona para `/login` se não autenticado

### 2.6.2 Dados

| Tabela | Acesso |
|--------|--------|
| `accounts` | RLS: `csm_owner_id = auth.uid()` |
| `contracts` | RLS: via account |
| `contacts` | RLS: via account |
| `interactions` | RLS: via account |
| `support_tickets` | RLS: via account |
| `health_scores` | RLS: via account |
| `sla_policies` | RLS: via account |
| `nps_responses` | RLS: via account |

### 2.6.3 API Endpoints Relevantes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/accounts/[id]` | Detalhe conta |
| POST | `/api/accounts` | Criar conta |
| PATCH | `/api/accounts/[id]` | Atualizar conta |
| POST | `/api/contracts` | Criar contrato |
| PATCH | `/api/contracts/[id]` | Atualizar contrato |
| GET | `/api/health-scores/[id]` | Histórico + summary |
| POST | `/api/health-scores/generate` | Gera Shadow Score (Gemini) |
| GET | `/api/nps/stats?account_id=` | NPS da conta (últimos 30d) |
| GET | `/api/sla-policies?contract_id=` | SLA policy do contrato |

---

## 2.7 Casos de Borda

| Caso | Comportamento |
|------|----------------|
| Account não encontrado | 404 (`notFound()`) |
| Sem contratos | Grid de governança exibe card vazio |
| pricing_type = custom sem explicação | Campo `pricing_explanation` vazio é aceito |
| NPS sem respostas (30d) | Gauge exibe `—` |
| Contrato sem SLA configurado | Gauge SLA exibe "Sem SLA" |
| Shadow score ausente | Score IA exibe "Pendente" (opacidade 30%) |
| CEP inválido | Mantém campos vazios, sem erro bloqueante |
| Toggle internacional | Oculta campo CEP, campos de endereço ficam livres |
| Conta internacional | Exibe campo País para contexto operacional |

---

## 2.8 Tipos TypeScript

### Account

```typescript
type Account = {
  id: string
  name: string
  company_name: string | null
  segment: 'Indústria' | 'MRO' | 'Varejo'
  csm_owner_id: string
  sales_executive_id: string | null
  industry: string | null
  website: string | null
  logo_url: string | null
  tax_id: string | null
  cep: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  is_international: boolean
  health_score: number
  health_trend: 'up' | 'stable' | 'down' | 'critical'
  billing_day: number | null
  billing_rules: string | null
  billing_contact_name: string | null
  billing_contact_phone: string | null
  billing_contact_email: string | null
  created_at: string
}
```

### Contract

```typescript
type Contract = {
  id: string
  account_id: string
  contract_code: string | null
  mrr: number
  arr: number
  start_date: string
  renewal_date: string
  service_type: 'Basic' | 'Professional' | 'Enterprise' | 'Custom'
  status: 'active' | 'at-risk' | 'churned' | 'in-negotiation'
  pricing_type: 'standard' | 'custom'
  pricing_explanation: string | null
  discount_percentage: number
  discount_duration_months: number
  discount_type: 'percentage' | 'fixed'
  discount_fixed_amount: number
  notes: string | null
}
```

---

## 2.9 Histórico

| Data | Alteração |
|------|------------|
| Abr/2026 | Versão inicial — Accounts list + detail + edit |
| Abr/2026 | Adicionado AccountForm linear com 4 blocos (sem sidebar) |
| Abr/2026 | Financial Engine Standard/Custom toggle |
| Abr/2026 | Campo Complemento adicionado ao bloco Localização |
| Abr/2026 | Pencil na tabela e header redirecionam para `/accounts/[id]/edit` (sem modal) |
| Abr/2026 | NPS e SLA movidos para health grid (2ª linha dos mini-gauges, sempre visíveis) |
| Abr/2026 | Timeline: ícone compacto (w-8), overflow-hidden no card, rail realinhado |
| Abr/2026 | Layout global full-width (removido max-w-7xl do layout e max-w de formulários) |
| Mai/2026 | **F2-01-A** — Contract Events Integration: eventos de contrato integrados à AccountUnifiedTimeline |
| Mai/2026 | Novo componente `ContractDetailModal` para visualização de detalhes de contratos via timeline |
| Mai/2026 | Contracts agora aparecem em "Feed Geral" e "Estratégia" (isStrategic=true), excludos de "Atendimento & NPS" |
| Mai/2026 | **F2-02** — Health Score Ponderado v2: 4 dimensões (SLA 35%, NPS 30%, Adoption 25%, Relationship 10%) |
| Mai/2026 | Novo componente `HealthBreakdownCard` exibindo as 4 barras de progresso (coluna direita) |
| Mai/2026 | Cron diário `/api/cron/health-score-daily` recalcula health_score_v2 para todos os clientes ativos |
| Mai/2026 | Modal `HealthScoreDetailsModal` mostra breakdown v2 quando disponível (abaixo do gráfico histórico) |
| Jun/2026 | **Success Plan — cadastro acessível**: painel na conta ganha botão "Nova Meta" **sempre visível** (+ CTA no empty state) abrindo o `AddIndicatorModal`; "Abrir Plano Completo" deixa de exigir indicadores. Corrige o beco sem saída (não havia como cadastrar o 1º indicador). |
| Jun/2026 | **Curadoria de risco**: confirmar/marcar falso positivo (+ motivo) no AlertCenter e no Cockpit de Risco (`/risco`); salvo em `risk_curation_feedback` e injetado no contexto da IA (predictive-risk + RAG) para não repetir o erro. |
| Jun/2026 | **Timeline sem duplicação**: interações geradas a partir de um esforço (`time_entry_id` setado, `source='effort_sync'`) deixam de aparecer como item separado — o esforço (time_entry) já é o registro. Interações avulsas (upload de transcrição/manuais) seguem normais. |
| Jun/2026 | **Central de Alertas (`/alertas`)**: catálogo consolidado sobre `proactive_alerts` (tipos nativos + `sla_breach`/`new_ticket`/`discrepancy`/`stale_score`). **Escopo global** para super_admin/head (vê alertas de todas as contas + responsável). **Tratamento derivado** do estado da entidade vinculada (`linked_entity_type`/`linked_entity_id`): o alerta gera uma `csm_task` (via `alert_id`) e fica "Tratado" quando a tarefa é concluída; alertas de ticket leem o status do chamado. **Leitura por usuário** (`alert_reads`): clique marca como lida, com "marcar como não lida" e "marcar todas". **Sino único** `AlertBell` substitui os dois sininhos (NotificationCenter + AlertCenter). Cron `proactive-alerts` corrigida (filtrava `accounts.contract_status`, coluna inexistente → nunca gerava alertas) + `POST /api/alerts/evaluate` ("Avaliar agora"). |
| Jun/2026 | **Exclusão de interação com confirmação** (`InteractionDetailModal`): ao remover, um diálogo lista o raio de impacto (wishlist, RAG, tarefas sugeridas, esforço espelho) e a exclusão é em cascata via `effort-cascade.ts` (sem órfãos). |

---

## 2.4 Segmentação Dinâmica (F2-03 — Mai/2026)

**Objetivo:** Permitir aos CSMs filtrar e segmentar contas rapidamente sem depender de saved views complexas.

### 2.4.1 Filtros Disponíveis

| Filtro | Tipo | Valores |
|--------|------|---------|
| **Health Status** | select | `healthy`, `at-risk`, `critical` |
| **Segmento** | select | `Indústria`, `MRO`, `Varejo`, `Distribuidor` |
| **MRR Mínimo** | number | >= 0 |
| **MRR Máximo** | number | >= 0 |
| **Status Contrato** | select | `active`, `at-risk`, `churned`, `in-negotiation` |
| **Adoção Mín %** | number | 0–100 |
| **Adoção Máx %** | number | 0–100 |

### 2.4.2 Componentes

**AccountFilterBuilder** (`src/app/(dashboard)/accounts/components/AccountFilterBuilder.tsx`)
- UI collapsible com Label "Filtrar Contas"
- Badge mostrando número de filtros ativos
- Botão "Limpar" quando há filtros
- Input fields para ranges (MRR, Adoption)
- Select dropdowns para enums

**Query Parameters (GET /api/accounts)**
```
GET /api/accounts?health_status=at-risk&segment=MRO&mrr_min=5000&mrr_max=50000
```

Validação com Zod: `AccountFilterSchema`

### 2.4.3 Segmentos Padrão (Saved Views)

4 segmentos pré-configurados aparecem em dropdown ou sidebar:

1. **Em Risco** — `health_status = 'at-risk'`
2. **Enterprise** — `mrr >= 10000`
3. **Renovação 90d** — `renewal_date <= today + 90 days`
4. **SMB** — `mrr <= 3000`

### 2.4.4 Performance

Índices criados:
- `idx_accounts_health_status`
- `idx_accounts_segment`
- `idx_accounts_csm_owner_id`
- `idx_accounts_health_segment` (composite)
- `idx_contracts_account_status`

Filtros MRR e Contract Status rodam in-memory (limitar a 1000+ accounts por seção)

### 2.4.5 RLS

CSMs só veem contas onde `csm_owner_id = auth.uid()` (aplicado no GET /api/accounts)

---

## 2.5 Playbooks de Sucesso (F3-01 — Mai/2026)

**Objetivo:** Estruturar jornadas padronizadas de tarefas para guiar CSMs em fluxos comuns (onboarding, re-engagement, etc.).

### 2.5.1 Arquitetura

| Tabela | Propósito |
|--------|-----------|
| `playbook_templates` | Definição da jornada (nome, descrição, gatilho) |
| `playbook_tasks` | Tarefas unitárias de um template (passo 1, 2, 3...) |
| `account_playbooks` | Instância de execução para uma conta específica |
| `account_playbook_tasks` | Status de cada tarefa (`pending`, `completed`, `skipped`) |

### 2.5.2 Tipos de Tarefas

| Tipo | Descrição |
|------|-----------|
| `manual` | Ação manual do CSM (ex: "Revisar adoção") |
| `email` | Disparo de e-mail (template sugerido por IA) |
| `meeting` | Agendamento de call (ex: "QBR de Aligna") |
| `review` | Revisão estruturada (ex: "Analisar SLA") |

### 2.5.3 Ciclo de Vida

1. **Criação Manual**: CSM clica "Iniciar Playbook" em account detail
2. **Seleção**: Modal exibe playbook_templates ativos
3. **Instanciação**: Sistema cria `account_playbooks` + `account_playbook_tasks` (todas `pending`)
4. **Execução**: Tarefas são marcadas como `completed` (via `PlaybookHistoryModal` ou `PlaybookWidget`)
5. **Conclusão**: Quando todas completadas, botão "Mover para Timeline" encerra a jornada

### 2.5.4 Endpoints

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/playbooks` | GET | Lista templates ativos com tarefas |
| `/api/accounts/[id]/playbooks` | POST | Cria instância para conta |
| `/api/account-playbooks/[id]/tasks/[taskId]` | PATCH | Atualiza status de task |

Payload PATCH:
```json
{
  "status": "completed",
  "notes": "Cliente confirmou adoção de X"
}
```

### 2.5.5 UI

**Páginas:**
- `/playbooks` — CRUD de templates (grid de cards com status ativo/inativo)
- `/accounts/[id]` — `PlaybookWidget` no sidebar ou seção dedicada

**Componentes:**
- `PlaybookWidget` — Mostra playbook em progresso + checklist + progress bar
- `PlaybookHistoryModal` — Histórico de playbooks finalizados + botão "Concluir Task"
- `AccountFilterBuilder` — Inclui futura filtragem por "Contas com Playbook Ativo"

### 2.5.6 Segurança (RLS)

- CSMs veem playbooks só de suas contas
- CSMs atualizam tasks só de playbooks que criaram (`csm_owner_id = auth.uid()`)
- Templates são públicos entre CSMs

### 2.5.7 Roadmap Futuro

- [ ] Gatilho automático por health_score < 40 ou NPS < 5
- [ ] Automação de e-mail (via Resend/SendGrid)
- [ ] Notificações quando task vence prazo
- [ ] Métricas: tempo médio de conclusão, taxa de abandono
- [ ] Templates multi-idioma

---

## 2.6 Alertas Proativos (F3-02)

**Visão Geral:**

Motor automático que monitora 6 indicadores-chave de saúde por conta diariamente. Alertas são categorizados por severidade e podem ser manualmente resolvidos. CSMs veem apenas alertas de suas contas (RLS).

### 2.6.1 Os 6 Tipos de Alerta

| Tipo | Severidade | Trigger | Recomendação |
|------|-----------|---------|--------------|
| **Churn Risk** | 🔴 Crítico | `health_score_v2 < 40` | Agendar QBR imediato com executivo |
| **Silent Customer** | 🟡 Aviso | 21+ dias sem interação | Enviar check-in email ou agendar health check call |
| **Renewal Upcoming** | 🔴 Crítico (≤30d) / 🟡 Aviso (≤60d) | Contrato vence em ≤ 60 dias | Revisar NPS, adoption, preparar renewal proposal |
| **Adoption Anomaly** | 🟡 Aviso | Adoção cai > 20% vs mês anterior | Investigar qual feature foi desativada e por quê |
| **Expansion Signal** | 🔵 Info | NPS ≥ 9 + MRR < mediana segmento | Mapear oportunidades de add-on ou upsell |
| **NPS Detractor Unactioned** | 🟡 Aviso | Score ≤ 6 sem follow-up 7+ dias | Criar ticket de investigação ou QBR |

### 2.6.2 Duração e Frequência

- **Cron diário:** `POST /api/cron/proactive-alerts` executa a cada 24h
- **Rate deduplicação:** 1 alerta por (account_id, type) por dia máximo
- **Persistência:** Alertas resolvidos ficam na BD com `resolved_at IS NOT NULL`
- **Histórico:** CSMs podem ver alertas resolvidos passados (filtrando `?resolved=true`)

### 2.6.3 Fluxo Lifecycle do Alerta

```
1. Cron dispara a cada dia (configurable)
   ↓
2. AlertService avalia todos os 6 checks para cada conta
   ↓
3. Se alerta ativado:
   - Verifica se já existe não-resolvido do mesmo tipo (mesmo dia)
   - Se SIM: skip (deduplicação)
   - Se NÃO: insere novo registro
   ↓
4. CSM vê alerta em AlertCenter (drawer lateral)
   ↓
5. CSM clica "Resolver" → PATCH /api/proactive-alerts/[id]/resolve
   ↓
6. Backend marca resolved_at = now() e updated_at = now()
   ↓
7. Alerta desaparece da lista de "pendentes" mas fica no histórico
```

### 2.6.4 Metadados de Contexto

Cada alerta armazena `metadata` JSON com detalhes operacionais:

```typescript
// Exemplo Churn Risk
{
  "health_score": 35.5,
  "threshold": 40,
  "recommendation": "Agendar QBR imediato com executivo"
}

// Exemplo Silent Customer
{
  "days_silent": 25,
  "last_interaction": "2025-04-12T10:30:00Z",
  "recommendation": "Enviar check-in email ou agendar health check call"
}

// Exemplo Renewal Upcoming
{
  "renewal_date": "2025-06-15T00:00:00Z",
  "days_until": 39,
  "current_mrr": 5000,
  "recommendation": "Revisar NPS, adoption gains, e preparar renewal proposal"
}

// Exemplo Adoption Anomaly
{
  "this_month_rate": "85.0",
  "last_month_rate": "92.5",
  "drop_percent": "8.1",
  "features_disabled": 2,
  "recommendation": "Analisar qual(is) feature(s) foram desativadas"
}

// Exemplo Expansion Signal
{
  "current_nps": "9.2",
  "current_mrr": 5000,
  "segment_median_mrr": 7500,
  "expansion_potential": "2500.00",
  "recommendation": "Mapear novas oportunidades (add-on, upsell) com cliente"
}

// Exemplo NPS Detractor Unactioned
{
  "nps_score": 4,
  "responded_at": "2025-04-28T14:20:00Z",
  "days_without_followup": 9,
  "nps_response_id": "uuid-123",
  "recommendation": "Criar ticket de investigação ou contatar cliente via QBR"
}
```

### 2.6.5 UI: AlertCenter

**Localização:** Sidebar (ao lado de NotificationCenter)
- Ícone Bell com Badge de contagem de críticos
- Dot pulsante 🔴 quando há alertas críticos
- Clique abre Drawer lateral (width: 24rem)

**Drawer Content:**
- Título: "Alertas Proativos (N)"
- Cards por alerta, coloridos por severidade
- Cada card mostra: ícone (🔴/🟡/🔵), severidade, mensagem, recomendação
- Botão "X" para resolver alerta
- Loading state durante PATCH

**Polling:** 30 segundos (React Query refetchInterval)

### 2.6.6 APIs REST

| Método | Endpoint | Query | Resposta |
|--------|----------|-------|----------|
| **GET** | `/api/proactive-alerts` | `?severity=critical&limit=50&resolved=false` | `ProactiveAlert[]` |
| **PATCH** | `/api/proactive-alerts/[id]/resolve` | — | `ProactiveAlert` (atualizado) |

**Parâmetros GET:**
- `severity`: Filter por `critical`, `warning`, `info` (opcional)
- `limit`: Máximo de alertas retornados (default: 50)
- `resolved`: Se `true`, inclui alertas resolvidos (default: false = pendentes)

**RLS:** CSM vê apenas alertas de contas que gerencia (`csm_owner_id = auth.uid()`)

### 2.6.7 Segurança

- ✅ RLS: CSM SELECT/UPDATE apenas suas contas
- ✅ Cron usa `getSupabaseAdminClient()` para processar todas as contas
- ✅ API requer `x-api-secret` header para validar cron
- ✅ Buscas filtrando por `account_id IN (SELECT id FROM accounts WHERE csm_owner_id = auth.uid())`

### 2.6.8 Performance & Índices

- `idx_proactive_alerts_account_id`: Query por conta (common filter)
- `idx_proactive_alerts_severity`: Filter por severidade
- `idx_proactive_alerts_created_at`: Ordenação temporal DESC
- `idx_proactive_alerts_type`: Agrupamento por tipo de alerta
- `idx_proactive_alerts_resolved`: Query resolvidos vs pendentes
- `proactive_alerts_daily_uniq`: UNIQUE INDEX `(account_id, type, DATE(created_at))` WHERE `resolved_at IS NULL`

### 2.6.9 Roadmap Futuro (Pós F3-02)

- [ ] Alertas por e-mail automático (Resend/SendGrid)
- [ ] Webhooks para integração com Slack/Teams
- [ ] Bulk resolve (marcar múltiplos como resolvidos)
- [ ] Snooze alertas (adiar 3/7 dias)
- [ ] Métricas: tempo médio de resolução, taxa de false positives
- [ ] Custom thresholds por CSM ou account

---

---

## 2.7 Success Plans (F3-03)

**Visão Geral:**

Feature de compartilhamento de planos de sucesso com clientes. CSMs criam metas com títulos, descrições e datas-alvo. Ao compartilhar, gera link público (via UUID token) que clientes podem visualizar sem autenticação.

### 2.7.1 Tipos de Dados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `SuccessPlan.id` | UUID | PK |
| `SuccessPlan.account_id` | UUID | FK para accounts |
| `SuccessPlan.title` | text | Nome do plano (ex: "Plano de Sucesso 2026") |
| `SuccessPlan.shared_token` | UUID UNIQUE | Token público para compartilhamento |
| `SuccessPlan.created_by` | UUID | CSM que criou |
| `SuccessPlan.created_at`, `.updated_at`, `.deleted_at` | timestamptz | Timestamps (soft-delete) |
| `SuccessPlanGoal.id` | UUID | PK |
| `SuccessPlanGoal.plan_id` | UUID | FK para success_plans |
| `SuccessPlanGoal.title` | text | Nome da meta |
| `SuccessPlanGoal.description` | text | Descrição opcional |
| `SuccessPlanGoal.target_date` | date | Data-alvo opcional |
| `SuccessPlanGoal.status` | enum | `pending \| ongoing \| completed \| delayed` |
| `SuccessPlanGoal.completed_at` | timestamptz | Quando foi marcado como completo |

### 2.7.2 Fluxo de Criação

```
CSM abre /accounts/[id]/success-plan
    ↓
Clica "Adicionar Meta"
    ↓
Preenche: título, descrição (opt), data (opt)
    ↓
POST /api/accounts/[id]/success-plans/goals
    ↓
Backend:
  - Valida ownership (CSM = csm_owner_id)
  - Busca SuccessPlan ativo (deleted_at IS NULL)
  - Se não existe: cria com título default "Plano de Sucesso - 2026"
  - Insere goal com status 'pending'
    ↓
Frontend: refetch goals, mostra na lista com Badge "Pendente"
```

### 2.7.3 Fluxo de Compartilhamento

```
CSM vê botão "Compartilhar Link"
    ↓
Clica → Copia URL para clipboard
    ↓
URL format: https://app.local/public/success-plans/[shared_token]
    ↓
CSM compartilha com cliente via e-mail, Teams, etc
    ↓
Cliente abre link → Vê SuccessPlanPage (read-only)
    ↓
Cliente vê:
  - Título do plano
  - Lista de metas com status
  - Progress bar visual
  - Data-alvo e completed_at de cada meta
  - SEM botões de edição
```

### 2.7.4 Gerenciamento de Metas

**Status Transitions:**

- `pending` → `ongoing` → `completed` (ideal)
- `pending` → `delayed` (se passou target_date)
- Qualquer status → `pending` (reset)

**Ações:**
- ✏️ Editar: título, descrição, target_date, status
- ✅ Marcar como Concluído: atualiza status + completed_at
- 🗑️ Remover: soft-delete (set deleted_at)

**UI Status Badge:**
- 🔴 Pendente (gray)
- 🔵 Em andamento (blue)
- ✅ Concluído (green)
- ⚠️ Atrasado (red)

### 2.7.5 API Endpoints

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/accounts/[id]/success-plans` | GET | JWT (CSM) | Fetch plano + goals de uma conta |
| `/api/accounts/[id]/success-plans/goals` | POST | JWT (CSM) | Criar meta (auto-cria plano se necessário) |
| `/api/accounts/[id]/success-plans/goals/[goalId]` | PATCH | JWT (CSM) | Atualizar meta |
| `/api/accounts/[id]/success-plans/goals/[goalId]` | DELETE | JWT (CSM) | Soft-delete meta |
| `/api/public/success-plans/[token]` | GET | Public | View-only (sem auth, usa token) |

### 2.7.6 Páginas

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/accounts/[id]/success-plan` | Client Page | CSM edita plano + goals |
| `/public/success-plans/[token]` | Server Page | Cliente vê plano (read-only) |

**CSM Page Features:**
- Formulário em card: input título, textarea descrição, input date
- Lista de goals com cards coloridos por status
- Botões: ✅ Concluído, 🗑️ Remover, 📋 Copiar link
- React Query polling: 30s refetch automático
- Loader states + toast notifications (sonner)

**Public Page Features:**
- Header com título + progress %
- Progress bar visual com cor verde
- Cards por meta com ícone de status
- Read-only (sem forms, sem buttons de editar)
- Responsive mobile-friendly
- Sem navbar, sem auth, apenas visualização

### 2.7.7 Segurança (RLS)

- CSM SELECT/INSERT/UPDATE goals: apenas de contas que gerencia
- Public endpoint: SEM auth, usa token UUID como "segurança por obscuridade" (gênero de link compartilhado)
- Buscas filtram `deleted_at IS NULL` sempre

### 2.7.8 Performance & Indices

- `idx_success_plans_account_id`: Query por conta (comum)
- `idx_success_plans_shared_token`: Lookup público por token
- `idx_success_plan_goals_plan_id`: Goals de um plano
- `idx_success_plan_goals_status`: Filtrar por status
- Todos com `WHERE deleted_at IS NULL` para soft-delete

### 2.7.9 Auto-Create Plan

Quando CSM cria a **primeira meta** de uma conta:
- Sistema verifica se SuccessPlan existe (deleted_at IS NULL)
- Se não existe: insere automáticamente com:
  - `title`: `"Plano de Sucesso - " + currentYear()`
  - `account_id`: conta atual
  - `created_by`: CSM autenticado
  - `shared_token`: gen_random_uuid()

### 2.7.10 Soft-Delete

Todas as queries de leitura filtram `deleted_at IS NULL`. Permite:
- ✅ Auditoria: histórico preservado
- ✅ Recover: pode reativar se necessário (futura feature)
- ✅ GDPR: marcar como deletado sem destruir

### 2.7.11 Roadmap Futuro (Pós F3-03)

- [ ] Automação: Criar plano via playbook trigger
- [ ] Compartilhar: Múltiplos destinatários (array de e-mails)
- [ ] Sync: Atualizar status via webhook do cliente
- [ ] Template: Salvar planos como templates para reutilizar
- [ ] Métricas: Taxa de conclusão, dias até conclusão média
- [ ] Notificações: E-mail quando meta completada (pro cliente)

---

## 2.8 Changelog Accounts (F2-02 até Presente)

| Data | Feature |
|------|---------|
| Abr/2026 | F2-01: Timeline unificada + Contract Events |
| Mai/2026 | F2-02: Health Score v2 (ponderado) + cron daily |
| Mai/2026 | F2-03: Filtros dinâmicos + 4 segmentos padrão |
| Mai/2026 | F3-01: Playbooks MVP + manual trigger |
| Mai/2026 | F3-02: Motor de Alertas Proativos (6 tipos + cron diário) |
| Mai/2026 | F3-03: Success Plans com compartilhamento público via UUID token |
