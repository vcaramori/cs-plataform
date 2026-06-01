import { buildSystemInstruction } from './ai-context'

/**
 * Carrega o system instruction de uma tarefa de IA.
 * Agora delega a buildSystemInstruction → injeta contexto global + skills aplicáveis
 * + (override do app_settings OU o fallback hardcoded). Mantém a assinatura por compat.
 */
export async function loadInstruction(key: string, fallback: string): Promise<string> {
  return buildSystemInstruction(key, fallback)
}
