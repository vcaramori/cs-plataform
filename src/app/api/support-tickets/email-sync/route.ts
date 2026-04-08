import { NextResponse } from 'next/server'
// import { getSupabaseServerClient } from '@/lib/supabase/server'
// import { storeEmbeddings } from '@/lib/supabase/vector-search'
// import imaps from 'imap-simple'
// import { simpleParser } from 'mailparser'
// import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Lógica de Sincronização IMAP (Pausada temporariamente)
 * Para reativar: 
 * 1. Descomente os imports acima
 * 2. Descomente o bloco de código dentro da função POST
 * 3. Configure as credenciais IMAP no .env
 */

export async function POST(req: Request) {
  /*
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ 
    model: process.env.GEMINI_FLASH_MODEL || 'gemini-2.0-flash', 
    generationConfig: { responseMimeType: 'application/json' } 
  })

  const supabase = await getSupabaseServerClient()
  
  // Autenticação híbrida: Sessão de usuário OU Segredo de API (para automação)
  const authHeader = req.headers.get('Authorization')
  const apiSecret = process.env.API_SECRET
  const isAutomated = apiSecret && authHeader === `Bearer ${apiSecret}`

  let user = null
  if (!isAutomated) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD || !process.env.IMAP_HOST) {
    return NextResponse.json({ error: 'Configuração de IMAP incompleta no arquivo .env' }, { status: 500 })
  }

  const imapFolder = process.env.IMAP_FOLDER || 'Helpdesk'
  const config = {
    imap: {
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST,
      port: Number(process.env.IMAP_PORT) || 993,
      tls: process.env.IMAP_TLS !== 'false',
      authTimeout: 10000
    }
  }

  try {
    const connection = await imaps.connect(config)
    await connection.openBox(imapFolder)
    const searchCriteria = ['UNSEEN']
    const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true }
    const messages = await connection.search(searchCriteria, fetchOptions)
    
    if (messages.length === 0) {
      connection.end()
      return NextResponse.json({ message: `Nenhum e-mail novo na pasta '${imapFolder}'.`, created: 0 })
    }

    let created = 0
    for (const item of messages) {
       // ... lógica de processamento e AI ...
       // (Mantida em histórico para restauração total se necessário)
    }

    connection.end()
    return NextResponse.json({ message: 'Sincronização concluída.', processed: created })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
  */

  return NextResponse.json({ 
    message: 'Integração via e-mail (IMAP) pausada. Use a importação via CSV ou Texto Livre na aba ao lado.', 
    created: 0, 
    errors: [] 
  })
}
