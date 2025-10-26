/**
 * Trash Bin API
 * Lists all soft-deleted items and allows permanent deletion
 * Shows 30-day countdown before auto-deletion
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  try {
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
    const [trashItemsResult, countResult] = await Promise.all([
      supabase.rpc('get_trash_bin_items', {
        limit_count: limit,
        offset_count: offset
      }),
      supabase.rpc('get_trash_bin_count')
    ]);

    if (trashItemsResult.error) throw trashItemsResult.error;
    if (countResult.error) throw countResult.error;

    const trashItems = trashItemsResult.data || [];
    const counts = countResult.data?.[0] || {
      total_count: 0,
      materials_count: 0,
      topics_count: 0,
      courses_count: 0,
      expiring_soon_count: 0
    };

    // Group items by type
    const groupedItems = {
      materials: trashItems.filter(item => item.entity_type === 'material'),
      topics: trashItems.filter(item => item.entity_type === 'topic'),
      courses: trashItems.filter(item => item.entity_type === 'course')
    };

    // Calculate summary stats
    const stats = {
      total: Number(counts.total_count),
      materials: Number(counts.materials_count),
      topics: Number(counts.topics_count),
      courses: Number(counts.courses_count),
      expiringSoon: Number(counts.expiring_soon_count),
      totalDownloadsLost: trashItems.reduce((sum, item) =>
        sum + (item.download_count || 0), 0)
    };

    // Pagination metadata
    const totalPages = Math.ceil(stats.total / limit);
    const pagination = {
      page,
      limit,
      total: stats.total,
      totalPages,
      hasMore: page < totalPages,
      hasPrevious: page > 1
    };

    return NextResponse.json({
      success: true,
      stats,
      items: groupedItems,
      pagination,
      message: stats.total
        ? `Found ${stats.total} deleted items in trash (showing ${trashItems.length})`
        : 'Trash bin is empty'
    });

  } catch (error) {
    console.error('Trash bin error:', error);
    return NextResponse.json(
      { error: `Failed to get trash items: ${error.message}` },
      { status: 500 }
    );
  }
}
