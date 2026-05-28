# Módulo de Atividades + Governança de Permissões

> **Versão 3** — revisado com análise crítica de arquitetura (2026-05-28)  
> **Status: ✅ IMPLEMENTADO** — 2026-05-28

## Context

O CSM precisa de um hub central de atividades (`/atividades`) e de uma home pessoal (`/home`). Mas a plataforma está ganhando múltiplos tipos de usuário — e hoje a visibilidade do sidebar é hardcoded por role enum (`csm_senior`, `admin`), desconectada do sistema de governança que já existe (`custom_roles` + `PLATFORM_MODULES`). Este plano cria os novos módulos **e** conecta sua visibilidade à governança, sem hardcoding.

---

## Estado atual do sistema de permissões

Dois sistemas paralelos coexistem:

| Sistema | Onde vive | Enforced? |
|---------|-----------|-----------|
| Built-in roles (enum) | `src/lib/auth/permissions.ts` — hardcoded | ✅ Sim — sidebar, RLS, guards |
| Custom roles (módulos) | `custom_roles.permissions` JSONB no banco | ❌ Não — só governa/documenta |

O sidebar usa `canViewItem(minRole)` com strings hardcoded (`'csm_senior'`). O sistema de custom roles existe mas não é consultado em runtime.

---

## O que este plano adiciona à governança

### 1. Novos módulos em `PLATFORM_MODULES`

**Arquivo:** `src/lib/auth/modules.ts`

Adicionar dois novos módulos ao array existente:

```typescript
{ module: 'home',       label: 'Home & Command Center' },
{ module: 'atividades', label: 'Atividades do CSM'     },
```

Esses módulos aparecem automaticamente na tela de permissões (`/settings/roles`) para que admins configurem quem vê o quê.

### 2. `custom_role_id` no perfil do usuário

**Migration:** `supabase/migrations/YYYYMMDD_profiles_custom_role.sql`

```sql
ALTER TABLE profiles ADD COLUMN custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL;
```

Permite vincular um usuário a um custom role configurável, desacoplando do enum hardcoded.

**Migration de dados — usuários existentes:**

Após adicionar a coluna, criar um script de migração que atribui `custom_role_id` automaticamente baseado no enum atual:

```sql
-- Criar roles padrão se não existirem, depois vincular
UPDATE profiles SET custom_role_id = (
  SELECT id FROM custom_roles WHERE slug = 'csm_senior' LIMIT 1
)
WHERE role = 'csm_senior' AND custom_role_id IS NULL;

UPDATE profiles SET custom_role_id = (
  SELECT id FROM custom_roles WHERE slug = 'admin' LIMIT 1
)
WHERE role = 'admin' AND custom_role_id IS NULL;
```

> **Dependência de execução:** esta migration usa `slug` (não `name`) para evitar quebra por variações de label entre ambientes (ex: "CSM Senior" vs "CSM Sênior"). Deve rodar **após** a seed que padroniza os slugs dos roles. Se `custom_roles` não tiver coluna `slug`, usar `id` explícito via variável de ambiente ou garantir o nome exato antes do deploy.

Sem esta migração, todos os usuários existentes cairiam no fallback do enum — o que funciona, mas não aproveita a governança. A migração é opcional no primeiro deploy mas necessária antes de desligar o fallback.

### 3. Tipagem segura do JSONB de permissões

**Arquivo a criar:** `src/lib/auth/permission-schema.ts`

O JSONB `custom_roles.permissions` precisa de tipo explícito. Usar Zod para validar na borda (leitura do banco):

```typescript
import { z } from 'zod'

export const ModulePermissionSchema = z.object({
  module:    z.string(),
  view:      z.boolean().optional(),
  create:    z.boolean().optional(),
  edit:      z.boolean().optional(),
  delete:    z.boolean().optional(),
  export:    z.boolean().optional(), // exportar dados (CSV, relatório)
  view_team: z.boolean().optional(), // ver atividades de outros CSMs do time
})

export type ModulePermission = z.infer<typeof ModulePermissionSchema>
export const PermissionsSchema = z.array(ModulePermissionSchema)
```

