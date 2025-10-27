'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/auth/useUser'
import { syncMaterialsForCourse, syncTopicsForCourse, syncCourses } from '@/lib/db/syncManager'
import { addToUploadQueue, initUploadQueue } from '@/lib/uploadQueue'
import UploadQueue from '@/components/UploadQueue'

export default function UploadPage() {
  const { user, profile, loading: authLoading } = useUser()
  const [courses, setCourses] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploaderName, setUploaderName] = useState('')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [shareMessage, setShareMessage] = useState('')
  const [error, setError] = useState('')
  const [materialCategory, setMaterialCategory] = useState('')
  const [weekNumber, setWeekNumber] = useState('')
  const [yearNumber, setYearNumber] = useState('')
  const [assignmentNumber, setAssignmentNumber] = useState('')
  const [isDragging, setIsDragging] = useState(false)

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
  const [newCourseDepartment, setNewCourseDepartment] = useState('')
  const [newUnitName, setNewUnitName] = useState('')
  const [newUnitCode, setNewUnitCode] = useState('')
  const [newUnitYear, setNewUnitYear] = useState('')
  const [newUnitSemester, setNewUnitSemester] = useState('')
  const [creating, setCreating] = useState(false)
  const [materialWeekNumber, setMaterialWeekNumber] = useState('')
  const [queuedToast, setQueuedToast] = useState('')

  const supabase = createClient()

  // Initialize upload queue
  useEffect(() => {
    initUploadQueue()
  }, [])

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
        setCourseSearch(profile.courses.course_name)
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
        .select('id, course_name, department')
        .order('course_name')

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
      (course.department && course.department.toLowerCase().includes(courseSearch.toLowerCase()))
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
    setCourseSearch(course.course_name)
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
        'notes': 'Notes',
        'past_paper': 'Past Paper',
        'lab_material': 'Lab Material',
        'assignment': 'Assignment',
        // Legacy support for old categories
        'complete_notes': 'Complete Semester Notes',
        'weekly_notes': 'Weekly Notes',
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

Course: ${course.course_name}
${formatTopicInfo()}${formatMaterialType()}Material: ${title}

View: ${siteUrl}/materials/${id}

All materials: ${siteUrl}/courses/${selectedCourse}

