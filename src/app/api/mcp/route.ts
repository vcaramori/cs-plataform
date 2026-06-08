import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { listToolsForMcp, callMcpTool } from '@/lib/mcp/registry'

/**
 * MCP da ferramenta — transporte HTTP (JSON-RPC 2.0, "Streamable HTTP" sem SSE).
 * Métodos: initialize, tools/list, tools/call, ping.
 * Auth: header `Authorization: Bearer <MCP_API_TOKEN>` (service-role por trás).
 */

const PROTOCOL_VERSION = '2024-11-05'

// Token padrão embutido (módulo SERVER-ONLY — nunca vai para o bundle do navegador),
// para a produção subir funcional sem configurar env no Vercel. Sobrescrevível por
// MCP_API_TOKEN (recomendado rotacionar por lá). NÃO usar em repositório público.
const DEFAULT_MCP_TOKEN = '5d36610a4828a07400456d74abd89e3202bb09d0002c0025a4fd4a2c8a4f2a9f'
const MCP_TOKEN = () => env.mcp.token || DEFAULT_MCP_TOKEN

function rpcResult(id: any, result: any) {
  return { jsonrpc: '2.0', id, result }
}
function rpcError(id: any, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

function authorized(req: Request): boolean {
  const expected = MCP_TOKEN()
  if (!expected) return false // sem token configurado → nega tudo
  const h = req.headers.get('authorization') || ''
  const token = h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : h.trim()
  return token === expected
}

async function handleRpc(msg: any): Promise<any | null> {
  const { id, method, params } = msg ?? {}
  // Notificações (sem id) não exigem resposta
  if (id === undefined || id === null) {
    return null
  }
  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'csplataform', version: '1.0.0' },
      })
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, { tools: listToolsForMcp() })
    case 'tools/call': {
      const name = params?.name
      const args = params?.arguments ?? {}
      if (!name) return rpcError(id, -32602, 'params.name é obrigatório')
      try {
        const out = await callMcpTool(String(name), args)
        const text = typeof out === 'string' ? out : JSON.stringify(out, null, 2)
        return rpcResult(id, { content: [{ type: 'text', text }] })
      } catch (err: any) {
        // Erros de tool viram content isError (padrão MCP), não erro de protocolo
        return rpcResult(id, { content: [{ type: 'text', text: `Erro: ${err?.message ?? 'desconhecido'}` }], isError: true })
      }
    }
    default:
      return rpcError(id, -32601, `Método não suportado: ${method}`)
  }
}

export async function POST(request: Request) {
  if (!env.mcp.enabled) {
    return NextResponse.json(rpcError(null, -32000, 'MCP desativado'), { status: 404 })
  }
  if (!authorized(request)) {
    return NextResponse.json(rpcError(null, -32001, 'Não autorizado'), { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(rpcError(null, -32700, 'JSON inválido'), { status: 400 })
  }

  // Suporta requisição única ou batch
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handleRpc))).filter((r) => r !== null)
    return NextResponse.json(out)
  }
  const res = await handleRpc(body)
  return NextResponse.json(res ?? {}, { status: res ? 200 : 202 })
}

// GET simples para health/descoberta (sem dados sensíveis).
export async function GET() {
  return NextResponse.json({
    server: 'csplataform-mcp',
    transport: 'http-jsonrpc',
    enabled: env.mcp.enabled,
    tools: MCP_TOKEN() ? listToolsForMcp().map((t) => t.name) : [],
    hint: 'POST JSON-RPC (initialize|tools/list|tools/call) com Authorization: Bearer <MCP_API_TOKEN>.',
  })
}
