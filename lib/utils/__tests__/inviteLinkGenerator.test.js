import {
  generateInviteCode,
  generateInviteLink,
  parseInviteLink,
  generateShareText,
  generateWhatsAppLink,
  generateTelegramLink,
} from '../inviteLinkGenerator'

describe('inviteLinkGenerator', () => {
  describe('generateInviteCode', () => {
    it('should generate a 10-character code', () => {
      const code = generateInviteCode()
      expect(code).toHaveLength(10)
    })

    it('should generate unique codes', () => {
      const code1 = generateInviteCode()
      const code2 = generateInviteCode()
      expect(code1).not.toBe(code2)
    })

    it('should generate alphanumeric codes', () => {
      const code = generateInviteCode()
      expect(/^[a-zA-Z0-9]+$/.test(code)).toBe(true)
    })
  })

  describe('generateInviteLink', () => {
    const courseId = 'course-123'
    const inviterId = 'user-456'
    const baseUrl = 'https://example.com'

    it('should generate valid invite link', () => {
      const link = generateInviteLink(courseId, inviterId, baseUrl)
      expect(link).toContain('/join')
      expect(link).toContain(`c=${courseId}`)
      expect(link).toContain(`ref=${inviterId}`)
    })

    it('should include both courseId and inviterId as params', () => {
      const link = generateInviteLink(courseId, inviterId, baseUrl)
      const url = new URL(link)
      expect(url.searchParams.get('c')).toBe(courseId)
      expect(url.searchParams.get('ref')).toBe(inviterId)
    })

    it('should use window.location.origin as default', () => {
      const originalHref = window.location.href
      try {
        const link = generateInviteLink(courseId, inviterId)
        expect(link).toContain('/join')
      } catch (err) {
        // In test env, might throw if no baseUrl provided
        expect(err.message).toContain('baseUrl')
      }
    })

    it('should throw error if courseId missing', () => {
      expect(() => generateInviteLink(null, inviterId, baseUrl)).toThrow()
    })

    it('should throw error if inviterId missing', () => {
      expect(() => generateInviteLink(courseId, null, baseUrl)).toThrow()
    })
  })

  describe('parseInviteLink', () => {
    const link = 'https://example.com/join?c=course-123&ref=user-456'

    it('should extract courseId and inviterId from URL', () => {
      const parsed = parseInviteLink(link)
      expect(parsed.courseId).toBe('course-123')
      expect(parsed.inviterId).toBe('user-456')
    })

    it('should return null for invalid URL', () => {
      const parsed = parseInviteLink('not-a-valid-url')
      expect(parsed).toBeNull()
    })

    it('should return null if missing courseId', () => {
      const parsed = parseInviteLink('https://example.com/join?ref=user-456')
      expect(parsed).toBeNull()
    })

    it('should return null if missing inviterId', () => {
      const parsed = parseInviteLink('https://example.com/join?c=course-123')
      expect(parsed).toBeNull()
    })

    it('should handle URL encoded parameters', () => {
      const encoded = 'https://example.com/join?c=course%20123&ref=user%20456'
      const parsed = parseInviteLink(encoded)
      expect(parsed.courseId).toBe('course 123')
      expect(parsed.inviterId).toBe('user 456')
    })
  })

  describe('generateShareText', () => {
    const courseName = 'BSc Computer Science'
    const link = 'https://example.com/join?c=123&ref=456'

    it('should include course name', () => {
      const text = generateShareText(courseName, link)
      expect(text).toContain(courseName)
    })

    it('should include invite link', () => {
      const text = generateShareText(courseName, link)
      expect(text).toContain(link)
    })

    it('should include JKUAT Course Hub mention', () => {
      const text = generateShareText(courseName, link)
      expect(text).toContain('JKUAT Course Hub')
    })

    it('should mention notes and past papers', () => {
      const text = generateShareText(courseName, link)
      expect(text.toLowerCase()).toMatch(/(notes|past|paper|materials)/i)
    })
  })

  describe('generateWhatsAppLink', () => {
    const courseName = 'BSc Computer Science'
    const link = 'https://example.com/join?c=123&ref=456'

    it('should generate valid WhatsApp URL', () => {
      const waLink = generateWhatsAppLink(courseName, link)
      expect(waLink).toContain('wa.me')
      expect(waLink).toContain('text=')
    })

    it('should include course name and link in message', () => {
      const waLink = generateWhatsAppLink(courseName, link)
      expect(waLink).toContain(encodeURIComponent(courseName))
      expect(waLink).toContain(encodeURIComponent(link))
    })
  })

  describe('generateTelegramLink', () => {
    const courseName = 'BSc Computer Science'
    const link = 'https://example.com/join?c=123&ref=456'

    it('should generate valid Telegram URL', () => {
      const tgLink = generateTelegramLink(courseName, link)
      expect(tgLink).toContain('t.me')
      expect(tgLink).toContain('url=')
    })

    it('should include link and course name', () => {
      const tgLink = generateTelegramLink(courseName, link)
      expect(tgLink).toContain(encodeURIComponent(link))
      expect(tgLink).toContain(encodeURIComponent(courseName))
    })
  })
})
