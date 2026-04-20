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
| **Direita (24%)** | Mapa de Influência (stakeholders) → Governança Contratual (contratos) → Central de Arquivos |

**Acima das 3 colunas:** `AccountHeader` com health grid e navegação.

---

### 2.1.3 Edição de Account (`/accounts/[id]/edit` e `/accounts/new`)

Formulário linear de coluna única com 4 blocos sequenciais:

| Bloco | Campos |
|-------|--------|
| **Identificação** | Logo upload, Razão Social, Nome Fantasia, Segmento, Setor, Website, CNPJ |
| **Localização** | CEP (via ViaCEP), Logradouro, Número, Complemento, Bairro, Cidade, UF, Toggle Internacional |
| **Gestão Comercial** | Contratos: MRR, ARR (calculado), Tipo de Serviço, Plano, Financial Engine (Standard/Custom toggle + `pricing_explanation` quando Custom), Cupom, Datas, Duração |
| **Faturamento e Time** | Dia vencimento, Contato faturamento (nome/e-mail/telefone), Regras, CSM Responsável, Executivo Comercial |

Todos os inputs usam `h-10 rounded-xl`. Layout full-width sem `max-w` restritivo.

---

## 2.2 Regras de Negócio

### 2.2.1 Health Score

| Condição | Classificação | Cor |
|----------|--------------|-----|
| `health_score < 40` | Em Risco | Vermelho (`#d85d4b`) |
| `health_score 40–69` | Atenção | Laranja (`#f7941e`) |
| `health_score >= 70` | Saudável | Verde-azulado (`#2ba09d`) |

Discrepância: se `|manual − shadow| > 20`, flag `discrepancy_alert` é ativado e exibe ícone de alerta pulsante no gauge.

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

### 2.3.2 AccountUnifiedTimeline

Timeline unificada de interações (estratégicas) + esforço (operacional).

| Elemento | Valor |
|----------|-------|
| Ícone | `w-8 h-8 rounded-xl` (compacto) |
| Rail | `left-8` (centro do ícone: 16px padding + 16px) — `top-4 bottom-4` |
| Gap ícone↔card | `gap-3` |
| Card | `flex-1 min-w-0 overflow-hidden` — evita overflow de texto |
| Título | `truncate` sem max-w fixo |
| Itens exibidos | Máximo 10 (slice) |
| Filtros | Feed Geral / Estratégia |

### 2.3.3 AccountsTable (Dashboard)

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
