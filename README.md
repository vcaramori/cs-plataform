# CS-Continuum — Plataforma de Customer Success da Plannera

CS-Continuum é uma plataforma interna de Customer Success construída para a Plannera. Centraliza a gestão de clientes (logos), contratos, esforço, suporte, adoção de produto, health score e NPS em um único painel — com um motor de IA (RAG) que responde perguntas em linguagem natural sobre qualquer cliente ou o portfólio inteiro.

---

> **REGRA OBRIGATÓRIA PARA AGENTES DE IA E DESENVOLVEDORES**
>
> Este arquivo é a fonte de verdade do projeto. Toda vez que uma funcionalidade for adicionada, alterada ou removida — endpoint, tabela, módulo, componente, variável de ambiente, script, comportamento de sistema — este README **deve ser atualizado na mesma sessão/PR**, antes de considerar a tarefa concluída.
>
> Isso inclui, mas não se limita a:
> - Novos endpoints de API ou alterações em endpoints existentes
> - Novas tabelas ou colunas no banco de dados
> - Novas páginas ou rotas no dashboard
> - Alterações no LLM Gateway, RAG pipeline ou health engine
> - Novas variáveis de ambiente
> - Novos scripts no `package.json`
> - Mudanças em regras de negócio (recorrência NPS, thresholds, classificações)
>
> **Nenhuma tarefa está completa se este arquivo não reflete o estado atual do sistema.**

---

> **ESTADO DA STACK - NOTA IMPORTANTE**
>
> O projeto está atualmente em uma fase de transição documentada. Embora o objetivo de longo prazo seja a migração para **Azure SQL (SQL Server)**, a implementação **atual** e funcional utiliza **Supabase (PostgreSQL + pgvector)**. Documentações que referenciem Azure SQL como "atual" devem ser lidas como "alvo futuro".

---

> **REGRA DE DOCUMENTAÇÃO DE PRODUTO**
>
> Além do README, toda **nova regra de negócio** deve ser documentada em `docs/product/`. Isso inclui:
> - Alterações em telas existentes (KPIs, filtros, comportamento)
> - Novos fluxos de usuário
> - Mudanças em ciclo de vida (ticket, NPS, contratos)
> - Regras de validação ou autorização
> - Thresholds ou classificações (health, NPS, SLA)
>
> Para atualizar:
> 1. Edite o arquivo correspondente em `docs/product/` (ex: `04-suporte.md` para regras de suporte)
> 2. Ou crie novo arquivo se for uma tela nova
> 3. Mantenha o índice em `docs/product/specification.md` atualizado
>
> **A documentação de produto é a referência para PM/PO entenderem o comportamento do sistema.**

---

## O que é e para que serve

A Plannera presta serviços de SaaS e CS para outras empresas. O CS-Continuum é a ferramenta interna que os CSMs usam para:

- **Acompanhar a saúde de cada conta** com scores manuais e gerados por IA
- **Registrar reuniões e interações** com transcrições, sentiment analysis automático e extração de horas
- **Rastrear o esforço** gasto por atividade (preparação, estratégia, relatório, etc.)
- **Gerenciar tickets de suporte** com sync de e-mail via IMAP e ingestão por CSV ou PDF
- **Mapear o poder dos stakeholders** (Power Map: champions, detratores, decisores)
- **Monitorar adoção de produto** por feature, com rastreio de bloqueios e planos de ação
- **Avaliar risco de downgrade** de contrato com base nas features não adotadas do plano atual
- **Coletar NPS** embutido nas instâncias dos clientes (widget JavaScript) e analisar os resultados
- **Perguntar ao Cérebro do CS** — assistente RAG que cruza reuniões, tickets, NPS e adoção para gerar insights em PT-BR

---

## Stack tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 16.2.0 |
| Linguagem | TypeScript | 5 |
| UI | React | 19.2.0 |
| Estilo | Tailwind CSS + Radix UI | 3.4.1 |
| Banco de dados | Supabase (PostgreSQL — Relacional + RLS) | — |
| Vetores | pgvector no Supabase (extensão nativa) | — |
| Alvo Futuro | Azure SQL (SQL Server + VECTOR nativo) | — |
| Auth | Supabase Auth (JWT + roles `csm` / `client`) | — |
| LLM principal | Google Gemini (Exclusive) | — |
| SDK de IA | @google/genai (Oficial — migrado de @google/generative-ai) | 1.0.0+ |
| State | TanStack React Query | 5.95.2 |
| Validação | Zod | 4.3.6 |
| Animações | Framer Motion | 12.38.0 |
| Ícones | Lucide React | 1.8.0 |
| Notificações | Sonner | 2.0.7 |
| E-mail | imap-simple + mailparser + nodemailer | — |

