/**
 * Test R2 Connection Script
 *
 * Quick test to verify R2 credentials are working
 */

import { config } from 'dotenv';
config();

import { isR2Configured, r2FileExists, uploadToR2 } from '../lib/storage/r2-client.js';

async function testR2Connection() {
  console.log('🔍 Testing R2 Connection...\n');

  // Test 1: Check configuration
  console.log('1️⃣  Checking R2 Configuration...');
  const configured = isR2Configured();

  if (!configured) {
    console.log('❌ R2 is not configured. Please check .env file.');
    return;
  }

  console.log('✅ R2 credentials found in .env\n');
  console.log(`   Account ID: ${process.env.R2_ACCOUNT_ID?.substring(0, 10)}...`);
  console.log(`   Bucket: ${process.env.R2_BUCKET_NAME}`);
  console.log(`   Public URL: ${process.env.R2_PUBLIC_URL}\n`);

  // Test 2: Upload a small test file
  console.log('2️⃣  Testing file upload to R2...');

  try {
    const testContent = Buffer.from('Hello from JKUAT Course Hub! This is a test file.');
    const testFileName = `test-${Date.now()}.txt`;

    const result = await uploadToR2(testContent, testFileName, 'text/plain');

    if (result.success) {
      console.log('✅ Upload successful!');
      console.log(`   Key: ${result.key}`);
      console.log(`   URL: ${result.url || 'Generated on demand'}\n`);

      // Test 3: Check if file exists
      console.log('3️⃣  Verifying file exists in R2...');
      const exists = await r2FileExists(testFileName);

      if (exists) {
        console.log('✅ File verified in R2!\n');
      } else {
        console.log('⚠️  File upload succeeded but verification failed.\n');
      }

      console.log('✅ R2 CONNECTION TEST PASSED!\n');
      console.log('🎉 Your R2 bucket is ready to use.\n');
      console.log('Next steps:');
      console.log('   1. Run migration script to move files');
      console.log('   2. Check admin dashboard for R2 stats');
      console.log('   3. Monitor bandwidth savings\n');

    } else {
      console.log('❌ Upload failed');
    }

  } catch (error) {
    console.error('❌ R2 Connection Test Failed:', error.message);
    console.error('\nPossible issues:');
    console.error('   - Check R2 credentials are correct');
    console.error('   - Verify bucket name matches');
    console.error('   - Ensure API token has read/write permissions');
    console.error('   - Check Cloudflare account is active\n');
  }
}

// Run test
testR2Connection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
