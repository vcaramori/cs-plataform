# S&OP, S&OE e IBP — Referência para Agentes de CS

Este documento dá ao agente o vocabulário, os horizontes de planejamento, os papéis envolvidos e os KPIs que rondam o universo do cliente Plannera. Use sempre que for falar sobre valor de negócio, prova de valor, QBR/EBR, expansão, retenção ou diagnóstico de uso.

---

## Os três horizontes — visão de cima

| Camada | Horizonte | Cadência | Granularidade | Quem lidera | Pergunta que responde |
|---|---|---|---|---|---|
| **IBP** (Integrated Business Planning) | 12–48 meses | Mensal/trimestral | Linhas de negócio, portfólio, financeiro | C-level (CEO/CFO/COO) | "A estratégia de negócio está sendo executada e financeiramente viável?" |
| **S&OP** (Sales & Operations Planning) | 3–18 meses | Mensal | Família de produto, agregado | Supply Chain / Planejamento | "Demanda e capacidade estão balanceadas no médio prazo?" |
| **S&OE** (Sales & Operations Execution) | 0–13 semanas | Semanal/diária | SKU, ordem, cliente | Operações / Demanda | "O plano está sobrevivendo à realidade desta semana?" |

**Sacada que o agente precisa internalizar:** o cliente da Plannera não compra "um software de previsão". Compra uma **mudança de processo** que conecta esses três horizontes. Quando o CSM fala em "valor", precisa amarrar os três.

---

## S&OP — o coração do processo

### Definição operacional

Processo colaborativo, tático, mensal, que reconcilia demanda, suprimento e finanças em torno de um único plano. Envolve cinco etapas clássicas:

1. **Revisão de Portfólio / Produto** — lançamentos, descontinuações, mix
2. **Revisão de Demanda** — consenso de previsão entre vendas, marketing e demanda
3. **Revisão de Suprimento** — capacidade produtiva, lead times, restrições
4. **Reconciliação Pré-Executiva** — gaps entre demanda e suprimento, cenários financeiros
5. **Reunião Executiva** — decisões, trade-offs, escalações

### Sinais de S&OP imaturo (red flags que o CS deve detectar)

- Reuniões executivas viram "report de status" em vez de fórum de decisão
- Forecast accuracy abaixo de 70% em SKUs maduros
- Forecast bias persistente (sempre otimista ou sempre pessimista)
- Vendas e Operações operam com números diferentes
- Decisões da reunião executiva não viram ação rastreável
- O processo é "do supply chain" e não da empresa
- Finanças não senta na reunião

### KPIs centrais de S&OP

**Diagnósticos (saúde do processo)**
- Forecast Accuracy (MAPE / WMAPE) — alvo 90–95% em SKUs maduros, 70–80% em novos/voláteis
- Forecast Bias — alvo entre -4 e +4 ao longo de 24 períodos
- Tracking Signal — detecta viés sistemático
- Plan Adherence — quanto o plano executado bateu com o plano acordado
- Schedule Adherence das reuniões — % de reuniões no prazo com decisões fechadas

**Resultados de negócio**
- Service Level / OTIF (On Time In Full)
- Inventory Turns / Days of Inventory
- Working Capital
- Capacity Utilization
- Margin / Revenue vs. plano

> **Como o CS usa isso:** o `qbr-architect` e o `expansion-scout` precisam mostrar evolução desses KPIs ao longo do tempo. Forecast accuracy subindo 5pp + redução de DOI (Days of Inventory) é a história mais poderosa que existe num QBR de Plannera.

---

## S&OE — o "short game"

### Definição operacional

Processo semanal, tático, que mantém o plano S&OP vivo diante da realidade do dia a dia. Cobre 0 a 13 semanas. A pergunta é: "como ajustamos hoje para não destruir o plano do mês?"

Atividades típicas:
- Demand sensing (sinais de POS, pedidos firmes, eventos)
- Reconciliação de pedidos firmes vs. previsão
- Ajuste de produção e compras
- Realocação de estoque
- Tratamento de exceções (SKU em ruptura, atraso de fornecedor, demanda fora da curva)

### Por que importa para CS

