import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { GoogleGenerativeAI } from '@google/generative-ai'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function checkGemini20() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  let log = ''
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent('teste 2.0')
    log = `SUCESSO: ${result.response.text()}\n`
  } catch (e: any) {
    log = `ERRO: ${e.message}\n`
  }
  fs.writeFileSync(path.resolve(__dirname, 'gemini-20-log.txt'), log, 'utf-8')
}

checkGemini20()
