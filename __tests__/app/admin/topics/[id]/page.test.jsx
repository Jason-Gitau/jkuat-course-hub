/**
 * Tests for Topic Details Page
 * Testing material display, deletion modal, and navigation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopicDetailsPage from '@/app/admin/topics/[id]/page';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/supabase/client');
jest.mock('next/navigation');
jest.mock('@/components/admin/DeletionModal', () => {
  return function MockDeletionModal({ isOpen, onClose, onSuccess, materialId, materialTitle }) {
    if (!isOpen) return null;
    return (
      <div data-testid="deletion-modal">
        <p>Deleting: {materialTitle}</p>
        <p>Material ID: {materialId}</p>
        <button onClick={() => { onSuccess(); onClose(); }}>Confirm Delete</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  };
});

describe('Topic Details Page', () => {
  let mockSupabase;
  let mockRouter;
  const mockTopicId = 'topic-123';

  const mockTopic = {
    id: 'topic-123',
    topic_name: 'Introduction to Algorithms',
    week_number: 3,
    description: 'Learn about sorting and searching algorithms',
    courses: {
      id: 'course-123',
      course_name: 'Computer Science 101',
    },
  };

  const mockMaterials = [
    {
      id: 'material-1',
      title: 'Sorting Algorithms Notes',
      type: 'pdf',
      file_size: 2048576, // 2 MB
      material_category: 'complete_notes',
      status: 'approved',
      download_count: 50,
      view_count: 150,
      uploaded_by: 'John Doe',
      created_at: '2024-01-15T10:00:00Z',
      storage_location: 'r2',
      storage_path: 'materials/sorting.pdf',
      file_url: 'https://r2.example.com/sorting.pdf',
    },
    {
      id: 'material-2',
      title: 'Search Algorithms Slides',
      type: 'pptx',
      file_size: 5242880, // 5 MB
      material_category: 'weekly_notes',
      status: 'pending',
      download_count: 10,
      view_count: 30,
      uploaded_by: 'Jane Smith',
      created_at: '2024-01-20T14:30:00Z',
      storage_location: 'supabase',
      storage_path: null,
      file_url: 'https://supabase.example.com/search.pptx',
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
    useParams.mockReturnValue({ id: mockTopicId });

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      is: jest.fn(() => mockSupabase),
      order: jest.fn(() => mockSupabase),
      single: jest.fn(),
    };
    createClient.mockReturnValue(mockSupabase);

    // Default successful topic fetch
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'topics') {
        return {
          ...mockSupabase,
          single: jest.fn().mockResolvedValue({
            data: mockTopic,
            error: null,
          }),
        };
      }
      if (table === 'materials') {
        return {
          ...mockSupabase,
          order: jest.fn(() => ({
            ...mockSupabase,
            then: (cb) => cb({ data: mockMaterials, error: null }),
          })),
        };
      }
      return mockSupabase;
    });

    // Mock fetch for R2 signed URLs
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/materials/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ url: 'https://signed-url.r2.example.com/file.pdf' }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    // Mock window.open
    global.open = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
    delete global.open;
  });

  describe('Page Rendering', () => {
    test('should display topic name, course, and week number', async () => {
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
        expect(screen.getByText(/Week 3/)).toBeInTheDocument();
        expect(screen.getByText(/Computer Science 101/)).toBeInTheDocument();
      });
    });

    test('should display topic description if available', async () => {
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText(/"Learn about sorting and searching algorithms"/)).toBeInTheDocument();
      });
    });

    test('should show statistics cards', async () => {
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Materials')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // 2 materials
        expect(screen.getByText('Total Downloads')).toBeInTheDocument();
        expect(screen.getByText('60')).toBeInTheDocument(); // 50 + 10
        expect(screen.getByText('Total Views')).toBeInTheDocument();
        expect(screen.getByText('180')).toBeInTheDocument(); // 150 + 30
      });
    });

    test('should render "Back to Topics" button', async () => {
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('← Back to Topics')).toBeInTheDocument();
      });
    });

    test('should show loading skeleton while fetching data', () => {
      // Delay the promise resolution
      mockSupabase.single.mockReturnValue(new Promise(() => {}));

      render(<TopicDetailsPage />);

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('Materials List Display', () => {
    test('should render all materials for the topic', async () => {
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Sorting Algorithms Notes')).toBeInTheDocument();
        expect(screen.getByText('Search Algorithms Slides')).toBeInTheDocument();
      });
    });

    test('should display correct file type icons', async () => {
      render(<TopicDetailsPage />);

      await waitFor(() => {
        // Check for PDF and PPTX icons (emojis)
        expect(screen.getByText('📕')).toBeInTheDocument(); // PDF
        expect(screen.getByText('🎯')).toBeInTheDocument(); // PPTX
      });
    });

    test('should show category badges', async () => {
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('📚 Complete Notes')).toBeInTheDocument();
        expect(screen.getByText('📝 Weekly Notes')).toBeInTheDocument();
      });
    });

    test('should display material stats', async () => {
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText(/50 downloads/)).toBeInTheDocument();
        expect(screen.getByText(/150 views/)).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    test('should show status indicators for pending materials', async () => {
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('⏳ Pending')).toBeInTheDocument();
      });
    });

    test('should show empty state when no materials exist', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'topics') {
          return {
            ...mockSupabase,
            single: jest.fn().mockResolvedValue({
              data: mockTopic,
              error: null,
            }),
          };
        }
        if (table === 'materials') {
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

      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('No Materials Yet')).toBeInTheDocument();
        expect(screen.getByText(/doesn't have any materials uploaded yet/)).toBeInTheDocument();
      });
    });
  });

  describe('Material Actions', () => {
    test('should open material in new tab when View button clicked', async () => {
      const user = userEvent.setup();
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Sorting Algorithms Notes')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByTitle('View material');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(global.open).toHaveBeenCalledWith(
          expect.stringContaining('https://'),
          '_blank'
        );
      });
    });

    test('should fetch R2 signed URL for R2-stored files', async () => {
      const user = userEvent.setup();
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Sorting Algorithms Notes')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByTitle('View material');
      await user.click(viewButtons[0]); // First material is R2

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/materials/material-1/download-url');
        expect(global.open).toHaveBeenCalledWith(
          'https://signed-url.r2.example.com/file.pdf',
          '_blank'
        );
      });
    });

    test('should use direct URL for Supabase files', async () => {
      const user = userEvent.setup();
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Search Algorithms Slides')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByTitle('View material');
      await user.click(viewButtons[1]); // Second material is Supabase

      await waitFor(() => {
        expect(global.open).toHaveBeenCalledWith(
          'https://supabase.example.com/search.pptx',
          '_blank'
        );
      });
    });

    test('should open deletion modal when Delete button clicked', async () => {
      const user = userEvent.setup();
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Sorting Algorithms Notes')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete material');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('deletion-modal')).toBeInTheDocument();
        expect(screen.getByText('Deleting: Sorting Algorithms Notes')).toBeInTheDocument();
        expect(screen.getByText('Material ID: material-1')).toBeInTheDocument();
      });
    });
  });

  describe('Deletion Modal Integration', () => {
    test('should pass correct material ID and title to deletion modal', async () => {
      const user = userEvent.setup();
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Search Algorithms Slides')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete material');
      await user.click(deleteButtons[1]); // Click second material's delete

      await waitFor(() => {
        expect(screen.getByText('Deleting: Search Algorithms Slides')).toBeInTheDocument();
        expect(screen.getByText('Material ID: material-2')).toBeInTheDocument();
      });
    });

    test('should close modal when cancel clicked', async () => {
      const user = userEvent.setup();
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Sorting Algorithms Notes')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete material');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('deletion-modal')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('deletion-modal')).not.toBeInTheDocument();
      });
    });

    test('should refresh materials list after successful deletion', async () => {
      const user = userEvent.setup();
      let callCount = 0;

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'topics') {
          return {
            ...mockSupabase,
            single: jest.fn().mockResolvedValue({
              data: mockTopic,
              error: null,
            }),
          };
        }
        if (table === 'materials') {
          callCount++;
          const materials = callCount === 1 ? mockMaterials : [mockMaterials[1]]; // After delete, only second material remains
          return {
            ...mockSupabase,
            order: jest.fn(() => ({
              ...mockSupabase,
              then: (cb) => cb({ data: materials, error: null }),
            })),
          };
        }
        return mockSupabase;
      });

      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Sorting Algorithms Notes')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete material');
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Confirm Delete');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('Sorting Algorithms Notes')).not.toBeInTheDocument();
        expect(screen.getByText('Search Algorithms Slides')).toBeInTheDocument();
      });
    });
  });

  describe('Loading & Error States', () => {
    test('should display error message on fetch failure', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'topics') {
          return {
            ...mockSupabase,
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          };
        }
        return mockSupabase;
      });

      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Topic')).toBeInTheDocument();
        expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      });
    });

    test('should show "Topic Not Found" if topic does not exist', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'topics') {
          return {
            ...mockSupabase,
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return mockSupabase;
      });

      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Topic Not Found')).toBeInTheDocument();
      });
    });

    test('should provide "Go Back" button on errors', async () => {
      const user = userEvent.setup();
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'topics') {
          return {
            ...mockSupabase,
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Error' },
            }),
          };
        }
        return mockSupabase;
      });

      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Go Back')).toBeInTheDocument();
      });

      const goBackButton = screen.getByText('Go Back');
      await user.click(goBackButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    test('should navigate back when "Back to Topics" clicked', async () => {
      const user = userEvent.setup();
      render(<TopicDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('← Back to Topics')).toBeInTheDocument();
      });

      const backButton = screen.getByText('← Back to Topics');
      await user.click(backButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('File Size Formatting', () => {
    test('should format file sizes correctly', async () => {
      render(<TopicDetailsPage />);

      await waitFor(() => {
        // 2 MB and 5 MB files
        expect(screen.getByText('2.0 MB')).toBeInTheDocument();
        expect(screen.getByText('5.0 MB')).toBeInTheDocument();
      });
    });
  });
});
