const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env file
require('dotenv').config();

async function checkMigrations() {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Construct the PostgreSQL connection string
  // Format: postgresql://postgres.{project_ref}:{password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres
  const connectionString = `postgresql://postgres.${projectRef}:${serviceRoleKey}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

  const client = new Client({
    connectionString: connectionString
  });

  console.log('Connecting to Supabase PostgreSQL...\n');

  try {
    await client.connect();
    console.log('✓ Connected to Supabase database\n');

    // Story 23.1 - Playbook Governance
    console.log('='.repeat(70));
    console.log('Story 23.1: Playbook Governance');
    console.log('='.repeat(70));

    // Check playbook_tasks columns
    const playbookTasksResult = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'playbook_tasks'
      AND column_name IN ('assigned_role', 'due_days_from_start', 'estimated_hours', 'feature_tags')
      ORDER BY column_name;
    `);

    const playbookTasksExpected = ['assigned_role', 'due_days_from_start', 'estimated_hours', 'feature_tags'];
    const playbookTasksFound = playbookTasksResult.rows.map(r => r.column_name);
    const playbookTasksMissing = playbookTasksExpected.filter(col => !playbookTasksFound.includes(col));

    console.log(`\n✓ playbook_tasks table:`);
    playbookTasksExpected.forEach(col => {
      if (playbookTasksFound.includes(col)) {
        console.log(`  ✓ ${col}`);
      } else {
        console.log(`  ✗ ${col}`);
      }
    });

    // Check account_playbook_tasks columns
    const accountPlaybookTasksResult = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'account_playbook_tasks'
      AND column_name IN ('assigned_to', 'due_date', 'completed_by', 'comments', 'time_spent_hours')
      ORDER BY column_name;
    `);

    const accountPlaybookTasksExpected = ['assigned_to', 'due_date', 'completed_by', 'comments', 'time_spent_hours'];
    const accountPlaybookTasksFound = accountPlaybookTasksResult.rows.map(r => r.column_name);
    const accountPlaybookTasksMissing = accountPlaybookTasksExpected.filter(col => !accountPlaybookTasksFound.includes(col));

    console.log(`\n✓ account_playbook_tasks table:`);
    accountPlaybookTasksExpected.forEach(col => {
      if (accountPlaybookTasksFound.includes(col)) {
        console.log(`  ✓ ${col}`);
      } else {
        console.log(`  ✗ ${col}`);
      }
    });

    // Check account_playbooks columns
    const accountPlaybooksResult = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'account_playbooks'
      AND column_name IN ('expected_end_date', 'objective', 'success_criteria')
      ORDER BY column_name;
    `);

    const accountPlaybooksExpected = ['expected_end_date', 'objective', 'success_criteria'];
    const accountPlaybooksFound = accountPlaybooksResult.rows.map(r => r.column_name);
    const accountPlaybooksMissing = accountPlaybooksExpected.filter(col => !accountPlaybooksFound.includes(col));

    console.log(`\n✓ account_playbooks table:`);
    accountPlaybooksExpected.forEach(col => {
      if (accountPlaybooksFound.includes(col)) {
        console.log(`  ✓ ${col}`);
      } else {
        console.log(`  ✗ ${col}`);
      }
    });

    const story23_1Applied = playbookTasksMissing.length === 0 && accountPlaybookTasksMissing.length === 0 && accountPlaybooksMissing.length === 0;
    const story23_1Partial = (playbookTasksMissing.length > 0 || accountPlaybookTasksMissing.length > 0 || accountPlaybooksMissing.length > 0) &&
                              (playbookTasksFound.length > 0 || accountPlaybookTasksFound.length > 0 || accountPlaybooksFound.length > 0);

    // Story 14.2 - Playbook Trigger Alert
    console.log('\n' + '='.repeat(70));
    console.log('Story 14.2: Playbook Trigger Alert');
    console.log('='.repeat(70));

    // Check if alert_type ENUM has 'playbook_trigger' value
    const enumResult = await client.query(`
      SELECT enum_range(NULL::alert_type) as alert_types;
    `);

    let story14_2Applied = false;
    let story14_2Error = null;

    if (enumResult.rows.length > 0 && enumResult.rows[0].alert_types) {
      const alertTypes = enumResult.rows[0].alert_types;
      console.log(`\n✓ alert_type ENUM exists with values:`);
      alertTypes.forEach(type => {
        if (type === 'playbook_trigger') {
          console.log(`  ✓ ${type}`);
          story14_2Applied = true;
        } else {
          console.log(`  - ${type}`);
        }
      });
    } else {
      story14_2Error = 'alert_type ENUM type not found';
      console.log(`\n✗ ${story14_2Error}`);
    }

    // Story 15.1 - Auto Check-in Queue
    console.log('\n' + '='.repeat(70));
    console.log('Story 15.1: Auto Check-in Queue');
    console.log('='.repeat(70));

    // Check if auto_checkin_queue table exists
    const autoCheckinQueueResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'auto_checkin_queue';
    `);

    let story15_1Applied = false;
    let story15_1TableExists = autoCheckinQueueResult.rows.length > 0;

    if (story15_1TableExists) {
      console.log(`\n✓ auto_checkin_queue table exists`);

      // Check for columns in auto_checkin_queue
      const columnsResult = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'auto_checkin_queue'
        ORDER BY column_name;
      `);

      const expectedColumns = ['id', 'account_id', 'csm_id', 'generated_subject', 'status', 'approval_deadline'];
      const foundColumns = columnsResult.rows.map(r => r.column_name);

      console.log(`\n  Columns found:`);
      foundColumns.forEach(col => console.log(`    ✓ ${col}`));

      const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));
      if (missingColumns.length > 0) {
        console.log(`\n  Missing columns:`);
        missingColumns.forEach(col => console.log(`    ✗ ${col}`));
      }

      story15_1Applied = missingColumns.length === 0;
    } else {
      console.log(`\n✗ auto_checkin_queue table does not exist`);
    }

    // Check opt_out_auto_checkin in accounts table
    const accountsOptOutResult = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'accounts'
      AND column_name = 'opt_out_auto_checkin';
    `);

    const optOutExists = accountsOptOutResult.rows.length > 0;
    console.log(`\n✓ accounts table - opt_out_auto_checkin: ${optOutExists ? '✓ exists' : '✗ missing'}`);

    story15_1Applied = story15_1Applied && optOutExists;

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('MIGRATION STATUS SUMMARY');
    console.log('='.repeat(70));

    const story23Status = story23_1Applied ? '✅' : (story23_1Partial ? '⏳' : '❌');
    const story14Status = story14_2Applied ? '✅' : '❌';
    const story15Status = story15_1Applied ? '✅' : '❌';

    console.log(`\n${story23Status} Story 23.1: Playbook Governance`);
    console.log(`${story14Status} Story 14.2: Playbook Trigger Alert`);
    console.log(`${story15Status} Story 15.1: Auto Check-in Queue`);

    // List missing items
    console.log('\n' + '-'.repeat(70));
    console.log('MISSING ITEMS (if any):');
    console.log('-'.repeat(70));

    if (playbookTasksMissing.length > 0) {
      console.log(`\nplaybook_tasks (missing): ${playbookTasksMissing.join(', ')}`);
    }
    if (accountPlaybookTasksMissing.length > 0) {
      console.log(`account_playbook_tasks (missing): ${accountPlaybookTasksMissing.join(', ')}`);
    }
    if (accountPlaybooksMissing.length > 0) {
      console.log(`account_playbooks (missing): ${accountPlaybooksMissing.join(', ')}`);
    }
    if (!story14_2Applied && story14_2Error) {
      console.log(`\nalert_type ENUM: ${story14_2Error}`);
    } else if (!story14_2Applied) {
      console.log(`\nalert_type ENUM: 'playbook_trigger' value not found`);
    }
    if (!story15_1Applied) {
      if (!story15_1TableExists) {
        console.log(`\nauto_checkin_queue: table does not exist`);
      }
      if (!optOutExists) {
        console.log(`accounts.opt_out_auto_checkin: column missing`);
      }
    }

    await client.end();
  } catch (err) {
    console.error('Error connecting to database:', err.message);
    console.error('\nTrying alternative connection method...\n');

    // Try using Supabase SDK instead
    await checkMigrationsWithSupabaseSDK();
  }
}

async function checkMigrationsWithSupabaseSDK() {
  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    console.log('Connecting via Supabase SDK...\n');

    // Story 23.1 - Playbook Governance
    console.log('='.repeat(70));
    console.log('Story 23.1: Playbook Governance');
    console.log('='.repeat(70));

    // For SDK approach, we still need to use raw SQL
    const { data, error } = await supabase.rpc('sql', {
      query: `SELECT column_name FROM information_schema.columns WHERE table_name = 'playbook_tasks'`
    });

    if (error) {
      console.log('Note: RPC approach not available. Please use psql directly or install PostgreSQL client.');
    }
  } catch (err) {
    console.error('Supabase SDK error:', err.message);
  }
}

checkMigrations().catch(console.error);
