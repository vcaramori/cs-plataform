const https = require('https');
const fs = require('fs');
require('dotenv').config();

const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

async function checkMigrationStatus() {
  console.log('Checking migration status via Supabase Management API...\n');

  try {
    const migrationResponse = await makeRequest(
      'GET',
      `/v1/projects/${projectRef}/migrations`,
      accessToken
    );

    const migrations = migrationResponse || [];
    console.log('Applied migrations:');
    const appliedMigrations = migrations.filter(m => m.status === 'applied');
    appliedMigrations.forEach(m => {
      console.log(`  ✓ ${m.name}`);
    });

    // Check for Wave 4 migrations
    const story23_1Applied = appliedMigrations.some(m => m.name && m.name.includes('story_23_1'));
    const story14_2Applied = appliedMigrations.some(m => m.name && m.name.includes('story_14_2'));
    const story15_1Applied = appliedMigrations.some(m => m.name && m.name.includes('story_15_1'));

    console.log('\n' + '='.repeat(70));
    console.log('Wave 4 Migration Status:');
    console.log('='.repeat(70));
    console.log(`${story23_1Applied ? '✅' : '❌'} Story 23.1: Playbook Governance`);
    console.log(`${story14_2Applied ? '✅' : '❌'} Story 14.2: Playbook Trigger Alert`);
    console.log(`${story15_1Applied ? '✅' : '❌'} Story 15.1: Auto Check-in Queue`);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

function makeRequest(method, path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

checkMigrationStatus().catch(console.error);
