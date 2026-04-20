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
>
> ---
>
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
| Banco de dados | Supabase (PostgreSQL) | 2.100.1 |
| Vetores | pgvector (extensão Postgres) | — |
| Auth | Supabase Auth (JWT + RLS) | — |
| LLM principal | Ollama local (qwen2.5) | — |
| LLM fallback | Google Gemini + Anthropic Claude | — |
| State | TanStack React Query | 5.95.2 |
| Validação | Zod | 4.3.6 |
| Animações | Framer Motion | 12.38.0 |
| Ícones | Lucide React | 1.8.0 |
| Notificações | Sonner | 2.0.7 |
| E-mail | imap-simple + mailparser + nodemailer | — |

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
│  PostgreSQL     │                 │  Ollama (local)         │
│  pgvector       │                 │  ↓ Gemini (fallback)    │
│  Auth + RLS     │                 │  ↓ Claude (fallback)    │
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

1. Gera embedding da pergunta (Ollama `nomic-embed-text` ou Gemini)
2. Busca os chunks mais relevantes no pgvector (limiar 0.4, relaxado para 0.2 se necessário)
3. Enriquece com metadados: data da reunião, prioridade do ticket, adoção, NPS, stakeholders
4. Detecta automaticamente o cliente mencionado na pergunta (entity detection)
5. Monta o prompt com todo o contexto e chama Ollama → Gemini → Claude (cascata de fallback)
6. Retorna resposta em PT-BR com citação das fontes

**Exemplos de uso:**
- "Como está a saúde do cliente X?"
- "Quais são os principais bloqueios de adoção no portfólio?"
- "Quais clientes têm renovação próxima e health abaixo de 60?"
- "O que o cliente Y disse sobre a integração na última reunião?"

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

**Programas NPS:**

Cada programa possui:

| Campo | Descrição |
|-------|-----------|
| `name` | Nome amigável do programa |
| `program_key` | Chave única gerada automaticamente para o embed |
| `account_id` | `NULL` = global (todos os clientes do CSM); UUID = por conta específica |
| `is_active` | Ativo / inativo |
| `is_default` | Programa exibido por padrão no dashboard (apenas um por CSM) |
| `is_test_mode` | Ativa o widget no dashboard principal do CS-Continuum para teste (apenas um por CSM) |
| `active_from` / `active_until` | Período de vigência opcional; fora do intervalo o embed não exibe |
| `recurrence_days` | Janela de silêncio após resposta (padrão 90d) |
| `dismiss_days` | Janela de silêncio após dismiss (padrão 30d) |

**Regras de negócio (premissas):**
- Apenas **um** programa pode ser `is_default = true` por CSM; ao definir outro, o anterior perde o flag
- Apenas **um** programa pode ter `is_test_mode = true` por CSM; ao ativar outro, o anterior perde o flag
- Ao **inativar** um programa que era default ou estava em teste, os flags são removidos automaticamente
- Ao **desativar o modo de teste**, todas as respostas marcadas com `is_test = true` são removidas do banco
- **Excluir** um programa só é permitido se `response_count = 0` (sem respostas reais); com respostas, o usuário deve inativar

**Questionário multi-pergunta:**

Cada programa pode ter N perguntas. Tipos suportados:

| Tipo | Descrição |
|------|-----------|
| `nps_scale` | Escala 0–10 (NPS clássico) |
| `multiple_choice` | Múltipla escolha com opções configuráveis |
| `text` | Texto livre |

A arquitetura agora separa o *Dashboard Executivo* (onde vemos os resultados) da *Gestão de Programas* (nova rota /nps/programs), focada na operação de criação de campanhas, adição de perguntas, e testes mobile-first.

**Código de embed (exemplo):**
```html
<script
  src="https://nps.cscontinuum.com/embed.js"
  data-program-key="CHAVE_DO_PROGRAMA"
  data-user-id="USER_ID"
  data-email="USER_EMAIL"
  data-base-url="https://nps.cscontinuum.com">
</script>
```

O widget abre como um **painel deslizante pela direita (slide-in)** com overlay, sobre o sistema onde o script está instalado. Pode ser fechado pelo botão X, pelo overlay, ou pelo link "Não agora". Respostas enviadas durante `is_test_mode` são marcadas com `is_test = true` e removidas ao desativar o teste.

**Regras de exibição (embed):**

