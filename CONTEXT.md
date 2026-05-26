# CS Platform — Contexto de Sessão

## Stack
- Next.js 16.2 App Router, TypeScript, React 19
- Supabase PostgreSQL + pgvector (1536d, text-embedding-005)
- Tailwind CSS, shadcn/ui, Lucide, Framer Motion, Recharts
- Sonner (toast), React Query (@tanstack/react-query)

## Arquitetura de Auth

### Tipos de Role (hardcoded)
```ts
type UserRole = 'csm' | 'csm_senior' | 'head_cs' | 'admin' | 'super_admin'
```

### Permissões (src/lib/auth/permissions.ts)
```
csm          → view:accounts
csm_senior   → view:accounts, view:users
head_cs      → view:accounts, view:users, manage:users, view:audit_log
admin        → tudo exceto manage:roles
super_admin  → tudo
```

### Guards Centralizados
- `src/lib/auth/require-auth.ts` → `requireApiAuth(permission?)` para API routes
- `src/lib/auth/require-page-auth.ts` → `requirePageAuth(permission?)` para server components
- `src/lib/auth/modules.ts` → `PLATFORM_MODULES` (13 módulos), `makeDefaultPermissions()`

### Padrão de Página (server + client)
```ts
// page.tsx — server component
export default async function Page() {
  const { user, profile } = await requirePageAuth('permissao:necessaria')
  const data = await getSupabaseAdminClient().from('tabela').select('*')
  return <PageClient initialData={data} currentUserRole={profile.role} />
}

// PageClient.tsx — 'use client'
export function PageClient({ initialData, currentUserRole }) { ... }
```

### Padrão de API Route
```ts
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'

export async function GET(request: Request) {
  const auth = await requireApiAuth()           // só login
  // ou:
  const auth = await requireApiAuth('manage:settings')  // com permissão
  if (isAuthError(auth)) return auth
  // auth.user, auth.role disponíveis
}
```

## Módulos da Plataforma (PLATFORM_MODULES)
1. `dashboard` — Dashboard & Home
2. `suporte` — Suporte & Tickets
3. `nps` — Pesquisas NPS
4. `voc` — Voz do Cliente (VoC)
5. `adoption` — Adoption & Heatmaps
6. `esforco` — Esforço & Capacity
7. `ask` — Perguntar (Ask AI)
8. `playbooks` — Automação & Playbooks
9. `contracts` — Contratos & Faturamento
10. `accounts` — Gestão de Contas
11. `governance` — Governança & Auditoria
12. `sla_config` — Configuração SLA
13. `product_config` — Funcionalidades & Planos

## LLM Gateway Multi-Provider

### Providers suportados
- Gemini (padrão), Claude, OpenAI, Groq

### Arquivos chave
- `src/lib/llm/gateway.ts` — Interface pública (`generateText`, `generateEmbedding`)
- `src/lib/llm/settings.ts` — Carrega config do banco com cache 60s, fallback env vars
- `src/lib/llm/providers/` — 4 adapters + registry
- `src/lib/crypto/encryption.ts` — AES-256-GCM (env: `ENCRYPTION_KEY`)

### Embeddings
- Dimensão: **1536d** (text-embedding-005)
- DB: coluna `embedding` é `vector(1536)`

## Banco de Dados

### Tabelas chave
- `profiles` — `id, full_name, role (UserRole), is_active, user_type`
- `custom_roles` — `id, name, description, permissions (jsonb PermissionRow[])`
- `app_settings` — chave/valor para config LLM
- `accounts`, `support_tickets`, `sla_events`, `business_hours`

### Relacionamento roles
- `profiles.role` é TEXT (não FK para custom_roles — desconectado)
- `custom_roles` são perfis configuráveis na UI; o campo `role` em profiles usa os nomes desses perfis

## Componentes Guardian (padrão de layout)
```tsx
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { PageContainer } from '@/components/ui/page-container'

// Uso padrão em pages:
<PageContainer className="max-w-[1400px] space-y-0">
  <ModuleHeader
    title="Titulo da Pagina"
    subtitle="Subtitulo descritivo"
    iconName="ShieldCheck"  // nome do ícone Lucide
  />
  <ConteudoClient />
</PageContainer>
```

