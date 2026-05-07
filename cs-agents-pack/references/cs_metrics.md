# Métricas de Customer Success — Referência

Catálogo de métricas que os agentes usam para diagnóstico, QBR e priorização. Para cada métrica: o que é, como calcula, alvo razoável e armadilhas.

---

## Métricas de Receita

### NRR (Net Revenue Retention)
- **Fórmula:** (MRR início + Expansão − Contração − Churn) / MRR início
- **Alvo SaaS B2B mid-market:** ≥ 110% é bom, ≥ 120% é excelente
- **Para Plannera:** o salto S&OP→IBP é o maior driver de NRR. Cliente plateau é NRR ~100%.
- **Armadilha:** NRR alto pode esconder GRR ruim compensado por expansão concentrada em poucas contas

### GRR (Gross Revenue Retention)
- **Fórmula:** (MRR início − Contração − Churn) / MRR início
- **Alvo SaaS B2B mid-market:** ≥ 90%
- **Por que importa:** mostra a saúde "pura" da retenção sem maquiagem de upsell
- **Mistura com NRR:** delta NRR-GRR mostra o motor de expansão

### Logo Retention / Logo Churn
- **Fórmula:** (Clientes início − Clientes que saíram) / Clientes início
- **Alvo:** > 90% logo retention anual em B2B mid-market
- **Quando importa mais que GRR:** quando o ARR médio é homogêneo. Para Plannera, com ticket variável, GRR conta mais.

### CAC Payback
- **Fórmula:** CAC / (ARR × Margem Bruta)
- **Alvo:** < 12 meses; < 18 meses ainda é defensável
- **CS impacta indiretamente** via reduzir churn no payback period

### LTV / CAC
- **Alvo:** > 3:1
- **CS impacta via LTV** (vida útil + expansão)

---

## Métricas de Saúde de Conta

### Customer Health Score
- **Modelo típico:** combinação ponderada de 4-7 dimensões
  - Uso do produto (frequência, breadth de features, usuários ativos)
  - Resultado de negócio (KPIs do cliente)
  - Engajamento (presença em rituais, resposta, sentimento)
  - Saúde comercial (pagamentos, contrato, sponsor)
  - Suporte (tickets, severidade, NPS pós-atendimento)
- **Output:** verde / amarelo / vermelho ou score 0-100
- **Armadilha:** modelos estáticos envelhecem. Recalibre semestralmente.
- **Para Plannera:** uso de produto deve incluir "rituais executados" (reunião de consenso, executiva), não só logins

### NPS (Net Promoter Score)
- **Fórmula:** % Promotores − % Detratores (escala 0-10)
- **Alvo:** > 30 é bom, > 50 é excelente em B2B
- **Use com cautela:** baixo n estatístico, sazonalidade, viés de momento. Sempre cruze com churn real.

### CSAT (Customer Satisfaction Score)
- **Fórmula:** % de 4-5 em escala 1-5 (ou similar)
- **Alvo:** > 85%
- **Quando usar:** pontual, pós-interação (ticket, treinamento, QBR)

### CES (Customer Effort Score)
- **Fórmula:** "Quão fácil foi resolver seu problema?" (escala 1-7)
- **Quando usar:** medir fricção em onboarding, suporte, mudanças de processo

---

## Métricas de Adoção

### TTV (Time to Value)
- **Definição:** tempo entre fechamento e primeiro valor mensurável
- **Para Plannera:** primeiro forecast aceito + primeira reunião de consenso = TTV baseline
- **Alvo:** < 90 dias para o primeiro marco; < 6 meses para acuracidade mensurável

### Product Adoption Score
- **Componentes possíveis:**
  - Breadth — quantos módulos/features ativos / total disponível
  - Depth — uso recorrente desses módulos
  - Frequency — DAU/WAU/MAU por persona
  - Workflow completion — tarefas-chave concluídas no fluxo

### Active User Ratio
- **Fórmula:** Usuários ativos no mês / Licenças contratadas
- **Alvo:** > 70%
- **Segmentação importante:** por persona (planejador, gestor, executivo). Executivo loga pouco — não é problema.

