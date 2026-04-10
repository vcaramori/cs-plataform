import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
  const req = await fetch(url)
  const res = await req.json()
  
  if (res.models) {
    const names = res.models.map((m: any) => m.name).filter((n: string) => n.includes('gemini'))
    console.log('Modelos Gemini disponíveis para esta chave:\n' + names.join('\n'))
  } else {
    console.log('Erro:', res)
  }
}

listModels()
