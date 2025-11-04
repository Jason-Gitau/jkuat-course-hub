import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CourseShareButton from '../CourseShareButton'

// Mock dependencies
jest.mock('@/lib/providers/UserProvider', () => ({
  useUser: jest.fn(() => ({
    user: { id: 'user-123' },
    profile: { full_name: 'Test User' },
  })),
}))

jest.mock('@/components/onboarding/InviteClassmatesModal', () => {
  return function MockInviteModal({ course, onClose }) {
    return (
      <div data-testid="invite-modal">
        <div>Modal for {course.course_name}</div>
        <button onClick={onClose}>Close Modal</button>
      </div>
    )
  }
})

describe('CourseShareButton', () => {
  const mockCourse = {
    id: 'course-123',
    course_name: 'BSc Computer Science',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render button', () => {
    render(<CourseShareButton course={mockCourse} />)

    expect(screen.getByRole('button', { name: /Invite Classmates/i })).toBeInTheDocument()
  })

  it('should not render when user is not authenticated', () => {
    const { useUser } = require('@/lib/providers/UserProvider')
    useUser.mockReturnValueOnce({
      user: null,
      profile: null,
    })

    const { container } = render(<CourseShareButton course={mockCourse} />)
    expect(container.firstChild).toBeNull()
  })

  it('should not render when profile is missing', () => {
    const { useUser } = require('@/lib/providers/UserProvider')
    useUser.mockReturnValueOnce({
      user: { id: 'user-123' },
      profile: null,
    })

    const { container } = render(<CourseShareButton course={mockCourse} />)
    expect(container.firstChild).toBeNull()
  })

  it('should have invite icon', () => {
    render(<CourseShareButton course={mockCourse} />)

    const button = screen.getByRole('button', { name: /Invite Classmates/i })
    const svg = button.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should open modal when clicked', async () => {
    render(<CourseShareButton course={mockCourse} />)

    const button = screen.getByRole('button', { name: /Invite Classmates/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByTestId('invite-modal')).toBeInTheDocument()
    })
  })

  it('should display course name in modal', async () => {
    render(<CourseShareButton course={mockCourse} />)

    const button = screen.getByRole('button', { name: /Invite Classmates/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText(`Modal for ${mockCourse.course_name}`)).toBeInTheDocument()
    })
  })

  it('should close modal when close is clicked', async () => {
    render(<CourseShareButton course={mockCourse} />)

    const button = screen.getByRole('button', { name: /Invite Classmates/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByTestId('invite-modal')).toBeInTheDocument()
    })

    const closeBtn = screen.getByRole('button', { name: /Close Modal/i })
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument()
    })
  })

  it('should have proper styling classes', () => {
    render(<CourseShareButton course={mockCourse} />)

    const button = screen.getByRole('button', { name: /Invite Classmates/i })
    expect(button.className).toContain('bg-blue-600')
    expect(button.className).toContain('text-white')
    expect(button.className).toContain('rounded-lg')
  })

  it('should have hover effect', () => {
    render(<CourseShareButton course={mockCourse} />)

    const button = screen.getByRole('button', { name: /Invite Classmates/i })
    expect(button.className).toContain('hover:bg-blue-700')
  })

  it('should have title attribute for accessibility', () => {
    render(<CourseShareButton course={mockCourse} />)

    const button = screen.getByRole('button', { name: /Invite Classmates/i })
    expect(button.getAttribute('title')).toBe('Invite classmates to this course')
  })

  it('should pass course prop to modal correctly', async () => {
    render(<CourseShareButton course={mockCourse} />)

    const button = screen.getByRole('button', { name: /Invite Classmates/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText(`Modal for ${mockCourse.course_name}`)).toBeInTheDocument()
    })
  })

  it('should handle multiple open/close cycles', async () => {
    render(<CourseShareButton course={mockCourse} />)

    for (let i = 0; i < 3; i++) {
      const button = screen.getByRole('button', { name: /Invite Classmates/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('invite-modal')).toBeInTheDocument()
      })

      const closeBtn = screen.getByRole('button', { name: /Close Modal/i })
      fireEvent.click(closeBtn)

      await waitFor(() => {
        expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument()
      })
    }
  })
})