| Evento | Janela de silêncio |
|--------|--------------------|
| Após responder | `recurrence_days` (padrão 90d) |
| Após clicar "não agora" / X | `dismiss_days` (padrão 30d) |
| Máx por conta (qualquer usuário) | `account_recurrence_days` (padrão 30d) |
| Antes de `active_from` | Não exibe |
| Após `active_until` | Não exibe |
| `is_test_mode = true` | Exibe sempre, ignora todas as travas |

---

### Esforço (`/esforco`)

Rastreamento de horas do CSM por tipo de atividade:

| Tipo | Descrição |
|------|-----------|
| `preparation` | Preparação para reuniões |
| `environment-analysis` | Análise de ambiente do cliente |
| `strategy` | Planejamento estratégico |
| `reporting` | Elaboração de relatórios |
| `internal-meeting` | Reuniões internas |
| `other` | Atividades diversas |

O input é em linguagem natural (ex: "Passei 2h preparando o QBR do cliente X") e o Gemini extrai horas e descrição automaticamente.

Também exibe o histórico de health scores com comparativo manual vs. shadow.

---

### Suporte (`/suporte`, `/suporte/[id]` e `/suporte/dashboard`)

Módulo completo de suporte com SLA, ciclo de vida de ticket e CSAT.

**Formas de ingestão:**
- **E-mail (Power Automate + IMAP)**: sync automático da caixa `suporte@plannera.com.br` — cada novo e-mail vira ticket, replies em resolvidos são classificados por IA (gratidão vs. requerimento)
- **CSV**: import em massa
- **PDF**: extração via `pdf-parse`

**Ciclo de vida:** `open` → `in_progress` → `resolved` → `closed` (+ `reopened`)

**SLA:** Deadlines calculados em minutos úteis (fuso `America/Sao_Paulo`). Semáforo: `no_prazo` / `atencao` / `vencido` / `cumprido` / `violado`. Polling a cada 5 min via Edge Function + pg_cron.

**Revisão de resposta (Padrão Plannera):** Botão "Avalie a resposta" na área de composição do ticket. Submete o rascunho ao agente de IA que avalia sentimento (Equilibrado/Neutro/Rígido), gera scores por dimensão (tom, estrutura, empatia, clareza, alinhamento) e por pilar (Habilidades de Comunicação, Efetividade das Respostas), reescreve a mensagem no Padrão Plannera e calcula a nota final via média harmônica. O agente escolhe entre sua versão original ou a versão da IA antes de enviar. Componente: `src/components/support/ReplyReviewModal.tsx`. API: `POST /api/support-tickets/review-reply`.

**CSAT:** E-mail enviado via SMTP (Outlook 365) ao resolver ticket. Token com validade configurável. Score 1–5 + comentário. Score ≤ 2 dispara notificação para agente e head de CS.

**Área de atendimento** (`/suporte/[id]`): Workspace osTicket-inspired com layout de duas colunas. Coluna principal: thread de conversa cronológica (mensagem original do cliente, thread de e-mail, respostas dos agentes, notas internas) + área de composição com abas "Responder ao Cliente" e "Nota Interna" + opção de resolver ao enviar. Sidebar: ações contextuais (1ª resposta, resolver, reabrir), painel SLA com banner de aviso quando não configurado, classificação inline editável (status, prioridade, nível SLA, categoria com 9 tópicos predefinidos), reatribuição de responsável, info do cliente e histórico de datas. 
**Gestão de SLA De/Para**: O sistema permite mapear nomenclaturas específicas do cliente (ex: "Urgente", "P1") para os níveis internos do Padrão Plannera (Crítico, Alto, Médio, Baixo), garantindo que os prazos de resposta e resolução sejam aplicados corretamente conforme o contrato.
Banner de alerta em destaque quando nenhuma política SLA está configurada para o contrato — com link direto para configurar.

**Dashboard executivo** (`/suporte/dashboard`): 4 camadas — KPIs operacionais em tempo real, KPIs do período (compliance SLA, TMP, TMR, CSAT médio), desempenho por agente e saúde por cliente. Exportação XLSX.

**Notificações (7 tipos):** `sla_attention`, `sla_breached`, `new_ticket`, `ticket_reassigned`, `ticket_reopened`, `csat_received`, `csat_negative`.

---

### Adoção de Produto (`/product`)

Matriz de adoção de features por conta. Cada linha é uma feature do produto; o status pode ser:

| Status | Significado |
|--------|-------------|
| `not_started` | Ainda não iniciou o uso |
| `partial` | Usa parcialmente |
| `in_use` | Totalmente adotado |
| `blocked` | Tem bloqueio ativo |
| `na` | Não se aplica |

