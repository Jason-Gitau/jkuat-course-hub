/**
 * API endpoint to get fresh download URL for a material
 * For R2 files: generates new signed URL (24-hour expiry)
 * For Supabase files: returns the stored public URL
 */

import { createClient } from '@/lib/supabase/server';
import { getFileUrl } from '@/lib/storage/storage-manager';

export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Get material from database
    const supabase = createClient();
    const { data: material, error } = await supabase
      .from('materials')
      .select('id, storage_location, storage_path, file_url')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!material) {
      return Response.json({ error: 'Material not found' }, { status: 404 });
    }

    // Generate fresh URL based on storage location
    let downloadUrl;

    if (material.storage_location === 'r2') {
      // Generate fresh signed URL for R2 (24-hour expiry)
      downloadUrl = await getFileUrl('r2', material.storage_path);
    } else {
      // Use stored public URL for Supabase
      downloadUrl = material.file_url;
    }

    // Increment download count (fire and forget - don't block response)
    supabase
      .rpc('increment_download_count', { material_id: id })
      .then(({ error }) => {
        if (error) console.error('Failed to increment download count:', error);
      });

    return Response.json({
      success: true,
      url: downloadUrl,
      storage_location: material.storage_location || 'supabase',
    });
  } catch (error) {
    console.error('Download URL generation error:', error);
    return Response.json(
      { error: 'Failed to generate download URL', details: error.message },
      { status: 500 }
    );
  }
}