---

## Design System — Fundação Semântica de UI

A plataforma utiliza uma **Fundação Semântica de Tokens** que garante consistência automática de tema (Light/Dark) sem `dark:` inline nos componentes. Toda view deve usar os tokens abaixo — jamais classes Tailwind fixas como `bg-slate-900` ou `text-gray-500`.

### Tokens Semânticos (globals.css + tailwind.config.ts)

| Token Tailwind | CSS Var | Light | Dark | Uso obrigatório |
|----------------|---------|-------|------|-----------------|
| `bg-surface-background` | `--surface-background` | slate-50 | slate-950 | Fundo do `<PageContainer>` |
| `bg-surface-card` | `--surface-card` | white | slate-900 | Cards, painéis, modais |
| `text-content-primary` | `--content-primary` | Navy `#2d3558` | white | Títulos, métricas, valores |
| `text-content-secondary` | `--content-secondary` | Grey `#5c5b5b` | slate-400 | Labels, captions, apoio |
| `border-border-divider` | `--border-divider` | slate-200 | slate-800 | Bordas de card/seção |
| `bg-white` / `bg-slate-900` | - | - | - | Fundo sólido obrigatório em Modais, Sheets, Dropdowns, Selects, Popovers e Tooltips — qualquer container com texto, grid ou formulário deve ter opacidade 100% |

### Componentes Guardiões (src/components/ui/)

| Componente | Arquivo | Responsabilidade |
|------------|---------|-----------------|
| `<PageContainer>` | `page-container.tsx` | Força `bg-surface-background` + padding da view |
| `<Card>` | `card.tsx` | Força `bg-surface-card` + `border-border-divider` |
| `<Text>` | `typography.tsx` | Força `variant="primary|secondary|accent|destructive"` |

### Regras de Implementação

1. **Nunca use classes de cor fixas** (`bg-white`, `bg-slate-900`, `text-gray-500`) para estrutura. Use os tokens semânticos.
2. **Toda view começa com `<PageContainer>`** — ele gerencia fundo e padding.
3. **Painéis e cards usam `<Card>`** — que já inclui borda e sombra corretas.
4. **Textos informativos usam `<Text variant="secondary">`** — elimina `text-muted-foreground` espalhado.
5. **Dark Mode**: É automático via CSS vars — não é necessário `dark:` inline nos componentes guardiões.

### Status da Migração