Para features bloqueadas, o CSM registra a categoria do bloqueio, a razão, um plano de ação, responsável e data alvo.

**Motor de risco de downgrade**: compara as features do plano atual com o plano imediatamente inferior. Se features diferenciadoras não estão adotadas, o risco é sinalizado como `high` ou `low`.

---

### Configurações

- **`/settings/plans`**: CRUD de planos de assinatura com tier_rank para cálculo de risco
- **`/settings/features`**: Catálogo de features do produto associadas a planos
- **`/settings/sla`**: Política SLA global Plannera — define os prazos padrão de 1ª resposta e resolução por nível (Crítico / Alto / Médio / Baixo), threshold de alerta de proximidade e fechamento automático. Esta política é herdada por contratos que não possuem SLA customizado.
- **`/settings/business-hours`**: CRUD de horários comerciais globais e por conta
- **`/users`**: Gestão da equipe de CSMs

---

## API Reference

### Autenticação

Todos os endpoints (exceto os de NPS marcados como públicos) exigem um JWT válido do Supabase Auth no cookie de sessão.

### Accounts

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/accounts` | Lista todas as contas do CSM autenticado |
| `POST` | `/api/accounts` | Cria conta + contrato |
| `GET` | `/api/accounts/[id]` | Retorna detalhe da conta |
| `PATCH` | `/api/accounts/[id]` | Atualiza campos da conta |
| `GET` | `/api/accounts/[id]/adoption` | Status de adoção das features |
| `PATCH` | `/api/accounts/[id]/adoption` | Atualiza status/bloqueio de feature |
| `GET` | `/api/accounts/[id]/plan` | Risco de downgrade e features em risco |

### Contratos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/contracts` | Lista contratos |
| `POST` | `/api/contracts` | Cria contrato |
| `GET` | `/api/contracts/[id]` | Detalha contrato |
| `PATCH` | `/api/contracts/[id]` | Atualiza contrato |
| `GET` | `/api/contracts/[id]/history` | Histórico de alterações |

### Contatos (Power Map)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/contacts` | Lista contatos |
| `POST` | `/api/contacts` | Cria contato |
| `PATCH` | `/api/contacts/[id]` | Atualiza contato |

### Interações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/interactions` | Lista interações (`?account_id=`) |
| `POST` | `/api/interactions` | Registra reunião/e-mail |
| `GET` | `/api/interactions/[id]` | Detalha interação |
| `POST` | `/api/interactions/[id]/ingest` | Processa transcrição: extrai sentiment e horas via IA |

