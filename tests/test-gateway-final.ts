import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Import after loading .env so env vars are loaded when the module initializes
import { generateText, generateEmbedding } from '../src/lib/llm/gateway'

async function run() {
  let log = '--- Teste de Geração de Texto ---\n'
  try {
    const res = await generateText('teste', { allowFallback: true, timeoutMs: 3000 })
    log += `SUCESSO TEXTO: [Provider: ${res.provider}] | Saída: ${res.result}\n`
  } catch (e: any) {
    log += `ERRO TEXTO: ${e.message}\n`
  }

  log += '\n--- Teste de Geração de Embedding ---\n'
  try {
    const emb = await generateEmbedding('teste', { allowFallback: true, timeoutMs: 3000 })
    log += `SUCESSO EMBEDDING: [Provider: ${emb.provider}] | Dimensões: ${emb.result.length}\n`
  } catch (e: any) {
    log += `ERRO EMBEDDING: ${e.message}\n`
  }

  fs.writeFileSync('tests/gateway-final-log.txt', log, 'utf8')
}

run()
