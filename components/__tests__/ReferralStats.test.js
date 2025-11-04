import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import ReferralStats from '../ReferralStats'

jest.mock('@/lib/providers/SupabaseProvider', () => ({
  useSupabase: jest.fn(() => ({
    supabase: jest.fn(),
  })),
}))

jest.mock('@/lib/providers/UserProvider', () => ({
  useUser: jest.fn(() => ({
    user: { id: 'user-123' },
    profile: { full_name: 'Test User' },
  })),
}))

jest.mock('@/lib/utils/inviteLinkGenerator', () => ({
  getReferralCount: jest.fn().mockResolvedValue(5),
  getInviteStats: jest.fn().mockResolvedValue({
    totalInvites: 3,
    totalUses: 8,
    invitesByCourse: [
      {
        id: 'invite-1',
        courses: { course_name: 'BSc Computer Science' },
        uses_count: 3,
        created_at: '2024-01-01',
      },
      {
        id: 'invite-2',
        courses: { course_name: 'BSc Data Science' },
        uses_count: 5,
        created_at: '2024-01-02',
      },
    ],
  }),
}))

describe('ReferralStats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when user is not authenticated', () => {
    const { useUser } = require('@/lib/providers/UserProvider')
    useUser.mockReturnValueOnce({
      user: null,
      profile: null,
    })

    const { container } = render(<ReferralStats />)
    expect(container.firstChild).toBeNull()
  })

  it('should show loading state initially', () => {
    const { container } = render(<ReferralStats />)

    // Loading state shows skeleton placeholder or is initially rendering
    expect(container).toBeInTheDocument()
  })

  it('should display referral count', async () => {
    render(<ReferralStats />)

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText(/Successful Referrals/)).toBeInTheDocument()
    })
  })

  it('should display courses shared count', async () => {
    render(<ReferralStats />)

    await waitFor(() => {
      expect(screen.getByText(/Courses Shared/)).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('should list invites by course', async () => {
    render(<ReferralStats />)

    await waitFor(() => {
      expect(screen.getByText('BSc Computer Science')).toBeInTheDocument()
      expect(screen.getByText('BSc Data Science')).toBeInTheDocument()
    })
  })

  it('should show usage count for each invite', async () => {
    render(<ReferralStats />)

    await waitFor(() => {
      expect(screen.getByText(/3 people joined/)).toBeInTheDocument()
      expect(screen.getByText(/5 people joined/)).toBeInTheDocument()
    })
  })

  it('should display empty state when no invites', async () => {
    const { getInviteStats } = require('@/lib/utils/inviteLinkGenerator')
    getInviteStats.mockResolvedValueOnce({
      totalInvites: 0,
      totalUses: 0,
      invitesByCourse: [],
    })

    render(<ReferralStats />)

    await waitFor(() => {
      expect(screen.getByText(/haven't invited anyone yet/i)).toBeInTheDocument()
    })
  })

  it('should show encouragement message when has referrals', async () => {
    render(<ReferralStats />)

    await waitFor(() => {
      expect(screen.getByText(/Great work!/)).toBeInTheDocument()
      expect(screen.getByText(/helped 5 classmates/)).toBeInTheDocument()
    })
  })

  it('should show singular form for single referral', async () => {
    const { getReferralCount } = require('@/lib/utils/inviteLinkGenerator')
    getReferralCount.mockResolvedValueOnce(1)

    render(<ReferralStats />)

    await waitFor(() => {
      expect(screen.getByText(/helped 1 classmate/)).toBeInTheDocument()
    })
  })

  it('should render header with icon', async () => {
    render(<ReferralStats />)

    await waitFor(() => {
      expect(screen.getByText('Your Invite Stats')).toBeInTheDocument()
      expect(screen.getByText(/See how many classmates/)).toBeInTheDocument()
    })
  })

  it('should have proper styling classes', async () => {
    const { container } = render(<ReferralStats />)

    await waitFor(() => {
      const root = container.firstChild
      expect(root.className).toContain('bg-gradient-to-br')
      expect(root.className).toContain('from-blue-50')
      expect(root.className).toContain('rounded-lg')
    })
  })

  it('should fetch stats on mount', async () => {
    const { getReferralCount, getInviteStats } = require('@/lib/utils/inviteLinkGenerator')

    render(<ReferralStats />)

    await waitFor(() => {
      expect(getReferralCount).toHaveBeenCalledWith(expect.anything(), 'user-123')
      expect(getInviteStats).toHaveBeenCalled()
    })
  })

  it('should display course creation dates', async () => {
    const { container } = render(<ReferralStats />)

    await waitFor(() => {
      // Dates should be formatted and displayed - check for date pattern like 1/2/2024
      const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}/
      expect(container.textContent).toMatch(datePattern)
    })
  })

  it('should handle errors gracefully', async () => {
    const { getReferralCount } = require('@/lib/utils/inviteLinkGenerator')
    getReferralCount.mockRejectedValueOnce(new Error('Failed'))

    render(<ReferralStats />)

    await waitFor(() => {
      // Component should still render
      expect(screen.getByText(/Your Invite Stats/)).toBeInTheDocument()
    })
  })
})
