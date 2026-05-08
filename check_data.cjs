const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('interactions')
    .select('id, title, created_at, sentiment_score')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Interactions:', data);
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const { count, error: countError } = await supabase
    .from('interactions')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', yesterday.toISOString())
    .is('sentiment_score', null);
    
  console.log('Count without sentiment:', count);
  if (countError) console.error('Count error:', countError);
}

check();
