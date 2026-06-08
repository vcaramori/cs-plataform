# 13 — MCP da ferramenta (agentes)

> Status: v1 entregue 2026-06-08. Servidor MCP de **negócio** da plataforma, para um agente de IA interagir em todas as frentes.

## Visão

Além do **Supabase MCP** (acesso a banco, já no `.mcp.json`), a plataforma expõe um **MCP próprio** com tools de **negócio** (contas, onboarding, NPS, suporte, esforço, negociação e o "perguntar"/RAG). Política: **leitura ampla + escrita restrita ao operacional**; **sem** tools de usuários/perfis/config/admin nem exclusões.

## Arquitetura (uma fonte da verdade)

- **Registry** [src/lib/mcp/registry.ts](../../src/lib/mcp/registry.ts): lista única de tools `{ name, description, write, inputSchema (JSON Schema), handler }`. Handlers reusam as libs (`runRAGPipeline`, `onboarding-service`, `logEffort`, `ingestNegotiation`) via **service-role** (admin client) — sem `next/server`.
- **Transporte HTTP** [src/app/api/mcp/route.ts](../../src/app/api/mcp/route.ts): JSON-RPC 2.0 (`initialize`, `tools/list`, `tools/call`, `ping`), "Streamable HTTP" sem SSE. Auth `Authorization: Bearer <MCP_API_TOKEN>`. Remoto/hospedado (sempre atualizado no deploy).
- **Transporte stdio** [mcp/stdio.mjs](../../mcp/stdio.mjs): ponte fina (newline-delimited JSON-RPC) que **encaminha** ao endpoint HTTP — não carrega o grafo do app (zero acoplamento com o build). Rodar: `npm run mcp:stdio`.

**Manter atualizado:** ao adicionar uma capacidade de negócio, adicione/edite a tool **só** no registry — ambos os transportes refletem na hora.

## Tools v1

- **Leitura**: `ask` (RAG), `list_accounts`, `get_account` (360°), `get_onboarding`, `list_onboarding`, `get_nps`, `list_tickets`, `get_ticket`, `list_effort`.
- **Escrita (operacional)**: `start_onboarding`, `update_onboarding_milestone`, `log_onboarding_effort` (→ PSA), `log_effort`, `add_onboarding_event`, `create_ticket`, `log_interaction`, `register_negotiation`.
- **Por design não existem**: usuários/perfis, admin/settings, exclusões.

## Configuração (env, server-side)

| Var | Função |
|---|---|
| `MCP_API_TOKEN` | Segredo do endpoint (use o mesmo no `.mcp.json` do agente). Sem token → endpoint nega tudo. |
| `MCP_ENABLED` | `false` desliga o MCP. |
| `MCP_ACTOR_USER_ID` | **UUID de um usuário real** (`auth.users`) atribuído aos lançamentos do agente (`time_entries.csm_id`, `interactions.csm_id` são NOT NULL/FK). Pode ser sobrescrito por `acting_user_id` na chamada. |
| `MCP_HTTP_URL` | (só p/ a ponte stdio) URL do `/api/mcp` — `http://localhost:3000/api/mcp` em dev ou a URL de produção. |

## Como conectar

- **HTTP (remoto)**: `POST <base>/api/mcp` com `Authorization: Bearer <MCP_API_TOKEN>` e corpo JSON-RPC. `GET /api/mcp` mostra status + nomes das tools.
- **stdio (Claude Code)**: entrada `csplataform` no [.mcp.json](../../.mcp.json) (`node mcp/stdio.mjs` + env `MCP_HTTP_URL`/`MCP_API_TOKEN`).

## Identidade & segurança

- **Service-role + token**: o MCP vê tudo (sem RLS), protegido pelo token — uso interno do time de CS.
- Escrita limitada ao operacional; nada destrutivo. Lançamentos do agente são atribuídos a `MCP_ACTOR_USER_ID` (rastreável).

## Verificação

```bash
# listar tools
curl -s -X POST "$BASE/api/mcp" -H "Authorization: Bearer $MCP_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# perguntar (RAG)
curl -s -X POST "$BASE/api/mcp" -H "Authorization: Bearer $MCP_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ask","arguments":{"question":"como está o onboarding do cliente X?"}}}'
```

## Follow-ups

- Modo **per-user (RLS)** e **token read-only**; tools de leitura extras (cs-ops, adoção, VoC).
- Empacotar o stdio como `bin` publicável, se for distribuir fora do repo.
