import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getStorageStats, findMigrationCandidates } from '@/lib/storage/storage-manager.js';

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

    // Get storage statistics
    const stats = await getStorageStats();

    // Get migration candidates
    const candidates = await findMigrationCandidates();

    // Get top 10 largest files
    const { data: largestFiles } = await supabase
      .from('materials')
      .select('id, title, file_size, storage_location, created_at, download_count, courses!course_id(course_name)')
      .order('file_size', { ascending: false })
      .limit(10);

    // Get materials by storage location
    const { data: byLocation } = await supabase
      .from('materials')
      .select('storage_location, file_size');

    // Calculate storage by course
    const { data: byCourse } = await supabase
      .from('materials')
      .select(`
        file_size,
        courses!course_id (
          id,
          course_name
        )
      `);

    // Group by course
    const courseStats = {};
    if (byCourse) {
      byCourse.forEach(material => {
        if (material.courses) {
          const courseId = material.courses.id;
          const courseName = material.courses.course_name;

          if (!courseStats[courseId]) {
            courseStats[courseId] = {
              id: courseId,
              name: courseName,
              totalSize: 0,
              count: 0,
            };
          }

          courseStats[courseId].totalSize += material.file_size || 0;
          courseStats[courseId].count++;
        }
      });
    }

    // Convert to array and sort by size
    const courseStatsArray = Object.values(courseStats)
      .map(course => ({
        ...course,
        totalSizeMB: parseFloat((course.totalSize / (1024 * 1024)).toFixed(2)),
      }))
      .sort((a, b) => b.totalSize - a.totalSize)
      .slice(0, 10); // Top 10 courses

    // Calculate percentages
    const supabasePercentage = stats.totalSizeMB > 0
      ? ((stats.supabaseSizeMB / stats.totalSizeMB) * 100).toFixed(1)
      : 0;

    const r2Percentage = stats.totalSizeMB > 0
      ? ((stats.r2SizeMB / stats.totalSizeMB) * 100).toFixed(1)
      : 0;

    // Supabase free tier usage
    const supabaseFreeTierGB = 1;
    const supabaseUsagePercentage = ((stats.supabaseSizeMB / (supabaseFreeTierGB * 1024)) * 100).toFixed(1);

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        supabasePercentage,
        r2Percentage,
        supabaseUsagePercentage,
        supabaseFreeTierGB,
      },
      migrationCandidates: {
        count: candidates.length,
        totalSizeMB: parseFloat(
          candidates.reduce((sum, m) => sum + ((m.file_size || 0) / (1024 * 1024)), 0).toFixed(2)
        ),
        list: candidates.slice(0, 5), // Return top 5 for preview
      },
      largestFiles: largestFiles?.map(file => ({
        ...file,
        file_size_mb: parseFloat((file.file_size / (1024 * 1024)).toFixed(2)),
      })),
      courseStats: courseStatsArray,
    });

  } catch (error) {
    console.error('Storage stats error:', error);
    return NextResponse.json(
      { error: `Failed to get storage stats: ${error.message}` },
      { status: 500 }
    );
  }
}
