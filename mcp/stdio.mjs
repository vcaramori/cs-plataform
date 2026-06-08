#!/usr/bin/env node
/**
 * MCP da ferramenta — transporte stdio (ponte fina).
 *
 * Encaminha mensagens JSON-RPC (newline-delimited) do agente para o endpoint HTTP
 * /api/mcp (mesma implementação/registry — uma fonte da verdade). Não importa o
 * grafo de libs do app: zero acoplamento com o build do Next.
 *
 * Config (env / .env):
 *   MCP_HTTP_URL    URL do endpoint (default http://localhost:3000/api/mcp)
 *   MCP_API_TOKEN   token Bearer (mesmo do servidor HTTP)
 *
 * Uso (ex.: Claude Code .mcp.json):
 *   { "command": "node", "args": ["mcp/stdio.mjs"], "env": { "MCP_HTTP_URL": "...", "MCP_API_TOKEN": "..." } }
 */
import 'dotenv/config'
import readline from 'node:readline'

const URL_ = process.env.MCP_HTTP_URL || 'http://localhost:3000/api/mcp'
const TOKEN = process.env.MCP_API_TOKEN || ''

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n')
}

async function forward(message) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(message),
  })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { jsonrpc: '2.0', id: message.id, error: { code: -32000, message: `Resposta inválida do servidor (HTTP ${res.status}): ${text.slice(0, 200)}` } }
  }
}

const rl = readline.createInterface({ input: process.stdin })

rl.on('line', async (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  let msg
  try {
    msg = JSON.parse(trimmed)
  } catch {
    return // linha não-JSON: ignora
  }
  // Notificações (sem id) não exigem resposta
  if (msg.id === undefined || msg.id === null) return
  try {
    const out = await forward(msg)
    send(out)
  } catch (err) {
    send({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: `Falha ao contatar o MCP HTTP: ${err?.message ?? 'erro'}` } })
  }
})

process.stderr.write(`[mcp:stdio] pronto — encaminhando para ${URL_}\n`)
