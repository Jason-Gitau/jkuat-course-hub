import getR2Client from '@/lib/storage/r2-client'
import { S3Client } from '@aws-sdk/client-s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * Generate a presigned URL for direct client-to-R2 uploads
 * This bypasses Vercel's 4.5 MB payload limit
 *
 * POST /api/upload/presigned-url
 * Body: { filename, contentType, fileSize }
 * Response: { uploadUrl, key, fields }
 */
export async function POST(req) {
  try {
    const body = await req.json()
    const { filename, contentType, fileSize } = body

    // Validate inputs
    if (!filename || !contentType) {
      return Response.json(
        { error: 'Missing required fields: filename and contentType' },
        { status: 400 }
      )
    }

    // Check file size (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return Response.json(
        { error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 413 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif'
    ]

    if (!allowedTypes.includes(contentType)) {
      return Response.json(
        { error: 'Invalid file type. Only PDF, DOCX, PPT, and images (PNG, JPG, WEBP, GIF) allowed' },
        { status: 400 }
      )
    }

    // Check authentication
    const authHeader = req.headers.get('cookie')
    let isAuthenticated = false

    if (authHeader) {
      try {
        const userSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        const { data: { user } } = await userSupabase.auth.getUser()
        isAuthenticated = !!user
      } catch (err) {
        console.warn('Auth check failed:', err)
        // Continue anyway - allow anonymous uploads
      }
    }

    // Generate unique key with timestamp to avoid collisions
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `uploads/${timestamp}-${random}/${safeFilename}`

    // Get R2 client
    const client = getR2Client()
    if (!client) {
      throw new Error('R2 client not configured')
    }

    // Generate presigned PUT URL (valid for 1 hour)
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'jkuat-materials',
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 })

    return Response.json({
      success: true,
      uploadUrl,
      key,
      bucket: process.env.R2_BUCKET_NAME || 'jkuat-materials'
    })

  } catch (error) {
    console.error('Presigned URL generation error:', error)
    return Response.json(
      { error: `Failed to generate upload URL: ${error.message}` },
      { status: 500 }
    )
  }
}
