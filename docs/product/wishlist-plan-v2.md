# Plano de Produto — Wishlist v2 (redesenho do funil)

> Documento canônico do redesenho da Wishlist. O MVP atual está descrito em [wishlist-plan.md](./wishlist-plan.md) (baseline). Este v2 não reconstrói o que existe — **destrava e completa o funil** que hoje morre depois da captura. Mesma metodologia do redesenho de Voz do Cliente ([voc-plan.md](./voc-plan.md)): diagnóstico frio nos dados reais, princípio norteador, e fases meticulosas nas três lentes (CS enterprise · Designer · PM).

## Objetivo

Transformar a Wishlist de um **cemitério de captura** (entra muito, sai nada) em um **motor de demanda de produto**: da fala solta do cliente até a decisão de roadmap, com a evidência (verbatim + quem pediu + conta + ARR) viajando junto — e o retorno ao cliente fechando o ciclo de confiança.

## Princípio norteador

> **"Nenhum pedido fica órfão: todo sinal vira demanda consolidada, priorizada e rastreável até o roadmap — e o cliente sabe que foi ouvido."**

O VoC foi "todo número é uma porta" (rastreabilidade até a evidência). A Wishlist é o **fluxo**: capturar é o passo fácil; o valor está em **consolidar → priorizar → entregar ao Produto → fechar o loop** com o cliente.

---

## Estado atual (baseline) — o que JÁ existe e funciona

Arquitetura de dois níveis, code-complete e **viva em produção**:

- **`wishlist_signals`** — pedido bruto por origem (`verbatim`, `summary`, `kind` new/enhancement, `ai_extracted`/`ai_confidence`, triagem `triage_outcome`, `matched_feature_id`, `area`, `requester_*`). Origens: `interaction | time_entry | nps_response | support_ticket | manual`.
- **`wishlist_items`** — ideia canônica que agrega demanda (`problem`, `desired_outcome`, `status`, `priority`, `demand_accounts`/`demand_arr`, RICE estruturado: `reach_pct`, 4× `impact_*`, `commercial_commitment`, 3× `confidence_*`, `product_id`/`epic_id`/`activity_type`/`criticality`/`areas`, `product_brief` jsonb).
- **`wishlist_curation_log`** (auditoria) e **`wishlist_handoffs`** (envio `export`/`webhook` com resposta HTTP).
- **Extração unificada de IA** (`signal_extractor` → `extractSignals`) numa única chamada que separa `{ wishlist, opportunities }`, cabeada em ingest de interação, time-entry, NPS detrator e backfill de tickets. Sinais já são **embeddados** (`embeddings.source_type='wishlist_signal'`) para dedup vetorial.
- **3 prompts no catálogo** (editáveis em /admin): `wishlist_extractor` (auto), `wishlist_catalog_match` (user), `wishlist_narrative` (user).
- **Espelho comercial**: `/oportunidades` reusa toda a infra (sinais/itens/handoffs), com foco comercial e match contra planos.

## Diagnóstico frio (dados reais, jun/2026)

| Etapa | Número | Leitura |
|---|---|---|
| Sinais capturados pela IA (30d, 30 contas) | **636** | Captura funciona muito bem |
| Sinais `pending` na triagem | **569 (89%)** | Ninguém triou — pilha parada |
| Sinais sem `area` | **568 de 569** | Sem agrupamento → sem consolidação |
| Sinais consolidados em item | **4** | Demanda real (X contas pedem Y) se perde |
| Itens da wishlist | **4** | de 636 sinais |
| Itens casados a uma feature | **0** | `wishlist_catalog_match` nunca roda (é manual) |
| Briefs de produto gerados | **0** | `wishlist_narrative` nunca dispara |
| Handoffs p/ Produto | **0** | downstream inteiro não entrega nada |

**Causa raiz (três gargalos que se somam):**

1. **Sem loop de triagem viável** — triar exige clicar "Analisar" em cada um dos 569 sinais. Não escala → 89% parados.
2. **Sem consolidação/agrupamento** — 568/569 sem `area`; não há motor que agrupe "N contas pedindo a mesma coisa" → `demand_accounts`/`demand_arr` nunca materializam.
3. **A IA de valor é manual e fica órfã** — `catalog_match` e `narrative` são gatilho "user"; com a pilha parada, ninguém clica → 0 match, 0 brief, 0 handoff.

## As três lentes — o que falta

**🤝 CS Enterprise.** Pedido de sponsor/decisor (atrelado a renovação/expansão) se perde na pilha → churn silencioso. Falta consolidar demanda com **ARR** (o argumento de QBR e de priorização), o **loop de retorno** ("você pediu, entregamos") e a Wishlist **na visão da conta** (hoje isolada).

