const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log('🌱 Seeding mock interaction...');

  // 1. Get a user ID (CSM)
  const { data: users } = await supabase.auth.admin.listUsers();
  if (!users || users.users.length === 0) {
    console.error('No users found in auth.users. Cannot proceed.');
    return;
  }
  const csmId = users.users[0].id;
  console.log(`Using CSM ID: ${csmId}`);

  // 2. Get an account ID
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id')
    .limit(1);

  let accountId;
  if (!accounts || accounts.length === 0) {
    console.log('No accounts found. Creating a mock account...');
    const { data: newAccount, error: accError } = await supabase
      .from('accounts')
      .insert({
        name: 'Cliente Teste VoC',
        contract_status: 'active',
        csm_owner_id: csmId
      })
      .select('id')
      .single();

    if (accError) {
      console.error('Error creating account:', accError);
      return;
    }
    accountId = newAccount.id;
  } else {
    accountId = accounts[0].id;
  }

  console.log(`Using account ID: ${accountId}`);

  // 3. Get or create a contract
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id')
    .eq('account_id', accountId)
    .limit(1);

  let contractId;
  if (!contracts || contracts.length === 0) {
    console.log('No contracts found. Creating a mock contract...');
    const { data: newContract, error: contError } = await supabase
      .from('contracts')
      .insert({
        account_id: accountId,
        status: 'active',
        mrr: 5000,
        renewal_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days from now
      })
      .select('id')
      .single();

    if (contError) {
      console.error('Error creating contract:', contError);
      return;
    }
    contractId = newContract.id;
  } else {
    contractId = contracts[0].id;
  }

  console.log(`Using contract ID: ${contractId}`);

  // 4. Insert interaction (Using title as description fallback due to schema cache)
  const { data: interaction, error: intError } = await supabase
    .from('interactions')
    .insert({
      account_id: accountId,
      contract_id: contractId,
      csm_id: csmId,
      title: 'O cliente reclamou muito da performance do sistema hoje. Disse que está muito lento para carregar os gráficos e que isso está impactando a operação. No entanto, elogiou o atendimento do suporte que foi rápido em responder.',
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      type: 'meeting',
      source: 'manual'
    })
    .select('id')
    .single();

  if (intError) {
    console.error('Error creating interaction:', intError);
    return;
  }

  console.log(`✅ Mock interaction created with ID: ${interaction.id}`);
}

seed();
