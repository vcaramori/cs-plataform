import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

const CSM_DATA = [
    { name: 'Gerson', full_name: 'Gerson Henriques', email: 'gerson.henriques@plannera.com.br' },
    { name: 'Julia', full_name: 'Julia Kirk', email: 'julia.kirk@plannera.com.br' },
    { name: 'Pedro', full_name: 'Pedro Henriques', email: 'pedro.henriques@plannera.com.br' },
    { name: 'Breno', full_name: 'Breno Simas', email: 'breno.simas@plannera.com.br' },
]

// Parser de CSV Definitivo (Handles newlines and commas in quotes)
function parseCSV(filePath) {
    const text = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
    const rows = []
    let currentCell = ''
    let currentRow = []
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
        const char = text[i]
        const nextChar = text[i+1]

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"'
                i++
            } else {
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim())
            currentCell = ''
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++
            currentRow.push(currentCell.trim())
            if (currentRow.length > 1 || currentRow[0] !== '') rows.push(currentRow)
            currentCell = ''
            currentRow = []
        } else {
            currentCell += char
        }
    }
    if (currentRow.length > 0) {
        currentRow.push(currentCell.trim())
        rows.push(currentRow)
    }

    const headers = rows[0]
    return rows.slice(1).map(row => {
        const obj = {}
        headers.forEach((h, idx) => { obj[h] = row[idx] || '' })
        return obj
    })
}

function parseCurrency(str) {
    if (!str) return 0
    return parseFloat(str.replace(/[R$\s.]/g, '').replace(',', '.')) || 0
}

function parseHours(str) {
    if (!str) return 0
    const val = parseFloat(str.replace(',', '.')) || 0
    return val / 60 
}

async function run() {
    console.log('--- Iniciando Ingestão Final ---')
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const userMap = new Map()
    for (const csm of CSM_DATA) {
        const u = users.find(u => u.email === csm.email)
        if (u) {
            userMap.set(csm.name, u.id)
            userMap.set(csm.full_name, u.id)
        }
    }
    const defaultId = users.find(u => u.email === 'test@plannera.com.br')?.id || users[0]?.id

    // FASE 1: ACCOUNTS
    console.log('--- Fase 1: Contas ---')
    const hsData = parseCSV(path.join(__dirname, '../import/Health Score (Novo)-Grid view.csv'))
    const accountMap = new Map()

    for (const row of hsData) {
        try {
            const clientName = row['Cliente'] || row['Empresa']
            const accountName = row['Conta'] || row['Empresa']
            if (!accountName || accountName.length < 2) continue

            const csmId = userMap.get(row['Responsável pela Conta']?.trim()) || defaultId

            const { data: client } = await supabase.from('clients').upsert({ name: clientName }, { onConflict: 'name' }).select().single()
            const { data: account, error: accErr } = await supabase.from('accounts').upsert({
                name: accountName,
                client_id: client?.id,
                csm_owner_id: csmId,
                journey_stage: row['Estágio da Jornada'],
                account_status: row['Status da Conta'] === 'Ativo' ? 'active' : 'at-risk',
                logo_url: row['Logo']?.match(/https:\/\/\S+/)?.[0] || null,
                health_score: parseFloat(row['Health Score']?.replace(',', '.')) || 50
            }, { onConflict: 'name' }).select().single()

            if (accErr || !account) continue
            accountMap.set(accountName, account.id)

            // Contrato
            const mrr = parseCurrency(row['MRR'])
            if (mrr > 0) {
                await supabase.from('contracts').upsert({
                    account_id: account.id,
                    mrr: mrr,
                    status: 'active',
                    start_date: '2025-01-01'
                }, { onConflict: 'account_id' })
            }

            // Health Score
            await supabase.from('health_scores').insert({
                account_id: account.id,
                manual_score: parseFloat(row['Health Score']?.replace(',', '.')) || 50,
                manual_notes: row['Justificativa'] || row['Justificar Fatores externos / War Roon'],
                manual_ranking: row['Ranking HS'],
                evaluated_at: new Date().toISOString().slice(0, 10)
            })
            console.log(`Conta processada: ${accountName}`)
        } catch (err) { }
    }

    // FASE 2: INTERAÇÕES
    console.log('--- Fase 2: Interações ---')
    const interactionFiles = ['../import/Registro de Contato-Dados Geral.csv', '../import/Registro de Contato-Dados Geral (1).csv']
    for (const file of interactionFiles) {
        const data = parseCSV(path.join(__dirname, file))
        for (const row of data) {
            try {
                const accountName = row['Conta']
                const accountId = accountMap.get(accountName)
                if (!accountId) continue

                const csmId = userMap.get(row['Time CS']?.trim()) || defaultId
                let date = row['Data']
                if (date && date.includes('/')) {
                    const [d, m, y] = date.split('/')
                    date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
                }

                const { data: interaction } = await supabase.from('interactions').insert({
                    account_id: accountId,
                    csm_id: csmId,
                    type: 'meeting',
                    title: row['Sobre'] || 'Contato',
                    date: date || new Date().toISOString().slice(0, 10),
                    direct_hours: parseHours(row['Tempo (horas)']),
                    source: 'csv'
                }).select().single()

                if (interaction) {
                    await supabase.from('time_entries').insert({
                        account_id: accountId,
                        interaction_id: interaction.id,
                        csm_id: csmId,
                        activity_type: 'reporting',
                        parsed_hours: parseHours(row['Tempo (horas)']),
                        parsed_description: row['Sobre'],
                        date: date || new Date().toISOString().slice(0, 10)
                    })
                }
            } catch (err) { }
        }
    }
    console.log('--- IMPORTAÇÃO FINALIZADA ---')
}
run()
