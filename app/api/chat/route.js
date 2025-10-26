import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { Redis } from '@upstash/redis'

// Lazy initialization to avoid build-time errors
let genAI = null
let openai = null
let redis = null

function getGenAI() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return genAI
}

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openai
}

function getRedis() {
  if (!redis && process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    })
  }
  return redis
}

export async function POST(request) {
  try {
    const { question, courseId } = await request.json()
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Check cache first
    const redisClient = getRedis()
    const cacheKey = `answer:${courseId}:${hashString(question.toLowerCase())}`
    const cached = redisClient ? await redisClient.get(cacheKey) : null
    
    if (cached) {
      console.log('Cache hit!')
      return NextResponse.json({
        answer: cached.answer,
        sources: cached.sources,
        cached: true
      })
    }
    
    // Generate embedding for question
    const openaiClient = getOpenAI()
    if (!openaiClient) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }
    const embeddingResponse = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    })
    
    const questionEmbedding = embeddingResponse.data[0].embedding
    
    // Find relevant chunks
    const { data: chunks } = await supabase.rpc('match_chunks', {
      query_embedding: questionEmbedding,
      match_threshold: 0.7,
      match_count: 5,
      filter_course_id: courseId || null
    })
    
    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        answer: "I don't have information about this in the course materials. This topic might not be covered yet, or try rephrasing your question.",
        sources: [],
        cached: false
      })
    }
    
    // Build context from chunks
    const context = chunks
      .map((chunk, i) => `[${i + 1}] ${chunk.chunk_text}`)
      .join('\n\n---\n\n')
    
    // Get course info
    let courseName = 'your course'
    if (courseId) {
      const { data: course } = await supabase
        .from('courses')
        .select('course_name')
        .eq('id', courseId)
        .single()

      if (course) {
        courseName = course.course_name
      }
    }
    
    // Generate answer with Gemini
    const genAIClient = getGenAI()
    if (!genAIClient) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }
    const model = genAIClient.getGenerativeModel({ model: "gemini-2.0-flash-exp" })
    
    const prompt = `You are a helpful tutor for JKUAT students studying ${courseName}.

CRITICAL RULES:
1. Answer ONLY using the course materials provided below
2. If the materials don't contain the answer, say: "I don't have information about this in the course materials"
3. NEVER make up information
4. Cite which source you're using: [1], [2], etc.
5. Keep explanations clear and student-friendly
6. If asked about exams, remind students to check with their lecturer

Course materials:
${context}

Student question: ${question}

Provide a clear, helpful answer based ONLY on the materials above. Cite your sources.`

    const result = await model.generateContent(prompt)
    const answer = result.response.text()
    
    // Prepare sources for response
    const sources = chunks.map((chunk, i) => ({
      index: i + 1,
      preview: chunk.chunk_text.slice(0, 150) + '...',
      page: chunk.page_number,
      similarity: chunk.similarity
    }))
    
    // Cache the result
    if (redisClient) {
      await redisClient.set(cacheKey,
        JSON.stringify({ answer, sources }),
        { ex: 30 * 24 * 60 * 60 } // 30 days TTL
      )
    }
    
    // Track analytics
    await supabase.from('analytics_events').insert({
      event_type: 'question_asked',
      event_data: {
        question: question,
        course_id: courseId,
        sources_used: chunks.length,
        cached: false
      }
    })
    
    return NextResponse.json({
      answer,
      sources,
      cached: false
    })
    
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to generate answer' },
      { status: 500 }
    )
  }
}

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return hash.toString(36)
}