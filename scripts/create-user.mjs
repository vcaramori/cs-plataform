import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  const email = 'test@plannera.com.br'
  const password = 'Plannera@2026'

  console.log(`Tentando criar usuário: ${email}...`)

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Usuário já existe.')
      return
    }
    console.error('Erro ao criar usuário:', error.message)
    process.exit(1)
  }

  console.log('Usuário criado com sucesso:', data.user.id)
  
  // Criar uma conta dummy para este CSM
  console.log('Criando conta dummy (Empresa Teste)...')
  const { error: accError } = await supabase
    .from('accounts')
    .insert([
      { 
        name: 'Empresa Teste', 
        segment: 'Enterprise', 
        csm_owner_id: data.user.id,
        industry: 'Tecnologia',
        health_score: 85,
        health_trend: 'stable'
      }
    ])
  
  if (accError) {
    console.error('Erro ao criar conta dummy:', accError.message)
  } else {
    console.log('Conta dummy criada para o usuário.')
  }
}

createTestUser()
