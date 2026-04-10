import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const BIN_DIR = path.resolve(__dirname, '../bin')
const OLLAMA_EXE = path.join(BIN_DIR, 'ollama.exe')
const ZIP_PATH = path.join(BIN_DIR, 'ollama-windows-amd64.zip')

async function downloadOllama() {
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true })
  }

  if (fs.existsSync(OLLAMA_EXE)) {
    console.log('[Setup Ollama] Executável já detectado em bin/ollama.exe.')
    return
  }

  console.log('[Setup Ollama] Executável não encontrado. Iniciando download do Ollama Portable (Pode demorar um pouco)...')
  const url = 'https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.zip'

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Falha no download via GitHub: ${res.status} ${res.statusText}`)

    const buffer = await res.arrayBuffer()
    fs.writeFileSync(ZIP_PATH, Buffer.from(buffer))

    console.log('[Setup Ollama] Download concluído. Extraindo arquivos...')
    
    // Extrai o conteúdo usando o PowerShell do Windows
    execSync(`powershell -Command "Expand-Archive -Force '${ZIP_PATH}' '${BIN_DIR}'"`, { stdio: 'inherit' })

    // Limpeza
    fs.unlinkSync(ZIP_PATH)
    
    console.log('[Setup Ollama] Instalação do Ollama concluída! Ele está pronto para rodar dentro do projeto.')
  } catch (err) {
    console.error('[Setup Ollama] Erro crítico ao obter ou instalar o Ollama:', err)
    process.exit(1)
  }
}

downloadOllama()