### Health Scores

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/health-scores` | Histórico de scores |
| `POST` | `/api/health-scores` | Insere score manual (0–100) |
| `GET` | `/api/health-scores/[account_id]` | Score vigente da conta |
| `POST` | `/api/health-scores/generate` | Gera Shadow Score via IA |

### Suporte & SLA

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| `GET` | `/api/support-tickets` | CSM | Lista tickets |
| `POST` | `/api/support-tickets` | CSM | Cria ticket |
| `PATCH` | `/api/support-tickets/[id]` | CSM | Atualiza status/prioridade/agente |
| `GET` | `/api/support-tickets/[id]/sla` | CSM | Detalhes de deadlines e status SLA |
| `GET` | `/api/support-tickets/[id]/events` | CSM | Timeline de eventos (sla_events) |
| `POST` | `/api/support-tickets/[id]/resolve` | CSM | Resolve ticket (congela SLA, dispara CSAT) |
| `POST` | `/api/support-tickets/[id]/reopen` | CSM | Reabre ticket |
| `PATCH` | `/api/support-tickets/[id]/assign` | CSM | Reatribui agente |
| `POST` | `/api/support-tickets/[id]/first-response` | CSM | Registra 1ª resposta manualmente |
| `POST` | `/api/support-tickets/[id]/notes` | CSM | Adiciona nota interna (salva em `sla_events`) |
| `POST` | `/api/support-tickets/[id]/reply` | CSM | Envia resposta ao cliente (salva em `sla_events`; auto-registra 1ª resposta; `close_after=true` resolve o ticket) |
| `POST` | `/api/support-tickets/email-sync` | CSM | Sync Power Automate/IMAP |
| `POST` | `/api/support-tickets/ingest` | CSM | Import CSV |
| `POST` | `/api/support-tickets/pdf` | CSM | Extração PDF |
| `POST` | `/api/support-tickets/rag` | CSM | Ingere CSAT + resoluções no RAG |
| `POST` | `/api/support-tickets/review-reply` | CSM | Avalia rascunho de resposta do agente contra o Padrão Plannera (sentimento, scores por pilar, versão reescrita pela IA, nota final via média harmônica) |
| `GET` | `/api/sla-policies` | CSM | Lista políticas por contrato |
| `POST` | `/api/sla-policies` | CSM | Cria política (única por contrato) |
| `PATCH` | `/api/sla-policies/[id]` | CSM | Atualiza threshold, auto-close, is_active |
| `GET` | `/api/sla-policies/[id]/levels` | CSM | Níveis da política |
| `PUT` | `/api/sla-policies/[id]/levels` | CSM | Bulk update dos 4 níveis |
| `GET/POST` | `/api/sla-policies/[id]/mappings` | CSM | Mapeamentos de prioridade externa |
| `DELETE` | `/api/sla-policies/[id]/mappings/[mid]` | CSM | Remove mapeamento |
| `GET/POST/PATCH/DELETE` | `/api/business-hours` | CSM | CRUD de horários comerciais |
| `GET` | `/api/csat/stats` | CSM | Média, distribuição e taxa de resposta CSAT |
| `POST` | `/api/csat/submit` | Público | Registra score (token UUID) |
| `POST` | `/api/csat/comment` | Público | Adiciona comentário ao score |
| `GET` | `/api/support-dashboard/operational` | CSM | KPIs em tempo real (abertos, vencidos, atenção) |
| `GET` | `/api/support-dashboard/period` | CSM | KPIs do período (TMP, TMR, compliance, CSAT) |
| `GET` | `/api/support-dashboard/by-agent` | CSM | Desempenho por agente |
| `GET` | `/api/support-dashboard/by-client` | CSM | Saúde de suporte por cliente |
| `GET` | `/api/support-reports/export` | CSM | Exporta XLSX com 3 abas |
| `POST` | `/api/cron/sla-polling` | `x-api-secret` | Polling de SLA em lote |
| `POST` | `/api/cron/ticket-auto-close` | `x-api-secret` | Fecha tickets resolvidos há >N horas úteis |
| `POST` | `/api/cron/csat-timeout` | `x-api-secret` | Reporta tokens CSAT expirados sem resposta |

### Esforço (Time Entries)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/time-entries` | Lista entradas do CSM |
| `POST` | `/api/time-entries` | Log em linguagem natural |
| `PATCH` | `/api/time-entries/[id]` | Atualiza entrada |

