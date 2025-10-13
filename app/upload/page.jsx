'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function UploadPage() {
  const [courses, setCourses] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploaderName, setUploaderName] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const [error, setError] = useState('')
  
  const supabase = createClient()
  
  // Load courses
  useEffect(() => {
    async function loadCourses() {
      const { data } = await supabase
        .from('courses')
        .select('id, course_code, course_name')
        .order('course_code')
      
      setCourses(data || [])
    }
    loadCourses()
  }, [])
  
  // Load topics when course selected
  useEffect(() => {
    if (!selectedCourse) {
      setTopics([])
      return
    }
    
    async function loadTopics() {
      const { data } = await supabase
        .from('topics')
        .select('id, topic_name, week_number')
        .eq('course_id', selectedCourse)
        .order('week_number')
      
      setTopics(data || [])
    }
    loadTopics()
  }, [selectedCourse])
  
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setShareMessage('')
    
    if (!file || !selectedCourse || !title) {
      setError('Please fill in all required fields')
      return
    }
    
    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('course_id', selectedCourse)
      formData.append('topic_id', selectedTopic)
      formData.append('title', title)
      formData.append('description', description)
      formData.append('uploader_name', uploaderName)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }
      
      // Success!
      setShareMessage(result.shareMessage)
      
      // Reset form
      setFile(null)
      setTitle('')
      setDescription('')
      setSelectedTopic('')
      document.getElementById('file-input').value = ''
      
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }
  
  function copyToClipboard() {
    navigator.clipboard.writeText(shareMessage)
    alert('Message copied! Paste in your class WhatsApp group.')
  }
  
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Upload Course Material</h1>
      <p className="text-gray-600 mb-6">
        Share materials with your classmates. Uploads are reviewed before publishing.
      </p>
      
      {shareMessage ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            ✅ Upload Successful!
          </h2>
          <p className="text-sm text-green-700 mb-4">
            Your material will be reviewed and published within 24 hours.
          </p>
          
          <div className="bg-white rounded border border-green-300 p-4 mb-4">
            <p className="text-sm font-mono whitespace-pre-wrap text-gray-800">
              {shareMessage}
            </p>
          </div>
          
          <button
            onClick={copyToClipboard}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Copy Message
          </button>
          
          <button
            onClick={() => setShareMessage('')}
            className="ml-2 text-green-600 hover:text-green-800"
          >
            Upload Another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Course <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            >
              <option value="">Select a course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.course_code} - {course.course_name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Topic Selection */}
          {topics.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Topic/Week (optional)
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">General / Not specific to a topic</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    Week {topic.week_number}: {topic.topic_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Material Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Material Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Lecture Notes - Chain Rule"
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the material..."
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload File <span className="text-red-500">*</span>
            </label>
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx,.pptx"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Accepted formats: PDF, DOCX, PPTX (max 50MB)
            </p>
            {file && (
              <p className="text-sm text-green-600 mt-2">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          
          {/* Uploader Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Your Name (optional)
            </label>
            <input
              type="text"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              placeholder="e.g., John Kamau"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get recognition for contributing! Leave blank to stay anonymous.
            </p>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Material'}
          </button>
        </form>
      )}
      
      <div className="mt-8 p-4 bg-gray-50 rounded border border-gray-200">
        <h3 className="font-semibold mb-2">Guidelines:</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Only upload materials you have permission to share</li>
          <li>Materials are reviewed before publishing (usually within 24 hours)</li>
          <li>Make titles clear and descriptive</li>
          <li>Tag with correct course and topic for easy discovery</li>
        </ul>
      </div>
    </div>
  )
}