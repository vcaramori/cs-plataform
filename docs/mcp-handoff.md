# Conexão ao MCP do CS-Continuum — Guia rápido

> **Confidencial.** O token abaixo é uma credencial (como uma senha de API). Não publique em local público, não cole em frontend/navegador. Acesso = administrador (lê tudo; escreve no operacional).

Este MCP dá a um agente de IA acesso às operações do CS-Continuum (contas, onboarding, NPS, suporte, esforço, negociação) e ao "perguntar" (RAG).

## Dados de conexão

| | |
|---|---|
| **Endpoint** | `https://cs-plataform.vercel.app/api/mcp` |
| **Token** | `5d36610a4828a07400456d74abd89e3202bb09d0002c0025a4fd4a2c8a4f2a9f` |
| **Auth** | Header `Authorization: Bearer <token>` |
| **Protocolo** | MCP / JSON-RPC 2.0 (HTTP) |

## Opção A — HTTP direto (qualquer cliente/agente)

Listar as tools:
```bash
curl -s -X POST https://cs-plataform.vercel.app/api/mcp \
  -H "Authorization: Bearer 5d36610a4828a07400456d74abd89e3202bb09d0002c0025a4fd4a2c8a4f2a9f" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Perguntar (RAG):
```bash
curl -s -X POST https://cs-plataform.vercel.app/api/mcp \
  -H "Authorization: Bearer 5d36610a4828a07400456d74abd89e3202bb09d0002c0025a4fd4a2c8a4f2a9f" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ask","arguments":{"question":"qual o status de onboarding do cliente X?"}}}'
```

Métodos suportados: `initialize`, `tools/list`, `tools/call`, `ping`.

## Opção B — Claude Code / Desktop (stdio)

Requer o repositório (usa `mcp/stdio.mjs`, uma ponte que encaminha ao endpoint HTTP). No `.mcp.json` da máquina:
```json
{
  "mcpServers": {
    "csplataform": {
      "command": "node",
      "args": ["mcp/stdio.mjs"],
      "env": {
        "MCP_HTTP_URL": "https://cs-plataform.vercel.app/api/mcp",
        "MCP_API_TOKEN": "5d36610a4828a07400456d74abd89e3202bb09d0002c0025a4fd4a2c8a4f2a9f"
      }
    }
  }
}
```
Sem o repositório, use a **Opção A** (HTTP direto).

## Tools disponíveis

**Leitura (consulta/insight):**
- `ask` — pergunta em linguagem natural (RAG) sobre uma conta ou o portfólio.
- `list_accounts` — lista contas (busca opcional).
- `get_account` — visão 360° (dados, contratos, onboarding, health, NPS, tickets abertos).
- `get_onboarding` / `list_onboarding` — onboarding de um contrato / todos em andamento.
- `get_nps` — NPS de uma conta ou do portfólio.
- `list_tickets` / `get_ticket` — tickets de suporte.
- `list_effort` — lançamentos de esforço.

**Escrita (operacional):**
- `start_onboarding` — inicia o onboarding de um contrato.
- `update_onboarding_milestone` — avança/atualiza uma etapa do checklist.
- `log_onboarding_effort` — registra esforço de implantação (vai ao PSA). Requer `user_email`.
- `log_effort` — registra esforço de CS numa conta.
- `add_onboarding_event` — nota no diário de onboarding.
- `create_ticket` — abre ticket de suporte.
- `log_interaction` — registra interação (reunião/e-mail/qbr…).
- `register_negotiation` — registra negociação (venda inicial/renovação).

> **Não há** tools de usuários, perfis, configuração/admin nem exclusões (por design).

## Notas

- Os lançamentos feitos pelo agente são atribuídos a um usuário real configurado no servidor (pode ser sobrescrito por `acting_user_id` na chamada das tools de escrita).
- Para **rotacionar o token**: definir `MCP_API_TOKEN` no Vercel (sobrescreve o embutido) e atualizar este guia.
- Dúvidas / problemas: falar com o Vinicius (admin do CS-Continuum). Doc técnica completa: [docs/product/13-mcp.md](product/13-mcp.md).