> **Distinção importante:** `export` = baixar CSV/relatório. `view_team` = visualizar tarefas de outros CSMs. São semânticas diferentes e NÃO devem ser colapsadas em um mesmo campo.

### 4. Hook de permissão por módulo

**Arquivo a criar:** `src/hooks/useModulePermission.ts`

```typescript
export function useModulePermission(
  module: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'view_team' = 'view'
): boolean
```

Fluxo:
1. Lê `profile.custom_role_id` do contexto de sessão
2. Se tiver custom_role_id → consulta `custom_roles.permissions` (JSONB) e verifica `module + action`
3. Valida com Zod antes de usar
4. Se não tiver custom_role_id → fallback para o sistema built-in atual (`hasPermission(role, ...)`)

**Equivalente server-side:** `src/lib/auth/get-module-permission.ts` para uso em page.tsx e Server Actions.

### 5. Sidebar lê do sistema de governança

**Arquivo:** `src/components/layout/Sidebar.tsx`

Novos itens (home, atividades) usam `useModulePermission` em vez de `canViewItem(minRole)`:

```typescript
// Antes (hardcoded):
{canViewItem('csm_senior') && <NavItem href="/cs-ops" />}

// Depois (governança):
{canViewModule('atividades') && <NavItem href="/atividades" />}
{canViewModule('home')       && <NavItem href="/home" />}
```

Itens existentes **não são migrados agora** — ficam como estão para não quebrar nada. A migração progressiva dos demais itens é trabalho separado.

### 6. Redirect pós-login respeita permissão

**Arquivo:** `src/app/page.tsx`

```typescript
// Se tem permissão para home → /home
// Se não tem              → /dashboard (comportamento atual)
const canHome = await getModulePermission(user.id, 'home', 'view')
redirect(canHome ? '/home' : '/dashboard')
```

### 7. Permissão de visibilidade do time em Atividades

A visibilidade de atividades de outros CSMs usa o campo `view_team` do módulo `atividades` no custom role — **não `export`**.

> **Por que `view_team` e não `export`?** O campo `export` na tela de permissões é interpretado por qualquer admin como "pode baixar dados". Usar `export` para controlar visibilidade do time é uma pegadinha semântica que gera configuração errada. Campos com semântica diferente devem ser campos diferentes.

Regras de negócio definidas:
- `view_team: true` → vê tarefas de todos os CSMs do time (filtro "Ver por CSM" aparece)
- `view_team: true` → pode **ver e atualizar status** de tarefas do time (ex: gestor muda "Atrasado" para "Concluído")
- `view_team: false` (padrão) → vê somente as próprias tarefas

### 8. RLS da tabela `csm_tasks` — estratégia de performance

**Problema:** fazer `JOIN profiles + custom_roles` dentro de uma cláusula `USING (EXISTS (...))` em cada linha avaliada é custoso em tabelas que crescem indefinidamente.

**Solução adotada: `SECURITY DEFINER` function + GIN index**

```sql
-- Índice GIN na coluna de permissões (útil quando a tabela crescer; com < ~20 roles o Postgres faz seq scan de qualquer forma)
CREATE INDEX idx_custom_roles_permissions_gin ON custom_roles USING GIN (permissions);

-- Função cacheada por query (STABLE = Postgres reutiliza o resultado na mesma query)
CREATE OR REPLACE FUNCTION has_module_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN custom_roles cr ON cr.id = p.custom_role_id
    WHERE p.id = auth.uid()
      AND cr.permissions @> jsonb_build_array(
            jsonb_build_object('module', p_module, p_action, true)
          )
  )
$$;
```

```sql
-- Dono sempre vê, cria, edita e deleta as próprias
CREATE POLICY csm_tasks_owner ON csm_tasks
  FOR ALL USING (csm_id = auth.uid());

-- Quem tem view_team no módulo atividades: vê e edita de qualquer CSM
CREATE POLICY csm_tasks_team_select ON csm_tasks
  FOR SELECT USING (has_module_permission('atividades', 'view_team'));

CREATE POLICY csm_tasks_team_update ON csm_tasks
  FOR UPDATE USING (has_module_permission('atividades', 'view_team'));
```

