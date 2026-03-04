import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type React from 'react'
import { describe, expect, it, vi } from 'vitest'

import Login from '../Login'

// Lightweight test harness: we stub AuthContext.login so we can
// assert the form wires up correctly without hitting the API.

function AuthTestProvider({ children }: { children: React.ReactNode }) {
  // Reuse AuthContext shape but override login; simplest is to wrap
  // AuthProvider and monkey-patch via context, but since AuthContext
  // is internal, we instead mock useAuth directly in tests.
  // Here we just render children; useAuth is mocked below.
  return <>{children}</>
}

vi.mock('../../context/AuthContext', async (orig: any) => {
  const actual = await orig()
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      loading: false,
      login: vi.fn(async () => {}),
      logout: vi.fn(),
      isAdmin: false,
    }),
  }
})

describe('Login page', () => {
  it('renders username and password fields and sign-in button', () => {
    render(
      <MemoryRouter>
        <AuthTestProvider>
          <Login />
        </AuthTestProvider>
      </MemoryRouter>
    )

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  // Additional interaction tests can be added later to assert error handling
  // and navigation behaviour; for now we keep one smoke test for structure.
})

