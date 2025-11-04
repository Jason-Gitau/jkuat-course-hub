import React from 'react'

export const useUser = jest.fn(() => ({
  user: { id: 'user-123' },
  profile: { full_name: 'Test User' },
  loading: false,
  error: null,
}))

export const UserProvider = ({ children }) => {
  return <>{children}</>
}

export default {
  useUser,
  UserProvider,
}
