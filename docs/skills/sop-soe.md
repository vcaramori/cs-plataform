# S&OP / S&OE Best Practices

## Referências
- [S&OP Guide + KPIs](https://supplychainmath.com/en/sop-guide.html)
- [S&OP KPIs](https://www.gocomet.com/blog/sop-kpis-evaluating-effectiveness-leveraging-effort/)
- [S&OP Practitioner Guide](https://prospeo.io/s/sales-operation-planning)
- [Plan Adherence Playbook](https://umbrex.com/resources/company-analysis/supply-chain-logistics/sop-plan-adherence/)

## KPIs Principais

### Forecast Accuracy
| Métrica | Fórmula | Target |
|---------|---------|--------|
| MAPE | `\|Actual - Forecast\| / Actual` | <15% |
| Bias | `(Forecast - Actual) / Actual` | ±5% |

### OTIF (On-Time In-Full)
| Métrica | Fórmula | Target |
|---------|---------|--------|
| OTD | `Orders on time / Total orders` | 90-95% |
| IF | `Orders in-full / Total orders` | 95%+ |
| OTIF | `OTD × IF` | 90-95% |

### Inventory
| Métrica | Fórmula | Target |
|---------|---------|--------|
| DOH | `Average Inventory / COGS per day` | Target por família |
| Inventory Turns | `COGS / Avg Inventory` | >4x |
| E&O | Excess & Obsolete % | <5% |

### Finance
| Métrica | Fórmula | Target |
|---------|---------|--------|
| Revenue vs Budget | `(Revenue - Budget) / Budget` | ±10% |
| Gross Margin | `(Revenue - COGS) / Revenue` | Target por família |
| CCC | `DPO + DSO - DPO` | <60 dias |

## Dashboard S&OP Executive

### Seções Recomendadas
```
┌─────────────────────────────────────────┐
│ 1. DEMAND PERFORMANCE                   │
│    MAPE (m-1) │ Bias % │ vs Budget   │
├─────────────────────────────────────────┤
│ 2. SUPPLY PERFORMANCE                  │
│    Plan Attainment │ Schedule Adherence│
│    OTIF %                              │
├─────────────────────────────────────────┤
│ 3. INVENTORY HEALTH                    │
│    DOH by family │ E&O $ │ Turns       │
├─────────────────────────────────────────┤
│ 4. FINANCIAL ALIGNMENT                │
│    Revenue │ Margin │ Working Capital  │
├─────────────────────────────────────────┤
│ 5. ROLLING BALANCE (12 meses)          │
│    Demand vs Supply vs Inventory        │
├─────────────────────────────────────────┤
│ 6. DECISION LOG                       │
│    Open decisions │ Owner │ Status      │
└─────────────────────────────────────────┘
```

## Classificação de Risco

### Frascos
| Faixa | Classificação | Ação |
|-------|--------------|------|
| >90% | Excelente | Manter |
| 80-90% | Bom | Monitorar |
| 70-80% | Atenção | Ação corretiva |
| <70% | Crítico | Escalonar |

### RAG Status
```
🟢 Verde: Dentro do target
🟡 Amarelo: >10% abaixo do target
🔴 Vermelho: >20% abaixo do target
```

## S&OP vs S&OE

| Dimensão | S&OP | S&OE |
|---------|------|------|
| Cadência | Mensal | Diário/Semanal |
| Horizonte | 3-24 meses | 0-13 semanas |
| Foco | Planejamento | Execução |
| Tech | APS/IBP | ERP/WMS/TMS |

## Integração com CS

Conectar com dados de Customer Success:
- **Forecast por cliente**: baseados em adoption e expansion
- **Risco de churn**: afetar supply plan
- **NPS**: Leading indicator de demand
- **Renewals**: Pipeline de receita

## Dados para o "Cérebro do CS"

O RAG pode responder:
```sql
-- "Qual o forecast do cliente X?"
SELECT forecast_value, confidence
FROM demand_forecasts
WHERE account_id = ? AND horizon_months <= 3;

-- "Há riscos de supply?"
SELECT product_family, current_stock, demand_plan, gap
FROM supply_dashboard
WHERE gap < 0;

-- "Qual o OTIF médio do portfólio?"
SELECT AVG(otif_score) as avg_otif
FROM account_metrics
WHERE period >= now() - interval '30 days';
```

## Referências Adicionais
- [Umbrex - S&OE Discipline](https://umbrex.com/resources/strategic-cost-cutting-playbook/sales-operations-planning-sop-soe-discipline/)
- [GoComet - S&OP KPIs](https://www.gocomet.com/blog/sop-kpis-evaluating-effectiveness-leveraging-effort/)