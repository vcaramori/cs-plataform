# Customer Success Best Practices

## Referências
- [CS Metrics KPIs](https://www.fullcast.com/content/customer-success-metrics/)
- [15 CS Metrics](https://blog.hubspot.com/service/customer-success-metrics)
- [CS Metrics & KPIs](https://www.sobot.io/article/customer-success-metrics-and-kpis-benchmarks-best-practices-2025/)
- [CS Dashboard Guide](https://sparkco.ai/blog/build-customer-success-metrics-dashboard)

## KPIs Principais

### 1. NRR (Net Revenue Retention)
| Target | Classificação |
|--------|----------------|
| >120% | Best-in-class |
| 100-110% | Healthy |
| <100% |风险 |

### 2. Health Score (Composto)
**Pesos recomendados (B2B SaaS):**
- Product usage: 30%
- Support tickets: 20%
- NPS: 15%
- Expansion signals: 10%
- Billing: 10%
- Executive relationship: 10%

**Classificação:**
| Faixa | Classificação |
|-------|--------------|
| 80-100 | Saudável/Expansão |
| 50-79 | Needs Attention |
| 0-49 | Alto risco |

### 3. NPS
| Score | Classificação |
|-------|--------------|
| >50 | Best-in-class |
| 30-50 | Aceitável |
| <30 | Alerta |

### 4. Churn Rate
| Taxa | Classificação |
|------|--------------|
| <1% (mensal) | Best-in-class |
| 1-2% | Normal |
| >2% | Crítico |

### 5. CSAT
| Score | Classificação |
|-------|--------------|
| >90% | Best-in-class |
| 80-90% | Aceitável |
| <80% | Alerta |

## Health Score Implementation

### Manual (CSM)
```typescript
interface HealthScoreInput {
  accountId: string;
  score: number;        // 0-100
  notes?: string;
  trend?: 'improving' | 'stable' | 'declining';
}

// Salvar em health_scores table
await supabase.from('health_scores').insert({
  account_id: accountId,
  manual_score: score,
  notes,
  trend,
  created_by: auth.user().id
});
```

### Shadow Score (IA)
```typescript
// Gerado via LLM analisando interações + tickets
const prompt = `
Analise os dados do cliente ${accountName}:

Interações (últimas 10):
${interactions.map(i => `- ${i.date}: ${i.type} - ${i.sentiment}`).join('\n')}

Tickets (últimos 10):
${tickets.map(t => `- ${t.priority} (${t.status}): ${t.summary}`).join('\n')}

NPS: ${npsScore}

Gere um JSON com:
{
  "score": 0-100,
  "trend": "improving|stable|declining",
  "justification": "...",
  "risk_factors": ["...", ...],
  "confidence": "high|medium|low"
}
`;

const result = await llmWithFallback(prompt);
```

### Alerta de Discrepância
```typescript
// Se |manual - shadow| > 20
if (Math.abs(manualScore - shadowScore) > 20) {
  await createAlert({
    type: 'health_discrepancy',
    accountId,
    manual: manualScore,
    shadow: shadowScore,
    message: 'Revisão recomendada'
  });
}
```

## NPS Implementation

### Programa
```typescript
interface NPSProgram {
  name: string;
  accountId?: UUID;  // null = global
  isDefault: boolean;
  isTestMode: boolean;
  recurrenceDays: number;  // 90 padrão
  dismissDays: number;     // 30 padrão
  activeFrom?: Date;
  activeUntil?: Date;
}
```

### Embed Widget
```html
<script
  src="https://nps.cscontinuum.com/embed.js"
  data-program-key="CHAVE_DO_PROGRAMA"
  data-user-id="USER_ID"
  data-email="USER_EMAIL"
  data-base-url="https://nps.cscontinuum.com">
</script>
```

### Regras de Exibição
| Evento | Janela |
|--------|--------|
| Após responder | recurrence_days |
| Após dismiss | dismiss_days |
| Antes de active_from | Não exibe |
| Após active_until | Não exibe |
| Modo teste | Sempre exibe |

## Adoption Tracking

### Status por Feature
| Status | Significado |
|--------|-------------|
| not_started | Não iniciou |
| partial | Uso parcial |
| in_use | Adoptado |
| blocked | Com bloqueio |
| na | Não se aplica |

### Motor de Risco de Downgrade
```typescript
// Comparar features do plano atual vs plano inferior
const currentPlan = await getPlan(accountId);
const lowerPlan = await getPlanBelow(currentPlan);

const riskFeatures = lowerPlan.features.filter(
  f => !accountAdoption[f.id].in_use
);

if (riskFeatures.length > currentPlan.differentiators.length * 0.5) {
  // HIGH RISK de downgrade
}
```

## CSM Workload

### Ratio recomendado
| Segmento | Accounts/CSM |
|----------|--------------|
| Enterprise | 15-25 |
| Mid-market | 50-75 |
| SMB | 100-150 |

### Atribuição
- Health score como driver
- High-risk → top CSMs
- Expansion ready → CSMs com quota

## Referências Adicionais
- [Accoil - Customer Health Scores](https://www.accoil.com/blog/customer-health-score)
- [Sparkco AI - CS Dashboards](https://sparkco.ai/blog/build-customer-success-metrics-dashboard)