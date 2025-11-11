/**
 * API endpoint to get material metadata
 * Used by the viewer page to display material information
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    // Get material from database with course information
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: material, error } = await supabase
      .from('materials')
      .select(`
        id,
        title,
        description,
        type,
        material_category,
        created_at,
        uploaded_by,
        courses!course_id (
          id,
          course_name,
          course_code
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!material) {
      return Response.json({ error: 'Material not found' }, { status: 404 })
    }

    return Response.json(material)
  } catch (error) {
    console.error('Error fetching material metadata:', error)
    return Response.json(
      { error: error.message || 'Failed to fetch material' },
      { status: error.code === 'PGRST116' ? 404 : 500 }
    )
  }
}
