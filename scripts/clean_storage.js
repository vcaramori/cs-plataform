const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanBucket(bucketName) {
  console.log(`\n--- Cleaning bucket: ${bucketName} ---`);
  
  // 1. List objects
  const { data: files, error: listError } = await supabase.storage.from(bucketName).list();
  
  if (listError) {
    console.error(`Failed to list ${bucketName}:`, listError.message);
    return;
  }
  
  if (!files || files.length === 0) {
    console.log(`Bucket ${bucketName} is already empty.`);
    return;
  }
  
  const fileNames = files.map(f => f.name).filter(name => name !== '.emptyFolderPlaceholder');
  if (fileNames.length === 0) {
    console.log(`Bucket ${bucketName} has no deletable files.`);
    return;
  }

  console.log(`Found ${fileNames.length} files to delete in ${bucketName}:`, fileNames);
  
  // 2. Delete objects
  const { data: delData, error: delError } = await supabase.storage.from(bucketName).remove(fileNames);
  
  if (delError) {
    console.error(`Failed to delete from ${bucketName}:`, delError.message);
    return;
  }
  
  console.log(`Successfully deleted ${delData?.length || 0} files from ${bucketName}.`);
}

async function main() {
  const buckets = ['client-logos', 'attachments', 'ticket-attachments', 'avatars'];
  for (const b of buckets) {
    await cleanBucket(b);
  }
}

main().catch(console.error);
