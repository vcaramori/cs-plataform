import imaps from 'imap-simple'
import { simpleParser, Attachment } from 'mailparser'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export interface ParsedEmail {
  id: string
  subject: string
  from: string
  date: string
  body: string // Text body with replaced image URLs
  rawHtml?: string
}

export async function fetchAndParseEmails(emailSettings: any): Promise<ParsedEmail[]> {
  const config = {
    imap: {
      user: emailSettings.imap_user,
      password: emailSettings.imap_password,
      host: emailSettings.imap_host,
      port: emailSettings.imap_port,
      tls: true,
      authTimeout: 10000,
      tlsOptions: { rejectUnauthorized: false } // For office365/some providers
    }
  }

  const imapFolder = emailSettings.imap_folder || 'INBOX'

  let connection;
  try {
    connection = await imaps.connect(config)
  } catch (err) {
    console.error('[IMAP] Failed to connect:', err)
    throw new Error('Falha na conexão IMAP. Verifique as credenciais.')
  }

  try {
    await connection.openBox(imapFolder)

    const searchCriteria = ['UNSEEN']
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: true
    }

    const messages = await connection.search(searchCriteria, fetchOptions)
    
    if (!messages || messages.length === 0) {
      connection.end()
      return []
    }

    const adminClient = getSupabaseAdminClient()
    const parsedEmails: ParsedEmail[] = []

    for (const item of messages) {
      const all = item.parts.find((part: any) => part.which === '')
      if (!all || !all.body) continue
      const id = item.attributes.uid

      const idHeader = "Imap-Id: "+id+"\r\n"
      const mail = await simpleParser(idHeader + all.body)

      const subject = mail.subject || 'Sem Assunto'
      const from = mail.from?.value[0]?.address || 'Desconhecido'
      const date = mail.date ? mail.date.toISOString() : new Date().toISOString()
      
      let bodyText = mail.text || mail.html || ''
      let bodyHtml = mail.html || ''

      // Process attachments / inline images
      if (mail.attachments && mail.attachments.length > 0) {
        for (const att of mail.attachments) {
          if (att.content && (att.cid || att.filename)) {
            // Upload to supabase storage
            const fileName = att.filename || `${att.cid}.png`
            const filePath = `email-sync/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
            
            const { error: uploadError } = await adminClient.storage
              .from('ticket-attachments')
              .upload(filePath, att.content, {
                contentType: att.contentType
              })

            if (!uploadError) {
              const { data: { publicUrl } } = adminClient.storage
                .from('ticket-attachments')
                .getPublicUrl(filePath)

              // Replace cid: references in text and html
              if (att.cid) {
                const cidRegex = new RegExp(`cid:${att.cid}`, 'gi')
                bodyText = bodyText.replace(cidRegex, publicUrl)
                bodyHtml = bodyHtml.replace(cidRegex, publicUrl)
              }
              // If it's just an attachment and not inline, we can append a link
              if (!att.cid && bodyText) {
                const isImage = att.contentType.startsWith('image/')
                const mdLink = isImage ? `\n![${fileName}](${publicUrl})` : `\n[📎 Anexo: ${fileName}](${publicUrl})`
                bodyText += `\n${mdLink}`
              }
            } else {
              console.error('[IMAP] Failed to upload attachment:', uploadError)
            }
          }
        }
      }

      parsedEmails.push({
        id: String(id),
        subject,
        from,
        date,
        body: bodyText,
        rawHtml: bodyHtml
      })
    }

    connection.end()
    return parsedEmails

  } catch (err) {
    connection.end()
    console.error('[IMAP] Error fetching/parsing:', err)
    throw err
  }
}
