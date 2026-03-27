import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { storeEmbeddings } from '@/lib/supabase/vector-search'

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

type RawTicket = {
  account_name?: string
  title: string
  description: string
  status: string
  priority: string
  category?: string
  opened_at: string
  resolved_at?: string
  external_ticket_id?: string
}

function parseCSV(content: string): RawTicket[] {
  const lines = content.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))
  const tickets: RawTicket[] = []

  for (let i = 1; i < lines.length; i++) {
    // Suporte a campos com vírgula entre aspas
    const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) ?? lines[i].split(',')
    const clean = values.map((v) => v.trim().replace(/^"|"$/g, ''))

    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => { obj[h] = clean[idx] ?? '' })

    const today = new Date().toISOString().slice(0, 10)
    tickets.push({
      account_name: obj['account_name'] || obj['conta'] || obj['account'] || undefined,
      title: obj['title'] || obj['titulo'] || obj['título'] || 'Sem título',
      description: obj['description'] || obj['descricao'] || obj['descrição'] || obj['desc'] || '',
      status: obj['status'] || 'open',
      priority: obj['priority'] || obj['prioridade'] || 'medium',
      category: obj['category'] || obj['categoria'] || undefined,
      opened_at: obj['opened_at'] || obj['data_abertura'] || obj['created_at'] || today,
      resolved_at: obj['resolved_at'] || obj['data_resolucao'] || undefined,
      external_ticket_id: obj['external_ticket_id'] || obj['id_externo'] || obj['ticket_id'] || undefined,
    })
  }

  return tickets
}

function parseText(content: string): RawTicket[] {
  const blocks = content.trim().split(/\n\s*\n/).filter(Boolean)
  const today = new Date().toISOString().slice(0, 10)

  return blocks.map((block) => {
    const lines = block.trim().split('\n')
    const fields: Record<string, string> = {}

    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/)
      if (match) {
        const key = match[1].trim().toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        fields[key] = match[2].trim()
      }
    }

    return {
      account_name: fields['conta'] || fields['account'] || fields['account_name'] || undefined,
      title: fields['titulo'] || fields['title'] || lines[0].slice(0, 120),
      description: fields['descricao'] || fields['description'] || fields['desc'] || block.slice(0, 500),
      status: fields['status'] || 'open',
      priority: fields['prioridade'] || fields['priority'] || 'medium',
      category: fields['categoria'] || fields['category'] || undefined,
      opened_at: fields['data'] || fields['opened_at'] || fields['created_at'] || today,
      resolved_at: fields['resolved_at'] || fields['data_resolucao'] || undefined,
      external_ticket_id: fields['id'] || fields['ticket_id'] || fields['external_id'] || undefined,
    }
  })
}

function normalizeStatus(v: string): 'open' | 'in-progress' | 'resolved' | 'closed' {
  const map: Record<string, 'open' | 'in-progress' | 'resolved' | 'closed'> = {
    open: 'open', aberto: 'open', new: 'open',
    'in-progress': 'in-progress', 'em andamento': 'in-progress', progress: 'in-progress',
    resolved: 'resolved', resolvido: 'resolved', done: 'resolved',
    closed: 'closed', fechado: 'closed',
  }
  return map[v.toLowerCase()] ?? 'open'
}

function normalizePriority(v: string): 'low' | 'medium' | 'high' | 'critical' {
  const map: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    low: 'low', baixa: 'low', baixo: 'low',
    medium: 'medium', media: 'medium', medio: 'medium', normal: 'medium',
    high: 'high', alta: 'high', alto: 'high',
    critical: 'critical', critico: 'critical', critica: 'critical', urgente: 'critical',
  }
  return map[v.toLowerCase()] ?? 'medium'
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

const BodySchema = z.object({
  format: z.enum(['csv', 'text']),
  content: z.string().min(10),
  account_id: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const rawTickets = parsed.data.format === 'csv'
    ? parseCSV(parsed.data.content)
    : parseText(parsed.data.content)

  if (rawTickets.length === 0) {
    return NextResponse.json({ error: 'Nenhum ticket detectado no conteúdo enviado' }, { status: 422 })
  }

  // Carrega todas as contas do CSM para resolver nomes
  const { data: allAccounts } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('csm_owner_id', user.id)

  const accountMap = new Map<string, string>()
  for (const a of allAccounts ?? []) {
    accountMap.set(a.name.toLowerCase(), a.id)
  }

  const adminClient = getSupabaseAdminClient()
  const results = { created: 0, errors: [] as string[] }

  for (const raw of rawTickets) {
    // Resolve account_id
    let accountId = parsed.data.account_id ?? null
    if (!accountId && raw.account_name) {
      const key = raw.account_name.toLowerCase()
      // Busca exata ou parcial
      for (const [name, id] of Array.from(accountMap.entries())) {
        if (name.includes(key) || key.includes(name)) {
          accountId = id
          break
        }
      }
    }

    if (!accountId) {
      results.errors.push(`Ticket "${raw.title}" — conta não identificada`)
      continue
    }

    // Normaliza date (tenta múltiplos formatos)
    let openedAt = raw.opened_at
    if (!/^\d{4}-\d{2}-\d{2}$/.test(openedAt)) {
      openedAt = new Date().toISOString().slice(0, 10)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ticket, error } = await (adminClient as any)
      .from('support_tickets')
      .insert({
        account_id: accountId,
        title: raw.title.slice(0, 255),
        description: raw.description || raw.title,
        status: normalizeStatus(raw.status),
        priority: normalizePriority(raw.priority),
        category: raw.category ?? null,
        opened_at: openedAt,
        resolved_at: raw.resolved_at && /^\d{4}-\d{2}-\d{2}$/.test(raw.resolved_at)
          ? raw.resolved_at
          : null,
        external_ticket_id: raw.external_ticket_id ?? null,
        source: 'csv',
      })
      .select('id')
      .single()

    if (error || !ticket) {
      results.errors.push(`Ticket "${raw.title}" — ${(error as any)?.message ?? 'erro desconhecido'}`)
      continue
    }

    // Vectoriza o ticket
    try {
      const textToEmbed = `${raw.title}\n\n${raw.description}`
      await storeEmbeddings(accountId, 'support_ticket', (ticket as any).id, textToEmbed)
    } catch {
      // Vectorização não é bloqueante — ticket já foi salvo
    }

    results.created++
  }

  return NextResponse.json(results, { status: results.created > 0 ? 201 : 422 })
}
