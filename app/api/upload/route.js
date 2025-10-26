import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { uploadFile } from '@/lib/storage/storage-manager.js'
import { getServiceRoleClient } from '@/lib/supabase/server.js'

export async function POST(req) {
  // Use centralized service role client for better connection pooling
  const supabase = getServiceRoleClient()

  try {
    const formData = await req.formData()

    // Extract form data
    const file = formData.get('file')
    const courseId = formData.get('course_id')
    const topicId = formData.get('topic_id')
    const title = formData.get('title')
    const description = formData.get('description')
    const uploaderName = formData.get('uploader_name') || 'Anonymous'
    const materialCategory = formData.get('material_category')
    const categoryMetadata = formData.get('category_metadata')
    const weekNumber = formData.get('week_number')

    // Get authenticated user from the request
    const authHeader = req.headers.get('cookie')
    let userId = null
    let uploaderYear = null
    let uploaderCourseId = null

    if (authHeader) {
      // Create client with cookies for auth
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      const { data: { user } } = await userSupabase.auth.getUser()

      if (user) {
        userId = user.id

        // Get user's profile for year and course
        const { data: profile } = await userSupabase
          .from('profiles')
          .select('year_of_study, course_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          uploaderYear = profile.year_of_study
          uploaderCourseId = profile.course_id
        }
      }
    }
    
    // Validate
    if (!file || !courseId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large (max 50MB)' },
        { status: 400 }
      )
    }
    
    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOCX, PPT allowed' },
        { status: 400 }
      )
    }
    
    // Convert file to buffer for compression
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Upload using storage manager (handles compression + R2 fallback)
    const uploadResult = await uploadFile(fileBuffer, {
      fileName: file.name,
      courseId: courseId,
      contentType: file.type,
      compressPDF: true, // Enable PDF compression
    })

    if (!uploadResult || !uploadResult.url) {
      return NextResponse.json(
        { error: 'Upload failed' },
        { status: 500 }
      )
    }

    const { url: publicUrl, storageLocation, storagePath, fileSize, compressed, compressionStats } = uploadResult

    // Log compression info
    if (compressed) {
      console.log('✅ PDF compressed:', compressionStats)
    }
    
    // Parse category metadata if provided
    let parsedMetadata = null
    if (categoryMetadata) {
      try {
        parsedMetadata = JSON.parse(categoryMetadata)
      } catch (e) {
        console.error('Invalid category metadata JSON:', e)
      }
    }

    // Save metadata to database and fetch course/topic data in one query using JOIN
    const { data: material, error: dbError } = await supabase
      .from('materials')
      .insert({
        course_id: courseId,
        topic_id: topicId || null,
        title,
        description,
        type: getFileType(file.type),
        file_url: publicUrl,
        file_size: fileSize, // Use actual uploaded file size (after compression)
        storage_location: storageLocation, // 'supabase' or 'r2'
        storage_path: storagePath, // Path/key in storage
        uploaded_by: uploaderName,
        upload_source: 'class_rep',
        status: 'approved', // TESTING: Auto-approve materials (bypass admin approval)
        material_category: materialCategory || null,
        category_metadata: parsedMetadata,
        week_number: weekNumber ? parseInt(weekNumber) : null,
        user_id: userId,
        uploader_year: uploaderYear,
        uploader_course_id: uploaderCourseId
      })
      .select(`
        id,
        title,
        material_category,
        category_metadata,
        week_number,
        courses:course_id (
          course_name
        ),
        topics:topic_id (
          topic_name,
          unit_code,
          year,
          semester
        )
      `)
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: `Failed to save material: ${dbError.message}` },
        { status: 500 }
      )
    }

    // Return material data for client-side processing
    // Client will generate the share message to avoid blocking the response
    return NextResponse.json({
      success: true,
      material: {
        id: material.id,
        title: material.title,
        material_category: material.material_category,
        category_metadata: material.category_metadata,
        week_number: material.week_number,
        course: material.courses,
        topic: material.topics,
        uploaded_by: uploaderName
      }
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}

function getFileType(mimeType) {
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('word')) return 'docx'
  if (mimeType.includes('presentation')) return 'pptx'
  return 'other'
}