/**
 * UUID Validation and Sanitization Utilities
 *
 * These utilities help handle corrupted or malformed UUIDs that may come from
 * URL parameters, especially when shared via messaging apps where extra text
 * can get appended to URLs.
 */

// Standard UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a properly formatted UUID
 * @param {string} uuid - The string to validate
 * @returns {boolean} True if valid UUID, false otherwise
 */
export function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  return UUID_REGEX.test(uuid.trim());
}

/**
 * Extracts and sanitizes a UUID from a potentially corrupted string
 * Handles cases like "uuid....guys" or "uuid extra text"
 *
 * @param {string} dirtyUUID - The potentially corrupted UUID string
 * @returns {string|null} Clean UUID if valid one found, null otherwise
 *
 * @example
 * sanitizeUUID("0f13d007-2d5f-4aa6-a1ea-e6bd93a330df....guys")
 * // Returns: "0f13d007-2d5f-4aa6-a1ea-e6bd93a330df"
 */
export function sanitizeUUID(dirtyUUID) {
  if (!dirtyUUID || typeof dirtyUUID !== 'string') {
    return null;
  }

  // First, try the string as-is (trimmed)
  const trimmed = dirtyUUID.trim();
  if (isValidUUID(trimmed)) {
    return trimmed;
  }

  // Try to extract UUID pattern from the string
  // This regex finds the UUID pattern even if there's extra text
  const uuidMatch = dirtyUUID.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

  if (uuidMatch && uuidMatch[0]) {
    const extractedUUID = uuidMatch[0];
    if (isValidUUID(extractedUUID)) {
      // Log when we had to sanitize (for debugging)
      if (extractedUUID !== trimmed) {
        console.warn(`UUID sanitized: "${dirtyUUID}" → "${extractedUUID}"`);
      }
      return extractedUUID;
    }
  }

  // No valid UUID found
  console.warn(`Invalid UUID could not be sanitized: "${dirtyUUID}"`);
  return null;
}

/**
 * Cleans a URL parameter that should be a UUID
 * @param {string|null} param - The URL parameter value
 * @returns {string|null} Sanitized UUID or null
 */
export function cleanUUIDParam(param) {
  if (!param) {
    return null;
  }
  return sanitizeUUID(param);
}

/**
 * Validates and sanitizes multiple UUID parameters
 * Useful for handling multiple invite/referral parameters at once
 *
 * @param {Object} params - Object with UUID parameters
 * @returns {Object} Object with sanitized UUIDs (invalid ones set to null)
 *
 * @example
 * sanitizeUUIDParams({ courseId: "uuid....guys", inviterId: "valid-uuid" })
 * // Returns: { courseId: "uuid", inviterId: "valid-uuid" }
 */
export function sanitizeUUIDParams(params) {
  const sanitized = {};

  for (const [key, value] of Object.entries(params)) {
    sanitized[key] = cleanUUIDParam(value);
  }

  return sanitized;
}
