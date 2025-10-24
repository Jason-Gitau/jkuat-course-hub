/**
 * Cloudflare R2 Storage Client
 *
 * R2 is S3-compatible object storage with:
 * - 10GB free storage (10x more than Supabase)
 * - Zero egress fees
 * - S3 API compatibility
 *
 * Setup Instructions:
 * 1. Go to Cloudflare dashboard > R2
 * 2. Create a bucket (e.g., "jkuat-materials")
 * 3. Create API token with R2 read/write permissions
 * 4. Add credentials to .env:
 *    - R2_ACCOUNT_ID=your_account_id
 *    - R2_ACCESS_KEY_ID=your_access_key
 *    - R2_SECRET_ACCESS_KEY=your_secret_key
 *    - R2_BUCKET_NAME=jkuat-materials
 *    - R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com (optional, for public access)
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Lazy-initialize R2 client to ensure env vars are loaded
let r2Client = null;

function getR2Client() {
  if (!r2Client && process.env.R2_ACCESS_KEY_ID) {
    // R2 endpoint format: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
    // Note: The R2_PUBLIC_URL hash should NOT be used as account ID
    const accountId = process.env.R2_ACCOUNT_ID;

    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return r2Client;
}

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'jkuat-materials';

/**
 * Upload file to R2
 * @param {Buffer} fileBuffer - File data as buffer
 * @param {string} fileName - File name/path in bucket
 * @param {string} contentType - MIME type
 * @returns {Promise<{success: boolean, url: string, key: string}>}
 */
export async function uploadToR2(fileBuffer, fileName, contentType) {
  const client = getR2Client();
  if (!client) {
    throw new Error('R2 client not configured. Please add R2 credentials to .env file.');
  }

  try {
    const key = fileName;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await client.send(command);

    // Generate public URL (if R2_PUBLIC_URL is configured)
    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : null;

    return {
      success: true,
      url: publicUrl,
      key: key,
    };
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload to R2: ${error.message}`);
  }
}

/**
 * Get signed URL for private file access (24 hour expiry)
 * @param {string} key - File key in R2
 * @param {number} expiresIn - Seconds until expiry (default: 86400 = 24 hours)
 * @returns {Promise<string>}
 */
export async function getR2SignedUrl(key, expiresIn = 86400) {
  const client = getR2Client();
  if (!client) {
    throw new Error('R2 client not configured.');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('R2 signed URL error:', error);
    throw new Error(`Failed to generate R2 signed URL: ${error.message}`);
  }
}

/**
 * Delete file from R2
 * @param {string} key - File key in R2
 * @returns {Promise<boolean>}
 */
export async function deleteFromR2(key) {
  const client = getR2Client();
  if (!client) {
    throw new Error('R2 client not configured.');
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error) {
    console.error('R2 delete error:', error);
    throw new Error(`Failed to delete from R2: ${error.message}`);
  }
}

/**
 * Check if file exists in R2
 * @param {string} key - File key in R2
 * @returns {Promise<boolean>}
 */
export async function r2FileExists(key) {
  const client = getR2Client();
  if (!client) {
    return false;
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Get file metadata from R2
 * @param {string} key - File key in R2
 * @returns {Promise<{size: number, contentType: string, lastModified: Date}>}
 */
export async function getR2FileMetadata(key) {
  const client = getR2Client();
  if (!client) {
    throw new Error('R2 client not configured.');
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    const response = await client.send(command);

    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
    };
  } catch (error) {
    console.error('R2 metadata error:', error);
    throw new Error(`Failed to get R2 file metadata: ${error.message}`);
  }
}

/**
 * Check if R2 is configured and available
 * @returns {boolean}
 */
export function isR2Configured() {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

export default getR2Client;
