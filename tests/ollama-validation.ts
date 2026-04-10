import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

import { generateText } from '../src/lib/llm/gateway'

async function runValidation() {
  console.log('--- VALIDANDO EXECUÇÃO PURA OLLAMA ---')
  console.log('Provider configurado:', process.env.LLM_PROVIDER)
  console.log('Fallback permitido:', process.env.LLM_ALLOW_FALLBACK)
  
  try {
    const start = Date.now()
    // Teste simples para ver se o Ollama responde
    const res = await generateText('Oi, você está online agora?', { allowFallback: false, timeoutMs: 60000 })
    const end = Date.now()
    
    const log = `RESULTADO DO TESTE:\n` +
                `- Status: SUCESSO\n` +
                `- Resposta: ${res.result}\n` +
                `- Provider Utilizado: ${res.provider}\n` +
                `- Tempo de resposta: ${end - start}ms\n`
    
    console.log(log)
    fs.writeFileSync('tests/ollama-validation.txt', log, 'utf8')
  } catch (e: any) {
    const errorLog = `ERRO NO TESTE:\n- Mensagem: ${e.message}\n- Verifique se o download do qwen2.5:7b no 'npm run dev' já terminou.`
    console.error(errorLog)
    fs.writeFileSync('tests/ollama-validation.txt', errorLog, 'utf8')
  }
}

runValidation()
