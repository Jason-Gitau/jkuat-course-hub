import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function GET(req) {
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

    // Execute all queries in parallel for better performance
    const [
      statusCountsResult,
      totalCountResult,
      uploadTrendsResult,
      popularMaterialsResult,
      mostViewedResult,
      recentUploadsResult,
      topCoursesResult,
      engagementResult
    ] = await Promise.all([
      // 1. Count by status using SQL aggregation
      supabase.rpc('get_material_status_counts'),

      // 2. Total materials count
      supabase.from('materials').select('*', { count: 'exact', head: true }),

      // 3. Upload trends (last 7 days) - use SQL date functions
      supabase.rpc('get_upload_trends', { days: 7 }),

      // 4. Most popular materials (by downloads)
      supabase
        .from('materials')
        .select('id, title, download_count, view_count, courses!materials_course_id_fkey(course_name)')
        .eq('status', 'approved')
        .order('download_count', { ascending: false, nullsFirst: false })
        .limit(5),

      // 5. Most viewed materials
      supabase
        .from('materials')
        .select('id, title, view_count, download_count, courses!materials_course_id_fkey(course_name)')
        .eq('status', 'approved')
        .order('view_count', { ascending: false, nullsFirst: false })
        .limit(5),

      // 6. Recent uploads
      supabase
        .from('materials')
        .select('id, title, status, created_at, courses!materials_course_id_fkey(course_name)')
        .order('created_at', { ascending: false })
        .limit(5),

      // 7. Top courses by material count
      supabase.rpc('get_top_courses_by_materials', { limit_count: 5 }),

      // 8. Total engagement metrics
      supabase.rpc('get_total_engagement')
    ]);

    // Check for errors
    if (statusCountsResult.error) throw statusCountsResult.error;
    if (totalCountResult.error) throw totalCountResult.error;
    if (uploadTrendsResult.error) throw uploadTrendsResult.error;
    if (popularMaterialsResult.error) throw popularMaterialsResult.error;
    if (mostViewedResult.error) throw mostViewedResult.error;
    if (recentUploadsResult.error) throw recentUploadsResult.error;
    if (topCoursesResult.error) throw topCoursesResult.error;
    if (engagementResult.error) throw engagementResult.error;

    // Extract status counts
    const statusCounts = statusCountsResult.data || [];
    const approved = statusCounts.find(s => s.status === 'approved')?.count || 0;
    const pending = statusCounts.find(s => s.status === 'pending')?.count || 0;
    const rejected = statusCounts.find(s => s.status === 'rejected')?.count || 0;
    const totalMaterials = totalCountResult.count || 0;

    // Format upload trends data
    const uploadTrendsData = (uploadTrendsResult.data || []).map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      uploads: day.count || 0
    }));

    // Format popular materials
    const popularMaterials = (popularMaterialsResult.data || []).map(m => ({
      id: m.id,
      title: m.title,
      downloads: m.download_count || 0,
      views: m.view_count || 0,
      course: m.courses?.course_name || 'Unknown'
    }));

    // Format most viewed
    const mostViewed = (mostViewedResult.data || []).map(m => ({
      id: m.id,
      title: m.title,
      views: m.view_count || 0,
      downloads: m.download_count || 0,
      course: m.courses?.course_name || 'Unknown'
    }));

    // Format recent uploads
    const recentUploads = (recentUploadsResult.data || []).map(m => ({
      id: m.id,
      title: m.title,
      status: m.status,
      created_at: m.created_at,
      course: m.courses?.course_name || 'Unknown'
    }));

    // Format top courses (already aggregated by RPC)
    const topCourses = (topCoursesResult.data || []).map(course => ({
      course: course.course_name,
      count: course.material_count,
      totalSizeMB: parseFloat((course.total_size / (1024 * 1024)).toFixed(2)),
      totalDownloads: course.total_downloads,
      totalViews: course.total_views
    }));

    // Extract engagement metrics
    const engagementData = engagementResult.data?.[0] || {};
    const totalDownloads = engagementData.total_downloads || 0;
    const totalViews = engagementData.total_views || 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalMaterials,
        byStatus: {
          approved,
          pending,
          rejected
        },
        engagement: {
          totalDownloads,
          totalViews,
          avgDownloadsPerMaterial: totalMaterials > 0 ? (totalDownloads / totalMaterials).toFixed(1) : 0,
          avgViewsPerMaterial: totalMaterials > 0 ? (totalViews / totalMaterials).toFixed(1) : 0
        },
        uploadTrendsData,
        popularMaterials,
        mostViewed,
        recentUploads,
        topCourses
      }
    });

  } catch (error) {
    console.error('Material stats error:', error);
    return NextResponse.json(
      { error: `Failed to get material stats: ${error.message}` },
      { status: 500 }
    );
  }
}
