import { generateText } from '../src/lib/llm/gateway'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function checkGemini() {
  let log = `API Key loaded: ${process.env.GEMINI_API_KEY ? 'Sim' : 'Não'}\n`
  try {
    const res = await generateText('teste', { allowFallback: false, timeoutMs: 15000 })
    log += `Sucesso Gemini! Provider utilizado: ${res.provider}\nResultado: ${res.result}\n`
  } catch (e: any) {
    log += `Erro Gemini: ${e.message}\n`
  }
  fs.writeFileSync(path.resolve(__dirname, 'gemini-log.txt'), log, 'utf-8')
}

checkGemini()
