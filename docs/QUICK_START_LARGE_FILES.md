# Quick Start: Upload Large Files (>4.5 MB)

## What Changed

You can now upload files larger than 4.5 MB! Files up to 50 MB are supported.

## How to Use (No Code Changes Needed)

1. Go to `/upload` page
2. Select a file (even 7.4 MB or larger)
3. Fill in the form as usual
4. Click "Upload"
5. Watch the progress bar
6. Done! ✅

## What Happens Behind the Scenes

1. Browser requests a presigned upload URL from your API
2. Your API generates a time-limited URL (valid 1 hour)
3. Browser uploads the file **directly to Cloudflare R2** (not through Vercel)
4. When complete, browser tells your API to save the metadata
5. Your API saves the material record to Supabase

## Why This Works

- **Vercel limit**: 4.5 MB max payload for serverless functions
- **R2 limit**: 50 GB per file (and beyond with multipart upload)
- **Solution**: Upload directly to R2, bypassing Vercel

## Setup Required (One-Time)

### 1. Verify Environment Variables

Check `.env.local` has:
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=jkuat-materials
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
```

### 2. Configure R2 CORS (Critical!)

**Without CORS, uploads from browser will fail with "CORS error"**

Steps:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. R2 → Your Bucket → Settings → CORS Configuration
3. Add this rule:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://yourdomain.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. Replace `yourdomain.com` with your actual domain
5. Click Save

**See `docs/R2_CORS_SETUP.md` for detailed instructions**

## Testing

### Test Locally

```bash
npm run dev
# Go to http://localhost:3000/upload
# Try uploading a 7+ MB file
# Should work now!
```

### Test in Production

After deploying to Vercel:
1. Update R2 CORS with your production domain
2. Go to your production URL `/upload`
3. Try uploading a large file
4. Check Supabase database for the material record

## Troubleshooting

### "CORS error" in browser console

**Solution:** Configure R2 CORS (see Setup section #2 above)

### "Failed to get presigned URL"

**Solution:** Check R2 credentials in `.env.local`

### "Upload failed with status 403"

**Solution:** Usually CORS. Check R2 CORS configuration.

### Upload completes but material doesn't appear

**Solution:** Check:
1. Supabase connection
2. Database has write permission
3. Check Vercel logs: `vercel logs`

## Files Changed

Created:
- `app/api/upload/presigned-url/route.js` - Generates upload URLs
- `app/api/upload/complete/route.js` - Saves metadata
- `lib/upload/direct-r2-upload.js` - Upload utilities
- `docs/R2_CORS_SETUP.md` - CORS configuration guide
- `docs/DIRECT_R2_UPLOAD_IMPLEMENTATION.md` - Full technical details

Modified:
- `app/upload/page.jsx` - Uses direct R2 uploads instead of queue

## Test File

To test, you can create a test file:

```bash
# Create a 7.4 MB test file
dd if=/dev/zero of=test-7.4mb.txt bs=1M count=7
# On Windows:
fsutil file createnew test-7.4mb.txt 7400000

# Upload it from /upload page
# Should work now!
```

## Next Steps

1. Set up R2 CORS (see section above)
2. Test locally with a large file
3. Deploy to Vercel
4. Test in production
5. Done!

## Questions?

See full documentation:
- Architecture: `docs/DIRECT_R2_UPLOAD_IMPLEMENTATION.md`
- CORS Setup: `docs/R2_CORS_SETUP.md`
