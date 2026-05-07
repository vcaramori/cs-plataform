# CS Agents Pack — Squad de Customer Success para Plannera

Pacote de **8 skills** (1 gerente orquestrador + 7 especialistas) projetado para rodar dentro do **CS-Continuum** da Plannera, com forte ancoragem em **S&OP / S&OE / IBP** — o universo do cliente.

> Versão: v1.0 — mai/2026
> Idioma: Português (Brasil)
> Contexto: Plannera, SaaS B2B de planejamento (S&OP / IBP), mid-market

---

## Arquitetura conceitual

```
                    ┌─────────────────────────┐
                    │      cs-manager         │
                    │  (orquestrador / Head)  │
                    └────────────┬────────────┘
                                 │
        ┌─────────────┬──────────┼──────────┬─────────────┐
        │             │          │          │             │
        ▼             ▼          ▼          ▼             ▼
 ┌──────────┐ ┌─────────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────┐
 │   risk-  │ │  expansion- │ │ adoption- │ │ renewal- │ │     qbr-    │
 │ watchdog │ │    scout    │ │   coach   │ │strategist│ │  architect  │
 └──────────┘ └─────────────┘ └───────────┘ └──────────┘ └─────────────┘
                                 ┌───────────┐ ┌──────────┐
                                 │    voc-   │ │  cs-ops- │
                                 │  analyst  │ │  auditor │
                                 └───────────┘ └──────────┘

         ┌────────────────────────────────────────────────────┐
         │          references/ (conhecimento compartilhado)  │
         │    sop_soe_ibp.md  •  plannera_context.md          │
         │    cs_metrics.md   •  frameworks.md                │
         └────────────────────────────────────────────────────┘
```

---

## Os 8 agentes — quando usar cada um

### `cs-manager` — Orquestrador
Use quando a pergunta é **multidimensional** ("essa conta está em risco e tem oportunidade?"), quando precisa de **priorização** ("por onde começo?"), ou quando precisa **sintetizar** outputs múltiplos em decisão. Ele decide qual especialista acionar e em que ordem.

### `risk-watchdog` — Olhar pessimista
Caça sinais de churn. Use em qualquer suspeita de risco, antes de toda renovação, e em revisões mensais de carteira. Sua especialidade: ler sinais fracos, combinar evidências, classificar severidade.

### `expansion-scout` — Olhar oportunista
Caça oportunidades de expansão (módulos, licenças, sofisticação). Use em contas saudáveis em plateau, ao receber sinais de demanda nova, e em revisões trimestrais. Qualifica antes de propor (BANT adaptado).

### `adoption-coach` — Olhar de produto e processo
Diagnostica barreiras de adoção e bloqueadores de TTV. Use durante onboarding, em casos de baixa ativação, ou para planejar próximo salto de uso. Distingue adoção tática (S&OE), gerencial (S&OP) e executiva (IBP).

### `renewal-strategist` — Olhar de receita
Estratégia de ciclo de renovação. Use a partir de D-90 (90 dias antes do vencimento). Cobre prontidão, narrativa em 3 atos, estratégia de negociação com posições de saída pré-definidas.

### `qbr-architect` — Olhar executivo
Desenha QBRs e EBRs estruturadas, com narrativa em 3 atos (passado-presente-futuro), KPIs do mundo do cliente, e decisões escritas no fechamento. Especializado em ancorar valor em forecast accuracy, OTIF, DOI — não em "logins".

### `voc-analyst` — Olhar de inteligência
Sintetiza Voice of Customer de fontes múltiplas (NPS, tickets, QBRs, comunidade) em temas com frequência, severidade e ação. Distingue sinal de ruído. Cruza sentimento com saúde da conta.

### `cs-ops-auditor` — Olhar operacional interno
Audita o **time CS** (não o cliente). Cobre os 3 sub-times: CS, Implantação, Suporte. Métricas operacionais (FRT, CSAT, FCR, coverage, QBR coverage), gargalos, recomendações de processo e tooling.

---

## Padrões de uso

### Padrão 1 — Diagnóstico de uma conta
```
Usuário: "Como está a Acme Foods?"
↓
cs-manager (enquadra)
↓
risk-watchdog (paralelo) + expansion-scout (paralelo)
↓
[se uso fraco] adoption-coach
↓
cs-manager (sintetiza em 4 partes: diagnóstico, decisão, plano, riscos)
```

### Padrão 2 — Preparação de QBR
```
Usuário: "Preparar QBR da Beta Corp para próxima semana"
↓
cs-manager (enquadra: tier, sponsor, timing, tipo de QBR)
↓
risk-watchdog (riscos a abordar) + adoption-coach (saúde de uso) + expansion-scout (próximo salto)
↓
qbr-architect (estrutura final: agenda, KPIs, narrativa, decisões esperadas)
```

