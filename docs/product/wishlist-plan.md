# Wishlist — Coleta, Curadoria e Handoff de Pedidos de Cliente

> Status: MVP entregue (2026-05-30). PO/Designer/Especialista CS: Vinicius.

## Problema & objetivo

Em toda reunião ou esforço, clientes pedem coisas que facilitariam o trabalho deles. Hoje isso se perde em transcrições e notas. O Wishlist transforma essas menções em **itens de produto curados, deduplicados entre clientes e priorizados por receita**, prontos para encaminhar ao time de produto — com toda a coleta e curadoria acontecendo **dentro da plataforma**.

## Decisões de produto (discovery)

- **Modelo de dois níveis:** `sinais` (menção por cliente/origem) → `itens` (ideia canônica que agrega demanda de N clientes com ARR). Permite "casar" o mesmo desejo de vários clientes (padrão Productboard/Cycle).
- **Triagem registra todos os desfechos:** `resolvido-já-existe` (CSM mostrou como usar → liga ao catálogo, sinaliza gap de adoção) · `existe-mas-insuficiente` (melhoria) · `não-temos` (novo) · `descartado`.
- **Handoff = pacote refinado + webhook configurável** (integração real da ferramenta de produto fica para depois).
- **Captura por IA das 4 fontes** (reuniões, esforço, NPS detratores, suporte) + captura manual.

## Modelo de dados

| Tabela | Papel |
|---|---|
| `wishlist_signals` | Menção captada (1 por cliente/origem). `source_type` ∈ interaction/time_entry/nps_response/support_ticket/manual; `triage_outcome` ∈ pending/resolved_existing/insufficient_enhancement/not_available_new/dismissed; `item_id` (link), `matched_feature_id`, `ai_extracted`, `ai_confidence`. |
| `wishlist_items` | Ideia canônica. `kind` (new/enhancement), `status` (triage→under_curation→accepted→rejected/redirected→handed_off→delivered), `demand_accounts`/`demand_arr` (denormalizados), `priority`, `product_brief` (jsonb). |
| `wishlist_curation_log` | Auditoria de cada ação de curadoria. |
| `wishlist_handoffs` | Registros de envio ao produto (export/webhook + status/resposta). |

RLS permissiva `wl_auth_all` (gating fino no app). Config de webhook em `app_settings.wishlist_settings`.
Embeddings: apenas **sinais** são vetorizados (`embeddings.source_type='wishlist_signal'`) — `account_id` é NOT NULL e itens são cross-customer; o matching de itens é feito mapeando sinais semelhantes → `item_id`.

## Fluxo ponta a ponta

1. **Captura.** A IA (`extractWishlistSignals`, Gemini JSON mode) lê transcrição/nota/comentário/ticket e cria `wishlist_signals` (pending). Ganchos: ingest de interação, criação de time_entry, resposta NPS (detrator), backfill de suporte. Manual via dialog.
2. **Triagem** (`/wishlist` → aba Triagem). Para cada sinal: "Analisar" busca **sugestão de catálogo** (LLM sobre `product_features`) + **itens/sinais semelhantes cross-customer** (busca vetorial). CSM escolhe o desfecho; "insuficiente"/"não temos" promovem a item (novo ou vínculo a existente).
3. **Curadoria** (`/wishlist/[id]`). Editar problema/resultado/categoria/tipo/prioridade; ver demanda (contas + ARR), evidências (sinais de várias contas), histórico. Aceitar/recusar/redirecionar.
4. **Handoff.** "Gerar brief" monta o pacote (problema, demanda, ARR, evidências, narrativa LLM) em `product_brief`. "Enviar ao produto" faz export (registro) ou POST no webhook configurado (via `runHttp` dos Fluxos). Item → `handed_off`.

## Integração com Fluxos

Triggers Postgres enfileiram `wishlist_item_created` (na criação) e `wishlist_item_accepted` (no aceite) via `enqueue_workflow_event`. Ambos disponíveis em `TRIGGER_EVENTS` — um Fluxo pode orquestrar notificação/aprovação/handoff a partir desses eventos.

## Arquivos

- Migration: `supabase/migrations/…_wishlist_module_foundation.sql`
- Domínio: `src/lib/wishlist/{types,extractor,matching,demand,handoff}.ts`
- Ganchos: `src/app/api/interactions/[id]/ingest/route.ts`, `src/app/api/time-entries/route.ts`, `src/app/api/nps/response/route.ts`, `src/app/api/wishlist/backfill/route.ts`
- UI: `src/app/(dashboard)/wishlist/{page,actions}.ts(x)`, `components/{WishlistClient,TriageInbox,WishlistItemDetail}.tsx`, `[id]/page.tsx`
- Navegação/permissão: `src/components/layout/Sidebar.tsx`, `src/lib/auth/modules.ts`
- Eventos: `src/lib/workflows/catalog.ts`

## Verificação

1. Migration: 4 tabelas + RLS; constraints `embeddings.source_type`/`csm_tasks.source_label` estendidas. ✅
2. Captura: interação/esforço/NPS detrator/ticket geram `wishlist_signal` (ai_extracted, embedado).
3. Triagem: sugestão de catálogo + itens semelhantes; os 4 desfechos funcionam; promoção cria/vincula item.
4. Cross-customer: pedido parecido em 2ª conta sugere o item existente; vínculo soma `demand_accounts`/`demand_arr`.
5. Handoff: brief gerado; export registra; webwook (httpbin) → `wishlist_handoffs(sent)`, item `handed_off`.
6. Build `next build` ✅ (rotas `/wishlist` e `/wishlist/[id]`).

## Atualização (2026-05-31) — Handoff no formato RICE

O handoff passou a produzir o **intake da ferramenta de produto (RICE)**. O item ganhou a seção **"Avaliação de produto (RICE)"** com **Produto/Squad** e **Épico** (pré-preenchidos pelo de→para `feature_epics` da funcionalidade casada — ver [product-model-plan.md](product-model-plan.md)), **Tipo**, **Criticidade**, **Áreas solicitantes**, e a pontuação **R** (Alcance %), **I** (4 sliders + compromisso comercial) e **C** (concorrente tem? / wishlist clientes? / wishlist leads?). O `buildProductBrief` ([handoff.ts](../../src/lib/wishlist/handoff.ts)) monta o payload `{ squad, epico, titulo, descricao, tipo, criticidade, clientes[], areas[], rice:{ alcance_pct, impacto, confianca } }`; protótipo/detalhamento técnico/esforço ficam para o gestor RICE.

## Follow-up

Seção Wishlist na página da conta; embutir `product_features` no vetor (match semântico); loop de retorno (`delivered` notifica CSMs/contas que pediram); integração real (push) da ferramenta de produto; confirmar listas de Tipo/Criticidade.
