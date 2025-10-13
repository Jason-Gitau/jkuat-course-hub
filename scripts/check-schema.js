const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('🔍 Checking table schemas...\n')

  // Try to insert a test record to see what columns exist
  console.log('Testing courses table...')
  const { error: courseError } = await supabase
    .from('courses')
    .select('*')
    .limit(1)

  if (courseError) {
    console.log('Error:', courseError.message)
  }

  // Try inserting minimal data
  const { data, error } = await supabase
    .from('courses')
    .insert({
      course_code: 'TEST',
      course_name: 'Test Course'
    })
    .select()

  if (error) {
    console.log('Insert error:', error.message)
    console.log('Details:', error.details)
    console.log('Hint:', error.hint)
  } else {
    console.log('✅ Test insert successful:', data)
    // Clean up
    if (data && data[0]) {
      await supabase.from('courses').delete().eq('id', data[0].id)
      console.log('Cleaned up test record')
    }
  }
}

checkSchema().catch(console.error)
