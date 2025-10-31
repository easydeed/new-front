import { render, screen, fireEvent } from '@testing-library/react'
import Page from '@/frontend/examples/app/(auth)/login/page.v0'

jest.mock('@/lib/auth/AuthManager', () => ({
  AuthManager: {
    isAuthenticated: () => false,
    setAuth: jest.fn(),
    getToken: () => null,
    logout: jest.fn(),
  },
}))
jest.mock('@/lib/api', () => ({
  apiPost: async (_:string, body:any) => {
    if (body.email === 'ok@example.com' && body.password === 'password123') {
      return { access_token: 'token', user: { id: '1', email: 'ok@example.com' } }
    }
    const err:any = new Error('bad'); err.status = 401; throw err
  },
}))

describe('Login', () => {
  it('shows error on invalid credentials', async () => {
    render(<Page />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'no@x.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument()
  })
})
