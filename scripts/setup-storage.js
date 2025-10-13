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

async function setupStorage() {
  console.log('🚀 Setting up Supabase storage...\n')

  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets()
  const coursePdfsBucket = buckets?.find(b => b.name === 'course pdfs')

  if (coursePdfsBucket) {
    console.log('✅ Storage bucket "course pdfs" already exists')
    return
  }

  // Create bucket
  console.log('📦 Creating storage bucket "course pdfs"...')
  const { data, error } = await supabase.storage.createBucket('course pdfs', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
  })

  if (error) {
    console.error('❌ Error creating bucket:', error.message)
    console.log('\n⚠️  You may need to create the bucket manually:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to Storage section')
    console.log('3. Click "New Bucket"')
    console.log('4. Name: course pdfs')
    console.log('5. Make it Public')
    console.log('6. Set file size limit to 50MB')
    process.exit(1)
  }

  console.log('✅ Storage bucket "course pdfs" created successfully!')
  console.log('   Public: Yes')
  console.log('   Max file size: 50MB')
  console.log('   Allowed types: PDF, DOCX, PPTX')
}

setupStorage().catch(console.error)
