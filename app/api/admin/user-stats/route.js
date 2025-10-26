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
      totalCountResult,
      roleStatsResult,
      recentSignups7Result,
      recentSignups30Result,
      activityTrendsResult
    ] = await Promise.all([
      // 1. Total user count
      supabase.from('profiles').select('*', { count: 'exact', head: true }),

      // 2. Users by role using SQL aggregation
      supabase.rpc('get_user_stats_by_role'),

      // 3. Recent signups (last 7 days)
      supabase.rpc('get_new_users', { days: 7 }),

      // 4. Recent signups (last 30 days)
      supabase.rpc('get_new_users', { days: 30 }),

      // 5. User activity trends (last 7 days)
      supabase.rpc('get_user_activity_trends', { days: 7 })
    ]);

    // Check for errors
    if (totalCountResult.error) throw totalCountResult.error;
    if (roleStatsResult.error) throw roleStatsResult.error;
    if (recentSignups7Result.error) throw recentSignups7Result.error;
    if (recentSignups30Result.error) throw recentSignups30Result.error;
    if (activityTrendsResult.error) throw activityTrendsResult.error;

    // Extract total users count
    const totalUsers = totalCountResult.count || 0;

    // Format users by role
    const roleStats = roleStatsResult.data || [];
    const usersByRole = roleStats.reduce((acc, stat) => {
      acc[stat.role] = stat.count;
      return acc;
    }, {});

    // Extract recent signups
    const recentSignups = recentSignups7Result.data || 0;
    const monthlySignups = recentSignups30Result.data || 0;

    // Format growth chart data
    const activityData = activityTrendsResult.data || [];
    let cumulativeTotal = totalUsers;
    const growthChartData = activityData.map(day => {
      // Calculate cumulative total by subtracting from current total going backwards
      const signups = day.new_users || 0;
      return {
        date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        signups: signups,
        total: cumulativeTotal
      };
    });

    // Most active day from activity trends
    const mostActiveDay = activityData.reduce((max, day) => {
      return (day.new_users || 0) > (max?.new_users || 0) ? day : max;
    }, null);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        usersByRole,
        recentSignups: {
          last7Days: recentSignups,
          last30Days: monthlySignups,
        },
        growthChartData,
        mostActiveDay: mostActiveDay ? {
          date: new Date(mostActiveDay.date).toDateString(),
          signups: mostActiveDay.new_users
        } : null,
      },
    });

  } catch (error) {
    console.error('User stats error:', error);
    return NextResponse.json(
      { error: `Failed to get user stats: ${error.message}` },
      { status: 500 }
    );
  }
}
