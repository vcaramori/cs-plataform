# 6. Esforço — Registro de Tempo

## Visão Geral do Módulo

O **Esforço** permite aos CSMs registrarem o tempo gasto em atividades de Customer Success. O sistema oferece extração automática de informações via NLP com fallback manual.

**Caminho:** `/esforco`

## Data do evento + tag de onboarding + vetorização no RAG (2026-06-09)

Para permitir **carga de contexto histórico** (interações antigas) e melhorar o RAG, o lançamento de esforço ganhou:
- **Data do evento (opcional)** — vazia = hoje/IA; **preenchida = data real** em que ocorreu. Vai no `time_entries.date`, na `interaction` criada e no texto vetorizado (não usa a data do upload). Campo em [EsforcoKPIs.tsx](../../src/app/(dashboard)/esforco/components/EsforcoKPIs.tsx); tratado em [api/time-entries/route.ts](../../src/app/api/time-entries/route.ts) (`date` → `effectiveDate`).
- **Toggle "É ação de onboarding?"** — apenas **classifica** o registro como onboarding (`activity_type='onboarding'` + rótulo `[ONBOARDING]` no RAG). **Não** dispara o projeto de onboarding (templates/marcos/Gantt). Para implantações em andamento, use o projeto de onboarding na conta.
- **Vetorização no RAG** — quando o esforço gera uma `interaction` (reunião/onboarding/qbr ou risco/positivo), ela passa a ser **indexada** (`storeEmbeddings`, `source_type='interaction'`) com a **data embutida no `chunk_text`** → busca semântica com contexto temporal correto. Antes só alimentava o "Journal de Esforço".

> Carga histórica = exceção; o uso normal (sem data) segue idêntico.

---

## 1.1 Regras de Negócio

| Regra | Descrição |
|------|-----------|
| **Activity Types** | `preparation` (Preparo), `strategy` (Estratégia), `reporting` (Relatórios), `meeting` (Reunião), `support` (Suporte), `training` (Treinamento), `travel` (Deslocamento), `admin` (Admin) |
| **NLP Extraction** | Analisa descrição textual para detectar activity_type e account_id |
| **Confidence Threshold** | ≥ 0.8 para auto-detecção, caso contrário solicita confirmação |
| **Manual Override** | Usuário pode sobrescrever tipo detectado |
| **Duração Mínima** | 5 minutos |
| **Duração Máxima** | 8 horas por registro |
| **Data Futura** | Não permite registrar para datas futuras |

### Fluxo NLP

```
1. [Usuário descreve atividade]
2. [API analisa texto]
3. [Detecta activity_type e account_id]
4. [Se confidence ≥ 0.8 → preenche campos]
5. [Se confidence < 0.8 → sugere valores em branco]
6. [Usuário confirma ou corrige]
7. [Salva registro]
```

---

## 1.2 Componentes Visuais

### Header
- Breadcrumb: "Dashboard > Esforço"
- Título: "Registro de Esforço"

### EsforcoKPIs (Área de Input)
- **Textarea**: Campo único para digitar a atividade em linguagem natural (ex: "Passei 2h preparando o deck...").
- **Seletor de Conta**: Dropdown para selecionar a conta manualmente ou deixar em "Filtrar por Conta" (o sistema tentará detectar via IA).
- **Botão Registrar**: Dispara a chamada para a API.
- **Exemplos**: Cards com exemplos de frases para ajudar o usuário.

### EsforcoChart
- Gráfico de Pareto mostrando as horas acumuladas por conta.

### EsforcoTable
- Lista os registros de tempo do usuário.
- Colunas: Data, Conta, Atividade (Tipo e Descrição), Horas.
- Ações: Editar (abre modal).

---

## 1.3 Fluxo de Dados

```
[Usuário digita descrição e opcionalmente seleciona a conta]
    ↓
[Clique em "Registrar"]
    ↓
[POST /api/time-entries]
  Payload: { raw_text: string, account_id?: string }
    ↓
[API processa via Gemini AI]
    ├─ Extrai hours, activity_type, parsed_description
    └─ Detecta account_id (se não enviado)
    ↓
[Se account_id não detectado nem enviado]
    ↓ Retorna 422 { error, parsed }
[Front-end exibe toast "LOGO não identificado. Selecione manualmente"]
    ↓
[Usuário seleciona conta no dropdown e tenta novamente]
    ↓
[Se sucesso: Retorna 200 com a entry criada]
    ↓
[Front-end adiciona ao topo da lista e exibe toast de sucesso]
```

---

## 1.4 Interações do Usuário

| Ação | Gatilho | Resultado |
|------|---------|-----------|
| Registrar esforço | Preenchimento do texto + clique em "Registrar" | Envia para API e processa via IA |
| Selecionar conta | Dropdown de contas | Define a conta explicitamente (ignora detecção de conta da IA) |
| Editar registro | Clique na linha/ícone de edição | Abre o `EffortEditModal` |
| Atualizar registro | Salvar no modal | Atualiza a lista local e persiste |

---

## 1.5 Requisitos Técnicos

### Autenticação
🔒 **Obrigatória** — redireciona para `/login` se não autenticado

### Dados
- **Tabela:** `time_entries`
- **RLS:** entries pertencentes ao CSM logado

### API Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/time-entries` | Lista entries do usuário |
| POST | `/api/time-entries` | Criar entry (processa via IA) |
| PATCH | `/api/time-entries/[id]` | Atualizar entry |
| DELETE | `/api/time-entries/[id]` | Excluir entry |

---

## 1.6 Casos de Borda

| Caso | Comportamento |
|------|----------------|
| Texto vazio | Toast "Digite o que você fez" |
| IA não detecta logo | Erro 422, exige seleção manual no front-end |
| Confiança da IA < 0.8 | Registro criado mas marcado como `pending_review` no banco |
| Palavras de crise no texto | Força sentimento `-0.8` e gera interação de risco |
| Palavras de sucesso no texto | Força sentimento `0.8` e gera interação positiva |

---

## 1.7 Histórico

| Data | Alteração |
|------|------------|
| Abr/2026 | Versão inicial |