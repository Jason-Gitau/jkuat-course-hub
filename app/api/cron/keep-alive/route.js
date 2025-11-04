import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * Vercel Cron Job: Keep Supabase Database Active
 *
 * This endpoint runs twice per week to prevent Supabase free tier from auto-pausing
 * after 7 days of inactivity. It performs a lightweight health check query.
 *
 * Scheduled via vercel.json cron configuration
 */
export async function GET(request) {
  try {
    // Security: Verify request is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Keep-Alive] Unauthorized cron request attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Perform lightweight health check query
    const startTime = Date.now()
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    const duration = Date.now() - startTime

    if (error) {
      console.error('[Keep-Alive] Database query failed:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // Success response
    console.log(`[Keep-Alive] ✅ Database pinged successfully (${duration}ms)`)
    return NextResponse.json({
      success: true,
      message: 'Supabase database is active',
      timestamp: new Date().toISOString(),
      queryDuration: `${duration}ms`,
      rowsChecked: data?.length || 0
    })

  } catch (error) {
    console.error('[Keep-Alive] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
