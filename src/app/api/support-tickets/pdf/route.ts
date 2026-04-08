import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { generateText } from '@/lib/llm/gateway'

// workaround for CJS/ESM interop in TS
const pdfParse = require('pdf-parse')

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const accountId = formData.get('account_id') as string

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Parse PDF
    const pdfData = await pdfParse(buffer)
    const textContent = pdfData.text

    if (!textContent || textContent.trim() === '') {
      return NextResponse.json({ error: 'O PDF enviado não contém texto legível (pode ser uma imagem escaneada sem OCR).' }, { status: 400 })
    }

    // Call Gemini to parse
    const prompt = `
      Você é um assistente de extração de dados especializado em transformar conversas, e-mails ou relatórios de clientes em tickets de suporte estruturados.

      Leia o texto abaixo, que foi extraído de um PDF, e extraia os seguintes dados no estrito formato JSON.
      Retorne um array contendo os tickets encontrados (mesmo que haja só 1). Se o texto abordar vários problemas diferentes, tente dividi-los em tickets separados.

      Lembre-se das restrições de schema:
      - status: deve ser EXATAMENTE um dos seguintes: "open", "in-progress", "resolved", "closed". Default para "open".
      - priority: deve ser EXATAMENTE um dos seguintes: "low", "medium", "high", "critical". Escolha com sabedoria.
      - category: defina em 1 palavra curta (ex: "financeiro", "dúvida", "bug", "acesso").
      - title: Resumo claro do problema.
      - description: Detalhamento do problema baseado no texto original.
      - account_name: Nome do cliente se ele se identificar (opcional).

      Retorne APENAS um JSON array de objetos. Exemplo:
      [
        { "title": "Erro ao logar", "description": "Cliente reporta que a senha de reset não chega", "status": "open", "priority": "high", "category": "acesso", "account_name": "Acme Corp" }
      ]

      Texto extraído do PDF:
      """
      ${textContent.substring(0, 15000)}
      """
    `

    const { result: rawJson } = await generateText(prompt, { allowFallback: true })
    let jsonStr = rawJson
    
    // Remove markdown code blocks se o Gemini inseri-los
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim()
    
    const tickets = JSON.parse(jsonStr)

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json({ error: 'A IA não conseguiu identificar nenhum chamado no texto.' }, { status: 400 })
    }

    // Processar e salvar no banco
    let created = 0
    const errors: string[] = []

    for (const t of tickets) {
      let finalAccountId = accountId

      // Se não veio accountId da tela mas a IA achou um nome, tentar localizar a conta
      if (!finalAccountId && t.account_name) {
        const { data: accMatch } = await supabase
          .from('accounts')
          .select('id')
          .ilike('name', `%${t.account_name}%`)
          .limit(1)
          .single()
        
        if (accMatch) {
          finalAccountId = accMatch.id
        }
      }

      // Se ainda não temos conta
      if (!finalAccountId || finalAccountId === 'all') {
        errors.push(`Chamado '${t.title}' descartado pois não foi possível identificar qual a Conta (Cliente). Selecione uma conta padrão na tela.`)
        continue
      }

      const { error: insertErr } = await supabase
        .from('support_tickets')
        .insert({
          account_id: finalAccountId,
          title: t.title,
          description: t.description,
          status: t.status || 'open',
          priority: t.priority || 'medium',
          category: t.category,
          opened_at: new Date().toISOString().split('T')[0],
          source: 'manual',
        })

      if (insertErr) {
        errors.push(`Erro ao criar '${t.title}': ${insertErr.message}`)
      } else {
        created++
        // Vectoriza o ticket para o RAG
        try {
          const { data: newTicket } = await supabase
            .from('support_tickets')
            .select('id')
            .eq('title', t.title)
            .eq('account_id', finalAccountId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (newTicket) {
            const textToEmbed = `${t.title}\n\n${t.description}`
            await storeEmbeddings(finalAccountId, 'support_ticket', newTicket.id, textToEmbed)
          }
        } catch (err) {
          console.error('Erro na vetorização pós-PDF:', err)
        }
      }
    }

    return NextResponse.json({ created, errors })

  } catch (err: any) {
    console.error('PDF Ingest Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
