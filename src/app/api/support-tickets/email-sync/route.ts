import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { generateText } from '@/lib/llm/gateway'
import { enrichTicketWithSLA, logSLAEvent, buildResolutionSLAFreeze, openTicket, reopenTicket, createFromClosed } from '@/lib/support/lifecycle'
import { classifyIntent } from '@/lib/support/intent-classifier'
import { fetchAndParseEmails } from '@/lib/support/imap-sync'
import { sendTicketAcknowledgment } from '@/lib/support/email-sender'

const POWER_AUTOMATE_URL = 'https://defaultf3eedc7b7dd742b3a805865afbe2da.b7.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/051bab82e2a54ff19f3559914040a96f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=zhoFnRlXIstaSSJ_JoO0pvvxZSLU7dVXDXw7t7iZ9f4'

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient()
  const adminClient = getSupabaseAdminClient()
  
  // 1. Autenticação Flexível (Usuário ou Loop Daemon/Cron via API_SECRET)
  const authHeader = req.headers.get('Authorization')
  const apiSecret = process.env.API_SECRET
  
  let user: any = null
  let isCron = false

  if (authHeader && apiSecret && authHeader === `Bearer ${apiSecret}`) {
    isCron = true
    // Buscar o primeiro perfil administrativo como contexto padrão
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (profiles && profiles.length > 0) {
      user = { id: profiles[0].id, email: 'cron@plannera.com.br' }
    }
  } else {
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 2. Carregar configurações do e-mail do Banco de Dados
    const { data: dbSettingsRow } = await (adminClient as any)
      .from('app_settings')
      .select('value')
      .eq('key', 'support_email_integration')
      .single()

    const emailSettings = dbSettingsRow?.value || {}
    const imapFolder = emailSettings.imap_folder || 'Helpdesk'
    const imapUser = emailSettings.imap_user || 'suporte@plannera.com.br'

    // 3. Disparar Sincronização IMAP Nativa
    console.log(`[EmailSync] Buscando e-mails via IMAP na pasta: ${imapFolder}...`)
    
    let emails = []
    try {
      emails = await fetchAndParseEmails(emailSettings)
    } catch (e: any) {
      console.error('[EmailSync] Erro no IMAP:', e)
      return NextResponse.json({ 
        error: 'Erro ao conectar via IMAP',
        details: e.message
      }, { status: 502 })
    }

    if (emails.length === 0) {
      return NextResponse.json({ message: 'Nenhum e-mail novo encontrado pelo IMAP.', created: 0 })
    }

    console.log(`[EmailSync] ${emails.length} e-mails recebidos. Processando com IA...`)

    // 4. Preparar conteúdo para a IA
    const contentToProcess = emails.map((email: any, idx: number) => {
      const subject = email.subject || 'Sem Assunto';
      const body = email.body || '';
      const from = email.from || 'Desconhecido';
      const date = email.date || '';
      
      return `EMAIL #${idx + 1}\nDE: ${from}\nDATA: ${date}\nASSUNTO: ${subject}\nCONTEÚDO:\n${body.substring(0, 3000)}\n----------------------------------`
    }).join('\n\n')

    const prompt = `
Você é um assistente especializado em extrair tickets de suporte a partir de e-mails.

Abaixo está uma lista de e-mails capturados. Sua tarefa:
1. Identificar chamados/problemas de cliente REAIS nos textos.
2. Para cada chamado, extraia:
   - email_index: o número do e-mail de origem correspondente (ex: 1 para o EMAIL #1, 2 para o EMAIL #2, etc. Este campo é numérico e obrigatório).
   - external_ticket_id: o código alfanumérico do ticket (ex: "81DYA3", "K136AZ") encontrado no assunto ou no início do corpo. Se não encontrar, gere null.
   - title: título claro e conciso.
   - sender_email: o e-mail original do remetente (se for um e-mail redirecionado/forward como notify@helpdesk.com, procure no corpo da mensagem quem enviou ou a assinatura).
   - message_content: o corpo principal desta mensagem específica (remova assinaturas e notas de sistema).
   - status: "open", "in-progress", "resolved", "closed" (deduza pelo tom da mensagem).
   - priority: "low", "medium", "high", "critical".
   - category: categoria (ex: "acesso", "bug", "financeiro", "duvida").
   - account_name: nome do cliente/empresa sugerido (Analise o domínio do e-mail original, assinaturas ou menções no corpo da mensagem para deduzir a qual empresa o usuário pertence).
   - opened_at: data no formato YYYY-MM-DD.

Retorne APENAS um JSON array.
DICA IMPORTANTE: Certifique-se de escapar corretamente todas as aspas duplas (\") e quebras de linha (\n) dentro das propriedades para que o JSON retornado seja estritamente válido. Não use blocos de reflexão ou textos fora do JSON.

E-Mails:
"""
${contentToProcess.substring(0, 25000)}
"""
`

    const { result: rawJson } = await generateText(prompt, { allowFallback: true, disableThinking: true })
    
    let tickets;
    try {
      const jsonStr = rawJson
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      tickets = JSON.parse(jsonStr)
    } catch (e) {
      console.error('[EmailSync] Falha ao parsear JSON da IA. Output da IA:', rawJson);
      return NextResponse.json({ 
        error: 'A IA gerou uma resposta malformada.',
        details: e instanceof Error ? e.message : String(e)
      }, { status: 502 });
    }

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json({ message: 'A IA não identificou chamados válidos nos e-mails.', created: 0 })
    }

    // 5. Persistência Híbrida
    const { data: allAccounts } = await adminClient.from('accounts').select('id, name, company_name, website')
    const normalize = (s: string | null | undefined) => {
      if (!s) return ''
      return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    }
    const extractDomain = (str: string | null | undefined) => {
      if (!str) return ''
      return str.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].split('@').pop()?.toLowerCase() || ''
    }
    
    const accountMap = new Map<string, string>()
    const domainMap = new Map<string, string>()
    for (const a of allAccounts ?? []) { 
      if (a.name) accountMap.set(normalize(a.name), a.id) 
      if (a.company_name) accountMap.set(normalize(a.company_name), a.id)
      if (a.website) {
        const domain = extractDomain(a.website)
        if (domain) domainMap.set(domain, a.id)
      }
    }

    let created = 0
    let updated = 0
    let vectorized = 0
    const errors: string[] = []
    const today = new Date().toISOString().slice(0, 10)

    for (const t of tickets) {
      // 5.1 Identificar Conta
      let finalAccountId = null
      
      // Tentativa 1: Match exato pelo domínio do e-mail do remetente
      if (t.sender_email) {
        const senderDomain = extractDomain(t.sender_email)
        if (senderDomain && domainMap.has(senderDomain)) {
          finalAccountId = domainMap.get(senderDomain) || null
        }
      }

      // Tentativa 2: Match fuzzy pelo nome da empresa extraído pela IA
      if (!finalAccountId && t.account_name) {
        const key = normalize(t.account_name)
        for (const [name, id] of Array.from(accountMap.entries())) {
          if (name.includes(key) || key.includes(name)) {
            finalAccountId = id
            break
          }
        }
      }

      if (!finalAccountId) {
        errors.push(`Chamado "${t.title}" ignorado - conta não identificada.`)
        continue
      }

      // 5.2 Identificar correspondência com o e-mail de origem (alta fidelidade para imagens)
      const origEmailIdx = typeof t.email_index === 'number' ? t.email_index - 1 : -1
      const origEmail = (origEmailIdx >= 0 && origEmailIdx < emails.length) ? emails[origEmailIdx] : null
      const originalEmailBody = origEmail ? origEmail.body : (t.message_content || t.title)

      const sender = t.sender_email || ''
      const isAgentReply = sender.toLowerCase().includes('suporte@plannera.com.br') || 
                           sender.toLowerCase().includes(imapUser.toLowerCase())

      // 5.3 Verificar se Ticket já existe (pelo external_ticket_id)
      const { data: existingTicket } = t.external_ticket_id 
        ? await adminClient.from('support_tickets').select('*').eq('external_ticket_id', t.external_ticket_id).single()
        : { data: null }

      const newMessage = `\n\n--- Atualização em ${today} ---\n${originalEmailBody}`
      const isFinishing = t.status === 'resolved' || t.status === 'closed'

      if (existingTicket) {
        const updatedThread = (existingTicket.thread_content || existingTicket.description || '') + newMessage

        if (isAgentReply) {
          // REGRA DE NEGÓCIO: Se for resposta do agente, insere na tabela support_ticket_messages e atualiza sem reabrir
          const { error: msgErr } = await adminClient
            .from('support_ticket_messages')
            .insert({
              ticket_id: existingTicket.id,
              author_id: existingTicket.assigned_to || user.id,
              author_email: sender,
              type: 'reply',
              body: originalEmailBody,
              created_at: new Date().toISOString()
            })

          if (msgErr) {
            console.error(`[EmailSync] Erro ao salvar mensagem do agente:`, msgErr)
          }

          let updates: any = {
            thread_content: updatedThread,
            status: t.status || existingTicket.status,
            priority: t.priority || existingTicket.priority
          }

          if (isFinishing && existingTicket.status !== 'resolved' && existingTicket.status !== 'closed') {
            updates = { ...updates, ...buildResolutionSLAFreeze(existingTicket) }
          }

          const { error: updateErr } = await adminClient
            .from('support_tickets')
            .update(updates)
            .eq('id', existingTicket.id)

          if (!updateErr) {
            updated++
            if (isFinishing && existingTicket.status !== 'resolved' && existingTicket.status !== 'closed') {
              logSLAEvent(existingTicket.id, 'ticket_resolved', { source: 'email_sync' }).catch(console.error)
            }
          }
          continue // Concluído o fluxo de agente
        }

        // Se for resposta do cliente em ticket FECHADO: cria ticket filho
        if (existingTicket.status === 'closed') {
          const intent = await classifyIntent(existingTicket.title, existingTicket.description || '', originalEmailBody)
          if (intent === 'new_issue' || intent === 'follow_up') {
            await createFromClosed(existingTicket.id, {
              account_id: finalAccountId,
              title: `[Reabertura] ${existingTicket.title}`,
              description: originalEmailBody,
              thread_content: originalEmailBody,
              status: 'open',
              priority: existingTicket.priority,
              external_priority_label: existingTicket.internal_level,
              category: existingTicket.category,
              opened_at: today,
              source: 'email',
              is_vectorized: false
            })
            created++
          }
          continue
        }

        // Se for resposta do cliente em ticket RESOLVIDO: reabre se necessário e insere a mensagem
        if (existingTicket.status === 'resolved') {
          const intent = await classifyIntent(existingTicket.title, existingTicket.description || '', originalEmailBody)
          if (intent === 'new_issue' || intent === 'follow_up') {
            await reopenTicket(existingTicket.id)
            await adminClient.from('support_tickets').update({ thread_content: updatedThread }).eq('id', existingTicket.id)
            
            // Inserir resposta do cliente nas mensagens para o histórico unificado
            await adminClient
              .from('support_ticket_messages')
              .insert({
                ticket_id: existingTicket.id,
                author_id: user.id,
                author_email: sender,
                type: 'reply',
                body: originalEmailBody,
                created_at: new Date().toISOString()
              })

            updated++
          }
          continue
        }

        // Resposta comum do cliente em ticket aberto
        let updates: any = {
          thread_content: updatedThread,
          status: t.status || existingTicket.status,
          priority: t.priority || existingTicket.priority,
        }

        if (isFinishing && existingTicket.status !== 'resolved' && existingTicket.status !== 'closed') {
          updates = { ...updates, ...buildResolutionSLAFreeze(existingTicket) }
        }

        const { error: updateErr } = await adminClient
          .from('support_tickets')
          .update(updates)
          .eq('id', existingTicket.id)

        if (!updateErr) {
          // Inserir resposta do cliente nas mensagens para o histórico unificado
          const { error: msgErr } = await adminClient
            .from('support_ticket_messages')
            .insert({
              ticket_id: existingTicket.id,
              author_id: user.id,
              author_email: sender,
              type: 'reply',
              body: originalEmailBody,
              created_at: new Date().toISOString()
            })

          if (msgErr) {
            console.error(`[EmailSync] Erro ao salvar mensagem do cliente em ticket aberto:`, msgErr)
          }

          updated++
          if (isFinishing && existingTicket.status !== 'resolved' && existingTicket.status !== 'closed') {
             logSLAEvent(existingTicket.id, 'ticket_resolved', { source: 'email_sync' }).catch(console.error)
          }
          if (isFinishing && !existingTicket.is_vectorized) {
            try {
              await storeEmbeddings(finalAccountId, 'support_ticket', existingTicket.id, updatedThread)
              await adminClient.from('support_tickets').update({ is_vectorized: true }).eq('id', existingTicket.id)
              vectorized++
            } catch (vErr) { console.error('Erro na vetorização adiada:', vErr) }
          }
        }
      } else {
        // Criar Novo Ticket
        if (isAgentReply) {
          // Não cria novos tickets se for uma resposta órfã de agente
          console.log(`[EmailSync] Ignorando e-mail de agente sem ticket correspondente: ${t.title}`)
          continue
        }

        // Garantir que existe um external_ticket_id
        let finalExternalId = t.external_ticket_id
        
        const enrichedPayload = await enrichTicketWithSLA({
          account_id: finalAccountId,
          external_ticket_id: finalExternalId,
          title: t.title.slice(0, 255),
          description: originalEmailBody,
          thread_content: originalEmailBody,
          status: t.status || 'open',
          priority: t.priority || 'medium',
          external_priority_label: t.priority || 'medium',
          category: t.category || null,
          opened_at: t.opened_at || today,
          source: 'email',
          is_vectorized: false
        })

        if (isFinishing && enrichedPayload.sla_policy_id) {
           Object.assign(enrichedPayload, buildResolutionSLAFreeze(enrichedPayload))
        }

        const { data: newTicket, error: insertErr } = await adminClient
          .from('support_tickets')
          .insert(enrichedPayload)
          .select('id, internal_level')
          .single()

        if (!insertErr && newTicket) {
          created++
          
          // Se a IA não trouxe um external ID, geramos um curto com base no UUID e salvamos
          if (!finalExternalId) {
            finalExternalId = newTicket.id.split('-')[0].toUpperCase()
            await adminClient.from('support_tickets').update({ external_ticket_id: finalExternalId }).eq('id', newTicket.id)
          }

          // Disparar Auto-Resposta
          if (sender) {
            sendTicketAcknowledgment(
              { id: newTicket.id, external_ticket_id: finalExternalId, title: t.title },
              emailSettings,
              sender,
              t.title
            )
          }

          openTicket(newTicket.id).catch(console.error)
          if (isFinishing) {
             logSLAEvent(newTicket.id, 'ticket_resolved', { source: 'email_sync' }).catch(console.error)
          }
          if (isFinishing) {
             try {
                await storeEmbeddings(finalAccountId, 'support_ticket', newTicket.id, originalEmailBody)
                await adminClient.from('support_tickets').update({ is_vectorized: true }).eq('id', newTicket.id)
                vectorized++
             } catch {}
          }
        }
      }
    }

    return NextResponse.json({ 
      message: `Sincronização concluída. ${created} criados, ${updated} atualizados, ${vectorized} vetorizados.`, 
      created, 
      updated,
      vectorized,
      errors 
    })

  } catch (err: any) {
    console.error('[EmailSync] Fatal Error:', err)
    return NextResponse.json({ 
      error: 'Erro interno ao processar sincronização.',
      message: err.message,
      stack: err.stack,
      type: err.name
    }, { status: 500 })
  }
}