> **Otimização futura (não agora):** Injetar permissões no JWT via Supabase Auth Hook. Isso elimina qualquer query no RLS. Só vale a pena se os benchmarks mostrarem gargalo real — a solução acima é suficiente para o volume atual.

### 9. Tela de permissões já funciona

Como `home` e `atividades` são adicionados a `PLATFORM_MODULES`, a matriz de permissões em `/settings/roles` já os exibe automaticamente. O admin pode configurar qual perfil vê o quê — sem nenhuma mudança adicional na UI de governança.

---

## Banco de Dados — Tabela `csm_tasks`

**Decisão de schema:** substituir o padrão polimórfico (`source_type` + `source_id`) por FKs explícitas e esparsas. Motivo: o padrão polimórfico impede `ON DELETE CASCADE` real — se um alerta for deletado, a tarefa fica órfã. Com FKs explícitas, o banco garante integridade automaticamente.

```sql
CREATE TABLE csm_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  csm_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  activity_type TEXT CHECK (activity_type IN (
                  'meeting','email','call','analysis','follow_up','internal','other'
                )),
  status        TEXT NOT NULL DEFAULT 'todo'
                  CHECK (status IN (
                    'suggested',   -- criada por IA, aguarda confirmação do CSM
                    'todo',
                    'in_progress',
                    'completed',
                    'cancelled'
                  )),
  priority      TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low','medium','high')),
  due_date      DATE,

  -- Origem da tarefa: FKs explícitas (no máximo uma preenchida)
  adoption_id    UUID REFERENCES adoption_features(id) ON DELETE SET NULL,
  time_entry_id  UUID REFERENCES time_entries(id)      ON DELETE SET NULL,
  alert_id       UUID REFERENCES alerts(id)            ON DELETE SET NULL,
  -- Se todas forem NULL → origem manual (ou origem excluída — ver nota abaixo)
  source_label   TEXT CHECK (source_label IN (
                   'manual','adoption','time_entry','alert','playbook'
                 )),
  -- source_label: imutável, gravado na criação para exibição no TaskCard
  -- mesmo após ON DELETE SET NULL, o label continua indicando a origem original

  CONSTRAINT csm_tasks_single_source CHECK (
    (adoption_id IS NOT NULL)::int +
    (time_entry_id IS NOT NULL)::int +
    (alert_id IS NOT NULL)::int <= 1
  ),

  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> **Extensibilidade futura:** Quando surgir NPS, SLA ou renovação como origem, adicionamos uma nova coluna FK (`nps_id`, `renewal_id`, etc.) e expandimos o CHECK. A migração é um `ALTER TABLE ADD COLUMN` simples — sem mudança de schema existente.

> **Tarefa órfã (ON DELETE SET NULL):** Quando um alerta ou time entry é excluído, a FK correspondente vira `NULL`. A tarefa continua existindo (preserva histórico de trabalho do CSM). O `TaskCard` deve prever esse estado: se a FK era de alerta mas agora está nula, mostrar "Origem: Alerta (excluído)" com estilo atenuado. A referência ao tipo de origem original pode ser guardada em um campo `source_type TEXT` somente para exibição — sem integridade referencial, só rótulo visual.

> **Status `suggested`:** Tarefas criadas automaticamente pela IA (Gemini via time_entry ou alert_service) nascem com `status = 'suggested'`. O CSM vê um toast/badge na próxima abertura do módulo e pode confirmar (muda para `todo`) ou descartar (muda para `cancelled`). Isso evita que dezenas de tarefas automáticas "poluam" o kanban sem aviso.

---

## Estratégia de acesso a dados — sem camada REST desnecessária

**Decisão:** não criar rotas `/api/csm-tasks`. O RLS já garante segurança na borda do banco. Usar:

| Operação | Onde executar | Como |
|----------|--------------|------|
| Listar tarefas (UI) | Client Component | `supabase.from('csm_tasks').select(...)` — RLS filtra automaticamente |
| Criar tarefa (UI) | Server Action | `supabase.from('csm_tasks').insert(...)` |
| Atualizar status (drag kanban) | Client Component | `supabase.from('csm_tasks').update(...)` |
| Deletar tarefa | Server Action | `supabase.from('csm_tasks').delete(...)` |
| Criar tarefa via IA (time entry) | Server-side em `time-entries/route.ts` | `supabaseAdmin.from('csm_tasks').insert(...)` diretamente |
| Criar tarefa via alerta | Server-side em `alert-service.ts` | `supabaseAdmin.from('csm_tasks').insert(...)` diretamente |

> **Por que não REST?** Rotas Next.js em `/api/csm-tasks` adicionam uma camada HTTP desnecessária entre o browser e o Supabase, duplicando o trabalho que o RLS já faz. Server Actions entregam o mesmo DX (formulários, mutations) sem o overhead.

---

## Módulo `/atividades`

### Arquivos a criar

| Arquivo | Propósito |
|---------|-----------|
| `src/app/(dashboard)/atividades/page.tsx` | Server component + verificação de permissão |
| `src/app/(dashboard)/atividades/components/AtividadesClient.tsx` | Estado, view toggle, filtros, Realtime subscription |
| `src/app/(dashboard)/atividades/components/AtividadesListView.tsx` | Lista agrupada: Sugeridas / Atrasadas / Hoje / Semana / Próximas / Sem data |
| `src/app/(dashboard)/atividades/components/AtividadesKanbanView.tsx` | Kanban: Sugerido / A Fazer / Em Andamento / Concluído / Cancelado |
| `src/app/(dashboard)/atividades/components/TaskCard.tsx` | Card reutilizável |
| `src/app/(dashboard)/atividades/components/CreateTaskModal.tsx` | Modal de criação/edição com pré-preenchimento |

### Realtime

`AtividadesClient` assina mudanças na tabela `csm_tasks`. **O filtro do canal deve ser dinâmico** conforme o modo de visualização:

```typescript
// viewMode: 'mine' | 'team'
const filter = viewMode === 'mine' ? `csm_id=eq.${userId}` : undefined