### RAG

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/ask` | Pergunta ao Cérebro do CS |

Body: `{ question: string, account_id?: string }`
Retorna: `{ answer: string, sources: RAGSource[] }`

### NPS

| Método | Endpoint | Auth | CORS | Descrição |
|--------|----------|------|------|-----------|
| `GET` | `/api/nps/check` | Público | `*` | Decide se exibe o widget; valida `active_from`/`active_until`; retorna `is_test` |
| `POST` | `/api/nps/response` | Público | `*` | Registra resposta ou dismiss; grava `is_test=true` quando programa está em modo de teste |
| `GET` | `/api/nps/stats` | CSM | — | Métricas agregadas; params: `date_from`, `date_to` (padrão últimos 30d), `program_key`, `account_id`; exclui `is_test=true`; auto-resolve programa default |
| `GET` | `/api/nps/programs` | CSM | — | Lista programas com `response_count` (respostas reais) e questões ordenadas |
| `POST` | `/api/nps/programs` | CSM | — | Cria programa; aceita `name`, `active_from`, `active_until` |
| `PATCH` | `/api/nps/programs?id=X` | CSM | — | Atualiza `is_test_mode`, `is_default`, `is_active`, `name`, `active_from`, `active_until`; aplica premissas de unicidade |
| `DELETE` | `/api/nps/programs?id=X` | CSM | — | Exclui programa; retorna `409` se houver respostas reais |
| `GET` | `/api/nps/programs/[id]/questions` | CSM | — | Lista questões do programa |
| `POST` | `/api/nps/programs/[id]/questions` | CSM | — | Adiciona questão ao questionário |
| `PATCH` | `/api/nps/programs/[id]/questions/[qid]` | CSM | — | Atualiza título, opções, ordem ou obrigatoriedade |
| `DELETE` | `/api/nps/programs/[id]/questions/[qid]` | CSM | — | Remove questão |
| `POST` | `/api/nps/rag` | CSM | — | Ingere comentários NPS no RAG |

---

## Banco de dados

### Tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `accounts` | Contas/logos dos clientes |
| `contracts` | Contratos financeiros por conta |
| `contacts` | Stakeholders com seniority e influência |
| `interactions` | Reuniões, e-mails e interações com transcrição |
| `time_entries` | Log de esforço dos CSMs |
| `support_tickets` | Tickets de suporte |
| `sla_policies` | Políticas de SLA por contrato (única por contrato) |
| `sla_policy_levels` | Níveis de SLA (critical, high, medium, low) com minutos de 1ª resposta e resolução |
| `sla_level_mappings` | Mapeamento de prioridades externas → internas (case-insensitive) |
| `business_hours` | Horários comerciais globais ou por conta (seg–sex 09h–18h por padrão) |
| `sla_events` | Auditoria completa do ciclo de vida do ticket (opened, first_response, resolved, reopened, closed, assigned) |
| `csat_responses` | Respostas CSAT: score 1–5, comment, answered_at, account_id, agent_id |
| `csat_tokens` | Tokens UUID únicos com validade; `email_delivery_failed` para fallback sem bloquear resolução |
| `health_scores` | Histórico de health scores (manual + shadow IA) |
| `embeddings` | Chunks vetorizados para busca semântica (pgvector) |
| `feature_adoption` | Status de adoção por feature/conta |
| `product_features` | Catálogo de features do produto |
| `subscription_plans` | Planos com tier_rank para risco de downgrade |
| `plan_features` | Associação plano ↔ feature |
| `account_plans` | Plano ativo por conta |
| `nps_programs` | Configuração do programa NPS; campos: `name`, `is_default`, `is_test_mode`, `active_from`, `active_until` |
| `nps_responses` | Respostas individuais coletadas pelo embed; campo `is_test` marca respostas de modo de teste |
| `nps_questions` | Perguntas do questionário por programa (`nps_scale`, `multiple_choice`, `text`) |
| `nps_answers` | Respostas por pergunta (ligadas a `nps_responses`) |

### Segurança (RLS)

Row-Level Security está habilitado em todas as tabelas. Um CSM só enxerga dados das contas onde é `csm_owner_id`. O `service_role` (usado nos endpoints públicos de NPS e no RAG) bypassa o RLS.

### Migrações

```
supabase/migrations/
├── 001_initial_schema.sql           — Tabelas core
├── 002_rls_policies.sql             — Políticas RLS
├── 003_pgvector.sql                 — Extensão pgvector e tabela embeddings
├── 004_refactor_clients_touch_model.sql
├── 005_contacts_extend.sql          — Campos do Power Map
├── 006_security_hardening.sql       — Endurecimento de autenticação
├── 007_nps.sql                      — Tabelas base NPS (programs + responses) e RLS
├── 008_nps_questionnaire.sql        — Questionário multi-pergunta (nps_questions, nps_answers, csm_owner_id global)
├── 009_nps_improvements.sql         — name, is_default, is_test_mode, active_from/until, is_test em responses
├── 011_nps_goals_and_targets.sql    — Gestão de metas corporativas de NPS
└── 012_support_sla.sql              — Fundação de Suporte SLA (Policies, Níveis, Business Hours, CSAT e Ticket Lifecycle)
```

> **Nota:** as migrations 007–009 usam nomenclatura sequencial (não timestamp). Para aplicar manualmente use o SQL Editor do Supabase ou a API de gerenciamento (`POST /v1/projects/{ref}/database/query`).

---

## LLM Gateway e fallback em cascata

O gateway (`src/lib/llm/gateway.ts`) abstrai todos os provedores de LLM com fallback automático:

```
Requisição de texto/embedding
       │
       ▼
  LLM_PROVIDER=?
       │
   ┌───┴────┐
   │ ollama │──[timeout/erro]──► Gemini ──[erro]──► Claude ──[erro]──► Gemini (double)
   └────────┘
       │
   ┌───┴──────┐
   │  gemini  │──[erro]──► Claude
   └──────────┘
