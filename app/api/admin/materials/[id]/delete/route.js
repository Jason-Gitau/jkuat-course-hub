/**
 * Material Deletion API
 * Handles soft delete (hide) and hard delete (permanent) for materials
 * Admin-only endpoint with safety checks and audit logging
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check if user is logged in
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { deletionType, reason } = body; // 'soft' or 'hard'

    // Validate deletion type
    if (!deletionType || !['soft', 'hard'].includes(deletionType)) {
      return NextResponse.json({
        error: 'Invalid deletion type. Must be "soft" or "hard"'
      }, { status: 400 });
    }

    // Validate reason
    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({
        error: 'Deletion reason is required (minimum 10 characters)'
      }, { status: 400 });
    }

    // Get material details before deletion
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select(`
        id,
        title,
        download_count,
        view_count,
        course_id,
        topic_id,
        uploaded_by,
        file_url,
        storage_path,
        storage_location,
        courses!materials_course_id_fkey (course_name)
      `)
      .eq('id', id)
      .single();

    if (materialError || !material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Check if already deleted
    if (material.deleted_at) {
      return NextResponse.json({
        error: 'Material is already deleted'
      }, { status: 400 });
    }

    const serviceRole = getServiceRoleClient();

    if (deletionType === 'soft') {
      // SOFT DELETE: Mark as deleted but keep in database
      const { error: updateError } = await serviceRole
        .from('materials')
        .update({
          deleted_at: new Date().toISOString(),
          deletion_type: 'soft',
          deletion_reason: reason,
          deleted_by: user.id,
          download_count_at_deletion: material.download_count || 0,
          view_count_at_deletion: material.view_count || 0
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Log to audit trail
      await serviceRole.from('deletion_audit_log').insert({
        entity_type: 'material',
        entity_id: id,
        entity_title: material.title,
        deletion_type: 'soft',
        deletion_reason: reason,
        deleted_by: user.id,
        download_count_at_deletion: material.download_count || 0,
        view_count_at_deletion: material.view_count || 0
      });

      return NextResponse.json({
        success: true,
        message: 'Material soft deleted (moved to trash)',
        deletionType: 'soft',
        material: {
          id: material.id,
          title: material.title,
          downloads: material.download_count || 0,
          views: material.view_count || 0
        }
      });

    } else {
      // HARD DELETE: Permanently remove from database
      // First log to audit trail (before deletion)
      await serviceRole.from('deletion_audit_log').insert({
        entity_type: 'material',
        entity_id: id,
        entity_title: material.title,
        deletion_type: 'hard',
        deletion_reason: reason,
        deleted_by: user.id,
        download_count_at_deletion: material.download_count || 0,
        view_count_at_deletion: material.view_count || 0
      });

      // Delete from database
      const { error: deleteError } = await serviceRole
        .from('materials')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // TODO: Delete file from storage (Supabase/R2) in background
      // This should be handled by a separate cleanup job to avoid blocking the response

      return NextResponse.json({
        success: true,
        message: 'Material permanently deleted',
        deletionType: 'hard',
        material: {
          id: material.id,
          title: material.title,
          downloads: material.download_count || 0,
          views: material.view_count || 0
        }
      });
    }

  } catch (error) {
    console.error('Material deletion error:', error);
    return NextResponse.json(
      { error: `Failed to delete material: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check deletion impact (before deletion)
 * Returns stats about the material to show impact warnings
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check if user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get material with impact stats
    const { data: material, error } = await supabase
      .from('materials')
      .select(`
        id,
        title,
        download_count,
        view_count,
        file_size,
        created_at,
        courses!materials_course_id_fkey (course_name),
        topics!materials_topic_id_fkey (topic_name),
        profiles!materials_uploaded_by_fkey (full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Calculate impact metrics
    const impactMetrics = {
      downloads: material.download_count || 0,
      views: material.view_count || 0,
      fileSizeMB: material.file_size ? (material.file_size / (1024 * 1024)).toFixed(2) : 0,
      uploadedBy: material.profiles?.full_name || 'Unknown',
      course: material.courses?.course_name || 'Unknown',
      topic: material.topics?.topic_name || 'None',
      uploadDate: material.created_at,
      // Estimated users affected (rough estimate)
      estimatedUsersAffected: Math.max(
        material.download_count || 0,
        Math.floor((material.view_count || 0) / 3)
      )
    };

    return NextResponse.json({
      success: true,
      material: {
        id: material.id,
        title: material.title
      },
      impact: impactMetrics,
      warnings: {
        highDownloads: impactMetrics.downloads > 50,
        highViews: impactMetrics.views > 100,
        recentUpload: Date.now() - new Date(material.created_at).getTime() < 7 * 24 * 60 * 60 * 1000, // < 7 days
        message: impactMetrics.downloads > 50
          ? 'This material is popular and has been downloaded many times!'
          : impactMetrics.views > 100
          ? 'This material has been viewed many times!'
          : null
      }
    });

  } catch (error) {
    console.error('Get deletion impact error:', error);
    return NextResponse.json(
      { error: `Failed to get impact data: ${error.message}` },
      { status: 500 }
    );
  }
}
