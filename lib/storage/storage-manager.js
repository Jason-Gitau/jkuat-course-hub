/**
 * Unified Storage Manager
 *
 * Storage routing:
 * - All uploads: R2 (unlimited bandwidth, 10GB free storage)
 * - Metadata: Supabase DB (fast queries, always fresh)
 *
 * Benefits:
 * - Zero bandwidth costs (R2 has no egress fees)
 * - Larger storage capacity (10GB vs 1GB)
 * - Scales infinitely without bandwidth limits
 */

import { getServiceRoleClient } from '@/lib/supabase/server.js';
import { uploadToR2, getR2SignedUrl, isR2Configured } from './r2-client.js';
import { autoCompressPDF } from './pdf-compressor.js';

const SUPABASE_BUCKET = 'course pdfs';

/**
 * Upload file with automatic storage selection
 * @param {Buffer} fileBuffer - File data
 * @param {Object} metadata - File metadata
 * @param {string} metadata.fileName - File name
 * @param {string} metadata.courseId - Course ID
 * @param {string} metadata.contentType - MIME type
 * @param {boolean} metadata.compressPDF - Whether to compress if PDF
 * @returns {Promise<{url: string, storageLocation: string, fileSize: number, compressed: boolean}>}
 */
export async function uploadFile(fileBuffer, metadata) {
  const { fileName, courseId, contentType, compressPDF = true } = metadata;

  try {
    let finalBuffer = fileBuffer;
    let compressed = false;
    let compressionStats = null;

    // Compress PDF if enabled and file is PDF
    if (compressPDF && contentType === 'application/pdf') {
      const result = await autoCompressPDF(fileBuffer);
      if (result.wasCompressed) {
        finalBuffer = result.buffer;
        compressed = true;
        compressionStats = result.stats;
        console.log('PDF compressed:', compressionStats);
      }
    }

    const finalSize = finalBuffer.length;
    const timestamp = Date.now();
    const path = `${courseId}/${timestamp}_${fileName}`;

    // Default to R2 for all new uploads (unlimited bandwidth, larger free tier)
    if (isR2Configured()) {
      const r2Result = await uploadToR2(finalBuffer, path, contentType);

      return {
        url: r2Result.url,
        storageLocation: 'r2',
        storagePath: r2Result.key,
        fileSize: finalSize,
        compressed,
        compressionStats,
      };
    }

    // Fallback to Supabase if R2 is not configured
    console.log('R2 not configured, falling back to Supabase Storage...');
    const client = getServiceRoleClient();
    const { data, error } = await client.storage
      .from(SUPABASE_BUCKET)
      .upload(path, finalBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = client.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(data.path);

    return {
      url: publicUrl,
      storageLocation: 'supabase',
      storagePath: data.path,
      fileSize: finalSize,
      compressed,
      compressionStats,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Upload directly to R2 (used for migration or fallback)
 * @param {Buffer} fileBuffer - File data
 * @param {Object} metadata - File metadata
 * @returns {Promise<{url: string, storageLocation: string, fileSize: number}>}
 */
export async function uploadFileToR2(fileBuffer, metadata) {
  const { fileName, courseId, contentType, compressPDF = true } = metadata;

  try {
    let finalBuffer = fileBuffer;
    let compressed = false;

    // Compress PDF if enabled
    if (compressPDF && contentType === 'application/pdf') {
      const result = await autoCompressPDF(fileBuffer);
      if (result.wasCompressed) {
        finalBuffer = result.buffer;
        compressed = true;
      }
    }

    const timestamp = Date.now();
    const path = `${courseId}/${timestamp}_${fileName}`;

    const r2Result = await uploadToR2(finalBuffer, path, contentType);

    return {
      url: r2Result.url,
      storageLocation: 'r2',
      storagePath: r2Result.key,
      fileSize: finalBuffer.length,
      compressed,
    };
  } catch (error) {
    throw new Error(`R2 upload failed: ${error.message}`);
  }
}

/**
 * Get file URL (handles both Supabase and R2)
 * @param {string} storageLocation - 'supabase' or 'r2'
 * @param {string} storagePath - File path/key
 * @returns {Promise<string>}
 */
export async function getFileUrl(storageLocation, storagePath) {
  if (storageLocation === 'r2') {
    // Generate signed URL for R2 (24 hour expiry)
    return await getR2SignedUrl(storagePath, 86400);
  }

  // Supabase public URL
  const client = getServiceRoleClient();
  const { data } = client.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Migrate file from Supabase to R2
 * @param {Object} material - Material record with file_url and storage_path
 * @returns {Promise<{success: boolean, newUrl: string, newLocation: string}>}
 */
export async function migrateFileToR2(material) {
  if (!isR2Configured()) {
    throw new Error('R2 not configured. Cannot migrate files.');
  }

  try {
    // Extract storage path from file_url if not set
    let storagePath = material.storage_path;

    if (!storagePath && material.file_url) {
      // Extract path from Supabase URL
      // Format: https://.../storage/v1/object/public/course%20pdfs/path/to/file.pdf
      const urlParts = material.file_url.split('/course%20pdfs/');
      if (urlParts.length > 1) {
        storagePath = decodeURIComponent(urlParts[1]);
      } else {
        throw new Error('Could not extract storage path from file_url');
      }
    }

    if (!storagePath) {
      throw new Error('No storage path available for migration');
    }

    // Download from Supabase
    const client = getServiceRoleClient();
    const { data, error } = await client.storage
      .from(SUPABASE_BUCKET)
      .download(storagePath);

    if (error) throw error;

    // Convert blob to buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const contentType = material.type === 'pdf' ? 'application/pdf' :
                       material.type === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                       'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    const r2Result = await uploadToR2(buffer, storagePath, contentType);

    // Delete from Supabase (optional - for now we keep as backup)
    // await client.storage.from(SUPABASE_BUCKET).remove([storagePath]);

    return {
      success: true,
      newUrl: r2Result.url,
      newLocation: 'r2',
      newPath: r2Result.key,
    };
  } catch (error) {
    console.error('Migration error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get storage statistics
 * @returns {Promise<{supabaseSizeMB: number, supabaseCount: number, r2SizeMB: number, r2Count: number}>}
 */
export async function getStorageStats() {
  try {
    // Query materials table for storage stats
    const client = getServiceRoleClient();
    const { data: materials, error } = await client
      .from('materials')
      .select('file_size, storage_location');

    if (error) throw error;

    const stats = materials.reduce((acc, material) => {
      const location = material.storage_location || 'supabase';
      const sizeMB = (material.file_size || 0) / (1024 * 1024);

      if (location === 'r2') {
        acc.r2SizeMB += sizeMB;
        acc.r2Count++;
      } else {
        acc.supabaseSizeMB += sizeMB;
        acc.supabaseCount++;
      }

      return acc;
    }, {
      supabaseSizeMB: 0,
      supabaseCount: 0,
      r2SizeMB: 0,
      r2Count: 0,
    });

    // Round to 2 decimals
    stats.supabaseSizeMB = parseFloat(stats.supabaseSizeMB.toFixed(2));
    stats.r2SizeMB = parseFloat(stats.r2SizeMB.toFixed(2));
    stats.totalSizeMB = parseFloat((stats.supabaseSizeMB + stats.r2SizeMB).toFixed(2));
    stats.totalCount = stats.supabaseCount + stats.r2Count;

    return stats;
  } catch (error) {
    console.error('Storage stats error:', error);
    return {
      supabaseSizeMB: 0,
      supabaseCount: 0,
      r2SizeMB: 0,
      r2Count: 0,
      totalSizeMB: 0,
      totalCount: 0,
      error: error.message,
    };
  }
}

/**
 * Find materials eligible for R2 migration
 * Criteria:
 * - Older than 60 days
 * - Less than 5 downloads OR larger than 10MB
 * - Currently in Supabase
 * @returns {Promise<Array>}
 */
export async function findMigrationCandidates() {
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const client = getServiceRoleClient();
    const { data, error } = await client
      .from('materials')
      .select('id, title, file_size, created_at, storage_location, storage_path, download_count, file_url, type')
      .or(`storage_location.is.null,storage_location.eq.supabase`)
      .lt('created_at', sixtyDaysAgo.toISOString());

    if (error) throw error;

    // Filter by download count or size
    const candidates = data.filter(material => {
      const downloadCount = material.download_count || 0;
      const sizeMB = (material.file_size || 0) / (1024 * 1024);

      return downloadCount < 5 || sizeMB > 10;
    });

    return candidates;
  } catch (error) {
    console.error('Find migration candidates error:', error);
    return [];
  }
}

export default {
  uploadFile,
  uploadFileToR2,
  getFileUrl,
  migrateFileToR2,
  getStorageStats,
  findMigrationCandidates,
};
