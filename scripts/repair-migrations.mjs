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

const revertedVersions = [
  '20260401130417', '20260407173740', '20260407174146', '20260407174336', '20260407175304',
  '20260407181942', '20260407183203', '20260407185415', '20260407193106', '20260408193843',
  '20260408202721', '20260409135823', '20260409151602', '20260410134354', '20260410141650',
  '20260410170339', '20260410191720', '20260410202418', '20260410210349', '20260410212334',
  '20260410215402', '20260413145743', '20260413172051', '20260413183035', '20260413200051',
  '20260413221309', '20260414125641', '20260416192416', '20260416224748', '20260417175254',
  '20260420122826', '20260420131017', '20260420133253', '20260420135214', '20260420175231',
  '20260420175428', '20260420185337', '20260423220434', '20260424125651', '20260424131847',
  '20260424140544', '20260428202514', '20260428202842', '20260428223857', '20260428225858',
  '20260428233727', '20260430124424', '20260430172325', '20260504154048', '20260504164117',
  '20260504175229', '20260505135327', '20260505164344', '20260505182724', '20260505182846'
];

console.log(`🔄 Reparando ${revertedVersions.length} versões como 'reverted'...`);

for (const version of revertedVersions) {
  try {
    console.log(`⏳ Reparando ${version}...`);
    // Usar a senha na variável de ambiente
    execSync(`npx supabase migration repair --status reverted ${version}`, {
      env: { ...process.env, SUPABASE_DB_PASSWORD: password },
      stdio: 'inherit'
    });
  } catch (err) {
    console.error(`❌ Erro ao reparar ${version}:`, err.message);
  }
}

console.log('✅ Reparação concluída!');
