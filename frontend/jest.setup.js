import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
process.env.NEXT_PUBLIC_DYNAMIC_WIZARD = 'true'
process.env.NEXT_PUBLIC_GOOGLE_PLACES_ENABLED = 'true'
process.env.NEXT_PUBLIC_TITLEPOINT_ENABLED = 'true'

// Mock Google Maps API using official @googlemaps/jest-mocks
import { initialize } from '@googlemaps/jest-mocks'

// Initialize Google Maps mocks before each test
beforeEach(() => {
  initialize()
})

// Mock fetch for API calls
global.fetch = jest.fn()

// Suppress console warnings in tests
const originalWarn = console.warn
beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.warn = originalWarn
})