S&OE é onde o cliente sente o software no dia a dia. Se o usuário operacional não confia na ferramenta na segunda-feira de manhã, o S&OP cai. **Adoption gaps em S&OE são preditores fortíssimos de churn**, mesmo quando o S&OP está bem-sucedido em camada gerencial.

Sinais de problema em S&OE:
- Time operacional voltou a planilhar fora da ferramenta
- Reuniões semanais foram canceladas ou viraram "abre exceções e fecha"
- Tempo de ciclo entre alerta e ação é alto (>48h)
- "Single source of truth" se fragmentou — cada área tem seu número

---

## IBP — o "big game"

### Definição operacional

Evolução do S&OP que sobe para a camada executiva. Integra portfólio, demanda, suprimento e **finanças** num único plano, com horizonte 12–48 meses, liderado por C-level. Foca em **valor**, não só em **volume**.

A diferença prática do S&OP:
- Finanças não é convidada — é dona do processo junto com Supply
- Decisões são sobre alocação de capital, M&A, novos mercados, descontinuações estratégicas
- O ciclo termina em uma Management Business Review com CEO/CFO

### Por que importa para CS

Cliente que está saindo de S&OP maduro para IBP é o cliente com **maior potencial de expansão** (módulos de portfólio, financeiro, simulação de cenários). Cliente que ainda está em S&OP tático é o cliente com **maior risco de plateau** se a Plannera não puxar a maturidade.

A jornada típica: S&OP volume → S&OP value → IBP. O CS deve mapear cada conta nesse continuum.

---

## Modelo de maturidade (referência simplificada — Gartner-like)

| Estágio | Nome | Descrição | O que o cliente precisa ouvir |
|---|---|---|---|
| 1 | **Reativo** | Sem processo, decisões ad-hoc, planilhas | "Você está perdendo dinheiro silenciosamente. Vamos mostrar onde." |
| 2 | **Antecipatório** | S&OP básico de supply chain, foco em volume | "Você já tem o motor — agora precisa do combustível: governança e dado." |
| 3 | **Colaborativo** | S&OP cross-funcional, finanças entra | "Hora de pensar valor, não só volume. IBP começa aqui." |
| 4 | **Orquestrado** | IBP rodando, cenários, decisões executivas | "Vamos sofisticar: simulação, ML, prescritivo." |
| 5 | **Adaptativo** | Real-time, AI-driven, agile | "Você é referência. Vamos exportar o modelo." |

O CSM **deve saber em qual estágio cada conta está** e ter um roadmap de 12–24 meses para o próximo.

---

## Vocabulário essencial (não confundir)

- **Demand Sensing** ≠ Demand Planning. Sensing é leitura de sinais de curtíssimo prazo (POS, redes sociais, clima). Planning é o número consensado.
- **Forecast Value Add (FVA)** — quanto cada interveniente humano agregou (ou destruiu) sobre o forecast estatístico. Métrica reveladora — se vendas piora o forecast, isso é gold para QBR.
- **Consensus Forecast** — o número único que sai da reunião de demanda
- **Frozen Window / Time Fence** — período em que o plano não pode mais ser alterado
- **CPFR** (Collaborative Planning, Forecasting and Replenishment) — colaboração com clientes/fornecedores externos. Plannera oferece.
- **Sell-in vs. Sell-out** — sell-in é o que sai da fábrica para o canal; sell-out é o que sai para o consumidor final. Plannera tem visão dos dois.
- **Make-to-Stock vs. Make-to-Order** — afeta totalmente a lógica de planejamento
- **Postponement** — adiar a customização final do produto para o último momento

---

## Como o agente usa este conhecimento

1. **Ao analisar uma conta** — mapeie em qual estágio de maturidade ela está e qual o próximo salto
2. **Ao montar QBR** — sempre conte a história em três camadas: o que mudou em S&OE (esta semana), em S&OP (este mês), em IBP (este trimestre)
3. **Ao olhar churn risk** — degradação em S&OE é o early warning. Cliente que perdeu o ritual semanal está sangrando antes de saber.
4. **Ao buscar expansão** — cliente em estágio 2/3 maduro é candidato a IBP, módulo financeiro, ML/AI prescritivo
5. **Ao escrever para o cliente** — use a linguagem dele. "Acuracidade de demanda", "reunião de consenso", "plano irrestrito vs. restrito" são termos que abrem portas.
