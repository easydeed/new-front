import { render, screen } from '@testing-library/react'
import Page from '@/frontend/examples/app/dashboard/page.v0'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}))
jest.mock('@/lib/auth/AuthManager', () => ({
  AuthManager: {
    getToken: () => 'token',
    logout: jest.fn(),
  },
}))
jest.mock('@/lib/api', () => ({
  apiGet: async (path:string) => {
    if (path === '/users/profile') return { id: 1, email: 'a@b.com' }
    if (path === '/deeds/summary') return { total: 10, in_progress: 2, completed: 8, month: 3 }
    if (path === '/deeds') return [{ id: 1, deed_type: 'grant-deed' }]
    return {}
  },
}))

describe('Dashboard', () => {
  it('renders summary after auth check', async () => {
    render(<Page />)
    expect(await screen.findByText(/total deeds/i)).toBeInTheDocument()
  })
})
