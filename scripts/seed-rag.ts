import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

// Mover importações relativas para depois do setup do dotenv
import { getSupabaseAdminClient } from '../src/lib/supabase/admin'
import { storeEmbeddings } from '../src/lib/supabase/vector-search'

const supabase = getSupabaseAdminClient()

async function main() {
  console.log('Iniciando seed de dados RAG...')

  // 1. Pegar um CSM válido e duas contas
  const { data: users } = await supabase.from('accounts').select('csm_owner_id').not('csm_owner_id', 'is', null).limit(1)
  if (!users || users.length === 0) {
    throw new Error('Nenhum CSM encontrado nas contas.')
  }
  const csmId = users[0].csm_owner_id

  const { data: accounts } = await supabase.from('accounts').select('id, name').limit(2)
  if (!accounts || accounts.length < 2) {
    throw new Error('Contas insuficientes para seed.')
  }

  const accountA = accounts[0]
  const accountB = accounts[1]

  const dummyData = [
    {
      account: accountA,
      type: 'meeting',
      title: 'Alinhamento S&OP e Previsão de Demanda',
      transcript: `Reunião com a diretoria da ${accountA.name} para discutir os desafios de S&OP do último trimestre. 
A acurácia do forecast caiu para 65% devido à falta de integração dos dados de sell-out das lojas regionais. 
O cliente está preocupado com o aumento do capital de giro preso em estoque obsoleto. 
Foi acordado que a equipe de CS do Plannera vai configurar o módulo de S&OE para dar visibilidade diária, 
e precisamos fazer um treinamento com a equipe de Supply Chain na próxima semana. 
Existe risco de churn se não estabilizarmos o MAPE abaixo de 15% até o final do semestre.`
    },
    {
      account: accountA,
      type: 'email',
      title: 'Problemas no faturamento e escalonamento',
      transcript: `Olá equipe Plannera,
Estamos com um problema crítico no módulo financeiro. A integração com nosso ERP falhou e o relatório de working capital está zerado.
Precisamos de suporte imediato, pois temos conselho administrativo amanhã e dependemos desses dados.
Atenciosamente, CFO.`
    },
    {
      account: accountB,
      type: 'qbr',
      title: 'QBR Q1 - Revisão Trimestral de Sucesso',
      transcript: `Apresentamos os resultados do Q1 para a ${accountB.name}. 
A adoção do sistema atingiu 85%, um ótimo resultado. O tempo de setup caiu pela metade usando nossas templates de integração.
Como próximo passo, eles querem expandir o uso para as filiais da Europa, o que vai gerar um up-sell potencial de 15k MRR.
O NPS reportado pelos usuários chave foi 9. Eles são fortes candidatos para caso de sucesso.`
    }
  ]

  for (const item of dummyData) {
    console.log(`Processando: [${item.account.name}] ${item.title}...`)
    
    // Inserir interação
    const { data: interaction, error: intError } = await supabase
      .from('interactions')
      .insert({
        account_id: item.account.id,
        csm_id: csmId,
        type: item.type,
        title: item.title,
        date: new Date().toISOString().split('T')[0],
        raw_transcript: item.transcript,
        source: 'manual',
        direct_hours: 1
      })
      .select('id')
      .single()

    if (intError) {
      console.error('Erro ao inserir interação:', intError)
      continue
    }

    // Gerar e salvar embeddings
    try {
      const chunksSaved = await storeEmbeddings(
        item.account.id,
        'interaction',
        interaction.id,
        item.transcript
      )
      console.log(`✅ Sucesso! Inserida interação ${interaction.id} com ${chunksSaved} chunks vetoriais.`)
    } catch (err: any) {
      console.error(`❌ Erro ao vetorizar ${item.title}:`, err.message)
    }
  }

  console.log('Seed RAG finalizado com sucesso!')
}

main().catch(console.error)
