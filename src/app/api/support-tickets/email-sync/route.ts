import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { generateText } from '@/lib/llm/gateway'
import { enrichTicketWithSLA, logSLAEvent, buildResolutionSLAFreeze, openTicket, reopenTicket, createFromClosed } from '@/lib/support/lifecycle'
import { classifyIntent } from '@/lib/support/intent-classifier'

const POWER_AUTOMATE_URL = 'https://defaultf3eedc7b7dd742b3a805865afbe2da.b7.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/051bab82e2a54ff19f3559914040a96f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=zhoFnRlXIstaSSJ_JoO0pvvxZSLU7dVXDXw7t7iZ9f4'

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. Disparar o Power Automate
    console.log('[EmailSync] Disparando Power Automate...')
    const paResponse = await fetch(POWER_AUTOMATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'manual_sync', user_id: user.id })
    })

    if (!paResponse.ok) {
      const errorText = await paResponse.text()
      console.error('[EmailSync] Erro no Power Automate. Status:', paResponse.status, 'Body:', errorText)
      return NextResponse.json({ 
        error: 'Erro ao conectar com Power Automate',
        pa_status: paResponse.status,
        pa_error: errorText.substring(0, 200)
      }, { status: 502 })
    }

    let rawEmails;
    const responseText = await paResponse.text();
    
    try {
      rawEmails = JSON.parse(responseText);
    } catch (e) {
      console.error('[EmailSync] Falha ao parsear JSON do Power Automate. Recebido:', responseText);
      return NextResponse.json({ 
        error: 'O Power Automate retornou um formato inválido (não é um JSON). Verifique se o bloco "Response" no seu fluxo está enviando o "value" do passo anterior.',
        received: responseText.substring(0, 100)
      }, { status: 502 });
    }
    
    // O Power Automate 'Get emails (V3)' retorna um objeto { value: [...] }
    const emails = Array.isArray(rawEmails) ? rawEmails : (rawEmails.value || []);
    
    // Se não vier um array, assume retorno vazio ou erro
    if (emails.length === 0) {
      return NextResponse.json({ message: 'Nenhum e-mail novo encontrado pelo Power Automate.', created: 0 })
    }

    console.log(`[EmailSync] ${emails.length} e-mails recebidos. Processando com IA...`)

    // 2. Preparar conteúdo para a IA
    // Usamos bodyPreview para evitar o ruído do HTML pesado e garantir que caiba no contexto
    const contentToProcess = emails.map((email: any, idx: number) => {
      const subject = email.subject || email.Subject || 'Sem Assunto';
      const body = email.bodyPreview || email.BodyPreview || email.body || email.Body || '';
      const from = email.from || email.From || 'Desconhecido';
      const date = email.receivedDateTime || email.DateTimeReceived || '';
      
      return `EMAIL #${idx + 1}\nDE: ${from}\nDATA: ${date}\nASSUNTO: ${subject}\nCONTEÚDO:\n${body.substring(0, 2000)}\n----------------------------------`
    }).join('\n\n')

    const prompt = `
Você é um assistente especializado em extrair tickets de suporte a partir de e-mails.

Abaixo está uma lista de e-mails capturados. Sua tarefa:
1. Identificar chamados/problemas de cliente REAIS nos textos.
2. Para cada chamado, extraia:
   - external_ticket_id: o código alfanumérico do ticket (ex: "81DYA3", "K136AZ") encontrado no assunto ou no início do corpo. Se não encontrar, gere null.
   - title: título claro e conciso.
   - message_content: o corpo principal desta mensagem específica (remova assinaturas e notas de sistema).
   - status: "open", "in-progress", "resolved", "closed" (deduza pelo tom da mensagem).
   - priority: "low", "medium", "high", "critical".
   - category: categoria (ex: "acesso", "bug", "financeiro", "duvida").
   - account_name: nome do cliente/empresa sugerido.
   - opened_at: data no formato YYYY-MM-DD.

Retorne APENAS um JSON array.

E-Mails:
"""
${contentToProcess.substring(0, 25000)}
"""
`

    const { result: rawJson } = await generateText(prompt, { allowFallback: true })
    
    let tickets;
    try {
      const jsonStr = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()
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

    // 3. Persistência Híbrida (Relacional Crescente + Vetorização Adiada)
    const { data: allAccounts } = await supabase.from('accounts').select('id, name').eq('csm_owner_id', user.id)
    const normalize = (s: string | null | undefined) => {
      if (!s) return ''
      return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    }
    const accountMap = new Map<string, string>()
    for (const a of allAccounts ?? []) { accountMap.set(normalize(a.name), a.id) }

    let created = 0
    let updated = 0
    let vectorized = 0
    const errors: string[] = []
    const today = new Date().toISOString().slice(0, 10)

    for (const t of tickets) {
      // 3.1 Identificar Conta
      let finalAccountId = null
      if (t.account_name) {
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

      // 3.2 Verificar se Ticket já existe (pelo external_ticket_id)
      const { data: existingTicket } = t.external_ticket_id 
        ? await supabase.from('support_tickets').select('*').eq('external_ticket_id', t.external_ticket_id).single()
        : { data: null }

      const newMessage = `\n\n--- Atualização em ${today} ---\n${t.message_content || t.title}`
      const isFinishing = t.status === 'resolved' || t.status === 'closed'

      if (existingTicket) {
        // Atualizar Ticket Existente (Append)
        const updatedThread = (existingTicket.thread_content || existingTicket.description || '') + newMessage

        // Se o ticket está fechado, novo reply cria ticket filho
        if (existingTicket.status === 'closed') {
          const intent = await classifyIntent(existingTicket.title, existingTicket.description || '', t.message_content || t.title)
          if (intent === 'new_issue' || intent === 'follow_up') {
            await createFromClosed(existingTicket.id, {
              account_id: finalAccountId,
              title: `[Reabertura] ${existingTicket.title}`,
              description: t.message_content || t.title,
              thread_content: t.message_content || t.title,
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
          // Gratitude on closed ticket: ignore
          continue
        }

        // Se o ticket está resolvido, classificar intenção para reabrir ou ignorar
        if (existingTicket.status === 'resolved') {
          const intent = await classifyIntent(existingTicket.title, existingTicket.description || '', t.message_content || t.title)
          if (intent === 'new_issue' || intent === 'follow_up') {
            await reopenTicket(existingTicket.id)
            await supabase.from('support_tickets').update({ thread_content: updatedThread }).eq('id', existingTicket.id)
            updated++
          }
          // Gratitude on resolved: ignore (auto-close will handle it)
          continue
        }

        let updates: any = {
          thread_content: updatedThread,
          status: t.status || existingTicket.status,
          priority: t.priority || existingTicket.priority,
        }

        // Se está resolvendo/fechando agora e antes não estava, congela o SLA
        if (isFinishing && existingTicket.status !== 'resolved' && existingTicket.status !== 'closed') {
          updates = { ...updates, ...buildResolutionSLAFreeze(existingTicket) }
        }

        const { error: updateErr } = await supabase
          .from('support_tickets')
          .update(updates)
          .eq('id', existingTicket.id)

        if (!updateErr) {
          updated++
          if (isFinishing && existingTicket.status !== 'resolved' && existingTicket.status !== 'closed') {
             logSLAEvent(existingTicket.id, 'ticket_resolved', { source: 'email_sync' }).catch(console.error)
          }
          // Vetorizar apenas se estiver finalizando e ainda não foi vetorizado
          if (isFinishing && !existingTicket.is_vectorized) {
            try {
              await storeEmbeddings(finalAccountId, 'support_ticket', existingTicket.id, updatedThread)
              await supabase.from('support_tickets').update({ is_vectorized: true }).eq('id', existingTicket.id)
              vectorized++
            } catch (vErr) { console.error('Erro na vetorização adiada:', vErr) }
          }
        }
      } else {
        // Criar Novo Ticket
        const enrichedPayload = await enrichTicketWithSLA({
          account_id: finalAccountId,
          external_ticket_id: t.external_ticket_id,
          title: t.title.slice(0, 255),
          description: t.message_content || t.title,
          thread_content: t.message_content || t.title,
          status: t.status || 'open',
          priority: t.priority || 'medium',
          external_priority_label: t.priority || 'medium', // Usa na engine do SLA
          category: t.category || null,
          opened_at: t.opened_at || today,
          source: 'email',
          is_vectorized: false
        })

        // Se o ticket já entra resolvido (ex: e-mail de notificação de fechamento), congela imediato
        if (isFinishing && enrichedPayload.sla_policy_id) {
           Object.assign(enrichedPayload, buildResolutionSLAFreeze(enrichedPayload))
        }

        const { data: newTicket, error: insertErr } = await supabase
          .from('support_tickets')
          .insert(enrichedPayload)
          .select('id, internal_level')
          .single()

        if (!insertErr && newTicket) {
          created++
          openTicket(newTicket.id).catch(console.error)
          if (isFinishing) {
             logSLAEvent(newTicket.id, 'ticket_resolved', { source: 'email_sync' }).catch(console.error)
          }
          // Vetorização imediata apenas se já nasceu resolvido (raro)
          if (isFinishing) {
             try {
                await storeEmbeddings(finalAccountId, 'support_ticket', newTicket.id, t.message_content || t.title)
                await supabase.from('support_tickets').update({ is_vectorized: true }).eq('id', newTicket.id)
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
