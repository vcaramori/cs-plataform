#!/usr/bin/env npx tsx

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env');
  process.exit(1);
}

// Parse Supabase URL to extract host
const urlObj = new URL(supabaseUrl);
const projectRef = urlObj.hostname.split('.')[0];

// Construct PostgreSQL connection string
const connectionString = `postgresql://postgres:${serviceRoleKey}@db.${projectRef}.supabase.co:5432/postgres`;

const pool = new Pool({ connectionString });

async function checkMigrations() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking Wave 4 Migrations...\n');

    let story23_1Applied = false;
    let story23_1Partial = false;
    let story14_2Applied = false;
    let story15_1Applied = false;

    const missingItems: string[] = [];

    // Story 23.1: Playbook Governance
    console.log('='.repeat(70));
    console.log('Story 23.1: Playbook Governance');
    console.log('='.repeat(70));

    // Check playbook_tasks columns
    const playbookTasksResult: any = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'playbook_tasks'
      AND column_name IN ('assigned_role', 'due_days_from_start', 'estimated_hours', 'feature_tags')
      ORDER BY column_name;
    `);

    const playbookTasksExpected = ['assigned_role', 'due_days_from_start', 'estimated_hours', 'feature_tags'];
    const playbookTasksFound = playbookTasksResult.rows.map((r: any) => r.column_name);
    const playbookTasksMissing = playbookTasksExpected.filter(col => !playbookTasksFound.includes(col));

    console.log(`\nplaybook_tasks:`);
    playbookTasksExpected.forEach(col => {
      if (playbookTasksFound.includes(col)) {
        console.log(`  ✓ ${col}`);
      } else {
        console.log(`  ✗ ${col}`);
      }
    });

    // Check account_playbook_tasks columns
    const accountPlaybookTasksResult: any = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'account_playbook_tasks'
      AND column_name IN ('assigned_to', 'due_date', 'completed_by', 'comments', 'time_spent_hours')
      ORDER BY column_name;
    `);

    const accountPlaybookTasksExpected = ['assigned_to', 'due_date', 'completed_by', 'comments', 'time_spent_hours'];
    const accountPlaybookTasksFound = accountPlaybookTasksResult.rows.map((r: any) => r.column_name);
    const accountPlaybookTasksMissing = accountPlaybookTasksExpected.filter(col => !accountPlaybookTasksFound.includes(col));

    console.log(`\naccount_playbook_tasks:`);
    accountPlaybookTasksExpected.forEach(col => {
      if (accountPlaybookTasksFound.includes(col)) {
        console.log(`  ✓ ${col}`);
      } else {
        console.log(`  ✗ ${col}`);
      }
    });

    // Check account_playbooks columns
    const accountPlaybooksResult: any = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'account_playbooks'
      AND column_name IN ('expected_end_date', 'objective', 'success_criteria')
      ORDER BY column_name;
    `);

    const accountPlaybooksExpected = ['expected_end_date', 'objective', 'success_criteria'];
    const accountPlaybooksFound = accountPlaybooksResult.rows.map((r: any) => r.column_name);
    const accountPlaybooksMissing = accountPlaybooksExpected.filter(col => !accountPlaybooksFound.includes(col));

    console.log(`\naccount_playbooks:`);
    accountPlaybooksExpected.forEach(col => {
      if (accountPlaybooksFound.includes(col)) {
        console.log(`  ✓ ${col}`);
      } else {
        console.log(`  ✗ ${col}`);
      }
    });

    story23_1Applied = playbookTasksMissing.length === 0 && accountPlaybookTasksMissing.length === 0 && accountPlaybooksMissing.length === 0;
    story23_1Partial = (playbookTasksMissing.length > 0 || accountPlaybookTasksMissing.length > 0 || accountPlaybooksMissing.length > 0) &&
                        (playbookTasksFound.length > 0 || accountPlaybookTasksFound.length > 0 || accountPlaybooksFound.length > 0);

    if (playbookTasksMissing.length > 0) {
      missingItems.push(`playbook_tasks: ${playbookTasksMissing.join(', ')}`);
    }
    if (accountPlaybookTasksMissing.length > 0) {
      missingItems.push(`account_playbook_tasks: ${accountPlaybookTasksMissing.join(', ')}`);
    }
    if (accountPlaybooksMissing.length > 0) {
      missingItems.push(`account_playbooks: ${accountPlaybooksMissing.join(', ')}`);
    }

    // Story 14.2: Playbook Trigger Alert
    console.log('\n' + '='.repeat(70));
    console.log('Story 14.2: Playbook Trigger Alert');
    console.log('='.repeat(70));

    // Check if alert_type ENUM has 'playbook_trigger' value
    try {
      const enumResult: any = await client.query(`
        SELECT enum_range(NULL::alert_type) as alert_types;
      `);

      if (enumResult.rows.length > 0 && enumResult.rows[0].alert_types) {
        const alertTypes = enumResult.rows[0].alert_types;
        console.log(`\nalert_type ENUM exists with values:`);
        let foundPlaybookTrigger = false;
        alertTypes.forEach((type: string) => {
          if (type === 'playbook_trigger') {
            console.log(`  ✓ ${type}`);
            foundPlaybookTrigger = true;
            story14_2Applied = true;
          } else {
            console.log(`  - ${type}`);
          }
        });

        if (!foundPlaybookTrigger) {
          missingItems.push(`alert_type ENUM: 'playbook_trigger' value not found`);
        }
      }
    } catch (err: any) {
      console.log(`\n✗ alert_type ENUM type not found: ${err.message}`);
      missingItems.push(`alert_type ENUM: type does not exist`);
    }

    // Story 15.1: Auto Check-in Queue
    console.log('\n' + '='.repeat(70));
    console.log('Story 15.1: Auto Check-in Queue');
    console.log('='.repeat(70));

    // Check if auto_checkin_queue table exists
    const autoCheckinQueueResult: any = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'auto_checkin_queue';
    `);

    let story15_1TableExists = autoCheckinQueueResult.rows.length > 0;

    if (story15_1TableExists) {
      console.log(`\n✓ auto_checkin_queue table exists`);

      // Check for columns in auto_checkin_queue
      const columnsResult: any = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'auto_checkin_queue'
        ORDER BY column_name;
      `);

      const expectedColumns = ['id', 'account_id', 'csm_id', 'generated_subject', 'generated_body', 'status', 'approval_deadline'];
      const foundColumns = columnsResult.rows.map((r: any) => r.column_name);

      console.log(`\nColumns found:`);
      foundColumns.forEach((col: string) => console.log(`  ✓ ${col}`));

      const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));
      if (missingColumns.length > 0) {
        console.log(`\nMissing columns:`);
        missingColumns.forEach(col => console.log(`  ✗ ${col}`));
        missingItems.push(`auto_checkin_queue: missing columns ${missingColumns.join(', ')}`);
      }

      story15_1Applied = missingColumns.length === 0;
    } else {
      console.log(`\n✗ auto_checkin_queue table does not exist`);
      missingItems.push(`auto_checkin_queue: table does not exist`);
    }

    // Check opt_out_auto_checkin in accounts table
    const accountsOptOutResult: any = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'accounts'
      AND column_name = 'opt_out_auto_checkin';
    `);

    const optOutExists = accountsOptOutResult.rows.length > 0;
    console.log(`\naccounts table:`);
    console.log(`  ${optOutExists ? '✓' : '✗'} opt_out_auto_checkin`);

    if (!optOutExists) {
      missingItems.push(`accounts.opt_out_auto_checkin: column missing`);
    }

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

    if (missingItems.length > 0) {
      console.log('\n' + '-'.repeat(70));
      console.log('MISSING ITEMS:');
      console.log('-'.repeat(70));
      missingItems.forEach(item => console.log(`  • ${item}`));
    }

    console.log('\n' + '-'.repeat(70));
    if (story23_1Applied && story14_2Applied && story15_1Applied) {
      console.log('✅ All Wave 4 migrations are APPLIED!');
    } else {
      console.log('⏳ Some Wave 4 migrations are PENDING or PARTIAL.');
      console.log('\nRecommendation: Apply the remaining migrations from:');
      if (!story23_1Applied) console.log('  • supabase/migrations/20260507_story_23_1_playbook_governance.sql');
      if (!story14_2Applied) console.log('  • supabase/migrations/20260507_story_14_2_playbook_trigger_alert.sql');
      if (!story15_1Applied) console.log('  • supabase/migrations/20260507_story_15_1_auto_checkin.sql');
    }

  } catch (err) {
    console.error('❌ Error checking migrations:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMigrations();