**🎨 Designer.** Triagem 1-a-1 não escala. Falta **triagem assistida em lote** (IA pré-agrupa + pré-casa; CSM aprova clusters), **visão de consolidação** (semelhantes agrupados com demanda/ARR antes de virar item), **funil visível** com gargalos, e **categorização automática** (as 568 sem área).

**📦 Product Manager.** PM quer itens consolidados com **demanda + RICE + brief**, não 636 crus. RICE é 100% manual (sliders em branco) e sem **score/ranking**. Falta **RICE assistido**, **dedup duplo** (catálogo + itens abertos), **handoff real** e **feedback de entrega**.

---

## Fase 1 — Desentupir a triagem (maior alavanca)

Objetivo: os 569 `pending` viram dezenas de itens consolidados em uma sessão, não 569 cliques. Reaproveita o motor de consolidação validado no VoC.

**Dados / migration (`wishlist_v2_triage`)**
- `wishlist_signals`: adicionar `cluster_key text` (id do agrupamento sugerido), `catalog_match jsonb` (resultado do match em lote: `{feature_id, confidence, rationale}`), `enriched_at timestamptz` (gate idempotente do cron). `area` já existe — passa a ser preenchido.
- `app_settings.wishlist_area_taxonomy` = lista fechada de áreas/temas editável (espelha `voc_theme_taxonomy`; ex.: indicadores/KPIs, estoque e ruptura, custo/COGS/fluxo de caixa, integrações de dados, planejamento/BOM, fornecedores/compras, usabilidade…).

**Cron `wishlist-enrich`** (novo; espelha `voc-enrich` — IO-safe, batched, idempotente, deadline-guard, gate `enriched_at`):
1. **Match de catálogo em lote** — roda `wishlist_catalog_match` nos `pending` ainda não enriquecidos → grava `catalog_match` no sinal (pré-marca "já existe" vs "gap real"). Tira a IA do clique manual.
2. **Categorização** — atribui `area` via taxonomia canônica (mesmo padrão `mapThemesToTaxonomy` do VoC: IA mapeia o `summary` → 1 área da lista fechada; leitura paginada; concorrência baixa).
3. **Clustering** — agrupa sinais semelhantes por **embedding** (já existem; cosseno) → grava `cluster_key`. Cada cluster = candidato a item, com a demanda (contas/ARR) já calculável.
- Agendado semanal + disparável sob demanda (`trigger_vercel_cron`).

**UX — Triagem assistida em lote** (refaz `TriageInbox`)
- Sinais chegam **pré-agrupados por cluster** e **pré-classificados**: `já-existe` (catalog_match alto) · `gap real` · `duplicado-de-item-aberto` (match vetorial com itens existentes).
- Cada cluster mostra: resumo do pedido, **nº de contas + ARR somado**, evidências (verbatim + quem pediu), e a feature sugerida (se houver).
- Ações de **lote**: "Promover cluster a novo item" (consolida todos os sinais de uma vez), "Resolver — já existe" (linka à feature), "Descartar". O CSM aprova/ajusta o cluster, não sinal a sinal.
- Drawer de evidência por cluster (padrão VoC): "quem pediu, o quê, de qual conta".

**Server actions**: `enrichPendingNow()` (dispara o cron), `promoteClusterToItem(clusterKey, {title, kind})`, `resolveClusterExisting(clusterKey, featureId)`, `dismissCluster(clusterKey)`.

---

## Fase 2 — Consolidação de demanda + RICE assistido

Objetivo: PM recebe backlog **rankeado**, não pilha plana.

**Demanda first-class**
- Ao promover cluster → item, `recomputeItemDemand()` (já existe) roda automático: contas distintas, ARR agregado (contracts/MRR×12), segmentos. Re-roda ao (des)vincular sinais.

**RICE assistido (auto-prefill + score)**
- **R (Alcance):** `reach_pct` sugerido = `demand_accounts / contas_ativas`.
- **I (Impacto):** sugestões das evidências — `impact_commercial_opportunity` puxa de `commercial_commitment`/ARR; `impact_churn_prevention` das contas em risco (cruza com health/renovação); `impact_satisfaction` do volume de sinais; `impact_differentiation` editável.
- **C (Confiança):** `confidence_wishlist_clients` = true (veio de cliente); `confidence_competitor_has`/`confidence_wishlist_leads` editáveis.
- **E (Esforço):** **fica com o Produto** (eles conhecem o custo de dev) — decisão honesta. Nosso score é **RICE-sem-E** = prioridade ponderada por demanda; o gestor RICE divide pelo esforço deles. Migration: adicionar `rice_score numeric` (calculado a partir dos pesos do intake: R peso 2 + alcance; I diferencial/oportunidade/compromisso peso 100, satisfação/churn/segurança peso 50; C peso 10) — fonte de verdade dos pesos em `app_settings.wishlist_rice_weights` (editável).
- Sliders continuam editáveis; o auto-prefill é ponto de partida, não trava.

