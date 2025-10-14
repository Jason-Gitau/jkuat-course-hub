import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req) {
  // Create service role client to bypass RLS for public uploads
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )

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
    
    // Upload to Supabase Storage
    const fileName = `${courseId}/${Date.now()}_${file.name}`
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('course pdfs')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('course pdfs')
      .getPublicUrl(fileName)
    
    // Parse category metadata if provided
    let parsedMetadata = null
    if (categoryMetadata) {
      try {
        parsedMetadata = JSON.parse(categoryMetadata)
      } catch (e) {
        console.error('Invalid category metadata JSON:', e)
      }
    }

    // Save metadata to database
    const { data: material, error: dbError } = await supabase
      .from('materials')
      .insert({
        course_id: courseId,
        topic_id: topicId || null,
        title,
        description,
        type: getFileType(file.type),
        file_url: publicUrl,
        file_size: file.size,
        uploaded_by: uploaderName,
        upload_source: 'class_rep',
        status: 'approved', // TESTING: Auto-approve materials (bypass admin approval)
        material_category: materialCategory || null,
        category_metadata: parsedMetadata,
        week_number: weekNumber ? parseInt(weekNumber) : null
      })
      .select('id, title')
      .single()
    
    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: `Failed to save material: ${dbError.message}` },
        { status: 500 }
      )
    }
    
    // Get course name for shareable message
    const { data: course } = await supabase
      .from('courses')
      .select('course_name, course_code')
      .eq('id', courseId)
      .single()
    
    const { data: topic } = topicId
      ? await supabase.from('topics').select('topic_name, unit_code, year, semester').eq('id', topicId).single()
      : { data: null }

    // Format material type for share message
    const formatMaterialType = () => {
      if (!materialCategory) return ''

      const typeLabels = {
        'complete_notes': 'Complete Semester Notes',
        'weekly_notes': 'Weekly Notes',
        'past_paper': 'Past Paper',
        'assignment': 'Assignment',
        'lab_guide': 'Lab Guide',
        'other': 'Material'
      }

      let typeStr = typeLabels[materialCategory] || 'Material'

      if (parsedMetadata) {
        if (parsedMetadata.week) typeStr += ` (Week ${parsedMetadata.week})`
        if (parsedMetadata.year) typeStr += ` (${parsedMetadata.year})`
        if (parsedMetadata.assignment_number) typeStr += ` #${parsedMetadata.assignment_number}`
      }

      return `Type: ${typeStr}\n`
    }

    // Format topic/unit information
    const formatTopicInfo = () => {
      if (!topic) return ''

      const unitLabel = topic.unit_code ? `${topic.unit_code} - ${topic.topic_name}` : topic.topic_name
      const yearSemInfo = topic.year && topic.semester
        ? ` (Year ${topic.year}, Semester ${topic.semester})`
        : ''
      const weekInfo = weekNumber ? `\nWeek: ${weekNumber}` : ''

      return `Unit: ${unitLabel}${yearSemInfo}${weekInfo}\n`
    }

    // Generate shareable message
    const shareMessage = `✅ New material uploaded!

Course: ${course.course_name} (${course.course_code})
${formatTopicInfo()}${formatMaterialType()}Material: ${title}

View: ${process.env.NEXT_PUBLIC_SITE_URL}/materials/${material.id}

All materials: ${process.env.NEXT_PUBLIC_SITE_URL}/courses/${courseId}

Uploaded by: ${uploaderName}`
    
    return NextResponse.json({
      success: true,
      materialId: material.id,
      shareMessage
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