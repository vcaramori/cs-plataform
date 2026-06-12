# 14. Oportunidades — Sinais Comerciais (espelho da Wishlist)

## Visão Geral

Módulo de **oportunidades comerciais**, com o mesmo fluxo da Wishlist (signal → curadoria → item canônico com demanda agregada → handoff), mas para **vender mais**, não para pedir produto:

- **upsell_plan** — cliente no plano X precisa de funcionalidade que JÁ existe num plano superior (Y) → subir de plano.
- **system_need** — necessidade de um sistema/módulo correlato a S&OP (MPS, DRP, MRO…). A IA reconhece as siglas via **glossário S&OP** editável.
- **end_to_end_gap** — cliente pede uma solução end-to-end que respondemos não ter.
- **other** — outro sinal comercial.

Diferença da Wishlist: **Wishlist = pedido de funcionalidade do nosso produto**; **Oportunidade = sinal comercial** (estamos dispostos a construir coisas novas correlatas a S&OP).

## Fluxo ponta a ponta

1. **Captura (passada única de IA).** `src/lib/signals/extract-signals.ts` (`extractSignals`) faz UMA chamada Gemini por texto e separa `{ wishlist, opportunities }`, persistindo nos dois módulos. O glossário S&OP é injetado no prompt. Ganchos (mesmos da wishlist): criação de time_entry, ingest de interação, resposta NPS (detrator), backfill de suporte. Captura manual via dialog.
2. **Triagem** (`/oportunidades` → aba Triagem). Para cada sinal: "Analisar" sugere **plano/feature que já atende** (`suggestPlanMatch` sobre `subscription_plans`/`plan_features`/`product_features`) + **oportunidades semelhantes cross-customer** (busca vetorial). Desfechos: "já temos / upsell" (`already_available`, casa plano/feature), descartar, duplicado, **promover** (novo item) ou **agrupar** (vínculo a item existente).
3. **Curadoria + agrupamento** (`/oportunidades/[id]`). Editar título/necessidade/resultado/categoria/tipo/prioridade/valor estimado; ver **demanda** (contas + ARR) e **evidências** (sinais de várias contas); histórico de curadoria. Vários clientes com a mesma necessidade ficam no mesmo item.
4. **Pipedrive (manual nesta fase).** "Gerar brief" monta o `commercial_brief` (necessidade, demanda, ARR, evidências, plano sugerido, narrativa LLM). "Marcar como enviado" registra em `opportunity_handoffs` e move o item para `sent`. **Sem chamada externa** — o deal é criado manualmente no Pipedrive (integração real adiada).

## Modelo de dados

- **`opportunity_signals`** — menção comercial: `account_id`, `source_type`, `source_id`, `verbatim`, `summary`, `opportunity_type`, `ai_extracted`, `ai_confidence`, `triage_outcome` (`pending`|`already_available`|`promoted`|`duplicate`|`dismissed`), `matched_plan_id`, `matched_feature_id`, `item_id`, `triaged_by/at`.
- **`opportunity_items`** — oportunidade canônica: `title`, `need`, `desired_outcome`, `opportunity_type`, `category`, `status` (`triage`|`under_curation`|`qualified`|`ready_to_send`|`sent`|`won`|`lost`|`discarded`), `priority`, `demand_accounts`, `demand_arr`, `estimated_value`, `commercial_brief` (jsonb), `sent_at/by`.
- **`opportunity_curation_log`** / **`opportunity_handoffs`** — auditoria + registros de envio (`target='pipedrive'`).
- `embeddings`: `source_type='opportunity_signal'` (dedup cross-customer).

## Glossário S&OP (config de IA)

- Chave `app_settings('sop_glossary')` (jsonb sigla→significado). Editável em **Admin → Configurações → IA** (`AIContextSettingsTab`). Default: S&OP, S&OE, MPS, MRP, DRP, MRO, CPFR, IBP. Lido por `getSopGlossary()` e injetado no extrator unificado.

## Arquivos-chave

- Lib: `src/lib/opportunities/{types,glossary,sizing,matching,persist,brief}.ts`; `src/lib/signals/extract-signals.ts`.
- API/Actions: `src/app/(dashboard)/oportunidades/actions.ts` (Server Actions).
- UI: `src/app/(dashboard)/oportunidades/{page,[id]/page}.tsx` + `components/{OpportunitiesClient,OpportunityTriageInbox,OpportunityItemDetail,labels}`.
- Migração: `supabase/migrations/20260611100000_opportunities_module.sql`.
- Reúso: `subscription_plans`/`plan_features`/`product_features` (upsell), `searchEmbeddings`, `recomputeItemDemand`, `buildSystemInstruction`.

## Histórico

| Data | Alteração |
|------|------------|
| Jun/2026 | Versão inicial — módulo de Oportunidades espelhando a Wishlist; captura unificada de sinais (wishlist + oportunidade na mesma chamada de IA); glossário S&OP editável; curadoria/agrupamento; handoff manual ao Pipedrive (marcar como enviado). |
| Jun/2026 | **Ajuste do "Analisar com IA"** (wishlist + oportunidades): limiar de similaridade do dedup vetorial subiu de 0.5 → **0.7** (frases curtas de CS no mesmo domínio têm similaridade-base ~0.55–0.65, então 0.5 marcava tudo como "parecido"). E o estado de **catálogo vazio** (0 funcionalidades cadastradas) agora é explícito ("cadastre em Funcionalidades") em vez de "sem correspondência". |