### Feature Stickiness
- **Fórmula:** DAU / MAU para uma feature específica
- **Quando usar:** identificar features que viraram parte do dia a dia vs. features esquecidas

---

## Métricas de Renovação e Risco

### Renewal Rate
- **Logo renewal rate:** % de contratos renovados (sem considerar valor)
- **Dollar renewal rate:** % do ARR elegível que renovou
- **Alvo:** > 90% para mid-market saudável

### Renewal at Risk %
- % do ARR em janela 90/60/30 dias com health amarelo/vermelho
- **Use para priorização:** quanto da carteira precisa de intervenção urgente

### Churn Reasons (segmentação qualitativa)
Tipologia mínima para classificar churn voluntário:
- Falta de valor percebido (mais comum, frequentemente onboarding ruim)
- Mudança de stack/empresa
- Problema de produto (feature, qualidade, performance)
- Problema de relacionamento (CSM, suporte)
- Preço (raramente é o real motivo, mais comum como sintoma)
- Fim do projeto/uso (quando aplicável)

> Sempre classifique churn — sem isso, retenção não evolui.

---

## Métricas Operacionais de CS

### Coverage Ratio
- ARR sob gestão / CSM
- **Benchmark mid-market:** $1-3M ARR por CSM em alto-touch; mais em low-touch

### Quarterly Business Review (QBR) Coverage
- % de contas estratégicas com QBR no trimestre
- **Alvo:** 100% para top tier; 80%+ para mid tier

### Ticket Metrics (Suporte)
- **First Response Time (FRT)** — tempo até primeira resposta
- **Resolution Time** — tempo total até fechamento
- **First Contact Resolution (FCR)** — % resolvido sem reabertura
- **Backlog Age** — distribuição de idade dos tickets abertos
- **CSAT pós-atendimento** — satisfação amarrada ao ticket
- **SLA Adherence** — % de tickets dentro do SLA contratado

### Escalation Rate
- **Fórmula:** Tickets escalados / Total
- **Alvo:** < 15% — acima disso indica capacitação ou produto

---

## Métricas Específicas de S&OP (que o CS Plannera deve dominar)

Estas são as métricas que **o cliente da Plannera mede sobre o próprio negócio** — o CS deve falar fluentemente sobre elas.

### Forecast Accuracy / WMAPE / MAPE
- **WMAPE** (Weighted MAPE) é o mais usado em produção pesada
- **Alvo (referência):**
  - SKUs maduros estáveis: 90-95%
  - SKUs voláteis/sazonais: 80-90%
  - Lançamentos novos: 70-80%
- **Como usar em QBR:** mostrar evolução temporal, não snapshot

### Forecast Bias / Tracking Signal
- Detecta viés sistemático
- **Alvo:** próximo de zero, dentro de banda razoável

### Forecast Value Add (FVA)
- Mostra quanto cada interveniente humano agrega ou destrói sobre o forecast estatístico
- **Métrica ouro de QBR avançado:** mostrar que o processo está agregando valor (ou expor onde não está)

### Service Level / OTIF (On Time In Full)
- **Alvo:** > 95% para produtos maduros
- **Liga direto a satisfação do cliente do cliente** — narrativa poderosa

### Days of Inventory (DOI) / Inventory Turns
- DOI: quantos dias de venda há em estoque
- Turns: COGS / Estoque médio
- **Conexão de valor:** redução de DOI mantendo OTIF = capital de giro liberado, $$$

### Plan Adherence / Plan Stability
- % do plano executado conforme acordado
- Mudanças dentro de janela congelada (frozen window)

---

## Como usar este catálogo

- **Para priorização** — o `risk-watchdog` cruza Health Score com NRR projetado e ARR
- **Para QBR** — o `qbr-architect` escolhe 5-7 métricas, sendo no mínimo 2 do mundo do cliente (forecast accuracy, DOI) e 2 do produto (uso, ritual)
- **Para auditoria de time** — o `cs-ops-auditor` cobre coverage, QBR, NPS, CSAT, FRT
- **Para expansão** — o `expansion-scout` busca clientes que bateram alvos e estão em plateau

> **Regra de ouro:** uma métrica sem alvo e sem evolução temporal é decoração. Sempre apresente: valor atual + alvo + delta + tendência.
