/**
 * Tests for Material Deletion API with Physical File Removal
 * Testing hard delete, soft delete, R2/Supabase storage deletion
 */

import { POST, GET } from '@/app/api/admin/materials/[id]/delete/route';
import { deleteFromR2 } from '@/lib/storage/r2-client';
import { createClient, getServiceRoleClient } from '@/lib/supabase/server';

// Mock dependencies
jest.mock('@/lib/storage/r2-client');
jest.mock('@/lib/supabase/server');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(new Map())),
}));

describe('/api/admin/materials/[id]/delete', () => {
  let mockSupabaseClient;
  let mockServiceRoleClient;
  let mockRequest;
  let mockParams;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabaseClient),
      select: jest.fn(() => mockSupabaseClient),
      eq: jest.fn(() => mockSupabaseClient),
      single: jest.fn(),
      storage: {
        from: jest.fn(() => ({
          remove: jest.fn(),
        })),
      },
    };

    // Mock Service Role client
    mockServiceRoleClient = {
      from: jest.fn(() => mockServiceRoleClient),
      update: jest.fn(() => mockServiceRoleClient),
      delete: jest.fn(() => mockServiceRoleClient),
      insert: jest.fn(() => mockServiceRoleClient),
      eq: jest.fn(() => mockServiceRoleClient),
    };

    createClient.mockReturnValue(mockSupabaseClient);
    getServiceRoleClient.mockReturnValue(mockServiceRoleClient);

    // Mock successful R2 deletion by default
    deleteFromR2.mockResolvedValue(true);

    // Default authenticated admin user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-123' } },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          ...mockSupabaseClient,
          single: jest.fn().mockResolvedValue({
            data: { role: 'admin', full_name: 'Admin User' },
            error: null,
          }),
        };
      }
      return mockSupabaseClient;
    });

    mockRequest = {
      json: jest.fn(),
    };

    mockParams = { id: 'material-123' };
  });

  describe('POST - Hard Delete with Physical File Removal', () => {
    test('should delete file from R2 storage on hard delete', async () => {
      const material = {
        id: 'material-123',
        title: 'Test PDF',
        storage_location: 'r2',
        storage_path: 'materials/test-file.pdf',
        download_count: 10,
        view_count: 50,
        courses: { course_name: 'Computer Science' },
      };

      // Mock material fetch
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValue({
        data: material,
        error: null,
      });

      // Mock successful deletion
      mockServiceRoleClient.delete.mockReturnValue(mockServiceRoleClient);
      mockServiceRoleClient.eq.mockResolvedValue({ error: null });

      mockRequest.json.mockResolvedValue({
        deletionType: 'hard',
        reason: 'Incorrect content uploaded by mistake',
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletionType).toBe('hard');
      expect(deleteFromR2).toHaveBeenCalledWith('materials/test-file.pdf');
      expect(deleteFromR2).toHaveBeenCalledTimes(1);
    });

    test('should delete file from Supabase storage on hard delete', async () => {
      const material = {
        id: 'material-123',
        title: 'Test Doc',
        storage_location: 'supabase',
        storage_path: 'course-materials/test.docx',
        file_url: 'https://project.supabase.co/storage/v1/object/public/materials/course-materials/test.docx',
        download_count: 5,
        view_count: 20,
        courses: { course_name: 'Math' },
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: material,
        error: null,
      });

      const mockStorageRemove = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseClient.storage.from.mockReturnValue({
        remove: mockStorageRemove,
      });

      mockServiceRoleClient.eq.mockResolvedValue({ error: null });

      mockRequest.json.mockResolvedValue({
        deletionType: 'hard',
        reason: 'File is corrupted and needs replacement',
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('materials');
      expect(mockStorageRemove).toHaveBeenCalledWith(['course-materials/test.docx']);
    });

    test('should handle R2 deletion errors gracefully and continue', async () => {
      const material = {
        id: 'material-123',
        title: 'Test PDF',
        storage_location: 'r2',
        storage_path: 'materials/test.pdf',
        download_count: 0,
        view_count: 0,
        courses: { course_name: 'Physics' },
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: material,
        error: null,
      });

      mockServiceRoleClient.eq.mockResolvedValue({ error: null });

      // R2 deletion fails
      deleteFromR2.mockRejectedValue(new Error('R2 service unavailable'));

      mockRequest.json.mockResolvedValue({
        deletionType: 'hard',
        reason: 'Testing error handling for R2 deletion',
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      // Should still succeed even if storage deletion fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Material permanently deleted');
    });

    test('should handle Supabase storage deletion errors gracefully', async () => {
      const material = {
        id: 'material-123',
        title: 'Test Image',
        storage_location: 'supabase',
        storage_path: 'images/test.png',
        file_url: 'https://project.supabase.co/storage/v1/object/public/materials/images/test.png',
        download_count: 2,
        view_count: 10,
        courses: { course_name: 'Art' },
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: material,
        error: null,
      });

      mockServiceRoleClient.eq.mockResolvedValue({ error: null });

      // Supabase storage deletion fails
      const mockStorageRemove = jest.fn().mockResolvedValue({
        error: { message: 'File not found in storage' },
      });
      mockSupabaseClient.storage.from.mockReturnValue({
        remove: mockStorageRemove,
      });

      mockRequest.json.mockResolvedValue({
        deletionType: 'hard',
        reason: 'Testing Supabase storage error handling',
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      // Should still succeed
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should NOT delete files on soft delete', async () => {
      const material = {
        id: 'material-123',
        title: 'Test Notes',
        storage_location: 'r2',
        storage_path: 'materials/notes.pdf',
        download_count: 25,
        view_count: 100,
        courses: { course_name: 'Chemistry' },
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: material,
        error: null,
      });

      mockServiceRoleClient.update.mockReturnValue(mockServiceRoleClient);
      mockServiceRoleClient.eq.mockResolvedValue({ error: null });

      mockRequest.json.mockResolvedValue({
        deletionType: 'soft',
        reason: 'Temporarily remove for review',
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletionType).toBe('soft');
      expect(deleteFromR2).not.toHaveBeenCalled();
    });

    test('should record deletion in audit log', async () => {
      const material = {
        id: 'material-123',
        title: 'Audit Test',
        storage_location: 'r2',
        storage_path: 'materials/audit.pdf',
        download_count: 5,
        view_count: 15,
        courses: { course_name: 'Law' },
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: material,
        error: null,
      });

      mockServiceRoleClient.eq.mockResolvedValue({ error: null });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockServiceRoleClient.insert.mockReturnValue(mockInsert);

      mockRequest.json.mockResolvedValue({
        deletionType: 'hard',
        reason: 'Testing audit log functionality',
      });

      await POST(mockRequest, { params: mockParams });

      expect(mockServiceRoleClient.from).toHaveBeenCalledWith('deletion_audit_log');
      expect(mockServiceRoleClient.insert).toHaveBeenCalled();
    });
  });

  describe('POST - Validation & Authorization', () => {
    test('should reject unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      mockRequest.json.mockResolvedValue({
        deletionType: 'hard',
        reason: 'Testing authentication',
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject non-admin users', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            ...mockSupabaseClient,
            single: jest.fn().mockResolvedValue({
              data: { role: 'student', full_name: 'Student User' },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      mockRequest.json.mockResolvedValue({
        deletionType: 'hard',
        reason: 'Testing authorization',
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    test('should validate deletion type', async () => {
      mockRequest.json.mockResolvedValue({
        deletionType: 'invalid',
        reason: 'Testing validation',
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid deletion type');
    });

    test('should require deletion reason with minimum length', async () => {
      mockRequest.json.mockResolvedValue({
        deletionType: 'hard',
        reason: 'Short', // Less than 10 characters
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('minimum 10 characters');
    });

    test('should return 404 for non-existent material', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      mockRequest.json.mockResolvedValue({
        deletionType: 'hard',
        reason: 'Testing 404 response',
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Material not found');
    });
  });

  describe('POST - Edge Cases', () => {
    test('should handle materials without storage_path', async () => {
      const material = {
        id: 'material-123',
        title: 'Legacy Material',
        storage_location: 'r2',
        storage_path: null, // Missing storage path
        file_url: 'https://old-url.com/file.pdf',
        download_count: 0,
        view_count: 0,
        courses: { course_name: 'History' },
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: material,
        error: null,
      });

      mockServiceRoleClient.eq.mockResolvedValue({ error: null });

      mockRequest.json.mockResolvedValue({
        deletionType: 'hard',
        reason: 'Testing missing storage path',
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      // Should succeed without attempting R2 deletion
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteFromR2).not.toHaveBeenCalled();
    });

    test('should handle materials with missing file_url', async () => {
      const material = {
        id: 'material-123',
        title: 'Orphaned Material',
        storage_location: 'supabase',
        storage_path: null,
        file_url: null,
        download_count: 0,
        view_count: 0,
        courses: { course_name: 'Biology' },
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: material,
        error: null,
      });

      mockServiceRoleClient.eq.mockResolvedValue({ error: null });

      mockRequest.json.mockResolvedValue({
        deletionType: 'hard',
        reason: 'Cleaning up orphaned materials',
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should extract path from Supabase URL correctly', async () => {
      const material = {
        id: 'material-123',
        title: 'URL Extraction Test',
        storage_location: 'supabase',
        storage_path: null, // Will extract from URL
        file_url: 'https://project.supabase.co/storage/v1/object/public/materials/folder/subfolder/document.pdf?token=abc',
        download_count: 0,
        view_count: 0,
        courses: { course_name: 'Engineering' },
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: material,
        error: null,
      });

      mockServiceRoleClient.eq.mockResolvedValue({ error: null });

      const mockStorageRemove = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseClient.storage.from.mockReturnValue({
        remove: mockStorageRemove,
      });

      mockRequest.json.mockResolvedValue({
        deletionType: 'hard',
        reason: 'Testing URL path extraction',
      });

      const response = await POST(mockRequest, { params: mockParams });

      expect(response.status).toBe(200);
      expect(mockStorageRemove).toHaveBeenCalledWith(['folder/subfolder/document.pdf']);
    });
  });

  describe('GET - Deletion Impact', () => {
    test('should return impact metrics for material', async () => {
      const material = {
        id: 'material-123',
        title: 'Popular Material',
        download_count: 150,
        view_count: 500,
        file_size: 5242880, // 5 MB
        created_at: new Date('2024-01-15').toISOString(),
        courses: { course_name: 'Computer Science' },
        topics: { topic_name: 'Data Structures' },
        profiles: { full_name: 'John Doe', email: 'john@example.com' },
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: material,
        error: null,
      });

      const response = await GET(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.impact.downloads).toBe(150);
      expect(data.impact.views).toBe(500);
      expect(data.impact.fileSizeMB).toBe('5.00');
      expect(data.warnings.highDownloads).toBe(true);
      expect(data.warnings.highViews).toBe(true);
    });

    test('should require admin access for impact check', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            ...mockSupabaseClient,
            single: jest.fn().mockResolvedValue({
              data: { role: 'student' },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      const response = await GET(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });
  });
});
