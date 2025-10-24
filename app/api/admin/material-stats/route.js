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

    // Get all materials
    const { data: allMaterials, error: materialsError } = await supabase
      .from('materials')
      .select(`
        id,
        title,
        status,
        created_at,
        download_count,
        view_count,
        file_size,
        course_id,
        courses!materials_course_id_fkey (course_name)
      `);

    if (materialsError) throw materialsError;

    // Calculate statistics
    const totalMaterials = allMaterials.length;
    const approved = allMaterials.filter(m => m.status === 'approved').length;
    const pending = allMaterials.filter(m => m.status === 'pending').length;
    const rejected = allMaterials.filter(m => m.status === 'rejected').length;

    // Upload trends (last 7 days)
    const uploadTrendsData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const uploadsOnDay = allMaterials.filter(material => {
        const materialDate = new Date(material.created_at);
        return materialDate >= date && materialDate < nextDate;
      }).length;

      uploadTrendsData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        uploads: uploadsOnDay
      });
    }

    // Most popular materials (by downloads)
    const popularMaterials = allMaterials
      .filter(m => m.status === 'approved')
      .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
      .slice(0, 5)
      .map(m => ({
        id: m.id,
        title: m.title,
        downloads: m.download_count || 0,
        views: m.view_count || 0,
        course: m.courses?.course_name || 'Unknown'
      }));

    // Most viewed materials
    const mostViewed = allMaterials
      .filter(m => m.status === 'approved')
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5)
      .map(m => ({
        id: m.id,
        title: m.title,
        views: m.view_count || 0,
        downloads: m.download_count || 0,
        course: m.courses?.course_name || 'Unknown'
      }));

    // Recent uploads (last 5)
    const recentUploads = allMaterials
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        created_at: m.created_at,
        course: m.courses?.course_name || 'Unknown'
      }));

    // Materials by course
    const materialsByCourse = allMaterials
      .filter(m => m.status === 'approved')
      .reduce((acc, material) => {
        const courseName = material.courses?.course_name || 'Unknown';
        if (!acc[courseName]) {
          acc[courseName] = {
            course: courseName,
            count: 0,
            totalSize: 0,
            totalDownloads: 0,
            totalViews: 0
          };
        }
        acc[courseName].count++;
        acc[courseName].totalSize += material.file_size || 0;
        acc[courseName].totalDownloads += material.download_count || 0;
        acc[courseName].totalViews += material.view_count || 0;
        return acc;
      }, {});

    const topCourses = Object.values(materialsByCourse)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(course => ({
        ...course,
        totalSizeMB: parseFloat((course.totalSize / (1024 * 1024)).toFixed(2))
      }));

    // Total engagement
    const totalDownloads = allMaterials.reduce((sum, m) => sum + (m.download_count || 0), 0);
    const totalViews = allMaterials.reduce((sum, m) => sum + (m.view_count || 0), 0);

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
