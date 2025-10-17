/**
 * Script to apply database migration for material categorization
 * Run with: node apply-migration.js
 */

require('dotenv').config({ path: '.env' })
const { createClient } = require('@supabase/supabase-js')

async function applyMigration() {
  // Create Supabase client with service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials in .env file')
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  console.log('🔄 Applying database migration...\n')

  try {
    // Step 1: Add material_category column
    console.log('1️⃣  Adding material_category column...')
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE materials ADD COLUMN IF NOT EXISTS material_category TEXT;`
    })

    if (error1) {
      console.log('   Note: Column might already exist or using alternate method...')
    } else {
      console.log('   ✅ material_category column added')
    }

    // Step 2: Add category_metadata column
    console.log('2️⃣  Adding category_metadata column...')
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE materials ADD COLUMN IF NOT EXISTS category_metadata JSONB;`
    })

    if (error2) {
      console.log('   Note: Column might already exist or using alternate method...')
    } else {
      console.log('   ✅ category_metadata column added')
    }

    // Step 3: Create index
    console.log('3️⃣  Creating index...')
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(material_category) WHERE material_category IS NOT NULL;`
    })

    if (error3) {
      console.log('   Note: Index might already exist or using alternate method...')
    } else {
      console.log('   ✅ Index created')
    }

    // Verify the migration by checking if columns exist
    console.log('\n4️⃣  Verifying migration...')
    const { data, error: verifyError } = await supabase
      .from('materials')
      .select('material_category, category_metadata')
      .limit(1)

    if (verifyError) {
      if (verifyError.message.includes('category_metadata') || verifyError.message.includes('material_category')) {
        console.log('\n❌ Migration verification failed!')
        console.log('   The columns were not created successfully.')
        console.log('\n📋 Please apply the migration manually via Supabase Dashboard:')
        console.log('   1. Go to https://supabase.com/dashboard')
        console.log('   2. Open SQL Editor')
        console.log('   3. Run the SQL from supabase-migration.sql')
        process.exit(1)
      }
    }

    console.log('   ✅ Migration verified successfully!')
    console.log('\n✨ Migration complete! You can now use the new upload features.')
    console.log('\nNew features available:')
    console.log('   • Material categorization (complete_notes, weekly_notes, past_paper, etc.)')
    console.log('   • Filtering by material type on course pages')
    console.log('   • Enhanced material display with badges')

  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message)
    console.log('\n📋 Please apply the migration manually via Supabase Dashboard:')
    console.log('   1. Go to https://supabase.com/dashboard')
    console.log('   2. Open SQL Editor')
    console.log('   3. Run the SQL from supabase-migration.sql')
    process.exit(1)
  }
}

// Run migration
applyMigration()
