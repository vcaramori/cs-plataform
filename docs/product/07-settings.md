# 7. Settings — Configurações Administrativas

## Visão Geral do Módulo

O módulo **Settings** permite a gestão de configurações administrativas do sistema. Inclui gerenciamento de planos, features, horários de trabalho e políticas de SLA.

**Caminhos:**
- `/settings/plans` → Gerenciamento de planos
- `/settings/features` → Gerenciamento de features
- `/settings/business-hours` → Horários de trabalho (global e por conta)
- `/settings/sla` → Política SLA global Plannera (prazos padrão por nível)

---

## 7.1 Telas do Módulo

### 7.1.1 Dashboard (`/settings`)

| Seção | Descrição |
|-------|-----------|
| Planos | Número de planos ativos |
| Features | Número de features cadastradas |
| Business Hours | Horários configurados |
| SLA Policies | Políticas configuradas |

### 7.1.2 Planos (`/settings/plans`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Nome | Text | Nome do plano |
| Descrição | Text | Descrição detalhada |
| Preço | Number | Valor mensal |
| Features Incluídas | Multi-select | Features do plano |
| Limites | JSON | Limites específicos |
| Status | Toggle | Ativo/Inativo |

### 7.1.3 Features (`/settings/features`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Nome | Text | Nome da feature |
| Chave | Text | Identificador único |
| Descrição | Text | Descrição |
| Categoria | Select | Categoria da feature |
| Status | Toggle | Ativo/Inativo |

### 7.1.4 Business Hours (`/settings/business-hours`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Dia da Semana | Select | Dia (segunda a domingo) |
| Início | Time | Hora de abertura |
| Fim | Time | Hora de fechamento |
| Timezone | Select | Timezone |
| Exceções | Array | Feriados/exceções |

### 7.1.5 Política SLA Global (`/settings/sla`)

Página para configurar o SLA padrão Plannera, herdado por todos os contratos que não possuem SLA customizado.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Nível | Display | Crítico / Alto / Médio / Baixo |
| 1ª Resposta (min) | Number | Prazo máximo para primeira resposta |
| Resolução (min) | Number | Prazo máximo para resolução |
| Alerta de Proximidade (%) | Number | % do prazo restante que dispara alerta visual |
| Fechamento Automático (h) | Number | Horas após resolução para fechar ticket sem interação |
| Fuso Horário Base | Select | Timezone para cálculo dos prazos (default: America/Sao_Paulo) |

**Comportamento:** alterações na política global afetam apenas novos tickets em contratos que usam o padrão Plannera. Tickets já abertos não são retroativamente afetados.

---

## 7.2 Regras de Negócio

### Planos
- Nome único no sistema
- Preço não pode ser negativo
- Pelo menos uma feature obrigatória

### Features
- Chave única ( kebab-case )
- Categoria deve existir

### Business Hours
- Não permite sobreposição de horários
- Timezone deve ser válida

### SLA
- Tempo de 1ª resposta ≤ tempo de resolução por nível
- Política global é única no sistema (somente uma linha com `is_global = true`)
- Contratos com `sla_use_global = true` herdam esta política; com `false` usam seus mapeamentos De/Para

---

## 7.3 Componentes Visuais

### Header
- Breadcrumb: "Dashboard > Settings"
- Título: "Configurações"

### SettingsNavigation
- Sidebar com links para cada tela
- Indicador de página atual

### PlansTable / FeaturesTable / SLA.Table
- Listas com ações de editar/excluir
- Busca e filtros

---

## 7.4 Interações do Usuário

| Ação | Gatilho | Resultado |
|------|---------|-----------|
| Acessar configuração | Clique no menu | Navega para tela |
| Criar | Clique em "Novo" | Abre formulário |
| Editar | Clique em editar | Abre modal com dados |
| Salvar | Clique em salvar | Persiste alterações |
| Excluir | Clique em excluir | Remove registro |

---

## 7.5 Requisitos Técnicos

### Autenticação
🔒 **Obrigatória** — apenas admins

### Dados
| Tabela | Acesso |
|--------|--------|
| `plans` | Full access |
| `features` | Full access |
| `business_hours` | Full access |
| `sla_policies` | Full access |

---

## 7.6 Histórico

| Data | Alteração |
|------|------------|
| Abr/2026 | Versão inicial |
| Abr/2026 | Adicionada página `/settings/sla` com política global (prazos por nível, threshold de alerta, fechamento automático) |