# Cloudflare R2 Setup Guide

**Purpose:** Extend your storage from 1GB (Supabase) to 11GB (Supabase + R2) for FREE

**Time Required:** 5-10 minutes

**When to do this:** When your Supabase storage reaches 70% (check at `/admin/storage`)

---

## 📋 Prerequisites

- Cloudflare account (free signup)
- Credit card (for verification only - R2 free tier is truly free up to 10GB)
- Your app is already R2-ready (code is implemented)

---

## 🚀 Step-by-Step Setup

### **Step 1: Create Cloudflare Account**

1. Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Sign up with email (free account)
3. Verify your email address

**Note:** You don't need to add a domain to use R2.

---

### **Step 2: Access R2 Storage**

1. Log into Cloudflare Dashboard
2. Click on **"R2"** in the left sidebar
3. If prompted, click **"Purchase R2"** (it's free up to 10GB)
4. Enter credit card for verification (you won't be charged unless you exceed 10GB)

---

### **Step 3: Create R2 Bucket**

1. Click **"Create bucket"** button
2. **Bucket name:** `jkuat-materials` (or any name you prefer)
3. **Location:** Automatic (let Cloudflare choose)
4. Click **"Create bucket"**

✅ Your bucket is now created!

---

### **Step 4: Generate API Token**

1. In R2 dashboard, click **"Manage R2 API Tokens"** (top right)
2. Click **"Create API token"**
3. **Token name:** `jkuat-course-hub`
4. **Permissions:**
   - ✅ Object Read & Write
   - ✅ Bucket Read
5. **TTL:** Forever (or set expiry if you want to rotate keys)
6. **Specific buckets (optional):** Select `jkuat-materials` (more secure)
7. Click **"Create API token"**

⚠️ **IMPORTANT:** Copy the credentials shown on the next screen. You'll need:
- Access Key ID
- Secret Access Key
- Account ID (shown at top of page)

**Save these somewhere safe - you can't see the secret again!**

---

### **Step 5: Configure Your App**

1. Open your `.env` file in the project root
2. Find the R2 configuration section (around line 7-13)
3. **Uncomment** the lines and fill in your credentials:

```bash
# Cloudflare R2 Storage (Optional - 10GB free tier)
R2_ACCOUNT_ID=your_account_id_from_cloudflare
R2_ACCESS_KEY_ID=your_access_key_from_step_4
R2_SECRET_ACCESS_KEY=your_secret_access_key_from_step_4
R2_BUCKET_NAME=jkuat-materials
# R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com (optional)
```

**Example (with fake credentials):**
```bash
R2_ACCOUNT_ID=a1b2c3d4e5f6g7h8i9j0
R2_ACCESS_KEY_ID=9a8b7c6d5e4f3g2h1i0j
R2_SECRET_ACCESS_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234
R2_BUCKET_NAME=jkuat-materials
```

4. **Save the `.env` file**
5. **Restart your dev server:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

---

### **Step 6: Test R2 Connection**

1. **Check admin dashboard:**
   - Go to `http://localhost:3000/admin/storage`
   - Look for R2 stats (should show 0 MB initially)

2. **Test migration script:**
   ```bash
   node scripts/migrate-to-r2.js --dry-run
   ```

   **Expected output:**
   - "Found X materials eligible for migration"
   - No errors about R2 configuration

3. **Upload a test PDF:**
   - Go to `/upload`
   - Upload a small PDF
   - Check if it compresses and uploads successfully

---

## 🔍 Where to Find Cloudflare Credentials

### **Account ID:**
- Dashboard home page → top right corner
- Or in R2 → Settings → Account ID

### **Access Key ID & Secret:**
- R2 → Manage R2 API Tokens
- If you lost them, create a new token (old one still works)

### **Bucket Name:**
- R2 → Your bucket list
- Should be `jkuat-materials` (or whatever you named it)

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] `.env` file has R2 credentials (uncommented)
- [ ] Dev server restarted
- [ ] Admin dashboard shows R2 stats
- [ ] Migration script runs without errors
- [ ] No console errors about R2 configuration

---

## 🎯 How R2 Works in Your App

### **Automatic Behavior:**

1. **New uploads:**
   - Go to Supabase first (faster access)
   - If Supabase fails → automatically try R2

2. **Old materials:**
   - Run migration script weekly
   - Moves files older than 60 days with <5 downloads to R2
   - Frees up Supabase space

3. **Downloads:**
   - App checks `storage_location` in database
   - If `supabase` → use public URL
   - If `r2` → generate signed URL (24hr expiry)
   - **User sees no difference!**

---

## 📊 R2 Free Tier Limits

| Resource | Free Tier | Cost After Free Tier |
|----------|-----------|---------------------|
| **Storage** | 10 GB | $0.015/GB/month (~15 KES per 100GB) |
| **Class A ops** | 1M/month | $4.50 per million |
| **Class B ops** | 10M/month | $0.36 per million |
| **Egress** | **FREE** | **FREE** (no data transfer fees!) |

**Your capacity:**
- 1GB Supabase + 10GB R2 = **11GB total**
- ~2,750 PDFs (at 4MB average after compression)
- **6+ months runway** at current growth rate

---

## 🐛 Troubleshooting

### **"R2 client not configured" error:**
- ✅ Check `.env` has all 4 R2 variables
- ✅ Make sure lines are uncommented (no `#` at start)
- ✅ Restart dev server after editing `.env`

### **"Access Denied" error:**
- ✅ Check API token has Read & Write permissions
- ✅ Verify bucket name matches exactly
- ✅ Check Account ID is correct

### **Migration script fails:**
- ✅ Run `node scripts/migrate-to-r2.js --dry-run` first
- ✅ Check you have materials older than 60 days
- ✅ Verify R2 credentials are correct

### **Files not migrating:**
- ✅ Check `/admin/storage` → "Can Migrate" count
- ✅ Run migration with `--limit=1` to test one file
- ✅ Check console for error messages

---

## 💡 Best Practices

### **When to Run Migration:**

**Recommended schedule:**
- Check storage dashboard weekly
- Migrate when Supabase > 70% full
- Run: `node scripts/migrate-to-r2.js --limit=20` (migrate 20 files)

**Automation (future):**
- Set up weekly cron job
- Auto-migrate when threshold reached
- Email alerts for critical storage

### **What to Migrate:**

**Good candidates:**
- ✅ Old lecture notes (>60 days)
- ✅ Large files (>10MB)
- ✅ Rarely downloaded materials (<5 downloads)

**Keep in Supabase:**
- ✅ Recent uploads (<60 days)
- ✅ Popular materials (>20 downloads)
- ✅ Small files (<3MB)

---

## 🔒 Security Notes

1. **Keep credentials secret:**
   - Never commit `.env` to git
   - Don't share access keys publicly
   - Rotate keys every 6 months

2. **Bucket security:**
   - Keep bucket private (not public)
   - Use signed URLs for access (app does this automatically)
   - Monitor R2 dashboard for unusual activity

3. **Cost protection:**
   - Set up Cloudflare billing alerts at $5
   - Monitor storage usage in admin dashboard
   - Free tier is generous - hard to exceed accidentally

---

## 📞 Need Help?

**If you get stuck:**
1. Check the troubleshooting section above
2. Look at console errors in browser/terminal
3. Verify all credentials are correct
4. Test with `--dry-run` first

**Common issues:**
- Forgot to uncomment `.env` lines ← most common!
- Typo in credentials
- Didn't restart dev server

---

## 🎉 Success!

Once set up, your app will:
- ✅ Automatically use R2 for overflow
- ✅ Compress PDFs before upload
- ✅ Migrate old files to R2
- ✅ Show storage stats in admin dashboard
- ✅ Work seamlessly for users (they don't know files moved!)

**You just extended your runway from 7 weeks to 6+ months! 🚀**

---

## 📝 Quick Reference

**Your Credentials Location:**
- `.env` file (lines 7-13)

**Test Commands:**
```bash
# Check what would be migrated
node scripts/migrate-to-r2.js --dry-run

# Migrate 10 files
node scripts/migrate-to-r2.js --limit=10

# Migrate all candidates
node scripts/migrate-to-r2.js
```

**Admin Dashboard:**
- URL: `http://localhost:3000/admin/storage`
- Shows: Supabase usage, R2 usage, migration candidates

**Cloudflare Dashboard:**
- R2: [https://dash.cloudflare.com/r2](https://dash.cloudflare.com/r2)
- Check: Storage usage, API calls, billing

---

**Happy storing! 💾**
