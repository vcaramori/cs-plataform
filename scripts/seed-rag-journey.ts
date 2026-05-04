import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { getSupabaseAdminClient } from '../src/lib/supabase/admin'
import { storeEmbeddings } from '../src/lib/supabase/vector-search'

const supabase = getSupabaseAdminClient()

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

async function main() {
  console.log('Iniciando Geração de Volume Robusto (Jornada Completa do Cliente)...')

  // 1. Pegar um CSM válido
  const { data: users } = await supabase.from('accounts').select('csm_owner_id').not('csm_owner_id', 'is', null).limit(1)
  if (!users || users.length === 0) throw new Error('Nenhum CSM encontrado.')
  const csmId = users[0].csm_owner_id

  // 2. Criar ou Obter a conta 'Acme S/A - RAG Journey'
  const accountName = 'Acme S/A - RAG Journey'
  let { data: account } = await supabase.from('accounts').select('id').eq('name', accountName).single()
  
  if (!account) {
    const { data: newAcc, error: accError } = await supabase.from('accounts').insert({
      name: accountName,
      csm_owner_id: csmId,
      segment: 'Indústria',
      health_score: 95,
      health_trend: 'up',
      account_status: 'Active'
    }).select('id').single()
    if (accError) throw accError
    account = newAcc
  }

  const accountId = account.id

  // 3. Limpar dados anteriores dessa conta para evitar duplicatas em testes seguidos
  await supabase.from('embeddings').delete().eq('account_id', accountId)
  await supabase.from('interactions').delete().eq('account_id', accountId)
  await supabase.from('health_scores').delete().eq('account_id', accountId)

  // 4. Estruturar a Jornada (Timeline de 6 meses)
  const today = new Date()
  const startJourney = addDays(today, -150) // 5 meses atrás

  const journey = [
    // FASE 1: LUA DE MEL (Mês 1)
    {
      date: addDays(startJourney, 0), type: 'onboarding', sentiment: 0.9, hs: 90,
      title: 'Kickoff do Projeto',
      text: `Kickoff realizado com sucesso com o C-Level da Acme S/A. Expectativas alinhadas para a implantação do módulo de S&OP. O cliente está muito animado com a plataforma Plannera e espera reduzir o estoque obsoleto em 20%.`
    },
    {
      date: addDays(startJourney, 15), type: 'meeting', sentiment: 0.8, hs: 92,
      title: 'Treinamento de Key Users',
      text: `Treinamento conduzido com a equipe de Supply Chain. Excelente engajamento. Todos os usuários acessaram a plataforma e elogiaram a interface. Integração inicial com o ERP rodando sem falhas.`
    },
    {
      date: addDays(startJourney, 30), type: 'health-check', sentiment: 0.9, hs: 95,
      title: 'Health Check - 30 dias',
      text: `Cliente voando. O modelo de previsão de demanda já está gerando forecasts com 85% de acurácia no primeiro mês. O Diretor mandou um email elogiando o time de CS pelo suporte rápido.`
    },

    // FASE 2: A CRISE (Mês 2 e 3)
    {
      date: addDays(startJourney, 50), type: 'email', sentiment: -0.2, hs: 70,
      title: 'Problema na integração de dados',
      text: `Recebemos um email urgente de TI. Após a atualização do ERP deles, as APIs do Plannera começaram a rejeitar os payloads. Os estoques não estão atualizando no módulo de S&OE há 3 dias.`
    },
    {
      date: addDays(startJourney, 60), type: 'meeting', sentiment: -0.8, hs: 50,
      title: 'Reunião de Escalonamento (Crise)',
      text: `Reunião tensa com o Diretor de Supply Chain. Devido à falha de integração, eles compraram 50 toneladas de matéria-prima a mais. O MAPE despencou. O cliente ameaçou cancelar o contrato se não resolvermos em 48h. War Room iniciada com Produto e Engenharia.`
    },
    {
      date: addDays(startJourney, 62), type: 'email', sentiment: -0.9, hs: 40,
      title: 'Notificação de Risco de Churn',
      text: `Email do CEO da Acme para o nosso CEO: "A ferramenta de vocês nos custou dinheiro essa semana. Estamos suspendendo o rollout para outras fábricas até que o problema de S&OP seja definitivamente resolvido."`
    },
    {
      date: addDays(startJourney, 70), type: 'churn-risk', sentiment: -0.5, hs: 35,
      title: 'Comitê Interno de Churn',
      text: `Conta Acme S/A oficialmente em Risco Crítico. Identificamos que o parser do Plannera não suporta o novo formato de data do ERP SAP deles. Engenharia liberou um hotfix hoje.`
    },

    // FASE 3: TRATATIVAS E RESOLUÇÃO (Mês 4)
    {
      date: addDays(startJourney, 85), type: 'meeting', sentiment: 0.2, hs: 55,
      title: 'Apresentação do Plano de Ação',
      text: `Apresentamos a causa raiz e o hotfix aplicado. O cliente aceitou nossas desculpas, mas exigiu um SLA customizado de 2 horas para problemas de integração. Assinamos o aditivo. O ambiente está estável há 15 dias.`
    },
    {
      date: addDays(startJourney, 100), type: 'health-check', sentiment: 0.5, hs: 65,
      title: 'Follow-up de Estabilização',
      text: `O novo parser está perfeito. MAPE voltou a subir, atualmente em 88% de acurácia. O Diretor de Supply Chain agradeceu a dedicação do time de CS (ficamos em call de madrugada com eles). Confiança sendo reconstruída.`
    },

    // FASE 4: RECUPERAÇÃO E EXPANSÃO (Mês 5 e Hoje)
    {
      date: addDays(startJourney, 120), type: 'qbr', sentiment: 0.8, hs: 85,
      title: 'QBR Trimestral - A Virada',
      text: `Excelente QBR. Demonstramos que, apesar da crise no mês 3, a Acme reduziu o estoque obsoleto em 18% no geral. O CEO da Acme participou e disse que o "teste de fogo" provou que a Plannera é parceira. Retomaram o plano de rollout para a fábrica da Argentina.`
    },
    {
      date: addDays(startJourney, 140), type: 'expansion', sentiment: 0.9, hs: 92,
      title: 'Negociação de Upsell',
      text: `Iniciamos a validação técnica para habilitar o módulo de Abastecimento (Replenishment) nas 3 fábricas novas. O cliente está muito engajado. Estimativa de aumento de 30% no MRR.`
    },
    {
      date: today, type: 'meeting', sentiment: 0.95, hs: 95,
      title: 'Reunião de Alinhamento Semanal',
      text: `Tudo rodando liso. OTIF do cliente bateu 96% nesta semana, um recorde histórico. O Sponsor concordou em gravar um case de sucesso conosco falando sobre como superamos desafios técnicos juntos no S&OP.`
    }
  ]

  // Inserir os dados iterativamente
  for (const item of journey) {
    console.log(`[${item.date.toISOString().split('T')[0]}] Inserindo: ${item.title}...`)
    
    // 1. Inserir Health Score Histórico
    await supabase.from('health_scores').insert({
      account_id: accountId,
      evaluated_at: item.date.toISOString().split('T')[0],
      manual_score: item.hs,
      manual_notes: item.title,
      sentiment_component: item.sentiment,
      created_by: csmId
    })

    // 2. Inserir Interação
    const { data: interaction, error: intError } = await supabase.from('interactions').insert({
      account_id: accountId,
      csm_id: csmId,
      type: item.type,
      title: item.title,
      date: item.date.toISOString().split('T')[0],
      raw_transcript: item.text,
      sentiment_score: item.sentiment,
      source: 'manual',
      direct_hours: 1
    }).select('id').single()

    if (intError) throw intError

    // 3. Gerar e salvar embeddings
    try {
      await storeEmbeddings(accountId, 'interaction', interaction.id, item.text)
    } catch (err: any) {
      console.error(`Erro ao vetorizar ${item.title}:`, err.message)
    }
  }

  // Atualizar o HS atual da conta para refletir a realidade de hoje
  await supabase.from('accounts').update({ health_score: 95, health_trend: 'up' }).eq('id', accountId)

  console.log('✅ Jornada massiva gerada e vetorizada com sucesso!')
}

main().catch(console.error)
