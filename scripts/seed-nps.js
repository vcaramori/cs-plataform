
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function seed() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
  if (!urlMatch || !keyMatch) {
    console.error('Supabase vars not found in .env');
    return;
  }
  const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

  // Get some accounts
  const { data: accounts } = await supabase.from('accounts').select('id, name').limit(3);
  if (!accounts || accounts.length === 0) {
    console.error('No accounts found');
    return;
  }

  const { data: programs } = await supabase.from('nps_programs').select('program_key').eq('is_active', true).limit(1);
  const programKey = programs && programs.length > 0 ? programs[0].program_key : 'default';

  console.log('Using program key:', programKey);

  const responses = [];
  const now = new Date();
  
  accounts.forEach((acc, i) => {
    responses.push({
      account_id: acc.id,
      program_key: programKey,
      user_email: 'promoter' + i + '@' + acc.name.replace(/\s/g, '').toLowerCase() + '.com',
      score: 10,
      responded_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    });
    responses.push({
      account_id: acc.id,
      program_key: programKey,
      user_email: 'passive' + i + '@' + acc.name.replace(/\s/g, '').toLowerCase() + '.com',
      score: 8,
      responded_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    });
    responses.push({
      account_id: acc.id,
      program_key: programKey,
      user_email: 'detractor' + i + '@' + acc.name.replace(/\s/g, '').toLowerCase() + '.com',
      score: 4,
      responded_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
    });
  });

  const { error } = await supabase.from('nps_responses').insert(responses);
  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Inserted', responses.length, 'NPS responses successfully!');
  }
}

seed();

