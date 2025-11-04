/**
 * Course Validation Utilities
 * Provides fuzzy search, formatting, and validation for course names
 */

/**
 * Calculate Levenshtein distance between two strings (edit distance)
 * Used for fuzzy matching to find similar course names
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Calculate distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score (0-1) between two strings
 * 1 = identical, 0 = completely different
 */
function similarityScore(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - distance) / longer.length;
}

/**
 * Format course name: capitalize properly and trim spaces
 * Examples:
 *   "bsc computer science" -> "BSc Computer Science"
 *   "  diploma in IT  " -> "Diploma In IT"
 */
export function formatCourseName(input) {
  if (!input) return '';

  // Trim and collapse multiple spaces
  let formatted = input.trim().replace(/\s+/g, ' ');

  // Special handling for common abbreviations
  const abbreviations = ['bsc', 'msc', 'phd', 'ba', 'ma', 'bba', 'mba', 'bed', 'med', 'it', 'ict'];

  // Capitalize each word
  formatted = formatted
    .split(' ')
    .map(word => {
      const lower = word.toLowerCase();
      // Keep abbreviations uppercase
      if (abbreviations.includes(lower)) {
        return lower === 'bsc' ? 'BSc' :
               lower === 'msc' ? 'MSc' :
               lower === 'phd' ? 'PhD' :
               lower === 'ba' ? 'BA' :
               lower === 'ma' ? 'MA' :
               lower === 'bba' ? 'BBA' :
               lower === 'mba' ? 'MBA' :
               lower === 'bed' ? 'BEd' :
               lower === 'med' ? 'MEd' :
               lower === 'it' ? 'IT' :
               lower === 'ict' ? 'ICT' :
               word.toUpperCase();
      }
      // Lowercase common words
      if (['in', 'of', 'and', 'the', 'with'].includes(lower)) {
        return lower;
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  // Ensure first word is always capitalized
  if (formatted.length > 0) {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  return formatted;
}

/**
 * Validate course name format
 * Returns { valid: boolean, error: string }
 */
export function validateCourseFormat(courseName) {
  const trimmed = courseName?.trim() || '';

  if (!trimmed) {
    return { valid: false, error: 'Course name is required' };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: 'Course name must be at least 3 characters' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Course name must be less than 100 characters' };
  }

  // Check for valid characters (letters, numbers, spaces, hyphens, parentheses)
  const validPattern = /^[a-zA-Z0-9\s\-()&,.]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Course name contains invalid characters' };
  }

  return { valid: true, error: null };
}

/**
 * Find similar courses in a list
 * Returns array of matches with similarity scores, sorted by relevance
 *
 * @param {string} searchQuery - The course name to search for
 * @param {Array} existingCourses - Array of course objects with { id, course_name }
 * @param {number} threshold - Minimum similarity score (0-1) to consider a match (default: 0.6)
 * @returns {Array} Array of { course, score } objects sorted by score (descending)
 */
export function findSimilarCourses(searchQuery, existingCourses, threshold = 0.6) {
  if (!searchQuery || !existingCourses || existingCourses.length === 0) {
    return [];
  }

  const query = searchQuery.toLowerCase().trim();
  const matches = [];

  for (const course of existingCourses) {
    const courseName = course.course_name || '';
    const score = similarityScore(query, courseName);

    // Check for exact match (case-insensitive)
    if (courseName.toLowerCase() === query) {
      return [{ course, score: 1.0, matchType: 'exact' }];
    }

    // Check for substring match (partial match)
    if (courseName.toLowerCase().includes(query) || query.includes(courseName.toLowerCase())) {
      matches.push({ course, score: Math.max(score, 0.8), matchType: 'partial' });
    }
    // Check for fuzzy match above threshold
    else if (score >= threshold) {
      matches.push({ course, score, matchType: 'fuzzy' });
    }
  }

  // Sort by score (descending), then by course name
  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.course.course_name.localeCompare(b.course.course_name);
  });

  // Return top 5 matches
  return matches.slice(0, 5);
}

/**
 * Check if a course name already exists (case-insensitive exact match)
 *
 * @param {string} courseName - The course name to check
 * @param {Array} existingCourses - Array of course objects
 * @returns {Object|null} The existing course if found, null otherwise
 */
export function checkDuplicateCourse(courseName, existingCourses) {
  if (!courseName || !existingCourses) return null;

  const normalized = courseName.toLowerCase().trim();

  return existingCourses.find(
    course => course.course_name.toLowerCase().trim() === normalized
  ) || null;
}

/**
 * Suggest department based on course name patterns (optional helper)
 * Returns null if no clear pattern is found
 */
export function suggestDepartment(courseName) {
  if (!courseName) return null;

  const lower = courseName.toLowerCase();

  // Common patterns
  if (lower.includes('computer') || lower.includes('software') || lower.includes('it ') || lower.includes(' ict')) {
    return 'School of Computing';
  }
  if (lower.includes('engineering') || lower.includes('mechanical') || lower.includes('electrical') || lower.includes('civil')) {
    return 'School of Engineering';
  }
  if (lower.includes('business') || lower.includes('commerce') || lower.includes('economics') || lower.includes('management')) {
    return 'School of Business';
  }
  if (lower.includes('science') && !lower.includes('computer')) {
    return 'School of Pure and Applied Sciences';
  }
  if (lower.includes('education') || lower.includes('teaching')) {
    return 'School of Education';
  }
  if (lower.includes('agriculture') || lower.includes('agribusiness')) {
    return 'School of Agriculture';
  }

  return null;
}

/**
 * Generate helpful validation messages for course creation
 */
export function getValidationHelpText(similarCourses) {
  if (!similarCourses || similarCourses.length === 0) {
    return null;
  }

  const topMatch = similarCourses[0];

  if (topMatch.matchType === 'exact') {
    return {
      type: 'error',
      message: `This course already exists: "${topMatch.course.course_name}"`,
      suggestion: 'Please select it from the list instead.'
    };
  }

  if (topMatch.score >= 0.8) {
    return {
      type: 'warning',
      message: `Similar course found: "${topMatch.course.course_name}"`,
      suggestion: 'Did you mean this one? This helps avoid duplicates.'
    };
  }

  return null;
}
