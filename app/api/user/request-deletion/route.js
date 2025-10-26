/**
 * Student Deletion Request API
 * Allows students to request deletion of their own uploaded materials
 * Requests must be reviewed and approved by admins
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check if user is logged in
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { materialId, reason } = body;

    // Validate input
    if (!materialId) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 });
    }

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({
        error: 'Deletion reason is required (minimum 10 characters)'
      }, { status: 400 });
    }

    // Verify the material exists and belongs to the user
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, title, uploaded_by, download_count, view_count')
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Check if user owns the material
    if (material.uploaded_by !== user.id) {
      return NextResponse.json({
        error: 'You can only request deletion of your own materials'
      }, { status: 403 });
    }

    // Check if there's already a pending request for this material
    const { data: existingRequest } = await supabase
      .from('deletion_requests')
      .select('id, status')
      .eq('material_id', materialId)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json({
        error: 'A deletion request for this material is already pending'
      }, { status: 400 });
    }

    // Create deletion request
    const { data: newRequest, error: createError } = await supabase
      .from('deletion_requests')
      .insert({
        material_id: materialId,
        requested_by: user.id,
        request_reason: reason.trim(),
        status: 'pending'
      })
      .select()
      .single();

    if (createError) throw createError;

    return NextResponse.json({
      success: true,
      message: 'Deletion request submitted successfully. An admin will review it soon.',
      request: {
        id: newRequest.id,
        materialTitle: material.title,
        status: 'pending',
        createdAt: newRequest.created_at
      }
    });

  } catch (error) {
    console.error('Request deletion error:', error);
    return NextResponse.json(
      { error: `Failed to submit deletion request: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to view user's own deletion requests
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check if user is logged in
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pagination params from query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    // OPTIMIZATION: Parallel queries for data + count (Performance Strategy #3)
    const [requestsResult, countsResult] = await Promise.all([
      supabase.rpc('get_user_deletion_requests', {
        user_id: user.id,
        limit_count: limit,
        offset_count: offset
      }),
      supabase.rpc('get_user_requests_count', {
        user_id: user.id
      })
    ]);

    if (requestsResult.error) throw requestsResult.error;
    if (countsResult.error) throw countsResult.error;

    const requests = requestsResult.data || [];
    const counts = countsResult.data?.[0] || {
      total_count: 0,
      pending_count: 0,
      approved_count: 0,
      rejected_count: 0
    };

    // Format response
    const formattedRequests = requests.map(req => ({
      id: req.id,
      materialId: req.material_id,
      materialTitle: req.material_title || 'Unknown',
      reason: req.request_reason,
      status: req.status,
      requestedAt: req.created_at,
      reviewedAt: req.reviewed_at,
      rejectionReason: req.rejection_reason
    }));

    // Pagination metadata
    const totalCount = Number(counts.total_count);
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
      requests: formattedRequests,
      counts: {
        total: Number(counts.total_count),
        pending: Number(counts.pending_count),
        approved: Number(counts.approved_count),
        rejected: Number(counts.rejected_count)
      },
      pagination
    });

  } catch (error) {
    console.error('Get deletion requests error:', error);
    return NextResponse.json(
      { error: `Failed to get deletion requests: ${error.message}` },
      { status: 500 }
    );
  }
}
