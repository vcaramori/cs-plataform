# Frameworks de Customer Success — Referência

Compilado de modelos mentais que os agentes usam para estruturar análises e respostas. Não é exaustivo — é o conjunto que cobre 80% dos casos do dia a dia de um CSM em SaaS B2B mid-market.

---

## 1. Customer Journey — fases e marcos

```
Sales handoff → Onboarding → Adoção → Maturação → Renovação ↻ Expansão
                              ↓
                            Risco (transversal)
```

**Marcos críticos por fase:**

- **Onboarding** — kickoff, integração técnica, primeiro use case ao vivo, treinamento, "go live"
- **Adoção** — primeiro valor mensurável (TTV), uso recorrente, segundo use case
- **Maturação** — evolução de KPI do cliente, expansão de personas, embedding em rituais
- **Renovação** — health check 90/60/30, reunião de valor, proposta, fechamento
- **Expansão** — mapeamento de oportunidade, business case, pricing, fechamento

> Para Plannera, "Adoção" tem duas camadas: tática (S&OE — usuário operacional) e gerencial (S&OP — gestor). Skills devem distinguir.

---

## 2. Outcome → Output → Activity (Causa e efeito)

Quando estruturar plano de retenção/expansão, sempre amarre as três camadas:

- **Outcome (resultado de negócio do cliente):** "Reduzir DOI em 15% mantendo OTIF acima de 95%"
- **Output (entregável do produto):** "Forecast accuracy de 88% para top SKUs"
- **Activity (ação concreta):** "Implementar reunião semanal de S&OE com pauta padrão"

CSM imaturo fala em activities. CSM senior fala em outcomes e amarra activities a eles.

---

## 3. RACI dos rituais (Responsável, Aprovador, Consultado, Informado)

Para QBR, success plan e renovação, o agente sempre verifica que cada ritual tem:
- **R** — quem executa
- **A** — quem aprova/decide
- **C** — quem é consultado para input
- **I** — quem precisa saber do resultado

Sintoma de problema: ritual sem A claro vira reunião sem decisão. Ritual sem C reincidente quebra colaboração.

---

## 4. Success Plan estruturado

Documento que materializa "para onde vamos juntos". Estrutura mínima:

1. **Estado atual** — onde o cliente está hoje (KPIs, processo, maturidade)
2. **Estado desejado** — onde quer chegar em 12-24 meses
3. **Gaps** — o que está entre os dois estados
4. **Iniciativas** — o que vai ser feito (com owner e prazo)
5. **Marcos de valor** — quando saberemos que avançamos
6. **Riscos** — o que pode atrapalhar e mitigação

> Success plan que vira PDF estático morre. O bom é versionado e revisado em ritual recorrente (QBR, mensal de governança).

---

## 5. QBR — estrutura canônica

Para o `qbr-architect`. Estrutura recomendada (ajustar a 60–90 min):

1. **Abertura e check-in** (5 min) — quem está, agenda, contexto
2. **Recapitulação dos compromissos** do último QBR (5 min)
3. **Resultados e KPIs** (15 min) — o que melhorou, o que piorou, por quê
4. **Análise crítica** (15 min) — o que aprendemos, onde vamos
5. **Roadmap e próximos passos** (15 min) — iniciativas, prioridades
6. **Risco e suporte** (10 min) — bloqueios, escalações, ajuda necessária
7. **Decisões e fechamento** (5 min) — o que foi decidido, owners, prazos

**Princípios:**
- Comece com resultado, não com produto
- Mostre a história, não só o snapshot
- Termine com decisão escrita, não com "vamos pensar"
- Cliente fala 40-50%; CSM 30-40%; produto/outros 10-20%

---

## 6. Churn risk — taxonomia de sinais

Os agentes (especialmente `risk-watchdog`) classificam sinais em quatro buckets:

**Sinais de uso (telemetria)**
- Queda de DAU/WAU/MAU
- Redução de breadth de features usadas
- Logins concentrados em poucos usuários
- Workflows-chave não executados
- Para Plannera: rituais (reunião de consenso, executiva) não executados

**Sinais de relacionamento**
- Sponsor saiu ou mudou de função
- Mudanças no time do cliente
- Tom da comunicação esfriou
- QBRs canceladas ou esvaziadas
- Pedidos de "vamos rever o contrato"

**Sinais comerciais**
- Atrasos de pagamento
- Pedidos de desconto fora do ciclo
- Aumento de tickets de severidade alta
- Reclamações em canais públicos

**Sinais externos**
- Mudança de ERP / stack
- M&A do cliente
- Mudança de mercado (regulatório, concorrência)
- Notícias financeiras ruins

> Cada sinal isolado é fraco. Combinação de 2-3 categorias = risco alto.

---

## 7. Expansão — heurísticas de qualificação (BANT-like adaptado)

Para o `expansion-scout`:

- **B**asis (causa de negócio) — existe uma dor ou oportunidade clara para o módulo/módulos adicionais?
- **A**uthority (autoridade) — o sponsor atual decide ou precisa de novo decisor?
- **N**eed (necessidade) — está priorizado vs. outras iniciativas do cliente?
- **T**iming (timing) — orçamento disponível? Janela de implementação compatível?

Na ausência de qualquer um, expansão vira sales talk e queima crédito.

---

## 8. Time-to-Value — drivers e bloqueadores

**Drivers (aceleram TTV):**
- Sponsor executivo presente e cobrando
- Time do cliente dedicado (não compartilhado com outros projetos)
- Dados disponíveis e razoavelmente limpos
- Escopo realista (poucos casos no MVP, expansão depois)

**Bloqueadores (matam TTV):**
- Migração de ERP simultânea
- Reestruturação organizacional do cliente
- Sponsor sem mandato real
- Escopo inflado pelo próprio sales (overselling)
- Dados terríveis sem plano de tratamento

> CSM tem que ser honesto sobre bloqueadores no kickoff. Empurrar com a barriga gera churn 12 meses depois.

---

## 9. Voice of Customer — fontes e síntese

Para o `voc-analyst`:

**Fontes estruturadas**
- NPS / CSAT / CES com comentário
- Tickets categorizados (motivo, severidade, sentimento)
- Pesquisas de produto (post-feature launch)
- Entrevistas semi-estruturadas (jobs-to-be-done)

**Fontes não estruturadas**
- Notas de QBR e calls
- Mensagens em canais (Slack, email)
- Comunidade / fórum / G2 / Capterra
- Conversas informais relatadas

**Síntese efetiva:**
1. Categorize por tema (não por canal)
2. Quantifique frequência e severidade
3. Cruze com saúde da conta (sentimento por tier de receita)
4. Distingue o que é *dor recorrente* do *evento isolado*
5. Termine com 3 ações priorizadas para produto/CS/sales

---

## 10. Princípios transversais (a serem internalizados pelos agentes)

1. **Evidência > opinião** — cada afirmação importante deve ter um dado, ticket, frase ou métrica por trás
2. **Outcome > output** — sempre amarre ferramenta a resultado de negócio
3. **Sistema > heroísmo** — bom CSM não salva conta; bom processo previne crise
4. **Honestidade > otimismo** — cliente sente quando o CSM está disfarçando. Diga a verdade com elegância.
5. **Ritmo > intensidade** — cadência regular bate sprint heroico. QBR no prazo > QBR perfeito atrasado.
6. **Cliente fala primeiro** — em qualquer conversa de descoberta, o agente pergunta antes de propor
7. **Decisão escrita > acordo verbal** — toda reunião termina com texto: o que ficou decidido, quem faz, até quando