| Sessão | Escopo | Status |
|--------|--------|--------|
| Onda 1 | 5 telas simples (Users, Settings, Accounts lista) | ✅ Concluída 2026-04-22 |
| Onda 2 | 5 telas médias (Esforço, Perguntar, Dashboard, Suporte lista, NPS) | ✅ Concluída 2026-04-22 |
| Onda 3 | Telas críticas: NPS Programs, Suporte Detalhe/Dashboard, Account Detail (16 componentes) | ✅ Concluída 2026-04-22 |
| Sessão 2 Core UI | `tabs.tsx`, `table.tsx`, `button.tsx`, `badge.tsx` — variantes `glass` removidas, consumers migrados | ✅ Concluída 2026-04-23 |
| Sessão 3 Inputs | `dialog.tsx` overlay, `checkbox.tsx` (estados checked/focus), `switch.tsx` (unchecked + thumb), `button.tsx secondary` | ✅ Concluída 2026-04-23 |
| Sessão 4 Typography | Padronização global de tabelas: **11px font-extrabold sans-serif** para dados técnicos + Hover `bg-muted/40` | ✅ Concluída 2026-04-23 |
| Sessão 5 Inteligência | Migração `@google/genai`, Estabilização Gemini 2.5 Flash, Refatoração Gateway (Exclusive Mode) | ✅ Concluída 2026-04-23 |
| Sessão 6 Ergonomia | Otimização de Espaço Suporte: Removido banner SLA (movido para Tooltip); Scroll automático para fim da thread; Padrão Glassmorphism (máx 15% transparência) em Portals | ✅ Concluída 2026-04-23 |
| Sessão 7 Transparência | Fundos sólidos em todos os containers com conteúdo: `dialog.tsx`, `sheet.tsx`, `command.tsx`, `dropdown-menu.tsx`, `select.tsx`, `popover.tsx`, `tooltip.tsx` — removido `bg-white/90 dark:bg-slate-900/90` e `backdrop-blur-md`; regra: máx 20% transparência apenas em elementos puramente decorativos | ✅ Concluída 2026-04-24 |
| Sessão 8 Performance | Review-reply: forçado `gemini-2.5-flash` explicitamente (era selecionado `pro` por heurística); gateway migrado do SDK legado `@google/generative-ai` para `@google/genai` (SDK oficial); `maxOutputTokens` configurável por chamada; review-reply usa 800 tokens | ✅ Concluída 2026-04-24 |
| Sessão 9 Suporte UX | Recovery: ReplyReviewModal fundo sólido (`bg-white dark:bg-slate-900`), escala 0-10 consistente no route+prompt+system, normalize() auto-corrige escala legada, threshold < 6. Features: auto-apply status IA (solution/pending_client/pending_product), status Aguardando Cliente/Produto (padrão mercado), toolbar formatação Teams-style abaixo da textarea | ✅ Concluída 2026-04-24 |
| Sessão 10 Suporte UX | Classificação (Prioridade, Produto, Categoria) movida para sidebar com auto-save via PATCH a cada alteração; compose footer mantém apenas Status. Bypass de erro da IA implementado: `reviewFailed=true` muda botão para "Enviar sem Revisão" (âmbar) + "Tentar Revisão" — agente nunca bloqueado por falha da IA | ✅ Concluída 2026-04-24 |
| Sessão 11 Suporte UX | Tabs "Responder"/"Nota" movidas para a linha do botão (compose compacto). @menção: `@email` em reply/note grava evento `mention` em `sla_events`; `notifications/route.ts` expõe menções; `NotificationCenter` renderiza com ícone `AtSign` e borda índigo | ✅ Concluída 2026-04-24 |

### Convenção de Variantes de Button

| Variante | Uso correto |
|----------|-------------|
| `default` | CTA primário isolado (salvar, confirmar em modais) |
| `premium` | CTA principal em headers e forms — ações de alto impacto |
| `outline` | Ações secundárias, botões de edição, triggers de modal |
| `secondary` | Botões de suporte (cancelar, voltar) — fundo sutil |
| `ghost` | Ações dentro de tabelas ou listas — mínimo visual |
| `destructive` | Excluir, remover — vermelho explícito |

> Roadmap detalhado: `docs/ui-refactor-roadmap.md`

---

## Arquitetura geral

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React 19 + Tailwind)                             │
│  Dashboard • Logos • Perguntar • NPS • Esforço • Suporte    │
└────────────────────────┬────────────────────────────────────┘
                         │ fetch / React Query
┌────────────────────────▼────────────────────────────────────┐
│  API Routes (Next.js App Router — /src/app/api/)            │
│  accounts • contracts • interactions • health-scores        │
│  support-tickets • time-entries • nps • ask                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  Camada de negócio (/src/lib/)                              │
│  RAG Pipeline • LLM Gateway • Health Engine • Risk Engine   │
└──────────┬──────────────────────────────────┬───────────────┘
           │                                  │
