# Estratégia de Mapeamento de Testes — CS-Continuum

Este documento mapeia todas as áreas da plataforma e define os cenários necessários para garantir cobertura total de QA, integrando as regras de negócio do PM com a execução de automação.

## 🔑 1. Fundação e Segurança
| Funcionalidade | Cenário de Teste | Tipo | Status |
| :--- | :--- | :--- | :--- |
| **Autenticação** | Login com sucesso e persistência de sessão | E2E | ✅ [auth.setup.ts] |
| **Proteção de Rotas** | Redirecionamento de usuários deslogados para /login | E2E | ⏳ Planejado |
| **Isolamento (RLS)** | Garantir que CSM A não veja dados do CSM B | API | ⏳ Planejado |
| **RBAC** | Validar permissões de role `client` vs `csm` | API | ⏳ Planejado |

## 📊 2. Dashboard & Performance
| Funcionalidade | Cenário de Teste | Tipo | Status |
| :--- | :--- | :--- | :--- |
| **KPIs Financeiros** | Cálculo em tempo real de MRR e ARR Total | API | ⏳ Planejado |
| **Alertas de Risco** | Contas com health < 40 aparecendo na lista de risco | E2E | ⏳ Planejado |
| **Filtros de Tabela** | Busca por nome e filtro por segmento (Indústria/Varejo) | E2E | ⏳ Planejado |

## 🏢 3. Gestão de Contas (LOGOs)
| Funcionalidade | Cenário de Teste | Tipo | Status |
| :--- | :--- | :--- | :--- |
| **CRUD de Logos** | Criação completa com dados estruturados e CNPJ | E2E | ⏳ Planejado |
| **Múltiplos Contratos** | Adição de aditivos e renovações com datas sobrepostas | API | ⏳ Planejado |
| **Power Map** | Identificação de Decisor e Influência no stakeholder | E2E | ⏳ Planejado |
| **Financial Engine** | Aplicação de descontos (% e R$) no contrato | API | ⏳ Planejado |
| **SLA de-para** | Mapeamento de labels externas para prioridades internas | API | ⏳ Planejado |

## 📋 4. Journal de Esforço
| Funcionalidade | Cenário de Teste | Tipo | Status |
| :--- | :--- | :--- | :--- |
| **NLP Effort Parsing** | Extração de horas e conta em linguagem natural | E2E | ✅ [ai-features.spec.ts] |
| **Confidence Score** | Flag de `pending_review` para scores < 0.8 | API | ⏳ Planejado |
| **Consolidação** | Horas diretas vs indiretas no Cost-to-Serve | API | ⏳ Planejado |

## 🎧 5. Módulo de Suporte
| Funcionalidade | Cenário de Teste | Tipo | Status |
| :--- | :--- | :--- | :--- |
| **Média Harmônica** | Garantir que um zero em um pilar zere a nota final | API | ✅ [business-logic.spec.ts] |
| **IA Status Apply** | Mudança automática de status após aceite da revisão | E2E | ✅ [ai-features.spec.ts] |
| **Notificações (@)** | Geração de menção para `@email` em replies | API | ⏳ Planejado |
| **SLA Events** | Gravação de eventos de quebra de SLA em tickets | API | ⏳ Planejado |

## 📈 6. NPS Hub & Loyalty
| Funcionalidade | Cenário de Teste | Tipo | Status |
| :--- | :--- | :--- | :--- |
| **Cálculo de Score** | Fórmula (Promotores - Detratores) global | E2E | ✅ [nps-hub.spec.ts] |
| **Gestão de Metas** | Ajuste de meta corporativa e reflexo nos KPIs | E2E | ⏳ Planejado |
| **Multi-question** | Suporte a questionários com perguntas variadas | API | ⏳ Planejado |
| **Export XLSX** | Download de relatório com integridade de dados | E2E | ⏳ Planejado |

## 🧠 7. Ask — Cérebro do CS
| Funcionalidade | Cenário de Teste | Tipo | Status |
| :--- | :--- | :--- | :--- |
| **Scope Detection** | Resposta correta para "Todo o portfólio" vs "Conta X" | E2E | ✅ [ai-features.spec.ts] |
| **Source Citations** | Presença de referências e similaridade na resposta | API | ✅ [business-logic.spec.ts] |
| **Conversation** | Manutenção de contexto entre perguntas sucessivas | E2E | ⏳ Planejado |

## 📦 8. Adoção e Risco
| Funcionalidade | Cenário de Teste | Tipo | Status |
| :--- | :--- | :--- | :--- |
| **Downgrade Risk** | Identificação de risco por falta de adoção de core features | API | ⏳ Planejado |
| **Feature Matrix** | Persistência de status de adoção por conta | API | ⏳ Planejado |

---

## 🚀 Próximos Passos de Automação

1.  **[Prioridade 1]**: Implementar **RLS Validation Tests** (Segurança).
2.  **[Prioridade 2]**: Automatizar o **Motor Financeiro** (Contratos e Descontos).
3.  **[Prioridade 4]**: Cobrir o fluxo completo de **SLA e Notificações**.