### Padrão 3 — Renovação iminente
```
Usuário: "Acme renova em jul/26. Status?"
↓
cs-manager
↓
risk-watchdog (prontidão de renovação)
↓
renewal-strategist (narrativa, plano por marco, posições)
↓
[se conta saudável] expansion-scout em paralelo (oportunidade junto da renovação)
```

### Padrão 4 — Auditoria do time
```
Usuário: "Como está o time CS este trimestre?"
↓
cs-manager (define escopo)
↓
cs-ops-auditor (snapshot 3 sub-times, gargalos, recomendações)
↓
voc-analyst (cruzamento com voz do cliente)
↓
cs-manager (síntese executiva)
```

---

## Conhecimento compartilhado (`references/`)

Todos os agentes têm acesso a estas referências. Use-as como ancoragem para soar nativo do mundo Plannera/S&OP.

- **`sop_soe_ibp.md`** — Os três horizontes de planejamento, KPIs (forecast accuracy, bias, FVA, OTIF, DOI), modelo de maturidade, vocabulário essencial. **Leitura obrigatória antes de QBR/expansão/adoption.**
- **`plannera_context.md`** — Quem é a Plannera, posicionamento, ICP, jornada do cliente, sinais de risco e oportunidade específicos, tom da casa.
- **`cs_metrics.md`** — Catálogo de métricas de CS (NRR, GRR, NPS, CSAT, health score, coverage, FRT, etc.) com benchmarks e armadilhas.
- **`frameworks.md`** — Frameworks gerais (Customer Journey, Outcome→Output→Activity, Success Plan, taxonomia de churn, BANT adaptado, princípios transversais).

---

## Princípios transversais — válidos para todos os agentes

1. **Decisão > análise.** Cada output termina com algo acionável.
2. **Evidência por trás de cada afirmação importante.** Sem dado, sem afirmação.
3. **Outcome > output.** Sempre amarre ferramenta a resultado de negócio.
4. **Pessoas, processo, tecnologia — nessa ordem.** O DNA da Plannera.
5. **Honestidade > otimismo.** Cliente sente quando o CSM disfarça.
6. **Ritmo > intensidade.** Cadência regular bate sprint heroico.
7. **Cliente fala primeiro.** Em descoberta, perguntar antes de propor.
8. **Decisão escrita > acordo verbal.** Toda reunião termina com texto.

---

## Como instalar no CS-Continuum

Cada subpasta em `skills/` contém um `SKILL.md` no formato Anthropic Skill (YAML frontmatter + instruções imperativas). Os agentes podem ser:

1. **Carregados como skills individuais** no orquestrador de agentes do CS-Continuum
2. **Encadeados via `cs-manager`** que decide qual acionar
3. **Plugados em workflows do Claude Code** para tarefas específicas (ex: gerar QBR automatizado)
4. **Expostos como ferramentas para um agente externo** (ex: agente de Slack que aciona `risk-watchdog` quando alguém menciona "risco")

A pasta `references/` deve ser acessível a todos os agentes — pode ser:
- Montada como volume compartilhado
- Carregada como contexto na inicialização de cada agente
- Indexada em vector store (pgvector) e recuperada por RAG conforme necessidade

---

## Roadmap sugerido (v2+)

- **`onboarding-pm`** — focado em condução técnica/projeto de onboarding (vs. `adoption-coach` que olha comportamento)
- **`escalation-resolver`** — gestão de escalações com produto/eng
- **`success-plan-writer`** — gerador de Success Plans estruturados
- **`exec-briefing`** — geração de briefing executivo curto (1 página, 5 min de leitura) para C-level Plannera
- **Integração ML** — agentes consumindo health scores, churn prediction, expansion scoring do próprio CS-Continuum

---

## Estrutura de arquivos

```
cs-agents-pack/
├── README.md                       (este arquivo)
├── skills/
│   ├── cs-manager/SKILL.md         (orquestrador)
│   ├── risk-watchdog/SKILL.md
│   ├── expansion-scout/SKILL.md
│   ├── adoption-coach/SKILL.md
│   ├── renewal-strategist/SKILL.md
│   ├── qbr-architect/SKILL.md
│   ├── voc-analyst/SKILL.md
│   └── cs-ops-auditor/SKILL.md
└── references/
    ├── sop_soe_ibp.md              (S&OP / S&OE / IBP - vocabulário e KPIs)
    ├── plannera_context.md         (contexto Plannera-específico)
    ├── cs_metrics.md               (métricas e benchmarks)
    └── frameworks.md               (frameworks gerais de CS)
```

---

## Créditos

Construído por Vinicius Caramori (Head of CS @ Plannera) com Claude. Base teórica em:
- Modelo de maturidade S&OP (Gartner / Oliver Wight)
- IBP framework (Oliver Wight)
- Frameworks de CS (SuccessCOACHING / Gainsight / Success League)
- Posicionamento e tom Plannera (fontes públicas)
- KPIs S&OP (Demand Planning best practices, SCOR, FVA)
