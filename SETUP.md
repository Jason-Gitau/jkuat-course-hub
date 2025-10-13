# Upload System Setup Guide

## Overview
The upload system allows students (especially class reps) to upload course materials (PDFs, DOCX, PPTX) which are then stored in Supabase and await admin approval before being published.

## Setup Completed ✅

### 1. Database Schema
- ✅ `courses` table exists
- ✅ `topics` table exists
- ✅ `materials` table exists
- ✅ Sample data seeded (5 courses, 24 topics)

### 2. Application Code
- ✅ Upload page: `app/upload/page.jsx`
- ✅ Upload API: `app/api/upload/route.js`
- ✅ Supabase clients: `lib/supabase/client.js` and `lib/supabase/server.js`
- ✅ Environment variables configured in `.env`

### 3. Features Implemented

#### Upload Form (`/upload`)
- Course selection dropdown (populated from database)
- Topic/week selection (dynamically loaded based on course)
- File upload with validation:
  - Max size: 50MB
  - Allowed types: PDF, DOCX, PPTX
- Material title (required)
- Description (optional)
- Uploader name (optional, defaults to "Anonymous")
- Success message with shareable text for WhatsApp

#### Upload API (`/api/upload`)
- Validates file size and type
- Uploads file to Supabase Storage bucket `materials`
- Saves metadata to `materials` table with status "pending"
- Returns shareable message for WhatsApp groups
- Error handling for all edge cases

## Storage Bucket ✅

The upload system uses the existing **"course pdfs"** bucket in Supabase for storing uploaded materials.

- ✅ Bucket name: `course pdfs`
- ✅ Files organized by course ID folders
- ✅ Max file size: 50MB
- ✅ Allowed types: PDF, DOCX, PPTX

## Testing the Upload System

### 1. Start Development Server
```bash
npm run dev
```

### 2. Visit Upload Page
Open http://localhost:3000/upload in your browser

### 3. Test Upload Flow
1. Select a course (e.g., "MAT 2100 - Calculus I")
2. Select a topic (e.g., "Week 3: Chain Rule and Implicit Differentiation")
3. Enter a title (e.g., "Chain Rule Lecture Notes")
4. Add description (optional)
5. Upload a PDF file
6. Enter your name (optional)
7. Click "Upload Material"

### 4. Expected Result
- Upload succeeds
- Success message appears with shareable WhatsApp text
- Material saved to database with status "pending"
- File stored in Supabase Storage

### 5. Verify in Supabase Dashboard
**Database:**
- Go to Table Editor → materials
- Your uploaded material should appear with status "pending"

**Storage:**
- Go to Storage → course pdfs
- Your file should be there in a folder named by course_id

## Database Seed Data

The following courses have been added:

1. **MAT 2100** - Calculus I (8 topics)
2. **CSC 100** - Introduction to Computer Science (8 topics)
3. **CSC 110** - Programming I (8 topics)
4. **PHY 100** - Physics I (no topics)
5. **ENG 100** - Communication Skills (no topics)

To re-seed the database:
```bash
# First, delete existing data in Supabase Dashboard
# Then run:
node scripts/seed.js
```

## File Structure

```
app/
├── upload/page.jsx              # Upload form UI
└── api/upload/route.js          # Upload handler

lib/supabase/
├── client.js                    # Browser Supabase client
└── server.js                    # Server Supabase client

scripts/
├── seed.js                      # Database seeding
├── verify-setup.js              # Setup verification
├── setup-storage.js             # Storage bucket creation (needs service key)
└── check-schema.js              # Schema inspection

.env                             # Environment variables
```

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://dmtscfvythxxnhluyscw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Next Steps (Phase 1 - Remaining Features)

1. **Admin Approval System** (`/admin/pending`)
   - List pending uploads
   - Approve/reject functionality
   - Trigger embedding generation on approval

2. **Testing & Validation**
   - Test upload with actual PDF files
   - Verify file storage in "course pdfs" bucket
   - Test error cases (large files, wrong types, etc.)

## Troubleshooting

### Upload fails with "Upload failed"
- Check that the storage bucket `course pdfs` exists
- Verify RLS policies allow uploads

### "Missing required fields" error
- Ensure course, title, and file are provided
- Check browser console for details

### File too large error
- Maximum file size is 50MB
- Compress PDFs before uploading

### Database connection errors
- Verify .env file has correct Supabase credentials
- Check that tables exist in Supabase Dashboard

## Verification Script

Run this anytime to check setup status:
```bash
node scripts/verify-setup.js
```

This will check:
- Storage bucket exists
- Database tables exist
- Sample data is present
