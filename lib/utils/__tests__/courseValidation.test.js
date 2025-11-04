import {
  formatCourseName,
  validateCourseFormat,
  findSimilarCourses,
  checkDuplicateCourse,
  suggestDepartment,
  getValidationHelpText,
} from '../courseValidation'

describe('courseValidation', () => {
  describe('formatCourseName', () => {
    it('should capitalize first letter of each word', () => {
      expect(formatCourseName('computer science')).toBe('Computer Science')
    })

    it('should handle abbreviations correctly', () => {
      expect(formatCourseName('bsc computer science')).toBe('BSc Computer Science')
      expect(formatCourseName('msc data science')).toBe('MSc Data Science')
      expect(formatCourseName('phd engineering')).toBe('PhD Engineering')
    })

    it('should lowercase common words', () => {
      expect(formatCourseName('Bachelor in Information Technology')).toBe('Bachelor in Information Technology')
      expect(formatCourseName('Master of Business Administration')).toBe('Master of Business Administration')
    })

    it('should trim extra spaces', () => {
      expect(formatCourseName('  Computer   Science  ')).toBe('Computer Science')
    })

    it('should handle empty string', () => {
      expect(formatCourseName('')).toBe('')
    })

    it('should capitalize IT and ICT correctly', () => {
      expect(formatCourseName('diploma in it')).toBe('Diploma in IT')
      expect(formatCourseName('bachelor of ict')).toBe('Bachelor of ICT')
    })
  })

  describe('validateCourseFormat', () => {
    it('should return valid for proper course name', () => {
      const result = validateCourseFormat('BSc Computer Science')
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should reject empty course name', () => {
      const result = validateCourseFormat('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Course name is required')
    })

    it('should reject course name less than 3 characters', () => {
      const result = validateCourseFormat('BS')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Course name must be at least 3 characters')
    })

    it('should reject course name more than 100 characters', () => {
      const longName = 'a'.repeat(101)
      const result = validateCourseFormat(longName)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Course name must be less than 100 characters')
    })

    it('should reject invalid characters', () => {
      const result = validateCourseFormat('Course@#$%^&*()')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Course name contains invalid characters')
    })

    it('should accept valid characters', () => {
      const result = validateCourseFormat('BSc Computer Science & IT (2024)')
      expect(result.valid).toBe(true)
    })

    it('should trim whitespace before validating', () => {
      const result = validateCourseFormat('   BSc CS   ')
      expect(result.valid).toBe(true)
    })
  })

  describe('findSimilarCourses', () => {
    const mockCourses = [
      { id: '1', course_name: 'BSc Computer Science' },
      { id: '2', course_name: 'BSc Computer Technology' },
      { id: '3', course_name: 'MSc Data Science' },
      { id: '4', course_name: 'BSc Information Technology' },
    ]

    it('should find exact matches', () => {
      const results = findSimilarCourses('BSc Computer Science', mockCourses)
      expect(results.length).toBe(1)
      expect(results[0].score).toBe(1.0)
      expect(results[0].course.id).toBe('1')
    })

    it('should find similar courses with high scores', () => {
      const results = findSimilarCourses('Computer Science', mockCourses)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].score).toBeGreaterThan(0.6)
    })

    it('should return empty array for no matches', () => {
      const results = findSimilarCourses('xyz123', mockCourses)
      expect(results.length).toBe(0)
    })

    it('should handle partial matches', () => {
      const results = findSimilarCourses('Computer', mockCourses)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should be case insensitive', () => {
      const results1 = findSimilarCourses('bsc computer science', mockCourses)
      const results2 = findSimilarCourses('BSC COMPUTER SCIENCE', mockCourses)
      expect(results1[0].score).toBe(results2[0].score)
    })

    it('should return max 5 results', () => {
      const manyCourses = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        course_name: `Course ${i} Science`
      }))
      const results = findSimilarCourses('Science', manyCourses)
      expect(results.length).toBeLessThanOrEqual(5)
    })

    it('should handle empty input', () => {
      const results = findSimilarCourses('', mockCourses)
      expect(results.length).toBe(0)
    })
  })

  describe('checkDuplicateCourse', () => {
    const mockCourses = [
      { id: '1', course_name: 'BSc Computer Science' },
      { id: '2', course_name: 'MSc Data Science' },
    ]

    it('should detect exact duplicate', () => {
      const duplicate = checkDuplicateCourse('BSc Computer Science', mockCourses)
      expect(duplicate).not.toBeNull()
      expect(duplicate.id).toBe('1')
    })

    it('should be case insensitive', () => {
      const duplicate = checkDuplicateCourse('bsc computer science', mockCourses)
      expect(duplicate).not.toBeNull()
    })

    it('should return null for non-duplicate', () => {
      const duplicate = checkDuplicateCourse('BSc Engineering', mockCourses)
      expect(duplicate).toBeNull()
    })

    it('should trim whitespace before comparing', () => {
      const duplicate = checkDuplicateCourse('  BSc Computer Science  ', mockCourses)
      expect(duplicate).not.toBeNull()
    })

    it('should handle empty course list', () => {
      const duplicate = checkDuplicateCourse('BSc CS', [])
      expect(duplicate).toBeNull()
    })

    it('should handle null input', () => {
      const duplicate = checkDuplicateCourse(null, mockCourses)
      expect(duplicate).toBeNull()
    })
  })

  describe('suggestDepartment', () => {
    it('should suggest Computing for computer courses', () => {
      expect(suggestDepartment('BSc Computer Science')).toBe('School of Computing')
      expect(suggestDepartment('Software Engineering')).toBe('School of Computing')
      expect(suggestDepartment('IT Management')).toBe('School of Computing')
    })

    it('should suggest Engineering for engineering courses', () => {
      expect(suggestDepartment('Mechanical Engineering')).toBe('School of Engineering')
      expect(suggestDepartment('Electrical Engineering')).toBe('School of Engineering')
    })

    it('should suggest Business for business courses', () => {
      expect(suggestDepartment('Business Administration')).toBe('School of Business')
      expect(suggestDepartment('Commerce')).toBe('School of Business')
    })

    it('should suggest Science for science courses', () => {
      expect(suggestDepartment('Physics Science')).toBe('School of Pure and Applied Sciences')
      expect(suggestDepartment('Chemistry Science')).toBe('School of Pure and Applied Sciences')
    })

    it('should return null for unknown courses', () => {
      expect(suggestDepartment('Unknown Program')).toBeNull()
    })

    it('should handle empty input', () => {
      expect(suggestDepartment('')).toBeNull()
    })
  })

  describe('getValidationHelpText', () => {
    const mockCourse = { id: '1', course_name: 'BSc Computer Science' }

    it('should return null for empty similar courses', () => {
      const text = getValidationHelpText([])
      expect(text).toBeNull()
    })

    it('should warn about exact match', () => {
      const similar = [{ course: mockCourse, score: 1.0, matchType: 'exact' }]
      const text = getValidationHelpText(similar)
      expect(text.type).toBe('error')
      expect(text.message).toContain('already exists')
    })

    it('should warn about similar course', () => {
      const similar = [{ course: mockCourse, score: 0.85, matchType: 'partial' }]
      const text = getValidationHelpText(similar)
      expect(text.type).toBe('warning')
      expect(text.message).toContain('Similar course found')
    })

    it('should return null for low match scores', () => {
      const similar = [{ course: mockCourse, score: 0.5, matchType: 'fuzzy' }]
      const text = getValidationHelpText(similar)
      expect(text).toBeNull()
    })
  })
})
