/**
 * Full Migration Script: Supabase Storage → Cloudflare R2
 *
 * Migrates ALL existing PDFs from Supabase Storage to R2 (no filtering)
 * Use this for clean migration when you have no active users.
 *
 * Run with: node scripts/migrate-all-to-r2.js
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🚀 Full Migration: Supabase Storage → R2\n');
  console.log('='.repeat(60) + '\n');

  // Check R2 configuration
  if (!isR2Configured()) {
    console.error('❌ R2 is not configured. Please add R2 credentials to .env file:');
    console.error('   - R2_ACCOUNT_ID');
    console.error('   - R2_ACCESS_KEY_ID');
    console.error('   - R2_SECRET_ACCESS_KEY');
    console.error('   - R2_BUCKET_NAME\n');
    process.exit(1);
  }

  console.log('✅ R2 is configured\n');

  // Get current storage statistics
  console.log('📊 Current Storage Statistics:\n');
  const statsBefore = await getStorageStats();
  console.log(`   Supabase: ${statsBefore.supabaseCount} files (${statsBefore.supabaseSizeMB} MB)`);
  console.log(`   R2:       ${statsBefore.r2Count} files (${statsBefore.r2SizeMB} MB)`);
  console.log(`   Total:    ${statsBefore.totalCount} files (${statsBefore.totalSizeMB} MB)\n`);

  // Find ALL materials in Supabase Storage
  const { data: materials, error } = await supabase
    .from('materials')
    .select('id, title, file_url, storage_path, storage_location, type, file_size')
    .or('storage_location.is.null,storage_location.eq.supabase')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching materials:', error);
    process.exit(1);
  }

  if (!materials || materials.length === 0) {
    console.log('✅ No materials to migrate. All files are already in R2.\n');
    process.exit(0);
  }

  console.log(`📦 Found ${materials.length} materials to migrate:\n`);

  // Display first 5 materials as preview
  const preview = materials.slice(0, 5);
  preview.forEach((m, idx) => {
    const sizeMB = ((m.file_size || 0) / (1024 * 1024)).toFixed(2);
    console.log(`   ${idx + 1}. ${m.title} (${sizeMB} MB)`);
  });

  if (materials.length > 5) {
    console.log(`   ... and ${materials.length - 5} more\n`);
  } else {
    console.log('');
  }

  // Confirm before proceeding
  console.log('⚠️  This will migrate ALL files from Supabase to R2.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Migrate each material
  console.log('🔄 Starting migration...\n');

  let successCount = 0;
  let failureCount = 0;
  const failures = [];
  let totalSizeMigrated = 0;

  for (let i = 0; i < materials.length; i++) {
    const material = materials[i];
    const progress = `[${i + 1}/${materials.length}]`;
    const sizeMB = ((material.file_size || 0) / (1024 * 1024)).toFixed(2);

    console.log(`${progress} ${material.title} (${sizeMB} MB)`);

    try {
      // Migrate file to R2
      const result = await migrateFileToR2(material);

      if (result.success) {
        // Update database record
        const { error: updateError } = await supabase
          .from('materials')
          .update({
            file_url: result.newUrl,
            storage_location: result.newLocation,
            storage_path: result.newPath,
          })
          .eq('id', material.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        console.log(`   ✅ Migrated successfully\n`);
        successCount++;
        totalSizeMigrated += parseFloat(sizeMB);
      } else {
        throw new Error(result.error || 'Migration failed');
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}\n`);
      failureCount++;
      failures.push({
        id: material.id,
        title: material.title,
        error: error.message,
      });
    }

    // Add a small delay to avoid rate limiting
    if (i < materials.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successfully migrated: ${successCount} files (${totalSizeMigrated.toFixed(2)} MB)`);
  console.log(`❌ Failed migrations: ${failureCount} files`);

  if (failures.length > 0) {
    console.log('\n❌ Failed migrations:');
    failures.forEach((f, idx) => {
      console.log(`   ${idx + 1}. ${f.title} (ID: ${f.id})`);
      console.log(`      Error: ${f.error}`);
    });
  }

  // Get updated statistics
  console.log('\n📊 Updated Storage Statistics:\n');
  const statsAfter = await getStorageStats();
  console.log(`   Supabase: ${statsAfter.supabaseCount} files (${statsAfter.supabaseSizeMB} MB)`);
  console.log(`   R2:       ${statsAfter.r2Count} files (${statsAfter.r2SizeMB} MB)`);
  console.log(`   Total:    ${statsAfter.totalCount} files (${statsAfter.totalSizeMB} MB)\n`);

  console.log(`   📉 Space freed on Supabase: ${(statsBefore.supabaseSizeMB - statsAfter.supabaseSizeMB).toFixed(2)} MB`);
  console.log(`   📈 Space used on R2: ${(statsAfter.r2SizeMB - statsBefore.r2SizeMB).toFixed(2)} MB\n`);

  console.log('✅ Migration complete!\n');

  if (failureCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
