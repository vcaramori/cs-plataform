# 🤖 AGENTS REGISTRY — Descoberta Central

**Propósito:** Índice global de todos os agentes de IA disponíveis no projeto  
**Audiência:** Todas as LLMs, ferramentas, orquestrador, IDEs  
**Data:** 2026-05-07  
**Versão:** 1.0

---

## 📍 CS Agents Pack (Installado)

**Localização:** `/cs-agents-pack/skills/`  
**Versão:** 1.0  
**Criadores:** Paulo Pauta, Pedro Prioriza  
**Responsável:** Maria Mercado (usuária principal)

### Agentes Disponíveis

| ID | Nome | Propósito | Quando Usar | Inputs | Outputs |
|----|----|---------|-------------|--------|---------|
| **cs-manager** | Mário Mentor | Enquadragem + roteamento multidimensional | Pergunta complexa que precisa de priorização | Account ID, contexto CSM | Diagnóstico + decisão + plano + riscos |
| **risk-watchdog** | Rita Resgate | Caça sinais fracos de risco | Suspeita de risco, antes de renovação, revisão mensal | Account ID, dados últimos 90d | Severidade + sinais + ação recomendada |
| **expansion-scout** | Edu Expansão | Identifica upsell/módulos/crescimento | Conta saudável em plateau, sinais de demanda | Account ID, histórico uso | Módulos qualificados + potencial ARR + BANT |
| **adoption-coach** | Alice Adoção | Barreiras de uso e próximos degraus | Onboarding, baixa ativação, bloqueadores | Account ID, métricas uso | Diagnóstico adoção + plano TTV |
| **renewal-strategist** | Renato Renova | Ciclo renovação + narrativa + negociação | A partir D-90 (90 dias antes vencimento) | Account ID, data renovação, contexto | Narrativa + plano por marco + posições |
| **qbr-architect** | Vera Valor | Desenha reunião executiva estruturada | Preparando QBR ou EBR | Account ID, tier, sponsor, KPIs cliente | Agenda + narrativa 3 atos + decisões esperadas |
| **voc-analyst** | Vico Voz | Sintetiza voz do cliente | Análise feedback, descoberta padrões | Account ID, fonte (NPS/tickets/QBR) | Temas + frequência + severidade + ação |
| **cs-ops-auditor** | Otto Ops | Avalia performance do time CS | Snapshot trimestral, gargalos, recomendações | Período, sub-times | Métricas + gargalos + recomendações |

---

## 📚 Conhecimento Compartilhado

Todos os agentes têm acesso a:

```
/cs-agents-pack/references/
├── sop_soe_ibp.md           # Universo S&OP/S&OE/IBP, KPIs, modelos
├── plannera_context.md      # Quem é Plannera, ICP, sinais risco/oportunidade
├── cs_metrics.md            # Catálogo de métricas com benchmarks
└── frameworks.md            # Customer journey, BANT, taxonomia churn
```

---

## 🔌 Como Integrar / Chamar

### Opção 1: Via Prompt Direto (Claude, qualquer LLM)
```
Prompt: "@cs-manager Como está a Acme Foods?"
Output: Diagnóstico estruturado + decisão + plano
```

### Opção 2: Via Skill (se integrado ao orquestrador)
```
/cs-manager account=acme-foods
/risk-watchdog accounts=at-risk
/qbr-architect account=beta-corp date=2026-05-15
```

### Opção 3: Via API (desenvolvimento futuro)
```bash
POST /api/agents/cs-manager
Content-Type: application/json
{
  "account_id": "acme-foods",
  "context": "diagnóstico completo"
}
```

### Opção 4: Via MCP Server (implementação futura)
```
mcp://cs-agents/cs-manager?account=acme-foods
```

---

## 🎯 Padrões de Orquestração

### Diagnóstico Completo
```
1. Mário Mentor (enquadra)
2. Rita Resgate (paralelo) + Edu Expansão (paralelo)
3. [se adoção fraca] Alice Adoção
4. Mário Mentor (sintetiza em 4 partes)
```

### Preparação QBR
```
1. Mário Mentor (define tier/sponsor/tipo)
2. Rita Resgate + Alice Adoção + Edu Expansão (paralelo)
3. Vera Valor (estrutura final)
```

### Renovação
```
1. Mário Mentor
2. Rita Resgate (prontidão)
3. Renato Renova (narrativa/plano/posições)
4. Edu Expansão (paralelo, se saudável)
```

### Auditoria Time
```
1. Mário Mentor (define escopo)
2. Otto Ops (snapshot)
3. Vico Voz (cruzar com cliente)
4. Mário Mentor (síntese executiva)
```

---

## ✅ Checklist de Integração

- [x] Pack descompactado em `/cs-agents-pack/`
- [x] Registry criado (`AGENTS-REGISTRY.md`)
- [x] Orientação criada (`CS-AGENTS-PACK-ORIENTATION.md`)
- [x] Indexado em `memory/MEMORY.md`
- [ ] Integrado em settings.json (skills do Claude Code)
- [ ] Endpoint API `/api/agents/[agente]` implementado
- [ ] MCP server registrado (futuro)
- [ ] Test suite criado (futuro)

---

## 🔐 Princípios Transversais

1. **Decisão > análise** — Cada output é acionável
2. **Evidência > afirmação** — Sem dado, sem afirmação
3. **Outcome > output** — Sempre amarre a resultado de negócio
4. **Pessoas, processo, tecnologia** — Nessa ordem
5. **Honestidade > otimismo** — Cliente sente disfarço
6. **Ritmo > intensidade** — Cadência bate sprint
7. **Cliente fala primeiro** — Pergunte antes de propor
8. **Decisão escrita** — Toda reunião termina com texto

---

## 📞 Contatos

- **Criadores:** Paulo Pauta, Pedro Prioriza
- **Usuária Principal:** Maria Mercado
- **Tech Lead:** Vinicius Caramori
- **Feedback/Issues:** [canal projeto]

---

## 🚀 Próximos Passos

1. Integrar skills em `.claude/settings.json` (Claude Code discovery)
2. Criar `/api/agents/[name]` endpoint (API disponibilidade)
3. Adicionar testes automatizados
4. Documentar em README principal
5. Treinar time em padrões de uso

---

**Status:** ✅ Registry criado. Agentes prontos para descoberta por qualquer LLM/ferramenta.
