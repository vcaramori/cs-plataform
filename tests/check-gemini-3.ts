import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function checkGemini() {
  let log = `API Key: ${process.env.GEMINI_API_KEY ? 'Sim' : 'Não'}\n`
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro']
  
  for (const m of models) {
    try {
      const model = genAI.getGenerativeModel({ model: m })
      const result = await model.generateContent('teste')
      log += `[${m}] Sucesso: ${result.response.text()}\n`
    } catch (e: any) {
      log += `[${m}] Erro: ${e.message}\n`
    }
  }
  
  fs.writeFileSync(path.resolve(__dirname, 'gemini-log.txt'), log, 'utf-8')
}

checkGemini()