```

**Configuração:**

```bash
LLM_PROVIDER=ollama          # Provider principal
LLM_FALLBACK_PROVIDER=claude # Fallback primário quando principal falha
LLM_TIMEOUT_MS=120000        # Timeout antes de acionar fallback (ms)
LLM_ALLOW_FALLBACK=true      # Habilita cascata de fallback
```

**Modelos configurados:**

| Provider | Texto | Embedding |
|----------|-------|-----------|
| Ollama | `qwen2.5:7b` | `nomic-embed-text` (768 dims) |
| Gemini | `gemini-1.5-flash-latest` / `gemini-pro` | `gemini-embedding-2-preview` (reduzido para 768) |
| Claude | `claude-haiku-4-5` | — |

---

## Health Score

### Score manual (CSM)

O CSM insere uma nota de 0–100 com observações opcionais. O sistema:
1. Salva em `health_scores.manual_score`
2. Compara com o `shadow_score` vigente
3. Se `|manual − shadow| > 20`, ativa `discrepancy_alert`
4. Atualiza `accounts.health_score` e `accounts.health_trend`

### Shadow Score (IA)

Gerado automaticamente analisando as últimas 10 interações e 10 tickets via Gemini:

```json
{
  "score": 72,
  "trend": "stable",
  "justification": "Engajamento consistente, mas 2 tickets críticos em aberto...",
  "risk_factors": ["critical_tickets", "low_nps"],
  "confidence": "high"
}
```

### Classificação

| Faixa | Classificação |
|-------|--------------|
| 80–100 | Saudável / Engajado |
| 60–79 | Estável com pontos de atenção |
| 40–59 | Risco moderado |
| 0–39 | Alto risco / churn iminente |

---

## Como rodar localmente

### Pré-requisitos

- Node.js 20+
- Docker (para Ollama local)
- Conta Supabase com projeto configurado
- Chaves de API: Gemini e/ou Anthropic

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o template e preencha as chaves:

```bash
cp .env.example .env
```

Variáveis obrigatórias:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # Opcional no port 3000 local para evitar crashes

# LLM (mínimo um)
GEMINI_API_KEY=...
# ou
ANTHROPIC_API_KEY=...

# LLM Gateway
LLM_PROVIDER=gemini          # Se não usar Ollama local
LLM_ALLOW_FALLBACK=true
```

### 3. Configurar banco de dados

Execute as migrações no Supabase (SQL Editor ou CLI):

```bash
# Via CLI
supabase db push

# Ou cole o conteúdo de cada arquivo em supabase/migrations/ no SQL Editor
```

### 4. Configurar Ollama (opcional, para LLM local)

```bash
npm run ollama:setup   # Baixa Docker image + modelos (primeira vez)
```

### 5. Rodar

```bash
npm run dev
# Inicia Ollama automaticamente (se instalado) e sobe Next.js em localhost:3000
```

### Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Dev server com hot reload (porta 3000) |
| `npm run build` | Build de produção |
| `npm start` | Servidor de produção |
| `npm run lint` | Lint TypeScript/React |
| `npm run ollama:setup` | Setup inicial do Ollama via Docker |
| `npm run ollama:start` | Inicia Ollama (rodado automaticamente antes de dev/build) |

---

## Estrutura de arquivos

