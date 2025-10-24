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

    // Get total users
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, role, created_at');

    if (usersError) throw usersError;

    // Calculate statistics
    const totalUsers = allUsers.length;

    // Users by role
    const usersByRole = allUsers.reduce((acc, user) => {
      const role = user.role || 'student';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    // Recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSignups = allUsers.filter(user =>
      new Date(user.created_at) >= sevenDaysAgo
    ).length;

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlySignups = allUsers.filter(user =>
      new Date(user.created_at) >= thirtyDaysAgo
    ).length;

    // Growth chart data (last 7 days)
    const growthChartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const signupsOnDay = allUsers.filter(user => {
        const userDate = new Date(user.created_at);
        return userDate >= date && userDate < nextDate;
      }).length;

      growthChartData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        signups: signupsOnDay,
        total: allUsers.filter(u => new Date(u.created_at) <= nextDate).length
      });
    }

    // Most active day
    const signupsByDate = allUsers.reduce((acc, user) => {
      const date = new Date(user.created_at).toDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const mostActiveDay = Object.entries(signupsByDate)
      .sort(([,a], [,b]) => b - a)[0];

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
          date: mostActiveDay[0],
          signups: mostActiveDay[1]
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
