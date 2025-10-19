'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useOfflineMaterials } from '@/lib/hooks/useOfflineData'

export default function CoursePage() {
  const params = useParams()
  const courseId = params.courseId

  const [course, setCourse] = useState(null)
  const [topics, setTopics] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('all')

  // New states for unit browsing
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [unitSearch, setUnitSearch] = useState('')
  const [showAllUnits, setShowAllUnits] = useState(true)

  const supabase = createClient()

  // Use offline-first hook for materials
  const {
    materials: allMaterials,
    loading: materialsLoading,
    isOnline,
    isOffline,
    lastSync
  } = useOfflineMaterials(courseId)

  // Separate general materials from topic-specific ones
  const generalMaterials = allMaterials.filter(m => !m.topic_id)
  const materials = allMaterials.filter(m => m.topic_id)

  useEffect(() => {
    async function loadCourseData() {
      // Load course info
      const { data: courseData } = await supabase
        .from('courses')
        .select('id, course_name, description, department')
        .eq('id', courseId)
        .single()

      setCourse(courseData)

      // Load topics/units with year and semester
      const { data: topicsData } = await supabase
        .from('topics')
        .select('id, topic_name, week_number, description, unit_code, year, semester')
        .eq('course_id', courseId)
        .order('year', { ascending: true, nullsFirst: false })
        .order('semester', { ascending: true, nullsFirst: false })
        .order('week_number', { ascending: true, nullsFirst: false })

      setTopics(topicsData || [])
    }

    if (courseId) {
      loadCourseData()
    }
  }, [courseId])

  const loading = materialsLoading && !course

  function getMaterialsForTopic(topicId) {
    const topicMaterials = materials.filter(m => m.topic_id === topicId)
    return filterByCategory(topicMaterials)
  }

  function filterByCategory(materialsList) {
    if (categoryFilter === 'all') return materialsList
    return materialsList.filter(m => m.material_category === categoryFilter)
  }

  function getFileIcon(type) {
    switch(type) {
      case 'pdf': return '📄'
      case 'docx': return '📝'
      case 'pptx': return '📊'
      default: return '📎'
    }
  }

  function getCategoryIcon(category) {
    switch(category) {
      case 'complete_notes': return '📘'
      case 'weekly_notes': return '📄'
      case 'past_paper': return '📋'
      case 'assignment': return '📝'
      case 'lab_guide': return '🔬'
      case 'other': return '📎'
      default: return '📎'
    }
  }

  function getCategoryLabel(material) {
    if (!material.material_category) return null

    const labels = {
      'complete_notes': 'Complete Semester Notes',
      'weekly_notes': 'Weekly Notes',
      'past_paper': 'Past Paper',
      'assignment': 'Assignment',
      'lab_guide': 'Lab Guide',
      'other': 'Other'
    }

    let label = labels[material.material_category] || 'Material'

    if (material.category_metadata) {
      if (material.category_metadata.week) label += ` - Week ${material.category_metadata.week}`
      if (material.category_metadata.year) label += ` (${material.category_metadata.year})`
      if (material.category_metadata.assignment_number) label += ` #${material.category_metadata.assignment_number}`
    }

    return label
  }

  function getCategoryCounts() {
    const allMats = selectedUnit
      ? getMaterialsForTopic(selectedUnit.id)
      : [...generalMaterials, ...materials]

    return {
      all: allMats.length,
      complete_notes: allMats.filter(m => m.material_category === 'complete_notes').length,
      weekly_notes: allMats.filter(m => m.material_category === 'weekly_notes').length,
      past_paper: allMats.filter(m => m.material_category === 'past_paper').length,
      assignment: allMats.filter(m => m.material_category === 'assignment').length,
      lab_guide: allMats.filter(m => m.material_category === 'lab_guide').length,
      other: allMats.filter(m => m.material_category === 'other').length,
      uncategorized: allMats.filter(m => !m.material_category).length
    }
  }

  function getFilteredUnits() {
    if (!unitSearch) return topics

    return topics.filter(topic => {
      const searchLower = unitSearch.toLowerCase()
      const unitCode = topic.unit_code?.toLowerCase() || ''
      const topicName = topic.topic_name?.toLowerCase() || ''
      const yearStr = topic.year ? `year ${topic.year}` : ''
      const semStr = topic.semester ? `semester ${topic.semester}` : ''

      return unitCode.includes(searchLower) ||
        topicName.includes(searchLower) ||
        yearStr.includes(searchLower) ||
        semStr.includes(searchLower) ||
        `week ${topic.week_number}`.toLowerCase().includes(searchLower)
    })
  }

  function groupUnitsByYearAndSemester() {
    const grouped = {}

    getFilteredUnits().forEach(topic => {
      // For units with year/semester, group them accordingly
      if (topic.year && topic.semester) {
        const key = `Year ${topic.year} - Semester ${topic.semester}`
        if (!grouped[key]) {
          grouped[key] = []
        }
        grouped[key].push(topic)
      } else {
        // Legacy units (with week_number only) go into "Other Units"
        const key = 'Other Units'
        if (!grouped[key]) {
          grouped[key] = []
        }
        grouped[key].push(topic)
      }
    })

    return grouped
  }

  function getMaterialCountForUnit(unitId) {
    return materials.filter(m => m.topic_id === unitId).length
  }

  function groupMaterialsByWeek(materialsList) {
    const grouped = {
      weekly: {},
      general: []
    }

    materialsList.forEach(material => {
      if (material.week_number) {
        const weekKey = `Week ${material.week_number}`
        if (!grouped.weekly[weekKey]) {
          grouped.weekly[weekKey] = []
        }
        grouped.weekly[weekKey].push(material)
      } else {
        grouped.general.push(material)
      }
    })

    return grouped
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Course not found
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Course Header */}
      <div className="mb-8">
        {/* Offline Status Banner */}
        {isOffline && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span>Offline Mode - Viewing cached materials</span>
            </div>
            {lastSync && (
              <span className="text-xs text-yellow-700">
                Last synced: {new Date(lastSync).toLocaleString()}
              </span>
            )}
          </div>
        )}

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {course.course_name}
            </h1>
            {course.department && (
              <div className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold mb-2">
                {course.department}
              </div>
            )}
            {course.description && (
              <p className="text-gray-600 mb-2">{course.description}</p>
            )}
          </div>

          {/* AI Chat Link */}
          <Link
            href={`/courses/${courseId}/chat`}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
          >
            <span>🤖</span>
            <span>AI Tutor</span>
          </Link>
        </div>

        <div className="flex gap-4 text-sm text-gray-600">
          <span>{topics.length} weeks</span>
          <span>•</span>
          <span>{materials.length + generalMaterials.length} materials</span>
        </div>
      </div>

      {/* Show Units View or Selected Unit Materials View */}
      {showAllUnits ? (
        <>
          {/* Unit Search */}
          <div className="mb-6">
            <input
              type="text"
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              placeholder="Search units... (e.g., Calculus, Linear Algebra, Week 3)"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* General Materials Card (if any) */}
          {generalMaterials.length > 0 && (
            <div
              onClick={() => {
                setSelectedUnit(null)
                setShowAllUnits(false)
                setCategoryFilter('all')
              }}
              className="mb-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">📚 General Course Materials</h3>
                  <p className="text-sm text-blue-700 mt-1">Not tied to a specific unit</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{generalMaterials.length}</div>
                  <div className="text-xs text-blue-600">materials</div>
                </div>
              </div>
            </div>
          )}

          {/* Units Grid - Grouped by Year and Semester */}
          <h2 className="text-2xl font-bold mb-4">Course Units</h2>

          {topics.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No units added yet. Units will appear here once they're created!</p>
            </div>
          ) : getFilteredUnits().length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No units found matching "{unitSearch}"</p>
              <button
                onClick={() => setUnitSearch('')}
                className="mt-3 text-blue-600 hover:text-blue-700 text-sm"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupUnitsByYearAndSemester()).map(([groupKey, groupUnits]) => (
                <div key={groupKey}>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                    {groupKey}
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupUnits.map(topic => {
                      const materialCount = getMaterialCountForUnit(topic.id)

                      return (
                        <div
                          key={topic.id}
                          onClick={() => {
                            setSelectedUnit(topic)
                            setShowAllUnits(false)
                            setCategoryFilter('all')
                          }}
                          className="bg-white border-2 border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
                        >
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-blue-600 mb-1">
                              {topic.unit_code || `Week ${topic.week_number}`}
                            </div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {topic.topic_name}
                            </h3>
                            {topic.description && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{topic.description}</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="text-sm text-gray-600">
                              {materialCount} {materialCount === 1 ? 'material' : 'materials'}
                            </div>
                            <div className="text-blue-600 group-hover:translate-x-1 transition-transform">→</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Selected Unit Materials View */}
          <div className="mb-6">
            <button
              onClick={() => {
                setShowAllUnits(true)
                setSelectedUnit(null)
                setCategoryFilter('all')
              }}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4"
            >
              <span>←</span>
              <span>Back to all units</span>
            </button>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-blue-600 mb-1">
                    {selectedUnit ? (
                      selectedUnit.unit_code || `Week ${selectedUnit.week_number}`
                    ) : 'General Materials'}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedUnit ? selectedUnit.topic_name : 'General Course Materials'}
                  </h2>
                  {selectedUnit?.year && selectedUnit?.semester && (
                    <p className="text-gray-600 mt-1">
                      Year {selectedUnit.year}, Semester {selectedUnit.semester}
                    </p>
                  )}
                  {selectedUnit?.description && (
                    <p className="text-gray-700 mt-2">{selectedUnit.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Material Type Filter */}
            {getCategoryCounts().all > 0 && (
              <div className="mb-6 flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Filter by type:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Materials ({getCategoryCounts().all})</option>
                  {getCategoryCounts().complete_notes > 0 && (
                    <option value="complete_notes">Complete Semester Notes ({getCategoryCounts().complete_notes})</option>
                  )}
                  {getCategoryCounts().weekly_notes > 0 && (
                    <option value="weekly_notes">Weekly Notes ({getCategoryCounts().weekly_notes})</option>
                  )}
                  {getCategoryCounts().past_paper > 0 && (
                    <option value="past_paper">Past Papers ({getCategoryCounts().past_paper})</option>
                  )}
                  {getCategoryCounts().assignment > 0 && (
                    <option value="assignment">Assignments ({getCategoryCounts().assignment})</option>
                  )}
                  {getCategoryCounts().lab_guide > 0 && (
                    <option value="lab_guide">Lab Guides ({getCategoryCounts().lab_guide})</option>
                  )}
                  {getCategoryCounts().other > 0 && (
                    <option value="other">Other ({getCategoryCounts().other})</option>
                  )}
                  {getCategoryCounts().uncategorized > 0 && (
                    <option value="">Uncategorized ({getCategoryCounts().uncategorized})</option>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Materials List */}
          {selectedUnit ? (
            // Unit-specific materials
            <>
              {getMaterialsForTopic(selectedUnit.id).length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">No materials uploaded for this unit yet.</p>
                  <Link
                    href="/upload"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                  >
                    Be the first to upload
                  </Link>
                </div>
              ) : (
                <>
                  {(() => {
                    const groupedMaterials = groupMaterialsByWeek(getMaterialsForTopic(selectedUnit.id))
                    const sortedWeeks = Object.keys(groupedMaterials.weekly).sort((a, b) => {
                      const weekA = parseInt(a.replace('Week ', ''))
                      const weekB = parseInt(b.replace('Week ', ''))
                      return weekA - weekB
                    })

                    return (
                      <div className="space-y-6">
                        {/* Weekly Materials */}
                        {sortedWeeks.map(weekKey => (
                          <div key={weekKey} className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-300">
                              {weekKey}
                            </h4>
                            <div className="space-y-3">
                              {groupedMaterials.weekly[weekKey].map(material => (
                                <a
                                  key={material.id}
                                  href={material.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 transition shadow-sm hover:shadow-md"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="text-2xl">
                                      {material.material_category ? getCategoryIcon(material.material_category) : getFileIcon(material.type)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900">{material.title}</h3>
                                        {getCategoryLabel(material) && (
                                          <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                            {getCategoryLabel(material)}
                                          </span>
                                        )}
                                      </div>
                                      {material.description && (
                                        <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                                      )}
                                      <p className="text-xs text-gray-500 mt-2">
                                        Uploaded by {material.uploaded_by || 'Anonymous'} • {new Date(material.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* General Materials (Past Papers, etc.) */}
                        {groupedMaterials.general.length > 0 && (
                          <div className="bg-purple-50 rounded-lg p-4">
                            <h4 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b border-purple-300">
                              General Materials & Past Papers
                            </h4>
                            <div className="space-y-3">
                              {groupedMaterials.general.map(material => (
                                <a
                                  key={material.id}
                                  href={material.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 transition shadow-sm hover:shadow-md"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="text-2xl">
                                      {material.material_category ? getCategoryIcon(material.material_category) : getFileIcon(material.type)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900">{material.title}</h3>
                                        {getCategoryLabel(material) && (
                                          <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                            {getCategoryLabel(material)}
                                          </span>
                                        )}
                                      </div>
                                      {material.description && (
                                        <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                                      )}
                                      <p className="text-xs text-gray-500 mt-2">
                                        Uploaded by {material.uploaded_by || 'Anonymous'} • {new Date(material.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </>
              )}
            </>
          ) : (
            // General materials
            <>
              {filterByCategory(generalMaterials).length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-600">No general materials found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filterByCategory(generalMaterials).map(material => (
                    <a
                      key={material.id}
                      href={material.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 transition shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">
                          {material.material_category ? getCategoryIcon(material.material_category) : getFileIcon(material.type)}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-gray-900">{material.title}</h3>
                            {getCategoryLabel(material) && (
                              <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                {getCategoryLabel(material)}
                              </span>
                            )}
                          </div>
                          {material.description && (
                            <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Uploaded by {material.uploaded_by || 'Anonymous'} • {new Date(material.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Call to Action */}
      <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-semibold text-green-900 mb-2">Have materials to share?</h3>
        <p className="text-sm text-green-800 mb-4">
          Help your classmates by uploading lecture notes, past papers, or study guides.
        </p>
        <Link
          href="/upload"
          className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium"
        >
          Upload Materials
        </Link>
      </div>
    </div>
  )
}
