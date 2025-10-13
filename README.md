# JKUAT Course Hub

Student-driven platform for organizing course materials and AI-powered tutoring during strikes/normal semesters.

## Core Problem
- Lecturers on strike → students don't know what to study
- Course materials scattered in WhatsApp groups
- Need organized access + AI explanations

## Solution
1. **Upload Pipeline**: Class reps upload materials (PDFs, notes)
2. **Organization**: Materials organized by course/week/topic
3. **AI Tutor**: RAG-powered Q&A grounded in actual course materials
4. **Community-Driven**: Content scales via student contributions

## Tech Stack

### Frontend & Hosting
- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Vercel** (hosting)

### Backend & Data
- **Supabase**:
  - PostgreSQL database
  - Authentication
  - File storage (PDFs)
  - pgvector (for embeddings)
- **Upstash Redis** (caching)

### AI Layer
- **Gemini 2.0 Flash** (free tier, Q&A)
- **OpenAI text-embedding-3-small** (embeddings)

### Payments
- **Intasend** (M-Pesa integration)

## Architecture

```
Student uploads PDF → Supabase Storage
    ↓
Admin approves → Status: "approved"
    ↓
Generate embeddings → Store in material_chunks table
    ↓
Student asks question → Embed question
    ↓
Vector search → Find relevant chunks
    ↓
Gemini generates answer → Cache in Redis
    ↓
Next query → Serve from cache (85% hit rate)
```

## Database Schema

### Core Tables
- `courses` - Course catalog (MAT 2100, CSC 100, etc.)
- `topics` - Week-by-week breakdown per course
- `materials` - Uploaded PDFs/files (with approval workflow)
- `material_chunks` - Text chunks with vector embeddings
- `profiles` - User data (extends Supabase auth)
- `question_cache` - Cached AI responses
- `analytics_events` - Usage tracking

### Key Relationships
- Course → Topics (1:many)
- Course → Materials (1:many)
- Material → Chunks (1:many)

## Key Features

### Phase 1 (MVP - Week 1-2)
1. **Upload System** (`/upload`)
   - Course/topic selection
   - File upload to Supabase Storage
   - Status: "pending" → admin approval

2. **Admin Approval** (`/admin/pending`)
   - List pending uploads
   - Approve/reject
   - Trigger embedding generation

3. **AI Chat** (`/courses/[id]/chat`)
   - RAG: Question → Vector search → Generate answer
   - Cache responses (Redis)
   - Cite sources

4. **Course Pages** (`/courses/[id]`)
   - Week-by-week outline
   - Materials list
   - Link to chat

### Phase 2 (Post-MVP)
- User authentication
- Rate limiting
- Analytics dashboard
- Premium tier (M-Pesa payments)

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
GEMINI_API_KEY=
OPENAI_API_KEY=

# Redis
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## File Structure

```
jkuat-course-hub/
├── app/
│   ├── api/
│   │   ├── upload/route.js          # File upload handler
│   │   ├── chat/route.js            # AI Q&A endpoint
│   │   └── generate-embeddings/route.js
│   ├── courses/[courseId]/
│   │   ├── page.jsx                 # Course detail
│   │   └── chat/page.jsx            # AI chat interface
│   ├── upload/page.jsx              # Material upload form
│   ├── admin/
│   │   ├── pending/page.jsx         # Approval queue
│   │   └── analytics/page.jsx       # Stats dashboard
│   └── page.jsx                     # Homepage
├── lib/
│   ├── supabase/
│   │   ├── client.js               # Browser client
│   │   └── server.js               # Server client
│   └── rate-limit.js               # Rate limiting utility
└── scripts/
    └── seed.js                     # Database seeding
```

## API Routes

### POST /api/upload
Upload course material (PDF, DOCX, PPTX)

**Body:** FormData with:
- `file`: File to upload
- `course_id`: UUID
- `topic_id`: UUID (optional)
- `title`: String
- `description`: String (optional)
- `uploader_name`: String (optional)

**Returns:**
```json
{
  "success": true,
  "materialId": "uuid",
  "shareMessage": "Copy-paste text for WhatsApp"
}
```

### POST /api/chat
Ask question about course materials

**Body:**
```json
{
  "question": "Explain the chain rule",
  "courseId": "uuid"
}
```

**Returns:**
```json
{
  "answer": "The chain rule is...",
  "sources": [
    {"index": 1, "preview": "...", "page": 47}
  ],
  "cached": true
}
```

### POST /api/generate-embeddings
Generate embeddings for approved material (admin only)

**Body:**
```json
{
  "materialId": "uuid"
}
```

## Development

```bash
# Install
npm install

# Run dev server
npm run dev

# Seed database
node scripts/seed.js

# Deploy
vercel --prod
```

## Business Model

### Free Tier (永久)
- Browse all materials
- Basic search
- 5 AI questions/week

### Premium (50-100 KES/month)
- Unlimited AI questions
- Advanced search
- Offline downloads
- Ad-free

### Institutional License (500K-2M KES/year)
- Bulk access for all students
- Analytics dashboard
- Custom branding

## Success Metrics

- **Week 1:** 10 users, 10 materials uploaded
- **Week 2:** 50 users, 50 materials
- **Month 1:** 200 users, 40%+ weekly return rate
- **Month 3:** 1,000 users, 3% convert to premium

## Critical Constraints

### Cost Optimization
- **Caching is mandatory** (85% cache hit rate target)
- Use Gemini free tier (1,500 req/day)
- pgvector (not Pinecone) to stay free

### Rate Limiting
- 20 questions/hour per IP (free users)
- 100 questions/hour (premium)

### Security
- File size limit: 50MB
- Allowed types: PDF, DOCX, PPTX only
- Admin approval before materials go live
- RLS policies on Supabase tables

## Launch Checklist

- [ ] Supabase project created
- [ ] Storage bucket configured
- [ ] Database seeded with 5 courses
- [ ] Upload → Approval → Chat flow tested
- [ ] Rate limiting enabled
- [ ] Error monitoring (Sentry)
- [ ] Deployed to Vercel
- [ ] Tested on mobile

## Contact

Built by [Your Name] - JKUAT First Year CS Student