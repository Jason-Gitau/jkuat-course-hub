'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/auth/useUser'

export default function UploadPage() {
  const { user, profile, loading: authLoading } = useUser()
  const [courses, setCourses] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploaderName, setUploaderName] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [shareMessage, setShareMessage] = useState('')
  const [error, setError] = useState('')
  const [materialCategory, setMaterialCategory] = useState('')
  const [weekNumber, setWeekNumber] = useState('')
  const [yearNumber, setYearNumber] = useState('')
  const [assignmentNumber, setAssignmentNumber] = useState('')

  // Autocomplete states
  const [courseSearch, setCourseSearch] = useState('')
  const [unitSearch, setUnitSearch] = useState('')
  const [showCourseDropdown, setShowCourseDropdown] = useState(false)
  const [showUnitDropdown, setShowUnitDropdown] = useState(false)
  const [filteredCourses, setFilteredCourses] = useState([])
  const [filteredUnits, setFilteredUnits] = useState([])

  // Create new course/unit states
  const [showCreateCourse, setShowCreateCourse] = useState(false)
  const [showCreateUnit, setShowCreateUnit] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseCode, setNewCourseCode] = useState('')
  const [newCourseDepartment, setNewCourseDepartment] = useState('')
  const [newUnitName, setNewUnitName] = useState('')
  const [newUnitCode, setNewUnitCode] = useState('')
  const [newUnitYear, setNewUnitYear] = useState('')
  const [newUnitSemester, setNewUnitSemester] = useState('')
  const [creating, setCreating] = useState(false)
  const [materialWeekNumber, setMaterialWeekNumber] = useState('')

  const supabase = createClient()

  // Pre-fill form with user's profile data
  useEffect(() => {
    if (profile) {
      // Set uploader name from profile
      if (profile.full_name) {
        setUploaderName(profile.full_name)
      }

      // Pre-select user's course if they have one
      if (profile.course_id && profile.courses) {
        setSelectedCourse(profile.course_id)
        setCourseSearch(`${profile.courses.course_code} - ${profile.courses.course_name}`)
      }
    }
  }, [profile])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest('.autocomplete-container')) {
        setShowCourseDropdown(false)
        setShowUnitDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
  
  // Filter courses based on search
  useEffect(() => {
    if (!courseSearch) {
      setFilteredCourses([])
      return
    }

    const filtered = courses.filter(course =>
      course.course_name.toLowerCase().includes(courseSearch.toLowerCase()) ||
      course.course_code.toLowerCase().includes(courseSearch.toLowerCase())
    )
    setFilteredCourses(filtered)
  }, [courseSearch, courses])

  // Filter units based on search
  useEffect(() => {
    if (!unitSearch || !selectedCourse) {
      setFilteredUnits([])
      return
    }

    const filtered = topics.filter(topic =>
      topic.topic_name.toLowerCase().includes(unitSearch.toLowerCase())
    )
    setFilteredUnits(filtered)
  }, [unitSearch, topics])

  // Load topics when course selected
  useEffect(() => {
    if (!selectedCourse) {
      setTopics([])
      setUnitSearch('')
      setSelectedTopic('')
      return
    }

    async function loadTopics() {
      const { data } = await supabase
        .from('topics')
        .select('id, topic_name, week_number, unit_code, year, semester')
        .eq('course_id', selectedCourse)
        .order('year', { ascending: true })
        .order('semester', { ascending: true })

      setTopics(data || [])
    }
    loadTopics()
  }, [selectedCourse])

  // Handlers
  function handleCourseSelect(course) {
    setSelectedCourse(course.id)
    setCourseSearch(`${course.course_code} - ${course.course_name}`)
    setShowCourseDropdown(false)
  }

  function handleUnitSelect(topic) {
    setSelectedTopic(topic.id)
    const yearLabel = topic.year ? `Year ${topic.year}` : ''
    const semLabel = topic.semester ? `Sem ${topic.semester}` : ''
    const unitLabel = topic.unit_code ? `${topic.unit_code} - ${topic.topic_name}` : topic.topic_name
    const metadata = [yearLabel, semLabel].filter(Boolean).join(', ')
    setUnitSearch(metadata ? `${unitLabel} (${metadata})` : unitLabel)
    setShowUnitDropdown(false)
  }

  // Generate share message client-side for faster UI response
  function generateShareMessage(materialData) {
    const { id, title, material_category, category_metadata, week_number, course, topic, uploaded_by } = materialData

    // Format material type
    const formatMaterialType = () => {
      if (!material_category) return ''

      const typeLabels = {
        'complete_notes': 'Complete Semester Notes',
        'weekly_notes': 'Weekly Notes',
        'past_paper': 'Past Paper',
        'assignment': 'Assignment',
        'lab_guide': 'Lab Guide',
        'other': 'Material'
      }

      let typeStr = typeLabels[material_category] || 'Material'

      if (category_metadata) {
        if (category_metadata.week) typeStr += ` (Week ${category_metadata.week})`
        if (category_metadata.year) typeStr += ` (${category_metadata.year})`
        if (category_metadata.assignment_number) typeStr += ` #${category_metadata.assignment_number}`
      }

      return `Type: ${typeStr}\n`
    }

    // Format topic/unit information
    const formatTopicInfo = () => {
      if (!topic) return ''

      const unitLabel = topic.unit_code ? `${topic.unit_code} - ${topic.topic_name}` : topic.topic_name
      const yearSemInfo = topic.year && topic.semester
        ? ` (Year ${topic.year}, Semester ${topic.semester})`
        : ''
      const weekInfo = week_number ? `\nWeek: ${week_number}` : ''

      return `Unit: ${unitLabel}${yearSemInfo}${weekInfo}\n`
    }

    const siteUrl = window.location.origin
    const uploaderText = uploaded_by || 'Anonymous'

    return `✅ New material uploaded!

Course: ${course.course_name} (${course.course_code})
${formatTopicInfo()}${formatMaterialType()}Material: ${title}

View: ${siteUrl}/materials/${id}

All materials: ${siteUrl}/courses/${selectedCourse}

Uploaded by: ${uploaderText}`
  }

  async function handleCreateCourse() {
    if (!newCourseName || !newCourseCode || !newCourseDepartment) {
      setError('Please fill in all course fields')
      return
    }

    setCreating(true)
    try {
      const { data, error: createError } = await supabase
        .from('courses')
        .insert({
          course_name: newCourseName,
          course_code: newCourseCode.toUpperCase(),
          description: `${newCourseDepartment} course`
        })
        .select()
        .single()

      if (createError) throw createError

      // Add to courses list and select it
      setCourses([...courses, data])
      setSelectedCourse(data.id)
      setCourseSearch(`${data.course_code} - ${data.course_name}`)

      // Reset form
      setShowCreateCourse(false)
      setNewCourseName('')
      setNewCourseCode('')
      setNewCourseDepartment('')
      setError('')
    } catch (err) {
      setError(`Failed to create course: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleCreateUnit() {
    if (!newUnitName || !newUnitCode || !newUnitYear || !newUnitSemester || !selectedCourse) {
      setError('Please fill in all unit fields (including year and semester) and select a course first')
      return
    }

    setCreating(true)
    try {
      const { data, error: createError } = await supabase
        .from('topics')
        .insert({
          course_id: selectedCourse,
          topic_name: newUnitName,
          unit_code: newUnitCode.toUpperCase(),
          year: parseInt(newUnitYear),
          semester: parseInt(newUnitSemester),
          week_number: null // Deprecated field, set to null for new units
        })
        .select()
        .single()

      if (createError) throw createError

      // Add to topics list and select it
      setTopics([...topics, data])
      setSelectedTopic(data.id)
      setUnitSearch(`${data.unit_code} - ${data.topic_name} (Year ${data.year}, Sem ${data.semester})`)

      // Reset form
      setShowCreateUnit(false)
      setNewUnitName('')
      setNewUnitCode('')
      setNewUnitYear('')
      setNewUnitSemester('')
      setError('')
    } catch (err) {
      setError(`Failed to create unit: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }
  
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setShareMessage('')
    setUploadProgress(0)

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

      // Add week number for weekly materials organization
      if (materialWeekNumber) {
        formData.append('week_number', materialWeekNumber)
      }

      // Add material category if selected
      if (materialCategory) {
        formData.append('material_category', materialCategory)

        // Build category metadata based on category type
        const metadata = {}
        if (materialCategory === 'weekly_notes' && weekNumber) {
          metadata.week = parseInt(weekNumber)
        }
        if (materialCategory === 'past_paper' && yearNumber) {
          metadata.year = parseInt(yearNumber)
        }
        if (materialCategory === 'assignment' && assignmentNumber) {
          metadata.assignment_number = parseInt(assignmentNumber)
        }

        if (Object.keys(metadata).length > 0) {
          formData.append('category_metadata', JSON.stringify(metadata))
        }
      }

      // Show initial progress
      setUploadProgress(10)

      // Create XMLHttpRequest for upload progress tracking
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 90) // Reserve 10% for processing
          setUploadProgress(percentComplete)
        }
      })

      // Handle completion
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100)
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'))
          }
        })
        xhr.addEventListener('error', () => reject(new Error('Network error')))
      })

      // Send request
      xhr.open('POST', '/api/upload')
      xhr.send(formData)

      const result = await uploadPromise

      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      // Generate share message client-side (instant, non-blocking)
      const message = generateShareMessage(result.material)
      setShareMessage(message)

      // Reset form
      setFile(null)
      setTitle('')
      setDescription('')
      setSelectedTopic('')
      setMaterialCategory('')
      setMaterialWeekNumber('')
      setWeekNumber('')
      setYearNumber('')
      setAssignmentNumber('')
      setUploadProgress(0)
      document.getElementById('file-input').value = ''

    } catch (err) {
      setError(err.message)
      setUploadProgress(0)
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
        Share materials with your classmates. Uploads are published immediately.
      </p>

      {/* User Profile Banner */}
      {profile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
              {profile.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{profile.full_name}</p>
              {profile.courses && (
                <p className="text-sm text-blue-700">
                  {profile.courses.course_name} • Year {profile.year_of_study}
                </p>
              )}
              <p className="text-xs text-gray-600 mt-1">
                Your course and name will be pre-filled below
              </p>
            </div>
          </div>
        </div>
      )}

      {shareMessage ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            ✅ Upload Successful!
          </h2>
          <p className="text-sm text-green-700 mb-4">
            Your material is now live and visible to all users!
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
          
          {/* Course Selection with Autocomplete */}
          <div>
            <label className="block text-sm font-medium mb-2">
              1. Course <span className="text-red-500">*</span>
            </label>
            <div className="relative autocomplete-container">
              <input
                type="text"
                value={courseSearch}
                onChange={(e) => {
                  setCourseSearch(e.target.value)
                  setShowCourseDropdown(true)
                  if (!e.target.value) {
                    setSelectedCourse('')
                  }
                }}
                onFocus={() => setShowCourseDropdown(true)}
                placeholder="Type to search courses..."
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />

              {/* Autocomplete Dropdown */}
              {showCourseDropdown && courseSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCourses.length > 0 ? (
                    <>
                      {filteredCourses.map(course => (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => handleCourseSelect(course)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100"
                        >
                          <div className="font-medium">{course.course_code}</div>
                          <div className="text-sm text-gray-600">{course.course_name}</div>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-gray-500 mb-3">No courses found</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateCourse(true)
                          setShowCourseDropdown(false)
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                      >
                        + Create New Course
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedCourse && (
              <p className="text-sm text-green-600 mt-1">✓ Course selected</p>
            )}
          </div>

          {/* Create New Course Modal */}
          {showCreateCourse && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-bold mb-4">Create New Course</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Course Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCourseCode}
                      onChange={(e) => setNewCourseCode(e.target.value)}
                      placeholder="e.g., CVE 201"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Course Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      placeholder="e.g., Structural Analysis I"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCourseDepartment}
                      onChange={(e) => setNewCourseDepartment(e.target.value)}
                      placeholder="e.g., Civil Engineering"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCreateCourse}
                    disabled={creating}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {creating ? 'Creating...' : 'Create Course'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCourse(false)
                      setNewCourseName('')
                      setNewCourseCode('')
                      setNewCourseDepartment('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Unit/Topic Selection with Autocomplete */}
          {selectedCourse && (
            <div>
              <label className="block text-sm font-medium mb-2">
                2. Unit (optional)
              </label>
              <div className="relative autocomplete-container">
                <input
                  type="text"
                  value={unitSearch}
                  onChange={(e) => {
                    setUnitSearch(e.target.value)
                    setShowUnitDropdown(true)
                    if (!e.target.value) {
                      setSelectedTopic('')
                    }
                  }}
                  onFocus={() => setShowUnitDropdown(true)}
                  placeholder="Type to search units or leave blank for general..."
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />

                {/* Autocomplete Dropdown */}
                {showUnitDropdown && unitSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredUnits.length > 0 ? (
                      <>
                        {filteredUnits.map(topic => (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => handleUnitSelect(topic)}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100"
                          >
                            <div className="font-medium">
                              {topic.unit_code ? `${topic.unit_code} - ${topic.topic_name}` : topic.topic_name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {topic.year && topic.semester ? `Year ${topic.year}, Semester ${topic.semester}` : `Week ${topic.week_number || 'N/A'}`}
                            </div>
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-gray-500 mb-3">No units found</p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateUnit(true)
                            setShowUnitDropdown(false)
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                        >
                          + Create New Unit
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedTopic && (
                <p className="text-sm text-green-600 mt-1">✓ Unit selected</p>
              )}
              {!selectedTopic && !unitSearch && (
                <p className="text-sm text-gray-500 mt-1">Leaving blank will mark as general material</p>
              )}
            </div>
          )}

          {/* Create New Unit Modal */}
          {showCreateUnit && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-bold mb-4">Create New Unit</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Unit Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUnitCode}
                      onChange={(e) => setNewUnitCode(e.target.value)}
                      placeholder="e.g., CVE 2101"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Unit Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                      placeholder="e.g., Calculus I"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newUnitYear}
                      onChange={(e) => setNewUnitYear(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="">Select year...</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Semester <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newUnitSemester}
                      onChange={(e) => setNewUnitSemester(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="">Select semester...</option>
                      <option value="1">1st Semester</option>
                      <option value="2">2nd Semester</option>
                    </select>
                  </div>

                  <p className="text-sm text-gray-600">
                    This unit will be added to the selected course
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCreateUnit}
                    disabled={creating}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {creating ? 'Creating...' : 'Create Unit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateUnit(false)
                      setNewUnitName('')
                      setNewUnitCode('')
                      setNewUnitYear('')
                      setNewUnitSemester('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Material Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              3. Material Title <span className="text-red-500">*</span>
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

          {/* Week Number for Material Organization */}
          {selectedTopic && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Week Number (optional)
              </label>
              <select
                value={materialWeekNumber}
                onChange={(e) => setMaterialWeekNumber(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select week (or leave blank for general materials)...</option>
                {Array.from({ length: 15 }, (_, i) => i + 1).map(week => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Organize materials by week within the semester. Leave blank for past papers or general materials.
              </p>
            </div>
          )}

          {/* Material Type (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Material Type (optional)
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="materialCategory"
                  value=""
                  checked={materialCategory === ''}
                  onChange={(e) => setMaterialCategory(e.target.value)}
                  className="w-4 h-4"
                />
                <span>Not specified</span>
              </label>

              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="materialCategory"
                  value="complete_notes"
                  checked={materialCategory === 'complete_notes'}
                  onChange={(e) => setMaterialCategory(e.target.value)}
                  className="w-4 h-4"
                />
                <span>Complete Semester Notes</span>
              </label>

              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="materialCategory"
                  value="weekly_notes"
                  checked={materialCategory === 'weekly_notes'}
                  onChange={(e) => setMaterialCategory(e.target.value)}
                  className="w-4 h-4"
                />
                <span>Weekly Notes</span>
              </label>

              {materialCategory === 'weekly_notes' && (
                <div className="ml-7 mt-2">
                  <input
                    type="number"
                    placeholder="Week number (e.g., 3)"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(e.target.value)}
                    min="1"
                    max="15"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              )}

              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="materialCategory"
                  value="past_paper"
                  checked={materialCategory === 'past_paper'}
                  onChange={(e) => setMaterialCategory(e.target.value)}
                  className="w-4 h-4"
                />
                <span>Past Paper</span>
              </label>

              {materialCategory === 'past_paper' && (
                <div className="ml-7 mt-2">
                  <input
                    type="number"
                    placeholder="Year (e.g., 2023)"
                    value={yearNumber}
                    onChange={(e) => setYearNumber(e.target.value)}
                    min="2000"
                    max={new Date().getFullYear()}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              )}

              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="materialCategory"
                  value="assignment"
                  checked={materialCategory === 'assignment'}
                  onChange={(e) => setMaterialCategory(e.target.value)}
                  className="w-4 h-4"
                />
                <span>Assignment</span>
              </label>

              {materialCategory === 'assignment' && (
                <div className="ml-7 mt-2">
                  <input
                    type="number"
                    placeholder="Assignment number (e.g., 1)"
                    value={assignmentNumber}
                    onChange={(e) => setAssignmentNumber(e.target.value)}
                    min="1"
                    max="10"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              )}

              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="materialCategory"
                  value="lab_guide"
                  checked={materialCategory === 'lab_guide'}
                  onChange={(e) => setMaterialCategory(e.target.value)}
                  className="w-4 h-4"
                />
                <span>Lab Guide</span>
              </label>

              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="materialCategory"
                  value="other"
                  checked={materialCategory === 'other'}
                  onChange={(e) => setMaterialCategory(e.target.value)}
                  className="w-4 h-4"
                />
                <span>Other</span>
              </label>
            </div>
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
          
          {/* Upload Progress Bar */}
          {uploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-center text-gray-600">
                {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload Material'}
          </button>
        </form>
      )}
      
      <div className="mt-8 p-4 bg-gray-50 rounded border border-gray-200">
        <h3 className="font-semibold mb-2">Guidelines:</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Only upload materials you have permission to share</li>
          <li>Materials are published immediately and visible to everyone</li>
          <li>Make titles clear and descriptive</li>
          <li>Tag with correct course, unit, and week for easy discovery</li>
        </ul>
      </div>
    </div>
  )
}