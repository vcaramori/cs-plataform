# 🤖 CS Agents Pack — Orientação para o Time

**Para:** Maria Mercado, Paulo Pauta, Pedro Prioriza  
**Data:** 2026-05-07  
**Assunto:** Como usar os 8 especialistas do CS Agents Pack na Plannera

---

## O Que É

Um squad de **8 agentes de IA especializados** em Customer Success, ancorando em **S&OP / S&OE / IBP** (universo do cliente Plannera). Cada um tem uma lente diferente.

**Localização:** `/cs-agents-pack/` na raiz do projeto

---

## Os 8 Especialistas — Quando Chamar

### 1. **cs-manager** 🎯 (Orquestrador)
**Quando:** Pergunta multidimensional que precisa de priorização ou síntese
- "Essa conta está em risco E tem oportunidade?"
- "Por onde começo com essa carteira?"
- "Preciso de visão 360 dessa conta antes da renovação"

---

### 2. **risk-watchdog** 🚨 (Caça de Churn)
**Quando:** Suspeita de risco, antes de renovação, ou revisão mensal
- "Quais contas estão em risco crítico?"
- "Que sinais fracos de churn vejo nessa conta?"
- "Está pronto para renovar ou tenho que resgatar antes?"

---

### 3. **expansion-scout** 📈 (Caça de Oportunidades)
**Quando:** Conta saudável em plateau, demanda nova, revisão trimestral
- "Que módulos podemos expandir com a Acme?"
- "Há sinais de upsell nessa contas?"
- "Pronto para propor expansão ou preciso validar primeiro?"

---

### 4. **adoption-coach** 🏃 (Saúde de Uso)
**Quando:** Onboarding, baixa ativação, ou bloqueadores de TTV
- "Por que a Beta Corp não saiu do básico?"
- "Como estruturo adoção tática (S&OE) vs gerencial (S&OP)?"
- "Qual é o próximo degrau de uso para essa conta?"

---

### 5. **renewal-strategist** 📋 (Renovação)
**Quando:** A partir de D-90 (90 dias antes do vencimento)
- "Como estruturo a renovação da Acme?"
- "Qual é minha narrativa de renovação?"
- "Qual é minha estratégia de negociação se houver objeção?"

---

### 6. **qbr-architect** 🏛️ (Reunião com Executivo)
**Quando:** Preparando QBR ou EBR estruturado
- "Como estruturo um QBR que ancore valor?"
- "Que KPIs do mundo do cliente devo usar?"
- "Qual é a narrativa em 3 atos (passado-presente-futuro)?"

---

### 7. **voc-analyst** 👂 (Voz do Cliente)
**Quando:** Sintetizar feedback de múltiplas fontes
- "O que o cliente realmente está dizendo (NPS + tickets + QBR)?"
- "Qual é o tema mais importante agora?"
- "Isso é sinal real ou ruído?"

---

### 8. **cs-ops-auditor** 🔍 (Auditoria Interna)
**Quando:** Analisar performance do time CS (não do cliente)
- "Como está o time de CS este trimestre?"
- "Qual é o gargalo: cobertura, processo ou tools?"
- "Que métricas estamos deixando de medir?"

---

## Padrões de Uso — Casos Comuns

### **Diagnóstico Completo de Uma Conta**
```
1. Chamar cs-manager (enquadra o problema)
2. Chamar risk-watchdog + expansion-scout (paralelo)
3. Se uso fraco: adoption-coach
4. cs-manager sintetiza em 4 partes:
   - Diagnóstico (onde estamos)
   - Decisão (o que fazer)
   - Plano (passo a passo)
   - Riscos (o que pode dar errado)
```

### **Preparação de QBR**
```
1. cs-manager (define tier, sponsor, tipo)
2. risk-watchdog + adoption-coach + expansion-scout (paralelo)
3. qbr-architect (estrutura final: agenda, KPIs, narrativa)
```

### **Renovação Iminente**
```
1. cs-manager (enquadra)
2. risk-watchdog (prontidão)
3. renewal-strategist (narrativa, plano, posições)
4. expansion-scout (oportunidade em paralelo)
```

### **Auditoria do Time CS**
```
1. cs-manager (define escopo)
2. cs-ops-auditor (snapshot do time)
3. voc-analyst (cruzar com voz do cliente)
4. cs-manager (síntese executiva)
```

---

## Conhecimento Compartilhado

Todos os agentes têm acesso a 4 documentos essenciais:

1. **`sop_soe_ibp.md`** → Os três horizontes de planejamento, KPIs, modelo de maturidade
2. **`plannera_context.md`** → Quem é Plannera, ICP, sinais de risco/oportunidade
3. **`cs_metrics.md`** → Catálogo de métricas com benchmarks
4. **`frameworks.md`** → Customer journey, BANT adaptado, taxonomia de churn

**Leitura obrigatória antes de QBR, renovação ou expansão.**

---

## 7 Princípios Transversais

1. **Decisão > análise** — Cada output é acionável
2. **Evidência > afirmação** — Sem dado, sem afirmação
3. **Outcome > output** — Sempre amarre a resultado de negócio
4. **Pessoas, processo, tecnologia** — Nessa ordem
5. **Honestidade > otimismo** — Cliente sente quando disfarça
6. **Ritmo > intensidade** — Cadência bate sprint heroico
7. **Cliente fala primeiro** — Pergunte antes de propor
8. **Decisão escrita** — Toda reunião termina com texto

---

## Como Chamar os Agentes

### Opção 1: Via Claude Code
```
Prompt: "@cs-manager Como está a Acme Foods?"
```

### Opção 2: Via Skill (se integrado ao CS-Continuum)
```
/risk-watchdog contas em risco este mês
/qbr-architect preparar QBR da Beta Corp
```

### Opção 3: Via API (desenvolvimento futuro)
```
POST /api/agents/cs-manager
POST /api/agents/expansion-scout
```

---

## Estrutura de Resposta Esperada

Cada agente retorna:

- **Diagnóstico** — O que está acontecendo
- **Severidade/Potencial** — Crítico, médio, baixo
- **Recomendação** — O que fazer
- **Próximos passos** — Ações específicas
- **Referências** — Dados/evidências que fundamentam

---

## Perguntas Frequentes

### P: Posso chamar múltiplos agentes para uma conta?
**R:** Sim! `cs-manager` orquestra os outros. Ele decide a sequência.

### P: Qual agente devo chamar primeiro?
**R:** `cs-manager` sempre. Ele enquadra e roteia para os especialistas.

### P: Os agentes "conversam" entre si?
**R:** Não diretamente. `cs-manager` sintetiza outputs paralelos.

### P: Onde fico se discordar da recomendação?
**R:** Cliente real > agente. Use as recomendações como segundo parecer, não como verdade absoluta.

### P: Preciso ler toda a documentação de referência?
**R:** Mínimo: `sop_soe_ibp.md` e `plannera_context.md` antes de qualquer QBR/renovação.

---

## Próximos Passos

- [ ] Ler esta orientação
- [ ] Acessar `/cs-agents-pack/` e explorar um agente
- [ ] Testar com uma conta real
- [ ] Feedback para `[email do projeto]`

---

**Versão:** 1.0  
**Atualizado:** 2026-05-07  
**Responsável:** Time de Plataforma
