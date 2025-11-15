/**
 * Material Deletion API
 * Handles soft delete (hide) and hard delete (permanent) for materials
 * Admin-only endpoint with safety checks and audit logging
 *
 * Route: /api/admin/materials/[id]/delete
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/server';
import { deleteFromR2 } from '@/lib/storage/r2-client';

export async function POST(request, { params }) {
  try {
    // Next.js 15: Access params directly without await for better Vercel edge compatibility
    const { id } = params;

    // Log request start for debugging
    console.log(`[DELETE API] POST request received for material ID: ${id}`);

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check if user is logged in
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(`[DELETE API] Authentication failed for material ${id}:`, userError?.message || 'No user');
      return NextResponse.json({
        error: 'Unauthorized',
        materialId: id,
        details: 'You must be logged in to perform this action'
      }, {
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      });
    }

    console.log(`[DELETE API] User authenticated: ${user.email} (${user.id})`);

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(`[DELETE API] Profile fetch error for user ${user.id}:`, profileError);
    }

    if (!profile || profile.role !== 'admin') {
      console.warn(`[DELETE API] Access denied for user ${user.email} - Role: ${profile?.role || 'none'}`);
      return NextResponse.json({
        error: 'Admin access required',
        materialId: id,
        details: 'You must be an admin to perform this action'
      }, {
        status: 403,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      });
    }

    console.log(`[DELETE API] Admin verified: ${profile.full_name} (${profile.role})`);

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
    console.log(`[DELETE API] Fetching material ${id} from database...`);
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
      console.error(`[DELETE API] Material not found: ${id}`, materialError);
      return NextResponse.json({
        error: 'Material not found',
        materialId: id,
        details: materialError?.message || 'The requested material does not exist'
      }, {
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      });
    }

    console.log(`[DELETE API] Material found: "${material.title}" (Downloads: ${material.download_count || 0}, Views: ${material.view_count || 0})`);

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

      console.log(`[DELETE API] ✅ Soft delete successful: "${material.title}" (ID: ${id})`);

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
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
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

      // Delete file from storage (R2 or Supabase)
      // Don't block response if storage deletion fails, but log it
      try {
        if (material.storage_location === 'r2' && material.storage_path) {
          // Delete from R2
          await deleteFromR2(material.storage_path);
          console.log(`✅ File deleted from R2: ${material.storage_path}`);
        } else if (material.storage_location === 'supabase' && material.file_url) {
          // Delete from Supabase storage
          // Extract path from URL or use storage_path
          const storagePath = material.storage_path || extractPathFromUrl(material.file_url);
          if (storagePath) {
            const { error: storageError } = await supabase
              .storage
              .from('materials')
              .remove([storagePath]);

            if (storageError) {
              console.warn(`⚠️ Failed to delete from Supabase: ${storageError.message}`);
            } else {
              console.log(`✅ File deleted from Supabase: ${storagePath}`);
            }
          }
        }
      } catch (storageError) {
        // Log storage deletion errors but don't fail the entire operation
        console.error(`⚠️ Storage deletion error for ${material.title}:`, storageError.message);
        // Material is already deleted from database, so continue
      }

      console.log(`[DELETE API] ✅ Hard delete successful: "${material.title}" (ID: ${id})`);

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
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      });
    }

  } catch (error) {
    console.error('[DELETE API] ❌ POST Error:', error);
    console.error('[DELETE API] Stack trace:', error.stack);
    return NextResponse.json({
      error: 'Failed to delete material',
      details: error.message,
      materialId: params?.id,
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  }
}

/**
 * GET endpoint to check deletion impact (before deletion)
 * Returns stats about the material to show impact warnings
 */
export async function GET(request, { params }) {
  try {
    // Next.js 15: Access params directly without await for better Vercel edge compatibility
    const { id } = params;

    // Log request start for debugging
    console.log(`[DELETE API] GET request received for material ID: ${id}`);

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check if user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(`[DELETE API] GET Authentication failed for material ${id}:`, userError?.message || 'No user');
      return NextResponse.json({
        error: 'Unauthorized',
        materialId: id,
        details: 'You must be logged in to view deletion impact'
      }, {
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      });
    }

    console.log(`[DELETE API] GET User authenticated: ${user.email}`);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(`[DELETE API] GET Profile fetch error:`, profileError);
    }

    if (!profile || profile.role !== 'admin') {
      console.warn(`[DELETE API] GET Access denied for user ${user.email} - Role: ${profile?.role || 'none'}`);
      return NextResponse.json({
        error: 'Admin access required',
        materialId: id,
        details: 'You must be an admin to view deletion impact'
      }, {
        status: 403,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      });
    }

    console.log(`[DELETE API] GET Admin verified for impact analysis`);

    // Get material with impact stats
    console.log(`[DELETE API] GET Fetching impact data for material ${id}...`);
    const { data: material, error } = await supabase
      .from('materials')
      .select(`
        id,
        title,
        download_count,
        view_count,
        file_size,
        created_at,
        uploaded_by,
        courses!materials_course_id_fkey (course_name),
        topics!materials_topic_id_fkey (topic_name)
      `)
      .eq('id', id)
      .single();

    if (error || !material) {
      console.error(`[DELETE API] GET Material not found: ${id}`, error);
      return NextResponse.json({
        error: 'Material not found',
        materialId: id,
        details: error?.message || 'The requested material does not exist'
      }, {
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      });
    }

    console.log(`[DELETE API] GET Impact data retrieved for: "${material.title}"`);

    // Calculate impact metrics
    const impactMetrics = {
      downloads: material.download_count || 0,
      views: material.view_count || 0,
      fileSizeMB: material.file_size ? (material.file_size / (1024 * 1024)).toFixed(2) : 0,
      uploadedBy: material.uploaded_by || 'Unknown',  // Show user ID instead of name to avoid join issues
      course: material.courses?.course_name || 'Unknown',
      topic: material.topics?.topic_name || 'None',
      uploadDate: material.created_at,
      // Estimated users affected (rough estimate)
      estimatedUsersAffected: Math.max(
        material.download_count || 0,
        Math.floor((material.view_count || 0) / 3)
      )
    };

    console.log(`[DELETE API] GET ✅ Returning impact data for "${material.title}"`);

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
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error) {
    console.error('[DELETE API] ❌ GET Error:', error);
    console.error('[DELETE API] GET Stack trace:', error.stack);
    return NextResponse.json({
      error: 'Failed to get impact data',
      details: error.message,
      materialId: params?.id,
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  }
}

/**
 * Helper function to extract storage path from Supabase file URL
 * @param {string} fileUrl - Full file URL
 * @returns {string|null} - Storage path or null if can't extract
 */
function extractPathFromUrl(fileUrl) {
  if (!fileUrl) return null;

  try {
    // Supabase URLs follow pattern: https://{project}.supabase.co/storage/v1/object/public/materials/{path}
    // Extract the path after 'materials/'
    const match = fileUrl.match(/\/materials\/(.*?)(?:\?|$)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting path from URL:', error);
    return null;
  }
}
