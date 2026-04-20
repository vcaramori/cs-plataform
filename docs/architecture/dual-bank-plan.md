# Plano de Arquitetura: Azure SQL + NextAuth

> **Data:** Abril 2026  
> **Status:** Planejado  
> **Decisão:** Stack unificada — Azure SQL para tudo (relacional + vetores), NextAuth.js para auth

---

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                     DESENVOLVIMENTO (Local)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Next.js   │─────▶│  NextAuth.js │      │  Azure SQL   │  │
│  │  (localhost)│      │  (sessions)  │─────▶│  (dev / IP)  │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                                           ▲           │
│         └───────────── mssql queries ───────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUÇÃO (Azure)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Next.js   │─────▶│  NextAuth.js │      │  Azure SQL   │  │
│  │ (App SRV)  │      │  (sessions)  │─────▶│ (Private EP) │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                                           ▲           │
│         └───────────── mssql queries ───────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Motivação

- **Stack única:** Azure SQL suporta vetores nativamente — sem necessidade de Supabase
- **Auth único:** NextAuth.js gerencia internos (CSMs) e externos (clientes) com roles, sem dois gestores de identidade
- **Menor complexidade operacional:** um banco, um sistema de auth, sem serviços externos adicionais

---

## Decisão de Auth

| Perfil | Método | Role |
|--------|--------|------|
| CSM / interno | Email + senha (NextAuth credentials) | `csm` |
| Cliente externo | Email + senha ou magic link | `client` |

> Azure Entra ID SSO foi descartado: adicionaria um segundo gestor de identidade sem benefício real, já que o portal de cliente precisa de auth própria de qualquer forma.

---

## O Que Vai Onde

| Dado | Banco | Motivação |
|------|-------|-----------|
| accounts | Azure SQL | Dados core enterprise |
| contracts | Azure SQL | Dados core |
| contacts | Azure SQL | Power Map |
| interactions | Azure SQL | Registros operacionais |
| time_entries | Azure SQL | Esforço CSM |
| support_tickets | Azure SQL | Ciclo de vida suporte |
| health_scores | Azure SQL | Histórico health |
| sla_policies | Azure SQL | Regras SLA |
| **users** | **Azure SQL** | **Gerenciado pelo NextAuth** |
| **sessions** | **Azure SQL** | **Gerenciado pelo NextAuth** |
| **embeddings** | **Azure SQL** | **VECTOR nativo (SQL Server 2022+)** |

---

## Tabelas de Domínio no Azure SQL (18)

- accounts
- contracts
- contacts
- interactions
- time_entries
- support_tickets
- health_scores
- sla_policies
- sla_policy_levels
- sla_level_mappings
- business_hours
- sla_events
- csat_responses
- csat_tokens
- nps_programs
- nps_responses
- nps_questions
- nps_answers

### Tabelas NextAuth (geradas pelo adapter)

- users
- accounts (OAuth — separada da tabela de clientes)
- sessions
- verification_tokens

---

## Fase 1: Setup Azure SQL Database

### Responsável: Admin Azure

| Item | Detalhe |
|------|---------|
| **Database** | `cscontinuum` |
| **Tier** | General Purpose S2 ou superior (necessário para VECTOR) |
| **Acesso dev** | IP fixo do dev liberado via firewall rule |
| **Produção** | Private Endpoint via VNet |
| **Versão** | Mais recente disponível no Azure SQL |

### Connection String (desenvolvimento)

```
Server=[servidor].database.windows.net;Database=cscontinuum;User Id=[user];Password=[senha];Encrypt=True;TrustServerCertificate=False;
```

---

## Fase 2: Schema Azure SQL

Ver: `src/lib/azure-sql/schema.sql`

### Estrutura de domínio

| Tabela | Notas |
|--------|-------|
| accounts | PK UUID, csm_owner_id |
| contracts | FK account_id |
| contacts | FK account_id |
| interactions | FK account_id, contract_id |
| time_entries | FK account_id, interaction_id |
| support_tickets | FK account_id, contract_id |
| health_scores | FK account_id |
| sla_policies | FK contract_id (unique) |
| sla_policy_levels | FK sla_policy_id |
| sla_level_mappings | FK sla_policy_id |
| business_hours | FK account_id (nullable) |
| sla_events | FK support_ticket_id |
| csat_responses | FK support_ticket_id, account_id |
| csat_tokens | FK csat_response_id |
| nps_programs | FK account_id (nullable = global), csm_owner_id |
| nps_responses | FK program_id, user_id |
| nps_questions | FK program_id |
| nps_answers | FK response_id, question_id |

---

## Fase 3: Estrutura do Projeto

