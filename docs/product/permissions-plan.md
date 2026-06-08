# Permissões Dinâmicas — Acesso Total (flag) global, escopo por módulo, RLS escopada

> Status: núcleo + módulos principais + hardening de RLS (2026-06-02). "Acesso Total" virou flag separada do Perfil (2026-06-03). **Visibilidade de leitura virou geral para internos; recorte por CSM só na Home (2026-06-03).** Módulo **Onboarding** adicionado (2026-06-08). Sweep dos demais módulos em andamento.

## Módulo Onboarding (2026-06-08)

- Novo módulo de permissão **`onboarding`** em [modules.ts](../../src/lib/auth/modules.ts) (aparece na matriz `/settings/roles`). A negociação de contrato fica sob o módulo **`contracts`** já existente.
- **RLS** das tabelas novas segue o modelo "internos veem tudo": `onboarding_stages` → `SELECT using is_internal_user()`; `onboarding_milestones`, `onboarding_events` e `contract_negotiation_history` → `FOR ALL using is_internal_user() with check is_internal_user()`. Portal/externo (não-interno) **bloqueado**; escrita real é adicionalmente filtrada na app por `getModulePermission('onboarding'|'contracts', 'create'|'edit')`.
- `contract_negotiation_history` foi **criada** nesta migration (a do Epic 17 nunca foi aplicada no remoto); inclui `negotiation_type` e `outcome` ampliado (`won`).

## Modelo de visibilidade: leitura geral para internos; CSM só na Home — 2026-06-03

Decisão de produto: **todo usuário interno enxerga todos os dados (leitura)**. O recorte por CSM responsável (carteira do CSM) fica **apenas na tela Home**, que direciona cada CSM para suas contas. A escrita/edição e o portal externo não mudam.

Implementação em **duas camadas** (ambas necessárias; a Home tem filtro próprio e não depende de nenhuma):
- **App (motor):** `getUserAccessScope` ([get-module-permission.ts](../../src/lib/auth/get-module-permission.ts)) — para usuário **interno** (`user_type <> 'external'`), nunca retorna `'own'`: onde retornaria `'own'`, retorna `'global'`. Mantém `'none'` (sem `view` esconde o módulo) e `'global'` do super admin. Isso desliga de uma vez os ~15 filtros `if (scope !== 'global') .eq('csm_owner_id', …)`.
- **Banco (RLS):** migration `team_wide_read_visibility` — helper `is_internal_user()` (SECURITY DEFINER) + policy permissiva de `SELECT` `using (is_internal_user())` em `accounts, contacts, contracts, interactions, time_entries, csm_tasks, success_plans, proactive_alerts, nps_programs, nps_responses`. Soma por OR com as policies de dono. `INSERT/UPDATE/DELETE` inalterados; portal externo (não-interno + service-role) inalterado.
- **Home** ([home/page.tsx](../../src/app/(dashboard)/home/page.tsx)): inalterada — usa `isLeadershipRole(role legado)` + `.eq('csm_owner_id', user.id)`; CSM vê só a carteira, liderança vê o portfólio.

Consequência: o toggle **"Escopo Geral" (view_team)** da matriz deixa de afetar a **visualização** de internos (todos veem tudo). O `view` por módulo (acesso on/off) continua valendo, e a matriz segue útil para `create/edit/delete/export`. Efeito colateral aceito: 2 ações de suporte atreladas a `scope==='global'` (criar ticket p/ qualquer conta; ação em lote em qualquer ticket) passam a valer para todo interno — coerente com a fila de `support_tickets` já ser compartilhada.

## Modelo: Perfil (escopo) + Acesso Total (override) — 2026-06-03

Cada usuário tem **sempre dois eixos independentes**:

- **Perfil** = um `custom_role` (matriz `/settings/roles`) que define o **escopo** por módulo (`view`/`create`/`edit`/`delete`/`export`/`view_team`). `super_admin` **não é mais um "perfil"** no seletor.
- **Acesso Total** = flag `profiles.is_super_admin` (override por usuário) que **ignora o perfil e libera tudo de todos**, sem restrição de escopo. Gerenciada no cadastro de usuários (toggle no `UserCard` / checkbox no `NewUserForm`), **não** na matriz.

Regras:
- **`resolveRoleAssignment` prioriza o custom_role sobre o builtin**: um perfil cujo nome colide com um role legado (ex.: custom role **"CSM"** ~ builtin `csm`) é resolvido como custom role (grava `custom_role_id`). Sem isso, o perfil "sumia" no refresh (gravava `role='csm'`, `custom_role_id=null` → GET caía no fallback `'csm'`, que não bate com a opção `'CSM'` do seletor).
- Só quem **tem Acesso Total** pode conceder/remover Acesso Total de outro (e não no próprio card).
- `role` legado (`profiles.role`) permanece como base de compatibilidade; durante a transição o override considera `is_super_admin = true OR role = 'super_admin'`. Ao **revogar** Acesso Total de um super_admin legado, o `role` base é rebaixado para `csm` para o compat não reativar o override.
- Migração: `profiles.is_super_admin boolean not null default false`; backfill `true` para quem era `role='super_admin'`; `has_module_permission` passou a checar `is_super_admin = true OR role = 'admin'`.

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
