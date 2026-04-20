# 6. Esforço — Registro de Tempo

## Visão Geral do Módulo

O **Esforço** permite aos CSMs registrarem o tempo gasto em atividades de Customer Success. O sistema oferece extração automática de informações via NLP com fallback manual.

**Caminho:** `/esforco`

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

### EffortForm
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Data | Date | Sim | Data da atividade |
| Início | Time | Sim | Hora de início |
| Fim | Time | Sim | Hora de término |
| Tipo | Select | Sim | Tipo de atividade |
| Conta | Select | Sim | Conta relacionada |
| Descrição | Textarea | Sim | Descrição da atividade |

### ActivityTypeSuggestions
- Badge com tipo detectado
- Confirmação rápida

### EffortHistoryTable
| Coluna | Descrição |
|--------|-----------|
| Data | Data do registro |
| Tipo | Tipo de atividade |
| Conta | Nome da conta |
| Duração | Tempo total (hh:mm) |
| Ações | Editar / Excluir |

### Estados
| Estado | Exibe |
|--------|------|
| carregando | skeleton loader |
| sucesso | toast "Esforço registrado" |
| erro | mensagem de erro |

---

## 1.3 Fluxo de Dados

```
[Usuário acessa página]
    ↓
[Renderiza formulário vazio]
    ↓
[Usuário digita descrição]
    ↓
[Dispara NLP extraction (debounce 500ms)]
    ↓
[API retorna suggestions]
    ├─ activity_type
    ├─ account_id
    └─ confidence
    ↓
[Preenche campos automaticamente]
    ↓
[Usuário ajusta e confirma]
    ↓
[POST /api/time-entries]
    ↓
[Router refresh]
```

---

## 1.4 Interações do Usuário

| Ação | Gatilho | Resultado |
|------|---------|-----------|
| Registrar esforço | Preenchimento + clique em "Registrar" | Persiste no banco |
| Auto-detectar tipo | Digitação na descrição | Sugere tipo e conta |
| Confirmar sugestão | Clique no badge | Aceita valores sugeridos |
| Editar registro | Clique em editar | Abre modal com valores |
| Excluir registro | Clique em excluir | Confirma e remove |

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
| POST | `/api/time-entries` | Criar entry |
| PATCH | `/api/time-entries/[id]` | Atualizar entry |
| DELETE | `/api/time-entries/[id]` | Excluir entry |

---

## 1.6 Casos de Borda

| Caso | Comportamento |
|------|----------------|
| Duração < 5min | Erro "Duração mínima é 5 minutos" |
| Duração > 8h | Erro "Duração máxima é 8 horas" |
| Data futura | Erro "Não é possível registrar para o futuro" |
| NLP sem confiança | Campos vazios, usa manual |
| Overlap de horário | Erro "Conflito com registro existente" |

---

## 1.7 Histórico

| Data | Alteração |
|------|------------|
| Abr/2026 | Versão inicial |