┌──────────▼──────┐                 ┌─────────▼───────────────┐
│  Supabase       │                 │  LLM Providers          │
│  (PostgreSQL +  │                 │  Gemini 2.5 (Exclusive) │
│   pgvector)     │                 │                         │
│  Supabase Auth  │                 │                         │
└─────────────────┘                 └─────────────────────────┘
```

---

## Módulos

### Dashboard Principal (`/dashboard`)

Painel executivo com 6 KPIs em tempo real:

| KPI | Descrição |
|-----|-----------|
| Total de Logos | Número de contas ativas |
| MRR Total | Receita recorrente mensal somada (com ARR) |
| Health Médio | Média dos health scores do portfólio |
| Logos em Risco | Contas com health score abaixo de 40 |
| Renovações (30d) | Contratos com vencimento nos próximos 30 dias |
| NPS Score | Score NPS global do portfólio (promotores − detratores) |

Logo abaixo, tabela de contas com busca, filtros por segmento e indicadores de health e tendência.

---

### Logos / Contas (`/accounts`)

Gestão completa de contas. Cada logo possui:

- **Dados básicos**: segmento (Indústria / MRO / Varejo), setor de atuação, website, logo, CNPJ
- **Endereço estruturado**: CEP com auto-preenchimento via ViaCEP, Logradouro, Número, Complemento, Bairro, Cidade, UF — ou flag de endereço internacional
- **Múltiplos contratos**: cada conta pode ter N contratos (inicial, aditivo, upgrade, renovação), cada um com MRR, ARR calculado, tipo de serviço (Basic / Professional / Enterprise / Custom), status, datas de início e renovação, desconto por cupom (percentual em % ou valor fixo em R$, com toggle no formulário) e duração — editáveis individualmente em modo edit.
- **SLA por contrato**: cada contrato define se usa o Padrão Plannera (herdado da política global) ou um SLA customizado com mapeamento de-para: labels do cliente (ex: "Urgente", "P1") → níveis internos (Crítico / Alto / Médio / Baixo).
- **Layout Comercial**: Interface de alta densidade em duas colunas. Coluna esquerda focada em dados financeiros (Financial Engine + desconto) e configuração de SLA; Coluna direita focada em cronograma de vigência e anotações contratuais.
- **Power Map**: stakeholders com seniority, nível de influência, flag de decisor, e-mail, LinkedIn
- **Interações**: reuniões, e-mails, QBRs, onboardings, check-ins — com horas, tipo e transcrição
- **Tickets de Suporte**: status, prioridade, categoria, datas
- **Health Score**: histórico manual (CSM) e shadow (IA) com alertas de discrepância
- **Faturamento**: dia de vencimento, contato financeiro (nome, e-mail, telefone), regras de faturamento
- **Time interno**: CSM responsável e executivo comercial atribuídos por conta

**Navegação de edição**: o ícone de lápis na tabela do dashboard e no cabeçalho da conta redirecionam para `/accounts/[id]/edit`, que carrega o formulário completo com todos os contratos e dados estruturados.

**Header da conta**: exibe dois pills financeiros no canto direito (MRR e Renovação). O grid de saúde abaixo exibe duas linhas de indicadores — linha 1: Adoção | Suporte | Relacionamento; linha 2: NPS (score dos últimos 30 dias, `—` se sem respostas) | SLA (Ativo / Sem SLA conforme `sla_policies` do contrato ativo) | Score IA — todos sempre visíveis sem scroll. A linha do tempo usa ícones `w-8` com trilho alinhado ao centro e card com `overflow-hidden` para evitar overflow de texto.

---

### Perguntar — Cérebro do CS (`/perguntar`)

Interface de chat com o motor RAG. O CSM digita uma pergunta em português e o sistema:

1. Gera embedding da pergunta (Gemini `text-embedding-004`)
2. Busca os chunks mais relevantes no pgvector (limiar 0.4, relaxado para 0.2 se necessário), incluindo transcrições de reuniões indexadas
3. Enriquece com metadados estruturados: data da reunião, prioridade do ticket, adoção, NPS, stakeholders
4. Detecta automaticamente o cliente mencionado na pergunta (entity detection)
5. Monta o prompt com contexto 360° (ver abaixo) e chama Gemini 2.5 Flash
6. Retorna resposta em PT-BR com citação das fontes

**Visão 360° — Auditoria Exaustiva (4 dimensões cruzadas):**

| Dimensão | Fonte | Descrição |
|----------|-------|-----------|
| **Journal de Esforço** | `time_entries` | Transcrições de reuniões, relatos de atividades e notas de contato — fonte primária qualitativa |
| **Power Map** | `contacts` | Decisores, influenciadores e nível de engajamento por stakeholder |
| **Financeiro/SLA** | `contracts` | MRR, ARR, status contratual, data de renovação e horas contratadas |
| **Saúde** | `health_scores` | Health Score Manual (CSM) vs Shadow IA — discrepância > 20 sinalizada como alerta |

A IA nunca omite detalhes: se houver transcrição ou nota no Journal de Esforço, ela é obrigatoriamente sintetizada na resposta.

---

### NPS Hub (`/nps`)

Painel executivo de inteligência de lealdade com design "High-Density":

- **NPS Hub (Mega-Card)**: Centraliza o Score, a evolução histórica e o breakdown do portfólio em um único componente glassmorphic.
- **Ghost Chart Evolution**: Gráfico de área translúcido integrado ao fundo do medidor principal, permitindo visualização de tendência sem gerar ruído visual.
- **Gestão de Metas Dinâmica**: Botão de ajuste de meta corporativa diretamente no dashboard, com recálculo automático de KPIs e alertas visuais.
- **Pareto de Contas Interativo**: Ranking de contas com ordenação personalizada por Promotores, Neutros ou Detratores.
- **Feed de Respostas Moderno**: Lista de feedbacks em tempo real com carrossel de respostas detalhadas por pergunta e modal de visualização completa.
- **Filtros Avançados**: Seleção de período (7d a 365d), Programas e Contas específicas com persistência de estado.
- **Exportação XLSX**: Geração de planilhas detalhadas incluindo todas as respostas do questionário multi-pergunta.
- **Gestão de Programas**: Rota segregada (`/nps/programs`) para criação de campanhas, edição de perguntas e configuração de modo de teste.

---

### Esforço (`/esforco`)

Rastreamento de horas do CSM por tipo de atividade. O input é em linguagem natural (ex: "Passei 2h preparando o QBR do cliente X") e o Gemini 2.5 Flash extrai horas e descrição automaticamente.

**Qualidade de Relato — `confidence_score`:** Cada entrada parseada recebe um score de confiança (0.0–1.0). Se `confidence_score < 0.8`, a entrada é salva com `status: 'pending_review'` para revisão humana antes de ser contabilizada.

---

### Suporte (`/suporte`, `/suporte/[id]` e `/suporte/dashboard`)

Módulo completo de suporte com SLA, ciclo de vida de ticket e CSAT.

**Revisão de resposta (Padrão Plannera):** Botão "Avaliar e Enviar" na área de composição do ticket. Submete o rascunho ao Gemini que avalia sentimento, reescreve a mensagem no Padrão Plannera e calcula a nota final.

**Avaliação Context-Aware:** A IA usa TODO o histórico do chamado para avaliar o rascunho. Os 5 critérios (Tom, Estrutura, Empatia, Clareza, Alinhamento) são julgados no contexto do problema original e do sentimento acumulado do cliente.

**Nota Final — Média Harmônica dos 5 Critérios (escala 0–10):**
```
nota_final = 5 / (1/tom + 1/estrutura + 1/empatia + 1/clareza + 1/alinhamento)
```
`show_alert = true` quando `nota_final < 6`. Qualquer critério com nota 0 resulta em nota_final = 0 (penalidade máxima — a harmônica é indefinida com divisor zero).

**Interface de Detalhe do Ticket (`/suporte/[id]`):** Reconstruída no Vibrant Light Mode com os Componentes Guardiões. `TicketDetailClient` usa `<PageContainer noPadding>` como backbone, tokens semânticos (`bg-surface-background`, `bg-surface-card`, `border-border-divider`) em todas as zonas, e `<Text>` para título e metadados. Todas as classes `dark:` foram removidas da estrutura base. Layout "Full Page Fit": o container preenche a altura disponível sem scroll horizontal; o header (`z-20`) e a área de composição no rodapé (`z-10`) são fixos, enquanto a thread de mensagens e o sidebar lateral (em `xl+`) possuem scrolls internos independentes. A thread de mensagens agora inicia automaticamente pelo final (mensagens mais recentes). Alertas de SLA ausente foram movidos para um tooltip informativo no sidebar para maximizar o espaço de leitura. O tema padrão da aplicação foi alterado para `light` (`defaultTheme="light"` em `app/layout.tsx`) alinhando o tema default com o design system Vibrant Light Mode. O seletor de **Status** foi movido para a área de composição de resposta (junto ao botão de envio), garantindo que a atualização do ciclo de vida ocorra simultaneamente ao envio da mensagem. O campo **Produto** foi adicionado à classificação lateral.

**Indicadores 360° (Performance em Tempo Real):** Modal disparado pela sidebar que consolida a saúde do atendimento em três dimensões:
1. **Qualidade**: Média harmônica atualizada dos 5 pilares (Tom, Estrutura, Empatia, Clareza, Alinhamento).
2. **Compromisso (ETA)**: Monitoramento proativo de promessas de retorno no histórico ("volto em Xh"). A quebra de um ETA gera penalidade automática no score de Alinhamento e alerta visual no dashboard.
3. **Eficiência**: Cálculo de latência média de resposta considerando apenas a janela de horário útil (09:00 - 18:00).

**Auto-apply de Status pela IA:** Ao aceitar a versão da IA (ou manter a própria) no `ReplyReviewModal`, o campo de status no compose é automaticamente definido conforme `suggested_outcome` — `solution` → Resolvido, `pending_client` → Aguardando Cliente, `pending_product` → Aguardando Produto.

**Status de Ticket (padrão de mercado):** Seletor de status ampliado com "Aguardando Cliente" (`pending_client`) e "Aguardando Produto" (`pending_product`), seguindo o padrão osTicket/Zendesk/Freshdesk. No envio, estes são traduzidos para `status: 'in_progress'` + `outcome: 'pending_client|pending_product'` → backend define `pending_reason` via `processAgentInteraction`.

**Toolbar de formatação Teams-style:** Barra de formatação ancorada abaixo do textarea (não sobreposta). Botões: Negrito (`**text**`), Itálico (`_text_`), Código (`` `text` ``), Lista com marcadores, Lista numerada, Paperclip, Imagem. A seleção de texto no textarea é preservada após aplicar a formatação via `requestAnimationFrame`.

---

### Adoção de Produto (`/product`)

Matriz de adoção de features por conta. Cada linha é uma feature do produto.

**Motor de risco de downgrade**: compara as features do plano atual com o plano imediatamente inferior. Se features diferenciadoras não estão adotadas, o risco é sinalizado como `high` ou `low`.

---

### Configurações

- **`/settings/plans`**: CRUD de planos de assinatura
- **`/settings/features`**: Catálogo de features do produto
- **`/settings/sla`**: Política SLA global Plannera
- **`/settings/business-hours`**: CRUD de horários comerciais
- **`/users`**: Gestão da equipe de CSMs

---

## LLM Gateway e Modo Exclusivo (Gemini First)

O gateway (`src/lib/llm/gateway.ts`) foi migrado para o SDK oficial `@google/genai`, priorizando a família Gemini 2.5 para máxima performance e estabilidade. O sistema agora opera em **Modo Exclusivo** (Gemini), com fallbacks desativados para validação da camada de inteligência.

```
Requisição de texto/embedding
       │
       ▼
  LLM_PROVIDER=gemini
       │
    ┌──┴────────────────────────┐
    │ Gemini 2.5 Flash (Texto)  │
    │ Gemini Embedding 004      │
    └───────────────────────────┘