Uploaded by: ${uploaderText}`
  }

  // Smart filename parsing to auto-detect week/year/category
  function parseFileName(filename) {
    const parsed = {
      week: null,
      year: null,
      assignmentNumber: null,
      category: null
    }

    const nameLower = filename.toLowerCase()

    // Detect week numbers: "week_5", "week5", "w5", etc.
    const weekMatch = nameLower.match(/(?:week|w)[\s_-]*(\d+)/i)
    if (weekMatch) {
      parsed.week = weekMatch[1]
    }

    // Detect year: "2023", "2024", etc.
    const yearMatch = nameLower.match(/(20\d{2})/)
    if (yearMatch) {
      parsed.year = yearMatch[1]
    }

    // Detect assignment number: "assignment_2", "assignment2", "assgn2", etc.
    const assignmentMatch = nameLower.match(/(?:assignment|assgn|hw)[\s_-]*(\d+)/i)
    if (assignmentMatch) {
      parsed.assignmentNumber = assignmentMatch[1]
    }

    // Detect category from filename
    if (nameLower.includes('note') || nameLower.includes('lecture')) {
      parsed.category = 'notes'
    } else if (nameLower.includes('past') || nameLower.includes('exam') || nameLower.includes('paper')) {
      parsed.category = 'past_paper'
    } else if (nameLower.includes('lab') || nameLower.includes('practical')) {
      parsed.category = 'lab_material'
    } else if (nameLower.includes('assignment') || nameLower.includes('homework') || nameLower.includes('hw')) {
      parsed.category = 'assignment'
    }

    return parsed
  }

  // Get file icon based on file type
  function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word') || mimeType.includes('docx')) return '📝'
    if (mimeType.includes('powerpoint') || mimeType.includes('pptx')) return '📊'
    return '📎'
  }

  // Handle file selection (from input or drag-drop)
  function handleFileSelect(e) {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    // Auto-detect from first file if category not set
    if (!materialCategory && selectedFiles.length > 0) {
      const parsed = parseFileName(selectedFiles[0].name)
      if (parsed.category) setMaterialCategory(parsed.category)
      if (parsed.week) setWeekNumber(parsed.week)
      if (parsed.year) setYearNumber(parsed.year)
      if (parsed.assignmentNumber) setAssignmentNumber(parsed.assignmentNumber)
    }

    setFiles(prev => [...prev, ...selectedFiles])
    setError('')
  }

  // Remove a file from selection
  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Drag & drop handlers
  function handleDragEnter(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    // Only set false if leaving the drop zone itself
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files || [])
    if (droppedFiles.length === 0) return

    // Auto-detect from first file if category not set
    if (!materialCategory && droppedFiles.length > 0) {
      const parsed = parseFileName(droppedFiles[0].name)
      if (parsed.category) setMaterialCategory(parsed.category)
      if (parsed.week) setWeekNumber(parsed.week)
      if (parsed.year) setYearNumber(parsed.year)
      if (parsed.assignmentNumber) setAssignmentNumber(parsed.assignmentNumber)
    }

    setFiles(prev => [...prev, ...droppedFiles])
    setError('')
  }

  async function handleCreateCourse() {
    if (!newCourseName || !newCourseDepartment) {
      setError('Please fill in all course fields')
      return
    }

    setCreating(true)
    try {
      const { data, error: createError} = await supabase
        .from('courses')
        .insert({
          course_name: newCourseName,
          department: newCourseDepartment,
          description: `${newCourseDepartment} program`
        })
        .select()
        .single()

      if (createError) throw createError

      // Add to courses list and select it
      setCourses([...courses, data])
      setSelectedCourse(data.id)
      setCourseSearch(data.course_name)

      // OFFLINE-FIRST: Sync new course to IndexedDB in background (non-blocking)
      syncCourses().catch(err =>
        console.warn('⚠️ Background course sync failed:', err)
      )

      // Reset form
      setShowCreateCourse(false)
      setNewCourseName('')
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

      // OFFLINE-FIRST: Sync new unit to IndexedDB in background (non-blocking)
      syncTopicsForCourse(selectedCourse).catch(err =>
        console.warn('⚠️ Background unit sync failed:', err)
      )

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
  
  // Upload all selected files to queue
  async function handleUpload(e) {
    e.preventDefault()
    setError('')
    setQueuedToast('')

    // Validate required fields: files, course, unit, material type
    if (files.length === 0 || !selectedCourse || !selectedTopic || !materialCategory) {
      setError('Please fill in all required fields (Course, Unit, Material Type, and File)')
      return
    }

    try {
      const selectedTopicData = topics.find(t => t.id === selectedTopic)
      const categoryNames = {
        'notes': 'Notes',
        'past_paper': 'Past Paper',
        'lab_material': 'Lab Material',
        'assignment': 'Assignment'
      }
      const categoryName = categoryNames[materialCategory] || 'Material'
      const unitCode = selectedTopicData?.unit_code || 'Unit'

      // Build category metadata
      const categoryMetadata = {}
      if ((materialCategory === 'notes' || materialCategory === 'lab_material') && weekNumber) {
        categoryMetadata.week = parseInt(weekNumber)
      }
      if (materialCategory === 'past_paper' && yearNumber) {
        categoryMetadata.year = parseInt(yearNumber)
      }
      if (materialCategory === 'assignment' && assignmentNumber) {
        categoryMetadata.assignment_number = parseInt(assignmentNumber)
      }

      // Queue all files
      const uploadPromises = files.map(async (file) => {
        // Auto-generate title for each file if not provided
        let finalTitle = title
        if (!finalTitle || finalTitle.trim() === '') {
          let metadata = ''
          if (materialCategory === 'notes' && weekNumber) {
            metadata = ` - Week ${weekNumber}`
          } else if (materialCategory === 'lab_material' && weekNumber) {
            metadata = ` - Week ${weekNumber}`
          } else if (materialCategory === 'past_paper' && yearNumber) {
            metadata = ` - ${yearNumber}`
          } else if (materialCategory === 'assignment' && assignmentNumber) {
            metadata = ` - Assignment ${assignmentNumber}`
          }
          finalTitle = `${unitCode} ${categoryName}${metadata}`
        }

        // Prepare metadata object for this file
        const metadata = {
          courseId: selectedCourse,
          topicId: selectedTopic,
          title: finalTitle,
          description: description || null,
          category: materialCategory,
          categoryMetadata: Object.keys(categoryMetadata).length > 0 ? categoryMetadata : null,
          weekNumber: materialWeekNumber || null,
          uploaderName: uploaderName || null,
          userId: user?.id || null,
          uploaderYear: profile?.year || null,
          uploaderCourseId: profile?.course_id || null,
        }

        // Add to queue
        return addToUploadQueue(file, metadata)
      })

      await Promise.all(uploadPromises)

      // Show success toast
      if (files.length === 1) {
        setQueuedToast(`"${files[0].name}" added to upload queue!`)
      } else {
        setQueuedToast(`${files.length} files added to upload queue!`)
      }
      setTimeout(() => setQueuedToast(''), 3000)

      // SMART RESET: Keep course, unit, category - only reset files and title
      setFiles([])
      setTitle('')
      setDescription('')
      // DON'T reset: selectedCourse, courseSearch, selectedTopic, unitSearch, materialCategory, weekNumber, yearNumber, assignmentNumber

      const fileInput = document.getElementById('file-input')
      if (fileInput) fileInput.value = ''
      const folderInput = document.getElementById('folder-input')
      if (folderInput) folderInput.value = ''

    } catch (err) {
      setError(err.message)
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
        Share materials with your classmates. Drag & drop files, upload folders, or select multiple files at once. Uploads process in the background so you can keep working!
      </p>

      {/* Queued Toast Notification */}
      {queuedToast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          ✅ {queuedToast}
        </div>
      )}

      {/* Upload Queue Component */}
      <UploadQueue />

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
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
                          <div className="font-medium">{course.course_name}</div>
                          <div className="text-sm text-gray-600">{course.department}</div>
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
                      Course Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      placeholder="e.g., Bachelor of Science in Civil Engineering"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the full program name (e.g., BSc Computer Science, Diploma in Business)
                    </p>
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
                    <p className="text-xs text-gray-500 mt-1">
                      Department or school offering this program
                    </p>
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
                2. Select Unit <span className="text-red-500">*</span>
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
                  placeholder="Search for the unit this material belongs to..."
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
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

          {/* Material Type */}
          {selectedTopic && (
            <div>
              <label className="block text-sm font-medium mb-3">
                3. Material Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setMaterialCategory('notes')}
                  className={`p-4 border-2 rounded-lg transition text-center ${
                    materialCategory === 'notes'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="text-3xl mb-2">📝</div>
                  <div className="font-medium text-gray-900">Notes</div>
                  <div className="text-xs text-gray-500">Lecture notes, study materials</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMaterialCategory('past_paper')}
                  className={`p-4 border-2 rounded-lg transition text-center ${
                    materialCategory === 'past_paper'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-3xl mb-2">📄</div>
                  <div className="font-medium text-gray-900">Past Papers</div>
                  <div className="text-xs text-gray-500">Exams, tests, samples</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMaterialCategory('lab_material')}
                  className={`p-4 border-2 rounded-lg transition text-center ${
                    materialCategory === 'lab_material'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="text-3xl mb-2">🧪</div>
                  <div className="font-medium text-gray-900">Lab Materials</div>
                  <div className="text-xs text-gray-500">Lab guides, practicals</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMaterialCategory('assignment')}
                  className={`p-4 border-2 rounded-lg transition text-center ${
                    materialCategory === 'assignment'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <div className="text-3xl mb-2">📋</div>
                  <div className="font-medium text-gray-900">Assignments</div>
                  <div className="text-xs text-gray-500">Coursework, homework</div>
                </button>
              </div>

              {/* Week Number for Notes & Lab Materials */}
              {(materialCategory === 'notes' || materialCategory === 'lab_material') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Week Number (optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 3"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(e.target.value)}
                    min="1"
                    max="15"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              )}

              {/* Year for Past Papers */}
              {materialCategory === 'past_paper' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Year (optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 2023"
                    value={yearNumber}
                    onChange={(e) => setYearNumber(e.target.value)}
                    min="2000"
                    max={new Date().getFullYear()}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              )}

              {/* Assignment Number */}
              {materialCategory === 'assignment' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Assignment Number (optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 1"
                    value={assignmentNumber}
                    onChange={(e) => setAssignmentNumber(e.target.value)}
                    min="1"
                    max="10"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              )}
            </div>
          )}

          {/* File Upload - Drag & Drop Zone */}
          {selectedTopic && (
            <div>
              <label className="block text-sm font-medium mb-2">
                4. Upload Files <span className="text-red-500">*</span>
              </label>

              {/* Drag & Drop Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 scale-105'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <div className="text-5xl mb-3">
                    {isDragging ? '⬇️' : '📁'}
                  </div>
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                  </p>
                  <p className="text-sm text-gray-500 mb-3">or click to browse</p>
                  <div className="inline-flex gap-2 text-xs text-gray-600">
                    <span className="bg-gray-100 px-2 py-1 rounded">PDF</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">DOCX</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">PPTX</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">Images</span>
                  </div>
                </label>
              </div>

              {/* Folder Upload Button */}
              <div className="mt-3 flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => document.getElementById('folder-input').click()}
                  className="text-sm px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center gap-2"
                >
                  <span>📂</span>
                  Upload Folder
                </button>
                <input
                  id="folder-input"
                  type="file"
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <p className="text-xs text-gray-500 mt-2 text-center">
                Max 50MB per file • Multiple files supported
              </p>

              {/* Selected Files List */}
              {files.length > 0 && (
                <div className="mt-4 border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">
                      Ready to Upload ({files.length} {files.length === 1 ? 'file' : 'files'}):
                    </h3>
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white p-3 rounded border border-gray-200 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-2xl flex-shrink-0">{getFileIcon(file.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="ml-2 text-red-500 hover:text-red-700 text-xl font-bold flex-shrink-0"
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Total size: {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Material Title */}
          {selectedTopic && files.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                5. Material Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave blank to auto-generate from file name"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                If left blank, we'll generate a title like: "CVE 2101 Notes - Week 5"
              </p>
            </div>
          )}

          {/* Upload Button */}
          {files.length > 0 && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-xl"
            >
              {uploading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Processing...
                </>
              ) : (
                <>
                  <span>⬆️</span>
                  Upload {files.length > 1 ? `All ${files.length} Files` : 'File'}
                </>
              )}
            </button>
          )}
        </form>
      )}
      
      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold mb-3 text-gray-900 flex items-center gap-2">
          <span>💡</span> Quick Tips:
        </h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Multi-file upload:</strong> Select or drag multiple files at once</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Folder upload:</strong> Upload entire folders with one click</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Image support:</strong> Upload photos of notes or scanned documents</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Smart persistence:</strong> Course/unit selection stays after upload - perfect for uploading multiple files to the same unit</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Background processing:</strong> Files queue automatically - you can navigate away and uploads continue</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">ℹ️</span>
            <span>Only upload materials you have permission to share</span>
          </li>
        </ul>
      </div>
    </div>
  )
}