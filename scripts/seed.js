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

// Sample courses for JKUAT First Year CS
const courses = [
  {
    course_code: 'MAT 2100',
    course_name: 'Calculus I',
    description: 'Introduction to differential and integral calculus',
    department: 'Mathematics',
    semester: 1,
    year: 1
  },
  {
    course_code: 'CSC 100',
    course_name: 'Introduction to Computer Science',
    description: 'Fundamentals of computer science and programming',
    department: 'Computer Science',
    semester: 1,
    year: 1
  },
  {
    course_code: 'PHY 100',
    course_name: 'Physics I',
    description: 'Mechanics, heat, and thermodynamics',
    department: 'Physics',
    semester: 1,
    year: 1
  },
  {
    course_code: 'ENG 100',
    course_name: 'Communication Skills',
    description: 'Written and oral communication in professional contexts',
    department: 'Languages',
    semester: 1,
    year: 1
  },
  {
    course_code: 'CSC 110',
    course_name: 'Programming I',
    description: 'Introduction to programming using Python',
    department: 'Computer Science',
    semester: 1,
    year: 1
  }
]

// Sample topics for Calculus I
const calculusTopics = [
  { week_number: 1, topic_name: 'Functions and Limits' },
  { week_number: 2, topic_name: 'Derivatives and Differentiation Rules' },
  { week_number: 3, topic_name: 'Chain Rule and Implicit Differentiation' },
  { week_number: 4, topic_name: 'Applications of Derivatives' },
  { week_number: 5, topic_name: 'Integrals and Antiderivatives' },
  { week_number: 6, topic_name: 'Fundamental Theorem of Calculus' },
  { week_number: 7, topic_name: 'Integration Techniques' },
  { week_number: 8, topic_name: 'Applications of Integration' }
]

// Sample topics for Intro to CS
const csTopics = [
  { week_number: 1, topic_name: 'Introduction to Computing' },
  { week_number: 2, topic_name: 'Computer Hardware and Software' },
  { week_number: 3, topic_name: 'Algorithms and Problem Solving' },
  { week_number: 4, topic_name: 'Data Representation' },
  { week_number: 5, topic_name: 'Operating Systems Basics' },
  { week_number: 6, topic_name: 'Networks and Internet' },
  { week_number: 7, topic_name: 'Databases and Information Systems' },
  { week_number: 8, topic_name: 'Ethics and Security' }
]

// Sample topics for Programming I
const programmingTopics = [
  { week_number: 1, topic_name: 'Python Basics and Variables' },
  { week_number: 2, topic_name: 'Control Structures (if/else)' },
  { week_number: 3, topic_name: 'Loops (for/while)' },
  { week_number: 4, topic_name: 'Functions and Modules' },
  { week_number: 5, topic_name: 'Lists and Tuples' },
  { week_number: 6, topic_name: 'Dictionaries and Sets' },
  { week_number: 7, topic_name: 'File Handling' },
  { week_number: 8, topic_name: 'Object-Oriented Programming Basics' }
]

async function seedDatabase() {
  console.log('🌱 Seeding database...\n')

  try {
    // Check if courses already exist
    const { data: existingCourses } = await supabase
      .from('courses')
      .select('id')
      .limit(1)

    if (existingCourses && existingCourses.length > 0) {
      console.log('ℹ️  Database already has courses. Skipping seed.')
      console.log('   To re-seed, delete existing data first.\n')
      return
    }

    // Insert courses
    console.log('📚 Inserting courses...')
    const { data: insertedCourses, error: coursesError } = await supabase
      .from('courses')
      .insert(courses)
      .select()

    if (coursesError) {
      console.error('❌ Error inserting courses:', coursesError.message)
      return
    }

    console.log(`✅ Inserted ${insertedCourses.length} courses`)

    // Find specific courses for topic insertion
    const calculusCourse = insertedCourses.find(c => c.course_code === 'MAT 2100')
    const csCourse = insertedCourses.find(c => c.course_code === 'CSC 100')
    const programmingCourse = insertedCourses.find(c => c.course_code === 'CSC 110')

    // Insert topics
    console.log('\n📝 Inserting topics...')
    const topicsToInsert = []

    if (calculusCourse) {
      calculusTopics.forEach(topic => {
        topicsToInsert.push({ ...topic, course_id: calculusCourse.id })
      })
    }

    if (csCourse) {
      csTopics.forEach(topic => {
        topicsToInsert.push({ ...topic, course_id: csCourse.id })
      })
    }

    if (programmingCourse) {
      programmingTopics.forEach(topic => {
        topicsToInsert.push({ ...topic, course_id: programmingCourse.id })
      })
    }

    const { data: insertedTopics, error: topicsError } = await supabase
      .from('topics')
      .insert(topicsToInsert)
      .select()

    if (topicsError) {
      console.error('❌ Error inserting topics:', topicsError.message)
      return
    }

    console.log(`✅ Inserted ${insertedTopics.length} topics`)

    // Summary
    console.log('\n🎉 Database seeded successfully!')
    console.log('\nCourses added:')
    insertedCourses.forEach(course => {
      console.log(`   - ${course.course_code}: ${course.course_name}`)
    })

    console.log('\n✅ Upload system is ready!')
    console.log('\nNext steps:')
    console.log('1. Ensure storage bucket "course pdfs" exists in Supabase Dashboard')
    console.log('2. Run: npm run dev')
    console.log('3. Visit: http://localhost:3000/upload')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

seedDatabase().catch(console.error)
