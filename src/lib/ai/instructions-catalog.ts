// ============================================================================
// Catálogo de instruções de IA — registro único de TODAS as tarefas que usam
// LLM. Dirige a aba "IA — Contexto & Regras" (lista + edição de override) e o
// `applies_to` das Skills. O texto default vive no call site (passado como
// fallback a buildSystemInstruction); override vazio = default do código.
// ============================================================================

export interface AIInstructionDef {
  key: string
  label: string
  domain: string
  triggerType: 'user' | 'auto'
  /** opcional: default visível na UI (quando vazio, a UI mostra placeholder) */
  default?: string
}

export const AI_INSTRUCTIONS: AIInstructionDef[] = [
  // RAG / Assistente
  { key: 'rag_system_instruction', label: 'Plannera Assistant (Perguntar)', domain: 'RAG / Assistente', triggerType: 'user' },
  { key: 'instruction_chat', label: 'Chat Rápido', domain: 'RAG / Assistente', triggerType: 'user' },

  // Suporte
  { key: 'instruction_review_reply', label: 'Revisor de Resposta a Ticket', domain: 'Suporte', triggerType: 'user' },
  { key: 'support_urgency', label: 'Urgência de Ticket', domain: 'Suporte', triggerType: 'auto' },
  { key: 'support_summary', label: 'Resumo de Ticket', domain: 'Suporte', triggerType: 'auto' },
  { key: 'support_categorization', label: 'Categorização de Ticket', domain: 'Suporte', triggerType: 'auto' },
  { key: 'support_intent', label: 'Classificação de Intenção (e-mail)', domain: 'Suporte', triggerType: 'auto' },
  { key: 'support_reply_suggestion', label: 'Sugestão de Resposta (RAG)', domain: 'Suporte', triggerType: 'user' },
  { key: 'support_reply_analysis', label: 'Análise da Resposta do Agente', domain: 'Suporte', triggerType: 'auto' },
  { key: 'support_sentiment', label: 'Sentimento (Suporte)', domain: 'Suporte', triggerType: 'auto' },
  { key: 'support_ticket_ingest', label: 'Extração de Tickets (texto)', domain: 'Suporte', triggerType: 'user' },
  { key: 'support_ticket_pdf', label: 'Extração de Tickets (PDF)', domain: 'Suporte', triggerType: 'user' },

  // Saúde / Risco
  { key: 'instruction_shadow_score', label: 'Shadow Health Score', domain: 'Saúde / Risco', triggerType: 'auto' },
  { key: 'predictive_risk', label: 'Risco Preditivo de Churn', domain: 'Saúde / Risco', triggerType: 'auto' },

  // Adoção
  { key: 'adoption_forecast', label: 'Forecast de Adoção', domain: 'Adoção', triggerType: 'user' },
  { key: 'adoption_blockers', label: 'Detecção de Bloqueios de Adoção', domain: 'Adoção', triggerType: 'auto' },

  // Engajamento
  { key: 'instruction_auto_checkin', label: 'Auto Check-in', domain: 'Engajamento', triggerType: 'auto' },
  { key: 'meeting_prep', label: 'Preparação de Reunião', domain: 'Engajamento', triggerType: 'user' },

  // Interações / Esforço
  { key: 'interaction_sentiment', label: 'Sentimento de Reunião', domain: 'Interações / Esforço', triggerType: 'auto' },
  { key: 'interaction_hours', label: 'Extração de Horas', domain: 'Interações / Esforço', triggerType: 'auto' },
  { key: 'time_entry_parse', label: 'Parse de Esforço (linguagem natural)', domain: 'Interações / Esforço', triggerType: 'user' },

  // Wishlist
  { key: 'wishlist_extractor', label: 'Extração de Pedidos', domain: 'Wishlist', triggerType: 'auto' },
  { key: 'wishlist_catalog_match', label: 'Match de Catálogo', domain: 'Wishlist', triggerType: 'user' },
  { key: 'wishlist_narrative', label: 'Brief de Produto', domain: 'Wishlist', triggerType: 'auto' },
]

export const AI_INSTRUCTION_MAP: Record<string, AIInstructionDef> = Object.fromEntries(
  AI_INSTRUCTIONS.map((i) => [i.key, i])
)

/** Domínios na ordem de exibição. */
export const AI_INSTRUCTION_DOMAINS = Array.from(new Set(AI_INSTRUCTIONS.map((i) => i.domain)))