## Histórico de Commits Recentes
```
b92f75c  security: centralise auth, protect all APIs and pages, rewrite roles page
cf7c740  refactor(users): rewrite users page with componentization, auth, batch save
5af5e38  feat(governance): add dedicated access roles page and simplify users page
4b2c79f  fix: align all LLM defaults to 1536d (text-embedding-005), remove 768d model
7949a73  feat(llm): multi-provider gateway (Gemini/Claude/OpenAI/Groq), encrypted API keys
```

## Trabalho Concluído nesta Sessão

### 1. README.md atualizado
- Stack, arquitetura LLM, env vars, embeddings 1536d

### 2. LLM Multi-Provider Gateway
- 4 providers: Gemini, Claude, OpenAI, Groq
- API keys criptografadas no banco (AES-256-GCM)
- Cache em memória 60s TTL
- UI em `/admin/settings` (aba IA)
- Endpoint de teste de provider
- Re-index de embeddings via API

### 3. Tela de Usuários (/users) — Reescrita Completa
**Arquivos:**
- `src/app/(dashboard)/users/page.tsx` — server component com auth
- `src/app/(dashboard)/users/components/UsersClient.tsx` — busca, batch save
- `src/app/(dashboard)/users/components/UserCard.tsx` — card individual
- `src/app/(dashboard)/users/components/NewUserForm.tsx` — formulário de criação
- `src/app/api/users/route.ts` — auth completa
- `src/app/api/users/batch/route.ts` — novo endpoint batch
- `src/app/api/custom-roles/route.ts` — auth em todos os métodos
- `src/lib/auth/permissions.ts` — super_admin pode gerenciar outros super_admins

**Features:**
- Roles vêm do banco (custom_roles), apenas super_admin é hardcoded
- Botão flutuante "Salvar Alterações" para batch save
- Badge de usuário externo preparado para dashboard de clientes
- `canManageUser` permite super_admin atribuir super_admin

### 4. Tela de Perfis de Acesso (/settings/roles) — Reescrita Completa
**Arquivos:**
- `page.tsx` → server component com `requirePageAuth('manage:roles')`
- `components/RolesClient.tsx` — orquestra estado
- `components/RolesList.tsx` — lista lateral
- `components/NewRoleForm.tsx` — formulário criação
- `components/EditRoleDialog.tsx` — Dialog shadcn (sem modal manual)
- `components/PermissionsMatrix.tsx` — tabela de switches
- Usa `PLATFORM_MODULES` (13 módulos, era 7)
- Substituído `alert()`/`confirm()` por `toast`

### 5. Auditoria & Correção de Segurança
**APIs protegidas (18 rotas):** effort, health-timeline, nps, tickets-summary, adoption-delta, business-hours, cs-ops/cockpit, csm-queue-stats, sla-policies, support-tickets/events, sla, summary, sentiment-trend, auto-categorize, review-reply, auto-assign-test, test-sla-escalation, test/run-flow

**Páginas corrigidas (7):** roles, features, plans, sla settings, suporte/dashboard, suporte/sla, success-plan — todas convertidas para server component + client component

## Pendências / Próximos Passos
- `profiles.role` ainda usa TEXT; ainda não está vinculado formalmente a `custom_roles.name`
- 30+ arquivos com roles hardcoded que não foram migrados (fora do escopo atual)
- A matriz de permissões em `custom_roles.permissions` ainda não é enforcement real nas páginas/APIs — é apenas visual na UI de governança
- Dashboard de clientes externos (user_type = 'external') ainda não implementado
- Sidebar ainda usa role hierarchy hardcoded para mostrar/esconder itens

## Env Vars Necessárias
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=           # 32 bytes hex para AES-256-GCM
GEMINI_API_KEY=           # fallback se não houver config no banco
ANTHROPIC_API_KEY=        # opcional
OPENAI_API_KEY=           # opcional
GROQ_API_KEY=             # opcional
```
