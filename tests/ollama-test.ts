import { generateText, generateEmbedding } from '../src/lib/llm/gateway'
import { env } from '../src/lib/env'

async function runTest() {
  console.log('=== Iniciando Teste do Gateway LLM com Ollama ===')
  
  // Forçando as variáveis de ambiente para o teste
  process.env.LLM_PROVIDER = 'ollama'
  process.env.LLM_TIMEOUT_MS = '5000' // Timeout rápido pra não demorar se não tiver server
  process.env.LLM_ALLOW_FALLBACK = 'false' // Vamos forçar sem fallback primeiro pra ver o erro do ollama

  console.log('Configurações ativas:')
  console.log('- Provider:', process.env.LLM_PROVIDER)
  console.log('- Endpoint Ollama:', process.env.OLLAMA_URL || 'http://localhost:11434')
  console.log('- Model:', process.env.OLLAMA_MODEL || 'qwen2.5:7b')
  console.log('- Fallback Permitido:', process.env.LLM_ALLOW_FALLBACK)
  
  try {
    console.log('\n1. Testando Geração de Texto...')
    const textRes = await generateText('Responda com "Olá, estou funcionando!" e nada mais.', { allowFallback: false, timeoutMs: 5000 })
    console.log('✅ Sucesso!')
    console.log('Resposta:', textRes.result)
    console.log('Provider utilizado:', textRes.provider)
    console.log('Tempo (ms):', textRes.durationMs)
  } catch (error: any) {
    console.error('❌ Erro na geração de texto:', error.message)
  }

  try {
    console.log('\n2. Testando Geração de Embeddings...')
    const embedRes = await generateEmbedding('Teste de embedding', { allowFallback: false, timeoutMs: 5000 })
    console.log('✅ Sucesso!')
    console.log(`Provider utilizado: ${embedRes.provider}`)
    console.log(`Dimensões geradas: ${embedRes.result.length}`)
    console.log('Tempo (ms):', embedRes.durationMs)
  } catch (error: any) {
    console.error('❌ Erro na geração de embeddings:', error.message)
  }

  console.log('\n=== Testando Com Fallback Ativo ===')
  process.env.LLM_ALLOW_FALLBACK = 'true'
  console.log('- Fallback Permitido:', process.env.LLM_ALLOW_FALLBACK)

  try {
    console.log('\n3. Testando Geração de Texto (deve acionar Gemini)...')
    const textRes = await generateText('Responda apenas "Fallback funcionou!"', { allowFallback: true, timeoutMs: 3000 })
    console.log('✅ Sucesso no Fallback!')
    console.log('Resposta:', textRes.result)
    console.log('Provider utilizado:', textRes.provider)
    console.log('Tempo (ms):', textRes.durationMs)
  } catch (error: any) {
    console.error('❌ Erro no fallback de texto:', error.message)
  }

  console.log('\n=== Fim dos Testes ===')
}

runTest()
