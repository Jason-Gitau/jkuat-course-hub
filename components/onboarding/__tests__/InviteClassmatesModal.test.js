import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InviteClassmatesModal from '../InviteClassmatesModal'

// Mock dependencies
jest.mock('@/lib/providers/SupabaseProvider', () => ({
  useSupabase: jest.fn(() => ({
    supabase: {
      from: jest.fn(() => ({
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      })),
    },
  })),
}))

jest.mock('@/lib/providers/UserProvider', () => ({
  useUser: jest.fn(() => ({
    user: { id: 'user-123' },
    profile: { full_name: 'Test User' },
  })),
}))

// Mock QRCodeSVG
jest.mock('qrcode.react', () => {
  return function MockQRCode() {
    return <div data-testid="qr-code">QR Code</div>
  }
})

describe('InviteClassmatesModal', () => {
  const mockCourse = {
    id: 'course-123',
    course_name: 'BSc Computer Science',
    department: 'Computing',
  }

  const mockOnClose = jest.fn()
  const mockOnSkip = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnSkip.mockClear()
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('should render modal with course name', async () => {
    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(mockCourse.course_name)).toBeInTheDocument()
    })
  })

  it('should display QR code', async () => {
    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    // Check for loading message
    expect(screen.getByText(/Generating invite link/i)).toBeInTheDocument()
  })

  it('should display invite link after loading', async () => {
    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      const linkInput = screen.queryByDisplayValue(/\/join/i)
      expect(linkInput).toBeInTheDocument()
    })
  })

  it('should copy link to clipboard', async () => {
    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      const copyBtn = screen.getByRole('button', { name: /copy/i })
      expect(copyBtn).toBeInTheDocument()
    })

    const copyBtn = screen.getByRole('button', { name: /copy/i })
    fireEvent.click(copyBtn)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })
  })

  it('should show copied state after copying', async () => {
    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      const copyBtn = screen.getByRole('button', { name: /copy/i })
      fireEvent.click(copyBtn)
    })

    // Should show checkmark or "Copied" message
    await waitFor(() => {
      const btn = screen.getByRole('button')
      expect(btn.textContent).toContain('Copied')
    })
  })

  it('should render WhatsApp share button', async () => {
    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('WhatsApp')).toBeInTheDocument()
    })
  })

  it('should render Telegram share button', async () => {
    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Telegram')).toBeInTheDocument()
    })
  })

  it('should open WhatsApp on click', async () => {
    window.open = jest.fn()

    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      const whatsappBtn = screen.getByRole('button', { name: /WhatsApp/i })
      fireEvent.click(whatsappBtn)
    })

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank')
    })
  })

  it('should open Telegram on click', async () => {
    window.open = jest.fn()

    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      const tgBtn = screen.getByRole('button', { name: /Telegram/i })
      fireEvent.click(tgBtn)
    })

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('t.me'), '_blank')
    })
  })

  it('should call onSkip when skip button clicked', async () => {
    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      const skipBtn = screen.getByRole('button', { name: /Skip/i })
      fireEvent.click(skipBtn)
    })

    expect(mockOnSkip).toHaveBeenCalled()
  })

  it('should call onClose when done button clicked', async () => {
    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      const doneBtn = screen.getByRole('button', { name: /Done/i })
      fireEvent.click(doneBtn)
    })

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should show error message on failure', async () => {
    const { useSupabase } = require('@/lib/providers/SupabaseProvider')
    useSupabase.mockImplementationOnce(() => ({
      supabase: {
        from: jest.fn(() => ({
          insert: jest.fn().mockRejectedValue(new Error('Failed')),
        })),
      },
    }))

    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Failed to generate invite link/i)).toBeInTheDocument()
    })
  })

  it('should render modal overlay with dark background', () => {
    const { container } = render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    const overlay = container.querySelector('.fixed.inset-0')
    expect(overlay).toBeInTheDocument()
    expect(overlay.className).toContain('bg-black')
  })

  it('should have proper footer with action buttons', async () => {
    render(
      <InviteClassmatesModal
        course={mockCourse}
        onClose={mockOnClose}
        onSkip={mockOnSkip}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Skip/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument()
    })
  })
})
