import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Re-hospedagem de anexos/imagens do HelpDesk no Supabase Storage.
 *
 * As mensagens importadas trazem URLs do CDN externo (cdn.livechat-files.com). Para não
 * depender desse CDN (links podem expirar), baixamos cada arquivo e subimos no bucket
 * público `helpdesk-attachments`, passando a usar a URL do Storage. Dedupe por caminho
 * derivado do sha256 da URL → arquivos repetidos (ex.: logos de assinatura) sobem uma vez.
 */

const BUCKET = 'helpdesk-attachments'
const CDN_HOST = 'cdn.livechat-files.com'
const CDN_RE = /https:\/\/cdn\.livechat-files\.com\/[^\s"')]+/gi

/** Caminho estável a partir da URL do CDN: {sha256}/{nome} (sha garante dedupe por conteúdo). */
function pathFor(url: string): string {
  const clean = url.split('?')[0]
  const parts = clean.split('/').filter(Boolean)
  const name = decodeURIComponent(parts[parts.length - 1] || 'file')
  // .../{sha256}/{token}/{name} → sha é o antepenúltimo segmento
  const sha = parts.length >= 3 ? parts[parts.length - 3] : parts[parts.length - 2] || 'misc'
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'file'
  return `${sha.slice(0, 64)}/${safeName}`
}

export interface Rehoster {
  /** Re-hospeda uma URL do CDN; devolve a URL do Storage (ou a original em falha). */
  rehostUrl: (url: string, contentType?: string | null) => Promise<string>
  /** Re-hospeda todas as URLs do CDN dentro de um HTML (imagens inline). */
  rehostHtml: (html: string | null) => Promise<string | null>
}

export function makeRehoster(): Rehoster {
  const admin = getSupabaseAdminClient() as any
  const cache = new Map<string, string>() // urlOriginal → urlFinal

  async function rehostUrl(url: string, contentType?: string | null): Promise<string> {
    if (!url || !url.includes(CDN_HOST)) return url
    const cached = cache.get(url)
    if (cached) return cached
    try {
      const res = await fetch(url)
      if (!res.ok) { cache.set(url, url); return url }
      const buf = Buffer.from(await res.arrayBuffer())
      const ct = contentType || res.headers.get('content-type') || 'application/octet-stream'
      const path = pathFor(url)
      const { error } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true })
      if (error) { cache.set(url, url); return url }
      const pub = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl as string
      cache.set(url, pub)
      return pub
    } catch {
      cache.set(url, url)
      return url
    }
  }

  async function rehostHtml(html: string | null): Promise<string | null> {
    if (!html) return html
    const urls = [...new Set(html.match(CDN_RE) ?? [])]
    let out = html
    for (const u of urls) {
      const p = await rehostUrl(u)
      if (p !== u) out = out.split(u).join(p)
    }
    return out
  }

  return { rehostUrl, rehostHtml }
}
