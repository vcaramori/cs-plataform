# Plano de Arquitetura Dual-Bank: On-Prem + Azure SQL

> **Data:** Abril 2026  
> **Status:** Planejado

---

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                     DESENVOLVIMENTO (Local)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐  │
│  │   Next.js   │─────▶│  Adapter   │─────▶│Azure SQL│  │
│  │  (localhost)│      │  Dual-Bank │      │ Local  │  │
│  └──────────────┘      └──────────────┘      └──────────┘  │
│                              │                            │      │
│                     ┌────────┴────────┐                  │      │
│                     │ Supabase Local │◀─────────────────┘      │
│                     │ (Docker)      │                         │
│                     │ pgvector     │                         │
│                     │ + Auth      │                         │
│                     │ + Storage   │                         │
│                     └─────────────┘                         │
│                          │                                 │
│                    Docker Desktop                         │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUÇÃO (Azure)                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐   │
│  │   Next.js  │─────▶│  Adapter   │─────▶│ Azure   │   │
│  │ (App SRV) │      │  Dual-Bank │      │  SQL   │   │
│  └──────────────┘      └──────────────┘      └──────────┘   │
│                              │                            │   │
│                     ┌────────┴────────┐                  │   │
│                     │ Supabase Cloud   │◀─────────────────┘   │
│                     │ (pgvector)       │                       │
│                     │ + Auth           │                       │
│                     │ + Storage       │                       │
│                     └─────────────┘                          │
│                           │                                   │
│                      Supabase Hosted                         │
└─────────────────────────────────────────────────────────┘
```

---

## Motivação

- **Banco relacional no Azure SQL**:对齐 com infraestrutura existente da empresa
- **Supabase local/on-prem**: embeddings + RAG + Auth sem dependência de cloud externo
- **Menor impacto**: split progressivo, não migração-big bang

---

## O Que Vai Onde

| Dado | Banco | Motivação |
|------|-------|-----------|
| accounts | Azure SQL | Dados core,对齐 enterprise |
| contracts | Azure SQL | Dados core |
| contacts | Azure SQL | Power Map |
| interactions | Azure SQL | Registros operacionais |
| time_entries | Azure SQL | Esforço CSM |
| support_tickets | Azure SQL | Ciclo de vida suporte |
| health_scores | Azure SQL | Histórico health |
| sla_policies | Azure SQL | Regras SLA |
| **embeddings** | **Supabase Local** | **Requires pgvector** |
| **search_embeddings()** | **Supabase Local** | **Função pgvector** |
| **Auth** | **Supabase Local/Cloud** | **JWT + RLS nativo** |

---

## Tabelas no Azure SQL (16)

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

---

## Fase 1: Setup Supabase Local (Docker)

### docker-compose.yml

```yaml
services:
  db:
    image: supabase/postgres:15.6.1.147
    container_name: cscontinuum_supabase_db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
    volumes:
      - supabase_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  studio:
    image: supabase/studio:20250420
    container_name: cscontinuum_supabase_studio
    ports:
      - "54323:3000"

  ollama:
    image: ollama/ollama:latest
    container_name: cscontinuum_ollama
    ports:
      - "11434:11434"

volumes:
  supabase_data:
```

### Migrações Aplicadas

- `003_pgvector.sql` — Apenas embeddings + search_vectors()

---

## Fase 2: Setup Azure SQL Database

### Responsável: Admin Azure

| Item | Detalhe |
|------|---------|
| **Database** | `cscontinuum` |
| **Tier** | Basic (~R$45/mês) |
| **Acesso** | IP temporário para dev |
| **Produção** | Private Endpoint via VNet |

### Connection String (desenvolvimento)

```
Server=[servidor].database.windows.net;Database=cscontinuum;User Id=[user];Password=[senha];
```

---

## Fase 3: Schema Azure SQL

Ver: `supabase/migrations/azure-sql-schema.sql`

### Estrutura

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

## Fase 4: Adapter Dual-Bank

```
src/lib/
├── supabase/
│   ├── client.ts         # Conexão existing
│   ├── admin.ts        # Conexão admin
│   └── vector-search.ts # Apenas embeddings
├── azure-sql/         # NOVO
│   ├── client.ts      # ms-sql / tedious
│   ├── types.ts      # Tipos TypeScript
│   └── queries/      # Queries por domínio
└── db.ts             # Router: decide qual banco usar
```

### Lógica de Routing

```typescript
// Queries relacionais → Azure SQL
const accounts = await azureDb.query('accounts', filter)

// Queries embeddings → Supabase (local/cloud)
const embeddings = await supabase.rpc('search_embeddings', {...})
```

---

## Fase 5: Configuração de Ambiente

### .env desenvolvimento

```bash
# Azure SQL (relacional)
AZURE_SQL_CONNECTION_STRING=Server=...;Database=cscontinuum;User Id=...;Password=...;

# Supabase Local (embeddings + auth)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:5432
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev_anon_key
SUPABASE_SERVICE_ROLE_KEY=dev_service_key
```

### .env produção

```bash
# Azure SQL (relacional - privado via VNet)
AZURE_SQL_CONNECTION_STRING=Server=...;Database=cscontinuum;Trusted_Connection=True;

# Supabase Cloud (pgvector + auth)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Fases de Deploy

| Fase | Ambiente | Banco Relacional | Embeddings | Auth | App |
|------|---------|---------------|-----------|------|-----|
| 1 | Dev Local | Azure SQL (IP liberto) | Supabase Local | Supabase Local | Local |
| 2 | Prod | Azure SQL (Private) | Supabase Cloud | Supabase Cloud | Azure App Service |

---

## Pending (Aguardando Admin)

| # | Item | Status |
|---|------|--------|
| 1 | Database `cscontinuum` criada | ⏳ |
| 2 | IP liberado para dev | ⏳ |
| 3 | Connection string recebida | ⏳ |

---

## Próximos Passos (após connection string)

1. Gerar script T-SQL das 16 tabelas
2. Atualizar docker-compose.yml com Supabase local
3. Implementar adapter Azure SQL
4. Configurar dual routing
5. Testar end-to-end local
6. Deploy produção

---

## Referências

- [pgvector](https://github.com/pgvector/pgvector)
- [Azure SQL Vector Support](https://learn.microsoft.com/en-us/sql/relational-databases/vectors/vectors-sql-server)
- [mssql-node driver](https://github.com/tediousjs/node-mssql)
- [Azure SQL Private Endpoint](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview)