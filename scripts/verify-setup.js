const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifySetup() {
  console.log('🔍 Verifying Supabase setup...\n')

  // Check storage bucket
  console.log('1. Checking storage bucket "course pdfs"...')
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()

  if (bucketError) {
    console.error('❌ Error listing buckets:', bucketError.message)
  } else {
    const coursePdfsBucket = buckets.find(b => b.name === 'course pdfs')
    if (coursePdfsBucket) {
      console.log('✅ Storage bucket "course pdfs" exists')
      console.log(`   Public: ${coursePdfsBucket.public}`)
    } else {
      console.log('❌ Storage bucket "course pdfs" NOT FOUND')
      console.log('   Available buckets:', buckets.map(b => b.name).join(', '))
      console.log('\n   To create it, run:')
      console.log('   - Go to Supabase Dashboard → Storage')
      console.log('   - Create new bucket named "course pdfs"')
      console.log('   - Make it public if you want direct file access')
    }
  }

  // Check tables
  console.log('\n2. Checking database tables...')

  // Check courses table
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, course_code, course_name')
    .limit(1)

  if (coursesError) {
    console.log('❌ "courses" table:', coursesError.message)
  } else {
    console.log('✅ "courses" table exists')
    if (courses.length > 0) {
      console.log(`   Sample: ${courses[0].course_code} - ${courses[0].course_name}`)
    } else {
      console.log('   ⚠️  Table is empty - you need to add courses')
    }
  }

  // Check topics table
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('id, topic_name')
    .limit(1)

  if (topicsError) {
    console.log('❌ "topics" table:', topicsError.message)
  } else {
    console.log('✅ "topics" table exists')
    if (topics.length === 0) {
      console.log('   ⚠️  Table is empty - topics are optional but helpful')
    }
  }

  // Check materials table
  const { data: materials, error: materialsError } = await supabase
    .from('materials')
    .select('id, title, status')
    .limit(1)

  if (materialsError) {
    console.log('❌ "materials" table:', materialsError.message)
  } else {
    console.log('✅ "materials" table exists')
  }

  console.log('\n3. Summary:')
  const hasErrors = bucketError || coursesError || topicsError || materialsError ||
                    !buckets?.find(b => b.name === 'course pdfs') ||
                    courses?.length === 0

  if (hasErrors) {
    console.log('⚠️  Some setup steps are missing. See details above.')
    console.log('\nNext steps:')
    console.log('1. Ensure storage bucket "course pdfs" exists in Supabase Dashboard')
    console.log('2. Run the seed script to populate courses: node scripts/seed.js')
  } else {
    console.log('✅ All checks passed! Upload system is ready.')
  }
}

verifySetup().catch(console.error)
