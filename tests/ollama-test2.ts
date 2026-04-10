import { generateText, generateEmbedding } from '../src/lib/llm/gateway'
import fs from 'fs'

async function runTest() {
  let log = '=== Iniciando Teste do Gateway LLM com Ollama ===\n'
  
  process.env.LLM_PROVIDER = 'ollama'
  process.env.LLM_TIMEOUT_MS = '5000'
  process.env.LLM_ALLOW_FALLBACK = 'false'

  log += `Config: Provider=${process.env.LLM_PROVIDER}, URL=${process.env.OLLAMA_URL || 'http://localhost:11434'}, Fallback=${process.env.LLM_ALLOW_FALLBACK}\n`
  
  try {
    log += '\n1. Testando Geração de Texto...\n'
    const textRes = await generateText('Responda "Olá"', { allowFallback: false, timeoutMs: 5000 })
    log += `✅ Sucesso! Resposta: ${textRes.result} | Provider: ${textRes.provider} | Tempo: ${textRes.durationMs}ms\n`
  } catch (error: any) {
    log += `❌ Erro na geração de texto: ${error.message}\n`
  }

  try {
    log += '\n2. Testando Geração de Embeddings...\n'
    const embedRes = await generateEmbedding('Teste de embedding', { allowFallback: false, timeoutMs: 5000 })
    log += `✅ Sucesso! Provider: ${embedRes.provider} | Dimensões: ${embedRes.result.length} | Tempo: ${embedRes.durationMs}ms\n`
  } catch (error: any) {
    log += `❌ Erro na geração de embeddings: ${error.message}\n`
  }

  log += '\n=== Testando Com Fallback Ativo ===\n'
  process.env.LLM_ALLOW_FALLBACK = 'true'

  try {
    log += '\n3. Testando Fallback (deve usar Gemini)...\n'
    const textRes = await generateText('Responda "Fallback funcionou"', { allowFallback: true, timeoutMs: 3000 })
    log += `✅ Sucesso! Resposta: ${textRes.result} | Provider: ${textRes.provider} | Tempo: ${textRes.durationMs}ms\n`
  } catch (error: any) {
    log += `❌ Erro no fallback: ${error.message}\n`
  }

  fs.writeFileSync('tests/ollama-results.txt', log, 'utf-8')
}

runTest().catch(e => console.error(e))
