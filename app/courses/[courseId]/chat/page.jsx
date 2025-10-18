'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

export default function ChatPage() {
  const params = useParams()
  const courseId = params.courseId
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [course, setCourse] = useState(null)
  
  const messagesEndRef = useRef(null)
  const supabase = createClient()
  
  useEffect(() => {
    // Load course info
    async function loadCourse() {
      const { data } = await supabase
        .from('courses')
        .select('course_name, department')
        .eq('id', courseId)
        .single()

      setCourse(data)
    }
    loadCourse()
  }, [courseId])
  
  useEffect(() => {
    // Scroll to bottom when new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  async function askQuestion() {
    if (!input.trim() || loading) return
    
    const question = input.trim()
    setInput('')
    
    // Add user message
    setMessages([...messages, { role: 'user', content: question }])
    setLoading(true)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, courseId })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer')
      }
      
      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        cached: data.cached
      }])
      
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: `Error: ${error.message}`
      }])
    } finally {
      setLoading(false)
    }
  }
  
  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      askQuestion()
    }
  }
  
  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold">
          {course ? `${course.course_name} AI Tutor` : 'AI Tutor'}
        </h1>
        <p className="text-sm text-gray-600">
          Ask questions about course materials
        </p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium mb-2">Ask your first question</p>
            <p className="text-sm">Try: "Explain the chain rule" or "What is implicit differentiation?"</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div 
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-lg p-4 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white'
                  : msg.role === 'error'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300 text-xs">
                  <p className="font-semibold mb-1">Sources:</p>
                  <ul className="space-y-1">
                    {msg.sources.map(source => (
                      <li key={source.index} className="text-gray-700">
                        [{source.index}] {source.preview}
                      </li>
                    ))}
                  </ul>
                  {msg.cached && (
                    <p className="mt-2 text-gray-600 italic">
                      ⚡ Instant answer (cached)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about the course..."
            rows={2}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={askQuestion}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}