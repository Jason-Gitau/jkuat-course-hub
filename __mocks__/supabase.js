// Mock Supabase client for testing
export const createClient = jest.fn(() => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Test User'
          }
        }
      },
      error: null
    }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null
    }),
    signInWithOAuth: jest.fn(),
    signInWithOtp: jest.fn(),
  },
  from: jest.fn((table) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        id: 'test-id',
        course_name: 'Test Course',
        department: 'Test Department'
      },
      error: null
    }),
    order: jest.fn().mockReturnThis(),
  })),
  rpc: jest.fn().mockResolvedValue({
    data: null,
    error: null
  }),
}))

export const createServerClient = jest.fn(() => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    }),
  },
  from: jest.fn((table) => ({
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: null,
      error: null
    }),
  })),
}))
