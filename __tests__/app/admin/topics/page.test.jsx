/**
 * Tests for Topics List Page (Clickable Topics)
 * Testing navigation, hover effects, and "View Materials" button
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageTopicsPage from '@/app/admin/topics/page';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/supabase/client');
jest.mock('next/navigation');
jest.mock('@/components/admin/ConfirmModal', () => {
  return function MockConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
    if (!isOpen) return null;
    return (
      <div data-testid="confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  };
});

describe('Manage Topics Page - Clickable Topics', () => {
  let mockSupabase;
  let mockRouter;

  const mockCourses = [
    { id: 'course-1', course_name: 'Computer Science 101' },
    { id: 'course-2', course_name: 'Mathematics 201' },
  ];

  const mockTopics = [
    {
      id: 'topic-1',
      topic_name: 'Introduction to Algorithms',
      week_number: 1,
      course_id: 'course-1',
      description: 'Learn basic algorithms',
      courses: { course_name: 'Computer Science 101' },
      materialsCount: 5,
    },
    {
      id: 'topic-2',
      topic_name: 'Data Structures',
      week_number: 2,
      course_id: 'course-1',
      description: 'Arrays, lists, and trees',
      courses: { course_name: 'Computer Science 101' },
      materialsCount: 0,
    },
    {
      id: 'topic-3',
      topic_name: 'Calculus Basics',
      week_number: 1,
      course_id: 'course-2',
      description: null,
      courses: { course_name: 'Mathematics 201' },
      materialsCount: 10,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock router
    mockRouter = {
      push: jest.fn(),
      back: jest.fn(),
    };
    useRouter.mockReturnValue(mockRouter);

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      is: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      order: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase),
    };
    createClient.mockReturnValue(mockSupabase);

    // Mock courses fetch
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'courses') {
        return {
          ...mockSupabase,
          order: jest.fn(() => ({
            ...mockSupabase,
            then: (cb) => cb({ data: mockCourses, error: null }),
          })),
        };
      }
      if (table === 'topics') {
        return {
          ...mockSupabase,
          order: jest.fn(() => ({
            ...mockSupabase,
            then: (cb) => cb({ data: mockTopics, error: null }),
          })),
        };
      }
      if (table === 'materials') {
        // Return count for each topic
        return {
          ...mockSupabase,
          select: jest.fn((columns, options) => {
            if (options && options.head) {
              const topicId = mockSupabase.lastTopicId;
              const topic = mockTopics.find((t) => t.id === topicId);
              return Promise.resolve({ count: topic?.materialsCount || 0 });
            }
            return mockSupabase;
          }),
          eq: jest.fn((column, value) => {
            mockSupabase.lastTopicId = value;
            return mockSupabase;
          }),
        };
      }
      return mockSupabase;
    });
  });

  describe('Clickable Topic Cards', () => {
    test('should navigate to topic details when card clicked', async () => {
      const user = userEvent.setup();
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      });

      const topicCard = screen.getByText('Introduction to Algorithms').closest('div').parentElement;
      await user.click(topicCard);

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/topics/topic-1');
    });

    test('should navigate to topic details when "View Materials" clicked', async () => {
      const user = userEvent.setup();
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('📋 View Materials')).toBeInTheDocument();
      });

      const viewButton = screen.getAllByText('📋 View Materials')[0];
      await user.click(viewButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/topics/topic-1');
    });

    test('should show "View Materials" button only for topics with materials', async () => {
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      });

      // Topic 1 has 5 materials - should show button
      const viewButtons = screen.getAllByText('📋 View Materials');
      expect(viewButtons.length).toBe(2); // Topic 1 and Topic 3 have materials

      // Topic 2 has 0 materials - should NOT show button
      const topic2Card = screen.getByText('Data Structures').closest('div').parentElement;
      expect(topic2Card).not.toHaveTextContent('📋 View Materials');
    });

    test('should stop propagation when "View Materials" clicked (not trigger card click)', async () => {
      const user = userEvent.setup();
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('📋 View Materials')).toBeInTheDocument();
      });

      const viewButton = screen.getAllByText('📋 View Materials')[0];
      await user.click(viewButton);

      // Should only be called once (from button), not twice (from card + button)
      expect(mockRouter.push).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/topics/topic-1');
    });
  });

  describe('Navigation Behavior', () => {
    test('should call router.push with correct topic ID', async () => {
      const user = userEvent.setup();
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Calculus Basics')).toBeInTheDocument();
      });

      const calculusCard = screen.getByText('Calculus Basics').closest('div').parentElement;
      await user.click(calculusCard);

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/topics/topic-3');
    });

    test('should not navigate when Delete button clicked (only open modal)', async () => {
      const user = userEvent.setup();
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
      });

      // Topic 2 has no materials, so Delete button should be enabled
      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });

      // Should NOT navigate to topic details
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test('should stop propagation on Delete button click', async () => {
      const user = userEvent.setup();
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByText('Delete')[0];
      await user.click(deleteButton);

      // Modal should open, but no navigation
      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Visual Indicators', () => {
    test('should show blue info banner for topics with materials', async () => {
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      });

      expect(screen.getByText(/Click this card or "View Materials"/)).toBeInTheDocument();
    });

    test('should display material count badge', async () => {
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      });

      // Check materials count display
      expect(screen.getByText('5')).toBeInTheDocument(); // Topic 1
      expect(screen.getByText('10')).toBeInTheDocument(); // Topic 3
    });

    test('should apply cursor pointer class to cards', async () => {
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      });

      const topicCard = screen.getByText('Introduction to Algorithms').closest('div').parentElement;
      expect(topicCard).toHaveClass('cursor-pointer');
    });

    test('should have hover effect classes on cards', async () => {
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      });

      const topicCard = screen.getByText('Introduction to Algorithms').closest('div').parentElement;
      expect(topicCard).toHaveClass('hover:shadow-lg');
      expect(topicCard).toHaveClass('hover:border-blue-300');
    });

    test('should have group hover effect on title', async () => {
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      });

      const title = screen.getByText('Introduction to Algorithms');
      expect(title).toHaveClass('group-hover:text-blue-600');
    });
  });

  describe('Existing Functionality (Regression Tests)', () => {
    test('should display course filter', async () => {
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Filter by Course')).toBeInTheDocument();
      });

      const select = screen.getByDisplayValue(/All Courses/);
      expect(select).toBeInTheDocument();
    });

    test('should support search functionality', async () => {
      const user = userEvent.setup();
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search topics/)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search topics/);
      await user.type(searchInput, 'Algorithms');

      expect(searchInput).toHaveValue('Algorithms');
    });

    test('should filter topics by search query', async () => {
      const user = userEvent.setup();
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
        expect(screen.getByText('Calculus Basics')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search topics/);
      await user.type(searchInput, 'Calculus');

      await waitFor(() => {
        expect(screen.getByText('Calculus Basics')).toBeInTheDocument();
        expect(screen.queryByText('Introduction to Algorithms')).not.toBeInTheDocument();
        expect(screen.queryByText('Data Structures')).not.toBeInTheDocument();
      });
    });

    test('should show statistics cards', async () => {
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Topics')).toBeInTheDocument();
        expect(screen.getByText('Total Materials')).toBeInTheDocument();
        expect(screen.getByText('Across Courses')).toBeInTheDocument();
      });
    });

    test('should disable Delete button for topics with materials', async () => {
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      });

      // Topic 1 has materials - button should show "Has Materials"
      const hasMaterialsButtons = screen.getAllByText('Has Materials');
      expect(hasMaterialsButtons.length).toBeGreaterThan(0);

      // These buttons should be disabled
      hasMaterialsButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    test('should enable Delete button for topics without materials', async () => {
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
      });

      // Topic 2 has no materials - should show "Delete" and be enabled
      const deleteButtons = screen.getAllByText('Delete');
      const enabledDeleteButton = deleteButtons.find((btn) => !btn.disabled);
      expect(enabledDeleteButton).toBeDefined();
    });

    test('should filter topics by course', async () => {
      const user = userEvent.setup();
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      });

      const courseSelect = screen.getByDisplayValue(/All Courses/);
      await user.selectOptions(courseSelect, 'course-1');

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
        expect(screen.queryByText('Calculus Basics')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Functionality', () => {
    test('should open confirmation modal when Delete clicked', async () => {
      const user = userEvent.setup();
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByText('Delete')[0];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      });
    });

    test('should delete topic when confirmed', async () => {
      const user = userEvent.setup();
      mockSupabase.delete.mockResolvedValue({ error: null });

      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByText('Delete')[0];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSupabase.delete).toHaveBeenCalled();
      });
    });
  });

  describe('Loading & Error States', () => {
    test('should show loading skeleton while fetching', () => {
      // Delay promise resolution
      mockSupabase.order.mockReturnValue({
        then: () => new Promise(() => {}),
      });

      render(<ManageTopicsPage />);

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    test('should display error message on fetch failure', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'topics') {
          return {
            ...mockSupabase,
            order: jest.fn(() => ({
              ...mockSupabase,
              then: (cb) => cb({ data: null, error: { message: 'Connection failed' } }),
            })),
          };
        }
        return mockSupabase;
      });

      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Topics')).toBeInTheDocument();
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
      });
    });

    test('should show empty state when no topics exist', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'courses') {
          return {
            ...mockSupabase,
            order: jest.fn(() => ({
              ...mockSupabase,
              then: (cb) => cb({ data: [], error: null }),
            })),
          };
        }
        if (table === 'topics') {
          return {
            ...mockSupabase,
            order: jest.fn(() => ({
              ...mockSupabase,
              then: (cb) => cb({ data: [], error: null }),
            })),
          };
        }
        return mockSupabase;
      });

      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('No Topics Found')).toBeInTheDocument();
      });
    });
  });

  describe('Card Interaction', () => {
    test('should allow clicking anywhere on card to navigate', async () => {
      const user = userEvent.setup();
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      });

      // Click on the week badge
      const weekBadge = screen.getByText('Week 1');
      await user.click(weekBadge);

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/topics/topic-1');
    });

    test('should show info banner with correct message', async () => {
      render(<ManageTopicsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/💡 Click this card or "View Materials" to manage materials under this topic/)
      ).toBeInTheDocument();
    });
  });
});
