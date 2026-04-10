import { spawn, execSync, ChildProcess } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs'

const BIN_DIR = path.resolve(__dirname, '../bin')
const OLLAMA_EXE = path.join(BIN_DIR, 'ollama.exe')
const MODELS_DIR = path.join(BIN_DIR, 'models')
const MAX_RETRIES = 20

// Tenta verificar a saúde da API do Ollama
async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    return res.ok
  } catch {
    return false
  }
}

// Verifica se os modelos desejados já estão instalados
async function checkModelsReady(models: string[]): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    if (!res.ok) return false
    
    const data = await res.json()
    const installedModels = data.models.map((m: any) => m.name)

    return models.every(reqModel => installedModels.includes(reqModel))
  } catch {
    return false
  }
}

async function startOllama() {
  // 1. Verifica se setup já foi executado
  if (!fs.existsSync(OLLAMA_EXE)) {
    console.log('[Start Ollama] Ollama.exe não encontrado. Redirecionando para setup...')
    execSync('npx tsx scripts/setup-ollama.ts', { stdio: 'inherit' })
  }

  // 2. Verifica se já está rodando
  let isRunning = await checkOllamaHealth()
  
  if (!isRunning) {
    console.log('[Start Ollama] Iniciando serviço do Ollama em background (127.0.0.1:11434)...')
    const ollamaProcess = spawn(OLLAMA_EXE, ['serve'], {
      detached: true,
      stdio: 'ignore', // Rode completamente silencioso por trás
      env: Object.assign({}, process.env, { 
        OLLAMA_HOST: '127.0.0.1:11434',
        OLLAMA_MODELS: MODELS_DIR 
      })
    })

    // Desprende o processo filho do lifecycle do Node para que ele mantenha vivo, se preferirmos
    // Mas no caso do dev. vamos apenas mantê-lo rodando. Ele morrerá se a janela do terminal fechar na maioria das vezes.
    ollamaProcess.unref()

    // 3. Aguarda ele acordar
    let attempts = 0
    while (attempts < MAX_RETRIES) {
      isRunning = await checkOllamaHealth()
      if (isRunning) break
      await new Promise(r => setTimeout(r, 1000))
      attempts++
    }

    if (!isRunning) {
      console.error('[Start Ollama] Falha crítica: O serviço não respondeu após 20 segundos.')
      process.exit(1)
    }
  } else {
    console.log('[Start Ollama] Ollama já estava rodando e atende no localhost.')
  }

  // 4. Download Automático dos Modelos necessários
  const requiredModels = ['qwen2.5:7b', 'nomic-embed-text']
  const allReady = await checkModelsReady(requiredModels)

  if (!allReady) {
    console.log('[Start Ollama] Nem todos os modelos estão locais. Preparando para puxar pendências...')
    for (const model of requiredModels) {
      console.log(`[Start Ollama] Puxando modelo ${model} (pode demorar)...`)
      execSync(`"${OLLAMA_EXE}" pull ${model}`, { 
        stdio: 'inherit',
        env: Object.assign({}, process.env, { OLLAMA_MODELS: MODELS_DIR })
      })
    }
    console.log('[Start Ollama] Download de modelos concluído!')
  } else {
    console.log('[Start Ollama] Todos os modelos necessários (qwen2.5 e nomic) estão prontos.')
  }

  console.log('[Start Ollama] 🚀 Motor Local 100% Funcional! Prosseguindo para o App...')
}

startOllama()
