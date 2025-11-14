const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/lib/providers/SupabaseProvider$': '<rootDir>/lib/providers/SupabaseProvider.jsx',
    '^@/lib/providers/UserProvider$': '<rootDir>/lib/providers/UserProvider.jsx',
    '^@/lib/utils/inviteLinkGenerator$': '<rootDir>/lib/utils/inviteLinkGenerator.js',
    '^@/lib/utils/courseValidation$': '<rootDir>/lib/utils/courseValidation.js',
    '^@/lib/hooks/useOnboarding$': '<rootDir>/lib/hooks/useOnboarding.js',
    '^@/lib/onboarding/tourSteps$': '<rootDir>/lib/onboarding/tourSteps.js',
    '^@/(.*)$': '<rootDir>/$1',
    // Mock CSS modules
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '^.+\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['next/dist/build/swc/jest-transformer', {}],
  },
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  testMatch: [
    '**/__tests__/**/*.test.{js,jsx}',
    '**/?(*.)+(spec|test).{js,jsx}'
  ],
  collectCoverageFrom: [
    'lib/**/*.{js,jsx}',
    'components/**/*.{js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/dist/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