```

**Configuração Atualizada (.env):**

```bash
LLM_PROVIDER=gemini
GEMINI_FLASH_MODEL=gemini-2.5-flash
GEMINI_PRO_MODEL=gemini-pro-latest
LLM_ALLOW_FALLBACK=false      # Modo estrito para estabilidade
```

**Modelos em Uso:**

| Provedor | Modelo | Versão | Finalidade |
|----------|--------|---------|------------|
| Gemini | `gemini-2.5-flash` | Latest | NLP Effort, Sentiment, Support Review |
| Gemini | `gemini-pro-latest` | Latest | RAG Complexo (Cérebro do CS) |
| Gemini | `text-embedding-004`| Latest | Vetorização pgvector (768 dims) |

---

## Health Score

### Score manual (CSM)

O CSM insere uma nota de 0–100. O sistema compara com o `shadow_score` vigente e gera alertas se a discrepância for > 20.

### Shadow Score (IA)

Gerado automaticamente analisando as últimas 10 interações e 10 tickets via Gemini.

---

## Como rodar localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Copie o template e preencha as chaves:
```bash
cp .env.example .env
```

### 3. Rodar
```bash
npm run dev
```

---

## Variáveis de ambiente (referência completa)

```bash
# ── Supabase ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── Google Gemini ─────────────────────────────────────────────
GEMINI_API_KEY=
GEMINI_EMBEDDING_MODEL=text-embedding-004
GEMINI_EMBEDDING_DIMENSIONS=768
GEMINI_FLASH_MODEL=gemini-2.5-flash
GEMINI_PRO_MODEL=gemini-pro-latest

# ── LLM Gateway ───────────────────────────────────────────────
LLM_PROVIDER=gemini                 # gemini (exclusivo para estabilização)
LLM_FALLBACK_PROVIDER=none          # Fallback desativado
LLM_TIMEOUT_MS=120000
LLM_ALLOW_FALLBACK=false
```

---

## Observações importantes

- **Embeddings com 768 dims**: o pgvector e o Gemini (`text-embedding-004`) usam 768 dimensões de forma nativa.
- **Estabilização Gemini**: Atualmente operamos em modo Gemini Exclusive para garantir a confiabilidade da camada de RAG e NLP.
- **RLS estrita**: cada CSM só acessa dados das contas onde é proprietário.
- **NPS é público**: os endpoints `/api/nps/check` e `/api/nps/response` têm CORS `*`.
