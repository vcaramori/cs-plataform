# Roadmap CS-Continuum 2026

**Status:** 📋 Cards em criação  
**Última atualização:** 2026-04-28  
**Responsável:** John (PM) + Team BMAD

---

## 📌 Pré-requisitos (Antes de F1 Iniciar)

**Status:** ⏳ Aguardando aprovação

Antes de qualquer card de Fase 1 começar, estas 4 decisões precisam ser tomadas:

1. [Schema canônico de filtros (JSONB)](../_decisions.md#decisão-1-schema-canônico-de-filtros-serializados)
2. [Modelo de embedding (Gemini text-embedding-004)](../_decisions.md#decisão-2-modelo-de-embedding-padrão)
3. [Tabela ticket_events para auditoria](../_decisions.md#decisão-3-tabela-de-auditoria-de-eventos--ticket-events)
4. [Next.js Cron Route Handler para jobs](../_decisions.md#decisão-4-estratégia-de-background-jobs-cron)

👉 **Ver [_decisions.md](_decisions.md)** para detalhes e schema DDL obrigatório.

---

## 📚 Documentação Fundamental

- **[_definition-of-done.md](_definition-of-done.md)** — Checklist obrigatório para toda feature
- **[_components-map.md](_components-map.md)** — Componentes reutilizáveis (economiza tokens em F2-4)

---

## 🔴 FASE 1 — Suporte World-Class

**Objetivo:** Transformar a lista de tickets em um workspace de trabalho ágil, com IA auxiliando na triagem e automação de tarefas repetitivas.

**Sequência de entrega:** Ondas progressivas que agregam valor incrementalmente.

### Onda 1 — Contexto da Manhã (Alto impacto, baixo risco)

Após Onda 1, o CSM já tem uma ferramenta visualmente melhor para começar o dia.

| Card | Título | Complexidade | Status | Agente |
|------|--------|--------------|--------|--------|
| F1-01 | [Views Salvas](fase1/F1-01-views-salvas.md) | M | 📋 Ready | — |
| F1-02 | [Filtros Compostos](fase1/F1-02-filtros-compostos.md) | M | 📋 Ready | — |
| F1-18 | [Categorização Automática](fase1/F1-18-categorizacao-automatica.md) | P | 📋 Ready | — |
| F1-19 | [Resumo do Ticket](fase1/F1-19-resumo-ticket.md) | P | 📋 Ready | — |

---

### Onda 2 — Triagem Rápida (Paralelo possível)

Preview inline permite triagem 10x mais rápida; bulk actions resolvem N tickets de uma vez.

| Card | Título | Complexidade | Status | Agente |
|------|--------|--------------|--------|--------|
| F1-05 | [Preview Inline](fase1/F1-05-preview-inline.md) | P | 📋 Ready | — |
| F1-03 | [Bulk Actions](fase1/F1-03-bulk-actions.md) | P | 📋 Ready | — |
| F1-12 | [Reabertura Manual](fase1/F1-12-reopen-manual.md) | P | 📋 Ready | — |
| F1-04 | [Busca Semântica](fase1/F1-04-busca-semantica.md) | G | 📋 Ready | — |

---

### Onda 3 — Inteligência e Automação (Paralelo com reservas)

IA começa a trabalhar autonomamente: detecta duplicatas, reabre tickets, sugere respostas.

| Card | Título | Complexidade | Status | Agente |
|------|--------|--------------|--------|--------|
| F1-11 | [Detecção de Duplicata](fase1/F1-11-deteccao-duplicata.md) | M | 📋 Ready | — |
| F1-08 | [Reopen Automático](fase1/F1-08-reopen-automatico.md) | M | 📋 Ready | — |
| F1-09 | [Auto-close por Prioridade](fase1/F1-09-auto-close-prioridade.md) | P | 📋 Ready | — |
| F1-20 | [Sentiment Trend](fase1/F1-20-sentiment-trend.md) | M | 📋 Ready | — |
| F1-06 | [Detecção de Colisão](fase1/F1-06-deteccao-colisao.md) | M | 📋 Ready | — |
| F1-07 | [Urgency Scoring](fase1/F1-07-urgency-scoring.md) | G | 📋 Ready | — |

---

### Onda 4 — Queue e Atribuição (Paralelo limitado)

Sistema distribui carga inteligentemente; merge resolve duplicatas de forma segura.

| Card | Título | Complexidade | Status | Agente |
|------|--------|--------------|--------|--------|
| F1-14 | [Fila com Capacidade](fase1/F1-14-fila-capacidade-csm.md) | M | 📋 Ready | — |
| F1-15 | [Atribuição Automática](fase1/F1-15-atribuicao-automatica.md) | G | 📋 Ready | — |
| F1-16 | [Escalonamento SLA](fase1/F1-16-escalonamento-sla.md) | M | 📋 Ready | — |
| F1-13 | [Formulário Público/Webhook](fase1/F1-13-formulario-publico.md) | M | 📋 Ready | — |
| F1-10 | [Merge de Tickets](fase1/F1-10-merge-tickets.md) | G | 📋 Ready | — |
| F1-17 | ["O que Responder?" RAG](fase1/F1-17-oque-responder.md) | G | 📋 Ready | — |

---

## 🟡 FASE 2 — Customer 360 + Health Engine

**Pré-requisito:** F1 rodando em produção por >= 30 dias (colher dados para Health Score)

| Card | Título | Complexidade | Status |
|------|--------|--------------|--------|
| F2-01 | [Timeline Unificada](fase2/F2-01-timeline-unificada.md) | G | 📋 Ready |
| F2-02 | [Health Score Ponderado](fase2/F2-02-health-score-ponderado.md) | G | 📋 Ready |
| F2-03 | [Segmentação Dinâmica](fase2/F2-03-segmentacao-dinamica.md) | M | 📋 Ready |

---

## 🟢 FASE 3 — Playbooks + Alertas Proativos

| Card | Título | Complexidade | Status |
|------|--------|--------------|--------|
| F3-01 | [Playbooks MVP](fase3/F3-01-playbooks-mvp.md) | M | 📋 Ready |
| F3-02 | [Motor de Alertas Proativos](fase3/F3-02-motor-alertas.md) | G | 📋 Ready |
| F3-03 | [Success Plans MVP](fase3/F3-03-success-plans.md) | M | 📋 Ready |

---

## 🔵 FASE 4 — Analytics, Integrações e Escala

| Card | Título | Complexidade | Status |
|------|--------|--------------|--------|
| F4-01 | [Portfolio Analytics](fase4/F4-01-portfolio-analytics.md) | G | 📋 Ready |
| F4-02 | [Renewal Management Workflow](fase4/F4-02-renewal-management.md) | M | 📋 Ready |
| F4-03 | [Integração HubSpot](fase4/F4-03-integracao-hubspot.md) | M | 📋 Ready |
| F4-04 | [Integração Billing (Stripe/Omie)](fase4/F4-04-integracao-billing.md) | M | 📋 Ready |
| F4-05 | [Integração Product Telemetry](fase4/F4-05-integracao-telemetria.md) | M | 📋 Ready |
| F4-06 | [Integração Slack](fase4/F4-06-integracao-slack.md) | P | 📋 Ready |

---

## 📊 Legenda de Status

| Status | Significado |
|--------|-----------|
| 📋 Ready | Card documentado, pronto para execução |
| 🔄 In Progress | Agente BMAD rodando |
| ✅ Completo | Mergeado em main, em produção ou validado |
| ⏳ Bloqueado | Aguardando decisão ou card anterior |
| ❌ Descartado | Escopo reduzido ou removido do roadmap |

---

## 🎯 Estratégia de Paralelização

**Onda 1 (4 cards):** Sequencial (F1-01 → F1-02 usa FilterBuilder de F1-01)

**Onda 2 (4 cards):** Paralelo total — nenhuma dependência cruzada

**Onda 3 (6 cards):** Paralelo com reservas:
- F1-11 (duplicata) bloqueia em F1-04 (embeddings)
- Resto independente

**Onda 4 (6 cards):** Paralelo limitado:
- F1-15 (atribuição) bloqueia em F1-14 (capacidade)
- F1-16 (escalonamento) bloqueia em F1-14
- F1-10 (merge) e F1-17 (RAG) deixar para o final (maior risco, maior impacto)

---

## 💡 Dicas de Execução (BMAD)

### Como chamar um agente para executar um card:

```
Use o agente dev apropriado:
/bmad-agent-dev [nome do card]

Exemplo:
/bmad-agent-dev F1-01 Views Salvas

O card tem tudo que o agente precisa:
- Contexto do problema
- Schema / migrações
- Arquivos afetados
- Padrões de código
- Critérios de aceite
- Definition of Done
```

### Como rastrear progresso entre sessões:

1. Cada card tem campo `Status` atualizado aqui
2. Cards concluídos linkam para PR/commit no changelog
3. Cards bloqueados documentam por quê

### Como economizar tokens:

- Reutilizar componentes do `_components-map.md` (não reinventar)
- Cards bem documentados = menos perguntas do agente
- FilterBuilder bem feito em F1-02 = F2-03 sai em 50% dos tokens

---

## 📝 Histórico de Versões

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-04-28 | 1.0 | Roadmap inicial criado após party mode com time |

---

## 🤝 Contatos (Team BMAD)

- **PM:** John (PRD, requisitos, priorização)
- **Arquitetura:** Winston (schema, decisões irreversíveis)
- **UX:** Sally (padrões, componentes, experiência)
- **Dev:** Amelia (implementação, estimativas, padrões de código)
- **QA:** Murat (testes, ACs, Definition of Done)

---

## 🚀 Próximo Passo

1. ✅ Aprovação das 4 decisões em `_decisions.md`
2. ✅ Criar 5 tabelas novas em Supabase
3. ✅ Iniciar Onda 1 com `/bmad-agent-dev F1-01`

**Agora é com você, Vinicius.** Cards prontos, time alinhado, pronto para começar.
