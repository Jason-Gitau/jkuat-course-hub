import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import pdfParse from 'pdf-parse'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request) {
  try {
    const { materialId } = await request.json()
    const supabase = createClient()
    
    // Get material details
    const { data: material } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .single()
    
    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }
    
    // Only process PDFs for now
    if (material.type !== 'pdf') {
      return NextResponse.json({ 
        success: true, 
        message: 'Not a PDF, skipping embedding generation' 
      })
    }
    
    // Download PDF
    const response = await fetch(material.file_url)
    const buffer = await response.arrayBuffer()
    
    // Extract text
    const pdfData = await pdfParse(Buffer.from(buffer))
    const fullText = pdfData.text
    
    // Chunk text (500-800 characters per chunk)
    const chunks = chunkText(fullText, 700)
    
    // Generate embeddings for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk.text,
      })
      
      const embedding = embeddingResponse.data[0].embedding
      
      // Save to database
      await supabase.from('material_chunks').insert({
        material_id: materialId,
        chunk_text: chunk.text,
        chunk_index: i,
        page_number: chunk.page,
        embedding: embedding
      })
    }
    
    return NextResponse.json({ 
      success: true,
      chunksGenerated: chunks.length
    })
    
  } catch (error) {
    console.error('Embedding generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate embeddings' },
      { status: 500 }
    )
  }
}

function chunkText(text, chunkSize = 700) {
  const chunks = []
  const paragraphs = text.split('\n\n')
  
  let currentChunk = ''
  let currentPage = 1 // Simplified - would need better page detection
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        page: currentPage
      })
      currentChunk = para
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      page: currentPage
    })
  }
  
  return chunks
}