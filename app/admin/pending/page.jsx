'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminPendingPage() {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()
  
  useEffect(() => {
    loadPending()
  }, [])
  
  async function loadPending() {
    setLoading(true)
    
    const { data } = await supabase
      .from('materials')
      .select(`
        *,
        courses (course_code, course_name),
        topics (topic_name, week_number)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    setPending(data || [])
    setLoading(false)
  }
  
  async function approve(materialId) {
    const confirmed = confirm('Approve this material?')
    if (!confirmed) return
    
    const { error } = await supabase
      .from('materials')
      .update({ status: 'approved' })
      .eq('id', materialId)
    
    if (error) {
      alert('Error approving material')
      return
    }
    
    // Remove from list
    setPending(pending.filter(m => m.id !== materialId))
    
    // TODO: Trigger embedding generation job
    await fetch('/api/generate-embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId })
    })
  }
  
  async function reject(materialId) {
    const reason = prompt('Reason for rejection?')
    if (!reason) return
    
    const { error } = await supabase
      .from('materials')
      .update({ 
        status: 'rejected',
        rejection_reason: reason
      })
      .eq('id', materialId)
    
    if (error) {
      alert('Error rejecting material')
      return
    }
    
    setPending(pending.filter(m => m.id !== materialId))
  }
  
  function formatDate(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return `${Math.floor(diffMins / 1440)} days ago`
  }
  
  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Loading...</h1>
      </div>
    )
  }
  
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Pending Materials</h1>
      <p className="text-gray-600 mb-6">
        {pending.length} material{pending.length !== 1 ? 's' : ''} awaiting review
      </p>
      
      {pending.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No pending materials. You're all caught up! 🎉</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(material => (
            <div 
              key={material.id}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {material.title}
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium">Course:</span>{' '}
                      {material.courses.course_code} - {material.courses.course_name}
                    </p>
                    {material.topics && (
                      <p>
                        <span className="font-medium">Topic:</span>{' '}
                        Week {material.topics.week_number}: {material.topics.topic_name}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Uploaded by:</span>{' '}
                      {material.uploaded_by || 'Anonymous'}
                    </p>
                    <p>
                      <span className="font-medium">Time:</span>{' '}
                      {formatDate(material.created_at)}
                    </p>
                    <p>
                      <span className="font-medium">Size:</span>{' '}
                      {(material.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {material.description && (
                    <p className="text-sm text-gray-700 mt-2 italic">
                      "{material.description}"
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <a
                  href={material.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                >
                  Preview File →
                </a>
                
                <button
                  onClick={() => approve(material.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  ✓ Approve
                </button>
                
                <button
                  onClick={() => reject(material.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}