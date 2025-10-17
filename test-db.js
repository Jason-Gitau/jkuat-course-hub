const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key exists:', !!supabaseKey)

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabase() {
  console.log('\n=== Testing Database Connection ===\n')

  // Test 1: Count courses
  console.log('1. Counting courses...')
  const { count: coursesCount, error: countError } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('Error counting courses:', countError)
  } else {
    console.log(`Total courses in database: ${coursesCount}`)
  }

  // Test 2: Fetch all courses
  console.log('\n2. Fetching all courses...')
  const { data: courses, error: fetchError } = await supabase
    .from('courses')
    .select('id, course_code, course_name, description, credits')
    .order('course_code')

  if (fetchError) {
    console.error('Error fetching courses:', fetchError)
  } else {
    console.log(`Fetched ${courses?.length || 0} courses:`)
    courses?.forEach((course, index) => {
      console.log(`  ${index + 1}. [${course.course_code}] ${course.course_name}`)
    })
  }

  // Test 3: Count materials
  console.log('\n3. Counting materials...')
  const { count: materialsCount, error: materialsError } = await supabase
    .from('materials')
    .select('*', { count: 'exact', head: true })

  if (materialsError) {
    console.error('Error counting materials:', materialsError)
  } else {
    console.log(`Total materials: ${materialsCount}`)
  }

  // Test 4: Count approved materials
  console.log('\n4. Counting approved materials...')
  const { count: approvedCount, error: approvedError } = await supabase
    .from('materials')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  if (approvedError) {
    console.error('Error counting approved materials:', approvedError)
  } else {
    console.log(`Approved materials: ${approvedCount}`)
  }

  console.log('\n=== Test Complete ===\n')
}

testDatabase()
