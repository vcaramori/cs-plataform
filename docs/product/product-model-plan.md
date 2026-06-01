# Modelo de Produto — Produtos · Épicos · de→para · Planos/Contratos/Adoção por Produto

> Status: entregue (2026-05-31).

## Problema & objetivo

A plataforma tinha Funcionalidades e Planos soltos e Contratos ligados ao plano só por texto (`service_type`). A ferramenta de produto (RICE) trabalha por **Produto (=Squad)** com **Épicos**, e o handoff do Wishlist precisa de Produto+Épico por pedido. Faltava a entidade Produto e um **de→para** das nossas Funcionalidades para os Épicos/Produtos.

## Modelo

| Entidade | Tabela | Observações |
|---|---|---|
| Produto (squad) | `products` | CRUD; ex.: ABAST, S&OE, S&OP. `key` slug, `color`, `sort_order`, `is_active`. |
| Épico | `product_epics` | Pertence a um produto (`product_id`); `unique(product_id, name)`. |
| de→para Funcionalidade→Épico | `feature_epics` | N:N (`feature_id`, `epic_id`). Um épico carrega o produto → a distinção composta (produto, funcionalidade) emerge daí. |
| Plano→Produto | `subscription_plans.product_id` | Plano pertence a 1 produto. |
| Contrato→Produtos/Planos | `contract_products`, `contract_plans` | Junctions N:N, sincronizadas de `service_type` por `syncContractLinks`. |
| Adoção por produto | `feature_adoption.product_id` | Denormalizado no sync a partir do plano. |

## Fluxo de uso

1. **Configurar** em `/settings/products`: cadastrar produtos e épicos.
2. **Mapear** em `/settings/features`: cada Funcionalidade aponta para épicos (de→para).
3. **Planos** (`/settings/plans`): associar cada plano a um produto.
4. **Contratos**: ao salvar (service_type = nome do plano), `contract_plans`/`contract_products` são preenchidos automaticamente; a adoção sincroniza com `product_id`.
5. **Wishlist**: quando um pedido casa com uma funcionalidade (`matched_feature_id`), Produto+Épico são pré-preenchidos na seção RICE; o handoff envia o pacote no formato da ferramenta de produto.

## Arquivos

- Migration: `supabase/migrations/…_product_model_foundation.sql`
- APIs: `src/app/api/product/products[/id]`, `src/app/api/product/epics[/id]`, `src/app/api/product/plans/[id]` (novo PATCH/DELETE), `src/app/api/product/features[/id]` (epic_ids)
- UI: `src/app/(dashboard)/settings/products/*`, `ProductDialog`, `FeatureDialog` (de→para), `PlanDialog` (produto)
- Contratos: `src/lib/contracts/links.ts`, `src/app/api/contracts[/id]/route.ts`
- Adoção: `src/app/api/accounts/[id]/{adoption,plan}/route.ts`
- Wishlist RICE: `src/lib/wishlist/{handoff,types,rice-catalog}.ts`, `WishlistItemDetail.tsx`, `actions.ts` (`updateItemRice`)

## Decisões

- **Plano pertence a 1 Produto** (não N:N).
- **service_type → FKs**: mantido `service_type` como entrada de UI; junctions são a fonte canônica (migração sem regressão).
- **Adoção product-aware**: denormalização de `product_id`; preenche conforme produtos/épicos são configurados.

## Verificação

1. Migration: 5 tabelas + colunas; 3 produtos, 25 épicos; 6/6 contratos com `contract_plans` (backfill). `next build` ✅.
2. `/settings/products`: CRUD de produto + épicos.
3. Funcionalidade: mapear épicos grava `feature_epics`.
4. Plano: salvar com Produto; PATCH/DELETE.
5. Contrato: salvar → `contract_plans`/`contract_products` sincronizados.
6. Adoção: trocar plano re-sincroniza `feature_adoption` com `product_id`.
7. Wishlist: item casado pré-preenche Produto+Épico; handoff gera payload RICE.

## Follow-up

- Dashboards de adoção com filtro/agrupamento por Produto.
- Confirmar listas de Tipo/Criticidade (hoje semente em `rice-catalog.ts`).
- UI de múltiplos planos por contrato (hoje deriva do plano único/service_type).
- Integração real (push) com a ferramenta de produto.
