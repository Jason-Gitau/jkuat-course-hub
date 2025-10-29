/**
 * API endpoint to proxy file downloads from R2
 * Eliminates CORS issues by handling downloads server-side
 *
 * Flow:
 * 1. Get material metadata from database
 * 2. Generate signed R2 URL (server-side)
 * 3. Fetch file from R2 (no CORS issues)
 * 4. Stream to client with proper headers
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getFileUrl } from '@/lib/storage/storage-manager';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Get material from database
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: material, error } = await supabase
      .from('materials')
      .select('id, title, storage_location, storage_path, file_url, type')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!material) {
      return Response.json({ error: 'Material not found' }, { status: 404 });
    }

    // Generate download URL based on storage location
    let downloadUrl;

    if (material.storage_location === 'r2') {
      // Generate fresh signed URL for R2 (server-side, no CORS issues)
      downloadUrl = await getFileUrl('r2', material.storage_path);
    } else {
      // Use stored public URL for Supabase
      downloadUrl = material.file_url;
    }

    // Fetch file from storage (server-side request = no CORS)
    const fileResponse = await fetch(downloadUrl);

    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    // Get file content type
    const contentType = fileResponse.headers.get('content-type') ||
                       (material.type === 'pdf' ? 'application/pdf' :
                        material.type === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                        'application/octet-stream');

    // Stream file to client with proper headers
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${material.title}"`,
      'Access-Control-Allow-Origin': '*', // Allow CORS from any origin
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    });

    // Add content-length if available
    const contentLength = fileResponse.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Increment download count (fire and forget)
    supabase
      .rpc('increment_download_count', { material_id: id })
      .then(({ error }) => {
        if (error) console.error('Failed to increment download count:', error);
      });

    // Return file stream
    return new Response(fileResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Download proxy error:', error);
    return Response.json(
      { error: 'Failed to download file', details: error.message },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
