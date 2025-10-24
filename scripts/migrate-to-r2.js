/**
 * Storage Migration Script
 *
 * Migrates materials from Supabase to Cloudflare R2 to reduce bandwidth costs
 * Run this manually or set up as a cron job
 *
 * Usage:
 *   node scripts/migrate-to-r2.js [OPTIONS]
 *
 * Options:
 *   --dry-run          Show what would be migrated without actually migrating
 *   --limit=N          Migrate only N materials (default: all)
 *   --popular-first    Prioritize high-bandwidth files (popular + large files)
 *   --force            Migrate even if R2 is not configured (will fail, but useful for testing)
 *
 * Migration Strategies:
 *   Default:         Old files (>60 days, <5 downloads OR >10MB)
 *   --popular-first: High bandwidth impact files (>10 downloads OR >5MB)
 */

import { config } from 'dotenv';
config();

import { findMigrationCandidates, migrateFileToR2, getStorageStats } from '../lib/storage/storage-manager.js';
import { isR2Configured } from '../lib/storage/r2-client.js';
import { createClient } from '@supabase/supabase-js';

// Lazy-initialize Supabase client to ensure env vars are loaded
let supabase = null;

function getSupabaseClient() {
  if (!supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const popularFirst = args.includes('--popular-first');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

async function runMigration() {
  console.log('🚀 Storage Migration Script\n');
  console.log('================================\n');

  // Check R2 configuration
  if (!isR2Configured() && !force) {
    console.log('❌ R2 is not configured.');
    console.log('\nTo set up R2:');
    console.log('1. Go to https://dash.cloudflare.com > R2');
    console.log('2. Create a bucket (e.g., "jkuat-materials")');
    console.log('3. Create API token with R2 read/write permissions');
    console.log('4. Add credentials to .env file:');
    console.log('   R2_ACCOUNT_ID=your_account_id');
    console.log('   R2_ACCESS_KEY_ID=your_access_key');
    console.log('   R2_SECRET_ACCESS_KEY=your_secret_key');
    console.log('   R2_BUCKET_NAME=jkuat-materials');
    console.log('\nRun with --force to test migration logic without R2.\n');
    return;
  }

  // Get current storage stats
  console.log('📊 Current Storage Statistics:\n');
  const stats = await getStorageStats();
  console.log(`   Supabase: ${stats.supabaseSizeMB} MB (${stats.supabaseCount} files)`);
  console.log(`   R2:       ${stats.r2SizeMB} MB (${stats.r2Count} files)`);
  console.log(`   Total:    ${stats.totalSizeMB} MB (${stats.totalCount} files)`);
  console.log(`\n   Supabase Usage: ${((stats.supabaseSizeMB / 1024) * 100).toFixed(1)}% of 1GB free tier\n`);

  // Find materials eligible for migration
  console.log('🔍 Finding migration candidates...\n');

  let candidates;
  if (popularFirst) {
    console.log('📊 Using BANDWIDTH-FOCUSED strategy (--popular-first)\n');
    candidates = await findHighBandwidthFiles();
  } else {
    console.log('📅 Using AGE-BASED strategy (default)\n');
    candidates = await findMigrationCandidates();
  }

  if (candidates.length === 0) {
    console.log('✅ No materials need migration at this time.\n');
    if (popularFirst) {
      console.log('Bandwidth-focused criteria:');
      console.log('   • More than 10 downloads (popular)');
      console.log('   • OR larger than 5MB (bandwidth-heavy)');
    } else {
      console.log('Age-based criteria:');
      console.log('   • Older than 60 days');
      console.log('   • Less than 5 downloads OR larger than 10MB');
    }
    console.log('   • Currently stored in Supabase\n');
    return;
  }

  console.log(`Found ${candidates.length} materials eligible for migration:\n`);

  // Apply limit if specified
  const materialsToMigrate = limit ? candidates.slice(0, limit) : candidates;

  // Display candidates
  materialsToMigrate.forEach((material, index) => {
    const sizeMB = ((material.file_size || 0) / (1024 * 1024)).toFixed(2);
    const age = Math.floor((Date.now() - new Date(material.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const downloads = material.download_count || 0;

    console.log(`   ${index + 1}. ${material.title}`);
    console.log(`      Size: ${sizeMB} MB | Age: ${age} days | Downloads: ${downloads}`);
  });

  console.log(`\nWill migrate ${materialsToMigrate.length} materials.`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No actual migration will occur.\n');

    const totalSizeMB = materialsToMigrate.reduce((sum, m) => {
      return sum + ((m.file_size || 0) / (1024 * 1024));
    }, 0);

    console.log(`   Total size to migrate: ${totalSizeMB.toFixed(2)} MB`);
    console.log(`   New Supabase usage: ${(stats.supabaseSizeMB - totalSizeMB).toFixed(2)} MB`);
    console.log(`   New R2 usage: ${(stats.r2SizeMB + totalSizeMB).toFixed(2)} MB\n`);
    return;
  }

  // Confirm before proceeding
  console.log('\n⚠️  This will move files from Supabase to R2.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Perform migration
  console.log('🔄 Starting migration...\n');

  let successCount = 0;
  let failCount = 0;
  let totalSizeMigrated = 0;

  for (let i = 0; i < materialsToMigrate.length; i++) {
    const material = materialsToMigrate[i];
    const sizeMB = ((material.file_size || 0) / (1024 * 1024)).toFixed(2);

    console.log(`   [${i + 1}/${materialsToMigrate.length}] Migrating: ${material.title} (${sizeMB} MB)`);

    try {
      const result = await migrateFileToR2(material);

      if (result.success) {
        // Update database
        const client = getSupabaseClient();
        const { error } = await client
          .from('materials')
          .update({
            storage_location: result.newLocation,
            storage_path: result.newPath,
            file_url: result.newUrl || material.file_url, // Keep old URL as fallback
          })
          .eq('id', material.id);

        if (error) {
          console.log(`      ❌ Failed to update database: ${error.message}`);
          failCount++;
        } else {
          console.log(`      ✅ Migrated successfully`);
          successCount++;
          totalSizeMigrated += parseFloat(sizeMB);
        }
      } else {
        console.log(`      ❌ Migration failed: ${result.error}`);
        failCount++;
      }
    } catch (error) {
      console.log(`      ❌ Error: ${error.message}`);
      failCount++;
    }

    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Final summary
  console.log('\n================================');
  console.log('📊 Migration Summary\n');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total migrated: ${totalSizeMigrated.toFixed(2)} MB`);

  // Get updated stats
  const newStats = await getStorageStats();
  console.log(`\n   New Supabase usage: ${newStats.supabaseSizeMB} MB (${((newStats.supabaseSizeMB / 1024) * 100).toFixed(1)}%)`);
  console.log(`   New R2 usage: ${newStats.r2SizeMB} MB`);
  console.log(`\n   Space freed on Supabase: ${(stats.supabaseSizeMB - newStats.supabaseSizeMB).toFixed(2)} MB\n`);

  console.log('✨ Migration complete!\n');
}

/**
 * Find high-bandwidth files for migration
 * Prioritizes files that consume the most bandwidth:
 * - Popular files (high download count)
 * - Large files (high file size)
 */
async function findHighBandwidthFiles() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('materials')
      .select('id, title, file_size, created_at, storage_location, storage_path, download_count, file_url, type')
      .or(`storage_location.is.null,storage_location.eq.supabase`);

    if (error) throw error;

    // Filter and sort by bandwidth impact
    const candidates = data
      .filter(material => {
        const downloadCount = material.download_count || 0;
        const sizeMB = (material.file_size || 0) / (1024 * 1024);

        // Include if:
        // - Popular (>10 downloads) OR
        // - Large file (>5MB)
        return downloadCount > 10 || sizeMB > 5;
      })
      .map(material => ({
        ...material,
        bandwidthScore: calculateBandwidthScore(material),
      }))
      // Sort by bandwidth impact (highest first)
      .sort((a, b) => b.bandwidthScore - a.bandwidthScore);

    return candidates;
  } catch (error) {
    console.error('Find high-bandwidth files error:', error);
    return [];
  }
}

/**
 * Calculate bandwidth score for prioritization
 * Higher score = more bandwidth consumption
 */
function calculateBandwidthScore(material) {
  const downloads = material.download_count || 0;
  const sizeMB = (material.file_size || 0) / (1024 * 1024);

  // Score = downloads × sizeMB
  // This represents total bandwidth consumed
  // Example: 50 downloads × 4MB = 200 bandwidth score
  return downloads * sizeMB;
}

// Run migration
runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
