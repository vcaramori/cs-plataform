import { generateText } from '../src/lib/llm/gateway'
import dotenv from 'dotenv'
import path from 'path'

// Load .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function checkGemini() {
  console.log('API Key loaded:', process.env.GEMINI_API_KEY ? 'Sim' : 'Não')
  try {
    const res = await generateText('teste', { allowFallback: false, timeoutMs: 3000 })
    console.log('Sucesso Gemini!', res)
  } catch (e: any) {
    console.log('Erro Gemini:', e.message)
  }
}

checkGemini()