supabase
  .channel(`csm_tasks_${viewMode}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'csm_tasks',
    ...(filter ? { filter } : {}) // sem filtro = RLS decide no servidor
  }, (payload) => {
    // atualiza estado local — sem refetch
  })
  .subscribe()
```

> **Por que isso importa:** Se o filtro `csm_id=eq.${userId}` for sempre aplicado, o gestor com `view_team = true` jamais receberá eventos das tarefas dos liderados em tempo real. Quando o filtro é `undefined`, o servidor do Supabase usa as políticas RLS (`csm_tasks_team_select`) para decidir quais eventos enviar para aquele socket — comportamento correto e seguro.

> **Troca de canal:** Ao alternar entre "Minhas Tarefas" e "Toda a Equipe", o componente deve fazer `unsubscribe()` do canal anterior e criar um novo com o filtro atualizado.

Isso garante que quando a IA cria uma tarefa em background (time entry processado), o kanban do CSM (ou do gestor) atualiza em tempo real sem precisar de refresh.

---

## Múltiplos Pontos de Criação

| Origem | Arquivo modificado | Status inicial | FK preenchida |
|--------|-------------------|----------------|---------------|
| **Manual** | `/atividades` — botão "+ Nova" | `todo` | nenhuma |
| **Adoção Funcional** | `AdoptionForm.tsx` | `todo` | `adoption_id` |
| **Esforço / Time Entry** | `parse-time-entry.ts` + `time-entries/route.ts` | `suggested` | `time_entry_id` |
| **Alerta Proativo** | `alert-service.ts` | `suggested` | `alert_id` |
| **Futuras origens** | Nova coluna FK | `suggested` | nova FK |

---

## Integração na Página de Conta

Seção "Atividades" na coluna 2 da página de conta (`AccountDetailPageClient.tsx`):
- Mostra atividades `status IN ('todo','in_progress')` daquela conta
- Botão "+ Criar" abre `CreateTaskModal` pré-preenchido com a conta
- Link "Ver todas" → `/atividades?account=<id>`

---

## Home — Visibilidade + Integração

- Sidebar: novo item `/home` como primeiro da navegação (visível somente se `home.view = true` no custom role)
- `HomePrioritiesClient.tsx`: adicionar seção de atividades atrasadas + do dia (ignora `suggested`)
- Redirect pós-login: `/home` se tiver permissão, `/dashboard` se não tiver

---

## Todos os Arquivos

| Arquivo | Ação |
|---------|------|
| `src/lib/auth/modules.ts` | MODIFICAR — adicionar `home` e `atividades` |
| `src/lib/auth/permission-schema.ts` | CRIAR — Zod schema para JSONB de permissões |
| `src/hooks/useModulePermission.ts` | CRIAR |
| `src/lib/auth/get-module-permission.ts` | CRIAR (server-side) |
| `supabase/migrations/YYYYMMDD_profiles_custom_role.sql` | CRIAR — coluna + migração de dados existentes |
| `supabase/migrations/YYYYMMDD_csm_tasks.sql` | CRIAR — tabela + RLS + GIN index + função SECURITY DEFINER |
| `src/app/(dashboard)/atividades/` (6 arquivos) | CRIAR |
| `src/lib/gemini/parse-time-entry.ts` | MODIFICAR — extrair `action_items[]` da transcrição |
| `src/app/api/time-entries/route.ts` | MODIFICAR — criar tasks `suggested` de action_items |
| `src/lib/alerts/alert-service.ts` | MODIFICAR — criar task `suggested` ao inserir alerta |
| `src/app/(dashboard)/accounts/[id]/components/AccountDetailPageClient.tsx` | MODIFICAR — seção atividades |
| `src/app/(dashboard)/accounts/[id]/components/AdoptionForm.tsx` | MODIFICAR — botão criar atividade |
| `src/app/(dashboard)/home/components/HomePrioritiesClient.tsx` | MODIFICAR — atividades do dia (sem `suggested`) |
| `src/components/layout/Sidebar.tsx` | MODIFICAR — home + atividades via governança |
| `src/app/page.tsx` | MODIFICAR — redirect com verificação de permissão |

---

## Decisões de arquitetura — resumo

| Ponto | Decisão |
|-------|---------|
| Semântica de permissão de time | `view_team: true` — não `export` |
| Performance do RLS | `SECURITY DEFINER` function + GIN index — JWT hook é otimização futura |
| Integridade da origem das tarefas | FKs explícitas esparsas — não polimorfismo |
| CRUD de tarefas | Supabase client direto + Server Actions — sem rotas REST |
| UPDATE por gestor | Permitido via policy `csm_tasks_team_update` |
| Tarefas automáticas da IA | Nascem com status `suggested`, CSM confirma ou descarta |
| Realtime | Canal dinâmico: `filter=csm_id` em "Minhas Tarefas", sem filtro em "Toda a Equipe" (RLS decide no servidor) |
| Tipagem do JSONB | Zod schema em `permission-schema.ts` |
| Migração de usuários existentes | Script SQL na mesma migration de `custom_role_id`, por `slug` (não `name`) |
| Tarefa órfã (FK nula) | `source_type TEXT` somente para label visual; tarefa persiste com `alert_id = NULL` |
| GIN index em `custom_roles` | Criado mas irrelevante com < 20 rows — SECURITY DEFINER é o que salva performance |

---

## Verificação End-to-End

1. `npx tsc --noEmit --skipLibCheck` — zero erros
2. Ir em `/settings/roles` → módulos `Home & Command Center` e `Atividades do CSM` aparecem na matriz
3. Criar perfil sem `home.view` → sidebar não mostra Home → login redireciona para `/dashboard`
4. Criar perfil com `home.view` → login vai para `/home` com atividades do dia
5. Perfil com `atividades.view_team = true` → filtro "Ver por CSM" aparece em `/atividades`
6. Registrar reunião com action items em Esforço → badge "X sugestões" aparece em `/atividades`
7. Confirmar tarefa sugerida → status muda para `todo` → aparece no kanban normal
8. Alerta proativo gerado → tarefa `suggested` criada → Realtime atualiza kanban do CSM
9. Adoção → "Criar Atividade" → modal pré-preenchido → aparece na conta e no módulo
10. Deletar alerta → tarefa vinculada via `alert_id` recebe `SET NULL` automaticamente (sem órfã)
