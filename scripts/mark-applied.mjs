import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carregar .env manualmente
const envContent = readFileSync(join(__dirname, '../.env'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const password = env['SUPABASE_DB_PASSWORD'];

if (!password) {
  console.error('❌ SUPABASE_DB_PASSWORD não encontrado no .env');
  process.exit(1);
}

const appliedVersions = [
  '004', '005', '007', '008', '012', '016', '017', '019', '021',
  '20260505120000', '20260505140000', '20260505150000', '20260505160000'
];

console.log(`🔄 Marcando ${appliedVersions.length} versões como 'applied'...`);

for (const version of appliedVersions) {
  try {
    console.log(`⏳ Marcando ${version}...`);
    execSync(`npx supabase migration repair --status applied ${version}`, {
      env: { ...process.env, SUPABASE_DB_PASSWORD: password },
      stdio: 'inherit'
    });
  } catch (err) {
    console.error(`❌ Erro ao marcar ${version}:`, err.message);
  }
}

console.log('✅ Operação concluída!');
