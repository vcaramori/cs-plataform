# 3. NPS — Net Promoter Score

## Visão Geral do Módulo

O módulo **NPS** permite aos CSMs coletar e analisar o Net Promoter Score dos seus clientes. Inclui gestão de programas de pesquisa, widget embedável para coleta de respostas, e dashboard analítico com cálculo de NPS.

**Caminhos:**
- Dashboard: `/nps`
- Programas: `/nps/programs`
- Detalhe do Programa: `/nps/programs/[id]`
- Embed: `/nps/embed?program_key=X` (público)

---

## 3.1 Telas do Módulo

### 3.1.1 Dashboard de NPS (`/nps`)

Dashboard consolidado com estatísticas de NPS para todos os clientes do CSM.

| Seção | Componentes |
|-------|-------------|
| **Scorecard** | NPS Score, Média, total de respostas |
| **Segmentos** | Promoters, Passives, Detractors (barras) |
| **Filtros** | Período (date_from, date_to), Programa, Conta |
| **Respostas** | Lista de respostas recentes com nota, segmento, conta |
| **Ações** | Export XLSX, Definir Meta |

---

### 3.1.2 Gestão de Programas (`/nps/programs`)

Lista e gestão de programas de NPS.

| Seção | Componentes |
|-------|-------------|
| **Lista** | Cards de programas com status, tipo, respostas |
| **Filtros** | Ativos/Inativos, Globais/por Conta |
| **Ações** | Criar Programa |

---

## 3.2 Regras de Negócio

### 3.2.1 Fórmula NPS

```
NPS Score = ((Promoters - Detractors) / Total de Respostas) × 100
```

### 3.2.2 Segmentos

| Nota | Segmento | Classificação |
|------|----------|---------------|
| 9-10 | **Promoter** | Recomendador |
| 7-8 | **Passive** | Passivo |
| 0-6 | **Detractor** | Detrator |

### 3.2.3 Tipos de Programa

| Tipo | `account_id` | Abrangência |
|------|--------------|------------|
| **Global** | `null` | Todos os clientes do CSM |
| **Account-specific** | UUID | Apenas conta específica |

### 3.2.4 Regras de Programa

| Campo | Obrigatório | Default | Descrição |
|-------|-------------|---------|------------|
| `name` | Não | - | Nome do programa |
| `question` | Não | "Qual a probabilidade..." | Pergunta NPS |
| `open_question` | Não | "Qual o motivo..." | Pergunta aberta |
| `recurrence_days` | Não | 90 | Dias entre envios (global) |
| `dismiss_days` | Não | 30 | Dias para re-enviar se ignorado |
| `account_recurrence_days` | Não | 30 | Dias entre envios (por conta) |

### 3.2.5 is_default

| Regra | Comportamento |
|-------|---------------|
| Único por CSM | Apenas um programa default por CSM |
| Alternância automática | Ao definir novo, limpa o anterior |
| Dashboard | Stats usam programa default se não especificado |
| Inativação | Clears is_default automaticamente |

### 3.2.6 is_test_mode

| Regra | Comportamento |
|-------|---------------|
| Único por CSM | Apenas um programa em test mode por CSM |
| Respostas de teste | Marcadas com `is_test = true`, descartadas do score |
| Alternância automática | Ao ativar, desativa outro |
| Alternância off | Remove respostas de teste automaticamente |
| Inativação | Clears is_test_mode e remove respostas de teste |

### 3.2.7 recurrence_days

| Cenário | Regra |
|--------|------|
| Programa global | Envia para todos os clientes a cada `recurrence_days` |
| Programa por conta | Envia para a conta específica a cada `account_recurrence_days` |
| Usuário respondeu | Não re-enviar por `dismiss_days` |
| Ignorado | Re-enviar após `dismiss_days` |

### 3.2.8 Embed Widget

| Regra | Descrição |
|-------|-----------|
| Endpoint | `/api/nps/check?program_key=X&email=Y` |
| Busca programa | Por program_key ou usa default do CSM |
| Retorno | Questões do programa (ordenadas por order_index) |
| Resposta | POST `/api/nps/response` com answers |
| Validação | Verifica se email já respondeu no período |

### 3.2.9 Tipos de Pergunta

| Tipo | Descrição | Campo |
|------|-----------|-------|
| `nps_scale` | Nota 0-10 | `text_value` (string"0"-"10") |
| `multiple_choice` | Escolha única | `selected_options` (array) |
| `text` | Texto livre | `text_value` |

---

## 3.3 Componentes Visuais

### 3.3.1 NPSDashboard

Componente do dashboard:

| Elemento | Descrição |
|----------|-----------|
| ScoreCard | NPS score com cor (verde > 0, vermelho < 0) |
| SegmentBars | Barras de promoters/passives/detractors |
| ResponseList | Lista paginada de respostas |
| Filters | DateRangePicker, Select, Select |

### 3.3.2 ProgramList

Lista de programas:

| Elemento | Descrição |
|----------|-----------|
| ProgramCard | Nome, tipo, status, contadorderespostas |
| Toggle Ativo | Ativa/inativa programa |
| Toggle Default | Define como default |
| Toggle Test Mode | Entra em modo teste |
| Botão Editar | Navega `/nps/programs/[id]` |
| Botão Excluir | Remove (se sem respostas reis) |

### 3.3.3 ProgramForm

Formulário de programa:

