const { useRouter: actualUseRouter } = require('next/router')

export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
}))

export const useSearchParams = jest.fn(() => ({
  get: jest.fn((key) => null),
}))

export const usePathname = jest.fn(() => '/')
