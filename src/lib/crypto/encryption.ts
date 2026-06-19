import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Criptografia AES-256-GCM dos segredos guardados no banco (tokens OAuth Read.ai/Microsoft,
 * chaves de API de LLM).
 *
 * A CHAVE-MESTRA fica NO BANCO (app_settings.encryption_key) — não em env — seguindo a
 * premissa do projeto de configuração 100% no banco. É auto-provisionada:
 *   1) lê do banco (fonte de verdade);
 *   2) se não houver e existir ENCRYPTION_KEY em env (dev/migração), adota essa no banco;
 *   3) senão, gera uma nova (32 bytes) e persiste.
 * Trade-off aceito: quem tiver acesso total ao banco consegue decifrar os segredos. NÃO
 * troque a chave depois de gravada — isso inutiliza tudo que já foi cifrado.
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SETTINGS_KEY = 'encryption_key'

const isValidHex = (s: unknown): s is string =>
  typeof s === 'string' && s.length === 64 && /^[0-9a-fA-F]+$/.test(s)

let cachedKey: Buffer | null = null

async function rereadKeyHex(): Promise<string | null> {
  const admin = getSupabaseAdminClient() as any
  const { data } = await admin.from('app_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle()
  const hex = (data?.value as { hex?: string } | null)?.hex
  return isValidHex(hex) ? hex : null
}

async function persistKeyHex(hex: string): Promise<void> {
  const admin = getSupabaseAdminClient() as any
  // ignoreDuplicates: o primeiro a gravar vence (evita chaves divergentes sob concorrência).
  await admin.from('app_settings').upsert(
    {
      key: SETTINGS_KEY,
      value: { hex },
      description: 'Chave-mestra de criptografia (AES-256-GCM). NÃO alterar — inutiliza dados cifrados.',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key', ignoreDuplicates: true }
  )
}

async function loadKeyHex(): Promise<string> {
  // 1) Banco
  const fromDb = await rereadKeyHex()
  if (fromDb) return fromDb

  // 2) Env (dev/migração): adota no banco e relê a canônica
  const envHex = process.env.ENCRYPTION_KEY
  if (isValidHex(envHex)) {
    await persistKeyHex(envHex)
    return (await rereadKeyHex()) ?? envHex
  }

  // 3) Gera nova, persiste (race-safe) e relê a canônica
  const fresh = randomBytes(32).toString('hex')
  await persistKeyHex(fresh)
  return (await rereadKeyHex()) ?? fresh
}

async function getKey(): Promise<Buffer> {
  if (cachedKey) return cachedKey
  cachedKey = Buffer.from(await loadKeyHex(), 'hex')
  return cachedKey
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    encrypted.toString('base64'),
    tag.toString('base64'),
  ].join(':')
}

export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getKey()
  const [ivB64, dataB64, tagB64] = ciphertext.split(':')

  if (!ivB64 || !dataB64 || !tagB64) {
    throw new Error('[Crypto] Invalid ciphertext format')
  }

  const iv = Buffer.from(ivB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/** Indica se a chave-mestra já está disponível (banco ou env). Não expõe a chave. */
export async function hasEncryptionKey(): Promise<boolean> {
  try {
    await getKey()
    return true
  } catch {
    return false
  }
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '••••'
  return '••••••••' + key.slice(-4)
}