| Bloco | Campos |
|------|--------|
| **Identificação** | Nome, Tipo (Global/Conta) |
| **Perguntas** | Question, Open Question |
| **Recorrência** | Recurrence Days, Dismiss Days, Account Recurrence Days |
| **Datas** | Active From, Active Until |

---

## 3.4 Interações do Usuário

| Ação | Gatilho | Resultado |
|------|---------|-----------|
| Ver dashboard | Acesso `/nps` | Carrega stats do programa default |
| Criar programa | Clique "Criar" | Abre form, POST `/api/nps/programs` |
| Editar programa | Clique card | POST PATCH `/api/nps/programs?id=X` |
| Deletar programa | Clique excluir | DELETE se sem respostas reais |
| Definir default | Toggle | Ativa is_default, limpa outro |
| Ativar teste | Toggle | Ativa is_test_mode, limpa outro |
| Responder | Submit embed | POST `/api/nps/response` |
| Exportar | Clique Export | Gera XLSX com respostas |

---

## 3.5 Fluxo de Dados

### 3.5.1 Dashboard (Carregamento)

```
[Acesso /nps]
    ↓
[Busca programas default do CSM]
    ↓
[Se account_id: usa program_key específico]
    ↓
[Busca respostas no período (date_from - date_to)]
    ↓
[Calcula NPS Score]
    ↓
[Renderiza NPSDashboard]
```

### 3.5.2 Resposta Embed

```
[Acesso /nps/embed?program_key=X&email=Y]
    ↓
[GET /api/nps/check: busca programa]
    ↓
[Busca última resposta do email no período]
    ↓
[Se já respondeu: retorna "already_responded"]

[Renderiza widget com perguntas]
    ↓
[Submit: POST /api/nps/response]
    ↓
[Salva answers + calcula score]
    ↓
[Renderiza feedback "Obrigado"]
```

### 3.5.3 Export XLSX

```
[Clique "Export XLSX"]
    ↓
[Busca todas as respostas do período]
    ↓
[Mapeia para formato tabular]
    ↓
[Gera arquivo .xlsx]
    ↓
[Download no browser]
```

---

## 3.6 Requisitos Técnicos

### 3.6.1 Autenticação

🔒 **Obrigatória** — Dashboard e gestão de programas.

🔓 **Pública** — Embed widget (`/nps/embed` e `/api/nps/check`, `/api/nps/response`).

### 3.6.2 Dados

| Tabela | Acesso |
|--------|--------|
| `nps_programs` | RLS: apenas programas do CSM |
| `nps_questions` | RLS: join via program |
| `nps_responses` | RLS: apenas contas do CSM |
| `nps_answers` | RLS: join via response |

### 3.6.3 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/nps/stats` | Estatísticas ( NPS, médias, segmentação) |
| GET | `/api/nps/programs` | Lista programas |
| POST | `/api/nps/programs` | Criar programa |
| PATCH | `/api/nps/programs?id=X` | Atualizar programa |
| DELETE | `/api/nps/programs?id=X` | Deletar programa |
| GET | `/api/nps/check` | Busca programa (público) |
| POST | `/api/nps/response` | Enviar resposta (público) |
| POST | `/api/nps/goals` | Definir meta NPS |
| POST | `/api/nps/rag` | Ingerir no RAG |

### 3.6.4 Performance

- **Dashboard**: Server-side rendering com dados preload
- **Lista programas**: Carregamento lazy
- **Embed**: Cache de programa por 5 minutos
- **Respostas**: Paginação em 50 itens

---

## 3.7 Casos de Borda

| Caso | Comportamento |
|------|----------------|
| Sem programa default | Exibe "Configure um programa" |
| Sem respostas | Exibe "Nenhuma resposta no período" |
| Conta sem programa | Herda programa global do CSM |
| Email já respondeu | Bloqueia nova resposta no período |
| Resposta em branco | Requer pergunta NPS (nps_scale) obrigatória |
| Programa inativo | Embed retorna 404 |
| Test mode ativo | Respostas ignoradas no NPS |

---

## 3.8 Tipo TypeScript

### NPSProgram

```typescript
type NPSProgram = {
  id: string
  account_id: string | null  // null = global
  csm_owner_id: string
  program_key: string
  name: string | null
  question: string
  open_question: string
  tags: string[]
  recurrence_days: number
  dismiss_days: number
  account_recurrence_days: number
  is_active: boolean
  is_default: boolean
  is_test_mode: boolean
  active_from: string | null
  active_until: string | null
  created_at: string
  updated_at: string
  questions?: NPSQuestion[]
}
```

### NPSQuestion

```typescript
type NPSQuestion = {
  id: string
  program_id: string
  order_index: number
  type: 'nps_scale' | 'multiple_choice' | 'text'
  title: string
  options: string[] | null
  required: boolean
  created_at: string
}
```

### NPSResponse

```typescript
type NPSResponse = {
  id: string
  account_id: string
  program_key: string
  user_email: string
  user_id: string | null
  score: number | null
  comment: string | null
  tags: string[]
  dismissed: boolean
  dismissed_at: string | null
  responded_at: string | null
  is_test: boolean
  created_at: string
}
```

---

## 3.9 Histórico

| Data | Alteração |
|------|------------|
| Abr/2026 | Versão inicial — NPS dashboard + programs |
| Abr/2026 | Implementado is_default / is_test_mode |
| Abr/2026 | Add recurrence_days logic |
| Abr/2026 | Add embed widget com questionscustomizáveis |
| Abr/2026 | Add multiple_choice e text question types |
| Abr/2026 | Add Export XLSX |