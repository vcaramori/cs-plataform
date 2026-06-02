# Permissões Dinâmicas — super_admin global, escopo por módulo, RLS escopada

> Status: núcleo + módulos principais + hardening de RLS (2026-06-02). Sweep dos demais módulos em andamento.

## Contexto

O build quebrou quando `ignoreBuildErrors:false` foi ligado (3 null-guards de role). Além disso, as permissões eram engessadas (arrays de role hardcoded + filtros `csm_owner_id` manuais) e a RLS estava **aberta** (`*_select_all: true` em 6 tabelas). Objetivo: super_admin global, escopo dinâmico por módulo, RLS escopada como defesa em profundidade.

## Núcleo (`src/lib/auth/`)

- **`getModulePermission(userId, module, action)`**: short-circuit **super_admin ⇒ true**; depois custom_roles; depois fallback legado por hierarquia.
- **`getUserAccessScope(userId, module): 'global'|'own'|'none'`**: super_admin→global; custom role (view_team→global, view→own); fallback legado (csm_senior+→global, csm→own).
- **`access-scope.ts` / `applyOwnerScope(query, scope, userId, col)`**: aplica `.eq(col, userId)` só quando `own`.
- **`has_module_permission(module, action)`** (Postgres, SECURITY DEFINER) estendida: super_admin/admin ⇒ true; custom_roles; fallback view_team para head_cs/csm_senior. Base da RLS dinâmica (sem recursão).

## App-side migrado (filtro condicional por escopo)

- **NPS**: `nps/page.tsx`, `api/nps/stats`, `api/nps/programs`.
- **Contas**: `api/accounts/route.ts`.
- **Suporte**: `api/support-tickets/route.ts` (GET + POST).
- **Perguntar**: `perguntar/page.tsx` (antes filtrava sempre por dono — corrigido).

Padrão: `const scope = await getUserAccessScope(user.id, '<module>'); if (scope !== 'global') query = query.eq('csm_owner_id', user.id)`.

## RLS endurecida (migration `rls_scope_hardening`)

Removidas as políticas SELECT abertas e criadas políticas escopadas (`dono OU has_module_permission(view_team)`) em: **accounts, contacts, contracts, interactions, time_entries**.

- Portal do cliente usa **service-role** (bypassa RLS) → não afetado.
- INSERT/UPDATE/DELETE mantidos (writes inalterados).
- **Gap documentado — `support_tickets`**: mantém `portal_tickets_select` (todo usuário interno vê todos os tickets — modelo de fila de suporte). Escopar isso muda o comportamento do suporte/portal e exige decisão de produto + teste; **não alterado** nesta etapa (a listagem já é filtrada na app).

## Estado atual seguro

Todos os usuários hoje são **super_admin** → veem tudo (app + RLS). A diferenciação `own`/`global` só passa a valer ao criar perfis (`custom_roles`) com `view`/`view_team`. Logo, o deploy não quebra ninguém e prepara o terreno para perfis restritos.

## Pendente (sweep restante — não bloqueia super_admin)

- **CS-Ops** (`api/cs-ops/{capacity,productivity,scorecard,metrics,rebalancer}`): checagens de autorização ainda em array hardcoded (já incluem super_admin) → migrar para `getModulePermission(userId,'esforco','view_team')`.
- **Long-tail** com `csm_owner_id` (notifications, bulk-actions, success-plans, dashboard/renewal-pipeline, alerts/advanced-alerts-service, nps/rag, time-entries, support sub-endpoints).
- **Decisão de produto**: escopar `support_tickets` (fila interna vs por dono) + hardening de RLS de **writes**.

## Plano de teste (necessário — RLS mudou)

1. **super_admin** (todos hoje): vê Contas/NPS/Suporte/Perguntar de toda a empresa. ✅ esperado.
2. Criar **custom_role** só com `view` (sem view_team) em `accounts`, atrelar a um usuário de teste → vê apenas as próprias contas (app + RLS).
3. Custom_role com `view_team` → vê global.
4. **Portal**: cliente externo continua vendo seus tickets/dados (usa service-role). ✅
5. Detalhe de conta (contracts/interactions/contacts/time_entries) carrega para o dono e para gestores; vazio para quem não tem escopo.
6. `npm run build` exit 0 (mantido).