```
csplataform/
├── public/
│   └── embed.js                         # Widget NPS (vanilla JS, sem dependências)
├── src/
│   ├── app/
│   │   ├── (dashboard)/                 # Rotas autenticadas
│   │   │   ├── layout.tsx               # Layout com sidebar
│   │   │   ├── dashboard/               # KPI + tabela de contas
│   │   │   ├── accounts/                # CRUD + detail view
│   │   │   ├── accounts/[id]/           # Power Map, interações, health
│   │   │   ├── perguntar/               # RAG Assistant
│   │   │   ├── nps/                     # Dashboard NPS\n│   │   │   │   └── programs/            # Gestão de Programas e Questionários (nova tela)
│   │   │   ├── esforco/                 # Time tracking + health
│   │   │   ├── suporte/                 # Fila de tickets com KPI strip e SLABadge
│   │   │   │   └── dashboard/           # Dashboard executivo (4 camadas + XLSX)
│   │   │   ├── accounts/[id]/sla/       # Configuração de política SLA por conta
│   │   │   ├── settings/business-hours/ # CRUD de horários comerciais
│   │   │   ├── settings/sla/            # Política SLA global Plannera
│   │   │   ├── product/                 # Adoção de features
│   │   │   ├── settings/features/       # Catálogo de features
│   │   │   ├── settings/plans/          # Planos de assinatura
│   │   │   └── users/                   # Equipe de CSMs
│   │   ├── api/
│   │   │   ├── accounts/
│   │   │   ├── contacts/
│   │   │   ├── contracts/
│   │   │   ├── health-scores/
│   │   │   ├── interactions/
│   │   │   ├── nps/
│   │   │   │   ├── check/               # GET — regras de exibição
│   │   │   │   ├── response/            # POST — captura resposta (público)
│   │   │   │   ├── stats/               # GET — métricas agregadas
│   │   │   │   ├── programs/            # GET/POST — programas NPS
│   │   │   │   └── rag/                 # POST — ingere NPS no RAG
│   │   │   ├── support-tickets/
│   │   │   ├── time-entries/
│   │   │   └── ask/                     # POST — RAG query
│   │   └── login/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── ClientDashboardLayout.tsx
│   │   ├── ui/                          # Radix UI components
│   │   ├── notifications/
│   │   └── providers/
│   └── lib/
│       ├── supabase/
│       │   ├── types.ts                 # Todos os tipos TypeScript
│       │   ├── server.ts                # Client server-side (RLS ativo)
│       │   ├── admin.ts                 # Client admin (bypassa RLS)
│       │   ├── client.ts                # Client browser
│       │   └── vector-search.ts         # Busca pgvector
│       ├── rag/
│       │   └── rag-pipeline.ts          # Orquestração RAG completa
│       ├── llm/
│       │   ├── gateway.ts               # Abstração + fallback em cascata
│       │   ├── ollama.ts                # Cliente Ollama
│       │   └── claude.ts                # Cliente Anthropic
│       ├── gemini/
│       │   └── client.ts                # Cliente Google Gemini
│       ├── health/
│       │   ├── shadow-score.ts          # Geração de score IA
│       │   └── utils.ts                 # Classificação e tendência
│       ├── support/                     # Engine SLA e ciclo de vida
│       │   ├── business-hours.ts        # Matemática de fuso horário e dias úteis
│       │   ├── lifecycle.ts             # openTicket, recordFirstResponse, resolveTicket, reopenTicket, closeTicket, createFromClosed
│       │   ├── intent-classifier.ts     # Classifica replies: gratitude | question_or_issue | unclear (via LLM)
│       │   ├── auto-close.ts            # Fecha tickets resolvidos após N horas úteis
│       │   ├── csat-service.ts          # Geração de token e envio de e-mail CSAT (SMTP Outlook 365)
│       │   ├── polling.ts               # Polling de SLA + 7 tipos de notificação
│       │   ├── sla-engine.ts            # Avaliação de status SLA (no_prazo/atencao/vencido/cumprido/violado)
│       │   └── sla-policies.ts          # Resolução de políticas e horários por conta
│       └── adoption/
│           └── risk-engine.ts           # Motor de risco de downgrade
├── supabase/
│   ├── migrations/                      # SQL de schema e RLS
│   └── functions/                       # Supabase Edge Functions (pg_cron)
│       ├── cron-sla-polling/            # Roda a cada 5 min → POST /api/cron/sla-polling
│       ├── cron-ticket-auto-close/      # Roda a cada 15 min → POST /api/cron/ticket-auto-close
│       └── cron-csat-timeout/           # Roda 1x/dia 08h → POST /api/cron/csat-timeout
├── .env                                 # Variáveis de ambiente (não comitar)
├── .env.example                         # Template de variáveis
├── package.json
└── tsconfig.json
```

---

## Variáveis de ambiente (referência completa)