**UX — Backlog priorizado** (nova aba/visão)
- Itens ordenados por `rice_score × demanda × ARR`, com filtros (área, status, produto/épico, kind). É o "Top" que o PM usa. Cada linha abre o detalhe com evidências (tudo clicável, padrão VoC).

---

## Fase 3 — Brief automático + handoff real + loop de retorno

Objetivo: fechar o ciclo até o roadmap e de volta ao cliente.

**Brief automático**
- `buildProductBrief()` (já existe) passa a rodar **automaticamente** quando o item entra em `accepted` (via trigger/evento `wishlist_item_accepted` que já é enfileirado) — não mais clique manual. `wishlist_narrative` gera a narrativa; o brief consolida RICE + demanda + evidências.

**Handoff real**
- O caminho `webhook` já existe (`runHttp` + `wishlist_handoffs`); ligar ao destino real de Produto e padronizar o intake RICE. `export` gera o pacote pronto para colar na ferramenta de roadmap.

**Loop de retorno (diferencial CS enterprise)**
- `delivered` → notifica o **CSM dono das contas solicitantes** → CSM (ou automação) avisa cada conta: "você pediu X, entregamos". Reaproveita os eventos de workflow já disparados por trigger. Registro em `wishlist_curation_log` (`action='delivered_notified'`).

**Tie-ins** (como VoC→RAG/Health)
- **Wishlist na visão da conta**: bloco "Pedidos de produto" em `/accounts/[id]` (abertos + status de cada um) — o CSM vê o que a conta pediu sem sair da conta.
- **Wishlist → RAG/Perguntar**: o assistente responde "o que a conta X já pediu?" e "quais os pedidos mais demandados do portfólio?".
- **Wishlist → renovação/expansão**: itens de alta demanda atrelados a contas em D-90 viram alavanca no health/renovação.

---

## Fase 4 — Governança e qualidade (lições do VoC)

- **Taxonomia/áreas e pesos RICE editáveis** (zero-env: `app_settings` + tela no admin). Cron `?rebuild=1` remapeia áreas após mudança (padrão VoC).
- **Dedup de itens** — antes de promover cluster, checar match vetorial com itens já abertos → sugerir agrupar em vez de duplicar.
- **Evidência rica** — verbatim + **quem pediu casado com o Power Map** (`contacts`: cargo/decisor — reaproveita o casamento participantes↔Power Map do VoC) → "o decisor da conta Y pediu isto".
- **Métricas do funil** — conversão capturado→triado→item→aceito→entregue, tempo-em-triagem, top demandados, ARR em jogo. Painel gerencial.
- **Integridade** — idempotência (gates `*_at`), sem clobber, IO-safe (nada de LLM síncrono em request; só cron batched).

---

## Princípios transversais (herdados do VoC)

- **IO-safe sempre**: enriquecimento só em cron batched/idempotente com deadline-guard (instância Free; LLM síncrono derruba o login).
- **Zero-env**: nenhuma config em variável de ambiente — taxonomia, pesos RICE, webhook em `app_settings` + admin.
- **Evidência primeiro**: todo número abre seus sinais (verbatim + quem + conta), como no drawer do VoC.
- **Catálogo de prompts é fonte de verdade**: reescritas viram `default` do catálogo (editável em /admin), nunca hardcoded no user-prompt.
- **Docs obrigatórias**: README + este doc + tech-debt a cada entrega.

## Verificação (por fase)

1. **Fase 1**: cron `wishlist-enrich` roda IO-safe; `pending` ficam categorizados (`area`), com `catalog_match` e `cluster_key`; a triagem em lote promove um cluster a item com demanda agregada correta; 569 caem para dezenas de itens.
2. **Fase 2**: `recomputeItemDemand` correto; RICE auto-prefill plausível; `rice_score` calculado; backlog rankeado bate com demanda/ARR.
3. **Fase 3**: brief gerado automático no `accepted`; handoff webhook/export funcional com registro; `delivered` dispara notificação ao CSM e à conta; tie-ins (conta/RAG/health) visíveis.
4. **Transversal**: taxonomia/pesos editáveis em /admin; dedup evita itens duplicados; Power Map casado nas evidências; métricas do funil corretas; `npx tsc --noEmit` + build limpos.

## Fora de escopo (v2)

- Integração nativa com ferramenta de roadmap específica além de webhook/export genérico (fica para quando o destino for definido).
- Auto-cálculo do Esforço (E) — permanece com o Produto.
- Reescrever a extração unificada `signal_extractor` (já funciona bem; só consumimos melhor o que ela produz).

---

### Sequência de execução

Fase 1 → 2 → 3 nesta ordem (a Fase 1 destrava todo o resto). Fase 4 é transversal, entregue junto com cada fase onde fizer sentido. Cada fase fecha com README + tech-debt + verificação, no mesmo padrão das entregas de VoC.
