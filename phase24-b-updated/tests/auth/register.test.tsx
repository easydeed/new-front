import { render, screen, fireEvent } from '@testing-library/react'
import Page from '@/frontend/examples/app/(auth)/register/page.v0'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/api', () => ({
  apiPost: async () => ({ ok: true }),
}))

describe('Register', () => {
  it('validates password length and match', async () => {
    render(<Page />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'short2' } })
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } })
    fireEvent.change(screen.getByLabelText(/^role/i), { target: { value: 'Other' } })
    fireEvent.change(screen.getByLabelText(/^state/i), { target: { value: 'CA' } })
    fireEvent.click(screen.getByText(/i agree to the terms/i))
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/min 8 characters/i)).toBeInTheDocument()
  })
})