```
src/lib/
├── azure-sql/
│   ├── client.ts      # Conexão mssql / node-mssql
│   ├── types.ts       # Tipos TypeScript
│   └── queries/       # Queries por domínio
├── auth/
│   ├── config.ts      # NextAuth config (providers, callbacks, roles)
│   └── adapter.ts     # NextAuth MsSQL Adapter
└── db.ts              # Client singleton exportado
```

---

## Fase 4: Configuração de Ambiente

### .env desenvolvimento

```bash
# Azure SQL
AZURE_SQL_SERVER=[servidor].database.windows.net
AZURE_SQL_DATABASE=cscontinuum
AZURE_SQL_USER=[user]
AZURE_SQL_PASSWORD=[senha]

# NextAuth
NEXTAUTH_SECRET=[random_secret]
NEXTAUTH_URL=http://localhost:3000
```

### .env produção

```bash
# Azure SQL (privado via VNet)
AZURE_SQL_SERVER=[servidor].database.windows.net
AZURE_SQL_DATABASE=cscontinuum
AZURE_SQL_USER=[user]
AZURE_SQL_PASSWORD=[senha]

# NextAuth
NEXTAUTH_SECRET=[random_secret]
NEXTAUTH_URL=https://[dominio].azurewebsites.net
```

---

## Fases de Deploy

| Fase | Ambiente | Banco | Auth | App |
|------|---------|-------|------|-----|
| 1 | Dev Local | Azure SQL (IP liberado) | NextAuth local | localhost:3000 |
| 2 | Prod | Azure SQL (Private Endpoint) | NextAuth prod | Azure App Service |

---

## Pending (Aguardando Admin)

| # | Item | Status |
|---|------|--------|
| 1 | Database `cscontinuum` criada | ⏳ |
| 2 | Versão confirmada: mais recente disponível (suporte a VECTOR) | ⏳ |
| 3 | IP do dev liberado via firewall rule | ⏳ |
| 4 | Connection string com usuário dedicado recebida | ⏳ |
| 5 | Private Endpoint configurado para produção | ⏳ |

---

## Plano de Migração (após banco criado e .env configurado)

### Pré-requisito: .env preenchido

```bash
AZURE_SQL_SERVER=[servidor recebido do admin].database.windows.net
AZURE_SQL_DATABASE=cscontinuum
AZURE_SQL_USER=[usuário recebido]
AZURE_SQL_PASSWORD=[senha recebida]
NEXTAUTH_SECRET=[gerar com: openssl rand -base64 32]
NEXTAUTH_URL=http://localhost:3000
```

### Etapas em ordem

| # | Etapa | O que fazer |
|---|-------|-------------|
| 1 | **Instalar dependências** | `npm install mssql next-auth @auth/mssql-adapter` |
| 2 | **Criar client Azure SQL** | Implementar `src/lib/azure-sql/client.ts` com pool de conexão via `mssql` |
| 3 | **Executar schema T-SQL** | Rodar `src/lib/azure-sql/schema.sql` no banco — cria as 18 tabelas de domínio |
| 4 | **Configurar NextAuth** | Implementar `src/lib/auth/config.ts` com providers credentials + roles `csm`/`client` |
| 5 | **Tabelas NextAuth** | O adapter cria automaticamente: `users`, `sessions`, `accounts`, `verification_tokens` |
| 6 | **Remover Supabase Auth** | Substituir chamadas `supabase.auth.*` pelo NextAuth `signIn`/`signOut`/`getSession` |
| 7 | **Remover Supabase client** | Substituir queries `supabase.from(...)` por queries diretas via `src/lib/azure-sql/client.ts` |
| 8 | **Testar autenticação** | Login CSM + login cliente + redirect correto por role |
| 9 | **Testar queries** | Verificar todas as páginas: accounts, contracts, tickets, health, NPS, CSAT |
| 10 | **Remover dependências Supabase** | `npm uninstall @supabase/supabase-js @supabase/ssr` |
| 11 | **Deploy produção** | Configurar variáveis de ambiente no Azure App Service + Private Endpoint |

### Critérios de conclusão

- [ ] Login funcional para CSM e cliente com roles distintos
- [ ] Todas as páginas carregando dados do Azure SQL
- [ ] Zero imports de `@supabase/*` no projeto
- [ ] Testes end-to-end passando em local antes do deploy

---

## Referências

- [Azure SQL Vector Support](https://learn.microsoft.com/en-us/sql/relational-databases/vectors/vectors-sql-server)
- [node-mssql driver](https://github.com/tediousjs/node-mssql)
- [NextAuth.js](https://next-auth.js.org/)
- [Azure SQL Private Endpoint](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview)
- [Azure SQL Firewall Rules](https://learn.microsoft.com/en-us/azure/azure-sql/database/firewall-configure)