```bash
# ── Supabase ──────────────────────────────────────────────────
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ACCESS_TOKEN=              # Personal Access Token (migrations)
SUPABASE_PROJECT_REF=               # ID do projeto (ex: mgkwaejx...)

# ── Google Gemini ─────────────────────────────────────────────
GEMINI_API_KEY=
GEMINI_EMBEDDING_MODEL=gemini-embedding-2-preview
GEMINI_EMBEDDING_DIMENSIONS=1536
GEMINI_FLASH_MODEL=gemini-1.5-flash-latest
GEMINI_PRO_MODEL=gemini-2.0-pro-preview

# ── Anthropic (Claude) ────────────────────────────────────────
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-haiku-4-5
CLAUDE_MAX_TOKENS=1024

# ── LLM Gateway ───────────────────────────────────────────────
LLM_PROVIDER=ollama                 # ollama | gemini
LLM_FALLBACK_PROVIDER=claude        # gemini | claude
LLM_TIMEOUT_MS=120000
LLM_ALLOW_FALLBACK=true

# ── Ollama (local) ────────────────────────────────────────────
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# ── RAG / Chunking ────────────────────────────────────────────
CHUNK_SIZE=4000
CHUNK_OVERLAP=500
VECTOR_TOP_K=15

# ── Thresholds ────────────────────────────────────────────────
SENTIMENT_ALERT_THRESHOLD=-0.4
COST_TO_SERVE_WARN=0.15
COST_TO_SERVE_CRITICAL=0.30

# ── E-mail (IMAP — recebimento de tickets) ────────────────────
IMAP_USER=
IMAP_PASSWORD=                          # Senha da caixa (diferente da App Password SMTP)
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
IMAP_FOLDER=Helpdesk

# ── Suporte SMTP (envio de e-mail CSAT) ───────────────────────
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=                              # Mesmo endereço de IMAP_USER em produção
SMTP_PASS=                              # App Password gerada no Microsoft 365 — NÃO é IMAP_PASSWORD
SUPPORT_CSAT_FROM_EMAIL=suporte@plannera.com.br
SUPPORT_CSAT_FROM_NAME=Suporte Plannera

# ── Suporte SLA / Ciclo de vida ───────────────────────────────
SUPPORT_DEFAULT_ASSIGNEE_ID=            # user_id da Laís (atribuição automática)
SUPPORT_HEAD_USER_ID=                   # user_id do Head de CS (notificações CSAT negativo)
SUPPORT_BUSINESS_TIMEZONE=America/Sao_Paulo
SUPPORT_BUSINESS_START=09:00
SUPPORT_BUSINESS_END=18:00
SUPPORT_SLA_POLLING_INTERVAL_MINUTES=5
SUPPORT_AUTO_CLOSE_DEFAULT_HOURS=48
SUPPORT_CSAT_TIMEOUT_DAYS=5
SUPPORT_CSAT_TOKEN_VALIDITY_DAYS=14

# ── Sistema ───────────────────────────────────────────────────
API_SECRET=
SYNC_INTERVAL_MINUTES=5

# ── Airtable (integração) ─────────────────────────────────────
AIRTABLE_TOKEN=
```

---

## Observações importantes

- **Resiliência de Ambiente**: O arquivo `env.ts` possui fallbacks para chaves ausentes. Em desenvolvimento local, o sistema não "crasha" se chaves como a `SERVICE_ROLE` estiverem vazias, usando dummies seguros para permitir o boot do Next.js.
- **RLS estrita**: cada CSM só acessa dados das contas onde é proprietário (`csm_owner_id`). O `service_role` é usado exclusivamente no backend para operações que precisam ignorar RLS (RAG, NPS público, shadow score).
- **Embeddings com 768 dims**: o pgvector e o Ollama usam 768 dimensões. O Gemini gera 1536 e é redimensionado em runtime para compatibilidade.
- **NPS é público**: os endpoints `/api/nps/check` e `/api/nps/response` têm CORS `*` e não exigem autenticação — são chamados pelo `embed.js` instalado nas instâncias dos clientes.
- **SMTP Auth no tenant Microsoft 365**: por padrão, autenticação SMTP básica pode estar desabilitada. Para habilitar: `Set-CASMailbox -Identity suporte@plannera.com.br -SmtpClientAuthenticationDisabled $false` (Exchange Online PowerShell). Usar App Password dedicada, não a senha da caixa.
- **Fallback CSAT**: se o SMTP falhar ao resolver um ticket, o flag `email_delivery_failed = true` é gravado em `csat_tokens` — o ticket NÃO é bloqueado. O agente pode resolver normalmente.
- **`SMTP_PASS` ≠ `IMAP_PASSWORD`**: são credenciais distintas — a App Password gerada para o SMTP não é a mesma senha usada pelo IMAP.
- **Crons via Supabase Edge Functions + pg_cron**: três jobs agendados (sla-polling a cada 5 min, ticket-auto-close a cada 15 min, csat-timeout 1x/dia às 08h). Todos chamam os endpoints Next.js com header `x-api-secret`.
- **Shadow Score com SLA**: o prompt do Shadow Score inclui `internal_level` e `sla_breach_resolution`. Tickets críticos pesam 2× e breach de SLA adiciona `sla_breached` aos risk_factors.
- **NPS default e unicidade**: apenas um programa pode ser `is_default` e apenas um pode ter `is_test_mode = true` por CSM. O PATCH garante isso atomicamente.
- **Fallback LLM**: se o Ollama local não responder dentro do timeout, a plataforma continua funcionando via Gemini e Claude automaticamente.
- **Health Score vs Shadow**: os dois convivem. O CSM pode discordar do shadow; se a diferença for maior que 20 pontos, um alerta é gerado para revisão.
- **Cost-to-Serve**: calculado como `(horas_csm × custo_hora_csm) / mrr` por contrato. Limites configuráveis via `COST_TO_SERVE_WARN` e `COST_TO_SERVE_CRITICAL`.
