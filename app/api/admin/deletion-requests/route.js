/**
 * Admin Deletion Requests Management API
 * Allows admins to view, approve, or reject student deletion requests
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET - List all pending deletion requests
 */
export async function GET(request) {
  try {
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

    // Get pagination params from query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    // OPTIMIZATION: Parallel queries for data + count (Performance Strategy #3)
    const [requestsResult, countResult] = await Promise.all([
      supabase.rpc('get_pending_deletion_requests', {
        limit_count: limit,
        offset_count: offset
      }),
      supabase.rpc('get_pending_requests_count')
    ]);

    if (requestsResult.error) throw requestsResult.error;
    if (countResult.error) throw countResult.error;

    const requests = requestsResult.data || [];
    const totalCount = Number(countResult.data) || 0;

    // Pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const pagination = {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasMore: page < totalPages,
      hasPrevious: page > 1
    };

    return NextResponse.json({
      success: true,
      requests,
      count: requests.length,
      pagination,
      message: totalCount
        ? `Found ${totalCount} pending deletion requests (showing ${requests.length})`
        : 'No pending deletion requests'
    });

  } catch (error) {
    console.error('Get deletion requests error:', error);
    return NextResponse.json(
      { error: `Failed to get deletion requests: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * POST - Approve or reject a deletion request
 */
export async function POST(request) {
  try {
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

    // Get request body
    const body = await request.json();
    const { requestId, action, rejectionReason } = body; // action: 'approve' or 'reject'

    // Validate input
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        error: 'Invalid action. Must be "approve" or "reject"'
      }, { status: 400 });
    }

    if (action === 'reject' && (!rejectionReason || rejectionReason.trim().length < 5)) {
      return NextResponse.json({
        error: 'Rejection reason is required (minimum 5 characters)'
      }, { status: 400 });
    }

    const serviceRole = getServiceRoleClient();

    // Get the deletion request details
    const { data: deletionRequest, error: requestError } = await serviceRole
      .from('deletion_requests')
      .select(`
        id,
        material_id,
        topic_id,
        course_id,
        request_reason,
        status,
        materials!deletion_requests_material_id_fkey (id, title, uploaded_by)
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !deletionRequest) {
      return NextResponse.json({ error: 'Deletion request not found' }, { status: 404 });
    }

    if (deletionRequest.status !== 'pending') {
      return NextResponse.json({
        error: `Request has already been ${deletionRequest.status}`
      }, { status: 400 });
    }

    if (action === 'approve') {
      // APPROVE: Soft delete the material
      if (deletionRequest.material_id) {
        const material = deletionRequest.materials;

        // Soft delete the material
        const { error: deleteError } = await serviceRole
          .from('materials')
          .update({
            deleted_at: new Date().toISOString(),
            deletion_type: 'soft',
            deletion_reason: `Deletion requested by uploader: ${deletionRequest.request_reason}`,
            deleted_by: user.id,
            download_count_at_deletion: material.download_count || 0,
            view_count_at_deletion: material.view_count || 0
          })
          .eq('id', deletionRequest.material_id);

        if (deleteError) throw deleteError;

        // Log to audit trail
        await serviceRole.from('deletion_audit_log').insert({
          entity_type: 'material',
          entity_id: deletionRequest.material_id,
          entity_title: material.title,
          deletion_type: 'soft',
          deletion_reason: `Approved deletion request from uploader`,
          deleted_by: user.id,
          download_count_at_deletion: material.download_count || 0,
          view_count_at_deletion: material.view_count || 0
        });
      }

      // Update request status
      await serviceRole
        .from('deletion_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      return NextResponse.json({
        success: true,
        message: 'Deletion request approved. Material moved to trash.',
        action: 'approved'
      });

    } else {
      // REJECT: Just update the request status
      await serviceRole
        .from('deletion_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim()
        })
        .eq('id', requestId);

      return NextResponse.json({
        success: true,
        message: 'Deletion request rejected.',
        action: 'rejected'
      });
    }

  } catch (error) {
    console.error('Process deletion request error:', error);
    return NextResponse.json(
      { error: `Failed to process deletion request: ${error.message}` },
      { status: 500 }
    );
  }
}
