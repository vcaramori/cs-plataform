import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '@/lib/env'

let geminiClient: GoogleGenerativeAI | null = null

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(env.gemini.apiKey)
  }
  return geminiClient
}

export function getFlashModel() {
  return getGeminiClient().getGenerativeModel({ model: env.gemini.flashModel })
}

export function getProModel() {
  return getGeminiClient().getGenerativeModel({ model: env.gemini.proModel })
}

export function getEmbeddingModel() {
  return getGeminiClient().getGenerativeModel({ model: env.gemini.embeddingModel })
}
