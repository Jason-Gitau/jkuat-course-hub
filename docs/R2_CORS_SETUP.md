# R2 CORS Configuration for Direct Client Uploads

## Overview

To enable direct client-to-R2 uploads using presigned URLs, you need to configure CORS (Cross-Origin Resource Sharing) on your Cloudflare R2 bucket.

## Why CORS Configuration is Needed

When your web application (running on `yourdomain.com`) makes PUT requests directly to R2 (on `your-bucket.r2.cloudflarestorage.com`), the browser blocks these requests due to the same-origin policy. CORS headers tell the browser that these cross-origin requests are safe.

## Steps to Configure CORS on R2

### 1. Access Your R2 Bucket Settings

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** → **Buckets**
3. Click on your bucket (e.g., `jkuat-materials`)
4. Go to the **Settings** tab
5. Scroll down to **CORS Configuration**

### 2. Add CORS Rules

Click **Add CORS rule** and configure the following:

#### For Development (localhost):

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "http://localhost:3001"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

#### For Production (your domain):

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com", "https://www.yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

#### Full CORS Configuration (Development + Production):

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://yourdomain.com",
      "https://www.yourdomain.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### 3. Save Configuration

Click **Save** to apply the CORS rules.

## CORS Configuration Explained

| Field | Meaning |
|-------|---------|
| **AllowedOrigins** | Domains that can make cross-origin requests. Use `*` for all, but this is less secure. |
| **AllowedMethods** | HTTP methods allowed from the client. Need `PUT` for uploads. |
| **AllowedHeaders** | Headers the client can send. `*` allows all headers. |
| **ExposeHeaders** | Headers the browser will allow JavaScript to access. `ETag` is returned by S3/R2. |
| **MaxAgeSeconds** | How long the browser can cache this CORS policy (in seconds). |

## Verifying CORS Configuration

After setting CORS, you can verify it with a test request:

```bash
# Test from your domain:
curl -X OPTIONS https://your-bucket.r2.cloudflarestorage.com/test-file \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: PUT" \
  -v
```

Look for response headers like:
```
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, PUT, POST, DELETE
```

## Troubleshooting

### Issue: "CORS error" in browser console

**Solution:**
1. Check that your domain is listed in `AllowedOrigins`
2. Verify the exact domain matches (www.example.com ≠ example.com)
3. Check that `PUT` is in `AllowedMethods`
4. Wait a few minutes for the configuration to propagate

### Issue: "Access to XMLHttpRequest has been blocked by CORS policy"

**Solution:**
1. Ensure R2 CORS is configured correctly
2. Check browser console for exact error message
3. Make sure you're using the presigned URL from the API (not constructing it manually)

## Security Considerations

- **Avoid `*` in AllowedOrigins**: Be specific about which domains can upload
- **Use HTTPS in production**: Never use `http://` for production domains
- **Presigned URLs**: The presigned URLs are already time-limited (1 hour), adding security
- **File validation**: The presigned URL endpoint validates file type and size before generating URLs

## Environment Variables

Ensure these are set in your `.env.local`:

```
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=jkuat-materials
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## Testing Direct R2 Uploads

1. Go to `/upload` page
2. Select a file larger than 4.5 MB
3. Fill in the form and click "Upload"
4. Monitor the progress bar
5. After completion, the file will be accessible via the public R2 URL

## References

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [S3 CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
