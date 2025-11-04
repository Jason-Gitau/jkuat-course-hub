/**
 * Invite Link Generator
 * Generates and manages invite links for course sharing
 */

import { nanoid } from 'nanoid'

/**
 * Generate a unique invite code
 * Format: Short, readable code (10 characters)
 */
export function generateInviteCode() {
  return nanoid(10)
}

/**
 * Generate invite link for a course
 * Returns the full URL that can be shared
 *
 * @param {string} courseId - The course ID to invite to
 * @param {string} inviterId - The user ID of the person inviting
 * @param {string} baseUrl - Optional base URL (defaults to window.location.origin)
 * @returns {string} Full invite URL
 */
export function generateInviteLink(courseId, inviterId, baseUrl = null) {
  if (!courseId || !inviterId) {
    throw new Error('courseId and inviterId are required')
  }

  // Use provided baseUrl or get from window if in browser
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')

  if (!origin) {
    throw new Error('baseUrl must be provided in server context')
  }

  // Create URL with course and inviter parameters
  const url = new URL('/join', origin)
  url.searchParams.set('c', courseId)
  url.searchParams.set('ref', inviterId)

  return url.toString()
}

/**
 * Parse invite link parameters from URL
 *
 * @param {string} url - The invite URL to parse
 * @returns {object} Object with courseId and inviterId, or null if invalid
 */
export function parseInviteLink(url) {
  try {
    const urlObj = new URL(url)
    const courseId = urlObj.searchParams.get('c')
    const inviterId = urlObj.searchParams.get('ref')

    if (!courseId || !inviterId) {
      return null
    }

    return {
      courseId,
      inviterId
    }
  } catch (err) {
    console.error('Invalid invite URL:', err)
    return null
  }
}

/**
 * Create or get invite record in database
 * This tracks invite usage and stores the invite code
 *
 * @param {object} supabase - Supabase client
 * @param {string} courseId - The course ID
 * @param {string} inviterId - The inviter's user ID
 * @returns {object} Invite record with code and stats
 */
export async function createOrGetInvite(supabase, courseId, inviterId) {
  if (!supabase || !courseId || !inviterId) {
    throw new Error('supabase, courseId, and inviterId are required')
  }

  try {
    // Check if invite already exists for this course/inviter combination
    const { data: existing, error: fetchError } = await supabase
      .from('course_invites')
      .select('*')
      .eq('course_id', courseId)
      .eq('inviter_id', inviterId)
      .single()

    if (existing && !fetchError) {
      return existing
    }

    // Create new invite record
    const inviteCode = generateInviteCode()

    const { data: newInvite, error: createError } = await supabase
      .from('course_invites')
      .insert({
        course_id: courseId,
        inviter_id: inviterId,
        invite_code: inviteCode,
        uses_count: 0
      })
      .select()
      .single()

    if (createError) throw createError

    return newInvite
  } catch (err) {
    console.error('Error creating/getting invite:', err)
    throw err
  }
}

/**
 * Increment the usage count for an invite
 *
 * @param {object} supabase - Supabase client
 * @param {string} inviteCode - The invite code
 * @returns {boolean} Success status
 */
export async function incrementInviteUsage(supabase, inviteCode) {
  if (!supabase || !inviteCode) {
    throw new Error('supabase and inviteCode are required')
  }

  try {
    const { error } = await supabase.rpc('increment_invite_usage', {
      code: inviteCode
    })

    if (error) throw error
    return true
  } catch (err) {
    // If RPC doesn't exist, try direct update
    try {
      const { error: updateError } = await supabase
        .from('course_invites')
        .update({ uses_count: supabase.raw('uses_count + 1') })
        .eq('invite_code', inviteCode)

      if (updateError) throw updateError
      return true
    } catch (updateErr) {
      console.error('Error incrementing invite usage:', updateErr)
      return false
    }
  }
}

/**
 * Get invite statistics for a user
 *
 * @param {object} supabase - Supabase client
 * @param {string} userId - The user's ID
 * @returns {object} Invite statistics
 */
export async function getInviteStats(supabase, userId) {
  if (!supabase || !userId) {
    throw new Error('supabase and userId are required')
  }

  try {
    // Get all invites created by this user
    const { data: invites, error } = await supabase
      .from('course_invites')
      .select('*, courses!course_id(course_name)')
      .eq('inviter_id', userId)

    if (error) throw error

    // Calculate total uses
    const totalUses = invites?.reduce((sum, invite) => sum + (invite.uses_count || 0), 0) || 0

    return {
      totalInvites: invites?.length || 0,
      totalUses,
      invitesByCourse: invites || []
    }
  } catch (err) {
    console.error('Error fetching invite stats:', err)
    return {
      totalInvites: 0,
      totalUses: 0,
      invitesByCourse: []
    }
  }
}

/**
 * Get referral count from profile
 *
 * @param {object} supabase - Supabase client
 * @param {string} userId - The user's ID
 * @returns {number} Number of successful referrals
 */
export async function getReferralCount(supabase, userId) {
  if (!supabase || !userId) {
    return 0
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_count')
      .eq('id', userId)
      .single()

    return profile?.referral_count || 0
  } catch (err) {
    console.error('Error fetching referral count:', err)
    return 0
  }
}

/**
 * Generate shareable text for social media
 *
 * @param {string} courseName - Name of the course
 * @param {string} inviteLink - The invite link
 * @returns {string} Formatted share text
 */
export function generateShareText(courseName, inviteLink) {
  return `Join me on JKUAT Course Hub for ${courseName}! 📚\n\nGet access to notes, past papers, and study materials.\n\n${inviteLink}`
}

/**
 * Generate WhatsApp share URL
 *
 * @param {string} courseName - Name of the course
 * @param {string} inviteLink - The invite link
 * @returns {string} WhatsApp share URL
 */
export function generateWhatsAppLink(courseName, inviteLink) {
  const text = generateShareText(courseName, inviteLink)
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/**
 * Generate Telegram share URL
 *
 * @param {string} courseName - Name of the course
 * @param {string} inviteLink - The invite link
 * @returns {string} Telegram share URL
 */
export function generateTelegramLink(courseName, inviteLink) {
  const text = generateShareText(courseName, inviteLink)
  return `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(`Join me for ${courseName} on JKUAT Course Hub 📚`)}`
}
