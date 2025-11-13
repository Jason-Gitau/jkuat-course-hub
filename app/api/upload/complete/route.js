import { createClient } from '@supabase/supabase-js'
import { getServiceRoleClient } from '@/lib/supabase/server.js'

export const runtime = 'nodejs'

/**
 * Complete an upload by saving metadata to the database
 * Called after successful direct-to-R2 upload
 *
 * POST /api/upload/complete
 * Body: {
 *   key: string,               // R2 file key
 *   fileName: string,          // Original filename
 *   fileSize: number,          // File size in bytes
 *   contentType: string,       // MIME type
 *   courseId: string,          // Course ID
 *   topicId: string,           // Topic ID
 *   title: string,             // Material title
 *   description: string,       // Material description
 *   uploaderName: string,      // Name of uploader
 *   materialCategory: string,  // Material type (notes, past_paper, etc.)
 *   categoryMetadata: object,  // Category-specific metadata
 *   weekNumber: number         // Week number if applicable
 * }
 * Response: { success: true, material: {...} }
 */
export async function POST(req) {
  const supabase = getServiceRoleClient()

  try {
    const body = await req.json()
    const {
      key,
      fileName,
      fileSize,
      contentType,
      courseId,
      topicId,
      title,
      description,
      uploaderName,
      materialCategory,
      categoryMetadata,
      weekNumber
    } = body

    // Validate required fields
    if (!key || !courseId || !title) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const authHeader = req.headers.get('cookie')
    let userId = null
    let uploaderYear = null
    let uploaderCourseId = null

    if (authHeader) {
      try {
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
      } catch (err) {
        console.warn('Auth check failed:', err)
      }
    }

    // Construct R2 public URL
    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : null

    // Get file type from content type
    function getFileType(mimeType) {
      if (mimeType.includes('pdf')) return 'pdf'
      if (mimeType.includes('word')) return 'docx'
      if (mimeType.includes('presentation')) return 'pptx'
      if (mimeType.includes('image')) return 'image'
      return 'other'
    }

    // Save metadata to database
    const { data: material, error: dbError } = await supabase
      .from('materials')
      .insert({
        course_id: courseId,
        topic_id: topicId || null,
        title,
        description: description || null,
        type: getFileType(contentType),
        file_url: publicUrl,
        file_size: fileSize,
        storage_location: 'r2',
        storage_path: key,
        uploaded_by: uploaderName || 'Anonymous',
        upload_source: 'direct_r2',
        status: 'approved', // TESTING: Auto-approve materials
        material_category: materialCategory || null,
        category_metadata: categoryMetadata || null,
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
        courses!course_id (
          course_name
        ),
        topics!topic_id (
          topic_name,
          unit_code,
          year,
          semester
        )
      `)
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return Response.json(
        { error: `Failed to save material: ${dbError.message}` },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      material: {
        id: material.id,
        title: material.title,
        material_category: material.material_category,
        category_metadata: material.category_metadata,
        week_number: material.week_number,
        course: material.courses,
        topic: material.topics,
        uploaded_by: uploaderName || 'Anonymous'
      }
    })

  } catch (error) {
    console.error('Upload completion error:', error)
    return Response.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}
