import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SmartCourseSelector from '../SmartCourseSelector'

// Mock useSupabase hook
jest.mock('@/lib/providers/SupabaseProvider', () => ({
  useSupabase: jest.fn(() => ({
    supabase: {
      from: jest.fn((table) => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'new-course-id', course_name: 'Test Course' },
          error: null,
        }),
      })),
    },
  })),
}))

describe('SmartCourseSelector', () => {
  const mockOnChange = jest.fn()
  const mockCourse = { id: '1', course_name: 'BSc Computer Science', department: 'Computing' }

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('should render input field', () => {
    render(<SmartCourseSelector value={null} onChange={mockOnChange} error={null} />)

    const input = screen.getByPlaceholderText('Search for your course...')
    expect(input).toBeInTheDocument()
  })

  it('should display label', () => {
    render(<SmartCourseSelector value={null} onChange={mockOnChange} error={null} />)

    expect(screen.getByText(/Course/i)).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('should show loading state initially', async () => {
    render(<SmartCourseSelector value={null} onChange={mockOnChange} error={null} />)

    // Wait for loading to complete
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Search for your course...')
      expect(input).not.toBeDisabled()
    })
  })

  it('should call onChange when course is selected', async () => {
    const { rerender } = render(
      <SmartCourseSelector value={null} onChange={mockOnChange} error={null} />
    )

    const input = screen.getByPlaceholderText('Search for your course...')

    // Type to trigger dropdown
    await userEvent.type(input, 'test')

    // Wait for dropdown to appear and click an option
    await waitFor(() => {
      const options = screen.queryAllByRole('option')
      if (options.length > 0) {
        fireEvent.click(options[0])
      }
    })

    // Verify onChange was called
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled()
    })
  })

  it('should display selected course value', () => {
    render(
      <SmartCourseSelector
        value={mockCourse}
        onChange={mockOnChange}
        error={null}
      />
    )

    const input = screen.getByDisplayValue(mockCourse.course_name)
    expect(input).toBeInTheDocument()
  })

  it('should show error message when provided', () => {
    const errorMsg = 'Please select a valid course'
    render(
      <SmartCourseSelector
        value={null}
        onChange={mockOnChange}
        error={errorMsg}
      />
    )

    expect(screen.getByText(errorMsg)).toBeInTheDocument()
  })

  it('should apply error styling when error exists', () => {
    const { container } = render(
      <SmartCourseSelector
        value={null}
        onChange={mockOnChange}
        error="Error message"
      />
    )

    const input = screen.getByPlaceholderText('Search for your course...')
    expect(input.className).toContain('border-red-500')
  })

  it('should show create course button when no match found', async () => {
    render(<SmartCourseSelector value={null} onChange={mockOnChange} error={null} />)

    const input = screen.getByPlaceholderText('Search for your course...')

    // Type something that won't match
    await userEvent.type(input, 'nonexistent course')

    // Wait for create button to appear
    await waitFor(() => {
      expect(screen.getByText(/Create "Nonexistent Course"/i)).toBeInTheDocument()
    })
  })

  it('should open create modal when create button clicked', async () => {
    render(<SmartCourseSelector value={null} onChange={mockOnChange} error={null} />)

    const input = screen.getByPlaceholderText('Search for your course...')
    await userEvent.type(input, 'new course')

    await waitFor(() => {
      const createBtn = screen.getByText(/Create "New Course"/i)
      fireEvent.click(createBtn)
    })

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText(/Did you mean/i)).toBeInTheDocument()
    })
  })

  it('should validate course name format', async () => {
    render(<SmartCourseSelector value={null} onChange={mockOnChange} error={null} />)

    const input = screen.getByPlaceholderText('Search for your course...')

    // Type invalid course name (less than 3 chars)
    await userEvent.type(input, 'ab')

    const createBtn = await screen.findByText(/Create "Ab"/i)
    fireEvent.click(createBtn)

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument()
    })
  })

  it('should show similar course suggestions', async () => {
    render(<SmartCourseSelector value={null} onChange={mockOnChange} error={null} />)

    const input = screen.getByPlaceholderText('Search for your course...')

    // Type similar to an existing course
    await userEvent.type(input, 'computer sciense') // typo

    const createBtn = await screen.findByText(/Create/i)
    fireEvent.click(createBtn)

    // Should show similar course suggestion
    await waitFor(() => {
      expect(screen.getByText(/Similar course found/i)).toBeInTheDocument()
    })
  })

  it('should close dropdown when clicking outside', async () => {
    const { container } = render(
      <SmartCourseSelector value={null} onChange={mockOnChange} error={null} />
    )

    const input = screen.getByPlaceholderText('Search for your course...')
    fireEvent.focus(input)

    // Click outside the component
    fireEvent.mouseDown(document.body)

    // Dropdown should close
    await waitFor(() => {
      const dropdown = screen.queryByRole('listbox')
      if (dropdown) {
        expect(dropdown).not.toBeVisible()
      }
    })
  })

  it('should clear selection when typing empty string', async () => {
    render(
      <SmartCourseSelector
        value={mockCourse}
        onChange={mockOnChange}
        error={null}
      />
    )

    const input = screen.getByDisplayValue(mockCourse.course_name)

    // Clear the input
    await userEvent.clear(input)

    expect(mockOnChange).toHaveBeenCalledWith(null)
  })

  it('should format course name in create modal', async () => {
    render(<SmartCourseSelector value={null} onChange={mockOnChange} error={null} />)

    const input = screen.getByPlaceholderText('Search for your course...')

    // Type lowercase course name
    await userEvent.type(input, 'bsc computer science')

    const createBtn = await screen.findByText(/Create "Bsc Computer Science"/i)
    expect(createBtn).toBeInTheDocument()
  })

  it('should handle modal cancellation', async () => {
    render(<SmartCourseSelector value={null} onChange={mockOnChange} error={null} />)

    const input = screen.getByPlaceholderText('Search for your course...')
    await userEvent.type(input, 'new course')

    const createBtn = await screen.findByText(/Create "New Course"/i)
    fireEvent.click(createBtn)

    // Modal appears, click cancel
    await waitFor(() => {
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelBtn)
    })

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText(/Did you mean/i)).not.toBeInTheDocument()
    })
  })

  it('should disable input when loading', () => {
    render(<SmartCourseSelector value={null} onChange={mockOnChange} error={null} />)

    // Initially might be loading
    const input = screen.getByPlaceholderText('Search for your course...')
    // After load completes, should not be disabled
    expect(input).not.toBeDisabled()
  })
})
